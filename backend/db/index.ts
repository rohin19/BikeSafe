import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// connect to database using database URL from env var
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})