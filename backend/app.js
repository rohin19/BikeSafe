require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(cors({origin: 'http://localhost:5173'}));
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => { res.json({ message: 'API is working' }); });

module.exports = app;