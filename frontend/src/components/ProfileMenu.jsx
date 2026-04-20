import { useState, useRef, useEffect } from 'react';
import { FaUserCircle, FaMoon, FaSun, FaDesktop, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './ProfileMenu.css';

export function ProfileMenu({ onProfileClick, onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
        if (onLogout) onLogout();
    };

    const handleProfileClick = () => {
        setIsOpen(false);
        if (onProfileClick) onProfileClick();
    };

    return (
        <div className="profile-menu-container" ref={menuRef}>
            <button className="profile-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Profile menu">
                <FaUserCircle />
            </button>

            {isOpen && (
                <div className="profile-dropdown">
                    <div className="dropdown-header">
                        <span className="user-name">{user?.organization_name || 'User'}</span>
                        <span className="user-role">{user?.email}</span>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button className="dropdown-item" onClick={handleProfileClick}>
                        <FaUser /> View Profile
                    </button>

                    <div className="dropdown-divider"></div>

                    <div className="theme-options">
                        <div className="theme-options-title">Theme Preference</div>
                        <div className="theme-btn-Grade">
                            <button
                                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => setTheme('light')}
                                title="Light Mode"
                            >
                                <FaSun />
                            </button>
                            <button
                                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => setTheme('dark')}
                                title="Dark Mode"
                            >
                                <FaMoon />
                            </button>
                            <button
                                className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                                onClick={() => setTheme('system')}
                                title="System Default"
                            >
                                <FaDesktop />
                            </button>
                        </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button className="dropdown-item logout-item" onClick={handleLogout}>
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            )}
        </div>
    );
}
