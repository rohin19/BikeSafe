import 'dotenv/config';
import express, {Request, Response} from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';


const app = express();

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(cors({origin: 'http://localhost:5173'}));
}

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req: Request, res: Response) => { 
  res.json({ message: 'API is working' }); 
});

export default app;