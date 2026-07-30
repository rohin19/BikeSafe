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
/**
 * @openapi
 * /api/hazards:
 *   get:
 *     summary: Retrieve all hazard reports
 *     tags: [Hazards]
 *     responses:
 *       200:
 *         description: A list of all hazard reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   hazard_id:
 *                     type: integer
 *                     example: 1
 *                   user_id:
 *                     type: integer
 *                     nullable: true
 *                     example: 2
 *                   title:
 *                     type: string
 *                     example: Pothole on Main Street
 *                   description:
 *                     type: string
 *                     example: Large pothole in the eastbound bike lane.
 *                   category:
 *                     type: string
 *                     enum: [Construction, Accident, Bike Theft, Road Condition, Obstacle, Other]
 *                     example: Road Condition
 *                   current_status:
 *                     type: string
 *                     enum: [reported, in_progress, resolved]
 *                     example: reported
 *                   severity:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 3
 *                   latitude:
 *                     type: number
 *                     format: double
 *                     example: 49.2827
 *                   longitude:
 *                     type: number
 *                     format: double
 *                     example: -123.1207
 *                   image_url:
 *                     type: string
 *                     nullable: true
 *                     example: null
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-07-29T12:00:00.000Z
 *       500:
 *         description: Failed to retrieve hazards from the database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch hazards
 */
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
/**
 * @openapi
 * /api/hazards/stats:
 *   get:
 *     summary: Retrieve aggregate hazard statistics
 *     tags: [Hazards]
 *     responses:
 *       200:
 *         description: Hazard totals grouped by category and status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalHazards:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       totalhazards:
 *                         type: string
 *                         example: "5"
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: Construction
 *                       count:
 *                         type: string
 *                         example: "3"
 *                 statuses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       current_status:
 *                         type: string
 *                         enum: [reported, in_progress, resolved]
 *                         example: reported
 *                       count:
 *                         type: string
 *                         example: "4"
 *       500:
 *         description: Failed to calculate hazard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Fail to retrieve stats
 */
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
/**
 * @openapi
 * /api/hazards/{id}:
 *   get:
 *     summary: Retrieve a hazard report by ID
 *     tags: [Hazards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Positive integer identifying the hazard
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *     responses:
 *       200:
 *         description: The requested hazard report
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   hazard_id:
 *                     type: integer
 *                     example: 1
 *                   user_id:
 *                     type: integer
 *                     nullable: true
 *                     example: 2
 *                   title:
 *                     type: string
 *                     example: Pothole on Main Street
 *                   description:
 *                     type: string
 *                     example: Large pothole in the eastbound bike lane.
 *                   category:
 *                     type: string
 *                     enum: [Construction, Accident, Bike Theft, Road Condition, Obstacle, Other]
 *                     example: Road Condition
 *                   current_status:
 *                     type: string
 *                     enum: [reported, in_progress, resolved]
 *                     example: reported
 *                   severity:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 3
 *                   latitude:
 *                     type: number
 *                     format: double
 *                     example: 49.2827
 *                   longitude:
 *                     type: number
 *                     format: double
 *                     example: -123.1207
 *                   image_url:
 *                     type: string
 *                     nullable: true
 *                     example: null
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-07-29T12:00:00.000Z
 *       400:
 *         description: The hazard ID is not a positive integer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hazard ID must be positive integer
 *       404:
 *         description: No hazard exists with the supplied ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hazard not found
 *       500:
 *         description: Failed to retrieve the hazard from the database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to retrieve hazard by id
 */
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
/**
 * @openapi
 * /api/hazards:
 *   post:
 *     summary: Create a hazard report
 *     description: Creates a hazard owned by the authenticated user. The user ID is taken from the JWT cookie.
 *     tags: [Hazards]
 *     parameters:
 *       - in: cookie
 *         name: token
 *         required: true
 *         description: JWT authentication cookie
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - severity
 *               - latitude
 *               - longitude
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 example: Construction blocking bike lane
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 example: Equipment is blocking the eastbound bike lane.
 *               category:
 *                 type: string
 *                 enum: [Construction, Accident, Bike Theft, Road Condition, Obstacle, Other]
 *                 example: Construction
 *               severity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               latitude:
 *                 type: number
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 49.2827
 *               longitude:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *                 example: -123.1207
 *               image_url:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *                 example: null
 *     responses:
 *       200:
 *         description: The newly created hazard report
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *             example:
 *               - hazard_id: 10
 *                 user_id: 2
 *                 title: Construction blocking bike lane
 *                 description: Equipment is blocking the eastbound bike lane.
 *                 category: Construction
 *                 current_status: reported
 *                 severity: 4
 *                 latitude: 49.282700
 *                 longitude: -123.120700
 *                 image_url: null
 *                 created_at: 2026-07-29T12:00:00.000Z
 *       400:
 *         description: One or more hazard fields failed validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Severity must be an integer between 1 and 5
 *       401:
 *         description: The user is not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token provided
 *       500:
 *         description: Failed to insert the hazard into the database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to add new hazard
 */
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
/**
 * @openapi
 * /api/hazards/{id}:
 *   patch:
 *     summary: Update a hazard report
 *     description: Updates an existing hazard report. Administrator access is required.
 *     tags: [Hazards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Positive integer identifying the hazard
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *       - in: cookie
 *         name: token
 *         required: true
 *         description: JWT authentication cookie belonging to an administrator
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - current_status
 *               - severity
 *               - latitude
 *               - longitude
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 example: Construction blocking bike lane
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 example: Equipment is blocking the eastbound bike lane.
 *               category:
 *                 type: string
 *                 enum: [Construction, Accident, Bike Theft, Road Condition, Obstacle, Other]
 *                 example: Construction
 *               current_status:
 *                 type: string
 *                 enum: [reported, in_progress, resolved]
 *                 example: in_progress
 *               severity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               latitude:
 *                 type: number
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 49.2827
 *               longitude:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *                 example: -123.1207
 *               image_url:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *                 example: null
 *     responses:
 *       200:
 *         description: The updated hazard report
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *             example:
 *               - hazard_id: 1
 *                 user_id: 2
 *                 title: Construction blocking bike lane
 *                 description: Equipment is blocking the eastbound bike lane.
 *                 category: Construction
 *                 current_status: in_progress
 *                 severity: 4
 *                 latitude: 49.282700
 *                 longitude: -123.120700
 *                 image_url: null
 *                 created_at: 2026-07-29T12:00:00.000Z
 *       400:
 *         description: The hazard ID or request body is invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid hazard status
 *       401:
 *         description: The user is not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token provided
 *       403:
 *         description: The authenticated user is not an administrator
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden
 *       404:
 *         description: No hazard exists with the supplied ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hazard not found
 *       500:
 *         description: Failed to update the hazard in the database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to update hazard
 */
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
/**
 * @openapi
 * /api/hazards/{id}:
 *   delete:
 *     summary: Delete a hazard report
 *     description: Permanently deletes a hazard report. Administrator access is required.
 *     tags: [Hazards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Positive integer identifying the hazard
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *       - in: cookie
 *         name: token
 *         required: true
 *         description: JWT authentication cookie belonging to an administrator
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The deleted hazard report
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *             example:
 *               - hazard_id: 1
 *                 user_id: 2
 *                 title: Pothole on Main Street
 *                 description: Large pothole in the eastbound bike lane.
 *                 category: Road Condition
 *                 current_status: reported
 *                 severity: 3
 *                 latitude: 49.282700
 *                 longitude: -123.120700
 *                 image_url: null
 *                 created_at: 2026-07-29T12:00:00.000Z
 *       400:
 *         description: The hazard ID is not a positive integer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hazard ID must be positive integer
 *       401:
 *         description: The user is not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token provided
 *       403:
 *         description: The authenticated user is not an administrator
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden
 *       404:
 *         description: No hazard exists with the supplied ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Hazard not found
 *       500:
 *         description: Failed to delete the hazard from the database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to delete hazard
 */
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