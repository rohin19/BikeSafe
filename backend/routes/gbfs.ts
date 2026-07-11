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

interface StationInfo {
    station_id: string;
    name: string;
    lat: number;
    lon: number;
}

interface StationStatus {
    station_id: string;
    num_vehicles_available: number;
    num_docks_available: number;
    is_renting: boolean;
}

interface FreeBike {
    bike_id: string;
    lat: number;
    lon: number;
    vehicle_type: string;
    current_range_meters: number;
}


gbfsRouter.get('/lime', async (req: Request, res: Response) => {
    try {

        const infoRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_information");
        const statusRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/station_status");
        const freeBikesRes = await fetch("https://data.lime.bike/api/partners/v2/gbfs/vancouver_bc/free_bike_status");

        const infoData = await infoRes.json();
        const statusData = await statusRes.json();
        const freeBikesData = await freeBikesRes.json();

        // Index station status by ID for O(1) lookups
        const statusMap = new Map<string, StationStatus>();
        statusData.data.stations.forEach((status: StationStatus) => {
            statusMap.set(status.station_id, status);
        });

        // Construct GeoJSON Features
        const features: any[] = [];

        // Add Stations
        infoData.data.stations.forEach((info: StationInfo) => {
            const status = statusMap.get(info.station_id);
            
            features.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [info.lon, info.lat] 
                },
                properties: {
                    type: "station",
                    id: info.station_id,
                    name: info.name,
                    bikesAvailable: status ? status.num_vehicles_available : 0,
                    docksAvailable: status ? status.num_docks_available : 0,
                    isRenting: status ? status.is_renting : false
                }
            });
        });

        // Add Free-floating Vehicles (Scooters/E-bikes parked on the street)
        freeBikesData.data.bikes.forEach((bike: FreeBike) => {
            features.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [bike.lon, bike.lat]
                },
                properties: {
                    type: "free_vehicle",
                    id: bike.bike_id,
                    name: `Lime ${bike.vehicle_type}`,
                    vehicleType: bike.vehicle_type,
                    rangeMeters: bike.current_range_meters
                }
            });
        });

        // 4. Return unified GeoJSON FeatureCollection
        return res.json({
            type: "FeatureCollection",
            features: features
        });

    } catch (error) {
        console.error('Error fetching bike share data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default gbfsRouter;