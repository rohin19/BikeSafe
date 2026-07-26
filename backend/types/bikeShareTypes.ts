export interface RawStationInfo {
    station_id: string;
    name: string;
    lat: number;
    lon: number;
}

export interface VehicleTypeAvailable {
    vehicle_type_id: string;
    count: number;
}

export interface VehicleDockAvailable {
    vehicle_type_ids: string[];
    count: number;
}

export interface RawStationStatus {
    station_id: string;
    num_vehicles_available: number;
    vehicle_types_available: VehicleTypeAvailable[];
    num_docks_available: number;
    vehicle_docks_available: VehicleDockAvailable[];
    is_installed: boolean;
    is_renting: boolean;
    is_returning: boolean;
    last_reported: number;
}

export interface RawFreeBike {
    bike_id: string;
    lat: number;
    lon: number;
    is_reserved: boolean;
    is_disabled: boolean;
    current_range_meters: number;
    vehicle_type_id: string;
    vehicle_type: string;
    last_reported: number;
}

export interface VehicleType {
  vehicle_type_id: string;
  form_factor: string;
  propulsion_type: string;
  max_range_meters: number;
}

// cleaned Types
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