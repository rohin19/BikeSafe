import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { ORSDirectionsFeature } from '../types/orsTypes';
import requireAuth from '../middleware/requireAuth';

const routesRouter = Router();

// --- GET REQUESTS
// GET /api/routes - return ALL routes, could be used for admin
routesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM routes');
    return res.status(200).json(result.rows);
  } catch (e) {
    console.error(`Error fetching routes: ${e}`);
    return res.status(500).json({ error: "Failed to fetch routes" });
  }
});

// GET api/routes/mine - return only the logged-in user's routes
routesRouter.get("/mine", requireAuth, async(req: Request, res: Response) => {
    try {
        const userId = req.user!.user_id; // req.user is from requireAuth.ts, it's a custom key of the req obj that is accessible by any route; the ! is non-null assertion guaranteeing to TS compiler the value is not null/undefined
        const result = await pool.query('SELECT * FROM routes WHERE created_by = $1', [userId]);
        return res.status(200).json(result.rows);
    } catch (e) {
        console.error(`Error fetching routes: ${e}`);
        return res.status(500).json({ error: 'Failed to fetch your routes' });
    }
})

// GET /api/routes/:id - get specific route
routesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const routeID = req.params.id;
    const result = await pool.query(
      "SELECT * FROM routes WHERE route_id = $1",
      [routeID],
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Route not found' });
    }

    return res.status(200).json(result.rows);
  } catch (e) {
    console.error(`Error fetching routes: ${e}`);
    return res.status(500).json({ error: "Failed to fetch route by id" });
  }
});

// -- POST REQ
// POST /api/routes - create a new route
routesRouter.post('/', async(req:Request, res: Response) => {
    try {
        const {
            start_name, start_latitude, start_longitude, destination_name, destination_latitude, destination_longitude, elevation, distance, duration, safety_score, created_by
        } = req.body;

        const createdBy = Number(created_by);
        if (isNaN(createdBy)){
            return res.status(400).json({ error: 'created_by must be a valid user id' });
        }

        const result = await pool.query(
            `
            INSERT INTO routes (
            start_name, start_latitude, start_longitude, destination_name, destination_latitude, destination_longitude, elevation, distance, duration, safety_score, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            `,
            [start_name, start_latitude, start_longitude, destination_name, destination_latitude, destination_longitude, elevation, distance, duration, safety_score, createdBy]
        );
        // the RETURNING * gives us the entire row we just inserted
        
        return res.status(200).json(result.rows);
    } catch (e) {
        console.error(`Error fetching routes: ${e}`);
        return res.status(500).json({error: 'Failed to add new route'});
    }
}); 

// ---- Safety score helpers ----
const HAZARD_PROXIMITY_METERS = 50;

// haversine formula: shortest distance between between two lat/lon points on a sphere, in meters (no, i did not come up with this function)
function haversineDistanceMeters(lat1: number, lon1:number, lat2:number, lon2:number):number {

    function toRad(deg: number): number {
        return (deg * Math.PI) / 180;
    }

    const R = 6371000; // earth radius in meters
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = 
        Math.sin(dLat/2) ** 2 + 
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// shortest distance from a point to any point along the route path
function minDistanceToPath(lat: number, lon: number, path: {lat: number; lon:number}[]): number {
    let min = Infinity;
    for (const point of path) {
        const dist = haversineDistanceMeters(lat, lon, point.lat, point.lon);
        if (dist < min) min = dist;
    }
    return min;
}

// simple heuristic: start at 100, dock points for each hazard within HAZARD_PROXIMITY_METERES of the path, weighted by severity
async function computeSafetyScore(path: { lat:number; lon:number; }[]): Promise<number> {
    const result = await pool.query('SELECT latitude, longitude, severity FROM hazards');

    let penalty = 0;

    for (const hazard of result.rows) {
        const dist = minDistanceToPath(hazard.latitude, hazard.longitude, path);
        if (dist <= HAZARD_PROXIMITY_METERS) {
            penalty += hazard.severity * 5;
        }
    }

    return Math.max(0, Math.min(100, 100 - penalty));

}


// POST /api/routes/directions - compute a cycling route (path, distance, duration) between two points via ORS + safety score! 
// body needs { "start": {"lat": ####, "lon": ###}, "end": {....}}
routesRouter.post("/directions", async (req: Request, res: Response) => {
    try {
        const { start, end } = req.body; // each is {lat, lon}

        const startLat = Number(start?.lat);
        const startLon = Number(start?.lon);
        const endLat = Number(end?.lat);
        const endLon = Number(end?.lon);

        if ([startLat, startLon, endLat, endLon].some(isNaN)) {
            return res.status(400).json({ error: 'start and end must each include valid lat/lon' });
        }

        const orsRes = await fetch('https://api.openrouteservice.org/v2/directions/cycling-regular/geojson', {
            method: 'POST',
            headers: {
                'Authorization': process.env.ORS_API_KEY as string,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [
                    [startLon, startLat], // ORS takes its coord pair as lon/lat (different from our api's lon/lat convention)
                    [endLon, endLat],
                ],
                elevation: true,
            }),
        });

        const orsData = await orsRes.json();
        const feature = orsData.features[0] as ORSDirectionsFeature;

        const path = (feature.geometry.coordinates).map(([lon, lat]) => ({ lat, lon }));
        const elevation = feature.properties.ascent ?? 0;
        const safetyScore = await computeSafetyScore(path);

        return res.status(200).json({
            path, // an array of {lat, lon} objects representing the path
            distance: feature.properties.summary.distance,
            duration: feature.properties.summary.duration,
            safetyScore,
            elevation
        });

    } catch (e) {
      console.error(`Error computing directions: ${e}`);
      return res.status(500).json({ error: "Failed to compute directions (OpenRouteService API Error)" });
    }
  },
);

// DELETE /api/routes/:id - delete a route, only if it belongs to the logged-in user
routesRouter.delete('/:id', requireAuth, async(req: Request, res: Response) => {
    try{
        const routeID = req.params.id;
        const result = await pool.query(
            `DELETE FROM routes WHERE route_id = $1 AND created_by = $2 RETURNING *`, [routeID, req.user!.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (e) {
        console.error(`Error deleting route: ${e}`);
        return res.status(500).json({ error: 'Failed to delete route' });
    }
})

export default routesRouter;