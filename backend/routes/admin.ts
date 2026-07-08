import { Router } from 'express';
import requireAdmin from '../middleware/requireAdmin';

const router = Router();

router.use(requireAdmin);

router.get('/reports', async (req, res) => {
  res.json({ message: 'TODO: list reports' });
});

router.get('/users', async (req, res) => {
  res.json({ message: 'TODO: list users' });
});

export default router;