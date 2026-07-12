import type { User, Hazard, NewHazard, HazardStats, Route } from '../types'

async function apiRequest(path:string, options: RequestInit = {}) {
    // includes credential cuz authentication uses http only cookie
    const response = await fetch(path, {
        credentials: 'include',
        ...options,
        headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        }
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`)
    }

    return data
}

export const authApi = {
    me: () => apiRequest('/api/auth/me'),

    login: (credentials: { email: string; password: string}) =>
        apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),

    register: (details: {name: string; email: string; password: string}) =>
        apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(details),
    }),

    logout: () =>
        apiRequest('/api/auth/logout', {
        method: 'POST',
    }),
}

export const hazardApi = {
    list: () => apiRequest('/api/hazards'),

    stats: () => apiRequest('/api/hazards/stats'),

    create: (hazard: NewHazard) =>
        apiRequest('/api/hazards', {
        method: 'POST',
        body: JSON.stringify(hazard),
    }),

    update: (hazardId: number, hazard: Partial<NewHazard>) =>
        apiRequest(`/api/hazards/${hazardId}`, {
        method: 'PATCH',
        body: JSON.stringify(hazard),
    }),

    remove: (hazardId: number) =>
        apiRequest(`/api/hazards/${hazardId}`, {
        method: 'DELETE',
    }),
}

export const routeApi = {
    list: () => apiRequest('/api/routes'),
}