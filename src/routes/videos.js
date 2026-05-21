const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { limit = 20, offset = 0 } = req.query;
  const videos = db.prepare('SELECT * FROM videos ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(parseInt(limit), parseInt(offset));
  const total = db.prepare('SELECT COUNT(*) as count FROM videos').get();
  res.json({ videos, total: total.count });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video no encontrado' });
  res.json(video);
});

router.post('/', authenticateToken, (req, res) => {
  const { title, description, video_url, thumbnail_url } = req.body;
  if (!title || !video_url) return res.status(400).json({ error: 'Título y URL del video son requeridos' });
  const db = getDb();
  const result = db.prepare('INSERT INTO videos (title, description, video_url, thumbnail_url) VALUES (?, ?, ?, ?)')
    .run(title, description || '', video_url, thumbnail_url || null);
  res.status(201).json(db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video no encontrado' });
  const { title, description, video_url, thumbnail_url } = req.body;
  db.prepare('UPDATE videos SET title=?, description=?, video_url=?, thumbnail_url=? WHERE id=?')
    .run(title || video.title, description !== undefined ? description : video.description,
      video_url || video.video_url, thumbnail_url !== undefined ? thumbnail_url : video.thumbnail_url, req.params.id);
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM videos WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Video no encontrado' });
  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Video eliminado exitosamente' });
});

module.exports = router;
