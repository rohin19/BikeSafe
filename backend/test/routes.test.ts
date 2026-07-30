import { describe, it, after, afterEach, mock } from "node:test";
import assert from "node:assert";
import jwt from 'jsonwebtoken'
import request from "supertest";
import app from '../app'
import { pool } from '../db'
import { haversineDistanceMeters, minDistanceToPath, hazardToPolygon, computeSafetyScore } from '../routes/routes'

const originalJwtSecret = process.env.JWT_SECRET;
const testJwtSecret = 'routes-route-test-secret'
process.env.JWT_SECRET = testJwtSecret;

const originalOrsApiKey = process.env.ORS_API_KEY;
process.env.ORS_API_KEY = 'routes-route-test-key';

function createAuthCookie(userId: number, role: 'user' | 'admin'): string {
    const token = jwt.sign(
        {user_id: userId, role},
        testJwtSecret,
        {expiresIn: '1h'}
    );
    return `token=${token}`;
}

function databaseResult(rows: unknown[]) {
    return { command: 'SELECT', rowCount: rows.length, oid: 0, fields: [], rows};
}

function mockPoolQuery(implementation: (...args:unknown[]) => Promise<unknown>) {
    return mock.method(pool, 'query', implementation as any);
}

function mockFetch(implementation: (...args: unknown[]) => Promise<unknown>) {
    return mock.method(globalThis, 'fetch', implementation as any);
}

function fakeOrsResponse(body: unknown, ok = true) {
    return { ok, json: async () => body };
}

// one ORS directions "feature" - a LineString path plus summary/ascent, matching what routesRouter's /directions reads off it
function orsDirectionsFeature(coordinates: [number, number][], distance: number, duration: number, ascent = 0) {
    return {
        geometry: { coordinates },
        properties: { summary: { distance, duration }, ascent },
    };
}

afterEach(() => {
    mock.restoreAll();
});

after(() => {
    if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = originalJwtSecret;
    }
    if (originalOrsApiKey === undefined) {
        delete process.env.ORS_API_KEY;
    } else {
        process.env.ORS_API_KEY = originalOrsApiKey;
    }
    pool.end();
});

// ---- Pure function tests: no mocking at all, just call and check the math ----

describe('haversineDistanceMeters', () => {
    it('returns 0 for identical points', () => {
        assert.equal(haversineDistanceMeters(49.2827, -123.1207, 49.2827, -123.1207), 0);
    });

    it('is symmetric', () => {
        const a = haversineDistanceMeters(49.2827, -123.1207, 49.2820, -123.1150);
        const b = haversineDistanceMeters(49.2820, -123.1150, 49.2827, -123.1207);
        assert.equal(a, b);
    });

    it('matches the well-known ~111.2km per degree of latitude', () => {
        // same longitude, exactly 1 degree of latitude apart - a standard sanity check for a haversine implementation
        const dist = haversineDistanceMeters(49.0, -123.0, 50.0, -123.0);
        assert.ok(Math.abs(dist - 111195) < 50, `expected ~111195m, got ${dist}`);
    });
});

describe('minDistanceToPath', () => {
    it('returns the distance to the closest point in the path, not just the first or last', () => {
        const path = [
            { lat: 49.30, lon: -123.20 }, // far
            { lat: 49.2827, lon: -123.1207 }, // exact match - closest
            { lat: 49.25, lon: -123.05 }, // far
        ];
        const dist = minDistanceToPath(49.2827, -123.1207, path);
        assert.equal(dist, 0);
    });

    it('returns Infinity for an empty path (no points to compare against)', () => {
        assert.equal(minDistanceToPath(49.2827, -123.1207, []), Infinity);
    });
});

describe('hazardToPolygon', () => {
    it('returns a closed 5-point ring (first and last point identical)', () => {
        const polygon = hazardToPolygon(49.2827, -123.1207);
        assert.equal(polygon.length, 5);
        assert.deepEqual(polygon[0], polygon[4]);
    });

    it('is a rectangle symmetric around the input point', () => {
        const lat = 49.2827;
        const lon = -123.1207;
        const polygon = hazardToPolygon(lat, lon);

        const lons = polygon.slice(0, 4).map((point) => point[0]);
        const lats = polygon.slice(0, 4).map((point) => point[1]);

        // exactly two distinct lon values and two distinct lat values, each equidistant from the center
        const uniqueLons = [...new Set(lons)];
        const uniqueLats = [...new Set(lats)];
        assert.equal(uniqueLons.length, 2);
        assert.equal(uniqueLats.length, 2);
        assert.ok(Math.abs((uniqueLons[0] - lon) + (uniqueLons[1] - lon)) < 1e-9); // symmetric around lon
        assert.ok(Math.abs((uniqueLats[0] - lat) + (uniqueLats[1] - lat)) < 1e-9); // symmetric around lat
    });
});

// ---- computeSafetyScore: not pure (queries the DB), but callable directly now that it's exported - no HTTP layer needed ----

describe('computeSafetyScore', () => {
    const samplePath = [{ lat: 49.2827, lon: -123.1207 }, { lat: 49.2820, lon: -123.1150 }];

    it('returns 100 when there are no hazards', async () => {
        mockPoolQuery(async () => databaseResult([]));
        const score = await computeSafetyScore(samplePath);
        assert.equal(score, 100);
    });

    it('does not penalize a hazard far from the path', async () => {
        mockPoolQuery(async () => databaseResult([
            { latitude: 51.0, longitude: -120.0, severity: 5 }, // far away
        ]));
        const score = await computeSafetyScore(samplePath);
        assert.equal(score, 100);
    });

    it('penalizes a hazard close to the path, weighted by severity', async () => {
        mockPoolQuery(async () => databaseResult([
            { latitude: 49.2827, longitude: -123.1207, severity: 4 }, // right on the path
        ]));
        const score = await computeSafetyScore(samplePath);
        assert.equal(score, 100 - 4 * 3); // matches the severity * 3 penalty in routes.ts
    });

    it('never goes below 0, even with many severe nearby hazards', async () => {
        const manyHazards = Array.from({ length: 20 }, () => ({
            latitude: 49.2827, longitude: -123.1207, severity: 5,
        }));
        mockPoolQuery(async () => databaseResult(manyHazards));
        const score = await computeSafetyScore(samplePath);
        assert.equal(score, 0);
    });
});

// ---- CRUD endpoints: same recipe as admin.test.ts/auth.test.ts - mock pool.query, supertest against app ----

const mockRoute = {
    route_id: 1,
    start_name: 'Science World',
    start_latitude: 49.273468,
    start_longitude: -123.102911,
    destination_name: 'BC Place',
    destination_latitude: 49.276721,
    destination_longitude: -123.112381,
    elevation: 42,
    distance: 918.1,
    duration: 207.5,
    safety_score: 90,
    created_by: 7,
};

describe('GET /api/routes', () => {
    it('returns all routes with no auth required', async () => {
        mockPoolQuery(async () => databaseResult([mockRoute]));
        const response = await request(app).get('/api/routes');
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, [mockRoute]);
    });

    it('returns 500 when the database query fails', async () => {
        mockPoolQuery(async () => { throw new Error('Database unavailable'); });
        const response = await request(app).get('/api/routes');
        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to fetch routes' });
    });
});

describe('GET /api/routes/mine', () => {
    it('returns 401 with no auth cookie', async () => {
        const response = await request(app).get('/api/routes/mine');
        assert.equal(response.status, 401);
    });

    it('returns only routes created by the logged-in user', async () => {
        const queryMock = mockPoolQuery(async () => databaseResult([mockRoute]));

        const response = await request(app)
            .get('/api/routes/mine')
            .set('Cookie', createAuthCookie(7, 'user'));

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, [mockRoute]);
        assert.deepEqual(queryMock.mock.calls[0].arguments[1], [7]); // filtered by the logged-in user's id, not a client-supplied one
    });
});

describe('GET /api/routes/:id', () => {
    it('returns 404 when the route does not exist', async () => {
        mockPoolQuery(async () => databaseResult([]));
        const response = await request(app).get('/api/routes/999999');
        assert.equal(response.status, 404);
        assert.deepEqual(response.body, { error: 'Route not found' });
    });

    it('returns the route wrapped in an array on success', async () => {
        mockPoolQuery(async () => databaseResult([mockRoute]));
        const response = await request(app).get('/api/routes/1');
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, [mockRoute]); // intentionally an array, not a single object - matches this route's existing convention
    });
});

describe('POST /api/routes', () => {
    it('returns 400 when created_by is not a valid number', async () => {
        const response = await request(app)
            .post('/api/routes')
            .send({ ...mockRoute, created_by: 'not-a-number' });

        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'created_by must be a valid user id' });
    });

    it('creates a route and coerces created_by to a number', async () => {
        const queryMock = mockPoolQuery(async () => databaseResult([mockRoute]));

        const response = await request(app)
            .post('/api/routes')
            .send({ ...mockRoute, created_by: '7' }); // sent as a string

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, [mockRoute]);

        const insertedParams = queryMock.mock.calls[0].arguments[1] as unknown[];
        assert.equal(insertedParams[insertedParams.length - 1], 7); // coerced to a real number, not the string "7"
    });

    it('returns 500 when the insert fails', async () => {
        mockPoolQuery(async () => { throw new Error('Database unavailable'); });
        const response = await request(app).post('/api/routes').send(mockRoute);
        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to add new route' });
    });
});

describe('DELETE /api/routes/:id', () => {
    it('returns 401 with no auth cookie', async () => {
        const response = await request(app).delete('/api/routes/1');
        assert.equal(response.status, 401);
    });

    it('scopes the delete to the owner for a regular user', async () => {
        const queryMock = mockPoolQuery(async () => databaseResult([mockRoute]));

        const response = await request(app)
            .delete('/api/routes/1')
            .set('Cookie', createAuthCookie(7, 'user'));

        assert.equal(response.status, 200);
        const [sql, params] = queryMock.mock.calls[0].arguments as [string, unknown[]];
        assert.match(sql, /AND created_by = \$2/);
        assert.deepEqual(params, ['1', 7]);
    });

    it('lets an admin delete any route, without an ownership filter', async () => {
        const queryMock = mockPoolQuery(async () => databaseResult([mockRoute]));

        const response = await request(app)
            .delete('/api/routes/1')
            .set('Cookie', createAuthCookie(1, 'admin'));

        assert.equal(response.status, 200);
        const [sql, params] = queryMock.mock.calls[0].arguments as [string, unknown[]];
        assert.doesNotMatch(sql, /created_by/);
        assert.deepEqual(params, ['1']);
    });

    it('returns 404 when the route does not exist or is not owned by this user', async () => {
        mockPoolQuery(async () => databaseResult([]));

        const response = await request(app)
            .delete('/api/routes/1')
            .set('Cookie', createAuthCookie(7, 'user'));

        assert.equal(response.status, 404);
        assert.deepEqual(response.body, { error: 'Route not found' });
    });
});

// ---- POST /api/routes/directions: mocks BOTH pool.query (hazard lookups) and fetch (ORS) together ----

describe('POST /api/routes/directions', () => {
    const start = { lat: 49.2827, lon: -123.1207 };
    const end = { lat: 49.2820, lon: -123.1150 };
    const samplePath: [number, number][] = [[-123.1207, 49.2827], [-123.1150, 49.2820]];

    // routes both the bounding-box hazard lookup and computeSafetyScore's own hazards query through one mock, branching on SQL text
    function mockHazardQueries(nearbyRows: unknown[], allHazardRows: unknown[] = []) {
        return mockPoolQuery(async (sql: unknown) => {
            if (String(sql).includes('severity')) {
                return databaseResult(allHazardRows); // computeSafetyScore's unconditional query
            }
            return databaseResult(nearbyRows); // the padded bounding-box query for avoid_polygons
        });
    }

    it('returns 400 when start/end are missing valid lat/lon', async () => {
        const response = await request(app)
            .post('/api/routes/directions')
            .send({ start: { lat: 'abc', lon: -123 }, end });

        assert.equal(response.status, 400);
    });

    it('calls ORS only once when there are no nearby hazards to avoid', async () => {
        mockHazardQueries([]); // no nearby hazards

        const fetchMock = mockFetch(async () => fakeOrsResponse({
            features: [orsDirectionsFeature(samplePath, 918.1, 207.5, 42)],
        }));

        const response = await request(app)
            .post('/api/routes/directions')
            .send({ start, end });

        assert.equal(response.status, 200);
        assert.equal(fetchMock.mock.callCount(), 1); // no point doubling up when nothing needs avoiding
        assert.equal(response.body.alternatives.length, 1);
        assert.equal(response.body.alternatives[0].avoidedHazards, false);
        assert.equal(response.body.alternatives[0].safetyScore, 100);
    });

    it('calls ORS twice and merges both result sets when a nearby hazard exists', async () => {
        mockHazardQueries([{ latitude: 49.2823, longitude: -123.118 }]); // one nearby hazard

        const fetchMock = mockFetch(async (url: unknown, options: unknown) => {
            const body = JSON.parse((options as { body: string }).body);
            const avoiding = Boolean(body.options?.avoid_polygons);
            return fakeOrsResponse({
                features: [orsDirectionsFeature(samplePath, avoiding ? 950 : 918.1, avoiding ? 220 : 207.5)],
            });
        });

        const response = await request(app)
            .post('/api/routes/directions')
            .send({ start, end });

        assert.equal(response.status, 200);
        assert.equal(fetchMock.mock.callCount(), 2);
        assert.equal(response.body.alternatives.length, 2);
        assert.equal(response.body.alternatives[0].avoidedHazards, true);
        assert.equal(response.body.alternatives[0].distance, 950);
        assert.equal(response.body.alternatives[1].avoidedHazards, false);
        assert.equal(response.body.alternatives[1].distance, 918.1);
    });

    it('falls back gracefully when the hazard-avoiding request finds no viable route', async () => {
        mockHazardQueries([{ latitude: 49.2823, longitude: -123.118 }]);

        const fetchMock = mockFetch(async (url: unknown, options: unknown) => {
            const body = JSON.parse((options as { body: string }).body);
            const avoiding = Boolean(body.options?.avoid_polygons);
            if (avoiding) return fakeOrsResponse({}, false); // no route found around the hazard
            return fakeOrsResponse({ features: [orsDirectionsFeature(samplePath, 918.1, 207.5)] });
        });

        const response = await request(app)
            .post('/api/routes/directions')
            .send({ start, end });

        assert.equal(response.status, 200);
        assert.equal(fetchMock.mock.callCount(), 2); // both were attempted
        assert.equal(response.body.alternatives.length, 1); // only the direct call's result survives
        assert.equal(response.body.alternatives[0].avoidedHazards, false);
    });

    it('requests alternative_routes from ORS on every call', async () => {
        mockHazardQueries([]);
        const fetchMock = mockFetch(async (url: unknown, options: unknown) => {
            const body = JSON.parse((options as { body: string }).body);
            assert.ok(body.alternative_routes);
            assert.equal(body.elevation, true);
            return fakeOrsResponse({ features: [orsDirectionsFeature(samplePath, 918.1, 207.5)] });
        });

        await request(app).post('/api/routes/directions').send({ start, end });
        assert.equal(fetchMock.mock.callCount(), 1);
    });

    it('returns 500 when ORS is unreachable', async () => {
        mockHazardQueries([]);
        mockFetch(async () => { throw new Error('network error'); });

        const response = await request(app)
            .post('/api/routes/directions')
            .send({ start, end });

        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to compute directions (OpenRouteService API Error)' });
    });
});
