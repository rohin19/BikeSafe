import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import requireAuth from '../middleware/requireAuth';
import type { JwtPayload } from '../types/jwtPayload';

const SESSION_DURATION_MS = 7200000; // (or 2 hours) in ms

// (used by login and register route) ~helper function takes who the user is, turns it into tamper-proof signed token, tell browser to store the token safely, and keep sending it back automatically for the next 2 hours
function setAuthCookie(res: Response, payload: JwtPayload): void {
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '2h'});
    // res.cookie builds an HTP header that tels the browser to store the cookie (serialzies all this into one raw header string)
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax', // dont attach this cookie to reqs originating from diff website (strict|lax|none)
        secure: process.env.NODE_ENV === 'production', // false ~ default for HTTP
        maxAge: SESSION_DURATION_MS
    }); 
}

const router = Router();

router.post('/login', async (req, res) => {
    res.json({ message: 'TODO: implement login' });
});

router.post('/register', async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, and password are required'});
    }

    const existing = await pool.query('SELECT user_id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0){
        return res.status(409).json({ error: 'Email already registered'});
    }

    const hashed = await bcrypt.hash(password, 10); // 10 salt rounds
    const result = await pool.query(
        `INSERT INTO users(name, email, hashed_password)
        VALUES ($1, $2, $3)
        RETURNING user_id, name, email, role`,
        [name, email, hashed]
    );

    const user = result.rows[0];
    setAuthCookie(res, { user_id: user.user_id, role: user.role });
    return res.status(200).json({ user });
});

export default router;