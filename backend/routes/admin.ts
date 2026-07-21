import { Router, Request, Response } from 'express';
import { pool } from '../db'
import requireAdmin from '../middleware/requireAdmin';

const router = Router();

router.use(requireAdmin);

router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, role, created_at 
       FROM users 
       ORDER BY created_at DESC`
      );
      return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({err: 'Failed to fetch users'});
  }
});

router.patch('/users/:id/role', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE user_id = $1 RETURNING user_id, name, email`, [id]
    );
    if (result.rows.length = 0) {
      return res.status(404).json({error: 'User not found'});
    }
    return res.status(200).json({message: 'User Deleted', deleted: result.rows[0]})
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ err: 'Failed to delete user' });
  }
});

export default router;