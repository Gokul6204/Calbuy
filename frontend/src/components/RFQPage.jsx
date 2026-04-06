import { useState, useEffect } from 'react'
import { FaEnvelopeOpenText, FaPaperPlane, FaUserEdit, FaTrash } from 'react-icons/fa'
import { VscLoading } from "react-icons/vsc";
import { sendRfqs } from '../api/vendor'
import './RFQPage.css'

export function RFQPage({ project, vendors = [], setView }) {
    const [rfqs, setRfqs] = useState([])
    const [isSending, setIsSending] = useState(false)

    const calculateDefaultDeadline = () => {
        const date = new Date()
        date.setDate(date.getDate() + 14) // 2 weeks from now
        
        const day = date.getDay() // 0 = Sunday, 6 = Saturday
        if (day === 6) { // Saturday -> Friday
            date.setDate(date.getDate() - 1)
        } else if (day === 0) { // Sunday -> Monday
            date.setDate(date.getDate() + 1)
        }
        
        return date.toISOString().split('T')[0] // YYYY-MM-DD
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '[Submission Deadline]'
        const [year, month, day] = dateStr.split('-')
        return `${day}-${month}-${year}`
    }

    useEffect(() => {
        if (vendors && vendors.length > 0) {
            const defaultDeadline = calculateDefaultDeadline()
            const formattedDeadline = formatDate(defaultDeadline)

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
                deadline: defaultDeadline, 
                body: `Dear Sir/Madam,

We are interested in procuring the following material/component from you:
- ${material}

Please provide us with your best quote and estimated lead time for this item.

VENDORS PORTAL ACCESS:
You can also submit and manage your quotation online through our secure portal:
Portal Link: http://localhost:5173/portal/${project?.id || 'PROJECT_ID'}
Login Email: [Your Registered Email]
Project Password: ${project?.project_password || '[Auto-Generated-On-Creation]'}

Submission Deadline: ${formattedDeadline}

Best regards,
Procurement Team`,
            }))
            setRfqs(initialRfqs)
        } else {
            setRfqs([])
        }
    }, [vendors, project])

    const handleUpdateRfq = (id, field, value) => {
        setRfqs(prev => prev.map(r => {
            if (r.id === id) {
                let updatedRfq = { ...r, [field]: value }
                
                // If deadline is updated, also try to update it in the body template
                if (field === 'deadline') {
                    const oldFormatted = formatDate(r.deadline)
                    const newFormatted = formatDate(value)
                    if (r.body.includes(`Submission Deadline: ${oldFormatted}`)) {
                        updatedRfq.body = r.body.replace(
                            `Submission Deadline: ${oldFormatted}`, 
                            `Submission Deadline: ${newFormatted}`
                        )
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

    const handleSendAll = async () => {
        if (isSending) return;
        setIsSending(true)
        try {
            // First: Generate portal access credentials
            const vendorList = []
            rfqs.forEach(rfq => {
               rfq.vendors.forEach(v => {
                  if(!vendorList.find(x => x.vendor_id === v.vendor_id)){
                    vendorList.push({ vendor_id: v.vendor_id, email: v.email || `${v.vendor_id.toLowerCase()}@example.com` })
                  }
               })
            })

            // Call backend to ensure access records exist and get credentials
            console.log("Generating portal access for:", vendorList)

            const data = await sendRfqs(rfqs, project?.id)
            alert(data?.message || 'RFQs sent successfully with portal access credentials!')
            setView('quotation')
        } catch (error) {
            console.error('Error sending RFQs:', error)
            alert(error.message || 'An error occurred while sending RFQs.')
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
                                    <div className="rfq-card-header-actions">
                                        <div className="rfq-deadline-picker">
                                            <label>Deadline:</label>
                                            <input 
                                                type="date"
                                                value={r.deadline}
                                                onChange={(e) => handleUpdateRfq(r.id, 'deadline', e.target.value)}
                                            />
                                        </div>
                                        <button className="btn-icon-danger" onClick={() => handleRemoveRfq(r.id)}>
                                            <FaTrash />
                                        </button>
                                    </div>
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
                    <button className="btn btn-primary btn-lg" onClick={handleSendAll} disabled={isSending}>
                        {isSending ? (
                            <><VscLoading className="spinner-icon" /> Sending...</>
                        ) : (
                            <><FaPaperPlane /> Send All RFQs</>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}