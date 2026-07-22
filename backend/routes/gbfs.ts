import { Router, Request, Response } from 'express';

const gbfsRouter = Router();


// auto discovery link Lime Vancouver: https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/gbfs.json

// {"last_updated":1783796586,"ttl":0,"version":"2.2","data":{"en":{"feeds":
// [{"name":"system_information","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/system_information"},
// {"name":"station_information","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_information"},
// {"name":"station_status","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_status"},
// {"name":"free_bike_status","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/free_bike_status"},
// {"name":"vehicle_types","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/vehicle_types"}]}}}

// auto discovery link Mobi Bike Share Vancouver: https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/gbfs.json

// {"last_updated":1783796719,"ttl":60,"version":"2.2","data":{"en":{"feeds":
// [{"name":"gbfs","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/gbfs.json"},
// {"name":"system_information","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/system_information.json"},
// {"name":"station_status","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/station_status.json"},
// {"name":"station_information","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/station_information.json"},
// {"name":"vehicle_types","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/vehicle_types.json"},
// {"name":"free_bike_status","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/free_bike_status.json"},
// {"name":"system_pricing_plans","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/system_pricing_plans.json"},
// {"name":"geofencing_zones","url":"https://gbfs.kappa.fifteen.eu/gbfs/2.2/mobi/en/geofencing_zones.json"}]}}}

interface RawStationInfo {
    station_id: string;
    name: string;
    lat: number;
    lon: number;
}

interface VehicleTypeAvailable {
    vehicle_type_id: string;
    count: number;
}

interface VehicleDockAvailable {
    vehicle_type_ids: string[];
    count: number;
}

interface RawStationStatus {
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

// 3. Free Bike Status
interface RawFreeBike {
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

// 4. Vehicle Types
// interface VehicleType {
//   vehicle_type_id: string;
//   form_factor: 'scooter' | 'bicycle' | string;
//   propulsion_type: 'electric' | 'electric_assist' | 'human' | string;
//   max_range_meters: number;
// }

// cleaned Types
interface CleanStation {
    station_id: string;
    name: string;
    lat: number;
    lon: number;
    num_vehicles_available: number;
    vehicle_types_available: VehicleTypeAvailable[];
    num_docks_available: number;
    vehicle_docks_available: VehicleDockAvailable[];
}

interface CleanFreeBikes {
    bike_id: string;
    lat: number;
    lon: number;
    is_reserved: boolean;
    is_disabled: boolean;
    vehicle_type: string;
}

// --- 1. STATIONS ENDPOINT (Info + Status joined) ---
gbfsRouter.get('/lime/stations', async (req: Request, res: Response) => {
    try {
        const infoRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_information");
        const statusRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_status");

        const infoData = await infoRes.json();
        const statusData = await statusRes.json();

        // Index station status by ID for O(1) lookups
        const statusMap = new Map<string, RawStationStatus>();
        statusData.data.stations.forEach((status: RawStationStatus) => {
            statusMap.set(status.station_id, status);
        });

        // Construct the CleanStation array
        const cleanStations: CleanStation[] = infoData.data.stations.map((info: RawStationInfo): CleanStation => {
            const status = statusMap.get(info.station_id);
            
            return {
                station_id: info.station_id,
                name: info.name,
                lat: info.lat,
                lon: info.lon,
                num_vehicles_available: status ? status.num_vehicles_available : 0,
                vehicle_types_available: status ? status.vehicle_types_available : [],
                num_docks_available: status ? status.num_docks_available : 0,
                vehicle_docks_available: status ? status.vehicle_docks_available: []
            };
        });

        // Return the clean array
        return res.status(200).json(cleanStations);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stations' });
    }
});

// --- 2. VEHICLES ENDPOINT (Free floating bikes/scooters) ---
gbfsRouter.get('/lime/freeBikes', async (req: Request, res: Response) => {
    try {
        const freeBikesRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/free_bike_status");
        const freeBikesData = await freeBikesRes.json();

        const cleanBikes: CleanFreeBikes[] = freeBikesData.data.bikes.map((bike: RawFreeBike) => ({
            bike_id: bike.bike_id,
            lat: bike.lat,
            lon: bike.lon,
            is_reserved: bike.is_reserved,
            is_disabled: bike.is_disabled,
            vehicle_type: bike.vehicle_type,
        }));

        return res.json(cleanBikes);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
});

export default gbfsRouter;