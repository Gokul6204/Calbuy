const API_BASE = '/api'

async function handleResponse(res) {
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(text || res.statusText || 'Request failed')
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.detail || res.statusText)
  }
  return data
}

export async function fetchBOMList(params = {}) {
  const q = new URLSearchParams(params).toString()
  const url = `${API_BASE}/bom/${q ? `?${q}` : ''}`
  const res = await fetch(url)
  return handleResponse(res)
}

export async function uploadBOMFile(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/bom/upload/`, {
    method: 'POST',
    body: form,
  })
  return handleResponse(res)
}

export async function createBOMRecord({ bom_id, material, quantity, date_of_requirement }) {
  const res = await fetch(`${API_BASE}/bom/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bom_id, material, quantity, date_of_requirement }),
  })
  return handleResponse(res)
}

export async function updateBOMRecord(id, { bom_id, material, quantity, date_of_requirement }) {
  const res = await fetch(`${API_BASE}/bom/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bom_id, material, quantity, date_of_requirement }),
  })
  return handleResponse(res)
}

export async function deleteBOMRecord(id) {
  const res = await fetch(`${API_BASE}/bom/${id}/`, { method: 'DELETE' })
  if (res.status === 204) return
  return handleResponse(res)
}

export async function bulkCreateBOM(items, projectId = null) {
  const res = await fetch(`${API_BASE}/bom/bulk-create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, project_id: projectId }),
  })
  return handleResponse(res)
}
