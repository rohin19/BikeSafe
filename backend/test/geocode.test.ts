import { describe, it, after, afterEach, mock } from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from '../app'

const originalOrsApiKey = process.env.ORS_API_KEY;
process.env.ORS_API_KEY = 'geocode-route-test-key';

after(() => {
    if (originalOrsApiKey === undefined) {
        delete process.env.ORS_API_KEY;
    } else {
        process.env.ORS_API_KEY = originalOrsApiKey;
    }
});

afterEach(() => {
    mock.restoreAll();
});

// geocode.ts has no database at all ~ it only ever calls the real ORS API via global fetch, so that's what needs mocking here
function mockFetch(implementation: (...args: unknown[]) => Promise<unknown>) {
    return mock.method(globalThis, 'fetch', implementation as any);
}

// a fake fetch Response -> only needs .ok and .json() since that's all geocode.ts actually reads off it
function fakeOrsResponse(body: unknown, ok = true) {
    return { ok, json: async () => body };
}

// ORS returns coordinates as [lon, lat] (GeoJSON order) -> the opposite of this app's {lat, lon} convention
function orsFeature(lat: number, lon: number, label: string) {
    return {
        geometry: { coordinates: [lon, lat] },
        properties: { label },
    };
}

describe('GET /api/routes/geocode/search', () => {
    it('Returns 400 when q is missing', async () => {
        const response = await request(app).get('/api/routes/geocode/search');
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'q query param is required' });
    });

    it('Forward geocodes a query into cleaned {lat, lon, label} results, correctly flipping ORS coordinate order', async () => {
        mockFetch(async () => fakeOrsResponse({
            features: [
                orsFeature(49.2819, -123.1187, 'Vancouver, BC, Canada'),
                orsFeature(45.6325, -122.5431, 'Vancouver, WA, USA'),
            ],
        }));

        const response = await request(app).get('/api/routes/geocode/search?q=Vancouver');

        assert.equal(response.status, 200);
        assert.match(response.header['content-type'], /json/);
        assert.deepEqual(response.body, [
            { lat: 49.2819, lon: -123.1187, label: 'Vancouver, BC, Canada' },
            { lat: 45.6325, lon: -122.5431, label: 'Vancouver, WA, USA' },
        ]);
    });

    it('sends the query text and api key to ORS as query params', async () => {
        const fetchMock = mockFetch(async () => fakeOrsResponse({ features: [] }));

        await request(app).get('/api/routes/geocode/search?q=Robson%20Street');

        const requestedUrl = String(fetchMock.mock.calls[0].arguments[0]);
        assert.match(requestedUrl, /text=Robson\+Street|text=Robson%20Street/);
        assert.match(requestedUrl, /api_key=geocode-route-test-key/);
    });

    it('returns 500 when ORS is unreachable', async () => {
        mockFetch(async () => { throw new Error('network error'); });

        const response = await request(app).get('/api/routes/geocode/search?q=Vancouver');

        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to geocode search (OpenRouteService API error)' });
    });

    it('returns 500 when the ORS response is missing features', async () => {
        mockFetch(async () => fakeOrsResponse({})); // no `features` field at all

        const response = await request(app).get('/api/routes/geocode/search?q=Vancouver');

        assert.equal(response.status, 500);
    });
});

describe('GET /api/routes/geocode/reverse', () => {
    it('returns 400 when lat/lon are missing or not numeric', async () => {
        const response = await request(app).get('/api/routes/geocode/reverse?lat=abc&lon=-123.12');
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'lat and lon query params are required and must be valid numbers' });
    });

    it('Reverse geocodes a point into a single {lat, lon, label} object, not an array', async () => {
        mockFetch(async () => fakeOrsResponse({
            features: [orsFeature(49.2827, -123.1207, 'Robson Square, Vancouver, BC')],
        }));

        const response = await request(app).get('/api/routes/geocode/reverse?lat=49.2827&lon=-123.1207');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { lat: 49.2827, lon: -123.1207, label: 'Robson Square, Vancouver, BC' });
    });

    it('Returns null when ORS finds no nearby address', async () => {
        mockFetch(async () => fakeOrsResponse({ features: [] }));

        const response = await request(app).get('/api/routes/geocode/reverse?lat=49.2827&lon=-123.1207');

        assert.equal(response.status, 200);
        assert.equal(response.body, null);
    });

    it('sends point.lat and point.lon to ORS as query params', async () => {
        const fetchMock = mockFetch(async () => fakeOrsResponse({ features: [] }));

        await request(app).get('/api/routes/geocode/reverse?lat=49.2827&lon=-123.1207');

        const requestedUrl = String(fetchMock.mock.calls[0].arguments[0]);
        assert.match(requestedUrl, /point\.lat=49\.2827/);
        assert.match(requestedUrl, /point\.lon=-123\.1207/);
    });

    it('returns 500 when ORS is unreachable', async () => {
        mockFetch(async () => { throw new Error('network error'); });

        const response = await request(app).get('/api/routes/geocode/reverse?lat=49.2827&lon=-123.1207');

        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to geocode reverse search (OpenRouteService API error)' });
    });
});
