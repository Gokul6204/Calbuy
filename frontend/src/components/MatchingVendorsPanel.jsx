import { useState, useRef, useEffect } from 'react'
import { FaSearch, FaTimes, FaMapMarkerAlt, FaPaperPlane, FaChevronDown, FaBoxOpen } from 'react-icons/fa'
import './MatchingVendorsPanel.css'

export function MatchingVendorsPanel({ vendors, onClose, isPageView = false, onSendMail }) {
    const [locationFilter, setLocationFilter] = useState('')
    const [selectedMaterials, setSelectedMaterials] = useState([])
    const [matDropdownOpen, setMatDropdownOpen] = useState(false)
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedVendorIds, setSelectedVendorIds] = useState(new Set())
    const dropdownRef = useRef(null)

    if (!vendors && !isPageView) return null

    const uniqueMaterials = Array.from(new Set(vendors?.flatMap(v => v.matched_materials || []) || []))

    const filteredVendors = vendors?.filter(v => {
        const matchesLoc = (v.location || '').toLowerCase().includes(locationFilter.toLowerCase())
        const matchesMat = selectedMaterials.length === 0 || selectedMaterials.some(m => (v.matched_materials || []).includes(m))
        return matchesLoc && matchesMat
    }) || []

    const toggleMaterial = (m) => {
        setSelectedMaterials(prev =>
            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
        )
    }

    const toggleVendorSelection = (id) => {
        setSelectedVendorIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSendMail = () => {
        if (!onSendMail) return
        let toSend = filteredVendors
        if (isSelectionMode && selectedVendorIds.size > 0) {
            toSend = filteredVendors.filter(v => selectedVendorIds.has(v.id))
        }
        onSendMail(toSend)
    }

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setMatDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const content = (
        <aside className={`matching-panel ${isPageView ? 'page-view' : ''} ${isSelectionMode ? 'selection-active' : ''}`} onClick={(e) => e.stopPropagation()}>
            <header className="panel-header">
                <div className="header-left">
                    <div className="header-icon"><FaSearch /></div>
                    <div className="header-text">
                        <div className="header-title-row">
                            <h3>Matching Vendors</h3>
                            {vendors?.length > 0 && (
                                <span className="v-count-badge">
                                    {filteredVendors.length} {filteredVendors.length === 1 ? 'match' : 'matches'}
                                </span>
                            )}
                        </div>
                        <p>Suppliers found for current BOM materials</p>
                    </div>
                </div>

                <div className="header-right">
                    {vendors && vendors.length > 0 && (
                        <div className="header-filter">
                            <div className="filter-input-wrapper">
                                <FaMapMarkerAlt className="filter-icon" />
                                <input
                                    type="text"
                                    placeholder="Filter by location..."
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                    className="filter-input"
                                />
                                {locationFilter && (
                                    <button className="clear-filter" onClick={() => setLocationFilter('')}>
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {!isPageView && (
                        <button className="close-btn-inline" onClick={onClose} aria-label="Close panel">
                            <FaTimes />
                        </button>
                    )}

                    {/* Custom Material Multi-Select Dropdown */}
                    {uniqueMaterials.length > 0 && (
                        <div className="mat-dropdown-wrap" ref={dropdownRef}>
                            <button
                                className={`mat-dropdown-trigger ${selectedMaterials.length > 0 ? 'has-selection' : ''}`}
                                onClick={() => setMatDropdownOpen(o => !o)}
                                type="button"
                            >
                                <FaBoxOpen className="mat-trigger-icon" />
                                <span className="mat-trigger-label">
                                    {selectedMaterials.length === 0
                                        ? 'Select Material'
                                        : `${selectedMaterials.length} material${selectedMaterials.length > 1 ? 's' : ''} selected`}
                                </span>
                                <FaChevronDown className={`mat-chevron ${matDropdownOpen ? 'open' : ''}`} />
                            </button>

                            {matDropdownOpen && (
                                <div className="mat-dropdown-menu">
                                    <div className="mat-dropdown-list">
                                        {uniqueMaterials.map(m => (
                                            <label key={m} className={`mat-option ${selectedMaterials.includes(m) ? 'checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMaterials.includes(m)}
                                                    onChange={() => toggleMaterial(m)}
                                                />
                                                <span className="mat-option-text">{m}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedMaterials.length > 0 && (
                                        <div className="mat-dropdown-footer">
                                            <button
                                                className="mat-clear-btn"
                                                onClick={() => setSelectedMaterials([])}
                                                type="button"
                                            >
                                                <FaTimes /> Clear selection ({selectedMaterials.length})
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="header-actions">
                        <button
                            className={`btn ${isSelectionMode ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                        >
                            {isSelectionMode ? 'Done Selecting' : 'Select vendors'}
                        </button>

                        <button
                            className="btn btn-primary"
                            onClick={handleSendMail}
                            disabled={!filteredVendors.length || (isSelectionMode && selectedVendorIds.size === 0)}
                        >
                            <FaPaperPlane />
                            <span>
                                {isSelectionMode && selectedVendorIds.size > 0
                                    ? `Send Mail (${selectedVendorIds.size})`
                                    : 'Send Mail'}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="panel-content">
                {!vendors || vendors.length === 0 ? (
                    <div className="empty-results">
                        <div className="empty-icon">🏭</div>
                        <p>No vendors found matching the materials in this BOM.</p>
                        <p className="hint">Try mapping materials to vendors in the "Material" tab.</p>
                        {isPageView && (
                            <button className="btn btn-primary mt-4" onClick={() => onClose()}>
                                Go to BOM
                            </button>
                        )}
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="empty-results">
                        <div className="empty-icon">🔍</div>
                        <p>No vendors match the selected filters.</p>
                        <button className="btn btn-secondary mt-3" onClick={() => { setLocationFilter(''); setSelectedMaterials([]) }}>
                            Clear All Filters
                        </button>
                    </div>
                ) : (
                    <div className="vendor-scroll-grid">
                        {filteredVendors.map(v => (
                            <div
                                key={v.id}
                                className={`vendor-match-card ${selectedVendorIds.has(v.id) ? 'selected' : ''}`}
                                onClick={() => isSelectionMode && toggleVendorSelection(v.id)}
                                style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
                            >
                                {isSelectionMode && (
                                    <div className="v-checkbox-wrapper">
                                        <input
                                            type="checkbox"
                                            checked={selectedVendorIds.has(v.id)}
                                            onChange={() => toggleVendorSelection(v.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                                <div className="v-main">
                                    <span className="v-name">{v.vendor_name}</span>
                                    <span className="v-id">{v.vendor_id}</span>
                                </div>
                                <div className="v-details">
                                    <span>{v.location || 'Unknown Location'}</span>
                                </div>
                                {v.matched_materials && v.matched_materials.length > 0 && (
                                    <div className="v-matched-mats">
                                        {v.matched_materials.map((m, idx) => (
                                            <span key={idx} className="m-chip">{m}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    )

    if (isPageView) {
        return content
    }

    return (
        <div className="matching-panel-overlay" onClick={onClose}>
            {content}
        </div>
    )
}
