import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import requireAuth from '../middleware/requireAuth';
import type { JwtPayload } from '../types/jwtPayload';

// (used by login and register route) ~helper function takes who the user is, turns it into tamper-proof signed token, tell browser to store the token safely, and keep sending it back automatically for the next 2 hours
function setAuthCookie(res: Response, payload: JwtPayload): void {
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '2h'});
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 * 1000
    });
}

const router = Router();

router.post('/login', async (req, res) => {
    res.json({ message: 'TODO: implement login' });
});

router.post('/register', async (req, res) => {
    res.json({ message: 'TODO: implement register' });
});

export default router;