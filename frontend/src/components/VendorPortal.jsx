import { useState, useEffect } from 'react'
import { FaProjectDiagram, FaEnvelope, FaLock, FaCheckCircle, FaExclamationCircle, FaUserShield, FaClock, FaCheckSquare } from 'react-icons/fa'
import { MdDateRange, MdProductionQuantityLimits } from "react-icons/md";
import { portalLogin, fetchVendorQuotations, submitQuotation, fetchPortalItems } from '../api/vendor'
import './VendorPortal.css'

export function VendorPortal({ initialProjectId }) {
    const [view, setView] = useState('login') // 'login', 'dashboard', 'submission-form'
    const [credentials, setCredentials] = useState({ project_id: initialProjectId || '', email: '', password: '' })
    const [auth, setAuth] = useState(null)
    const [rfqs, setRfqs] = useState([

    ])
    const [selectedRfq, setSelectedRfq] = useState(null)
    const [submission, setSubmission] = useState({
        part_number: '',
        material_name: '',
        location: '',
        lead_time: '',
        count: '',
        price: '',
        notes: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (initialProjectId) {
            setCredentials(prev => ({ ...prev, project_id: initialProjectId }));
        }
    }, [initialProjectId]);

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        if (!credentials.project_id || !credentials.email || !credentials.password) return;

        try {
            setSubmitting(true);
            const data = await portalLogin(credentials);
            setAuth({
                vendor_id: data.vendor_id,
                vendor_name: data.vendor_name || 'Verified Vendor',
                project: data.project_name,
                project_id: data.project_id,
                token: data.token
            });

            // Load both required items and existing quotations
            const [items, quotes] = await Promise.all([
                fetchPortalItems(data.project_id, data.vendor_id),
                fetchVendorQuotations(data.project_id, data.vendor_id)
            ]);

            // Merge them: if an item has a quote, mark it as submitted and include its data
            const merged = items.map(item => {
                const q = quotes.find(quote => quote.material_name === item.material);
                const isRealSubmission = q && (q.price !== null || q.count !== null);

                if (isRealSubmission) {
                    return {
                        ...item,
                        status: 'submitted',
                        price: q.price,
                        lead_time: q.lead_time_days || q.lead_time,
                        notes: q.notes,
                        existing_quote_id: q.id
                    };
                }
                return { ...item, status: 'pending' };
            });

            setRfqs(merged);
            setView('dashboard');
        } catch (err) {
            console.error('Login failed:', err);
            setError(err.message || 'Invalid project credentials or unauthorized email.');
        } finally {
            setSubmitting(false);
        }
    }

    const handleSubmitQuote = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await submitQuotation(auth.project_id, auth.vendor_id, {
                material_name: submission.material_name,
                part_number: submission.part_number,
                location: submission.location,
                count: submission.count,
                price: submission.price,
                lead_time: submission.lead_time,
                notes: submission.notes,
                bom_item_id: selectedRfq.id || 0
            });
            alert("Quotation submitted successfully for " + submission.material_name)

            // Update local state by re-fetching items to ensure full data sync
            const items = await fetchPortalItems(auth.project_id, auth.vendor_id);
            const quotes = await fetchVendorQuotations(auth.project_id, auth.vendor_id);
            const merged = items.map(item => {
                const q = quotes.find(quote => quote.material_name === item.material);
                const isRealSubmission = q && (q.price !== null || q.count !== null);
                return isRealSubmission ? {
                    ...item,
                    status: 'submitted',
                    price: q.price,
                    lead_time: q.lead_time_days || q.lead_time,
                    notes: q.notes,
                    existing_quote_id: q.id
                } : { ...item, status: 'pending' };
            });

            setRfqs(merged);
            setView('dashboard');
        } catch (err) {
            console.error('Submission failed:', err);
            alert(err.message || 'Failed to submit quotation.');
        } finally {
            setSubmitting(false)
        }
    }

    if (view === 'login') {
        return (
            <div className="portal-login-screen">
                <div className="portal-brand">
                    <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy" className="portal-logo-img" />
                    <div className="portal-brand-text">
                        <h2>Vendor Hub</h2>
                        <p>Powered by Calbuy</p>
                    </div>
                </div>

                <div className="login-card shadow-2xl">
                    <header className="login-header">
                        <h3>Vendor Quotation Login</h3>
                        <p>Access your project requirements and submit bids.</p>
                    </header>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label><FaEnvelope /> Email Address</label>
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={credentials.email}
                                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label><FaLock /> Access Password</label>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                required
                            />
                        </div>

                        {error && <div className="error-box"><FaExclamationCircle /> {error}</div>}

                        <button type="submit" className="btn btn-primary portal-btn" disabled={submitting}>
                            {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : "Sign In to Portal"}
                        </button>

                        <div className="login-footer">
                            <p>Issues with login? <a href="mailto:procurement@calbuy.com">Contact Procurement Team</a></p>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    if (view === 'dashboard') {
        const isPastDeadline = (deadlineStr) => {
            if (!deadlineStr) return false;
            const deadline = new Date(deadlineStr);
            deadline.setHours(23, 59, 59, 999);
            return new Date() > deadline;
        };

        const handleActionClick = (rfq) => {
            setSelectedRfq(rfq);

            // Try to parse location from notes if it was concatenated
            let location = '';
            let notes = rfq.notes || '';
            if (notes.startsWith('Location: ')) {
                const parts = notes.split('. ');
                location = parts[0].replace('Location: ', '');
                notes = parts.slice(1).join('. ');
            }

            setSubmission({
                part_number: rfq.part_number || '',
                material_name: rfq.material || '',
                count: rfq.quantity || '',
                location: location,
                lead_time: rfq.lead_time || '',
                price: rfq.price || '',
                notes: notes
            });
            setView('submission-form');
        };

        return (
            <div className="portal-dashboard-wrapper">
                <header className="portal-dash-header">
                    <div className="header-left">
                        <div className="brand-small">
                            <img src="/assest/images/calbuy-logo.jpeg" alt="Logo" className="mini-logo" />
                            <h3>Vendor <span>Hub</span></h3>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="header-project-badge">
                            <span className="label">ACTIVE PROJECT</span>
                            <span className="value">{auth.project}</span>
                        </div>
                        <button className="btn-logout" onClick={() => setView('login')}>Logout</button>
                    </div>
                </header>

                <div className="portal-scroll-container">
                    <div className="dash-hero-minimal">
                        <div className="hero-content">
                            <h4>Required Items <span>List</span></h4>
                        </div>
                    </div>

                    <div className="dash-content-aligned">
                        <div className="portal-container">
                            <div className="rfq-grid-portal">
                                {rfqs.map(r => {
                                    const pastDeadline = isPastDeadline(r.deadline);
                                    return (
                                        <div key={r.id} className={`rfq-portal-card shadow-sm ${r.status === 'submitted' ? 'status-submitted' : ''}`}>
                                            <div className="card-top">
                                                <div className="mat-badge-lg">{r.material}</div>
                                                <div className="rfq-id">{r.part_number || r.id}</div>
                                            </div>
                                            <div className="card-details">
                                                <div className="detail-item">
                                                    <label><MdProductionQuantityLimits /> Quantity</label>
                                                    <span>{r.quantity} Units</span>
                                                </div>
                                                <div className="detail-item">
                                                    <label><MdDateRange /> Target Date</label>
                                                    <span>{new Date(r.expected_date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <label><FaClock /> Deadline</label>
                                                    <span className={`deadline-badge ${pastDeadline ? 'expired' : ''}`}>
                                                        {new Date(r.deadline).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="card-footer-portal">
                                                {r.status === 'submitted' ? (
                                                    <div className="submission-actions">
                                                        <div className="submitted-notice">
                                                            <FaCheckCircle /> Quotation Submitted
                                                        </div>
                                                        {!pastDeadline && (
                                                            <button
                                                                className="btn btn-secondary portal-btn-sm mt-3"
                                                                onClick={() => handleActionClick(r)}
                                                            >
                                                                Edit & Resubmit
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn btn-primary portal-btn"
                                                        disabled={pastDeadline}
                                                        onClick={() => handleActionClick(r)}
                                                    >
                                                        {pastDeadline ? "Submission Closed" : "Submit Quotation"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (view === 'submission-form') {
        return (
            <div className="portal-form-wrapper">
                <header className="portal-dash-header fixed-top">
                    <div className="header-left">
                        <button className="btn-back-portal" onClick={() => setView('dashboard')}>← Back to Dashboard</button>
                    </div>
                    <div className="header-right">
                        <div className="header-project-badge mr-3">
                            <span className="label">QUOTING FOR</span>
                            <span className="value">{selectedRfq.material}</span>
                        </div>
                        <span className="rfq-id-pill">RFQ ID: {selectedRfq.id}</span>
                    </div>
                </header>

                <div className="portal-scroll-container pt-header">
                    <div className="portal-form-container">
                        <div className="form-wrapper shadow-2xl">
                            <div className="form-hero-badge">
                                <h3>Submit Quote Specification</h3>
                                <div className="deadline-timer">
                                    <FaClock /> Deadline: {new Date(selectedRfq.deadline).toLocaleDateString()}
                                </div>
                            </div>

                            <form className="quotation-submit-form" onSubmit={handleSubmitQuote}>
                                <div className="form-grid-portal">
                                    <div className="input-group">
                                        <label>Part Number</label>
                                        <input
                                            type="text"
                                            value={submission.part_number}
                                            readOnly
                                            className="form-control-readonly"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Material Name</label>
                                        <input
                                            type="text"
                                            value={submission.material_name}
                                            readOnly
                                            className="form-control-readonly"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Shipment From (Location)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Shanghai Warehouse"
                                            value={submission.location}
                                            onChange={(e) => setSubmission({ ...submission, location: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Lead Time (Days)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 15 days"
                                            value={submission.lead_time}
                                            onChange={(e) => setSubmission({ ...submission, lead_time: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Supplying Quantity</label>
                                        <input
                                            type="number"
                                            value={submission.count}
                                            onChange={(e) => setSubmission({ ...submission, count: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Unit Price (USD)</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={submission.price}
                                            onChange={(e) => setSubmission({ ...submission, price: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group full-width">
                                        <label>Additional Notes</label>
                                        <textarea
                                            placeholder="Specific technical details or shipping terms..."
                                            rows={3}
                                            value={submission.notes}
                                            onChange={(e) => setSubmission({ ...submission, notes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="portal-form-footer-right">
                                    <p className="footer-notice">This submission can be edited until the deadline.</p>
                                    <button type="submit" className="btn btn-primary portal-btn-lg" disabled={submitting}>
                                        {submitting ? <span className="spinner-border"></span> : <><FaCheckSquare /> Submit Final Quotation</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return null
}