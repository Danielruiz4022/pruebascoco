const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo imágenes JPEG, PNG, GIF y WebP.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// GET /api/media - public
router.get('/', (req, res) => {
  const db = getDb();
  const { type = 'image', limit = 50, offset = 0 } = req.query;
  const media = db.prepare('SELECT * FROM media WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(type, parseInt(limit), parseInt(offset));
  const total = db.prepare('SELECT COUNT(*) as count FROM media WHERE type = ?').get(type);
  res.json({ media, total: total.count });
});

// GET /api/media/:id - public
router.get('/:id', (req, res) => {
  const db = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!media) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  res.json(media);
});

// POST /api/media - protected
router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const db = getDb();
  const fileUrl = `/uploads/images/${req.file.filename}`;

  const result = db.prepare(`
    INSERT INTO media (filename, url, type, alt_text)
    VALUES (?, ?, ?, ?)
  `).run(
    req.file.filename,
    fileUrl,
    'image',
    req.body.alt_text || req.file.originalname
  );

  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(media);
});

// DELETE /api/media/:id - protected
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);

  if (!media) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  // Delete the actual file
  const filePath = path.join(__dirname, '../../uploads/images', media.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ message: 'Archivo eliminado exitosamente' });
});

module.exports = router;
