import type { User, Hazard, NewHazard, HazardStats, Route, NewReview, ReviewFilters, UpdateReview } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function apiRequest(path:string, options: RequestInit = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`

    // includes credential cuz authentication uses http only cookie
    const response = await fetch(url, {
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
    mine: () => apiRequest('/api/routes/mine'),
    directions: (
        start: { lat:number; lon: number }, end: { lat:number; lon: number }
    ) => apiRequest('/api/routes/directions', {
            method: 'POST',
            body: JSON.stringify({ start, end }),
    }),
    create: (route: {
        start_name: string; start_latitude: number; start_longitude: number; destination_name: string; destination_latitude:number; destination_longitude: number; elevation: number; distance: number; duration: number; safety_score: number; created_by: number;
    }) => apiRequest('/api/routes', {
        method: 'POST',
        body: JSON.stringify(route),
    }),
    remove: (routeId: number) => apiRequest(`/api/routes/${routeId}`, {
        method: 'DELETE'
    }),
}

export const geocodeApi = {
    search: (query:string) => apiRequest(`/api/routes/geocode/search?q=${encodeURIComponent(query)}`),
    reverse: (lat:number, lon:number) => apiRequest(`/api/routes/geocode/reverse?lat=${lat}&lon=${lon}`),
}

export const bikeShareApi = {
    stations: (queryParams: string) => apiRequest(`/api/bikeShare/lime/stations?${queryParams}`),
    freeBikes: (queryParams: string) => apiRequest(`/api/bikeShare/lime/freeBikes?${queryParams}`),
}

export const reviewApi = {
  list: (filters: ReviewFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search?.trim()) { params.set('search', filters.search.trim()); }
    if (filters.mine) { params.set('mine', 'true'); }
    if (filters.routeId) { params.set('route_id', String(filters.routeId)); }
    const query = params.toString();
    return apiRequest(`/api/reviews${query ? `?${query}` : ''}`);
  },
  get: (reviewId: number) => apiRequest(`/api/reviews/${reviewId}`),
  create: (review: NewReview) => apiRequest('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(review)
    }
  ),
  update: (reviewId: number, review: UpdateReview) => apiRequest(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify(review)
    }
  ),
  remove: (reviewId: number) => apiRequest(`/api/reviews/${reviewId}`, { method: 'DELETE' })
};

export const adminApi = {
    listUsers: async (): Promise<User[]> => {
        const res = await fetch('api/admin/users', {credentials: 'include'});
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    deleteUser: async (userID: number): Promise<void> => {
        const res = await fetch(`api/admin/users/${userID}`, {method: 'DELETE', credentials: 'include'});
        if (!res.ok) throw new Error('Failed to delete user');
    },

    updateRole: async (userId: number, role: string): Promise<User> => {
        const res = await fetch(`/api/admin/users/${userId}/role`, {method: 'PATCH', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to update Role');
    return res.json();
    }
};
