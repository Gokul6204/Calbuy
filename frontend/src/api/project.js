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

export async function fetchProjects() {
    const res = await fetch(`${API_BASE}/projects/`, { credentials: 'include' })
    return handleResponse(res)
}

export async function createProject(projectData) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/projects/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(projectData),
    })
    return handleResponse(res)
}

export async function deleteProject(id) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/projects/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...csrfHeaders() },
    })
    if (res.status === 204) return
    return handleResponse(res)
}

export async function updateProject(id, projectData) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/projects/${id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(projectData),
    })
    return handleResponse(res)
}

export async function fetchProjectQuotations(projectId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/quotations/`, { credentials: 'include' })
    return handleResponse(res)
}

export async function issuePO(projectId, vendorId, pdfContent = null) {
    await ensureCsrfCookie()
    const res = await fetch(`${API_BASE}/projects/${projectId}/issue-po/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ 
            vendor_id: vendorId,
            pdf_content: pdfContent 
        }),
    })
    return handleResponse(res)
}
