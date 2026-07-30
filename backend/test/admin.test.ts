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

const mockUser = {
    user_id: 2,
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'user',
    created_at: '2026-07-29T12:00:00.00Z'
};

describe('requireAdmin middleware', () => {
    it('returns 401 with no token', async () => {
        const response = await request(app).get('/api/admin/users');
        assert.equal(response.status, 401);
        assert.deepEqual(response.body, { message: 'No token provided' });
    });

    it('returns 403 when role is user', async () => {
        const response = await request(app)
            .get('/api/admin/users')
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

describe('GET /api/admin/users', () => {
    it('returns all users from the database', async () => {
        const queryMock = mockPoolQuery(async () => databaseResult([mockUser]));

        const response = await request(app)
            .get('/api/admin/users')
            .set('Cookie', adminCookie);

        assert.equal(response.status, 200);
        assert.match(response.header['content-type'], /json/);
        assert.deepEqual(response.body, [mockUser]);
        assert.equal(queryMock.mock.callCount(), 1);
    });

    it('returns an empty array when no users exist', async () => {
        mockPoolQuery(async () => databaseResult([]));

        const response = await request(app)
            .get('/api/admin/users')
            .set('Cookie', adminCookie);

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, []);
    });

    it('Does not return hashed password', async () => {
        mockPoolQuery(async () => databaseResult([mockUser]));

        const response = await request(app)
            .get('/api/admin/users')
            .set('Cookie', adminCookie);

        assert.equal(response.status, 200);
        if (response.body.length > 0) {
            assert.equal('hashed_password' in response.body[0], false);
        }
    });

    it('returns 500 when database query fails', async () => {
        const queryMock = mockPoolQuery(async () => {
            throw new Error('Database unavailable');
        });

        const response = await request(app)
            .get('/api/admin/users')
            .set('Cookie', adminCookie);

        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to fetch users' });
    });
});

describe('DELETE /api/admin/users/:id', () => {
    it('returns 401 when user is not authenticated', async () => {
        const response = await request(app).delete('/api/admin/users/2');
        assert.equal(response.status, 401);
    });

    it('returns 403 when role is user', async () => {
        const response = await request(app)
            .delete('/api/admin/users/2')
            .set('Cookie', userCookie);
        assert.equal(response.status, 403);
    });

    it('returns 400 for non-numeric id', async () => {
        const response = await request(app)
            .delete('/api/admin/users/abc')
            .set('Cookie', adminCookie);
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'Invalid User Id' });
    });

    it('returns 400 when admin tries to delete themselves', async () => {
        const response = await request(app)
            .delete('/api/admin/users/1')
            .set('Cookie', adminCookie);
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'You cannot delete your own account' });
    });

    it('returns 404 when user does not exist', async () => {
        const queryMock = mockPoolQuery(async () => databaseResult([]));

        const response = await request(app)
            .delete('/api/admin/users/999999')
            .set('Cookie', adminCookie);
        assert.equal(response.status, 404);
        assert.deepEqual(response.body, { error: 'User not found' });
    });

    it('allows an admin to delete a user', async () => {
        const queryMock = mockPoolQuery(async () =>
            databaseResult([{ user_id: 2, name: mockUser.name, email: mockUser.email }])
        );

        const response = await request(app)
            .delete('/api/admin/users/2')
            .set('Cookie', adminCookie);

        assert.equal(response.status, 200);
        assert.equal(response.body.message, 'User deleted');
        assert.equal(response.body.deleted.user_id, 2);
        assert.equal(queryMock.mock.callCount(), 1);

        const queryArguments = queryMock.mock.calls[0].arguments;
        assert.match(String(queryArguments[0]), /DELETE FROM users/);
        assert.deepEqual(queryArguments[1], [2]);
    });

    it('returns 500 when the database deletion fails', async () => {
        mockPoolQuery(async () => { throw new Error('Database unavailable'); });

        const response = await request(app)
            .delete('/api/admin/users/2')
            .set('Cookie', adminCookie);

        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to delete user' });
    });
});

describe('PATCH /api/admin/users/:id/role', () => {
    it('returns 401 when user is not authenticated', async () => {
        const response = await request(app)
            .patch('/api/admin/users/2/role')
            .send({ role: 'admin' });
        assert.equal(response.status, 401);
    });

    it('returns 403 when role is user', async () => {
        const response = await request(app)
            .patch('/api/admin/users/2/role')
            .set('Cookie', userCookie)
            .send({ role: 'admin' });
        assert.equal(response.status, 403);
    });

    it('returns 400 for non-numeric id', async () => {
        const response = await request(app)
            .patch('/api/admin/users/abc/role')
            .set('Cookie', adminCookie)
            .send({ role: 'admin' });
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'Invalid User Id' });
    });

    it('returns 400 when admin tries to change their own role', async () => {
        const response = await request(app)
            .patch('/api/admin/users/1/role')
            .set('Cookie', adminCookie)
            .send({ role: 'user' });
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'You cannot change your own role' });
    });

    it('returns 400 for invalid role value', async () => {
        const response = await request(app)
            .patch('/api/admin/users/2/role')
            .set('Cookie', adminCookie)
            .send({ role: 'superuser' });
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'Role must be admin or user' });
    });

    it('returns 400 when role is missing from body', async () => {
        const response = await request(app)
            .patch('/api/admin/users/2/role')
            .set('Cookie', adminCookie)
            .send({});
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'Role must be admin or user' });
    });

    it('returns 404 when user does not exist', async () => {
        const queryMock = mockPoolQuery(async () => databaseResult([]));

        const response = await request(app)
            .patch('/api/admin/users/999999/role')
            .set('Cookie', adminCookie)
            .send({ role: 'admin' });

        assert.equal(response.status, 404);
        assert.deepEqual(response.body, { error: 'User not found' });
        assert.equal(queryMock.mock.callCount(), 1);
    });

    it('allows an admin to promote a user to admin', async () => {
        const updatedUser = { ...mockUser, role: 'admin' };
        const queryMock = mockPoolQuery(async () => databaseResult([updatedUser]));

        const response = await request(app)
            .patch('/api/admin/users/2/role')
            .set('Cookie', adminCookie)
            .send({ role: 'admin' });

        assert.equal(response.status, 200);
        assert.equal(response.body.role, 'admin');
        assert.equal(queryMock.mock.callCount(), 1);

        const queryArguments = queryMock.mock.calls[0].arguments;
        assert.match(String(queryArguments[0]), /UPDATE users/);
        assert.deepEqual(queryArguments[1], ['admin', 2]);
    });

    it('allows an admin to demote another admin to user', async () => {
        const updatedUser = { ...mockUser, role: 'user' };
        mockPoolQuery(async () => databaseResult([updatedUser]));

        const response = await request(app)
            .patch('/api/admin/users/2/role')
            .set('Cookie', adminCookie)
            .send({ role: 'user' });

        assert.equal(response.status, 200);
        assert.equal(response.body.role, 'user');
    });

    it('returns 500 when the database update fails', async () => {
        mockPoolQuery(async () => { throw new Error('Database unavailable'); });

        const response = await request(app)
            .patch('/api/admin/users/2/role')
            .set('Cookie', adminCookie)
            .send({ role: 'admin' });

        assert.equal(response.status, 500);
        assert.deepEqual(response.body, { error: 'Failed to update role' });
    });
});