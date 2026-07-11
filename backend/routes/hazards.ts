import { Router } from 'express';
import { pool } from '../db';
// import type { Hazard } from '../types/hazard';

const hazardsRouter = Router();

// api/hazards routes - STILL NEEDS VALIDATION

// ---------- GET REQUESTS ----------

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

// GET /api/hazards/stats - get statistics for a dashboard
hazardsRouter.get('/stats', async (req, res) => {
    try {
        const totalHazards = await pool.query(
            `
            SELECT COUNT(*) as totalHazards
            FROM hazards
            `
        );
        const categories = await pool.query(
            `
            SELECT category, COUNT(*) AS count
            FROM hazards
            GROUP BY category
            ORDER BY count DESC
            `
        );
        const statuses = await pool.query(
            `
            SELECT current_status, COUNT(*) AS count
            FROM hazards
            GROUP BY current_status
            `
        );
        console.log("Successful retrieval of stats")
        return res.status(200).json({
            totalHazards: totalHazards.rows,
            categories: categories.rows,
            statuses: statuses.rows
        });
    } catch (err) {
        console.error('Error getting statistics: ', err)
        return res.status(500).json({error: 'Fail to retrieve stats'})
    }
});

// GET /api/hazards/:id - get a specific hazard
hazardsRouter.get('/:id', async (req, res) => {
    try {
        const hazardID = req.params.id;
        // add hazard id validation
        const result = await pool.query('SELECT * FROM hazards WHERE hazard_id = $1', [hazardID])
        console.log("Successful retrieval")
        return res.status(200).json(result.rows)
    } catch (err) {
        console.error('Error retrieving hazard by id: ', err)
        return res.status(500).json({error: 'Failed to retrieve hazard by id'});
    }
});

// ---------- POST REQUESTS ----------

// POST /api/hazards - create a new hazard
hazardsRouter.post('/', async (req, res) => {
    try {
        const {user_id, title, description, category, severity, latitude, longitude, image_url} = req.body;
        // add validation for each field
        const result = await pool.query(
            `
            INSERT INTO hazards (
            user_id, title, description, category, severity, latitude, longitude, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `, [Number(user_id), title, description, category, severity, latitude, longitude, image_url ?? null]
            );
        console.log("Successful insertion")
        return res.status(200).json(result.rows)
    } catch (err) {
        console.error('Error adding hazard: ', err)
        return res.status(500).json({error: 'Failed to add new hazard'});
    }
});

// ---------- PATCH REQUESTS ----------

// PATCH /api/hazards/:id - update a hazard
hazardsRouter.patch('/:id', async (req, res) => {
    try {
        const hazardID = req.params.id;
        const {
            title, description, category, current_status, severity, latitude, longitude, image_url
        } = req.body;

        const result = await pool.query(
            `
            UPDATE hazards
            SET
                title = $1,
                description = $2,
                category = $3,
                current_status = $4,
                severity = $5,
                latitude = $6,
                longitude = $7,
                image_url = $8
            WHERE hazard_id = $9
            RETURNING *
            `,
            [title, description, category, current_status, severity, latitude, longitude, image_url ?? null, hazardID]
        );
        console.log("Successful update")
        return res.status(200).json(result.rows)
    } catch (err) {
        console.error('Error updating hazard: ', err)
        return res.status(500).json({error: 'Failed to update hazard'});
    }
});

// ---------- DELETE REQUESTS ----------

// DELETE /api/hazards/:id - delete a hazard by id
hazardsRouter.delete('/:id', async (req, res) => {
    try {
        const hazardID = req.params.id;
        const result = await pool.query(
            `
            DELETE FROM hazards
            WHERE hazard_id = $1
            RETURNING *
            `,
            [hazardID]
        );
        console.log("Successful deletion")
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error deleting hazard: ', err);
        return res.status(500).json({error: 'Failed to delete hazard'});
    }
});


export default hazardsRouter;