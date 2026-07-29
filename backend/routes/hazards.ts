import { Router } from 'express';
import { pool } from '../db';
import requireAdmin from '../middleware/requireAdmin';
import requireAuth from '../middleware/requireAuth';
// import type { Hazard } from '../types/hazard';

const hazardsRouter = Router();

// Validation

// hazard categories and statuses
const HAZARD_CATS = ['Construction', 'Accident', 'Bike Theft', 'Road Condition', 'Obstacle', 'Other'];
const HAZARD_STATUS = ['reported', 'in_progress', 'resolved'];

// ensure hazard id is a pos int
function parseHazardId(value: unknown): number | null {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }
    return id;
}

// ensure number is in specified range
function isNumInRange(value: unknown, min: number, max: number, requireInteger = false): boolean {
    if (value === '' || value === null || value === undefined) {
        return false;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return false;
    }
    if (requireInteger && !Number.isInteger(num)) {
        return false;
    }
    return num >= min && num <= max;
}

// ensure hazard body is valid
function validateHazardBody(body: any, includeStatus = false): string | null {
    if (!body || typeof body !== 'object') {
        return 'Request body required';
    }
    if (typeof body.title !== 'string' || body.title.trim() === '') {
        return 'Title required';
    }
    if (body.title.trim().length > 255) {
        return 'Title must be less than 255 characters';
    }
    if (typeof body.description !== 'string' || body.description.trim() === '') {
        return 'Description required';
    }
    if (body.description.trim().length > 255) {
        return 'Description must be less than 255 characters';
    }
    if (!HAZARD_CATS.includes(body.category)) {
        return 'Invalid hazard category';
    }
    if (!isNumInRange(body.severity, 1, 5, true)) {
        return 'Severity must be an integer between 1 and 5';
    }
    if (!isNumInRange(body.latitude, -90, 90)) {
        return 'Latitude must be a number between -90 and 90';
    }
    if (!isNumInRange(body.longitude, -180, 180)) {
        return 'Longitude must be a number between -180 and 180';
    }
    if (includeStatus && !HAZARD_STATUS.includes(body.current_status)) {
        return 'Invalid hazard status';
    }
    return null;
}

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
        const hazardID = parseHazardId(req.params.id);
        if (hazardID === null) {
            return res.status(400).json({ error: 'Hazard ID must be positive integer' });
        }
        // add hazard id validation
        const result = await pool.query('SELECT * FROM hazards WHERE hazard_id = $1', [hazardID]);
        if (result.rows.length === 0 ) {
            return res.status(404).json({ error: 'Hazard not found' });
        }
        return res.status(200).json(result.rows)
    } catch (err) {
        console.error('Error retrieving hazard by id: ', err)
        return res.status(500).json({error: 'Failed to retrieve hazard by id'});
    }
});

// ---------- POST REQUESTS ----------

// POST /api/hazards - create a new hazard
hazardsRouter.post('/', requireAuth, async (req, res) => {
    try {
        const validationError = validateHazardBody(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const {title, description, category, severity, latitude, longitude, image_url } = req.body;

        const result = await pool.query(
            `
            INSERT INTO hazards (
            user_id, title, description, category, severity, latitude, longitude, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `, [req.user!.user_id, title.trim(), description.trim(), category, Number(severity), Number(latitude), Number(longitude), image_url ?? null]
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
hazardsRouter.patch('/:id', requireAdmin, async (req, res) => {
    try {
        const hazardID = parseHazardId(req.params.id);
        if (hazardID === null) {
            return res.status(400).json({ error: 'Hazard ID must be positive integer' });
        }
        const validationError = validateHazardBody(req.body, true);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
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
            [title.trim(), description.trim(), category, current_status, Number(severity), Number(latitude), Number(longitude), image_url ?? null, hazardID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Hazard not found' });
        }

        console.log("Successful update")
        return res.status(200).json(result.rows)
    } catch (err) {
        console.error('Error updating hazard: ', err)
        return res.status(500).json({error: 'Failed to update hazard'});
    }
});

// ---------- DELETE REQUESTS ----------

// DELETE /api/hazards/:id - delete a hazard by id
hazardsRouter.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const hazardID = parseHazardId(req.params.id);
        if (hazardID === null) {
            return res.status(400).json({ error: 'Hazard ID must be positive integer' });
        }
        const result = await pool.query(
            `
            DELETE FROM hazards
            WHERE hazard_id = $1
            RETURNING *
            `,
            [hazardID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Hazard not found' });
        }

        console.log("Successful deletion")
        return res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error deleting hazard: ', err);
        return res.status(500).json({error: 'Failed to delete hazard'});
    }
});


export default hazardsRouter;