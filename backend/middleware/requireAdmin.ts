import requireAuth from './requireAuth';
import type { Request, Response, NextFunction } from 'express';

export default function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
};