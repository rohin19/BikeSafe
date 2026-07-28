import { Router, type Request, type Response } from 'express';

import { pool } from '../db';
import requireAuth from '../middleware/requireAuth';

const routeLogsRouter = Router();

// Return the join as review_stats
const reviewAveragesJoin = `
  LEFT JOIN (
    SELECT route_id,
      ROUND(AVG(review_rating)::numeric, 1) AS average_overall_rating,
      ROUND(AVG(safety_rating)::numeric, 1) AS average_safety_rating,
      ROUND(AVG(difficulty_rating)::numeric, 1) AS average_difficulty_rating,
      COUNT(*)::integer AS review_count
    FROM reviews
    GROUP BY route_id
  ) review_stats ON review_stats.route_id = r.route_id
`;

const routeLogFields = `
  rl.*, logger.name AS logged_by_name,
  r.start_name, r.destination_name, r.elevation, r.distance, r.duration,
  r.safety_score AS planned_safety_score,
  COALESCE(review_stats.average_overall_rating, 0) AS average_overall_rating,
  COALESCE(review_stats.average_safety_rating, 0) AS average_safety_rating,
  COALESCE(review_stats.average_difficulty_rating, 0) AS average_difficulty_rating,
  COALESCE(review_stats.review_count, 0) AS review_count
`;

/*
 * All ride logs require authentication.
 *
 * user_id always comes from req.user.
 */
routeLogsRouter.use(requireAuth);

// Make sure every street name is lowercase and trimmed so they're consistent
function cleanStreetNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter((street): street is string => typeof street === 'string')
        .map((street) => street.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

// Make sure all the hazard id are valid integers
function cleanHazardIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.map(Number).filter((hazardId) => Number.isInteger(hazardId) && hazardId > 0)
    )
  ];
}

// Make sure all ratings are valid
function isRating(value: unknown): boolean {
  const rating = Number(value);

  return (Number.isInteger(rating) && rating >= 1 && rating <= 5);
}

/*
 * GET /api/route-logs
 * Returns all routes with their average ratings.
 * 
 * Optional:
 * GET /api/route-logs?mine=true
 * GET /api/route-logs?streets=ontario st,e 10th ave
 */
routeLogsRouter.get('/', async (req: Request, res: Response) => {
    // Clean up the streets queries if there's any
    const requestedStreets = typeof req.query.streets === 'string' ? cleanStreetNames(req.query.streets.split(',')) : [];

    // Check the query is referencing itself
    const onlyMine = req.query.mine === 'true';

    const conditions: string[] = [];
    const values: unknown[] = [];

    // Store all the queries as values, and set up the conditions
    if (requestedStreets.length > 0) {
      values.push(requestedStreets);
      conditions.push(`rl.street_names && $${values.length}::text[]`);
    }

    if (onlyMine) {
      values.push(req.user!.user_id);
      conditions.push(`rl.user_id = $${values.length}`);
    }

    // Link up all the queries
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await pool.query(
        `
        SELECT ${routeLogFields}
        FROM route_logs rl
        JOIN routes r ON r.route_id = rl.route_id
        JOIN users logger ON logger.user_id = rl.user_id
        ${reviewAveragesJoin}
        ${whereClause}
        ORDER BY rl.completed_at DESC
        `, values
      );

      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching routes:', error);
      return res.status(500).json({error: 'Failed to fetch route logs'});
    }
  }
);

/*
 * GET /api/route-logs/:id
 *
 * Returns:
 * - Ride measurements
 * - Reviews
 * - Other logs sharing streets
 */
routeLogsRouter.get('/:id', async (req: Request, res: Response) => {
    const routeLogId = Number(req.params.id);

    if (!Number.isInteger(routeLogId)) {
      return res.status(400).json({error: 'Invalid route log id'});
    }

    try {
      const logResult = await pool.query(
        `
        SELECT ${routeLogFields}
        FROM route_logs rl
        JOIN routes r ON r.route_id = rl.route_id
        JOIN users logger ON logger.user_id = rl.user_id
        ${reviewAveragesJoin}
        WHERE rl.route_log_id = $1
        `,
        [routeLogId]
      );

      const routeLog = logResult.rows[0];

      if (!routeLog) {
        return res.status(404).json({error: 'Route log not found'});
      }

      // Reviews, hazards and other related logs that belong to the route
      const [reviewsResult, hazardsResult, relatedResult] = await Promise.all([
        pool.query(
          `
          SELECT rv.*, reviewer.name AS user_name
          FROM reviews rv
          JOIN users reviewer ON reviewer.user_id = rv.user_id
          WHERE rv.route_id = $1
          ORDER BY rv.updated_at DESC
          `,
          [routeLog.route_id],
        ),
        pool.query(
          `
          SELECT h.*
          FROM hazards h
          JOIN route_hazards rh ON rh.hazard_id = h.hazard_id
          WHERE rh.route_id = $1
          ORDER BY h.created_at DESC
          `,
          [routeLog.route_id],
        ),
        pool.query(
          `
          SELECT ${routeLogFields},
            ARRAY(
              SELECT street FROM unnest(rl.street_names) AS street
              WHERE street = ANY($2::text[])
            ) AS shared_streets
          FROM route_logs rl
          JOIN routes r ON r.route_id = rl.route_id
          JOIN users logger ON logger.user_id = rl.user_id
          ${reviewAveragesJoin}
          WHERE rl.route_log_id <> $1 AND rl.street_names && $2::text[]
          ORDER BY cardinality(
            ARRAY(
              SELECT street FROM unnest(rl.street_names) AS street
              WHERE street = ANY($2::text[])
            )
          ) DESC, rl.completed_at DESC
          LIMIT 5
          `,
          [routeLogId, routeLog.street_names],
        )
      ]);

      return res.status(200).json({
        ...routeLog,
        reviews: reviewsResult.rows,
        related_logs: relatedResult.rows,
      });
    } catch (error) {
      console.error('Error fetching route-log details:', error);

      return res.status(500).json({
        error: 'Failed to fetch route-log details',
      });
    }
  }
);

/*
 * POST /api/route-logs
 *
 * Creates:
 * - One completed ride
 * - The user's first review
 */
routeLogsRouter.post('/', async (req: Request, res: Response) => {
    const {route_id, street_names, hazard_ids, initial_review} = req.body ?? {};

    const routeId = Number(route_id);
    const cleanedStreets = cleanStreetNames(street_names);
    const cleanedHazardIds = cleanHazardIds(hazard_ids);
    const reviewRating = initial_review?.review_rating ?? initial_review?.overall_rating;
    const safetyRating = initial_review?.safety_rating;
    const difficultyRating = initial_review?.difficulty_rating;
    const comment = initial_review?.comment ?? initial_review?.comments;
    const reviewComment = typeof comment === 'string' ? comment.trim() || null : null;

    if (!Number.isInteger(routeId) || routeId <= 0) {
      return res.status(400).json({error:'route_id must be a valid route id'});
    }

    if (cleanedStreets.length === 0) {
      return res.status(400).json({error:'At least one street name is required'});
    }

    if (!isRating(reviewRating) || !isRating(safetyRating) || !isRating(difficultyRating)) {
      return res.status(400).json({error:'Ratings must be between 0 and 5'});
    }

    if (reviewComment && reviewComment.length > 255) {
      return res.status(400).json({ error: 'Comment cannot exceed 255 characters'});
    }

    const client = await pool.connect();

     try {
      await client.query('BEGIN');

      const routeResult = await client.query(
        `
        SELECT route_id
        FROM routes
        WHERE route_id = $1
        `,
        [routeId],
      );

      if (routeResult.rows.length === 0) {
        await client.query(
          'ROLLBACK',
        );

        return res.status(404).json({error: 'Route not found'});
      }

      const logResult = await client.query(
        `
        INSERT INTO route_logs (route_id, user_id, street_names)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [routeId, req.user!.user_id, cleanedStreets],
      );

      /*
       * Reuse the existing reviews table.
       * If the user previously reviewed the same route, update that review.
       */
      const reviewResult = await client.query(
        `
        INSERT INTO reviews (route_id, user_id, review_rating, safety_rating, difficulty_rating, comment)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (route_id, user_id) DO UPDATE SET
          review_rating = EXCLUDED.review_rating,
          safety_rating = EXCLUDED.safety_rating,
          difficulty_rating = EXCLUDED.difficulty_rating,
          comment = EXCLUDED.comment,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
        `,
        [routeId, req.user!.user_id, Number(reviewRating), Number(safetyRating), Number(difficultyRating), reviewComment]
      );

      /*
       * hazard integration.
       * These are route-level hazard links, so every log for this route will display the same hazards.
       */
      if (cleanedHazardIds.length) {
        await client.query(
          `
          INSERT INTO route_hazards (route_id, hazard_id)
          SELECT $1, hazard_id FROM hazards
          WHERE hazard_id = ANY($2::integer[])
          ON CONFLICT DO NOTHING
          `,
          [routeId, cleanedHazardIds]
        );
      }

      await client.query('COMMIT');

      return res.status(201).json({
        route_log: logResult.rows[0],
        review: reviewResult.rows[0],
        linked_hazard_ids: cleanedHazardIds
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating route log:', error);
      return res.status(500).json({error: 'Failed to create route log'});
    } finally {
      client.release();
    }
  },
);

/*
 * POST /api/route-logs/:id/reviews
 * Saves the current user's review or updates their existing review.
 */
routeLogsRouter.post('/:id/reviews', async (req: Request, res: Response) => {
    const routeLogId = Number(req.params.id);

    const { review_rating, safety_rating, difficulty_rating, comment } = req.body ?? {};

    const reviewRating = review_rating;
    const safetyRating = safety_rating;
    const difficultyRating = difficulty_rating;
    const reviewComment = typeof comment === 'string' ? comment.trim() || null : null;

    if (!Number.isInteger(routeLogId)) {
      return res.status(400).json({error: 'Invalid route log id'});
    }

    if (!isRating(review_rating) || !isRating(safety_rating) || !isRating(difficulty_rating)) {
      return res.status(400).json({error: 'Ratings must be whole numbers from 1 to 5'});
    }

    if (reviewComment && reviewComment.length > 255) {
      return res.status(400).json({ error: 'Comment cannot exceed 255 characters'});
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO reviews (
          route_id,
          user_id,
          review_rating,
          safety_rating,
          difficulty_rating,
          comment
        )
        SELECT rl.route_id, $2, $3, $4, $5, $6
        FROM route_logs rl
        WHERE rl.route_log_id = $1
        ON CONFLICT (route_id, user_id)
        DO UPDATE SET
          review_rating = EXCLUDED.review_rating,
          safety_rating = EXCLUDED.safety_rating,
          difficulty_rating = EXCLUDED.difficulty_rating,
          comment = EXCLUDED.comment,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
        `,
        [routeLogId, req.user!.user_id, Number(reviewRating), Number(safetyRating), Number(difficultyRating), reviewComment],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({error: 'Route log not found'});
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Error saving route review:', error);
      return res.status(500).json({error: 'Failed to save route review'});
    }
  }
);

/*
 * PATCH /api/route-logs/:id
 * Update or add new log via id
 */
routeLogsRouter.patch('/:id', async (req: Request, res: Response) => {
  const routeLogId = Number(req.params.id);
  const streets = req.body.street_names ? cleanStreetNames(req.body.street_names) : null;

  if (!Number.isInteger(routeLogId)) {
    return res.status(400).json({ error: 'Invalid route log id' });
  }

  if (req.body.street_names && streets?.length === 0) {
    return res.status(400).json({ error: 'At least one street is required' });
  }

  try {
    const result = await pool.query(
      `
      UPDATE route_logs
      SET street_names = COALESCE($1, street_names), completed_at = COALESCE($2, completed_at)
      WHERE route_log_id = $3 AND user_id = $4
      RETURNING *
      `,
      [streets, req.body.completed_at ?? null, routeLogId, req.user!.user_id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({error: 'Route log not found or you do not own it'});
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating route log:', error);
    return res.status(500).json({ error: 'Failed to update route log' });
  }
});

/*
 * DELETE /api/route-logs/:id
 * Delete specific log
 */
routeLogsRouter.delete('/:id', async (req: Request, res: Response) => {
  const routeLogId = Number(req.params.id);

  if (!Number.isInteger(routeLogId)) {
    return res.status(400).json({ error: 'Invalid route log id' });
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM route_logs
      WHERE route_log_id = $1 AND user_id = $2
      RETURNING *
      `,
      [routeLogId, req.user!.user_id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({error: 'Route log not found or you do not own it'});
    }

    return res.status(200).json({message: 'Route log deleted', route_log: result.rows[0]});
  } catch (error) {
    console.error('Error deleting route log:', error);
    return res.status(500).json({ error: 'Failed to delete route log'});
  }
});

export default routeLogsRouter;