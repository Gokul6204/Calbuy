import { useState, useRef, useEffect } from 'react'
import { uploadBOMFile } from '../api/bom'
import { FaCloudUploadAlt } from 'react-icons/fa'
import './BOMUpload.css'

const ACCEPT = '.xlsx,.xls,.csv,.pdf,.kss'

export function BOMUpload({ onSuccess, folderUploadSignal = 0 }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const inputRef = useRef(null)
  const folderInputRef = useRef(null)

  const handleChange = (e) => {
    const chosen = Array.from(e.target.files || [])
    setFiles(chosen)
    setResults([])
    setError(null)
    setProgress({ current: 0, total: 0 })
  }

  // Trigger folder picker from parent "Upload Folder" button.
  useEffect(() => {
    if (folderUploadSignal > 0 && folderInputRef.current) {
      folderInputRef.current.click()
    }
  }, [folderUploadSignal])

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
      let allNewRows = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const res = await uploadBOMFile(file)
          const newRows = res.rows || []
          allNewRows = [...allNewRows, ...newRows]
          uploadResults.push({ name: file.name, status: 'success', msg: `Parsed ${newRows.length} lines.` })
        } catch (err) {
          uploadResults.push({ name: file.name, status: 'error', msg: err.message || 'Upload failed' })
        }
        setProgress(prev => ({ ...prev, current: i + 1 }))
      }
      setResults(uploadResults)
      setFiles([])
      if (inputRef.current) inputRef.current.value = ''
      onSuccess?.(allNewRows)
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
            aria-label="Choose BOM files"
            multiple
          />
          <input
            ref={folderInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleChange}
            style={{ display: 'none' }}
            multiple
            webkitdirectory="true"
            directory="true"
          />
        </div>
        <div className="bom-upload-btn-row">
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
          <button 
            type="button"
            className="bom-upload-btn secondary" 
            onClick={() => { setFiles([]); if(inputRef.current) inputRef.current.value=''; }}
            disabled={files.length === 0 && !uploading}
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="bom-upload-hint">
        <span>Formats: XLSX, XLS, CSV, PDF, KSS. Upload files or folder.</span>
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
