import { FaHome, FaIndustry, FaBoxOpen } from 'react-icons/fa'
import './Footer.css'

export function Footer({ currentView, onViewChange }) {
    return (
        <footer className="app-footer">
            <nav className="footer-nav">
                <button
                    className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
                    onClick={() => onViewChange('home')}
                >
                    {/* <span className="nav-icon"><FaHome /></span> */}
                    <span className="nav-label">Home</span>
                </button>
                <button
                    className={`nav-item ${currentView === 'vendor' ? 'active' : ''}`}
                    onClick={() => onViewChange('vendor')}
                >
                    {/* <span className="nav-icon"><FaIndustry /></span> */}
                    <span className="nav-label">Vendor</span>
                </button>
                <button
                    className={`nav-item ${currentView === 'material' ? 'active' : ''}`}
                    onClick={() => onViewChange('material')}
                >
                    {/* <span className="nav-icon"><FaBoxOpen /></span> */}
                    <span className="nav-label">Material</span>
                </button>
            </nav>
        </footer>
    )
}
