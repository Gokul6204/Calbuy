import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureCsrfCookie } from '../api/http';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './LoginPage.css';

export function RegisterPage({ onRegisterSuccess, onGoToLogin }) {
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        organization_name: '',
        email: '',
        phone_number: '',
        address: '',
        country: '',
        pincode: '',
        city: '',
        state: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await ensureCsrfCookie();
            const response = await fetch('/api/accounts/register/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, email: formData.email.trim().toLowerCase() }),
            });
            const data = await response.json();
            if (response.ok) {
                if (data.user) login(data.user);
                onRegisterSuccess();
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cb-auth-root">
            {/* ── RIGHT Side Form ── */}
            <section className="cb-auth-form-side">
                <div className="cb-auth-logo">
                    <div className="cb-brand-circle">
                         <img src="/assest/images/calbuy-logo.jpeg" alt="Calbuy" className="cb-brand-img" />
                    </div>
                    <div className="cb-brand-text">
                        <span className="cb-brand-name">CalBuy</span>
                        <span className="cb-brand-tag">PROCUREMENT HUB</span>
                    </div>
                </div>

                <div className="cb-auth-form-container">
                    <header className="cb-auth-header">
                        <h2 className="cb-auth-title">Create an account</h2>
                        <p className="cb-auth-subtitle">Join Calbuy and optimize your procurement workflow.</p>
                    </header>

                    {error && <div className="cb-error-banner" style={{ color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="cb-form-group">
                            <label className="cb-form-label">Organization Name</label>
                            <input
                                name="organization_name"
                                type="text"
                                className="cb-input-field"
                                placeholder="Caldim Engineering Pvt Ltd"
                                value={formData.organization_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div className="cb-form-group" style={{ marginBottom: 0 }}>
                                <label className="cb-form-label">Work Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    className="cb-input-field"
                                    placeholder="contact@company.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="cb-form-group" style={{ marginBottom: 0 }}>
                                <label className="cb-form-label">Phone</label>
                                <input
                                    name="phone_number"
                                    type="tel"
                                    className="cb-input-field"
                                    placeholder="+91..."
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div className="cb-form-group" style={{ marginBottom: 0 }}>
                                <label className="cb-form-label">City</label>
                                <input name="city" type="text" className="cb-input-field" value={formData.city} onChange={handleChange} required />
                            </div>
                            <div className="cb-form-group" style={{ marginBottom: 0 }}>
                                <label className="cb-form-label">State</label>
                                <input name="state" type="text" className="cb-input-field" value={formData.state} onChange={handleChange} required />
                            </div>
                            <div className="cb-form-group" style={{ marginBottom: 0 }}>
                                <label className="cb-form-label">Country</label>
                                <input name="country" type="text" className="cb-input-field" value={formData.country} onChange={handleChange} required />
                            </div>
                            <div className="cb-form-group" style={{ marginBottom: 0 }}>
                                <label className="cb-form-label">Pincode</label>
                                <input name="pincode" type="text" className="cb-input-field" value={formData.pincode} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="cb-form-group">
                            <label className="cb-form-label">Password</label>
                            <div className="cb-password-wrapper">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    className="cb-input-field"
                                    value={formData.password}
                                    onChange={handleChange}
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

                        <button type="submit" className="cb-btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                            {loading ? 'Creating Account...' : 'Get started'}
                        </button>
                    </form>

                    <div className="cb-auth-footer">
                        Already have an account? <button onClick={onGoToLogin} className="cb-link">Log in</button>
                    </div>
                </div>
            </section>

            {/* ── LEFT Side Flow ── */}
            <aside className="cb-auth-flow-side">
                <div className="cb-flow-grid" />
                <div className="cb-pipeline-main-line">
                    <div className="cb-traveling-glow" />
                </div>

                <div className="cb-flow-nodes-container">
                    <div className="cb-pipeline-node node-1">
                        <div className="cb-pipeline-connector" />
                        <span className="cb-node-step">Step 01</span>
                        <div className="cb-node-name">BOM Extraction</div>
                    </div>

                    <div className="cb-pipeline-node node-2">
                        <div className="cb-pipeline-connector" />
                        <span className="cb-node-step">Step 02</span>
                        <div className="cb-node-name">Vendor Selection</div>
                    </div>

                    <div className="cb-pipeline-node node-3">
                        <div className="cb-pipeline-connector" />
                        <span className="cb-node-step">Step 03</span>
                        <div className="cb-node-name">RFQ Orchestration</div>
                    </div>

                    <div className="cb-pipeline-node node-4">
                        <div className="cb-pipeline-connector" />
                        <span className="cb-node-step">Step 04</span>
                        <div className="cb-node-name">Vendor Confirmation</div>
                    </div>

                    <div className="cb-pipeline-node cb-objective-node">
                        <div className="cb-objective-icon">⌛</div>
                        <span className="cb-node-step">Achievement</span>
                        <div className="cb-node-name">Procurement Complete</div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
