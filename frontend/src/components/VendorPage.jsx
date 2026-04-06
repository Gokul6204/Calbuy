import { useState, useEffect, useCallback } from 'react'
import { fetchVendorList, deleteVendor, updateVendor } from '../api/vendor'
import { VendorTable } from './VendorTable'
import { AddVendorModal } from './AddVendorModal'
import { ManageMaterialsModal } from './ManageMaterialsModal'
import { VendorUpload } from './VendorUpload'
import { FaTools, FaPlus, FaCloudUploadAlt } from 'react-icons/fa'
import { BsPersonFillCheck, BsPersonFillX  } from "react-icons/bs";
import './VendorPage.css'

import { useWebSocket } from '../context/WebSocketContext'

export function VendorPage() {
    const { subscribe, isConnected } = useWebSocket()
    const [vendors, setVendors] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [addVendorOpen, setAddVendorOpen] = useState(false)
    const [editingVendor, setEditingVendor] = useState(null)
    const [manageMaterialsVendor, setManageMaterialsVendor] = useState(null)
    const [assignVendorOpen, setAssignVendorOpen] = useState(false)

    const loadVendors = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchVendorList()
            setVendors(data.sort((a, b) => b.id - a.id))
        } catch (e) {
            setError(e.message || 'Failed to load vendors')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadVendors()
    }, [loadVendors, isConnected]) // Re-fetch on reconnect

    useEffect(() => {
        const unsubscribeUpdate = subscribe('vendor_updated', (updatedVendor) => {
            setVendors(prev => {
                const index = prev.findIndex(v => v.id === updatedVendor.id)
                if (index !== -1) {
                    const newVendors = [...prev]
                    newVendors[index] = updatedVendor
                    return newVendors
                } else {
                    return [updatedVendor, ...prev]
                }
            })
        })

        const unsubscribeDelete = subscribe('vendor_deleted', (payload) => {
            setVendors(prev => prev.filter(v => v.id !== payload.id))
        })

        return () => {
            unsubscribeUpdate()
            unsubscribeDelete()
        }
    }, [subscribe])

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) return
        try {
            await deleteVendor(id)
            loadVendors()
        } catch (e) {
            alert(e.message)
        }
    }

    const handleToggleStatus = async (vendor) => {
        const action = vendor.is_active ? 'deactivate' : 'activate'
        if (!window.confirm(`Are you sure you want to ${action} this vendor?`)) return
        
        try {
            await updateVendor(vendor.id, { ...vendor, is_active: !vendor.is_active })
            loadVendors()
        } catch (e) {
            alert(e.message || 'Failed to update status')
        }
    }

    return (
        <div className="view-container">
            <div className="vendor-grid">
                <aside className="vendor-sidebar">
                    

                    <div className="action-card">
                        <div className="card-header">
                            <FaCloudUploadAlt />
                            <h4>Import Vendors</h4>
                        </div>
                        <VendorUpload onSuccess={loadVendors} />
                    </div>

                    <div className="action-card">
                        <div className="sidebar-actions">
                            <h3><FaTools /> Operations</h3>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setAddVendorOpen(true)}
                                style={{ width: '100%' }}
                            >
                                <FaPlus /> Add Vendor
                            </button>
                        </div>
                    </div>

                    <div className="vendor-stats-vertical">
                        <div className="stat-card">
                            <span className="stat-label">Total Vendors</span>
                            <span className="stat-value">{vendors.length}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Active Materials</span>
                            <span className="stat-value">--</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Reliability</span>
                            <span className="stat-value">98%</span>
                        </div>
                    </div>

                    {error && <div className="message message-error">{error}</div>}
                </aside>

                <main className="vendor-main-content">
                    <div className="table-container-header">
                        <h2>Vendor Records</h2>
                        <span className="v-badge">{vendors.length} vendors</span>
                    </div>

                    <div className="table-view-inner">
                        {loading ? (
                            <div className="loading">
                                <div className="spinner"></div>
                                <span>Loading vendors…</span>
                            </div>
                        ) : (
                            <VendorTable
                                data={vendors}
                                onAssign={(v) => setAssignVendorOpen(v)}
                                onEdit={(v) => setEditingVendor(v)}
                                onDelete={handleDelete}
                                onManageMaterials={(v) => setManageMaterialsVendor(v)}
                                onToggleStatus={handleToggleStatus}
                            />
                        )}
                    </div>
                </main>
            </div>

            <AddVendorModal
                open={addVendorOpen || Boolean(editingVendor)}
                onClose={() => {
                    setAddVendorOpen(false)
                    setEditingVendor(null)
                }}
                onSuccess={loadVendors}
                initialData={editingVendor}
            />

            <ManageMaterialsModal
                open={Boolean(manageMaterialsVendor)}
                onClose={() => setManageMaterialsVendor(null)}
                vendor={manageMaterialsVendor}
            />
        </div>
    )
}
