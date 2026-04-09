import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaBuilding, FaMapMarkerAlt, FaEnvelope, FaPhone, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './ProfilePage.css';

export function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        organization_name: '',
        organization_location: '',
        email: '',
        phone_number: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setFormData({
                organization_name: user.organization_name || '',
                organization_location: user.organization_location || '',
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
            // In a real app, you'd call your backend API here
            // const response = await fetch('/api/accounts/profile/', { method: 'PUT', ... })
            
            // For now, simulate API call and update context
            await new Promise(resolve => setTimeout(resolve, 500));
            updateProfile(formData);
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
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
                                <label><FaMapMarkerAlt /> Location</label>
                                {isEditing ? (
                                    <input
                                        name="organization_location"
                                        value={formData.organization_location}
                                        onChange={handleChange}
                                        required
                                    />
                                ) : (
                                    <p>{user.organization_location}</p>
                                )}
                            </div>

                            <div className="form-item">
                                <label><FaEnvelope /> Email Address</label>
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
