import { useState, useEffect } from 'react'
import { FaEnvelopeOpenText, FaPaperPlane, FaUserEdit, FaTrash } from 'react-icons/fa'
import { sendRfqs } from '../api/vendor'
import './RFQPage.css'

export function RFQPage({ project, vendors = [], setView }) {
    const [rfqs, setRfqs] = useState([])

    useEffect(() => {
        if (vendors && vendors.length > 0) {
            // Group by material: one RFQ per material, with all matching vendors listed
            const materialMap = {}
            vendors.forEach(v => {
                const materials = v.matched_materials || []
                materials.forEach(mat => {
                    if (!materialMap[mat]) {
                        materialMap[mat] = []
                    }
                    materialMap[mat].push({
                        id: v.id,
                        vendor_id: v.vendor_id,
                        vendor_name: v.vendor_name,
                        location: v.location || 'Unknown',
                    })
                })
            })

            const initialRfqs = Object.entries(materialMap).map(([material, vendorList], idx) => ({
                id: `rfq-${idx}`,
                material,
                vendors: vendorList,
                subject: `Request for Quotation: ${material}`,
                body: `Dear Sir/Madam,

We are interested in procuring the following material/component from you:
- ${material}

Please provide us with your best quote and estimated lead time for this item.

Best regards,
Procurement Team`,
            }))
            setRfqs(initialRfqs)
        } else {
            setRfqs([])
        }
    }, [vendors])

    const handleUpdateRfq = (id, field, value) => {
        setRfqs(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    const handleRemoveRfq = (id) => {
        setRfqs(prev => prev.filter(r => r.id !== id))
    }

    const handleSendAll = async () => {
        try {
            const data = await sendRfqs(rfqs)
            alert(data?.message || 'RFQs sent successfully for all materials!')
        } catch (error) {
            console.error('Error sending RFQs:', error)
            alert(error.message || 'An error occurred while sending RFQs.')
        }
    }

    return (
        <div className="rfq-container">
            <header className="rfq-header">
                <div className="rfq-header-left">
                    <div className="rfq-icon"><FaEnvelopeOpenText /></div>
                    <div className="rfq-title">
                        <h2>Request for Quotation</h2>
                        <p>Generate and send RFQs to selected vendors</p>
                    </div>
                </div>
            </header>

            <div className="rfq-content">
                {rfqs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✉️</div>
                        <h3>No Vendors Selected</h3>
                        <p>Go to the "Matching Vendor" tab and click "Send Mail" to start creating RFQs.</p>
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
                                        <span className="vendor-badge rfq-mat-badge">{r.material}</span>
                                        <h4>{r.vendors.length} Vendor{r.vendors.length > 1 ? 's' : ''}</h4>
                                    </div>
                                    <button className="btn-icon-danger" onClick={() => handleRemoveRfq(r.id)}>
                                        <FaTrash />
                                    </button>
                                </div>

                                <div className="rfq-card-body">
                                    <div className="input-group">
                                        <label>Subject</label>
                                        <input
                                            type="text"
                                            value={r.subject}
                                            onChange={(e) => handleUpdateRfq(r.id, 'subject', e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <div className="label-row">
                                            <label>Message Template</label>
                                            <span className="edit-hint"><FaUserEdit /> Editable</span>
                                        </div>
                                        <textarea
                                            rows={10}
                                            value={r.body}
                                            onChange={(e) => handleUpdateRfq(r.id, 'body', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {rfqs.length > 0 && (
                <div className="rfq-page-footer">
                    <button className="btn btn-primary btn-lg" onClick={handleSendAll}>
                        <FaPaperPlane /> Send All RFQs
                    </button>
                </div>
            )}
        </div>
    )
}
