import { useState, useMemo } from 'react'
import { useAlert } from '../context/NotificationContext'
import { BOMUpload } from './BOMUpload'
import { BOMTable } from './BOMTable'
import { AddMaterialModal } from './AddMaterialModal'
import { bulkCreateBOM } from '../api/bom'
import { matchVendors } from '../api/vendor'
import { FaPlus, FaSearch, FaCloudUploadAlt, FaTools, FaTrash, FaBoxOpen, FaLayerGroup, FaTags, FaIndustry } from 'react-icons/fa'
import './HomePage.css'

/** Derive next BOM ID from existing list (e.g. BOM-001, BOM-002 -> BOM-003). */
function getNextBomId(bomList) {
    if (!bomList?.length) return 'BOM-001'
    const numbers = bomList.map((row) => {
        const s = String(row.bom_id ?? '').trim()
        const match = s.match(/(\d+)$/) || s.match(/(\d+)/)
        return match ? parseInt(match[1], 10) : 0
    })
    const max = Math.max(0, ...numbers)
    const next = max + 1
    return 'BOM-' + String(next).padStart(3, '0')
}

export function BOMPage({ project, bomList, setBomList, setMatchedVendors, setView }) {
    const { showConfirm } = useAlert()
    const [findingVendors, setFindingVendors] = useState(false)
    const [savingToDB, setSavingToDB] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [folderUploadTrigger, setFolderUploadTrigger] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [qtyTypeFilter, setQtyTypeFilter] = useState('all')

    const handleUploadSuccess = async (newRows) => {
        const updatedList = [...newRows, ...bomList]
        setBomList(updatedList)
        setSuccessMessage(`Parsed ${newRows.length} items. Auto-saving...`)
        try {
            await bulkCreateBOM(updatedList, project?.id)
            setSuccessMessage(`Parsed and saved ${newRows.length} items.`)
        } catch (e) {
            setError('Upload successful, but failed to auto-save to database.')
        }
        setTimeout(() => setSuccessMessage(null), 5000)
    }

    const [addMaterialOpen, setAddMaterialOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState(null)

    const handleAddMaterialSuccess = async (materialData) => {
        let updatedList
        if (materialData.id || materialData.temp_id) {
            const exists = bomList.find(item =>
                (materialData.id && item.id === materialData.id) ||
                (materialData.temp_id && item.temp_id === materialData.temp_id)
            )

            if (exists) {
                updatedList = bomList.map(item =>
                    ((materialData.id && item.id === materialData.id) ||
                        (materialData.temp_id && item.temp_id === materialData.temp_id))
                        ? materialData : item
                )
            } else {
                updatedList = [materialData, ...bomList]
            }
        } else {
            updatedList = [materialData, ...bomList]
        }

        setBomList(updatedList)
        setEditingRecord(null)

        // Auto-save
        try {
            await bulkCreateBOM(updatedList, project?.id)
        } catch (e) {
            console.error("Auto-save failed", e)
        }
    }

    const handleDelete = async (row) => {
        const updatedList = bomList.filter(item => {
            if (row.id) return item.id !== row.id
            return item.temp_id !== row.temp_id
        })
        setBomList(updatedList)

        // Auto-save after delete
        try {
            await bulkCreateBOM(updatedList, project?.id)
        } catch (e) {
            console.error("Auto-save failed after delete", e)
        }
    }

    const handleSaveToDB = async () => {
        // Kept for internal logic if needed, but button removed
        if (!bomList.length) return
        setSavingToDB(true)
        setError(null)
        try {
            const res = await bulkCreateBOM(bomList, project?.id)
            setSuccessMessage(res.message)
            setTimeout(() => setSuccessMessage(null), 5000)
        } catch (e) {
            setError(e.message || 'Failed to save to database')
        } finally {
            setSavingToDB(false)
        }
    }

    const handleClearList = () => {
        showConfirm(
            'Are you sure you want to clear all items from the current list? This action cannot be undone.',
            async () => {
                setBomList([])
                try {
                    await bulkCreateBOM([], project?.id)
                } catch (e) {
                    console.error("Auto-save failed after clear", e)
                }
            },
            'delete'
        )
    }

    const suggestedBomId = useMemo(() => getNextBomId(bomList), [bomList])

    const handleGetVendors = async () => {
        if (!bomList.length) return
        setFindingVendors(true)
        try {
            const categories = [...new Set(bomList.map(item => (item.category || '').trim()))].filter(Boolean)
            const materials = [...new Set(bomList.map(item => (item.part || '').trim()))].filter(Boolean)
            const result = await matchVendors({ categories, materials })
            setMatchedVendors(result)
            setView('matching-vendor')
        } catch (e) {
            console.error("matchVendors error:", e)
            setError('Failed to find matching vendors: ' + (e.message || 'Unknown error'))
        } finally {
            setFindingVendors(false)
        }
    }

    const filteredBOM = useMemo(() => {
        return bomList.filter(item => {
            const matchesSearch = (item.formatted_part || item.part || item.part_number || '').toLowerCase().includes(searchTerm.toLowerCase())
            const matchesQtyType = qtyTypeFilter === 'all' || item.quantity_type === qtyTypeFilter
            return matchesSearch && matchesQtyType
        })
    }, [bomList, searchTerm, qtyTypeFilter])

    const qtyTypes = useMemo(() => {
        return ['all', ...new Set(bomList.map(item => item.quantity_type).filter(Boolean))]
    }, [bomList])

    return (
        <div className="view-container">
            <div className="home-grid">
                <aside className="home-sidebar">
                    {/* <div className="action-card">
                        <h3><FaCloudUploadAlt /> Extract Bom from Pdf's</h3>
                        
                    </div> */}
                    <div className="action-card">
                        <div className="v-card-header">
                            <FaCloudUploadAlt />
                            <h4>Import BOM</h4>
                        </div>
                        <div className="import-section">
                            <button
                                className="btn btn-primary"
                                onClick={() => setFolderUploadTrigger((v) => v + 1)}
                            >
                                <FaCloudUploadAlt /> Upload Folder
                            </button>
                            <div className="or-divider">
                                <span>OR</span>
                            </div>
                            <BOMUpload onSuccess={handleUploadSuccess} folderUploadSignal={folderUploadTrigger} />
                        </div>
                    </div>

                    <div className="action-card">
                        <h3><FaTools /> Operations</h3>
                        <div className="sidebar-buttons">
                            <button
                                type="button"
                                className="btn btn-gradient-primary w-full"
                                onClick={() => setAddMaterialOpen(true)}
                            >
                                <FaPlus /> Add Material
                            </button>
                            <button
                                type="button"
                                className="btn btn-soft-blue w-full"
                                onClick={handleGetVendors}
                                disabled={findingVendors || bomList.length === 0}
                            >
                                <FaSearch />
                                {findingVendors ? 'Finding...' : 'Get Vendors'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-light-red w-full"
                                onClick={handleClearList}
                                disabled={bomList.length === 0}
                            >
                                <FaTrash /> Clear List
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="message message-error" role="alert">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="message message-success" role="alert">
                            {successMessage}
                        </div>
                    )}
                </aside>

                <main className="home-main-content">
                    <>
                        {/* <div className="dashboard-summary">
                            <div className="stat-card">
                                <div className="stat-icon bg-indigo-100 text-indigo-600"><FaBoxOpen /></div>
                                <div className="stat-info">
                                    <span className="stat-value">{bomList.length}</span>
                                    <span className="stat-label">Total Parts</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-purple-100 text-purple-600"><FaLayerGroup /></div>
                                <div className="stat-info">
                                    <span className="stat-value">{bomList.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0).toFixed(0)}</span>
                                    <span className="stat-label">Total Quantity</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-emerald-100 text-emerald-600"><FaTags /></div>
                                <div className="stat-info">
                                    <span className="stat-value">{new Set(bomList.map(i => i.part).filter(Boolean)).size}</span>
                                    <span className="stat-label">Unique Materials</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-amber-100 text-amber-600"><FaIndustry /></div>
                                <div className="stat-info">
                                    <span className="stat-value">{new Set(bomList.map(i => i.vendor_name).filter(Boolean)).size || 0}</span>
                                    <span className="stat-label">Pending Vendors</span>
                                </div>
                            </div>
                        </div> */}

                        <div className="table-container-header">
                            <div className="header-left-side">
                                <h2>BOM Records</h2>
                                <span className="v-badge">{filteredBOM.length} items</span>
                            </div>
                            <div className="header-filters">
                                <div className="filter-group">
                                    <FaSearch className="filter-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search part name..." 
                                        className="filter-input"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="filter-group">
                                    <select 
                                        className="filter-select"
                                        value={qtyTypeFilter}
                                        onChange={(e) => setQtyTypeFilter(e.target.value)}
                                    >
                                        {qtyTypes.map(type => (
                                            <option key={type} value={type}>
                                                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="table-view-inner">
                            <BOMTable
                                data={filteredBOM}
                                onEdit={(row) => setEditingRecord(row)}
                                onDelete={handleDelete}
                            />
                        </div>
                    </>
                </main>
            </div>

            <AddMaterialModal
                open={addMaterialOpen}
                onClose={() => setAddMaterialOpen(false)}
                onSuccess={handleAddMaterialSuccess}
                suggestedBomId={suggestedBomId}
            />
            <AddMaterialModal
                open={Boolean(editingRecord)}
                onClose={() => setEditingRecord(null)}
                onSuccess={handleAddMaterialSuccess}
                suggestedBomId={suggestedBomId}
                initialData={editingRecord}
            />

        </div>
    )
}
