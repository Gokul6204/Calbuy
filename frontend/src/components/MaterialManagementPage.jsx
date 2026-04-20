import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchVendorList, fetchVendorMaterials, createVendorMaterial, deleteVendorMaterial } from '../api/vendor'
import { FaRegTrashAlt, FaSearch } from "react-icons/fa";
import { AddMaterialModal } from './AddMaterialModal'
import './MaterialManagementPage.css'

export function MaterialManagementPage() {
    const [vendors, setVendors] = useState([])
    const [vendorSearch, setVendorSearch] = useState('')
    const [selectedVendorId, setSelectedVendorId] = useState('')
    const [materials, setMaterials] = useState([])
    const [newMaterial, setNewMaterial] = useState('')
    const [loadingVendors, setLoadingVendors] = useState(true)
    const [loadingMaterials, setLoadingMaterials] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [error, setError] = useState(null)

    const loadVendors = useCallback(async () => {
        setLoadingVendors(true)
        try {
            const data = await fetchVendorList()
            setVendors(data)
        } catch (e) {
            setError('Failed to load vendors')
        } finally {
            setLoadingVendors(false)
        }
    }, [])

    const loadMaterials = useCallback(async (vendorId) => {
        if (!vendorId) {
            setMaterials([])
            return
        }
        setLoadingMaterials(true)
        try {
            const data = await fetchVendorMaterials(vendorId)
            setMaterials(data.sort((a, b) => b.id - a.id))
        } catch (e) {
            setError('Failed to load materials')
        } finally {
            setLoadingMaterials(false)
        }
    }, [])

    useEffect(() => {
        loadVendors()
    }, [loadVendors])

    useEffect(() => {
        if (selectedVendorId) {
            loadMaterials(selectedVendorId)
        } else {
            setMaterials([])
        }
    }, [selectedVendorId, loadMaterials])

    const handleAddMaterial = async (e) => {
        e.preventDefault()
        if (!selectedVendorId || !newMaterial.trim()) return
        setSubmitting(true)
        setError(null)
        try {
            await createVendorMaterial(selectedVendorId, newMaterial.trim())
            setNewMaterial('')
            loadMaterials(selectedVendorId)
        } catch (e) {
            setError(e.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteMaterial = async (id) => {
        try {
            await deleteVendorMaterial(id)
            loadMaterials(selectedVendorId)
        } catch (e) {
            setError(e.message)
        }
    }

    const filteredVendors = useMemo(() => {
        const s = vendorSearch.toLowerCase().trim()
        if (!s) return vendors
        return vendors.filter(v =>
            v.vendor_name.toLowerCase().includes(s) ||
            v.vendor_id.toLowerCase().includes(s)
        )
    }, [vendors, vendorSearch])

    const selectedVendor = vendors.find(v => String(v.id) === String(selectedVendorId))

    return (
        <div className="view-container material-mgmt-standalone">
            {/* <header className="page-header">
                <h2>Material Management</h2>
                <p className="page-subtitle">Search vendors and map materials</p>
            </header> */}

            <div className="material-mgmt-grid">
                {/* Left Column: Vendor Search & Selection */}
                <aside className="vendor-selection-box">
                    <div className="search-wrap">
                        <input
                            type="text"
                            placeholder="Search vendor name or ID..."
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            className="search-input"
                        />
                        <span className="search-icon"><FaSearch /></span>
                    </div>

                    <div className="vendor-list-scroll">
                        {loadingVendors ? (
                            <div className="list-status">Loading vendors...</div>
                        ) : filteredVendors.length === 0 ? (
                            <div className="list-status">No vendors found.</div>
                        ) : (
                            filteredVendors.map(v => (
                                <button
                                    key={v.id}
                                    className={`vendor-item-btn ${String(selectedVendorId) === String(v.id) ? 'active' : ''}`}
                                    onClick={() => setSelectedVendorId(v.id)}
                                >
                                    <span className="v-name">{v.vendor_name}</span>
                                    <span className="v-id">{v.vendor_id}</span>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* Right Column: Material Management for Selected Vendor */}
                <main className="material-details-box">
                    {!selectedVendorId ? (
                        <div className="empty-notice">
                            <div className="box-icon">📦</div>
                            <h3>Select a Vendor</h3>
                            <p>Choose a vendor from the list to manage their material mappings.</p>
                        </div>
                    ) : (
                        <div className="mapping-content">
                            <div className="mapping-header">
                                <div className="mapping-header-left">
                                    <h3>{selectedVendor.vendor_name}</h3>
                                    <span className="v-badge">{selectedVendor.vendor_id}</span>
                                </div>
                                <div className="mapping-action-row">
                                    <div className="spacer"></div>
                                    <button className="btn btn-primary portal-btn-sm" onClick={() => setShowAddModal(true)}>
                                        Add Material
                                    </button>
                                </div> 
                            </div>

                            
                            
                            <AddMaterialModal 
                                open={showAddModal} 
                                onClose={() => setShowAddModal(false)}
                                onSuccess={() => loadMaterials(selectedVendorId)}
                                vendorId={selectedVendorId}
                                mode="vendor"
                            />

                            {error && <div className="error-bar">{error}</div>}

                            <div className="mapped-materials">
                                <label>Current Materials</label>
                                {loadingMaterials ? (
                                    <div className="list-status">Loading...</div>
                                ) : materials.length === 0 ? (
                                    <p className="no-data">No materials mapped yet.</p>
                                ) : (
                                    <div className="material-scroll-list">
                                        {materials.map(m => (
                                            <div key={m.id} className="material-row">
                                                <div className="m-info">
                                                    <span className="m-name" style={{ fontWeight: 600 }}>
                                                        {m.part_name || m.part || `Material #${m.id}`}
                                                    </span>
                                                    {!m.part_name && m.part && <span className="m-id-tag">{m.part}</span>}
                                                </div>
                                                <button
                                                    className="delete-mini"
                                                    onClick={() => handleDeleteMaterial(m.id)}
                                                    title="Remove mapping"
                                                >
                                                    <FaRegTrashAlt />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
