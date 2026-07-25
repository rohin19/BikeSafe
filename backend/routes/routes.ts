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
    console.log(`Error fetching routes: ${e}`);
    return res.status(500).json({ error: "Failed to add new route" });
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
    console.log(`Error fetching routes: ${e}`);
    return res.status(500).json({ error: "Failed to add new route" });
  }
});

// -- POST REQ
// POST /api/routes - create a new route
routesRouter.post('/', async(req:Request, res: Response) => {
    try {
        const {
            start_name, start_latitude, start_longitude, destination_name, destination_latitude, destination_longitude, elevation, distance, duration, safety_score, created_by
        } = req.body;

        const result = await pool.query(
            `
            INSERT INTO routes (
            start_name, start_latitude, start_longitude, destination_name, destination_latitude, destination_longitude, elevation, distance, duration, safety_score, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            `,
            [start_name, start_latitude, start_longitude, destination_name, destination_latitude, destination_longitude, elevation, distance, duration, safety_score, created_by]
        );
        
        return res.status(200).json(result.rows);
    } catch (e) {
        console.log(`Error fetching routes: ${e}`);
        return res.status(500).json({error: 'Failed to add new route'});
    }
}); 




export default routesRouter;