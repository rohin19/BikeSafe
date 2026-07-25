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
            [start_name, start_latitude, start_longitude, destination_name, destination_latitude, destination_longitude, elevation, distance, duration, safety_score, created_by]
        );
        // the RETURNING * gives us the entire row we just inserted
        
        return res.status(200).json(result.rows);
    } catch (e) {
        console.error(`Error fetching routes: ${e}`);
        return res.status(500).json({error: 'Failed to add new route'});
    }
}); 




export default routesRouter;