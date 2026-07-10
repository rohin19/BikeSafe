import { Router } from 'express';
import { pool } from '../db';
import type { Hazard } from '../types/hazard';

const hazardsRouter = Router();

// api/hazards routes

// GET /api/hazards - return all hazards
hazardsRouter.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM hazards');
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching hazards: ', err);
        return res.status(500).json({error: 'Failed to fetch hazards'});
    }
});

// POST /api/hazards - create a new hazard
// hazardsRouter.post('/', async (req, res) => {
//     try {
//         const {}
//     }
// });

// DELETE /api/hazards/:id - delete a hazard by id

export default hazardsRouter;