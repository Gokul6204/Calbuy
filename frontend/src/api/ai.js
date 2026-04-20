const API_BASE = '/api/ai'

async function handleResponse(res) {
    const text = await res.text()
    let data
    try {
        data = text ? JSON.parse(text) : null
    } catch {
        throw new Error(text || res.statusText || 'Request failed')
    }
    if (!res.ok) {
        let errorMessage = 'AI Service Error'
        if (data) {
            errorMessage = data.error || data.detail || JSON.stringify(data)
        } else {
            errorMessage = `Server error ${res.status}: ${res.statusText}`
        }
        throw new Error(errorMessage)
    }
    return data
}

export async function rankVendors(projectId, bomItemId, weights = {}) {
    let url = `${API_BASE}/rank/?project_id=${projectId}&bom_item_id=${bomItemId}`
    if (weights.price_weight) url += `&price_weight=${weights.price_weight}`
    if (weights.lead_time_weight) url += `&lead_time_weight=${weights.lead_time_weight}`
    if (weights.distance_weight) url += `&distance_weight=${weights.distance_weight}`
    
    const res = await fetch(url)
    return handleResponse(res)
}

export async function trainModel() {
    const res = await fetch(`${API_BASE}/train/`, { method: 'POST' })
    return handleResponse(res)
}

export async function confirmVendor(projectId, bomItemId, quotationId) {
    const res = await fetch(`${API_BASE}/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, bom_item_id: bomItemId, quotation_id: quotationId })
    })
    return handleResponse(res)
}
