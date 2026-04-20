import { FaEdit, FaTrash, FaInbox } from 'react-icons/fa'
import './BOMTable.css'

export function BOMTable({ data, onEdit, onDelete }) {
  const handleDelete = (row) => {
    if (!window.confirm(`Delete "${row.grade_name || row.material}"?`)) return
    onDelete?.(row)
  }

  if (!data || data.length === 0) {
    return (
      <div className="bom-table-empty">
        <FaInbox size={48} />
        <p>Your Bill of Materials is currently empty.</p>
        <p>Upload a file or add a material manually to get started.</p>
      </div>
    )
  }

  return (
    <div className="bom-table-wrap">
      <table className="bom-table">
        <thead>
          <tr>
            <th>Part</th>
            <th>Size</th>
            <th>Grade</th>
            <th className="bom-table-qty">Quantity</th>
            <th>Quantity Type</th>
            <th>Unit</th>
            <th>Required Date</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id || row.temp_id}>
              <td>{row.formatted_part || row.part || row.part_number || '—'}</td>
              <td>{row.size || '—'}</td>
              <td className="font-semibold">{row.grade_name || row.material || '—'}</td>
              <td className="bom-table-qty">{formatQty(row.quantity ?? row.length_area)}</td>
              <td style={{ textTransform: 'capitalize' }}>{row.quantity_type || '—'}</td>
              <td>{row.unit || '—'}</td>
              <td>{formatDate(row.date_of_requirement)}</td>
              <td>
                <div className="bom-table-actions">
                  <button
                    className="bom-table-btn bom-table-btn-edit"
                    onClick={() => onEdit?.(row)}
                    title="Edit Record"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="bom-table-btn bom-table-btn-delete"
                    onClick={() => handleDelete(row)}
                    title="Delete Record"
                  >
                    <FaTrash />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatQty(val) {
  if (val == null) return '—'
  const n = Number(val)
  return Number.isInteger(n) ? n : Number(n).toFixed(2)
}

function formatDate(str) {
  if (!str) return '—'
  try {
    const d = new Date(str)
    return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return str
  }
}
