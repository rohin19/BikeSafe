import { Router } from 'express';

const router = Router();

router.post('/login', async (req, res) => {
    res.json({ message: 'TODO: implement login' });
});

router.post('/register', async (req, res) => {
    res.json({ message: 'TODO: implement register' });
});

export default router;