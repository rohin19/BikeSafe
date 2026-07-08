import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      role?: string;
      [key: string]: unknown;
    };
  }
}