import { ensureCsrfCookie, csrfHeaders } from './http'
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api'

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
  const res = await fetch(url, { credentials: 'include' })
  return handleResponse(res)
}

export async function uploadBOMFile(file) {
  await ensureCsrfCookie()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/bom/upload/`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...csrfHeaders() },
    body: form,
  })
  return handleResponse(res)
}

export async function createBOMRecord({ part, size, grade_name, length_area, material, quantity, date_of_requirement, part_number }) {
  await ensureCsrfCookie()
  const res = await fetch(`${API_BASE}/bom/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ part, size, grade_name, length_area, part_number, material, quantity, date_of_requirement }),
  })
  return handleResponse(res)
}

export async function updateBOMRecord(id, { part, size, grade_name, length_area, material, quantity, date_of_requirement, part_number }) {
  await ensureCsrfCookie()
  const res = await fetch(`${API_BASE}/bom/${id}/`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ part, size, grade_name, length_area, part_number, material, quantity, date_of_requirement }),
  })
  return handleResponse(res)
}

export async function deleteBOMRecord(id) {
  await ensureCsrfCookie()
  const res = await fetch(`${API_BASE}/bom/${id}/`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...csrfHeaders() },
  })
  if (res.status === 204) return
  return handleResponse(res)
}

export async function bulkCreateBOM(items, projectId = null) {
  await ensureCsrfCookie()
  const res = await fetch(`${API_BASE}/bom/bulk-create/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ items, project_id: projectId }),
  })
  return handleResponse(res)
}
export async function fetchPartMaster(query) {
  const res = await fetch(`${API_BASE}/part-master/?q=${encodeURIComponent(query)}`, { credentials: 'include' })
  return handleResponse(res)
}
