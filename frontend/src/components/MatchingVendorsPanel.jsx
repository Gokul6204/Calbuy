import { useState, useRef, useEffect } from 'react'
import { FaSearch, FaTimes, FaMapMarkerAlt, FaPaperPlane, FaChevronDown, FaBoxOpen, FaCheckCircle } from 'react-icons/fa'
import { ImSearch } from "react-icons/im";
import { useAlert } from '../context/NotificationContext'
import './MatchingVendorsPanel.css'

export function MatchingVendorsPanel({ vendors, bomList = [], quotations = [], onClose, isPageView = false, onSendMail }) {
    const { showAlert } = useAlert()
    const [locationFilter, setLocationFilter] = useState('')
    const [selectedMaterials, setSelectedMaterials] = useState([])
    const [matDropdownOpen, setMatDropdownOpen] = useState(false)
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedVendorIds, setSelectedVendorIds] = useState(new Set())
    const dropdownRef = useRef(null)

    if (!vendors && !isPageView) return null

    // Helper to check if a specific part has already been requested from a specific vendor
    const isAlreadyRequested = (vId, partName) => {
        return quotations.some(q => 
            q.vendor_id === vId && 
            (q.part_name || '').toLowerCase().trim() === (partName || '').toLowerCase().trim()
        )
    }

    // Determine unique materials based on what vendors hold
    const uniqueMaterials = Array.from(new Set(vendors?.flatMap(v => v.all_parts || []) || []))
    
    // Also include material names from BOM to ensure user can select them
    const uniqueBomParts = Array.from(new Set(bomList.map(item => (item.formatted_part || item.part_name || item.part || 'Other').trim())))
    const dropdownMaterials = Array.from(new Set([...uniqueMaterials, ...uniqueBomParts])).sort()

    const filteredVendors = vendors?.filter(v => {
        const fullLocation = `${v.city} ${v.state} ${v.country} ${v.location || ''}`.toLowerCase()
        const matchesLoc = fullLocation.includes(locationFilter.toLowerCase())
        
        // Material Filter logic - check if vendor holds any of the selected materials
        if (selectedMaterials.length > 0) {
            const vendorParts = (v.all_parts || []).map(p => p.toLowerCase().trim())
            const matchesMat = selectedMaterials.some(m => vendorParts.includes(m.toLowerCase().trim()))
            if (!matchesMat) return false
        }
        
        return matchesLoc
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
        
        const baseVendors = isSelectionMode && selectedVendorIds.size > 0 
            ? filteredVendors.filter(v => selectedVendorIds.has(v.id))
            : filteredVendors

        // Map vendors to their matching BOM part names, EXCLUDING already requested ones
        const toSend = baseVendors.map(v => {
            const vendorInv = (v.all_parts || []).map(p => p.toLowerCase().trim())
            
            // Intersection: Find BOM items where the part name matches vendor inventory
            let heldBomParts = uniqueBomParts.filter(bp => {
                const bpLower = bp.toLowerCase()
                return vendorInv.some(vPart => {
                    if (!vPart) return false
                    const escaped = vPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
                    return regex.test(bpLower) || vPart.toLowerCase() === bpLower
                })
            })

            // Filter out parts already sent to this vendor
            heldBomParts = heldBomParts.filter(p => !isAlreadyRequested(v.vendor_id, p))

            // If user has a specific filter active ("Select Material"), further restrict to those
            if (selectedMaterials.length > 0) {
                const selectedLower = selectedMaterials.map(m => m.toLowerCase().trim())
                heldBomParts = heldBomParts.filter(p => {
                    const pLower = p.toLowerCase().trim()
                    return selectedLower.some(sm => pLower.includes(sm) || sm.includes(pLower))
                })
            }

            return {
                ...v,
                intended_parts: heldBomParts
            }
        }).filter(v => v.intended_parts && v.intended_parts.length > 0)

        if (toSend.length === 0) {
            const hasExisting = baseVendors.some(v => uniqueBomParts.some(p => isAlreadyRequested(v.vendor_id, p)))
            if (hasExisting) {
                showAlert("RFQs have already been sent to these vendors for all matching parts. No new items found to request.", "info")
            } else {
                showAlert("None of the selected vendors match the specific parts required for this project/selection.", "info")
            }
            return
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
                    {dropdownMaterials.length > 0 && (
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
                                        {dropdownMaterials.map(m => (
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
                        <FaBoxOpen size={64} style={{ color: 'var(--accent)', opacity: 0.5, marginBottom: '1.5rem' }} />
                        <h3>No Matching Vendors</h3>
                        <p>We couldn't find any suppliers that provide the materials in your BOM list.</p>
                        <p className="hint">Try mapping materials to vendors manually in the <strong>Materials</strong> tab to improve matching.</p>
                        {isPageView && (
                            <div className="empty-actions" style={{ marginTop: '2rem' }}>
                                <button className="btn btn-primary" onClick={() => onClose()}>
                                    Back to BOM Table
                                </button>
                            </div>
                        )}
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="empty-results">
                        <div className="empty-icon"><ImSearch /></div>
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
                                    <div className="v-title-row">
                                        <div className="v-name-group">
                                            <span className="v-name">{v.vendor_name}</span>
                                            <span className="v-id">{v.vendor_id}</span>
                                        </div>
                                        {v.matched_materials && v.matched_materials.length > 0 && (
                                            <div className="v-category-badge">
                                                {v.matched_materials.map((m, idx) => (
                                                    <span key={idx} className="cat-chip">{m}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="v-details">
                                    <span>{(v.city || v.location) + ", " + v.state + ", " + v.country || 'Unknown Location'}</span>
                                </div>
                                <div className="v-parts-list">
                                    {v.all_parts && v.all_parts.length > 0 ? (
                                        v.all_parts.map((p, idx) => {
                                            const requested = isAlreadyRequested(v.vendor_id, p)
                                            return (
                                                <span 
                                                    key={idx} 
                                                    className={`part-chip ${requested ? 'sent' : ''}`}
                                                    title={requested ? 'RFQ already sent' : 'Not yet requested'}
                                                >
                                                    {p}
                                                    {requested && <FaCheckCircle style={{ marginLeft: '4px', fontSize: '0.7em' }} />}
                                                </span>
                                            )
                                        })
                                    ) : (
                                        <span className="no-parts-hint">No parts listed</span>
                                    )}
                                </div>
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
