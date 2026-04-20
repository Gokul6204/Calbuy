import { useState, useEffect, useMemo, useCallback } from 'react'
import { FaHandshake, FaFileAlt, FaCheckCircle, FaTrash, FaExclamationCircle, FaEnvelopeOpenText, FaClock } from 'react-icons/fa'
import { FaRankingStar } from "react-icons/fa6";
import { fetchProjectQuotations } from '../api/project'
import { useWebSocket } from '../context/WebSocketContext'
import { FaTag, FaTruck, FaMapMarkerAlt } from "react-icons/fa";
import './QuotationPage.css'

export function QuotationPage({ project, onSelectVendor, submissions = [], setSubmissions }) {
    const { subscribe, isConnected } = useWebSocket()
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const unsubscribe = subscribe('quotation_updated', (payload) => {
            // If the update belongs to this project, we should signal a refresh 
            // In a real app we might update the specific item or re-fetch via a callback
            if (payload.project_id === project?.id) {
                // We assume there's a mechanism in App.jsx to refresh this, 
                // but for now we'll rely on the parent's reload logic
            }
        })
        return () => unsubscribe()
    }, [subscribe, project])

    return (
        <div className="quotation-page view-container">
            <header className="page-header">
                <div className="header-left">
                    <div className="header-icon"><FaHandshake /></div>
                    <div className="header-text">
                        <h2>Quotation Submissions</h2>
                        <p>Track and analyze vendor responses for {project?.name}</p>
                    </div>
                    <div className="header-right">
                        <button
                            className="btn btn-select-vendor-ai"
                            onClick={onSelectVendor}
                            disabled={submissions.length === 0}
                        >
                            <FaRankingStar style={{ marginRight: '8px' }} /> Select Vendor
                        </button>
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
                        <FaEnvelopeOpenText size={64} style={{ color: 'var(--accent)', opacity: 0.5, marginBottom: '1.5rem' }} />
                        <h3>No Quotations Received</h3>
                        <p>You haven't received any quotes from vendors yet. Track your sent RFQs and wait for vendors to submit their pricing.</p>
                        <div className="empty-actions">
                            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Refresh Submissions</button>
                        </div>
                    </div>
                ) : (
                    <table className="bom-table">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Part</th>
                                <th>Size</th>
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
                                    <td>{s.part_name}</td>
                                    <td>{s.size}</td>
                                    <td>{s.material}</td>
                                    <td>{s.count || '-'}</td>
                                    <td className="price-tag">
                                        {s.price ? `${s.currency === 'INR' ? '₹' : '$'}${s.price}` : '-'}
                                    </td>
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
                            <div className="detail-grid">
                                <div className="info-card">
                                    <label><FaHandshake style={{ marginRight: '6px' }} /> Vendor</label>
                                    <div className="info-value">{selectedSubmission.vendor_name}</div>
                                    <div className="info-sub">Business ID: {selectedSubmission.vendor_id}</div>
                                </div>
                                <div className="info-card">
                                    <label><FaClock style={{ marginRight: '6px' }} /> Portal Activity</label>
                                    <div className="info-value">
                                        {selectedSubmission.last_login
                                            ? `Last seen: ${new Date(selectedSubmission.last_login).toLocaleString()}`
                                            : "No activity yet"
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="detail-hero">
                                <div className="hero-main">
                                    <span className="material-label">Item Details</span>
                                    <h4>{selectedSubmission.part_name}</h4>
                                    <div className="hero-subline">
                                        <span className="spec-pill">Size: {selectedSubmission.size}</span>
                                        <span className="spec-pill">Grade: {selectedSubmission.material}</span>
                                    </div>
                                </div>
                                <div className="hero-status">
                                    <span className={`badge big status-${selectedSubmission.status.toLowerCase().replace(' ', '-')}`}>
                                        {selectedSubmission.status === 'Submitted' ? <FaCheckCircle /> : <FaClock />}
                                        {selectedSubmission.status}
                                    </span>
                                </div>
                            </div>


                            {selectedSubmission.status === 'Submitted' ? (
                                <div className="quote-data-section">
                                    <h5 className="section-title"><FaTag /> Financial & Delivery Submission</h5>
                                    <div className="data-grid">
                                        <div className="data-item">
                                            <label>Quoted Price</label>
                                            <div className="val highlight">
                                                {selectedSubmission.currency === 'INR' ? '₹' : '$'}
                                                {selectedSubmission.price}
                                                <span className="currency-code">{selectedSubmission.currency}</span>
                                            </div>
                                        </div>
                                        <div className="data-item">
                                            <label>Negotiation Buffer</label>
                                            <div className="val">{selectedSubmission.negotiation_percentage ? `${selectedSubmission.negotiation_percentage}%` : '0%'}</div>
                                        </div>
                                        <div className="data-item">
                                            <label>Lead Time</label>
                                            <div className="val">{selectedSubmission.lead_time} Days</div>
                                        </div>
                                        <div className="data-item">
                                            <label>Submission Date</label>
                                            <div className="val">{new Date(selectedSubmission.submitted_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    <h5 className="section-title" style={{ marginTop: '24px' }}><FaTruck /> Logistics & Shipment</h5>
                                    <div className="data-grid" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="data-item">
                                            <label>Dispatch Origin</label>
                                            <div className="val address-display">
                                                <FaMapMarkerAlt className="marker-icon" />
                                                <div className="address-text">
                                                    <strong>{selectedSubmission.shipment_address}</strong>
                                                    <div className="address-location">
                                                        {selectedSubmission.city}, {selectedSubmission.state}, {selectedSubmission.country}
                                                    </div>
                                                    {selectedSubmission.distance_km && (
                                                        <div className="distance-badge" style={{ marginTop: '8px', fontSize: '0.8rem', color: '#4f46e5', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <FaMapMarkerAlt size={12} /> {parseFloat(selectedSubmission.distance_km).toFixed(1)} km from your organization
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="notes-box">
                                        <label>Special Instructions / Notes</label>
                                        <p>{selectedSubmission.notes || "No additional notes provided."}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="not-submitted-msg">
                                    <FaExclamationCircle />
                                    <p>Quotation has not been submitted by vendor yet.</p>
                                </div>
                            )}

                            {selectedSubmission.status === 'Mail Sent' && (
                                <div className="status-tip sent">
                                    <FaEnvelopeOpenText />
                                    <span>RFQ is out. Waiting for portal access.</span>
                                </div>
                            )}

                            {selectedSubmission.status === 'Pending' && (
                                <div className="status-tip pending">
                                    <FaClock />
                                    <span>Vendor has viewed the RFQ but not quoted yet.</span>
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
