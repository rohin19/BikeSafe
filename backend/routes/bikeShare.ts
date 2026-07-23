import { Router, Request, Response } from 'express';
import type { RawStationInfo, RawStationStatus, RawFreeBike, VehicleType, CleanStation, CleanFreeBike  } from '../types/bikeShareTypes';

const bikeShareRouter = Router();


// auto discovery link Lime Vancouver: https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/gbfs.json

// {"last_updated":1783796586,"ttl":0,"version":"2.2","data":{"en":{"feeds":
// [{"name":"system_information","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/system_information"},
// {"name":"station_information","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_information"},
// {"name":"station_status","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_status"},
// {"name":"free_bike_status","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/free_bike_status"},
// {"name":"vehicle_types","url":"https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/vehicle_types"}]}}}




// --- 1. STATIONS ENDPOINT (Info + Status joined) ---
bikeShareRouter.get('/lime/stations', async (req: Request, res: Response) => {
    try {
        const north = parseFloat(req.query.north as string);
        const south = parseFloat(req.query.south as string);
        const east = parseFloat(req.query.east as string);
        const west = parseFloat(req.query.west as string);

        if (isNaN(north) || isNaN(south) || isNaN(west) || isNaN(east)) {
            return res.status(400).json({ error: "Invalid bounding box parameters"});
        }

        const infoRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_information");
        const statusRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_status");
        const vehicleTypeRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/vehicle_types");

        const infoData = await infoRes.json();
        const statusData = await statusRes.json();
        const vehicleTypeData = await vehicleTypeRes.json();

        const stationsInfo: RawStationInfo[] = infoData.data.stations;
        const stationsStatus: RawStationStatus[] = statusData.data.stations;
        const vehicleTypes: VehicleType[] = vehicleTypeData.data.vehicle_types;

        const filteredStationsInfo = stationsInfo.filter((Info) => 
            Info.lat >= south &&
            Info.lat <= north &&
            Info.lon >= west &&
            Info.lon <= east
        ) 
        
        const statusMap = new Map<string, RawStationStatus>();
        stationsStatus.forEach((status: RawStationStatus) => {
            statusMap.set(status.station_id, status);
        });

        const vehicleTypeMap = new Map<string, string>();
        vehicleTypes.forEach((vehicle_type: VehicleType) => {
            vehicleTypeMap.set(vehicle_type.vehicle_type_id, vehicle_type.form_factor);
        });

        const cleanStations: CleanStation[] = filteredStationsInfo.map((info: RawStationInfo): CleanStation => {
            const status = statusMap.get(info.station_id);

            let vehicle_type = "Unknown";
            if (status && status.vehicle_types_available.length > 0) {
                vehicle_type = vehicleTypeMap.get(status.vehicle_types_available[0].vehicle_type_id) ?? "Unknown";
            }
            
            return {
                station_id: info.station_id,
                name: info.name,
                lat: info.lat,
                lon: info.lon,
                num_vehicles_available: status ? status.num_vehicles_available : 0,
                vehicle_type_available: vehicle_type,
                num_docks_available: status ? status.num_docks_available : 0,
            };
        });

        return res.status(200).json(cleanStations);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stations' });
    }
});

// --- 2. VEHICLES ENDPOINT (Free floating bikes/scooters) ---
bikeShareRouter.get('/lime/freeBikes', async (req: Request, res: Response) => {
    try {
        const north = parseFloat(req.query.north as string);
        const south = parseFloat(req.query.south as string);
        const east = parseFloat(req.query.east as string);
        const west = parseFloat(req.query.west as string);

        if (isNaN(north) || isNaN(south) || isNaN(west) || isNaN(east)) {
            return res.status(400).json({ error: "Invalid bounding box parameters"});
        }

        const freeBikesRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/free_bike_status");
        const freeBikesData = await freeBikesRes.json();

        const freeBikes: RawFreeBike[] = freeBikesData.data.bikes;
        const filteredfreeBikes = freeBikes.filter((freeBike) => 
            freeBike.lat >= south &&
            freeBike.lat <= north &&
            freeBike.lon >= west &&
            freeBike.lon <= east
        ) 

        const cleanBikes: CleanFreeBike[] = filteredfreeBikes.map((bike: RawFreeBike) => ({
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

export default bikeShareRouter;