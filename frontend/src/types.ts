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

export interface MapProps {
    stations?: CleanStation[];
    freeBikes?: CleanFreeBike[];
    onBoundsChange?: (bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    }) => void;
    harzards?: Hazard[];
}

// The detail of the review
export interface RouteReviewEntry {
  review_id: number;
  route_log_id: number;
  user_id: number;
  user_name: string;

  overall_rating: number;
  safety_rating: number;
  difficulty_rating: number;

  comments?: string | null;

  created_at: string;
  updated_at: string;
}

// The details of the log itself
export interface RouteLogSummary {
  route_log_id: number;
  user_id: number;

  planned_route_id: number | null;

  start_name: string;
  destination_name: string;

  elevation: number;
  distance: number;
  duration: number;

  street_names: string[];

  completed_at: string;
  created_at: string;

  logged_by_name: string;

  average_overall_rating: number;
  average_safety_rating: number;
  average_difficulty_rating: number;

  review_count: number;
}

// List of summaries
export interface RelatedRouteLog extends RouteLogSummary {
  shared_streets: string[];
}

// List of logs
export interface RouteLogDetail extends RouteLogSummary {
  reviews: RouteReviewEntry[];
  related_logs: RelatedRouteLog[];
}

export interface NewRouteReview {
  overall_rating: number;
  safety_rating: number;
  difficulty_rating: number;
  comments?: string;
}

export interface NewRouteLog {
  planned_route_id?: number | null;

  start_name: string;
  destination_name: string;

  elevation: number;
  distance: number;
  duration: number;

  street_names: string[];
  hazard_ids?: number[];

  initial_review: NewRouteReview;
}