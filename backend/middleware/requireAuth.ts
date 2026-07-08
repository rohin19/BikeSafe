import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';


type JwtUser = {
  role?: string;
  [key: string]: unknown;
};

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as JwtUser;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};