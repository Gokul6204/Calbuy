import { useState, useEffect } from 'react'
import { 
    FaProjectDiagram, FaEnvelope, FaLock, FaCheckCircle, 
    FaExclamationCircle, FaUserShield, FaClock, FaCheckSquare,
    FaArrowLeft, FaSignOutAlt, FaLayerGroup, FaDolly, FaCalendarAlt,
    FaEye, FaEyeSlash
} from 'react-icons/fa'
import { MdDateRange, MdProductionQuantityLimits } from "react-icons/md";
import { portalLogin, fetchVendorQuotations, submitQuotation, fetchPortalItems } from '../api/vendor'
import { useAlert } from '../context/NotificationContext'
import './VendorPortal.css'

export function VendorPortal({ initialProjectId }) {
    const { showAlert } = useAlert()
    const [view, setView] = useState('login') // 'login', 'dashboard', 'submission-form'
    const [credentials, setCredentials] = useState({ project_id: initialProjectId || '', email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [auth, setAuth] = useState(null)
    const [rfqs, setRfqs] = useState([])
    const [selectedRfq, setSelectedRfq] = useState(null)
    const [loading, setLoading] = useState(false)
    const [submission, setSubmission] = useState({
        shipment_address: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        lead_time: '',
        currency: 'USD',
        negotiation_percentage: 0,
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

            setLoading(true);
            const [items, quotes] = await Promise.all([
                fetchPortalItems(data.project_id, data.vendor_id),
                fetchVendorQuotations(data.project_id, data.vendor_id)
            ]);

            const merged = items.map(item => {
                // If it was already submitted, keep it. 
                // But we can also check against quotes to be 100% sure we have the latest.
                const q = quotes.find(quote =>
                    (quote.part_name || '').trim().toLowerCase() === (item.part_name || '').trim().toLowerCase() &&
                    (quote.size_spec || '').trim().toLowerCase() === (item.size || '').trim().toLowerCase() &&
                    (quote.material_name || '').trim().toLowerCase() === (item.material || '').trim().toLowerCase()
                );

                if (q && q.price) {
                    return {
                        ...item,
                        status: 'submitted',
                        price: q.price,
                        lead_time: q.lead_time,
                        notes: q.notes,
                        currency: q.currency,
                        negotiation_percentage: q.negotiation_percentage,
                        existing_quote_id: q.id
                    };
                }
                return item;
            });

            setRfqs(merged);
            setView('dashboard');
        } catch (err) {
            console.error('Login failed:', err);
            setError(err.message || 'Invalid project credentials or unauthorized email.');
        } finally {
            setSubmitting(false);
            setLoading(false);
        }
    }

    const handleSubmitQuote = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await submitQuotation(auth.project_id, auth.vendor_id, {
                material_name: selectedRfq.material,
                part_number: selectedRfq.part_name,
                size_spec: selectedRfq.size,
                shipment_address: submission.shipment_address,
                city: submission.city,
                state: submission.state,
                country: submission.country,
                pincode: submission.pincode,
                lead_time: submission.lead_time,
                price: submission.price,
                notes: submission.notes,
                currency: submission.currency,
                negotiation_percentage: submission.negotiation_percentage
            });
            showAlert("Quotation submitted successfully for " + selectedRfq.part_name, "success")

            setLoading(true);
            const [items, quotes] = await Promise.all([
                fetchPortalItems(auth.project_id, auth.vendor_id),
                fetchVendorQuotations(auth.project_id, auth.vendor_id)
            ]);
            
            const merged = items.map(item => {
                const q = quotes.find(quote =>
                    (quote.part_name || '').trim().toLowerCase() === (item.part_name || '').trim().toLowerCase() &&
                    (quote.size_spec || '').trim().toLowerCase() === (item.size || '').trim().toLowerCase() &&
                    (quote.material_name || '').trim().toLowerCase() === (item.material || '').trim().toLowerCase()
                );
                if (q && q.price) {
                    return {
                        ...item,
                        status: 'submitted',
                        price: q.price,
                        lead_time: q.lead_time,
                        notes: q.notes,
                        currency: q.currency,
                        negotiation_percentage: q.negotiation_percentage,
                        existing_quote_id: q.id
                    };
                }
                return item;
            });

            setRfqs(merged);
            setView('dashboard');
        } catch (err) {
            console.error('Submission failed:', err);
            showAlert(err.message || 'Failed to submit quotation.', "error");
        } finally {
            setSubmitting(false)
            setLoading(false)
        }
    }

    const getDisplayUnit = (partName, existingUnit) => {
        if (existingUnit && existingUnit.toLowerCase() !== 'nos') return existingUnit;
        const name = (partName || '').toUpperCase();
        if (name.includes('PLATE') || (name.includes('PL') && name.split(/\s+/).some(word => word === 'PL' || word.startsWith('PL')))) return 'sq.in';
        if (name.includes('ANGLE') || name.includes('CHAN') || name.includes('BEAM')) return 'ft';
        return existingUnit || 'nos';
    };

    if (view === 'login') {
        return (
            <div className="portal-login-screen">
                {/* ── RIGHT Side Form ── */}
                <section className="portal-auth-form-side">
                    <div className="portal-auth-logo">
                        <div className="portal-brand-circle">
                             <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy" className="portal-brand-img" />
                        </div>
                        <div className="portal-brand-text">
                            <span className="portal-brand-name">CalBuy</span>
                            <span className="portal-brand-tag">VENDOR HUB</span>
                        </div>
                    </div>

                    <div className="portal-auth-form-container">
                        <header className="portal-auth-header">
                            <h2 className="portal-auth-title">Vendor Access</h2>
                            <p className="portal-auth-subtitle">Welcome to the procurement portal. Enter your RFQ credentials.</p>
                        </header>

                        {error && <div className="portal-error-banner">{error}</div>}

                        <form onSubmit={handleLogin} className="login-form">
                            <div className="cb-form-group">
                                <label className="cb-form-label">Email address</label>
                                <input
                                    type="email"
                                    className="cb-input-field"
                                    placeholder="Enter your email"
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="cb-form-group">
                                <label className="cb-form-label">Access Password</label>
                                <div className="cb-password-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="cb-input-field"
                                        placeholder="••••••••"
                                        value={credentials.password}
                                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        className="cb-password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="portal-btn-primary" disabled={submitting}>
                                {submitting ? 'Authenticating...' : 'Sign In to Portal'}
                            </button>
                        </form>

                        <div className="login-footer" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                            <p>Issues with login? <a href="mailto:procurement@calbuy.com" style={{ color: '#7c3aed', fontWeight: 600 }}>Contact procurement</a></p>
                        </div>
                    </div>
                </section>

                {/* ── LEFT Side Flow ── */}
                <aside className="portal-auth-flow-side">
                    <div className="portal-flow-grid" />
                    <div className="portal-pipeline-main-line">
                        <div className="portal-traveling-glow" />
                    </div>

                    <div className="portal-flow-nodes-container">
                        <div className="portal-pipeline-node p-node-1">
                            <span className="portal-node-step">Phase 01</span>
                            <div className="portal-node-name">Review RFQ</div>
                        </div>

                        <div className="portal-pipeline-node p-node-2">
                            <span className="portal-node-step">Phase 02</span>
                            <div className="portal-node-name">Submit Quotation</div>
                        </div>

                        <div className="portal-pipeline-node p-node-3">
                            <span className="portal-node-step">Phase 03</span>
                            <div className="portal-node-name">AI Negotiation</div>
                        </div>

                        <div className="portal-pipeline-node p-node-4">
                            <span className="portal-node-step">Phase 04</span>
                            <div className="portal-node-name">PO Issuance</div>
                        </div>

                        <div className="portal-pipeline-node portal-objective-node">
                            <div className="portal-objective-icon">✓</div>
                            <span className="portal-node-step">Success</span>
                            <div className="portal-node-name">Vendor Confirmed</div>
                        </div>
                    </div>
                </aside>
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

        const groupedRfqs = rfqs.reduce((acc, rfq) => {
            const cat = rfq.part_name || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(rfq);
            return acc;
        }, {});

        const handleActionClick = (rfq) => {
            setSelectedRfq(rfq);
            setSubmission({
                shipment_address: rfq.shipment_address || '',
                city: rfq.city || '',
                state: rfq.state || '',
                country: rfq.country || '',
                pincode: rfq.pincode || '',
                lead_time: rfq.lead_time || '',
                price: rfq.price || '',
                negotiation_percentage: rfq.negotiation_percentage || 0,
                notes: rfq.notes || '',
                currency: rfq.currency || 'USD'
            });
            setView('submission-form');
        };

        return (
            <div className="portal-dashboard-wrapper">
                <header className="portal-dash-header">
                    <div className="header-left">
                        <div className="brand-small">
                            <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy" className="mini-logo" />
                            <h3>CALBY <span>PORTAL</span></h3>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="header-project-badge">
                            <span className="label">ACTIVE PROJECT</span>
                            <span className="value">{auth.project}</span>
                        </div>
                        <button className="btn btn-outline-danger" onClick={() => {
                            setAuth(null);
                            setRfqs([]);
                            setView('login');
                        }}>
                            <FaSignOutAlt /> Logout
                        </button>
                    </div>
                </header>

                <div className="portal-scroll-container">
                    <div className="dash-hero-minimal">
                        <div className="hero-content">
                            <p>Welcome back, {auth.vendor_name}</p>
                            <h4>Required <span>Materials</span></h4>
                        </div>
                    </div>

                    <div className="dash-content-aligned">
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Syncing requirements...</p>
                            </div>
                        ) : Object.entries(groupedRfqs).length > 0 ? (
                            Object.entries(groupedRfqs).map(([partName, items]) => (
                                <div key={partName} className="rfq-group-header-block">
                                    <h5 className="group-title-styled">{partName}</h5>
                                    <div className="group-variants-grid">
                                        {items.map((r) => {
                                            const pastDeadline = isPastDeadline(r.deadline);
                                            const displayUnit = getDisplayUnit(r.part_name, r.unit);
                                            return (
                                                <div key={r.id} className="rfq-portal-card card glow">
                                                    <div className="card-top">
                                                        <div>
                                                            <span className="mat-badge-lg">{r.part_name}</span>
                                                            <span className="grade-sub">{r.material} / {r.size}</span>
                                                        </div>
                                                        <span className={`rfq-status-pill ${r.status === 'submitted' ? 'success' : ''}`}>
                                                            {r.status === 'submitted' ? 'Quoted' : 'Awaiting'}
                                                        </span>
                                                    </div>

                                                    <div className="card-details-portal">
                                                        <div className="detail-item">
                                                            <label><FaLayerGroup /> Size / Spec</label>
                                                            <span>{r.size}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <label><FaDolly /> Quantity</label>
                                                            <span>{Number(r.total_quantity).toFixed(2)} {displayUnit}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <label><FaClock /> Deadline</label>
                                                            <span className={pastDeadline ? 'text-error' : ''}>
                                                                {r.deadline ? new Date(r.deadline).toLocaleDateString() : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="card-footer-portal">
                                                        <button
                                                            className={`btn ${r.status === 'submitted' ? 'btn-secondary' : 'btn-primary'} portal-btn-main`}
                                                            disabled={pastDeadline}
                                                            onClick={() => handleActionClick(r)}
                                                        >
                                                            {pastDeadline ? "Closed" : (r.status === 'submitted' ? "Edit & Resubmit" : "Submit Quotation")}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-portal card glass">
                                <FaExclamationCircle className="empty-icon" />
                                <h5>No active requirements found</h5>
                                <p>You'll see new Quote Requests here soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (view === 'submission-form') {
        const displayUnit = getDisplayUnit(selectedRfq.part_name, selectedRfq.unit);
        return (
            <div className="portal-form-wrapper">
                <header className="portal-dash-header">
                    <div className="header-left">
                        <button className="btn-back-portal" onClick={() => setView('dashboard')}>
                            <FaArrowLeft /> Back to Dashboard
                        </button>
                    </div>
                    <div className="header-right">
                        <h3>Quotation Hub</h3>
                        <div className="deadline-timer">
                            <FaClock /> Ends: {selectedRfq.deadline ? new Date(selectedRfq.deadline).toLocaleDateString() : 'TBD'}
                        </div>
                        <div className="header-project-badge">
                            <span className="label">QUOTING FOR</span>
                            <span className="value">{selectedRfq.part_name}</span>
                        </div>
                    </div>
                </header>

                <div className="portal-scroll-container">
                    <div className="portal-form-container">
                        <div className="form-wrapper card">

                            <form className="quotation-submit-form" onSubmit={handleSubmitQuote}>
                                <div className="form-layout-split">
                                    {/* Left Card: Specifications */}
                                    <div className="form-left">
                                        <div className="form-section-title">
                                            <FaProjectDiagram /> Item Specifications
                                        </div>
                                        
                                        <div className="form-group-custom">
                                            <label>Part / Category</label>
                                            <input type="text" value={selectedRfq.part_name} readOnly />
                                        </div>

                                        <div className="form-grid-inner">
                                            <div className="form-group-custom">
                                                <label>Material Grade</label>
                                                <input type="text" value={selectedRfq.material} readOnly />
                                            </div>
                                            <div className="form-group-custom">
                                                <label>Size / Spec</label>
                                                <input type="text" value={selectedRfq.size} readOnly />
                                            </div>
                                        </div>

                                        <div className="form-grid-inner">
                                            <div className="form-group-custom">
                                                <label>Required Quantity</label>
                                                <input type="text" value={`${Number(selectedRfq.total_quantity).toFixed(2)} ${displayUnit}`} readOnly />
                                            </div>
                                            <div className="form-group-custom">
                                                <label>Requirement Date</label>
                                                <input type="text" value={selectedRfq.required_date || 'ASAP'} readOnly />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Card: Your Quotation */}
                                    <div className="form-right">
                                        <div className="form-section-title">
                                            <FaEnvelope /> Your Bid Details
                                        </div>

                                        <div className="form-grid-inner">
                                            <div className="form-group-custom">
                                                <label>Currency</label>
                                                <select 
                                                    className="form-control-custom"
                                                    value={submission.currency}
                                                    onChange={(e) => setSubmission({ ...submission, currency: e.target.value })}
                                                >
                                                    <option value="USD">USD ($)</option>
                                                    <option value="INR">INR (₹)</option>
                                                    <option value="EUR">EURO (€)</option>
                                                </select>
                                            </div>
                                            <div className="form-group-custom">
                                                <label>Price</label>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    value={submission.price}
                                                    onChange={(e) => setSubmission({ ...submission, price: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-grid-inner">
                                            <div className="form-group-custom">
                                                <label>Lead Time (Days)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter days"
                                                    value={submission.lead_time}
                                                    onChange={(e) => setSubmission({ ...submission, lead_time: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group-custom">
                                                <label>Negotiation Range (%)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0"
                                                    value={submission.negotiation_percentage}
                                                    onChange={(e) => setSubmission({ ...submission, negotiation_percentage: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="address-section-nested">
                                            <div className="form-group-custom">
                                                <label>Dispatch Address</label>
                                                <input
                                                    type="text"
                                                    placeholder="Factory/Warehouse street address..."
                                                    value={submission.shipment_address}
                                                    onChange={(e) => setSubmission({ ...submission, shipment_address: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-grid-inner">
                                                <div className="form-group-custom">
                                                    <label>City</label>
                                                    <input
                                                        type="text"
                                                        placeholder="City"
                                                        value={submission.city}
                                                        onChange={(e) => setSubmission({ ...submission, city: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group-custom">
                                                    <label>State / Province</label>
                                                    <input
                                                        type="text"
                                                        placeholder="State"
                                                        value={submission.state}
                                                        onChange={(e) => setSubmission({ ...submission, state: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-grid-inner">
                                                <div className="form-group-custom">
                                                    <label>Country</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Country"
                                                        value={submission.country}
                                                        onChange={(e) => setSubmission({ ...submission, country: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group-custom">
                                                    <label>Pincode</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Pincode"
                                                        value={submission.pincode}
                                                        onChange={(e) => setSubmission({ ...submission, pincode: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-group-custom">
                                            <label>Notes & Compliance Remarks</label>
                                            <textarea
                                                placeholder="Add details about lead time, certifications, or terms..."
                                                rows={3}
                                                value={submission.notes}
                                                onChange={(e) => setSubmission({ ...submission, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="portal-form-footer-right">
                                    <div className="legal-notice">
                                        <FaCheckSquare />
                                        <span>By submitting, you confirm that pricing is valid for 30 days.</span>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-lg px-5 shadow-lg" disabled={submitting}>
                                        {submitting ? (
                                            <div className="spinner-border spinner-border-sm"></div>
                                        ) : selectedRfq.status === 'submitted' ? (
                                            'Update & Resubmit Quotation'
                                        ) : (
                                            'Confirm & Submit Quotation'
                                        )}
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