import { useState, useEffect, useCallback } from 'react'
import { fetchVendorMaterials, createVendorMaterial, deleteVendorMaterial } from '../api/vendor'
import './AddMaterialModal.css'
import { FaRegTrashAlt } from "react-icons/fa";


export function ManageMaterialsModal({ open, onClose, vendor }) {
    const [materials, setMaterials] = useState([])
    const [newMaterial, setNewMaterial] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
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
                    <div className="header-text-group">
                        <h3>Vendor Materials</h3>
                        <p className="v-subtitle">
                            {vendor.vendor_name} <span className="v-badge">{vendor.vendor_id}</span>
                        </p>
                    </div>
                    <button type="button" className="add-material-close" onClick={onClose}>&times;</button>
                </div>

                <div className="add-material-form">
                    {error && <p className="add-material-error">{error}</p>}

                    <form onSubmit={handleAdd} className="quick-add-form mobile-column">
                        <input
                            type="text"
                            value={newMaterial}
                            onChange={(e) => setNewMaterial(e.target.value)}
                            placeholder="Add new material..."
                            required
                        />
                        <button type="submit" className="add-material-btn primary" disabled={submitting}>
                            {submitting ? '...' : 'Add'}
                        </button>
                    </form>

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
                                        <span>{m.material}</span>
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
