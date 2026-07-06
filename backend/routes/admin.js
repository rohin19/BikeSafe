const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');

router.use(requireAdmin);

router.get('/reports', async (req, res) => {
  res.json({ message: 'TODO: list reports' });
});

router.get('/users', async (req, res) => {
  res.json({ message: 'TODO: list users' });
});

module.exports = router;