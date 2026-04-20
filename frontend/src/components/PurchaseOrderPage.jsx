import { useState, useEffect, useRef } from 'react'
import { FaFileInvoice, FaDownload, FaEdit, FaCheckCircle, FaBuilding, FaUser, FaBox, FaSave, FaTruckLoading, FaRoute, FaPaperPlane, FaTimes } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { issuePO } from '../api/project'
import { useNotification } from '../context/NotificationContext'
import { useWebSocket } from '../context/WebSocketContext'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './PurchaseOrderPage.css'

export const PurchaseOrderPage = ({ project, filterIssued = false }) => {
    const { user: buyerProfile } = useAuth()
    const [orders, setOrders] = useState([])
    const [selectedVendorGroup, setSelectedVendorGroup] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [issuingPO, setIssuingPO] = useState(false)
    const { showAlert, showConfirm } = useNotification()
    const { subscribe } = useWebSocket() || {}
    
    // Editable fields
    const [poDate, setPoDate] = useState(new Date().toLocaleDateString())
    const [terms, setTerms] = useState([
        "Delivery to be completed within stated lead times from the date of PO acknowledgement.",
        "Materials must strictly adhere to the specified Grade and Size constraints.",
        "Distance-based logistics calculations are road-accurate via Google Map.",
        "Payment terms as per mutual vendor agreement."
    ])

    const poRef = useRef(null)

    useEffect(() => {
        if (project?.id) {
            loadConfirmedOrders()
        }
    }, [project])

    useEffect(() => {
        if (!subscribe) return;
        
        const unsubscribePO = subscribe('po_issued', (data) => {
            if (String(data.project_id) === String(project?.id)) {
                loadConfirmedOrders();
            }
        });
        
        const unsubscribeProj = subscribe('project_updated', (data) => {
            if (String(data.id) === String(project?.id)) {
                loadConfirmedOrders();
            }
        });

        return () => {
            unsubscribePO();
            unsubscribeProj();
        };
    }, [project, subscribe]);

    const loadConfirmedOrders = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/bom/?project_id=${project.id}&confirmed_only=true`)
            const items = await res.json()
            
            // Group confirmed items by Vendor
            const vendorGroups = items.reduce((acc, item) => {
                const vendorId = item.selected_quotation_details?.vendor_id
                if (!vendorId) return acc
                if (!acc[vendorId]) {
                    acc[vendorId] = {
                        vendor: item.selected_quotation_details,
                        items: []
                    }
                }
                acc[vendorId].items.push(item)
                return acc
            }, {})

            let groupsArray = Object.values(vendorGroups)
            
            if (filterIssued) {
                groupsArray = groupsArray.filter(g => g.items.some(it => it.po_issued))
            }

            setOrders(groupsArray)
            if (groupsArray.length > 0) setSelectedVendorGroup(groupsArray[0])
            else setSelectedVendorGroup(null)
        } catch (err) {
            console.error("Failed to load POs:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPDF = async () => {
        if (!poRef.current) return

        const canvas = await html2canvas(poRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        })
        
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`PO_${selectedVendorGroup?.vendor?.vendor_name.replace(/\s+/g, '_')}_${project.name}.pdf`)
    }

    const handleIssuePO = async () => {
        if (!selectedVendorGroup?.vendor?.vendor_id || !poRef.current) return
        
        showConfirm(`Are you sure you want to issue this Purchase Order to ${selectedVendorGroup.vendor.vendor_name}? This will send a formal PO email with the PDF attachment.`, async () => {
            try {
                setIssuingPO(true)
                
                let scale = 2;
                let quality = 0.9;
                let pdfBase64 = "";
                let sizeInBytes = Number.MAX_SAFE_INTEGER;

                while (scale >= 1 && sizeInBytes > 5 * 1024 * 1024) {
                    // 1. Generate PDF as Base64
                    const canvas = await html2canvas(poRef.current, {
                        scale: scale,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', quality);
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                    
                    pdfBase64 = pdf.output('datauristring');

                    const base64Length = pdfBase64.length - (pdfBase64.indexOf(',') + 1);
                    const padding = (pdfBase64.charAt(pdfBase64.length - 2) === '=') ? 2 : ((pdfBase64.charAt(pdfBase64.length - 1) === '=') ? 1 : 0);
                    sizeInBytes = (base64Length * 0.75) - padding;

                    if (sizeInBytes > 5 * 1024 * 1024) {
                        if (scale === 2) {
                            scale = 1.5;
                            quality = 0.8;
                        } else if (scale === 1.5) {
                            scale = 1;
                            quality = 0.7;
                        } else {
                            break; // Lowest reasonable scale
                        }
                    }
                }

                if (sizeInBytes > 5 * 1024 * 1024) {
                     showAlert("Unable to compress generated PO PDF to under 5MB limit. Please reduce item count.", "error");
                     setIssuingPO(false);
                     return;
                }

                // 2. Call API with PDF
                await issuePO(project.id, selectedVendorGroup.vendor.vendor_id, pdfBase64)
                
                showAlert(`PO successfully issued to ${selectedVendorGroup.vendor.vendor_name}. Congratulation email sent!`, "success")
                loadConfirmedOrders() // Refresh UI
            } catch (err) {
                console.error("Failed to issue PO:", err)
                showAlert(err.message || "Failed to issue PO.", "error")
            } finally {
                setIssuingPO(false)
            }
        })
    }

    if (loading) return <div className="po-loading">Generating Purchase Orders...</div>
    
    if (orders.length === 0) return (
        <div className="po-empty">
            <FaFileInvoice className="empty-icon" />
            <h3>No Orders Found</h3>
            <p>
                {filterIssued 
                    ? "No Purchase Orders have been formally issued for this project yet." 
                    : "Go to 'Vendor Selection' and confirm a vendor for your materials first."}
            </p>
        </div>
    )

    const vendorInfo = selectedVendorGroup?.vendor
    const poItems = selectedVendorGroup?.items || []

    return (
        <div className="po-container">
            <div className="po-layout">
                {/* Sidebar for multiple POs (by vendor) */}
                <div className="po-sidebar">
                    <h3>Confirmed Vendors</h3>
                    <div className="order-list">
                        {orders.map((group, idx) => (
                            <div 
                                key={idx} 
                                className={`order-item ${selectedVendorGroup === group ? 'active' : ''} ${group.items[0]?.po_issued ? 'issued' : ''}`}
                                onClick={() => setSelectedVendorGroup(group)}
                            >
                                <div className="order-item-header">
                                    <span className="mat-name">{group.vendor?.vendor_name}</span>
                                    {group.items[0]?.po_issued && <FaCheckCircle className="issued-icon" title="PO Issued" />}
                                </div>
                                <div className="vendor-item-details">
                                    {group.items.map((it, i) => (
                                        <div key={i} className="mini-spec">
                                            {it.part} ({it.grade_name || it.material}, {it.size})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="po-content">
                    <div className="po-document-scroller">
                        <div className="po-document" ref={poRef}>
                            <header className="doc-header">
                                <div className="header-top">
                                    <div className="doc-type">PURCHASE ORDER</div>
                                    <div className="company-branding">
                                        <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy Logo" className="po-logo-img" />
                                        <span>CALBUY PROCUREMENT HUB</span>
                                    </div>
                                </div>
                                <div className="header-bottom">
                                    <div className="po-meta">
                                        <div className="meta-row"><strong>PO Date:</strong> 
                                            {isEditing ? (
                                                <input type="text" value={poDate} onChange={e => setPoDate(e.target.value)} className="po-inline-input" />
                                            ) : poDate}
                                        </div>
                                        <div className="meta-row"><strong>Project:</strong> {project.name}</div>
                                    </div>
                                    <div className="doc-id">PO #{String(project.id).padStart(4, '0')}-{vendorInfo?.vendor_id}</div>
                                </div>
                            </header>

                            <section className="doc-grid">
                                <div className="doc-col">
                                    <h4 className="section-label"><FaBuilding /> ORGANIZATION (BUYER)</h4>
                                    <div className="doc-box">
                                        <div className="org-title">{buyerProfile?.organization_name || 'Organization Name'}</div>
                                        <p>{buyerProfile?.address}</p>
                                        <p>{buyerProfile?.city}, {buyerProfile?.state}, {buyerProfile?.country}</p>
                                        <p><strong>Email:</strong> {buyerProfile?.email}</p>
                                        <p><strong>Phone:</strong> {buyerProfile?.phone_number || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="doc-col">
                                    <h4 className="section-label"><FaTruckLoading /> CONFIRMED VENDOR (SELLER)</h4>
                                    <div className="doc-box">
                                        <div className="org-title">{vendorInfo?.vendor_name}</div>
                                        <p>{vendorInfo?.vendor_address}</p>
                                        <p>{vendorInfo?.city}, {vendorInfo?.state}, {vendorInfo?.country}</p>
                                        <p><strong>Email:</strong> {vendorInfo?.vendor_email}</p>
                                        <p><strong>Phone:</strong> {vendorInfo?.vendor_mobile}</p>
                                    </div>
                                </div>
                            </section>

                            <table className="doc-table detailed-po-table">
                                <thead>
                                    <tr>
                                        <th>ITEM DETAILS</th>
                                        <th>QTY & UNIT</th>
                                        <th>LOGISTICS</th>
                                        <th className="txt-right">PRICE INFO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {poItems.map((item, idx) => {
                                        const unitPrice = Number(item.selected_quotation_details?.price || 0);
                                        const qty = Number(item.quantity || 0);
                                        const negoPerc = Number(item.selected_quotation_details?.negotiation_percentage || 0);
                                        const qtyType = (item.quantity_type || '').toLowerCase();
                                        
                                        let baseTotal = 0;
                                        if (qtyType.includes('length') || qtyType.includes('area')) {
                                            baseTotal = unitPrice;
                                        } else {
                                            baseTotal = unitPrice * qty;
                                        }

                                        const total = baseTotal * (1 - negoPerc / 100);

                                        return (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="item-main">{item.formatted_part}</div>
                                                    <div className="item-sub">Size: {item.size} •</div>
                                                    <div className="item-sub">Grade: {item.grade_name || item.material}</div>
                                                    <div className="item-date">Required: {item.date_of_requirement || 'ASAP'}</div>
                                                </td>
                                                <td>
                                                    <div className="qty-val">{qty.toFixed(2)}</div>
                                                    <div className="qty-unit">({item.unit})</div>
                                                    <div className="qty-type">{item.quantity_type}</div>
                                                </td>
                                                <td>
                                                    <div className="ship-loc">
                                                        {item.selected_quotation_details?.shipment_from_location || 'Not specified'}
                                                    </div>
                                                    <div className="dist-val"><FaRoute size={10} /> {item.selected_quotation_details?.distance_km?.toFixed(1)} km</div>
                                                    <div className="lead-time">Lead: {item.selected_quotation_details?.lead_time_days} days</div>
                                                </td>
                                                <td className="txt-right">
                                                    <div className="unit-price">
                                                        {item.selected_quotation_details?.currency} {unitPrice.toLocaleString()}
                                                        {qtyType.includes('count') && <small style={{fontSize: '0.65rem', marginLeft: '4px'}}>/unit</small>}
                                                    </div>
                                                    <div className="nego-val">Nego: {negoPerc}%</div>
                                                    <div className="total-val"><strong>{item.selected_quotation_details?.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="3" className="txt-right label-cell">
                                            <span className="total-label-text">GRAND TOTAL</span>
                                        </td>
                                        <td className="grand-total-box txt-right">
                                            <div className="gt-currency">{vendorInfo?.currency}</div>
                                            <div className="gt-amount">
                                                {poItems.reduce((acc, item) => {
                                                    const up = Number(item.selected_quotation_details?.price || 0);
                                                    const q = Number(item.quantity || 0);
                                                    const np = Number(item.selected_quotation_details?.negotiation_percentage || 0);
                                                    const qt = (item.quantity_type || '').toLowerCase();
                                                    
                                                    let bt = (qt.includes('length') || qt.includes('area')) ? up : (up * q);
                                                    return acc + (bt * (1 - np / 100));
                                                }, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            <footer className="doc-footer">
                                <div className="po-terms">
                                    <h5>Terms & Conditions</h5>
                                    {isEditing ? (
                                        <div className="terms-edit">
                                            {terms.map((t, i) => (
                                                <div key={i} className="term-row-edit">
                                                    <input 
                                                        type="text" 
                                                        value={t} 
                                                        onChange={e => {
                                                            const newTerms = [...terms]
                                                            newTerms[i] = e.target.value
                                                            setTerms(newTerms)
                                                        }} 
                                                        className="po-inline-input term-input"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <ul>
                                            {terms.map((t, i) => <li key={i}>{t}</li>)}
                                        </ul>
                                    )}
                                </div>
                                <div className="po-signatures">
                                    <div className="sig-block">
                                        <div className="sig-space"></div>
                                        <span>Authorized Signatory</span>
                                    </div>
                                </div>
                            </footer>
                        </div>
                    </div>

                    <div className="po-actions">
                        {isEditing ? (
                            <button className="btn btn-success btn-lg" onClick={() => setIsEditing(false)}>
                                <FaSave /> Save Changes
                            </button>
                        ) : (
                            <>
                                {!filterIssued && (
                                    <button className="btn btn-warning btn-lg" onClick={() => setIsEditing(true)} disabled={selectedVendorGroup?.items[0]?.po_issued}>
                                        <FaEdit /> Edit PO Contents
                                    </button>
                                )}
                                <button className="btn btn-primary btn-lg" onClick={handleDownloadPDF}>
                                    <FaDownload /> Download PO PDF
                                </button>
                                <button 
                                    className={`btn btn-lg ${selectedVendorGroup?.items[0]?.po_issued ? 'btn-secondary' : 'btn-success'}`} 
                                    onClick={handleIssuePO}
                                    disabled={issuingPO || selectedVendorGroup?.items[0]?.po_issued}
                                >
                                    {issuingPO ? (
                                        <div className="spinner-border spinner-border-sm"></div>
                                    ) : selectedVendorGroup?.items[0]?.po_issued ? (
                                        <><FaCheckCircle /> PO Issued</>
                                    ) : (
                                        <><FaPaperPlane /> Issue PO</>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
