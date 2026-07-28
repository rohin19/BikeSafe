import 'dotenv/config';
import express, {Request, Response} from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import hazardsRouter from './routes/hazards';
import bikeShareRouter from './routes/bikeShare';
import reviewsRouter from './routes/reviews';
import { pool } from './db';
import cookieParser from 'cookie-parser';
import routesRouter from './routes/routes';
import geocodeRouter from './routes/geocode';

// create express app
const app = express();
app.use(express.json());
app.use(cookieParser());

// development CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'http://34.187.197.133';

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/hazards', hazardsRouter);
app.use('/api/bikeShare', bikeShareRouter); 
app.use('/api/reviews', reviewsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/routes/geocode', geocodeRouter);

// test that the API is working
app.get('/api/health', (req: Request, res: Response) => { 
  res.json({ message: 'API is working' }); 
});

// test db connect working
app.get('/api/health/db', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT now()');
    res.json({message: 'Database connection is working'});
  } catch (err) {
    console.error('Database connection error: ', err);
    res.status(500).json({status: 'error'});
  }
});


// error handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;