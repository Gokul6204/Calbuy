import { useState, useEffect } from 'react'
import { createBOMRecord, updateBOMRecord } from '../api/bom'
import { createVendorMaterial } from '../api/vendor'
import { FaUpload, FaFilePdf, FaFileExcel, FaFileCsv, FaPlus } from 'react-icons/fa'
import './AddMaterialModal.css'

function toDateInputValue(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function AddMaterialModal({ 
  open, 
  onClose, 
  onSuccess, 
  suggestedBomId = 'BOM-001', 
  initialData = null,
  mode = 'bom', // 'bom' or 'vendor'
  vendorId = null
}) {
  const isEdit = Boolean(initialData?.id)
  const [activeTab, setActiveTab] = useState('single') // 'single' or 'bulk'
  const [bomId, setBomId] = useState(suggestedBomId)
  const [partNumber, setPartNumber] = useState('')
  const [material, setMaterial] = useState('')
  const [quantity, setQuantity] = useState('')
  const [dateOfRequirement, setDateOfRequirement] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setBomId(initialData.bom_id ?? '')
        setPartNumber(initialData.part_number ?? '')
        setMaterial(initialData.material ?? '')
        setQuantity(initialData.quantity != null ? String(initialData.quantity) : '')
        setDateOfRequirement(toDateInputValue(initialData.date_of_requirement))
      } else {
        setBomId(suggestedBomId)
        setPartNumber('')
        setMaterial('')
        setQuantity('')
        setDateOfRequirement('')
      }
      setActiveTab('single')
      setError(null)
      setSelectedFile(null)
    }
  }, [open, suggestedBomId, initialData])

  const resetForm = () => {
    setBomId(initialData ? (initialData.bom_id ?? '') : suggestedBomId)
    setPartNumber(initialData ? (initialData.part_number ?? '') : '')
    setMaterial(initialData ? (initialData.material ?? '') : '')
    setQuantity(initialData && initialData.quantity != null ? String(initialData.quantity) : '')
    setDateOfRequirement(initialData ? toDateInputValue(initialData.date_of_requirement) : '')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    // Validations based on mode
    if (mode === 'bom') {
      if (!bomId.trim() || !material.trim()) {
        setError('BOM ID and Material are required.')
        return
      }
    } else {
      if (!material.trim()) {
        setError('Material name is required.')
        return
      }
    }

    setSaving(true)
    try {
      if (mode === 'vendor') {
        await createVendorMaterial(vendorId, { material, part_number: partNumber })
      } else {
        const payload = {
          id: initialData?.id,
          temp_id: initialData?.temp_id || (isEdit ? null : `temp-${Date.now()}`),
          bom_id: bomId.trim(),
          part_number: partNumber.trim(),
          material: material.trim(),
          quantity: quantity === '' ? 0 : Number(quantity),
          date_of_requirement: dateOfRequirement.trim() || null,
          source_file: initialData?.source_file || 'Manual entry',
        }
        onSuccess?.(payload)
      }
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to save material.')
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) {
        setError("Please select a file to upload.")
        return
    }
    // Simulation / Future enhancement for bulk upload
    alert(`Bulk processing for ${selectedFile.name} (CSV/Excel/PDF) will be implemented here.`)
    onSuccess?.()
    handleClose()
  }

  if (!open) return null

  return (
    <div className="add-material-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="add-material-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-material-header">
          <h3>{isEdit ? 'Edit Material' : 'Add Material'}</h3>
          <button type="button" className="add-material-close" onClick={handleClose}>&times;</button>
        </div>

        {activeTab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="add-material-form">
            {error && <p className="add-material-error">{error}</p>}
            
            {mode === 'bom' && (
              <div className="input-group">
                <label>BOM ID <span className="required-star">*</span></label>
                <input
                  type="text"
                  value={bomId}
                  onChange={(e) => setBomId(e.target.value)}
                  placeholder="e.g. BOM-001"
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="input-group">
              <label>Part Number <span className="required-star">*</span></label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g. PN-12345"
                required
              />
            </div>

            <div className="input-group">
              <label>Material <span className="required-star">*</span></label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Material description or code"
                required
              />
            </div>

            {mode === 'bom' && (
              <>
                <div className="input-group">
                  <label>Quantity <span className="required-star">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Date of Requirement <span className="required-star">*</span></label>
                  <input
                    type="date"
                    value={dateOfRequirement}
                    onChange={(e) => setDateOfRequirement(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </>
            )}

            <div className="add-material-actions">
              <button type="button" className="add-material-btn secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="add-material-btn primary" disabled={saving}>
                {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Material')}
              </button>
            </div>
          </form>
        ) : (
          <form className="bulk-upload-form" onSubmit={handleBulkSubmit}>
            <p className="upload-subtitle">Upload CSV, Excel, or technical PDF drawings to extract material lists automatically.</p>
            <div className={`upload-zone ${selectedFile ? 'has-file' : ''}`}>
              <input 
                type="file" 
                id="bulk-file" 
                accept=".csv, .xlsx, .xls, .pdf"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
              <label htmlFor="bulk-file" className="dropzone-label">
                <FaUpload className="up-icon" />
                {selectedFile ? (
                    <div className="file-info">
                        <strong>{selectedFile.name}</strong>
                        <span>Click to change file</span>
                    </div>
                ) : (
                    <div className="file-prompt">
                        <strong>Drag & drop file here</strong>
                        <span>or click to browse</span>
                        <div className="supported-formats">
                            <FaFileCsv /> CSV <FaFileExcel /> Excel <FaFilePdf /> PDF
                        </div>
                    </div>
                )}
              </label>
            </div>
            
            {error && <p className="add-material-error">{error}</p>}

            <div className="add-material-actions">
              <button type="button" className="add-material-btn secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="add-material-btn primary" disabled={!selectedFile}>
                Process & Add Bulk Material
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
