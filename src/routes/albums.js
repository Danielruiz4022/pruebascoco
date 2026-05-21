const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const albums = db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all();
  const result = albums.map(album => {
    const imageCount = db.prepare('SELECT COUNT(*) as count FROM album_images WHERE album_id = ?').get(album.id);
    return { ...album, image_count: imageCount.count };
  });
  res.json({ albums: result });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id);
  if (!album) return res.status(404).json({ error: 'Álbum no encontrado' });
  const images = db.prepare(`
    SELECT m.* FROM media m
    JOIN album_images ai ON m.id = ai.media_id
    WHERE ai.album_id = ? ORDER BY ai.order_num ASC
  `).all(req.params.id);
  res.json({ ...album, images });
});

router.post('/', authenticateToken, (req, res) => {
  const { name, description, cover_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre del álbum es requerido' });
  const db = getDb();
  const result = db.prepare('INSERT INTO albums (name, description, cover_url) VALUES (?, ?, ?)')
    .run(name, description || '', cover_url || null);
  res.status(201).json(db.prepare('SELECT * FROM albums WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id);
  if (!album) return res.status(404).json({ error: 'Álbum no encontrado' });
  const { name, description, cover_url } = req.body;
  db.prepare('UPDATE albums SET name=?, description=?, cover_url=? WHERE id=?')
    .run(name || album.name, description !== undefined ? description : album.description,
      cover_url !== undefined ? cover_url : album.cover_url, req.params.id);
  res.json(db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM albums WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Álbum no encontrado' });
  db.prepare('DELETE FROM albums WHERE id = ?').run(req.params.id);
  res.json({ message: 'Álbum eliminado exitosamente' });
});

router.post('/:id/images', authenticateToken, (req, res) => {
  const { media_id, order_num = 0 } = req.body;
  if (!media_id) return res.status(400).json({ error: 'media_id es requerido' });
  const db = getDb();
  if (!db.prepare('SELECT id FROM albums WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Álbum no encontrado' });
  db.prepare('INSERT OR IGNORE INTO album_images (album_id, media_id, order_num) VALUES (?, ?, ?)')
    .run(req.params.id, media_id, order_num);
  res.json({ message: 'Imagen agregada al álbum' });
});

router.delete('/:id/images/:mediaId', authenticateToken, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM album_images WHERE album_id = ? AND media_id = ?')
    .run(req.params.id, req.params.mediaId);
  res.json({ message: 'Imagen removida del álbum' });
});

module.exports = router;
