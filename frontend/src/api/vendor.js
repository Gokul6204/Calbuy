import { ensureCsrfCookie, csrfHeaders } from './http'
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
        let errorMessage = 'Request failed'
        if (data) {
            errorMessage = data.error || data.detail || JSON.stringify(data)
        } else {
            errorMessage = `Server error ${res.status}: ${res.statusText}`
        }
        throw new Error(errorMessage)
    }
    return data
}

export async function fetchVendorList(params = {}) {
    const q = new URLSearchParams(params).toString()
    const url = `${API_BASE}/vendors/${q ? `?${q}` : ''}`
    const res = await fetch(url, { credentials: 'include' })
    return handleResponse(res)
}

export async function createVendor(vendorData) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/vendors/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(vendorData),
    })
    return handleResponse(res)
}

export async function uploadVendorFile(file) {
    await ensureCsrfCookie()
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/vendors/upload/`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...csrfHeaders() },
        body: form,
    })
    return handleResponse(res)
}

export async function updateVendor(id, vendorData) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/vendors/${id}/`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(vendorData),
    })
    return handleResponse(res)
}

export async function deleteVendor(id) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/vendors/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...csrfHeaders() },
    })
    if (res.status === 204) return
    return handleResponse(res)
}

export async function fetchVendorMaterials(vendorId) {
    const res = await fetch(`${API_BASE}/vendors/${vendorId}/materials/`, { credentials: 'include' })
    return handleResponse(res)
}

export async function createVendorMaterial(vendorId, materialData) {
    // materialData can be { material, part_number }
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/vendors/${vendorId}/materials/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(materialData),
    })
    return handleResponse(res)
}

export async function deleteVendorMaterial(id) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/vendor-materials/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...csrfHeaders() },
    })
    if (res.status === 204) return
    return handleResponse(res)
}

export async function matchVendors(payload, location = '') {
    await ensureCsrfCookie()
    // Support either direct list of materials (legacy) or an object with categories/materials
    const body = Array.isArray(payload) ? { materials: payload, location } : { ...payload, location }
    const res = await fetch(`${API_BASE}/vendors/match/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(body),
    })
    return handleResponse(res)
}

export async function sendRfqs(rfqs, projectId) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/vendors/send-rfq/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ rfqs, project_id: projectId }),
    })
    return handleResponse(res)
}

// Vendor Portal APIs
export async function portalLogin(credentials) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/portal/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(credentials),
    })
    return handleResponse(res)
}

export async function fetchPortalItems(projectId, vendorId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/vendors/${vendorId}/items/`, { credentials: 'include' })
    return handleResponse(res)
}

export async function fetchVendorQuotations(projectId, vendorId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/vendors/${vendorId}/quotations/`, { credentials: 'include' })
    return handleResponse(res)
}

export async function submitQuotation(projectId, vendorId, quotationData) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/projects/${projectId}/vendors/${vendorId}/quotations/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(quotationData),
    })
    return handleResponse(res)
}
