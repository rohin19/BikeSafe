import { Router, type Request, type Response } from 'express';

import { pool } from '../db';
import requireAuth from '../middleware/requireAuth';

const routeLogsRouter = Router();

/*
 * All ride logs require authentication.
 *
 * The authenticated user comes from req.user.
 * The frontend never sends user_id.
 */
routeLogsRouter.use(requireAuth);

function cleanStreetNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(
          (street): street is string =>
            typeof street === 'string',
        )
        .map((street) => street.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function isRating(value: unknown): boolean {
  const rating = Number(value);

  return (
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5
  );
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
    const requestedStreets =
      typeof req.query.streets === 'string' ? cleanStreetNames(req.query.streets.split(',')) : [];

    const onlyMine = req.query.mine === 'true';

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (requestedStreets.length > 0) {
      values.push(requestedStreets);

      conditions.push(`rl.street_names && $${values.length}::text[]`);
    }

    if (onlyMine) {
      values.push(req.user!.user_id);

      conditions.push(`rl.user_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await pool.query(
        `
        SELECT
          rl.*,
          u.name AS logged_by_name,

          COALESCE(
            ROUND(AVG(rr.overall_rating)::numeric, 1),
            0
          ) AS average_overall_rating,

          COALESCE(
            ROUND(AVG(rr.safety_rating)::numeric, 1),
            0
          ) AS average_safety_rating,

          COALESCE(
            ROUND(AVG(rr.difficulty_rating)::numeric, 1),
            0
          ) AS average_difficulty_rating,

          COUNT(rr.review_id)::integer AS review_count

        FROM route_logs rl

        JOIN users u 
            ON u.user_id = rl.user_id

        LEFT JOIN route_reviews rr
            ON rr.route_log_id = rl.route_log_id

        ${whereClause}

        GROUP BY rl.route_log_id, u.name
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
 * - Linked hazards
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
        SELECT
          rl.*,
          u.name AS logged_by_name,

          COALESCE(
            ROUND(AVG(rr.overall_rating)::numeric, 1),
            0
          ) AS average_overall_rating,

          COALESCE(
            ROUND(AVG(rr.safety_rating)::numeric, 1),
            0
          ) AS average_safety_rating,

          COALESCE(
            ROUND(AVG(rr.difficulty_rating)::numeric, 1),
            0
          ) AS average_difficulty_rating,

          COUNT(rr.review_id)::integer AS review_count

        FROM route_logs rl

        JOIN users u
          ON u.user_id = rl.user_id

        LEFT JOIN route_reviews rr
          ON rr.route_log_id = rl.route_log_id

        WHERE rl.route_log_id = $1

        GROUP BY rl.route_log_id, u.name
        `,
        [routeLogId]
      );

      const routeLog = logResult.rows[0];

      if (!routeLog) {
        return res.status(404).json({error: 'Route log not found'});
      }

      const [reviewsResult, relatedResult] = await Promise.all([
        pool.query(
          `
          SELECT
            rr.*,
            u.name AS user_name

          FROM route_reviews rr

          JOIN users u
            ON u.user_id = rr.user_id

          WHERE rr.route_log_id = $1

          ORDER BY rr.updated_at DESC
          `,
          [routeLogId],
        ),

        pool.query(
          `
          SELECT
            other.*,
            u.name AS logged_by_name,

            ARRAY(
              SELECT street
              FROM unnest(other.street_names) AS street
              WHERE street = ANY($2::text[])
            ) AS shared_streets,

            COALESCE(
                ROUND(AVG(rr.overall_rating)::numeric, 1),
                0
            ) AS average_overall_rating,

            COALESCE(
                ROUND(AVG(rr.safety_rating)::numeric, 1),
                0
            ) AS average_safety_rating,

            COALESCE(
                ROUND(AVG(rr.difficulty_rating)::numeric, 1),
                0
            ) AS average_difficulty_rating,

            COUNT(rr.review_id)::integer AS review_count

          FROM route_logs other

          JOIN users u
            ON u.user_id = other.user_id

          LEFT JOIN route_reviews rr
            ON rr.route_log_id = other.route_log_id

          WHERE other.route_log_id <> $1
            AND other.street_names && $2::text[]

          GROUP BY other.route_log_id, u.name

          ORDER BY cardinality(
            ARRAY(
              SELECT street
              FROM unnest(other.street_names) AS street
              WHERE street = ANY($2::text[])
            )
          ) DESC, other.completed_at DESC

          LIMIT 5
          `,
          [routeLogId, routeLog.street_names]
        ),
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
 * - Optional hazard links
 */
routeLogsRouter.post(
  '/',
  async (req: Request, res: Response) => {
    const {
      planned_route_id,
      start_name,
      destination_name,
      elevation,
      distance,
      duration,
      street_names,
      hazard_ids,
      initial_review,
    } = req.body ?? {};

    const plannedRouteId =
      planned_route_id === null ||
      planned_route_id === undefined ||
      planned_route_id === ''
        ? null
        : Number(planned_route_id);

    const cleanedStreets =
      cleanStreetNames(street_names);

    const cleanedHazardIds =
      cleanHazardIds(hazard_ids);

    if (
      plannedRouteId !== null &&
      !Number.isInteger(plannedRouteId)
    ) {
      return res.status(400).json({
        error:
          'planned_route_id must be a valid route id',
      });
    }

    if (
      typeof start_name !== 'string' ||
      !start_name.trim() ||
      typeof destination_name !== 'string' ||
      !destination_name.trim() ||
      cleanedStreets.length === 0
    ) {
      return res.status(400).json({
        error:
          'Start, destination, and at least one street name are required',
      });
    }

    if (
      [elevation, distance, duration].some(
        (value) =>
          !Number.isFinite(Number(value)) ||
          Number(value) < 0,
      )
    ) {
      return res.status(400).json({
        error:
          'Elevation, distance, and duration must be non-negative numbers',
      });
    }

    if (
      !isRating(
        initial_review?.overall_rating,
      ) ||
      !isRating(
        initial_review?.safety_rating,
      ) ||
      !isRating(
        initial_review?.difficulty_rating,
      )
    ) {
      return res.status(400).json({
        error:
          'Ratings must be whole numbers from 1 to 5',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (plannedRouteId !== null) {
        const plannedRoute =
          await client.query(
            `
            SELECT route_id
            FROM routes
            WHERE route_id = $1
            `,
            [plannedRouteId],
          );

        if (
          plannedRoute.rows.length === 0
        ) {
          await client.query('ROLLBACK');

          return res.status(404).json({
            error:
              'Planned route not found',
          });
        }
      }

      const logResult = await client.query(
        `
        INSERT INTO route_logs (
          user_id,
          planned_route_id,
          start_name,
          destination_name,
          elevation,
          distance,
          duration,
          street_names
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8
        )
        RETURNING *
        `,
        [
          req.user!.user_id,
          plannedRouteId,
          start_name.trim(),
          destination_name.trim(),
          Number(elevation),
          Number(distance),
          Number(duration),
          cleanedStreets,
        ],
      );

      const routeLog = logResult.rows[0];

      const reviewResult =
        await client.query(
          `
          INSERT INTO route_reviews (
            route_log_id,
            user_id,
            overall_rating,
            safety_rating,
            difficulty_rating,
            comments
          )
          VALUES (
            $1, $2, $3,
            $4, $5, $6
          )
          RETURNING *
          `,
          [
            routeLog.route_log_id,
            req.user!.user_id,
            Number(
              initial_review.overall_rating,
            ),
            Number(
              initial_review.safety_rating,
            ),
            Number(
              initial_review
                .difficulty_rating,
            ),
            typeof initial_review.comments ===
            'string'
              ? initial_review.comments
                  .trim() || null
              : null,
          ],
        );

      if (cleanedHazardIds.length > 0) {
        await client.query(
          `
          INSERT INTO route_log_hazards (
            route_log_id,
            hazard_id
          )

          SELECT $1, hazard_id
          FROM hazards
          WHERE hazard_id =
            ANY($2::integer[])

          ON CONFLICT DO NOTHING
          `,
          [
            routeLog.route_log_id,
            cleanedHazardIds,
          ],
        );
      }

      await client.query('COMMIT');

      return res.status(201).json({
        route_log: routeLog,
        review: reviewResult.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');

      console.error(
        'Error creating route log:',
        error,
      );

      return res.status(500).json({
        error:
          'Failed to create route log',
      });
    } finally {
      client.release();
    }
  },
);

/*
 * POST /api/route-logs/:id/reviews
 *
 * Creates or updates the authenticated
 * user's review.
 */
routeLogsRouter.post(
  '/:id/reviews',
  async (req: Request, res: Response) => {
    const routeLogId =
      Number(req.params.id);

    const {
      overall_rating,
      safety_rating,
      difficulty_rating,
      comments,
    } = req.body ?? {};

    if (!Number.isInteger(routeLogId)) {
      return res.status(400).json({
        error: 'Invalid route log id',
      });
    }

    if (
      !isRating(overall_rating) ||
      !isRating(safety_rating) ||
      !isRating(difficulty_rating)
    ) {
      return res.status(400).json({
        error:
          'Ratings must be whole numbers from 1 to 5',
      });
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO route_reviews (
          route_log_id,
          user_id,
          overall_rating,
          safety_rating,
          difficulty_rating,
          comments
        )

        SELECT
          $1, $2, $3,
          $4, $5, $6

        WHERE EXISTS (
          SELECT 1
          FROM route_logs
          WHERE route_log_id = $1
        )

        ON CONFLICT (
          route_log_id,
          user_id
        )

        DO UPDATE SET
          overall_rating =
            EXCLUDED.overall_rating,

          safety_rating =
            EXCLUDED.safety_rating,

          difficulty_rating =
            EXCLUDED.difficulty_rating,

          comments =
            EXCLUDED.comments,

          updated_at =
            CURRENT_TIMESTAMP

        RETURNING *
        `,
        [
          routeLogId,
          req.user!.user_id,
          Number(overall_rating),
          Number(safety_rating),
          Number(difficulty_rating),
          typeof comments === 'string'
            ? comments.trim() || null
            : null,
        ],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Route log not found',
        });
      }

      return res
        .status(201)
        .json(result.rows[0]);
    } catch (error) {
      console.error(
        'Error saving route review:',
        error,
      );

      return res.status(500).json({
        error:
          'Failed to save route review',
      });
    }
  },
);

export default routeLogsRouter;