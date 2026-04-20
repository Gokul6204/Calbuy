import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureCsrfCookie } from '../api/http';
import './LoginPage.css';

export function RegisterPage({ onRegisterSuccess, onGoToLogin }) {
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        organization_name: '',
        email: '',
        phone_number: '',
        address: '',
        country: '',
        city: '',
        state: '',
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

        const payload = {
            ...formData,
            email: formData.email.trim().toLowerCase(),
        };

        try {
            await ensureCsrfCookie();
            const response = await fetch('/api/accounts/register/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user) {
                    login(data.user);
                }
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
            <div className="auth-card auth-card--wide">
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join Calbuy to streamline your procurement</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">

                    {/* Row 1: Organization Name — full width */}
                    <div className="form-Grade">
                        <label htmlFor="organization_name">Organization Name</label>
                        <input
                            id="organization_name"
                            name="organization_name"
                            type="text"
                            placeholder="Caldim Engineering Pvt Ltd"
                            value={formData.organization_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Row 2: Login Email + Phone */}
                    <div className="form-row">
                        <div className="form-Grade half-width">
                            <label htmlFor="email">Organization Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Caldim@engg.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-Grade half-width">
                            <label htmlFor="phone_number">Phone Number</label>
                            <input
                                id="phone_number"
                                name="phone_number"
                                type="tel"
                                placeholder="+91 00000-00000"
                                value={formData.phone_number}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Row 3: Address + Country */}
                    <div className="form-row">
                        <div className="form-Grade half-width">
                            <label htmlFor="address">Address</label>
                            <input
                                id="address"
                                name="address"
                                type="text"
                                placeholder="Appartment No., Street Name, Area Name"
                                value={formData.address}
                                onChange={handleChange}
                                required
                            />
                        </div>

                    </div>

                    {/* Row 4: City + State */}
                    <div className="form-row">
                        <div className="form-Grade half-width">
                            <label htmlFor="city">City</label>
                            <input
                                id="city"
                                name="city"
                                type="text"
                                placeholder="City/Town"
                                value={formData.city}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-Grade half-width">
                            <label htmlFor="state">State</label>
                            <input
                                id="state"
                                name="state"
                                type="text"
                                placeholder="State"
                                value={formData.state}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-Grade half-width">
                            <label htmlFor="country">Country</label>
                            <input
                                id="country"
                                name="country"
                                type="text"
                                placeholder="Country"
                                value={formData.country}
                                onChange={handleChange}
                                required
                            />
                        </div>

                    </div>

                    {/* Row 5: Password — full width */}
                    <div className="form-Grade">
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
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <button onClick={onGoToLogin} className="auth-link">Login here</button></p>
                </div>
            </div>
        </div>
    );
}
