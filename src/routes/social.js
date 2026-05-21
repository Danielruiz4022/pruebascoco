const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const links = db.prepare('SELECT * FROM social_links ORDER BY id ASC').all();
  res.json({ social: links });
});

router.put('/:platform', authenticateToken, (req, res) => {
  const db = getDb();
  const { url, followers, visible } = req.body;
  const existing = db.prepare('SELECT * FROM social_links WHERE platform = ?').get(req.params.platform);
  if (!existing) return res.status(404).json({ error: 'Red social no encontrada' });
  db.prepare('UPDATE social_links SET url=?, followers=?, visible=? WHERE platform=?')
    .run(url || existing.url, followers !== undefined ? followers : existing.followers,
      visible !== undefined ? (visible ? 1 : 0) : existing.visible, req.params.platform);
  res.json(db.prepare('SELECT * FROM social_links WHERE platform = ?').get(req.params.platform));
});

router.post('/', authenticateToken, (req, res) => {
  const { platform, url, followers, visible, icon, color } = req.body;
  if (!platform || !url) return res.status(400).json({ error: 'Platform y URL son requeridos' });
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO social_links (platform, url, followers, visible, icon, color) VALUES (?,?,?,?,?,?)')
    .run(platform, url, followers || '0', visible !== undefined ? (visible ? 1 : 0) : 1, icon || platform, color || '#000000');
  res.status(201).json(db.prepare('SELECT * FROM social_links WHERE platform = ?').get(platform));
});

module.exports = router;
