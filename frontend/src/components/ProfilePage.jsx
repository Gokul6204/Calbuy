import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureCsrfCookie, csrfHeaders } from '../api/http';
import { FaUser, FaBuilding, FaMapMarkerAlt, FaEnvelope, FaPhone, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './ProfilePage.css';

export function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        organization_name: '',
        mail_id: '',
        address: '',
        city: '',
        state: '',
        country: '',
        email: '',
        phone_number: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setFormData({
                organization_name: user.organization_name || '',
                mail_id: user.mail_id || '',
                address: user.address || '',
                city: user.city || '',
                state: user.state || '',
                country: user.country || '',
                email: user.email || '',
                phone_number: user.phone_number || ''
            });
        }
    }, [user]);


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await ensureCsrfCookie();
            const response = await fetch('/api/accounts/profile/', {
                method: 'PUT',
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json',
                    ...csrfHeaders(),
                },
                body: JSON.stringify(formData),
            });
            
            if (response.ok) {
                const updatedData = await response.json();
                updateProfile(updatedData);
                setIsEditing(false);
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to update profile.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="profile-loading">Loading profile...</div>;

    return (
        <div className="profile-page">
            <div className="profile-container">
                <div className="profile-header">
                    <div className="profile-avatar-container">
                        <FaUser className="profile-icon" />
                    </div>
                    <h1>Your Profile</h1>
                </div>

                {message.text && (
                    <div className={`profile-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="profile-card">
                    <div className="card-header">
                        <h2>Organization Details</h2>
                        {!isEditing && (
                            <button className="edit-btn" onClick={() => setIsEditing(true)}>
                                <FaEdit /> Edit Profile
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="profile-grid">
                            <div className="form-item">
                                <label><FaBuilding /> Organization Name</label>
                                {isEditing ? (
                                    <input
                                        name="organization_name"
                                        value={formData.organization_name}
                                        onChange={handleChange}
                                        required
                                    />
                                ) : (
                                    <p>{user.organization_name}</p>
                                )}
                            </div>

                            <div className="form-item">
                                <label><FaEnvelope /> Official Mail ID</label>
                                {isEditing ? (
                                    <input
                                        name="mail_id"
                                        type="email"
                                        value={formData.mail_id}
                                        onChange={handleChange}
                                        required
                                    />
                                ) : (
                                    <p>{user.mail_id || 'Not specified'}</p>
                                )}
                            </div>

                            <div className="form-item full-width">
                                <label><FaMapMarkerAlt /> Address</label>
                                {isEditing ? (
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows={2}
                                        required
                                    />
                                ) : (
                                    <p>{user.address}</p>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-item">
                                    <label>City</label>
                                    {isEditing ? (
                                        <input
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                        />
                                    ) : (
                                        <p>{user.city}</p>
                                    )}
                                </div>
                                <div className="form-item">
                                    <label>State</label>
                                    {isEditing ? (
                                        <input
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            required
                                        />
                                    ) : (
                                        <p>{user.state}</p>
                                    )}
                                </div>
                                <div className="form-item">
                                    <label>Country</label>
                                    {isEditing ? (
                                        <input
                                            name="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                            required
                                        />
                                    ) : (
                                        <p>{user.country}</p>
                                    )}
                                </div>
                            </div>

                            <div className="form-item">
                                <label><FaEnvelope /> Login Email</label>
                                {isEditing ? (
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                ) : (
                                    <p>{user.email}</p>
                                )}
                            </div>

                            <div className="form-item">
                                <label><FaPhone /> Phone Number</label>
                                {isEditing ? (
                                    <input
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        required
                                    />
                                ) : (
                                    <p>{user.phone_number}</p>
                                )}
                            </div>
                        </div>


                        {isEditing && (
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                                    <FaTimes /> Cancel
                                </button>
                                <button type="submit" className="save-btn" disabled={loading}>
                                    <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
