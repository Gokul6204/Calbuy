import { useState, useEffect } from 'react'
import { createBOMRecord, updateBOMRecord, fetchPartMaster } from '../api/bom'
import { createVendorMaterial } from '../api/vendor'
import { FaUpload, FaFilePdf, FaFileExcel, FaFileCsv, FaPlus } from 'react-icons/fa'
import { useAlert } from '../context/NotificationContext'
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
  const { showAlert } = useAlert()
  const [activeTab, setActiveTab] = useState('single') // 'single' or 'bulk'
  const [part, setPart] = useState('')
  const [size, setSize] = useState('')
  const [GradeName, setGradeName] = useState('')
  const [lengthArea, setLengthArea] = useState('')
  const [quantityType, setQuantityType] = useState('')
  const [unit, setUnit] = useState('')
  const [dateOfRequirement, setDateOfRequirement] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setPart(initialData.part ?? initialData.part_number ?? '')
        setSize(initialData.size ?? '')
        setGradeName(initialData.grade_name ?? initialData.material ?? '')
        setLengthArea(initialData.length_area != null ? String(initialData.length_area) : (initialData.quantity != null ? String(initialData.quantity) : ''))
        setQuantityType(initialData.quantity_type ?? '')
        setUnit(initialData.unit ?? '')
        setDateOfRequirement(toDateInputValue(initialData.date_of_requirement))
      } else {
        setPart('')
        setSize('')
        setGradeName('')
        setLengthArea('')
        setQuantityType('')
        setUnit('')
        setDateOfRequirement('')
      }
      setActiveTab('single')
      setError(null)
      setSelectedFile(null)
      setResolvedPartInfo(null)
    }
  }, [open, suggestedBomId, initialData])

  const [resolvedPartInfo, setResolvedPartInfo] = useState(null)

  useEffect(() => {
    if (!part.trim()) {
      setResolvedPartInfo(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const results = await fetchPartMaster(part.trim())
        // Look for an exact match for the part code
        const match = results.find(r => r.part.toLowerCase() === part.trim().toLowerCase())
        if (match) {
          setResolvedPartInfo(match)
        } else {
          setResolvedPartInfo(null)
        }
      } catch (e) {
        console.error("Part master fetch failed", e)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [part])

  const resetForm = () => {
    setPart(initialData ? (initialData.part ?? initialData.part_number ?? '') : '')
    setSize(initialData ? (initialData.size ?? '') : '')
    setGradeName(initialData ? (initialData.grade_name ?? initialData.material ?? '') : '')
    setLengthArea(initialData && initialData.length_area != null ? String(initialData.length_area) : '')
    setQuantityType(initialData ? (initialData.quantity_type ?? '') : '')
    setUnit(initialData ? (initialData.unit ?? '') : '')
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
      if (!part.trim() || !size.trim() || !GradeName.trim()) {
        setError('Part, Size and Grade are required.')
        return
      }
    } else {
      if (!part.trim()) {
        setError('Part description is required.')
        return
      }
    }

    setSaving(true)
    try {
      if (mode === 'vendor') {
        await createVendorMaterial(vendorId, { part: part.trim() })
      } else {
        const payload = {
          id: initialData?.id,
          temp_id: initialData?.temp_id || (isEdit ? null : `temp-${Date.now()}`),
          part: part.trim(),
          size: size.trim(),
          grade_name: GradeName.trim(),
          length_area: lengthArea === '' ? 0 : Number(lengthArea),
          part_number: part.trim(),
          material: GradeName.trim(),
          quantity: lengthArea === '' ? 0 : Number(lengthArea),
          quantity_type: quantityType.trim(),
          unit: unit.trim(),
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
    showAlert(`Bulk processing for ${selectedFile.name} (CSV/Excel/PDF) will be implemented here.`, "info")
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

            {(initialData?.part_name || initialData?.category || resolvedPartInfo) && (
              <div className="mapped-info-banner">
                <span>Mapping: <strong>{resolvedPartInfo?.part_name || initialData?.part_name}</strong></span>
                <span className="info-sep">|</span>
                <span>Category: <strong>{resolvedPartInfo?.category || initialData?.category}</strong></span>
              </div>
            )}

            <div className="input-group">
              <label>Part <span className="required-star">*</span></label>
              <input
                type="text"
                value={part}
                onChange={(e) => setPart(e.target.value)}
                placeholder="e.g. PL, CH, L, etc."
                required
              />
            </div>

            {mode === 'bom' && (
              <>
                <div className="input-group">
                  <label>Size</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 10X100"
                  />
                </div>
                <div className="input-group">
                  <label>Grade</label>
                  <input
                    type="text"
                    value={GradeName}
                    onChange={(e) => setGradeName(e.target.value)}
                    placeholder="e.g. IS 2062, A36"
                  />
                </div>
              </>
            )}

            {mode === 'bom' && (
              <>
                <div className="input-group">
                  <label>Length/Area <span className="required-star">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={lengthArea}
                    onChange={(e) => setLengthArea(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="form-grid-row">
                  <div className="input-group">
                    <label>Quantity Type</label>
                    <input
                      type="text"
                      value={quantityType}
                      onChange={(e) => setQuantityType(e.target.value)}
                      placeholder="e.g. Area, Length"
                    />
                  </div>
                  <div className="input-group">
                    <label>Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. sq.mm, feet"
                    />
                  </div>
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
