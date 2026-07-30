import { after, afterEach, describe, it, mock } from 'node:test';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app';
import { pool } from '../db';

// mock hazard
const mockHazard = {
  hazard_id: 1,
  user_id: 2,
  title: 'Pothole on Main Street',
  description: 'Large pothole in the eastbound bike lane.',
  category: 'Road Condition',
  current_status: 'reported',
  severity: 3,
  latitude: '49.282700',
  longitude: '-123.120700',
  image_url: null,
  created_at: '2026-07-29T12:00:00.000Z'
};

// set a test JWT secret for signing tokens
const originalJwtSecret = process.env.JWT_SECRET;
const testJwtSecret = 'hazard-route-test-secret';
process.env.JWT_SECRET = testJwtSecret;

const validHazardInput = {
  title: 'Construction blocking bike lane',
  description: 'Equipment is blocking the eastbound bike lane.',
  category: 'Construction',
  severity: 4,
  latitude: 49.2827,
  longitude: -123.1207,
  image_url: null
};

const validHazardUpdate = {
  ...validHazardInput,
  current_status: 'in_progress'
};

function createAuthCookie(userId: number, role: 'user' | 'admin'): string {
  const token = jwt.sign({user_id: userId, role}, testJwtSecret, {expiresIn: '1h'});
  return `token=${token}`;
}

const userCookie = createAuthCookie(7, 'user');
const adminCookie = createAuthCookie(1, 'admin');

// mock db result to return a specific set of rows
function databaseResult(rows: unknown[]) {
  return {command: 'SELECT', rowCount: rows.length, oid: 0, fields: [], rows};
}

// mock pool.query to return a specific result for testing
function mockPoolQuery(implementation: (...args: unknown[]) => Promise<unknown>) {
  return mock.method(pool, 'query', implementation as any);
}

// restore the original pool.query after each test
afterEach(() => {
  mock.restoreAll();
});

// restore the original JWT secret after all tests
after(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});


// GET tests

// test get hazards
describe('GET /api/hazards', () => {
  it('returns all hazards supplied by the database', async () => {
    const queryMock = mockPoolQuery(async () =>
      databaseResult([mockHazard])
    );

    const response = await request(app).get('/api/hazards');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /json/);
    assert.deepEqual(response.body, [mockHazard]);
    assert.equal(queryMock.mock.callCount(), 1);
  });

  it('returns an empty array when no hazards exist', async () => {
    mockPoolQuery(async () => databaseResult([]));

    const response = await request(app).get('/api/hazards');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  it('returns 500 when the database query fails', async () => {
    mockPoolQuery(async () => {
      throw new Error('Database unavailable');
    });

    const response = await request(app).get('/api/hazards');

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, {
      error: 'Failed to fetch hazards'
    });
  });
});

// test get hazard stats
describe('GET /api/hazards/stats', () => {
  it('returns total, category, and status statistics', async () => {
    const databaseResponses = [
      databaseResult([{ totalhazards: '4' }]),
      databaseResult([
        { category: 'Construction', count: '3' },
        { category: 'Obstacle', count: '1' }
      ]),
      databaseResult([
        { current_status: 'reported', count: '3' },
        { current_status: 'resolved', count: '1' }
      ])
    ];
    let queryIndex = 0;
    const queryMock = mockPoolQuery(async () => {
      const result = databaseResponses[queryIndex];
      queryIndex += 1;
      return result;
    });

    const response = await request(app).get('/api/hazards/stats');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /json/);
    assert.deepEqual(response.body, {
      totalHazards: [{ totalhazards: '4' }],
      categories: [
        { category: 'Construction', count: '3' },
        { category: 'Obstacle', count: '1' }
      ],
      statuses: [
        { current_status: 'reported', count: '3' },
        { current_status: 'resolved', count: '1' }
      ]
    });
    assert.equal(queryMock.mock.callCount(), 3);
  });

  it('returns 500 when a statistics query fails', async () => {
    mockPoolQuery(async () => {
      throw new Error('Database unavailable');
    });

    const response = await request(app).get('/api/hazards/stats');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, {
      error: 'Fail to retrieve stats'
    });
  });
});

// test get hazard by id
describe('GET /api/hazards/:id', () => {
  it('returns a hazard by ID', async () => {
    const queryMock = mockPoolQuery(async () =>
      databaseResult([mockHazard])
    );

    const response = await request(app).get('/api/hazards/1');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [mockHazard]);
    assert.equal(queryMock.mock.callCount(), 1);

    const queryArguments = queryMock.mock.calls[0].arguments;
    assert.deepEqual(queryArguments[1], [1]);
  });

  it('returns 400 for an invalid hazard ID', async () => {
    const response = await request(app).get('/api/hazards/not-a-number');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Hazard ID must be positive integer'
    });
  });

  it('returns 400 when the hazard ID is zero', async () => {
    const response = await request(app).get('/api/hazards/0');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Hazard ID must be positive integer'
    });
  });

  it('returns 404 when the hazard does not exist', async () => {
    mockPoolQuery(async () => databaseResult([]));

    const response = await request(app).get('/api/hazards/999');

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      error: 'Hazard not found'
    });
  });

  it('returns 500 when the database query fails', async () => {
    mockPoolQuery(async () => {
      throw new Error('Database unavailable');
    });

    const response = await request(app).get('/api/hazards/1');

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, {
      error: 'Failed to retrieve hazard by id'
    });
  });
});


// POST tests

// test create hazard
describe('POST /api/hazards', () => {
  it('returns 401 when the user is not authenticated', async () => {
    const response = await request(app)
      .post('/api/hazards')
      .send(validHazardInput);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      message: 'No token provided'
    });
  });

  it('creates a hazard for the authenticated user', async () => {
    const createdHazard = {
      ...mockHazard,
      user_id: 7,
      title: validHazardInput.title,
      description: validHazardInput.description,
      category: validHazardInput.category,
      severity: validHazardInput.severity,
      latitude: String(validHazardInput.latitude),
      longitude: String(validHazardInput.longitude)
    };
    const queryMock = mockPoolQuery(async () =>
      databaseResult([createdHazard])
    );
    const response = await request(app)
      .post('/api/hazards')
      .set('Cookie', userCookie)
      .send({
        ...validHazardInput,
        // server should use the JWT user_id
        user_id: 999
      });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [createdHazard]);
    assert.equal(queryMock.mock.callCount(), 1);

    const queryArguments = queryMock.mock.calls[0].arguments;

    assert.match(String(queryArguments[0]), /INSERT INTO hazards/);
    assert.deepEqual(queryArguments[1], [
      7,
      validHazardInput.title,
      validHazardInput.description,
      validHazardInput.category,
      validHazardInput.severity,
      validHazardInput.latitude,
      validHazardInput.longitude,
      null
    ]);
  });

  it('returns 400 when the request body is missing', async () => {
    const response = await request(app)
      .post('/api/hazards')
      .set('Cookie', userCookie);

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Request body required'
    });
  });

  // tests all validation errors
  const invalidHazardCases = [
    {
      name: 'an empty title',
      body: {
        ...validHazardInput,
        title: '   '
      },
      expectedError: 'Title required'
    },
    {
      name: 'an empty description',
      body: {
        ...validHazardInput,
        description: ''
      },
      expectedError: 'Description required'
    },
    {
      name: 'an unsupported category',
      body: {
        ...validHazardInput,
        category: 'Flood'
      },
      expectedError: 'Invalid hazard category'
    },
    {
      name: 'severity below 1',
      body: {
        ...validHazardInput,
        severity: 0
      },
      expectedError: 'Severity must be an integer between 1 and 5'
    },
    {
      name: 'severity above 5',
      body: {
        ...validHazardInput,
        severity: 6
      },
      expectedError: 'Severity must be an integer between 1 and 5'
    },
    {
      name: 'a decimal severity',
      body: {
        ...validHazardInput,
        severity: 2.5
      },
      expectedError: 'Severity must be an integer between 1 and 5'
    },
    {
      name: 'latitude outside its range',
      body: {
        ...validHazardInput,
        latitude: 91
      },
      expectedError: 'Latitude must be a number between -90 and 90'
    },
    {
      name: 'longitude outside its range',
      body: {
        ...validHazardInput,
        longitude: -181
      },
      expectedError: 'Longitude must be a number between -180 and 180'
    }
  ];

  for (const testCase of invalidHazardCases) {
    it(`returns 400 for ${testCase.name}`, async () => {
      const response = await request(app)
        .post('/api/hazards')
        .set('Cookie', userCookie)
        .send(testCase.body);

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        error: testCase.expectedError
      });
    });
  }

  it('returns 500 when the database insert fails', async () => {
    mockPoolQuery(async () => {
      throw new Error('Database unavailable');
    });

    const response = await request(app)
      .post('/api/hazards')
      .set('Cookie', userCookie)
      .send(validHazardInput);

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, {
      error: 'Failed to add new hazard'
    });
  });
});

// Patch tests

// test updating a hazard
describe('PATCH /api/hazards/:id', () => {
  it('returns 401 when the user is not authenticated', async () => {
    const response = await request(app)
      .patch('/api/hazards/1')
      .send(validHazardUpdate);

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      message: 'No token provided'
    });
  });

  it('returns 403 when a non admin user attempts an update', async () => {
    const response = await request(app)
      .patch('/api/hazards/1')
      .set('Cookie', userCookie)
      .send(validHazardUpdate);

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
      error: 'Forbidden'
    });
  });

  it('returns 400 for an invalid hazard ID', async () => {
    const response = await request(app)
      .patch('/api/hazards/not-a-number')
      .set('Cookie', adminCookie)
      .send(validHazardUpdate);

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Hazard ID must be positive integer'
    });
  });

  it('returns 400 for an invalid hazard status', async () => {
    const response = await request(app)
      .patch('/api/hazards/1')
      .set('Cookie', adminCookie)
      .send({
        ...validHazardUpdate,
        current_status: 'approved'
      });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Invalid hazard status'
    });
  });

  it('returns 404 when the hazard does not exist', async () => {
    mockPoolQuery(async () => databaseResult([]));

    const response = await request(app)
      .patch('/api/hazards/999')
      .set('Cookie', adminCookie)
      .send(validHazardUpdate);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      error: 'Hazard not found'
    });
  });

  it('allows an admin to update a hazard', async () => {
    const updatedHazard = {
      ...mockHazard,
      title: validHazardUpdate.title,
      description: validHazardUpdate.description,
      category: validHazardUpdate.category,
      current_status: validHazardUpdate.current_status,
      severity: validHazardUpdate.severity,
      latitude: String(validHazardUpdate.latitude),
      longitude: String(validHazardUpdate.longitude)
    };

    const queryMock = mockPoolQuery(async () =>
      databaseResult([updatedHazard])
    );

    const response = await request(app)
      .patch('/api/hazards/1')
      .set('Cookie', adminCookie)
      .send(validHazardUpdate);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [updatedHazard]);
    assert.equal(queryMock.mock.callCount(), 1);

    const queryArguments = queryMock.mock.calls[0].arguments;

    assert.match(String(queryArguments[0]), /UPDATE hazards/);
    assert.deepEqual(queryArguments[1], [
      validHazardUpdate.title,
      validHazardUpdate.description,
      validHazardUpdate.category,
      validHazardUpdate.current_status,
      validHazardUpdate.severity,
      validHazardUpdate.latitude,
      validHazardUpdate.longitude,
      null,
      1
    ]);
  });

  it('returns 500 when the database update fails', async () => {
    mockPoolQuery(async () => {
      throw new Error('Database unavailable');
    });

    const response = await request(app)
      .patch('/api/hazards/1')
      .set('Cookie', adminCookie)
      .send(validHazardUpdate);

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, {
      error: 'Failed to update hazard'
    });
  });
});

// DELETE tests

// test deleting a hazard
describe('DELETE /api/hazards/:id', () => {
  it('returns 401 when the user is not authenticated', async () => {
    const response = await request(app).delete('/api/hazards/1');

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      message: 'No token provided'
    });
  });

  it('returns 403 when a regular user attempts deletion', async () => {
    const response = await request(app)
      .delete('/api/hazards/1')
      .set('Cookie', userCookie);

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
      error: 'Forbidden'
    });
  });

  it('returns 400 for an invalid hazard ID', async () => {
    const response = await request(app)
      .delete('/api/hazards/not-a-number')
      .set('Cookie', adminCookie);

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Hazard ID must be positive integer'
    });
  });

  it('returns 404 when the hazard does not exist', async () => {
    mockPoolQuery(async () => databaseResult([]));

    const response = await request(app)
      .delete('/api/hazards/999')
      .set('Cookie', adminCookie);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      error: 'Hazard not found'
    });
  });

  it('allows an admin to delete a hazard', async () => {
    const queryMock = mockPoolQuery(async () =>
      databaseResult([mockHazard])
    );

    const response = await request(app)
      .delete('/api/hazards/1')
      .set('Cookie', adminCookie);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [mockHazard]);
    assert.equal(queryMock.mock.callCount(), 1);

    const queryArguments = queryMock.mock.calls[0].arguments;
    assert.match(String(queryArguments[0]), /DELETE FROM hazards/);
    assert.deepEqual(queryArguments[1], [1]);
  });

  it('returns 500 when the database deletion fails', async () => {
    mockPoolQuery(async () => {
      throw new Error('Database unavailable');
    });

    const response = await request(app)
      .delete('/api/hazards/1')
      .set('Cookie', adminCookie);

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, {
      error: 'Failed to delete hazard'
    });
  });
});