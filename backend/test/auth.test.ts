import { describe, it, after, afterEach, mock } from "node:test";
import assert from "node:assert";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import request from "supertest";
import app from '../app'
import { pool } from '../db'

const originalJwtSecret = process.env.JWT_SECRET;
const testJwtSecret = 'auth-route-test-secret'
process.env.JWT_SECRET = testJwtSecret;

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

// a REAL bcrypt hash for a known password, so login tests exercise real hashing/comparison instead of mocking bcrypt away
const testPassword = 'correct-password';
const testHashedPassword = bcrypt.hashSync(testPassword, 10);

const mockUser = {
    user_id: 3,
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'user',
    hashed_password: testHashedPassword,
};

describe('POST /api/auth/login', () => {
    it('returns 401 when the email is not found', async () => {
        mockPoolQuery(async () => databaseResult([]));

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@example.com', password: testPassword });

        assert.equal(response.status, 401);
        assert.deepEqual(response.body, { error: 'Invalid credentials' });
    });

    it('returns 401 when the password is wrong, with the same message as a missing email (does not leak which case occurred)', async () => {
        mockPoolQuery(async () => databaseResult([mockUser]));

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: 'wrong-password' });

        assert.equal(response.status, 401);
        assert.deepEqual(response.body, { error: 'Invalid credentials' });
    });

    it('logs in successfully with correct credentials, sets an auth cookie, and does not leak the hashed password', async () => {
        mockPoolQuery(async () => databaseResult([mockUser]));

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: testPassword });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            user: {
                user_id: mockUser.user_id,
                name: mockUser.name,
                email: mockUser.email,
                role: mockUser.role,
            },
        });
        assert.equal('hashed_password' in response.body.user, false);

        const setCookie = response.headers['set-cookie'];
        assert.ok(setCookie, 'expected a Set-Cookie header on successful login');
        assert.match(String(setCookie), /token=/);
        assert.match(String(setCookie), /HttpOnly/i);
    });
});

describe('POST /api/auth/register', () => {
    it('returns 400 when required fields are missing', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ name: 'New User', email: 'new@example.com' }); // no password

        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { error: 'name, email, and password are required' });
    });

    it('returns 409 when the email is already registered', async () => {
        mockPoolQuery(async () => databaseResult([{ user_id: 99 }]));

        const response = await request(app)
            .post('/api/auth/register')
            .send({ name: 'New User', email: mockUser.email, password: testPassword });

        assert.equal(response.status, 409);
        assert.deepEqual(response.body, { error: 'Email already registered' });
    });

    it('registers a new user, hashes the password before storing it, and sets an auth cookie', async () => {
        const newUser = { user_id: 10, name: 'New User', email: 'new@example.com', role: 'user' };

        // pool.query is called twice here: once for the existing-email check, once for the insert - branch on the SQL text to return the right shape for each
        const queryMock = mockPoolQuery(async (sql: unknown) => {
            if (String(sql).includes('SELECT user_id FROM users')) {
                return databaseResult([]); // no existing user with this email
            }
            return databaseResult([newUser]); // the INSERT ... RETURNING
        });

        const response = await request(app)
            .post('/api/auth/register')
            .send({ name: newUser.name, email: newUser.email, password: testPassword });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { user: newUser });

        const setCookie = response.headers['set-cookie'];
        assert.ok(setCookie, 'expected a Set-Cookie header on successful registration');
        assert.match(String(setCookie), /token=/);

        // confirm the password was actually hashed before being inserted, not stored in plain text
        const insertCall = queryMock.mock.calls.find((call: { arguments: unknown[] }) => String(call.arguments[0]).includes('INSERT INTO users'));
        assert.ok(insertCall, 'expected an INSERT INTO users query');
        const insertedPassword = (insertCall!.arguments[1] as unknown[])[2];
        assert.notEqual(insertedPassword, testPassword);
        assert.equal(await bcrypt.compare(testPassword, insertedPassword as string), true);
    });

    it('propagates a database failure without a custom error response, since register has no try/catch', async () => {
        mockPoolQuery(async () => { throw new Error('Database unavailable'); });

        const response = await request(app)
            .post('/api/auth/register')
            .send({ name: 'New User', email: 'new@example.com', password: testPassword });

        // no try/catch in this route, so this isn't the app's usual {error: '...'} JSON shape -
        // just confirms the failure surfaces as a server error rather than crashing the process or returning 200
        assert.ok(response.status >= 500);
    });
});

describe('POST /api/auth/logout', () => {
    it('clears the auth cookie', async () => {
        const response = await request(app).post('/api/auth/logout');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { ok: true });

        const setCookie = String(response.headers['set-cookie']);
        assert.match(setCookie, /token=;/); // cleared, empty value
    });
});

describe('GET /api/auth/me', () => {
    it('returns 401 with no auth cookie', async () => {
        const response = await request(app).get('/api/auth/me');
        assert.equal(response.status, 401);
    });

    it('returns the current user for a valid cookie, without the hashed password', async () => {
        mockPoolQuery(async () => databaseResult([{
            user_id: mockUser.user_id,
            name: mockUser.name,
            email: mockUser.email,
            role: mockUser.role,
        }]));

        const response = await request(app)
            .get('/api/auth/me')
            .set('Cookie', createAuthCookie(mockUser.user_id, 'user'));

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            user: {
                user_id: mockUser.user_id,
                name: mockUser.name,
                email: mockUser.email,
                role: mockUser.role,
            },
        });
        assert.equal('hashed_password' in response.body.user, false);
    });

    it('returns { user: null } when the token is valid but the user no longer exists', async () => {
        mockPoolQuery(async () => databaseResult([]));

        const response = await request(app)
            .get('/api/auth/me')
            .set('Cookie', createAuthCookie(999999, 'user'));

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { user: null });
    });
});
