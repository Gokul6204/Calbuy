import { useState, useMemo } from 'react'
import { BOMUpload } from './BOMUpload'
import { BOMTable } from './BOMTable'
import { AddMaterialModal } from './AddMaterialModal'
import { bulkCreateBOM } from '../api/bom'
import { matchVendors } from '../api/vendor'
import { FaPlus, FaSearch, FaCloudUploadAlt, FaTools, FaRegSave, FaTrash, FaArrowLeft } from 'react-icons/fa'
import { UnderConstruction } from './UnderConstruction'
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
    const [findingVendors, setFindingVendors] = useState(false)
    const [savingToDB, setSavingToDB] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [viewMode, setViewMode] = useState('list') // 'list' or 'construction'

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

    const handleClearList = async () => {
        if (window.confirm('Clear all items from current list?')) {
            setBomList([])
            try {
                await bulkCreateBOM([], project?.id)
            } catch (e) {
                console.error("Auto-save failed after clear", e)
            }
        }
    }

    const suggestedBomId = useMemo(() => getNextBomId(bomList), [bomList])

    const handleGetVendors = async () => {
        if (!bomList.length) return
        setFindingVendors(true)
        try {
            const materials = [...new Set(bomList.map(item => item.material.trim()))]
            const result = await matchVendors(materials)
            setMatchedVendors(result)
            setView('matching-vendor')
        } catch (e) {
            setError('Failed to find matching vendors')
        } finally {
            setFindingVendors(false)
        }
    }

    return (
        <div className="view-container">
            <div className="home-grid">
                <aside className="home-sidebar">
                    <div className="action-card">
                        <h3><FaCloudUploadAlt /> Extract Bom from Pdf's</h3>
                        <button
                            className={`btn ${viewMode === 'construction' ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => setViewMode(viewMode === 'construction' ? 'list' : 'construction')}
                        >
                            {viewMode === 'construction' ? <><FaArrowLeft /> Back To Bom Table</> : <><FaCloudUploadAlt /> Upload Folder</>}
                        </button>
                    </div>
                    <div className="action-card">
                        <h3><FaCloudUploadAlt /> Import BOM</h3>
                        <BOMUpload onSuccess={handleUploadSuccess} />
                    </div>

                    <div className="action-card">
                        <h3><FaTools /> Operations</h3>
                        <div className="sidebar-buttons">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setAddMaterialOpen(true)}
                            >
                                <FaPlus /> Add Material
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleGetVendors}
                                disabled={findingVendors || bomList.length === 0}
                            >
                                <FaSearch />
                                {findingVendors ? 'Finding...' : 'Get Vendors'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-danger"
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
                    {viewMode === 'list' ? (
                        <>
                            <div className="table-container-header">
                                <h2>BOM Records</h2>
                                <span className="v-badge">{bomList.length} total items</span>
                            </div>

                            <div className="table-view-inner">
                                <BOMTable
                                    data={bomList}
                                    onEdit={(row) => setEditingRecord(row)}
                                    onDelete={handleDelete}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="construction-inner-view">
                            <UnderConstruction
                                title="AI BOM Extraction (Folders)"
                                description="We are training our AI models to automatically extract BOM items from technical drawings and multi-page PDFs within folders. This feature will be available soon."
                            />
                        </div>
                    )}
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
