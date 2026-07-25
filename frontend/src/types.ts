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

export interface HazardCardProps {
    hazard: Hazard
    isAdmin: boolean
    onDelete: (hazardId: number) => void
    deleting: boolean
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
  route_id?: number;
  start_name: string;
  start_latitude: number;
  start_longitude: number;
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
  elevation: number;
  distance: number;
  duration: number;
  safety_score: number;
  created_at?: string;
  created_by: number;
}

export interface AuthPanelProps {
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export interface ProfilePageProps {
      user: User
      onUserChange: (user: User | null) => void
  }

export interface CleanStation {
    station_id: string;
    name: string;
    lat: number;
    lon: number;
    num_vehicles_available: number;
    vehicle_type_available: string;
    num_docks_available: number;
}

export interface CleanFreeBike {
    bike_id: string;
    lat: number;
    lon: number;
    is_reserved: boolean;
    is_disabled: boolean;
    vehicle_type: string;
}

export interface StationPopupProps {
    station: CleanStation
}

export interface FreeBikesPopupProps {
    freeBike: CleanFreeBike
}

export interface hazardPopupProps {
    hazard: Hazard
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RoutePoint {
    lat: number;
    lon: number;
    label: string;
}

export interface RouteDisplay {
    start: RoutePoint;
    destination: RoutePoint;
    path: {
        lat: number; 
        lon: number;
    }[];
}

export interface MapProps {
    stations?: CleanStation[];
    freeBikes?: CleanFreeBike[];
    onBoundsChange?: (bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    }) => void;
    hazards?: Hazard[];
    route?: RouteDisplay | null;
    onMapClick?: (lat:number, lon:number) => void;
}

