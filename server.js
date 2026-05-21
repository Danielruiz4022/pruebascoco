const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initDb();

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/posts', require('./src/routes/posts'));
app.use('/api/media', require('./src/routes/media'));
app.use('/api/videos', require('./src/routes/videos'));
app.use('/api/albums', require('./src/routes/albums'));
app.use('/api/social', require('./src/routes/social'));
app.use('/api/settings', require('./src/routes/settings'));

// SPA fallback
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CocoCientifico running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Admin credentials: admin@cococientifico.com / admin123`);
});
