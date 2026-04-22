import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureCsrfCookie } from '../api/http';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './LoginPage.css';

export function LoginPage({ onLoginSuccess, onGoToRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            await ensureCsrfCookie();
            const response = await fetch('/api/accounts/login/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });
            const data = await response.json();
            if (response.ok) {
                login(data);
                onLoginSuccess();
            } else {
                setError(data.error || 'Login failed');
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
                        <h2 className="cb-auth-title">Log in</h2>
                        <p className="cb-auth-subtitle">Welcome back. Please enter your details.</p>
                    </header>

                    {error && <div className="cb-error-banner" style={{ color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="cb-form-group">
                            <label className="cb-form-label">Email</label>
                            <input
                                type="email"
                                className="cb-input-field"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="cb-form-group">
                            <label className="cb-form-label">Password</label>
                            <div className="cb-password-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="cb-input-field"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                        <div className="cb-form-options">
                            <span className="cb-forgot-link">Forgot password?</span>
                        </div>

                        <button type="submit" className="cb-btn-primary" disabled={loading}>
                            {loading ? 'Logging in...' : 'Log in'}
                        </button>
                    </form>

                    <div className="cb-auth-footer">
                        Don't have an account? <button onClick={onGoToRegister} className="cb-link">Sign up</button>
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
                        <div className="cb-node-name">AI Vendor Matching</div>
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
