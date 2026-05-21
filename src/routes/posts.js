const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// GET /api/posts - public
router.get('/', (req, res) => {
  const db = getDb();
  const { category, limit = 20, offset = 0, published } = req.query;

  let query = 'SELECT * FROM posts WHERE 1=1';
  const params = [];

  // Only show published posts for public access (no auth header)
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    query += ' AND published = 1';
  } else if (published !== undefined) {
    query += ' AND published = ?';
    params.push(parseInt(published));
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const posts = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM posts').get();

  res.json({ posts, total: total.count });
});

// GET /api/posts/:id - public
router.get('/:id', (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post no encontrado' });
  }

  res.json(post);
});

// POST /api/posts - protected
router.post('/', authenticateToken, (req, res) => {
  const { title, content, excerpt, category, image_url, tags, published } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Título y contenido son requeridos' });
  }

  const db = getDb();
  let slug = slugify(title);

  // Make slug unique
  const existingSlug = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  const result = db.prepare(`
    INSERT INTO posts (title, slug, content, excerpt, category, image_url, tags, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    slug,
    content,
    excerpt || content.substring(0, 200) + '...',
    category || 'General',
    image_url || null,
    JSON.stringify(tags || []),
    published !== undefined ? (published ? 1 : 0) : 1
  );

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(post);
});

// PUT /api/posts/:id - protected
router.put('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post no encontrado' });
  }

  const { title, content, excerpt, category, image_url, tags, published } = req.body;

  let slug = post.slug;
  if (title && title !== post.title) {
    slug = slugify(title);
    const existingSlug = db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').get(slug, post.id);
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  db.prepare(`
    UPDATE posts
    SET title = ?, slug = ?, content = ?, excerpt = ?, category = ?, image_url = ?,
        tags = ?, published = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || post.title,
    slug,
    content || post.content,
    excerpt || post.excerpt,
    category || post.category,
    image_url !== undefined ? image_url : post.image_url,
    tags ? JSON.stringify(tags) : post.tags,
    published !== undefined ? (published ? 1 : 0) : post.published,
    req.params.id
  );

  const updatedPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  res.json(updatedPost);
});

// DELETE /api/posts/:id - protected
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post no encontrado' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Post eliminado exitosamente' });
});

module.exports = router;
