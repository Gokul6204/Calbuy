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
        throw new Error(data?.error || data?.detail || JSON.stringify(data) || res.statusText)
    }
    return data
}

export async function fetchVendorList(params = {}) {
    const q = new URLSearchParams(params).toString()
    const url = `${API_BASE}/vendors/${q ? `?${q}` : ''}`
    const res = await fetch(url)
    return handleResponse(res)
}

export async function createVendor(vendorData) {
    const res = await fetch(`${API_BASE}/vendors/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData),
    })
    return handleResponse(res)
}

export async function uploadVendorFile(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/vendors/upload/`, {
        method: 'POST',
        body: form,
    })
    return handleResponse(res)
}

export async function updateVendor(id, vendorData) {
    const res = await fetch(`${API_BASE}/vendors/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData),
    })
    return handleResponse(res)
}

export async function deleteVendor(id) {
    const res = await fetch(`${API_BASE}/vendors/${id}/`, { method: 'DELETE' })
    if (res.status === 204) return
    return handleResponse(res)
}

export async function fetchVendorMaterials(vendorId) {
    const res = await fetch(`${API_BASE}/vendors/${vendorId}/materials/`)
    return handleResponse(res)
}

export async function createVendorMaterial(vendorId, material) {
    const res = await fetch(`${API_BASE}/vendors/${vendorId}/materials/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material }),
    })
    return handleResponse(res)
}

export async function deleteVendorMaterial(id) {
    const res = await fetch(`${API_BASE}/vendor-materials/${id}/`, { method: 'DELETE' })
    if (res.status === 204) return
    return handleResponse(res)
}

export async function matchVendors(materials, location = '') {
    const res = await fetch(`${API_BASE}/vendors/match/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials, location }),
    })
    return handleResponse(res)
}

export async function sendRfqs(rfqs) {
    const res = await fetch(`${API_BASE}/vendors/send-rfq/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfqs }),
    })
    return handleResponse(res)
}
