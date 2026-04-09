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

export async function fetchProjects() {
    const res = await fetch(`${API_BASE}/projects/`)
    return handleResponse(res)
}

export async function createProject(projectData) {
    const res = await fetch(`${API_BASE}/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
    })
    return handleResponse(res)
}

export async function deleteProject(id) {
    const res = await fetch(`${API_BASE}/projects/${id}/`, { method: 'DELETE' })
    if (res.status === 204) return
    return handleResponse(res)
}

export async function updateProject(id, projectData) {
    const res = await fetch(`${API_BASE}/projects/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
    })
    return handleResponse(res)
}

export async function fetchProjectQuotations(projectId) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/quotations/`)
    return handleResponse(res)
}
