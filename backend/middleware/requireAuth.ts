import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../types/jwtPayload';

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
  // const token = req.headers.authorization?.split(' ')[1];
  const token = req.cookies?.token; // read JWT from a cookie instead of header
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};