import { useState, useEffect, useCallback } from 'react'
import { FaRobot, FaCheckCircle, FaStar, FaMapMarkerAlt, FaTruck, FaRegClock, FaCogs } from 'react-icons/fa'
import { rankVendors, confirmVendor } from '../api/ai'
import { FaRankingStar } from "react-icons/fa6";
import { useNotification } from '../context/NotificationContext'
import './VendorSelectionPage.css'

export function VendorSelectionPage({ project, bomList: propBomList, setView }) {
    const [bomList, setLocalBomList] = useState(propBomList || [])
    const [selectedMaterial, setSelectedMaterial] = useState(null)
    const [rankedVendors, setRankedVendors] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [appliedWeights, setAppliedWeights] = useState({ price: 40, leadTime: 30, distance: 30 })
    const [pendingWeights, setPendingWeights] = useState({ price: 40, leadTime: 30, distance: 30 })
    const { showAlert } = useNotification()

    useEffect(() => {
        if (!propBomList || propBomList.length === 0) {
            refreshMaterials()
        } else {
            setLocalBomList(propBomList)
        }
    }, [propBomList, project])

    useEffect(() => {
        if (bomList && bomList.length > 0 && !selectedMaterial) {
            setSelectedMaterial(bomList[0])
        }
    }, [bomList])

    useEffect(() => {
        if (selectedMaterial) {
            handleRankVendors(appliedWeights)
        }
    }, [selectedMaterial, appliedWeights])

    const refreshMaterials = useCallback(async () => {
        if (!project?.id) return
        try {
            setLoading(true)
            // 1. Fetch all quotations for the project to see which parts have bids
            const qRes = await fetch(`/api/projects/${project.id}/quotations/`)
            const quotations = await qRes.json()

            const normalize = (val) => {
                if (!val) return "";
                return String(val).split(/\s+/).join("").toLowerCase();
            }

            // 2. Identify parts with at least 1 'Submitted' quotation
            const submittedByPartKey = new Set()
            quotations.forEach(q => {
                if (q.status === 'Submitted') {
                    const key = `${normalize(q.part_name)}|${normalize(q.size)}|${normalize(q.material)}`
                    submittedByPartKey.add(key)
                }
            })

            // 3. Fetch BOM items
            let rawBom = propBomList || []
            if (rawBom.length === 0) {
                const bRes = await fetch(`/api/bom/?project_id=${project.id}`)
                rawBom = await bRes.json()
            }

            // 4. Filter BOM items with robust normalization
            const filteredBom = rawBom.filter(item => {
                const itemKey = `${normalize(item.formatted_part || item.part)}|${normalize(item.size)}|${normalize(item.material)}`
                return submittedByPartKey.has(itemKey)
            })

            setLocalBomList(filteredBom)

            if (filteredBom.length > 0 && !selectedMaterial) {
                setSelectedMaterial(filteredBom[0])
            }
        } catch (err) {
            console.error("Failed to refresh materials:", err)
        } finally {
            setLoading(false)
        }
    }, [project, propBomList, selectedMaterial])

    useEffect(() => {
        refreshMaterials()
    }, [refreshMaterials])

    const handleRankVendors = async (currentWeights) => {
        if (!project?.id || !selectedMaterial?.id) return
        try {
            setLoading(true)
            setError(null)

            // Map keys for API compatibility
            const apiWeights = {
                price_weight: currentWeights.price,
                lead_time_weight: currentWeights.leadTime,
                distance_weight: currentWeights.distance
            }

            const data = await rankVendors(project.id, selectedMaterial.id, apiWeights)
            setRankedVendors(data)
        } catch (err) {
            console.error("Ranking failed:", err)
            setError(err.message || "Failed to analyze vendors.")
        } finally {
            setLoading(false)
        }
    }

    const getNormalizedWeights = (weights) => {
        const total = weights.price + weights.leadTime + weights.distance;
        if (total === 0) return { price: 33.3, leadTime: 33.3, distance: 33.4 };
        return {
            price: (weights.price / total) * 100,
            leadTime: (weights.leadTime / total) * 100,
            distance: (weights.distance / total) * 100
        };
    };

    const normPending = getNormalizedWeights(pendingWeights);

    const updateWeight = (key, value) => {
        setPendingWeights(prev => ({ ...prev, [key]: parseInt(value) }))
    }

    const handleApplyWeights = () => {
        setAppliedWeights({ ...pendingWeights })
    }

    const handleResetWeights = () => {
        const balanced = { price: 40, leadTime: 30, distance: 30 }
        setPendingWeights(balanced)
        setAppliedWeights(balanced)
    }

    const handleConfirmVendor = async (quotationId) => {
        if (!project?.id || !selectedMaterial?.id || !quotationId) return
        try {
            setLoading(true)
            await confirmVendor(project.id, selectedMaterial.id, quotationId)
            showAlert("Vendor Confirmed Successfully!", "success")
            if (setView) setView('purchase-order')
            else window.location.reload()
        } catch (err) {
            console.error("Confirmation failed:", err)
            showAlert("Failed to confirm vendor: " + err.message, "error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="selection-page view-container">
            <header className="page-header selection-header">
                <div className="header-left">
                    <div className="header-icon ai-glow"><FaRobot /></div>
                    <div className="header-text">
                        <h2>AI Vendor Selection</h2>
                        <p>Optimizing procurement Decisions for {project?.name}</p>
                    </div>
                </div>
            </header>

            <div className="selection-layout">
                <aside className="material-sidebar">
                    <h3>Select Component</h3>
                    <div className="sidebar-list">
                        {bomList.map(item => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${selectedMaterial?.id === item.id ? 'active' : ''}`}
                                onClick={() => setSelectedMaterial(item)}
                            >
                                <div className="sidebar-item-content">
                                    <span className="item-name">{item.formatted_part || item.part || item.part_number || 'Unknown Part'}</span>
                                    <span className="item-sub-spec">{item.size} | {item.material}</span>
                                    <span className="item-qty">{Number(item.quantity).toFixed(2)} Units</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="ranking-content">
                    <div className="priority-controls main-priority-banner">
                        <div className="priority-header">
                            <div className="p-title">
                                <h4><FaCogs /> Ranking Priorities</h4>
                                <span className={`status-dot ${JSON.stringify(appliedWeights) !== JSON.stringify(pendingWeights) ? 'unsaved' : ''}`}></span>
                            </div>
                            <div className="p-actions">
                                <button className="btn-text" onClick={handleResetWeights}>Reset</button>
                                <button
                                    className={`btn-apply ${JSON.stringify(appliedWeights) !== JSON.stringify(pendingWeights) ? 'active' : ''}`}
                                    onClick={handleApplyWeights}
                                >
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                        <div className="weight-sliders">
                            <div className="weight-group">
                                <label>Price Priority <span className="normalized-badge">{normPending.price.toFixed(1)}%</span></label>
                                <input type="range" min="0" max="100" value={pendingWeights.price} onChange={(e) => updateWeight('price', e.target.value)} />
                            </div>
                            <div className="weight-group">
                                <label>Lead Time Priority <span className="normalized-badge">{normPending.leadTime.toFixed(1)}%</span></label>
                                <input type="range" min="0" max="100" value={pendingWeights.leadTime} onChange={(e) => updateWeight('leadTime', e.target.value)} />
                            </div>
                            <div className="weight-group">
                                <label>Proximity Priority <span className="normalized-badge">{normPending.distance.toFixed(1)}%</span></label>
                                <input type="range" min="0" max="100" value={pendingWeights.distance} onChange={(e) => updateWeight('distance', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="ai-loading">
                            <div className="ai-brain-pulse">
                                <FaRobot />
                            </div>
                            <h4>AI Engine Analyzing Submissions...</h4>
                            <p>Evaluating price, lead time, and fulfillment rates</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <FaCogs size={48} />
                            <h3>Analysis Unavailable</h3>
                            <p>{error}</p>
                            <button className="btn btn-secondary mt-4" onClick={handleRankVendors}>Retry Analysis</button>
                        </div>
                    ) : rankedVendors.length === 0 ? (
                        <div className="empty-state">
                            <FaRankingStar size={48} />
                            <h3>No Quotations Received</h3>
                            <p>Wait for vendors to submit their quotes via the portal before ranking.</p>
                        </div>
                    ) : (
                        <div className="rankings-list">
                            <div className="results-header">
                                <h3>AI Recommendations for {selectedMaterial?.formatted_part || selectedMaterial?.material}</h3>
                                <span className="count-badge">{rankedVendors.length} Quotes Analyzed</span>
                            </div>

                            {rankedVendors.map((vendor, index) => (
                                <div key={vendor.id} className={`vendor-rank-card ${index === 0 ? 'top-recommendation' : ''}`}>
                                    <div className="rank-badge">
                                        RANK {index + 1}
                                    </div>

                                    <div className="card-main">
                                        <div className="card-top">
                                            <div className="vendor-info">
                                                <h4>{vendor.vendor_name} {index === 0 && <FaStar className="star-icon" />}</h4>
                                                {/* <span className="location-tag"><FaMapMarkerAlt /> {vendor.shipment_from_location}</span> */}
                                            </div>
                                            <div className="ai-score-ring">
                                                <svg className="progress-ring" width="60" height="60">
                                                    <circle
                                                        className="progress-ring-bg"
                                                        stroke="#e2e8f0"
                                                        strokeWidth="4"
                                                        fill="transparent"
                                                        r="26"
                                                        cx="30"
                                                        cy="30"
                                                    />
                                                    <circle
                                                        className="progress-ring-fill"
                                                        stroke="#4f46e5"
                                                        strokeWidth="4"
                                                        strokeDasharray={`${2 * Math.PI * 26}`}
                                                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - (vendor.ai_score || 0) / 100)}`}
                                                        strokeLinecap="round"
                                                        fill="transparent"
                                                        r="26"
                                                        cx="30"
                                                        cy="30"
                                                    />
                                                </svg>
                                                <div className="score-content">
                                                    <div className="score-val">{(vendor.ai_score || 0).toFixed(0)}%</div>
                                                    <div className="score-label">MATCH</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="metrics-grid">
                                            <div className="metric">
                                                <label>Total Price</label>
                                                <div className="val">${vendor.unit_price?.toLocaleString()}</div>
                                            </div>
                                            <div className="metric">
                                                <label>Negotiation %</label>
                                                <div className="val">{parseFloat(vendor.negotiation_percentage || 0).toFixed(1)}%</div>
                                            </div>
                                            <div className="metric">
                                                <label>Lead Time</label>
                                                <div className="val"><FaTruck /> {vendor.lead_time_days} Days</div>
                                            </div>
                                            <div className="metric">
                                                <label>Travel Dist.</label>
                                                <div className="val"><FaMapMarkerAlt /> {vendor.distance_to_organization_km ? `${parseFloat(vendor.distance_to_organization_km).toFixed(1)} km` : 'N/A'}</div>
                                            </div>
                                        </div>

                                        <div className="ai-reasoning">
                                            <div className="reason-header">
                                                <FaRobot /> <span>AI REASONING</span>
                                            </div>
                                            <p>{vendor.recommendation_reason}</p>
                                        </div>
                                    </div>

                                    <div className="card-actions">
                                        <button
                                            className="btn btn-select-final"
                                            onClick={() => handleConfirmVendor(vendor.quotation_id || vendor.id)}
                                            disabled={loading}
                                        >
                                            <FaCheckCircle /> {loading ? "Confirming..." : "Confirm Vendor"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
