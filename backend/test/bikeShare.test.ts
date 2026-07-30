import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app';
import { bikeShareCache } from '../routes/bikeShare'; 

describe('Bike Share Router', () => {
  beforeEach(() => {
    bikeShareCache.flushAll();
  });

  describe('GET /api/bikeShare/lime/stations', () => {
    const validParams = '?north=49.3&south=49.1&east=-123.0&west=-123.2';

    const mockStationInfo = {
      data: {
        stations: [
          { station_id: 'st-1', name: 'Waterfront', lat: 49.28, lon: -123.11 },
          { station_id: 'st-2', name: 'Burnaby Lake', lat: 49.25, lon: -122.95 },
        ],
      },
    };

    const mockStationStatus = {
      data: {
        stations: [
          {
            station_id: 'st-1',
            num_vehicles_available: 5,
            num_docks_available: 10,
            vehicle_types_available: [{ vehicle_type_id: 'vt-ebike', count: 5 }],
          },
        ],
      },
    };

    const mockVehicleTypes = {
      data: {
        vehicle_types: [
          { vehicle_type_id: 'vt-ebike', form_factor: 'bicycle', propulsion_type: 'electric', max_range_meters: 10000 },
        ],
      },
    };

    it('returns 400 if bounding box parameters are missing or invalid', async () => {
      const res = await request(app).get('/api/bikeShare/lime/stations?north=49.3&south=invalid');
      
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, { error: 'Invalid bounding box parameters' });
    });

    it('fetches, cleans, and filters station data within the bounding box', async (t) => {
      t.mock.method(globalThis, 'fetch', async (url: string) => {
        if (url.includes('station_information')) {
          return new Response(JSON.stringify(mockStationInfo), { status: 200 });
        }
        if (url.includes('station_status')) {
          return new Response(JSON.stringify(mockStationStatus), { status: 200 });
        }
        if (url.includes('vehicle_types')) {
          return new Response(JSON.stringify(mockVehicleTypes), { status: 200 });
        }
        return new Response(null, { status: 404 });
      });

      const res = await request(app).get(`/api/bikeShare/lime/stations${validParams}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.deepEqual(res.body[0], {
        station_id: 'st-1',
        name: 'Waterfront',
        lat: 49.28,
        lon: -123.11,
        num_vehicles_available: 5,
        vehicle_type_available: 'bicycle',
        num_docks_available: 10,
      });
    });

    it('returns 502 if any downstream Lime endpoint fails', async (t) => {
      t.mock.method(globalThis, 'fetch', async () => {
        return new Response(null, { status: 500 });
      });

      const res = await request(app).get(`/api/bikeShare/lime/stations${validParams}`);

      assert.equal(res.status, 502);
      assert.deepEqual(res.body, {
        status: 'error',
        error: 'Failed to fetch station data from provider.',
      });
    });
  });

  describe('GET /api/bikeShare/lime/freeBikes', () => {
    const validParams = '?north=49.3&south=49.1&east=-123.0&west=-123.2';

    const mockFreeBikes = {
      data: {
        bikes: [
          {
            bike_id: 'bike-1',
            lat: 49.28,
            lon: -123.12,
            is_reserved: false,
            is_disabled: false,
            current_range_meters: 5000,
            vehicle_type_id: 'v-1',
            vehicle_type: 'bike',
            last_reported: 1600000000,
          },
          {
            bike_id: 'bike-2',
            lat: 48.00, // Outside bounds
            lon: -123.12,
            is_reserved: false,
            is_disabled: false,
            current_range_meters: 5000,
            vehicle_type_id: 'v-1',
            vehicle_type: 'bike',
            last_reported: 1600000000,
          },
        ],
      },
    };

    it('returns 400 if bounding box parameters are missing or invalid', async () => {
      const res = await request(app).get('/api/bikeShare/lime/freeBikes');
      
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, { error: 'Invalid bounding box parameters' });
    });

    it('fetches and filters free-floating bikes within bounding box', async (t) => {
      t.mock.method(globalThis, 'fetch', async () => {
        return new Response(JSON.stringify(mockFreeBikes), { status: 200 });
      });

      const res = await request(app).get(`/api/bikeShare/lime/freeBikes${validParams}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.deepEqual(res.body[0], {
        bike_id: 'bike-1',
        lat: 49.28,
        lon: -123.12,
        is_reserved: false,
        is_disabled: false,
        vehicle_type: 'bike',
      });
    });

    it('returns 502 if upstream free_bike_status fails', async (t) => {
      t.mock.method(globalThis, 'fetch', async () => {
        return new Response(null, { status: 502 });
      });

      const res = await request(app).get(`/api/bikeShare/lime/freeBikes${validParams}`);

      assert.equal(res.status, 502);
      assert.deepEqual(res.body, {
        status: 'error',
        error: 'Failed to fetch bike data from provider.',
      });
    });
  });
});