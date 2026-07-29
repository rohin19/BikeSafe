import { Router, type Request, type Response } from 'express';
import { Review, CreateReviewBody, UpdateReviewBody, CommunityReview } from '../types/review';
import { pool } from '../db';
import requireAuth from '../middleware/requireAuth';

const reviewsRouter = Router();

// Make sure the user is authenticated to use these apis
reviewsRouter.use(requireAuth);

// Contain both the review and route fields
const reviewFields = `
  rv.review_id,
  rv.route_id,
  rv.user_id,
  rv.review_rating::float AS review_rating,
  rv.comment,
  rv.created_at,
  COALESCE(u.name, 'Deleted user') AS user_name,
  r.start_name,
  r.destination_name,
  r.elevation::float AS elevation,
  r.distance::float AS distance,
  r.duration::float AS duration,
  r.safety_score::float AS safety_score
`;

// Make sure number field are positively valid
function parsePositiveInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

// Make sure the review ratings are valid
function parseRating(value: unknown): number | null {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0 || number > 5) {
    return null;
  }

  // the review raiting is 2 decimal point
  return Math.round(number * 10) / 10;
}

// Make sure the comments are valid and within 255 characters
function parseComment(value: unknown): {valid: boolean; comment: string | null;} {
  if (value === undefined || value === null) {
    return { valid: true, comment: null };
  }

  if (typeof value !== 'string') {
    return { valid: false, comment: null };
  }

  const comment = value.trim() || null;

  // Validate varchar(255) constraint
  if (comment && comment.length > 255) {
    return { valid: false, comment: null };
  }

  return { valid: true, comment };
}

/*
 * GET /api/reviews
 *
 * Also contain optional param to filter search, like:
 *   ?search=central park
 *   ?mine=true
 *   ?route_id=3
 */
reviewsRouter.get('/', async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const onlyMine = req.query.mine === 'true';
  const routeIdQuery = req.query.route_id;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (search) {
    values.push(`%${search}%`);
    const parameter = `$${values.length}`;

    // ILIKE allows us to ignore case sensitivity
    conditions.push(`(
      r.start_name ILIKE ${parameter}
      OR r.destination_name ILIKE ${parameter}
      OR COALESCE(rv.comment, '') ILIKE ${parameter}
      OR COALESCE(u.name, '') ILIKE ${parameter}
    )`);
  }

  if (onlyMine) {
    values.push(req.user!.user_id);
    conditions.push(`rv.user_id = $${values.length}`);
  }

  // Store the values of the queries and valid conditions
  if (routeIdQuery !== undefined) {
    const routeId = parsePositiveInteger(routeIdQuery);
    if (routeId === null) { return res.status(400).json({ error: 'Invalid route_id' }); }
    values.push(routeId);
    conditions.push(`rv.route_id = $${values.length}`);
  }

  // set up the conditions into sql WHERE clauses
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const result = await pool.query<CommunityReview>(
      `
        SELECT ${reviewFields}
        FROM reviews rv
        JOIN routes r ON r.route_id = rv.route_id
        LEFT JOIN users u ON u.user_id = rv.user_id
        ${whereClause}
        ORDER BY rv.created_at DESC, rv.review_id DESC
      `,
      values
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/* GET /api/reviews/:id */
reviewsRouter.get('/:id', async (req: Request, res: Response) => {
  const reviewId = parsePositiveInteger(req.params.id);
  if (reviewId === null) { return res.status(400).json({ error: 'Invalid review id' }); }
  try {
    const result = await pool.query(
      `
        SELECT ${reviewFields}
        FROM reviews rv
        JOIN routes r ON r.route_id = rv.route_id
        LEFT JOIN users u ON u.user_id = rv.user_id
        WHERE rv.review_id = $1
      `,
      [reviewId]
    );
    if (!result.rows[0]) { return res.status(404).json({ error: 'Review not found' }); }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching review:', error);
    return res.status(500).json({ error: 'Failed to fetch review' });
  }
});

/* POST /api/reviews
 * Always create new reviews
*/
reviewsRouter.post('/', async (req: Request<Record<string, never>, unknown, CreateReviewBody>, res: Response) => {
  const routeId = parsePositiveInteger(req.body?.route_id);
  const rating = parseRating(req.body?.review_rating);
  const parsedComment = parseComment(req.body?.comment);

  if (routeId === null) { return res.status(400).json({ error: 'route_id must be a valid route id' }); }
  if (rating === null) { return res.status(400).json({ error: 'review_rating must be between 0 and 5' }); }
  if (!parsedComment.valid) { return res.status(400).json({ error: 'comment must be at most 255 characters' }); }

  try {
    // INSERT ... SELECT lets us return 404 without relying on a foreign-key error.
    const result = await pool.query<Review>(
      `
        INSERT INTO reviews (route_id, user_id, review_rating, comment)
        SELECT r.route_id, $2, $3, $4
        FROM routes r
        WHERE r.route_id = $1
        RETURNING *
      `,
      [routeId, req.user!.user_id, rating, parsedComment.comment],
    );

    if (!result.rows[0]) { return res.status(404).json({ error: 'Route not found' }); }
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
});

/*
 * PATCH /api/reviews/:id
 * Only the user who created a review may update it.
 */
reviewsRouter.patch('/:id', async (req: Request<{ id: string }, unknown, UpdateReviewBody>, res: Response) => {
  const reviewId = parsePositiveInteger(req.params.id);
  if (reviewId === null) { return res.status(400).json({ error: 'Invalid review id' }); }

  const hasRating = req.body?.review_rating !== undefined;
  const hasComment = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'comment');

  if (!hasRating && !hasComment) { return res.status(400).json({error: 'Provide review_rating or comment to update'}); }

  const rating = hasRating ? parseRating(req.body.review_rating) : null;
  if (hasRating && rating === null) { return res.status(400).json({ error: 'review_rating must be between 0 and 5' }); }

  const parsedComment = hasComment ? parseComment(req.body.comment) : { valid: true, comment: null };
  if (!parsedComment.valid) { return res.status(400).json({ error: 'comment must be at most 255 characters' }); }

  try {
    const result = await pool.query<Review>(
      `
        UPDATE reviews
        SET
          review_rating = CASE
            WHEN $1::boolean THEN $2::numeric
            ELSE review_rating
          END,
          comment = CASE
            WHEN $3::boolean THEN $4::varchar
            ELSE comment
          END
        WHERE review_id = $5
          AND user_id = $6
        RETURNING *
      `,
      [hasRating, rating, hasComment, parsedComment.comment, reviewId, req.user!.user_id]
    );

    if (!result.rows[0]) { return res.status(404).json({error: 'Review not found or you do not own it'}); }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
});

/* DELETE /api/reviews/:id */
reviewsRouter.delete('/:id', async (req: Request, res: Response) => {
  const reviewId = parsePositiveInteger(req.params.id);
  if (reviewId === null) { return res.status(400).json({ error: 'Invalid review id' }); }

  try {
    const result = await pool.query(
      `
        DELETE FROM reviews
        WHERE review_id = $1
          AND user_id = $2
        RETURNING review_id
      `,
      [reviewId, req.user!.user_id],
    );

    if (!result.rows[0]) { return res.status(404).json({error: 'Review not found or you do not own it'}); }
    return res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default reviewsRouter;