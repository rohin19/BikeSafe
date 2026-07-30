import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

import app from '../app';
import spec from '../swagger';

interface OpenApiOperation {
  requestBody?: unknown;
}

interface OpenApiPath {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
}

interface OpenApiDocument {
  openapi: string;
  paths: Record<string, OpenApiPath>;
}

const doc = spec as OpenApiDocument;

describe('OpenAPI specification', () => {
  it('is a valid OpenAPI 3 document', () => {
    assert.match(doc.openapi, /^3\./);
  });

  it('documents every hazard route', () => {
    assert.ok(doc.paths['/api/hazards']?.get, 'GET /api/hazards missing');
    assert.ok(doc.paths['/api/hazards']?.post, 'POST /api/hazards missing');
    assert.ok(doc.paths['/api/hazards/stats']?.get, 'GET /api/hazards/stats missing');
    assert.ok(doc.paths['/api/hazards/{id}']?.get, 'GET /api/hazards/{id} missing');
    assert.ok(doc.paths['/api/hazards/{id}']?.patch, 'PATCH /api/hazards/{id} missing');
    assert.ok(doc.paths['/api/hazards/{id}']?.delete, 'DELETE /api/hazards/{id} missing');
  });

  it('documents the POST and PATCH request bodies', () => {
    assert.ok(doc.paths['/api/hazards']?.post?.requestBody);
    assert.ok(doc.paths['/api/hazards/{id}']?.patch?.requestBody);
  });
});

describe('OpenAPI endpoints', () => {
  it('serves the raw specification and Swagger UI', async () => {
    const specResponse = await request(app).get('/openapi.json');
    assert.equal(specResponse.status, 200);
    assert.equal(specResponse.body.openapi, '3.0.0');

    const swaggerResponse = await request(app).get('/api-docs/');
    assert.equal(swaggerResponse.status, 200);
    assert.match(swaggerResponse.headers['content-type'], /html/);
  });
});

describe('Exported OpenAPI document', () => {
  it('matches the generated specification', () => {
    const exportPath = path.resolve(__dirname, '..', 'openapi.json');
    assert.ok(fs.existsSync(exportPath), 'Run npm run docs:export first');

    const exportedDoc = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    assert.deepEqual(exportedDoc, spec);
  });
});