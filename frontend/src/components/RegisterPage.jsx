import { useState } from 'react';
import './LoginPage.css'; // Reusing common auth styles

export function RegisterPage({ onRegisterSuccess, onGoToLogin }) {
    const [formData, setFormData] = useState({
        organization_name: '',
        organization_location: '',
        email: '',
        phone_number: '',
        password: ''
    });
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
            const response = await fetch('/api/accounts/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
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
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join Calbuy to streamline your procurement</p>
                </div>
                
                {error && <div className="auth-error">{error}</div>}
                
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="organization_name">Organization Name</label>
                        <input
                            id="organization_name"
                            name="organization_name"
                            type="text"
                            placeholder="Acme Corp"
                            value={formData.organization_name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="organization_location">Organization Location</label>
                        <input
                            id="organization_location"
                            name="organization_location"
                            type="text"
                            placeholder="New York, USA"
                            value={formData.organization_location}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="admin@acme.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="phone_number">Phone Number</label>
                        <input
                            id="phone_number"
                            name="phone_number"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={formData.phone_number}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>
                
                <div className="auth-footer">
                    <p>Already have an account? <button onClick={onGoToLogin} className="auth-link">Login here</button></p>
                </div>
            </div>
        </div>
    );
}
