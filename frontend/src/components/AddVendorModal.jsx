import { useState, useEffect } from 'react'
import { createVendor, updateVendor } from '../api/vendor'
import './AddMaterialModal.css' // Reusing modal styles

export function AddVendorModal({ open, onClose, onSuccess, initialData = null }) {
    const isEdit = Boolean(initialData?.id)
    const [vendorId, setVendorId] = useState('')
    const [vendorName, setVendorName] = useState('')
    const [mobileNumber, setMobileNumber] = useState('')
    const [email, setEmail] = useState('')
    const [location, setLocation] = useState('')
    const [address, setAddress] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [errors, setErrors] = useState({}) // Field-specific errors

    useEffect(() => {
        if (open) {
            if (initialData) {
                setVendorId(initialData.vendor_id ?? '')
                setVendorName(initialData.vendor_name ?? '')
                setMobileNumber(initialData.mobile_number ?? '')
                setEmail(initialData.email ?? '')
                setLocation(initialData.location ?? '')
                setAddress(initialData.address ?? '')
            } else {
                setVendorId('')
                setVendorName('')
                setMobileNumber('')
                setEmail('')
                setLocation('')
                setAddress('')
            }
            setError(null)
            setErrors({})
        }
    }, [open, initialData])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        // Manual Validation
        const newErrors = {}
        if (!vendorId.trim()) newErrors.vendor_id = true
        if (!vendorName.trim()) newErrors.vendor_name = true
        if (!mobileNumber.trim()) newErrors.mobile_number = true
        if (!email.trim()) newErrors.email = true
        if (!address.trim()) newErrors.address = true

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            setError('Please fill in all mandatory fields highlighted in red.')
            return
        }

        setSaving(true)
        try {
            const payload = {
                vendor_id: vendorId.trim(),
                vendor_name: vendorName.trim(),
                mobile_number: mobileNumber.trim(),
                email: email.trim(),
                location: location.trim(),
                address: address.trim(),
            }
            if (isEdit) {
                await updateVendor(initialData.id, payload)
            } else {
                await createVendor(payload)
            }
            onSuccess?.()
            onClose()
        } catch (err) {
            let msg = err.message || 'Failed to save vendor.'
            if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('unique')) {
                msg = 'Email or Mobile Number already exists for another vendor.'
            }
            setError(msg)
        } finally {
            setSaving(false)
        }
    }

    if (!open) return null

    return (
        <div className="add-material-overlay" onClick={onClose} role="dialog">
            <div className="add-material-modal" onClick={(e) => e.stopPropagation()}>
                <div className="add-material-header">
                    <h3>{isEdit ? 'Edit Vendor' : 'Add Vendor'}</h3>
                    <button type="button" className="add-material-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="add-material-form">
                    {error && <p className="add-material-error">{error}</p>}
                    
                    <div className="form-grid-row">
                        <div className="input-group">
                            <label>Vendor ID <span className="required-star">*</span></label>
                            <input
                                type="text"
                                value={vendorId}
                                onChange={(e) => setVendorId(e.target.value)}
                                className={errors.vendor_id ? 'field-error' : ''}
                                placeholder="e.g. V-101"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="input-group grow-2">
                            <label>Vendor Name <span className="required-star">*</span></label>
                            <input
                                type="text"
                                value={vendorName}
                                onChange={(e) => setVendorName(e.target.value)}
                                className={errors.vendor_name ? 'field-error' : ''}
                                placeholder="Company name"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-grid-row">
                        <div className="input-group">
                            <label>Mobile Number <span className="required-star">*</span></label>
                            <input
                                type="text"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                className={errors.mobile_number ? 'field-error' : ''}
                                placeholder="e.g. +91 9876543210"
                                minLength={10}
                                maxLength={10}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Email <span className="required-star">*</span></label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={errors.email ? 'field-error' : ''}
                                placeholder="contact@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Location <span className="required-star">*</span></label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City, State"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Full Address <span className="required-star">*</span></label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className={errors.address ? 'field-error' : ''}
                            placeholder="Office address, Building, Street..."
                            rows={3}
                            required
                        />
                    </div>

                    <div className="add-material-actions">
                        <button type="button" className="add-material-btn secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="add-material-btn primary" disabled={saving}>
                            {saving ? 'Saving...' : (isEdit ? 'Update Vendor' : 'Create Vendor')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
