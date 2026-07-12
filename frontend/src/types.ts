// interfaces to mirror backend's Hazard/User/Route models 

// we leave out the hashed_password here since api doesn't return it
export interface User {
    user_id: number
    name: string
    email: string
    role?: 'admin' | 'user'
}

export interface Hazard {
    hazard_id: number
    user_id: number
    title: string
    description: string
    category: string
    current_status: 'reported' | 'in_progress' | 'resolved'
    severity: number
    latitude: number
    longitude: number
    image_url?: string
    created_at: string
}

export interface NewHazard {
    user_id: number
    title: string
    description: string
    category: string
    severity: number
    latitude: number
    longitude: number
    image_url?: string
}

export interface CategoryCount {
    category: string
    count: string
}

export interface StatusCount {
  current_status: string
  count: string
}

export interface HazardStats {
  totalHazards: { totalhazards: string }[]
  categories: CategoryCount[]
  statuses: StatusCount[]
}

export interface Route {
  route_id?: number
  start_name: string
  start_latitude: number
  start_longitude: number
  destination_name: string
  destination_latitude: number
  destination_longitude: number
  elevation: number
  distance: number
  duration: number
  safety_score: number
  created_at?: string
  created_by: number
}