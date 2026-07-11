import { Router, Request, Response } from 'express';

const stationRouter = Router();


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


stationRouter.get('/', async (req: Request, res: Response) => {

});

export default stationRouter;