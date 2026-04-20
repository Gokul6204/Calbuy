import { useState, useEffect } from 'react'
import { FaEnvelopeOpenText, FaPaperPlane, FaUserEdit, FaTrash } from 'react-icons/fa'
import { VscLoading } from "react-icons/vsc";
import { sendRfqs } from '../api/vendor'
import { useAlert } from '../context/NotificationContext'
import './RFQPage.css'

export function RFQPage({ project, vendors = [], bomList = [], quotations = [], setView }) {
    const { showAlert } = useAlert()
    const [rfqs, setRfqs] = useState([])
    const [isSending, setIsSending] = useState(false)

    const calculateDefaultDeadline = () => {
        const date = new Date()
        date.setDate(date.getDate() + 14) // 2 weeks from now
        const day = date.getDay()
        if (day === 6) date.setDate(date.getDate() - 1)
        else if (day === 0) date.setDate(date.getDate() + 1)
        return date.toISOString().split('T')[0]
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '[Submission Deadline]'
        const [year, month, day] = dateStr.split('-')
        return `${day}-${month}-${year}`
    }

    const generateSpecsList = (items) => {
        const itemsByPart = {}
        items.forEach(item => {
            const partKey = (item.formatted_part || item.part_name || item.part || 'Other').trim()
            if (!itemsByPart[partKey]) itemsByPart[partKey] = []
            itemsByPart[partKey].push(item)
        })

        return Object.entries(itemsByPart).map(([partName, partItems]) => {
            const bullets = partItems.map(item => {
                const qtyStr = `${Number(item.quantity).toFixed(2)} ${item.unit || 'nos'}`
                const dateStr = item.date_of_requirement ? formatDate(item.date_of_requirement) : 'ASAP'
                return `    • Size: ${item.size} | Grade: ${item.grade_name || item.material} | Qty: ${qtyStr} | Required: ${dateStr}`
            }).join('\n')
            return `[ ${partName} ]\n${bullets}`
        }).join('\n\n')
    }

    useEffect(() => {
        if (vendors && vendors.length > 0 && bomList.length > 0) {
            const defaultDeadline = calculateDefaultDeadline()
            const formattedDeadline = formatDate(defaultDeadline)

            // 1. Map BOM items to each Vendor based on matching parts
            const vendorPackages = vendors.map(v => {
                const vendorIntendedParts = (v.intended_parts || []).map(p => p.toLowerCase().trim())
                
                const matchedItems = bomList.filter(item => {
                    const partName = (item.formatted_part || item.part_name || item.part || 'Other').trim().toLowerCase()
                    return vendorIntendedParts.includes(partName)
                })

                const itemsByCat = {}
                matchedItems.forEach(item => {
                    const cat = (item.category || 'Uncategorized').trim().toUpperCase()
                    if (!itemsByCat[cat]) itemsByCat[cat] = []
                    itemsByCat[cat].push(item)
                })

                return { vendor: v, itemsByCat, allItems: matchedItems }
            })

            // 2. Group these packages into ONE RFQ PER CATEGORY (Strictly)
            const categoryGroups = {}
            vendorPackages.forEach(pkg => {
                Object.entries(pkg.itemsByCat).forEach(([catName, items]) => {
                    if (!categoryGroups[catName]) {
                        categoryGroups[catName] = {
                            category: catName,
                            vendors: [],
                            allItems: []
                        }
                    }
                    categoryGroups[catName].vendors.push(pkg.vendor)
                    // Track which items THIS vendor provides in this category
                    pkg.vendor.category_items = pkg.vendor.category_items || {}
                    pkg.vendor.category_items[catName] = items
                })
            })

            const initialRfqs = Object.entries(categoryGroups).map(([catName, group], idx) => {
                // For the UI template body, we show the full list of category parts from the BOM
                const fullCatItems = bomList.filter(i => (i.category || 'Uncategorized').trim().toUpperCase() === catName)

                return {
                    id: `rfq-${idx}`,
                    category: catName,
                    vendors: group.vendors,
                    subject: `Request for Quotation - ${catName}`,
                    deadline: defaultDeadline,
                    body: `Dear Sir/Madam,

We are interested in procuring the following items within the ${catName} category for our project.

[ITEM_SPECS_LIST]

PROJECT REQUIREMENT:
${project?.description || 'Standard industry specifications apply.'}

VENDORS PORTAL ACCESS:
You can manage and submit your quotes directly on our procurement portal:
Portal Link: http://localhost:5173/portal/${project?.id || 'PROJECT_ID'}

CREDENTIALS:
Login Email: [Your Registered Email]
Access Password: ${project?.project_password || 'N/A'}

Submission Deadline: ${formattedDeadline}

Please provide your best commercial quote and lead time.

Best regards,
Procurement Team`,
                    bom_category_items: fullCatItems
                }
            })

            setRfqs(initialRfqs)
        } else {
            setRfqs([])
        }
    }, [vendors, project, bomList])

    const handleUpdateRfq = (id, field, value) => {
        setRfqs(prev => prev.map(r => {
            if (r.id === id) {
                let updatedRfq = { ...r, [field]: value }
                if (field === 'deadline') {
                    const oldFormatted = formatDate(r.deadline)
                    const newFormatted = formatDate(value)
                    if (r.body.includes(`Submission Deadline: ${oldFormatted}`)) {
                        updatedRfq.body = r.body.replace(`Submission Deadline: ${oldFormatted}`, `Submission Deadline: ${newFormatted}`)
                    }
                }
                return updatedRfq
            }
            return r
        }))
    }

    const handleRemoveRfq = (id) => {
        setRfqs(prev => prev.filter(r => r.id !== id))
    }

    const prepareVendorSpecificRfqs = (baseRfqs) => {
        const finalRfqs = []
        baseRfqs.forEach(rfq => {
            rfq.vendors.forEach(vendor => {
                // Get strictly the items this vendor holds for this category
                const vendorItems = vendor.category_items?.[rfq.category] || []
                if (vendorItems.length === 0) return

                const vendorSpecs = generateSpecsList(vendorItems)
                let vendorBody = rfq.body.replace('[ITEM_SPECS_LIST]', vendorSpecs)
                
                // Dynamically inject the correct vendor email if the placeholder still exists
                if (vendor.vendor_email) {
                    vendorBody = vendorBody.replace('[Your Registered Email]', vendor.vendor_email)
                }

                finalRfqs.push({
                    ...rfq,
                    vendors: [vendor],
                    body: vendorBody,
                    granular_items: vendorItems
                })
            })
        })
        return finalRfqs
    }

    const handleSendSingle = async (rfq) => {
        if (isSending) return;
        setIsSending(true)
        try {
            const vendorSpecific = prepareVendorSpecificRfqs([rfq])
            await sendRfqs(vendorSpecific, project?.id)
            showAlert(`RFQ for ${rfq.category} sent successfully to ${rfq.vendors.length} vendors!`, 'success')
            handleRemoveRfq(rfq.id)
            if (rfqs.length === 1) setView('quotation')
        } catch (error) {
            showAlert(error.message || 'Error sending RFQ.', 'error')
        } finally {
            setIsSending(false)
        }
    }

    const handleSendAll = async () => {
        if (isSending) return;
        setIsSending(true)
        try {
            const vendorSpecific = prepareVendorSpecificRfqs(rfqs)
            await sendRfqs(vendorSpecific, project?.id)
            showAlert('All RFQs sent successfully with vendor-specific parts!', 'success')
            setView('quotation')
        } catch (error) {
            showAlert(error.message || 'An error occurred while sending RFQs.', 'error')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="rfq-container">
            <header className="rfq-header">
                <div className="rfq-header-left">
                    <div className="rfq-icon"><FaEnvelopeOpenText /></div>
                    <div className="rfq-title">
                        <h2>Request for Quotation</h2>
                        <p>Generate one template per category</p>
                    </div>
                </div>
            </header>

            <div className="rfq-content">
                {rfqs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">{quotations.length > 0 ? '✅' : '✉️'}</div>
                        {quotations.length > 0 ? (
                            <>
                                <h3>RFQs Already Sent</h3>
                                <p>Already sent the mail to the matched vendors for this project.</p>
                            </>
                        ) : (
                            <>
                                <h3>No Vendors Selected</h3>
                                <p>Go to "Matching Vendor" and select vendors to start generating category templates.</p>
                            </>
                        )}
                        <button className="btn btn-secondary mt-4" onClick={() => setView('matching-vendor')}>
                            Go to Matching Vendors
                        </button>
                    </div>
                ) : (
                    <div className="rfq-list">
                        {rfqs.map(r => (
                            <div key={r.id} className="rfq-card">
                                <div className="rfq-card-header">
                                    <div className="vendor-info">
                                        <span className="vendor-badge rfq-mat-badge">{r.category}</span>
                                        <h4>{r.vendors.length} Vendor{r.vendors.length > 1 ? 's' : ''} in this group</h4>
                                        <div className="v-names-list">
                                            {r.vendors.map(v => v.vendor_name).join(', ')}
                                        </div>
                                    </div>
                                    <div className="rfq-card-header-actions">
                                        <div className="rfq-deadline-picker">
                                            <label>Deadline:</label>
                                            <input
                                                type="date"
                                                value={r.deadline}
                                                onChange={(e) => handleUpdateRfq(r.id, 'deadline', e.target.value)}
                                            />
                                        </div>
                                        <button className="btn-send-single" onClick={() => handleSendSingle(r)} disabled={isSending}>
                                            <FaPaperPlane /> Send Category
                                        </button>
                                        <button className="btn-icon-danger" onClick={() => handleRemoveRfq(r.id)}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>

                                <div className="rfq-card-body">
                                    <div className="input-grade">
                                        <label>Email Subject</label>
                                        <input
                                            type="text"
                                            value={r.subject}
                                            onChange={(e) => handleUpdateRfq(r.id, 'subject', e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group-custom">
                                        <div className="label-row">
                                            <label>Category Template Body</label>
                                            <span className="edit-hint">Uses [ITEM_SPECS_LIST] placeholder</span>
                                        </div>
                                        <textarea
                                            rows={12}
                                            value={r.body}
                                            onChange={(e) => handleUpdateRfq(r.id, 'body', e.target.value)}
                                            className="rfq-textarea"
                                        />
                                    </div>
                                    
                                    <div className="included-items-summary">
                                        <h5>BOM Items in this Category ({r.bom_category_items.length}):</h5>
                                        <div className="items-pills">
                                            {r.bom_category_items.map(item => (
                                                <span key={item.id} className="item-pill">
                                                    {(item.formatted_part || item.part_name || item.part)} - {item.size}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="hint mt-2" style={{fontSize: '0.75rem'}}>Each vendor will only receive the items from this list that they provide.</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {rfqs.length > 0 && (
                <div className="rfq-page-footer">
                    <button className="btn btn-primary btn-lg" onClick={handleSendAll} disabled={isSending}>
                        {isSending ? (
                            <><VscLoading className="spinner-icon" /> Sending RFQs...</>
                        ) : (
                            <><FaPaperPlane /> Send All Category Templates</>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}