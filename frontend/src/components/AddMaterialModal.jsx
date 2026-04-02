import { useState, useEffect } from 'react'
import { createBOMRecord, updateBOMRecord } from '../api/bom'
import './AddMaterialModal.css'

function toDateInputValue(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function AddMaterialModal({ open, onClose, onSuccess, suggestedBomId = 'BOM-001', initialData = null }) {
  const isEdit = Boolean(initialData?.id)
  const [bomId, setBomId] = useState(suggestedBomId)
  const [partNumber, setPartNumber] = useState('')
  const [material, setMaterial] = useState('')
  const [quantity, setQuantity] = useState('')
  const [dateOfRequirement, setDateOfRequirement] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    if (!bomId.trim() || !material.trim()) {
      setError('BOM ID and Material are required.')
      return
    }

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
    handleClose()
  }

  if (!open) return null

  return (
    <div className="add-material-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="add-material-title">
      <div className="add-material-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-material-header">
          <h3 id="add-material-title">{isEdit ? 'Edit Material' : 'Add Material'}</h3>
          <button type="button" className="add-material-close" onClick={handleClose} aria-label="Close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="add-material-form">
          {error && <p className="add-material-error" role="alert">{error}</p>}
          <label>
            BOM ID<span className="required">*</span>
            <input
              type="text"
              value={bomId}
              onChange={(e) => setBomId(e.target.value)}
              placeholder="e.g. BOM-001"
              title="Continues from last BOM ID in the list"
              required
              autoFocus
            />
          </label>
          <label>
            Part Number
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="e.g. PN-12345"
            />
          </label>
          <label>
            Material <span className="required">*</span>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Material description or code"
              required
            />
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Date of requirement
            <input
              type="date"
              value={dateOfRequirement}
              onChange={(e) => setDateOfRequirement(e.target.value)}
            />
          </label>
          <div className="add-material-actions">
            <button type="button" className="add-material-btn secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="add-material-btn primary" disabled={saving}>
              {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add Material')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
