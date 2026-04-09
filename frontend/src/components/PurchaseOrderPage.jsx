import { useState, useEffect, useRef } from 'react'
import { FaFileInvoice, FaDownload, FaEdit, FaCheckCircle, FaBuilding, FaUser, FaBox, FaSave } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './PurchaseOrderPage.css'

export const PurchaseOrderPage = ({ project }) => {
    const { user: buyerProfile } = useAuth()
    const [orders, setOrders] = useState([])
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const poRef = useRef(null)

    useEffect(() => {
        if (project?.id) {
            loadConfirmedOrders()
        }
    }, [project])

    const loadConfirmedOrders = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/bom/?project_id=${project.id}&confirmed_only=true`)
            const data = await res.json()
            setOrders(data)
            if (data.length > 0) setSelectedOrder(data[0])
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
        
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgProps = pdf.getImageProperties(imgData)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`PurchaseOrder_${selectedOrder?.id}.pdf`)
    }

    if (loading) return <div className="po-loading">Generating Purchase Orders...</div>
    if (orders.length === 0) return (
        <div className="po-empty">
            <FaFileInvoice className="empty-icon" />
            <h3>No Confirmed Vendors Yet</h3>
            <p>Go to "Vendor Selection" and confirm a vendor for your materials first.</p>
        </div>
    )
    return (
        <div className="po-container view-container"> 
            <div className="po-content">
                <div className="po-document-scroller">
                    <div className="po-document" ref={poRef}>
                        <header className="doc-header">
                            <div className="doc-type">PURCHASE ORDER</div>
                            <div className="doc-id">PO #{selectedOrder?.id?.toString().padStart(6, '0')}</div>
                        </header>

                        <section className="doc-grid">
                            <div className="doc-col">
                                <h4><FaBuilding /> BILL FROM</h4>
                                <div className={`doc-box ${isEditing ? 'editable active' : ''}`} contentEditable={isEditing}>
                                    <strong>{buyerProfile?.organization_name || 'Organization Name'}</strong><br />
                                    {buyerProfile?.organization_location || 'Organization Location'}<br />
                                    {buyerProfile?.email}<br />
                                    {buyerProfile?.phone_number || 'Phone Number'}
                                </div>
                            </div>
                            <div className="doc-col">
                                <h4><FaUser /> BILL TO</h4>
                                <div className={`doc-box ${isEditing ? 'editable active' : ''}`} contentEditable={isEditing}>
                                    <strong>{selectedOrder?.selected_quotation_details?.vendor_name}</strong><br />
                                    {selectedOrder?.selected_quotation_details?.vendor_address || selectedOrder?.selected_quotation_details?.shipment_from_location}<br />
                                    {selectedOrder?.selected_quotation_details?.vendor_email}<br />
                                    {selectedOrder?.selected_quotation_details?.vendor_mobile}
                                </div>
                            </div>
                        </section>

                        <table className="doc-table">
                            <thead>
                                <tr>
                                    <th>Item Description</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td contentEditable={isEditing}>{selectedOrder?.material}</td>
                                    <td contentEditable={isEditing}>{Number(selectedOrder?.quantity).toFixed(2)} Units</td>
                                    <td contentEditable={isEditing}>${selectedOrder?.selected_quotation_details?.price}</td>
                                    <td className="txt-bold">${(Number(selectedOrder?.quantity) * (selectedOrder?.selected_quotation_details?.price || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="3">Total Amount</td>
                                    <td className="total-amt">${(Number(selectedOrder?.quantity) * (selectedOrder?.selected_quotation_details?.price || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <footer className="doc-footer">
                            <div className="terms">
                                <h5>Terms & Conditions</h5>
                                <ul className={`${isEditing ? 'editable active' : ''}`} contentEditable={isEditing}>
                                    <li>Delivery within {selectedOrder?.selected_quotation_details?.lead_time_days || '28'} days.</li>
                                    <li>Payment within 30 days of invoice receipt.</li>
                                </ul>
                            </div>
                            <div className="signature">
                                <div className="sig-line" contentEditable={isEditing}>Authorized Signatory</div>
                            </div>
                        </footer>
                    </div>
                </div>

            <div className="po-actions">
                <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={isEditing}>
                    <FaDownload /> Download PDF
                </button>
                <button 
                    className={`btn ${isEditing ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => setIsEditing(!isEditing)}
                >
                    {isEditing ? <><FaSave /> Save Changes</> : <><FaEdit /> Edit Details</>}
                </button>
            </div>
            </div>
        </div>
    )
}

