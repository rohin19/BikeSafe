import { Router, Request, Response } from 'express';
import { pool } from '../db';

const routesRouter = Router();

// --- GET REQUESTS
// GET /api/routes - return ALL routes
routesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM routes');
    return res.status(200).json(result.rows);
  } catch (e) {
    console.error(`Error fetching routes: ${e}`);
    return res.status(500).json({ error: "Failed to fetch routes" });
  }
});

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

// POST /api/routes/directions - compute a cycling route (path, distance, duration) between two points via ORS
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
            }),
        });

        const orsData = await orsRes.json();
        const feature = orsData.features[0];

        const path = (feature.geometry.coordinates as [number, number][]).map(([lon, lat]) => ({ lat, lon }));

        return res.status(200).json({
            path, // an array of {lat, lon} objects representing the path
            distance: feature.properties.summary.distance,
            duration: feature.properties.summary.duration
        });

    } catch (e) {
      console.error(`Error computing directions: ${e}`);
      return res.status(500).json({ error: "Failed to compute directions (OpenRouteService API Error)" });
    }
  },
);




export default routesRouter;