import { useState, useEffect, useCallback } from 'react'
import { fetchVendorMaterials, createVendorMaterial, deleteVendorMaterial } from '../api/vendor'
import { AddMaterialModal } from './AddMaterialModal'
import './AddMaterialModal.css'
import { FaRegTrashAlt } from "react-icons/fa";


export function ManageMaterialsModal({ open, onClose, vendor }) {
    const [materials, setMaterials] = useState([])
    const [newMaterial, setNewMaterial] = useState('')
    const [loading, setLoading] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [error, setError] = useState(null)

    const loadMaterials = useCallback(async () => {
        if (!vendor?.id) return
        setLoading(true)
        setError(null)
        try {
            const data = await fetchVendorMaterials(vendor.id)
            setMaterials(data)
        } catch (e) {
            setError('Failed to load materials')
        } finally {
            setLoading(false)
        }
    }, [vendor])

    useEffect(() => {
        if (open && vendor) {
            loadMaterials()
            setNewMaterial('')
            setError(null)
        }
    }, [open, vendor, loadMaterials])

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!newMaterial.trim()) return
        setSubmitting(true)
        try {
            await createVendorMaterial(vendor.id, newMaterial.trim())
            setNewMaterial('')
            loadMaterials()
        } catch (e) {
            setError(e.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteVendorMaterial(id)
            loadMaterials()
        } catch (e) {
            setError(e.message)
        }
    }

    if (!open || !vendor) return null

    return (
        <div className="add-material-overlay" onClick={onClose} role="dialog">
            <div className="add-material-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                <div className="add-material-header">
                    <div className="header-text-grade">
                        <h3>Vendor Materials</h3>
                        <p className="v-subtitle">
                            {vendor.vendor_name} <span className="v-badge">{vendor.vendor_id}</span>
                        </p>
                    </div>
                    <button type="button" className="add-material-close" onClick={onClose}>&times;</button>
                </div>

                <div className="add-material-form">
                    {error && <p className="add-material-error">{error}</p>}

                    <div className="mapping-action-row" style={{ marginBottom: '1.5rem' }}>
                        <div className="spacer"></div>
                        <button className="btn btn-primary portal-btn-sm" onClick={() => setShowAddModal(true)}>
                            Add Material
                        </button>
                    </div>

                    <AddMaterialModal
                        open={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={loadMaterials}
                        vendorId={vendor.id}
                        mode="vendor"
                    />

                    <div className="materials-list-section">
                        <label>Mapped Materials</label>
                        {loading ? (
                            <div className="list-status">Loading...</div>
                        ) : materials.length === 0 ? (
                            <p className="no-data-msg">No materials mapped yet.</p>
                        ) : (
                            <div className="material-scroll-list inset">
                                {materials.map((m) => (
                                    <div key={m.id} className="material-row mini">
                                        <div className="m-info">
                                            <span className="m-name">{m.part_name || m.part}</span>
                                        </div>
                                        <button
                                            className="delete-mini"
                                            onClick={() => handleDelete(m.id)}
                                            title="Delete Mapping"
                                        >
                                            <FaRegTrashAlt />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
