import { describe, it, after, afterEach, mock } from "node:test";
import assert, { equal } from "node:assert";
import jwt from 'jsonwebtoken'
import request from "supertest";
import app from '../app'
import { pool } from '../db'

const originalJwtSecret = process.env.JWT_SECRET;
const testJwtSecret = 'admin-route-test-secret'
process.env.JWT_SECRET = testJwtSecret;

function createAuthCookie(userId: number, role: 'user' | 'admin'): string {
    const token = jwt.sign(
        {user_id: userId, role},
        testJwtSecret,
        {expiresIn: '1h'}
    );
    return `token=${token}`;
}

const userCookie = createAuthCookie(7, 'user');
const adminCookie = createAuthCookie(1, 'admin');

function databaseResult(rows: unknown[]) {
    return { command: 'SELECT', rowCount: rows.length, oid: 0, fields: [], rows};
}

function mockPoolQuery(implementation: (...args:unknown[]) => Promise<unknown>) {
    return mock.method(pool, 'query', implementation as any);
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
    pool.end();
});

describe('requireAdmin middleware', () => {
    it('returns 401 with no token', async () => {
        const response = await request(app).get('api/admin/users');
        assert.equal(response.status, 401);
        assert.deepEqual(response.body, { message: 'No token provided' });
    });

    it('returns 403 when role is user', async () => {
        const response = await request(app)
            .get('api/admin/users')
            .set('Cookie', userCookie);
        assert.equal(response.status, 403);
        assert.deepEqual(response.body, { error: 'Forbidden' });
    });

    it('passes through when role is admin', async () => {
        mockPoolQuery(async () => databaseResult([]));
        const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', adminCookie);
        assert.equal(response.status, 200);
    });
})