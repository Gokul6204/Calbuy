export function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift())
  return null
}

export async function ensureCsrfCookie() {
  await fetch('/api/accounts/csrf/', {
    method: 'GET',
    credentials: 'include',
  })
}

export function csrfHeaders() {
  const token = getCookie('csrftoken')
  return token ? { 'X-CSRFToken': token } : {}
}

