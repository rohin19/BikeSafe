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

router.delete('/users/:id', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid User Id'})
  }

  if (id === req.user!.user_id) {
    return res.status(400).json({ error: 'You cannot delete your own account'});
  }

  try {
    const result = await pool.query(
      `Delete FROM users
      WHERE user_id = $1
      RETURNING user_id, name, email`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ message: 'User deleted', deleted: result.rows[0] })
  } catch (err) {
    console.error('Error deleting users:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.patch('/users/:id/role', async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or user' });
  }

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid User Id' });
  }
  if (id === req.user!.user_id) {
    return res.status(400).json({ error: 'You cannot change your own role' })
  }
  if (!role || !['admin','user'].includes(role)) {
    return res.status(400).json({error: 'Role must be admin'})
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = $1
      WHERE user_id = $2
      RETURNING user_id, name, email, role`,
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating role: ', err);
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;