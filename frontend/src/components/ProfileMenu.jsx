import { useState, useRef, useEffect } from 'react';
import { FaUserCircle, FaMoon, FaSun, FaDesktop } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import './ProfileMenu.css';

export function ProfileMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="profile-menu-container" ref={menuRef}>
            <button className="profile-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Profile menu">
                <FaUserCircle />
            </button>

            {isOpen && (
                <div className="profile-dropdown">
                    <div className="dropdown-header">
                        <span className="user-name">Admin User</span>
                        <span className="user-role">Procurement Manager</span>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="theme-options">
                        <div className="theme-options-title">Theme Preference</div>
                        <button 
                            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                            onClick={() => setTheme('light')}
                        >
                            <FaSun /> Light
                        </button>
                        <button 
                            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                            onClick={() => setTheme('dark')}
                        >
                            <FaMoon /> Dark
                        </button>
                        <button 
                            className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                            onClick={() => setTheme('system')}
                        >
                            <FaDesktop /> System
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
