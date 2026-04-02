import { useState, useRef } from 'react'
import { uploadVendorFile } from '../api/vendor'
import { FaCloudUploadAlt } from 'react-icons/fa'
import './BOMUpload.css' // Reusing the same styling pattern

const ACCEPT = '.xlsx,.xls,.csv,.pdf'

export function VendorUpload({ onSuccess }) {
    const [files, setFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [results, setResults] = useState([])
    const [error, setError] = useState(null)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const inputRef = useRef(null)

    const handleChange = (e) => {
        const chosen = Array.from(e.target.files || [])
        setFiles(chosen)
        setResults([])
        setError(null)
        setProgress({ current: 0, total: 0 })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (files.length === 0) {
            setError('Please select at least one file.')
            return
        }

        setUploading(true)
        setError(null)
        const uploadResults = []
        setProgress({ current: 0, total: files.length })

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                try {
                    const res = await uploadVendorFile(file)
                    uploadResults.push({
                        name: file.name,
                        status: 'success',
                        msg: res.message || 'Imported vendors.'
                    })
                } catch (err) {
                    uploadResults.push({
                        name: file.name,
                        status: 'error',
                        msg: err.message || 'Upload failed'
                    })
                }
                setProgress(prev => ({ ...prev, current: i + 1 }))
            }
            setResults(uploadResults)
            setFiles([])
            if (inputRef.current) inputRef.current.value = ''
            onSuccess?.()
        } catch (err) {
            setError('An unexpected error occurred during batch upload.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <form className="bom-upload" onSubmit={handleSubmit}>
            <div className="bom-upload-row">
                <div className="bom-upload-input-wrap">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPT}
                        onChange={handleChange}
                        disabled={uploading}
                        className="bom-upload-input"
                        aria-label="Choose Vendor files"
                        multiple
                    />
                </div>
                <button
                    type="submit"
                    disabled={files.length === 0 || uploading}
                    className="bom-upload-btn"
                >
                    {uploading ? (
                        <div className="btn-upload-status">
                            <span className="spinner"></span>
                            <span className="upload-count">{progress.current}/{progress.total}</span>
                        </div>
                    ) : (
                        <>
                            <FaCloudUploadAlt /> Upload {files.length > 0 ? `${files.length} Files` : 'Files'}
                        </>
                    )}
                </button>
            </div>

            <div className="bom-upload-hint">
                <span>Formats: XLSX, XLS, CSV, PDF. Multiple files allowed.</span>
            </div>

            {files.length > 0 && (
                <div className="selected-files-list">
                    {files.map((f, i) => (
                        <div key={i} className="selected-file-item">
                            <span className="file-name">{f.name}</span>
                            <span className="file-size">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                    ))}
                </div>
            )}

            {error && <p className="bom-upload-error" role="alert">{error}</p>}

            {results.length > 0 && (
                <div className="upload-results-list">
                    {results.map((res, i) => (
                        <div key={i} className={`result-item ${res.status}`}>
                            <span className="res-name">{res.name}:</span>
                            <span className="res-msg">{res.msg}</span>
                        </div>
                    ))}
                </div>
            )}
        </form>
    )
}
