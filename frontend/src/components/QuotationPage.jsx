import { useState, useEffect } from 'react'
import { FaHandshake, FaFileAlt, FaCheckCircle, FaTrash, FaExclamationCircle, FaEnvelopeOpenText, FaClock } from 'react-icons/fa'
import { fetchProjectQuotations } from '../api/project'
import './QuotationPage.css'

export function QuotationPage({ project }) {
    const [submissions, setSubmissions] = useState([])
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!project?.id) return;
        
        const loadQuotations = async () => {
            try {
                setLoading(true)
                const data = await fetchProjectQuotations(project.id)
                setSubmissions(data)
            } catch (err) {
                console.error("Failed to load quotations:", err)
            } finally {
                setLoading(false)
            }
        }
        loadQuotations()
    }, [project])

    return (
        <div className="quotation-page view-container">
            <header className="page-header">
                <div className="header-left">
                    <div className="header-icon"><FaHandshake /></div>
                    <div className="header-text">
                        <h2>Quotation Submissions</h2>
                        <p>Track and analyze vendor responses for {project?.name}</p>
                    </div>
                </div>
            </header>

            <div className="submission-list">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-border"></div>
                        <p>Loading quotations...</p>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="empty-state">
                        <FaFileAlt size={48} />
                        <h3>No Activity Yet</h3>
                        <p>Start by sending RFQs to vendors in the RFQ tab.</p>
                    </div>
                ) : (
                    <table className="bom-table">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Material</th>
                                <th>Count</th>
                                <th>Price</th>
                                <th>Lead Time</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(s => (
                                <tr key={s.id} className={s.status === 'Submitted' ? 'row-submitted' : ''}>
                                    <td className="font-semibold">{s.vendor_name}</td>
                                    <td>{s.material}</td>
                                    <td>{s.count || '-'}</td>
                                    <td className="price-tag">{s.price ? `$${s.price}` : '-'}</td>
                                    <td>{s.lead_time || '-'}</td>
                                    <td>
                                        <span className={`badge status-${s.status.toLowerCase().replace(' ', '-')}`}>
                                            {s.status === 'Submitted' && <FaCheckCircle />} 
                                            {s.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button 
                                            className="btn-view-detail"
                                            onClick={() => setSelectedSubmission(s)}
                                        >
                                            View Detail
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedSubmission && (
                <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
                    <div className="modal-content detail-modal" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <h3>Quotation Detail</h3>
                            <button className="close-modal" onClick={() => setSelectedSubmission(null)}>×</button>
                        </header>
                        <div className="modal-body">
                            <div className="detail-hero">
                                <div className="hero-main">
                                    <span className="material-label">MATERIAL/COMPONENT</span>
                                    <h4>{selectedSubmission.material}</h4>
                                </div>
                                <div className="hero-status">
                                    <span className={`badge big status-${selectedSubmission.status.toLowerCase().replace(' ', '-')}`}>
                                        {selectedSubmission.status}
                                    </span>
                                </div>
                            </div>

                            <div className="detail-grid">
                                <div className="info-card">
                                    <label>Vendor Information</label>
                                    <div className="info-value">{selectedSubmission.vendor_name}</div>
                                    <div className="info-sub">ID: {selectedSubmission.vendor_id}</div>
                                </div>
                                <div className="info-card">
                                    <label>Portal Interaction</label>
                                    <div className="info-value">
                                        {selectedSubmission.last_login 
                                            ? `Last Visit: ${new Date(selectedSubmission.last_login).toLocaleString()}`
                                            : "Never Visited Portal"
                                        }
                                    </div>
                                </div>
                            </div>

                            {selectedSubmission.status === 'Submitted' ? (
                                <div className="quote-data-section">
                                    <h5>Submitted Specifications</h5>
                                    <div className="data-grid">
                                        <div className="data-item">
                                            <label>Unit Price</label>
                                            <div className="val highlight">${selectedSubmission.price}</div>
                                        </div>
                                        <div className="data-item">
                                            <label>Supplying Count</label>
                                            <div className="val">{selectedSubmission.count} Units</div>
                                        </div>
                                        <div className="data-item">
                                            <label>Lead Time</label>
                                            <div className="val">{selectedSubmission.lead_time}</div>
                                        </div>
                                        <div className="data-item">
                                            <label>Submission Date</label>
                                            <div className="val">{new Date(selectedSubmission.submitted_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="notes-box">
                                        <label>Vendor Notes</label>
                                        <p>{selectedSubmission.notes || "No notes provided by vendor."}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="not-submitted-msg">
                                    <FaExclamationCircle /> Quotation have not submitted yet
                                </div>
                            )}

                            {selectedSubmission.status === 'Mail Sent' && (
                                <div className="status-tip sent">
                                    <FaEnvelopeOpenText /> RFQ has been sent to the vendor's email. Waiting for them to access the portal.
                                </div>
                            )}

                            {selectedSubmission.status === 'Pending' && (
                                <div className="status-tip pending">
                                    <FaClock /> Vendor has logged in and viewed the requirement, but has not submitted a formal quote yet.
                                </div>
                            )}
                        </div>
                        <footer className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedSubmission(null)}>Close</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    )
}
