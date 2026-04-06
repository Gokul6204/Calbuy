import { FaTools, FaHardHat } from 'react-icons/fa'
import './VendorSelectionPage.css' // Re-using existing styles

export function UnderConstruction({ title, description }) {
    return (
        <div className="construction-container-wrapper">
            <div className="construction-container">
                <div className="construction-icon">
                    <FaHardHat className="helmet-icon" />
                    <FaTools className="tools-icon" />
                </div>
                <h2>{title || "Feature Dashboard"}</h2>
                <div className="under-construction-badge">UNDER CONSTRUCTION</div>
                <p>{description || "We are currently building this feature to provide you with the best experience possible."}</p>
                
                <div className="construction-preview">
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                </div>
                
                <div className="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    )
}
