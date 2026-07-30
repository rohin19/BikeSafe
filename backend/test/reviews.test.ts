import { after, afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app';
import { pool } from '../db';

const originalJwtSecret = process.env.JWT_SECRET;
const testJwtSecret = 'review-route-test-secret';
process.env.JWT_SECRET = testJwtSecret;

// Create a valid cookie for a normal user with user_id 7
const token = jwt.sign(
  { user_id: 7, role: 'user' },
  testJwtSecret,
  { expiresIn: '1h' },
);
const userCookie = `token=${token}`;

// Reusable review data returned by the mocked database
const review = {
  review_id: 10,
  route_id: 3,
  user_id: 7,
  review_rating: 4.5,
  comment: 'Safe and comfortable route.',
  created_at: '2026-07-30T12:00:00.000Z',
};

// A review joined with the route and reviewer information
const communityReview = {
  ...review,
  user_name: 'Test User',
  start_name: 'SFU Surrey',
  destination_name: 'Central City',
  elevation: 20,
  distance: 1500,
  duration: 420,
  safety_score: 88,
};

function mockQuery(rows: unknown[]) {
  return mock.method(pool, 'query', async () => ({
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  }) as any);
}

// Restore the original after each tests
afterEach(() => mock.restoreAll());

// Refresh jwt per test
after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

describe('Review routes', () => {
  // Protected review routes should reject requests without a JWT cookie
  it('requires authentication', async () => {
    const response = await request(app).get('/api/reviews');

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { message: 'No token provided' });
  });

  // Verify that mine=true uses the authenticated user ID
  it('returns the current user reviews', async () => {
    const queryMock = mockQuery([communityReview]);

    const response = await request(app)
      .get('/api/reviews?mine=true')
      .set('Cookie', userCookie);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [communityReview]);
    assert.deepEqual(queryMock.mock.calls[0].arguments[1], [7]);
  });

  it('returns one review by id', async () => {
    const queryMock = mockQuery([communityReview]);

    const response = await request(app)
      .get('/api/reviews/10')
      .set('Cookie', userCookie);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, communityReview);
    assert.deepEqual(queryMock.mock.calls[0].arguments[1], [10]);
  });

  // The route must use the JWT user ID rather than a user_id from the request body
  it('creates a review using the authenticated user id', async () => {
    const queryMock = mockQuery([review]);

    const response = await request(app)
      .post('/api/reviews')
      .set('Cookie', userCookie)
      .send({
        route_id: 3,
        review_rating: 4.5,
        comment: '  Safe and comfortable route.  ',
        user_id: 999,
      });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body, review);
    assert.deepEqual(queryMock.mock.calls[0].arguments[1], [
      3, 7, 4.5, 'Safe and comfortable route.',
    ]);
  });

  // Ratings outside the accepted range should fail before querying the database
  it('rejects a rating outside 0 to 5', async () => {
    const response = await request(app)
      .post('/api/reviews')
      .set('Cookie', userCookie)
      .send({ route_id: 3, review_rating: 6 });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'review_rating must be between 0 and 5',
    });
  });

  // Include the user ID in the query so users can only update their own reviews
  it('updates a review owned by the authenticated user', async () => {
    const updatedReview = { ...review, review_rating: 5, comment: 'Updated' };
    const queryMock = mockQuery([updatedReview]);

    const response = await request(app)
      .patch('/api/reviews/10')
      .set('Cookie', userCookie)
      .send({ review_rating: 5, comment: 'Updated' });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, updatedReview);
    assert.deepEqual(queryMock.mock.calls[0].arguments[1], [
      true, 5, true, 'Updated', 10, 7,
    ]);
  });

  // Include the user ID in the query so users can only delete their own review
  it('deletes a review owned by the authenticated user', async () => {
    const queryMock = mockQuery([{ review_id: 10 }]);

    const response = await request(app)
      .delete('/api/reviews/10')
      .set('Cookie', userCookie);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Review deleted' });
    assert.deepEqual(queryMock.mock.calls[0].arguments[1], [10, 7]);
  });
});