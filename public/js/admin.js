'use strict';

/* ─── STATE ─── */
let authToken = localStorage.getItem('coco_token');
let currentUser = null;
let currentSection = 'dashboard';
let editingPost = null;
let editingVideo = null;
let editingAlbum = null;
let deleteCallback = null;

/* ─── HELPERS ─── */
const $ = id => document.getElementById(id);
const API = path => '/api' + path;

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  if (opts.body instanceof FormData) delete headers['Content-Type'];
  const res = await fetch(API(path), { ...opts, headers });
  if (res.status === 401 || res.status === 403) { doLogout(); return null; }
  return res;
}

function showToast(msg, type = 'success') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showConfirm(msg, onConfirm) {
  $('confirm-msg').textContent = msg;
  deleteCallback = onConfirm;
  $('confirm-dialog').classList.add('active');
}

$('confirm-yes')?.addEventListener('click', () => {
  $('confirm-dialog').classList.remove('active');
  if (deleteCallback) { deleteCallback(); deleteCallback = null; }
});
$('confirm-no')?.addEventListener('click', () => {
  $('confirm-dialog').classList.remove('active');
  deleteCallback = null;
});

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoryBadgeClass(cat) {
  const map = {
    'Ecoturismo': 'ecoturismo', 'Biología': 'biologia', 'Medio Ambiente': 'sustentable',
    'Sustentable': 'sustentable', 'Oceanografía': 'oceanografia',
    'Conservación': 'conservacion', 'Turismo': 'ecoturismo', 'General': 'general'
  };
  return 'badge-' + (map[cat] || 'general');
}

/* ─── YOUTUBE UTILS ─── */
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function autoFillThumbnail(url) {
  const id = extractYouTubeId(url);
  const thumbInput = $('video-thumbnail');
  const preview = $('video-thumb-preview');
  const img = $('video-thumb-img');
  if (id) {
    const thumbUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    if (thumbInput && !thumbInput.value) thumbInput.value = thumbUrl;
    if (preview && img) {
      img.src = thumbUrl;
      preview.style.display = 'block';
    }
  } else {
    if (preview) preview.style.display = 'none';
  }
}

/* ─── CATEGORY CHART ─── */
function drawCategoryChart(posts) {
  const chart = $('category-chart');
  if (!chart) return;
  const counts = {};
  posts.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const colors = {
    'Ecoturismo': '#0E9AA7', 'Biología': '#27AE60', 'Medio Ambiente': '#1B6B3A',
    'Sustentable': '#E67E22', 'Oceanografía': '#0571A0', 'Conservación': '#155729',
    'Turismo': '#F39C12', 'General': '#6B9E7E'
  };
  chart.innerHTML = sorted.map(([cat, n]) => `
    <div class="chart-row">
      <span class="chart-label">${cat}</span>
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="width:${(n/max*100).toFixed(1)}%;background:linear-gradient(90deg,${colors[cat]||'var(--primary)'},${colors[cat]||'var(--primary)'}aa)"></div>
      </div>
      <span class="chart-count">${n}</span>
    </div>`).join('') || '<p style="color:var(--text-muted);text-align:center">Sin datos</p>';
}

/* ─── WORD COUNT ─── */
function initPostEditorHelpers() {
  const content = $('post-content');
  const wc = $('content-wordcount');
  if (content && wc) {
    const update = () => {
      const words = content.value.trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = `${words} palabra${words !== 1 ? 's' : ''}`;
    };
    content.addEventListener('input', update);
    update();
  }

  const excerpt = $('post-excerpt');
  const cc = $('excerpt-counter');
  if (excerpt && cc) {
    const update = () => {
      const len = excerpt.value.length;
      cc.textContent = `${len}/300`;
      cc.className = 'char-counter' + (len > 280 ? ' warn' : '') + (len >= 300 ? ' full' : '');
    };
    excerpt.addEventListener('input', update);
    update();
  }

  const title = $('post-title');
  const slugPreview = $('slug-preview');
  const slugText = $('slug-preview-text');
  if (title && slugPreview && slugText) {
    title.addEventListener('input', () => {
      const slug = title.value.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (slug) {
        slugText.textContent = `/posts/${slug}`;
        slugPreview.style.display = 'block';
      } else {
        slugPreview.style.display = 'none';
      }
    });
  }
}

/* ─── AUTH ─── */
$('login-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const errEl = $('login-error');
  errEl.classList.remove('show');

  try {
    const res = await fetch(API('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Credenciales inválidas';
      errEl.classList.add('show');
      return;
    }
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('coco_token', authToken);
    initAdminPanel();
  } catch (err) {
    errEl.textContent = 'Error de conexión';
    errEl.classList.add('show');
  }
});

function doLogout() {
  localStorage.removeItem('coco_token');
  authToken = null;
  currentUser = null;
  $('admin-layout').classList.remove('active');
  $('login-page').style.display = 'flex';
  showLoginPage();
}

function showLoginPage() {
  $('login-page').style.display = 'flex';
  $('admin-layout').classList.remove('active');
}

$('logout-btn')?.addEventListener('click', doLogout);

/* ─── NAVIGATION ─── */
function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));

  const sectionEl = $('section-' + section);
  if (sectionEl) sectionEl.classList.add('active');

  const navLink = document.querySelector(`.sidebar-nav a[data-section="${section}"]`);
  if (navLink) navLink.classList.add('active');

  $('topbar-title').textContent = {
    dashboard: 'Dashboard',
    posts: 'Artículos',
    media: 'Multimedia',
    videos: 'Videos',
    albums: 'Álbumes',
    social: 'Redes Sociales',
    settings: 'Configuración'
  }[section] || 'Admin';

  loadSection(section);
}

document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.section);
    if (window.innerWidth < 900) {
      $('sidebar').classList.remove('open');
    }
  });
});

/* Sidebar toggle for mobile */
$('sidebar-toggle')?.addEventListener('click', () => {
  $('sidebar').classList.toggle('open');
});

/* ─── SECTION LOADER ─── */
async function loadSection(section) {
  switch (section) {
    case 'dashboard': await loadDashboard(); break;
    case 'posts': await loadPosts(); break;
    case 'media': await loadMedia(); break;
    case 'videos': await loadVideos(); break;
    case 'albums': await loadAlbums(); break;
    case 'social': await loadSocial(); break;
    case 'settings': await loadSettings(); break;
  }
}

/* ─── DASHBOARD ─── */
async function loadDashboard() {
  try {
    const [postsRes, videosRes, mediaRes, albumsRes] = await Promise.all([
      apiFetch('/posts').then(r => r?.json()),
      apiFetch('/videos').then(r => r?.json()),
      apiFetch('/media').then(r => r?.json()),
      apiFetch('/albums').then(r => r?.json()),
    ]);

    $('dash-posts').textContent = postsRes?.total || 0;
    $('dash-videos').textContent = videosRes?.total || 0;
    $('dash-images').textContent = mediaRes?.total || 0;
    $('dash-albums').textContent = albumsRes?.albums?.length || 0;

    const feed = $('activity-feed');
    if (feed) {
      feed.innerHTML = '';
      const activities = [];
      (postsRes?.posts || []).slice(0, 3).forEach(p => {
        activities.push({ type: 'post', text: `Post publicado: <strong>${p.title}</strong>`, time: p.created_at });
      });
      (videosRes?.videos || []).slice(0, 2).forEach(v => {
        activities.push({ type: 'video', text: `Video agregado: <strong>${v.title}</strong>`, time: v.created_at });
      });
      (mediaRes?.media || []).slice(0, 2).forEach(m => {
        activities.push({ type: 'media', text: `Imagen subida: <strong>${m.filename}</strong>`, time: m.created_at });
      });
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      activities.slice(0, 8).forEach(act => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-dot activity-dot-${act.type}"></div>
          <span class="activity-text">${act.text}</span>
          <span class="activity-time">${formatDate(act.time)}</span>`;
        feed.appendChild(item);
      });
      if (activities.length === 0) {
        feed.innerHTML = '<div class="activity-item"><span class="activity-text" style="color:var(--text-muted)">Sin actividad reciente</span></div>';
      }
    }

    const recentPosts = $('recent-posts-list');
    if (recentPosts) {
      recentPosts.innerHTML = '';
      (postsRes?.posts || []).slice(0, 5).forEach(p => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-dot activity-dot-post"></div>
          <span class="activity-text"><strong>${p.title}</strong> — <span class="badge badge-${categoryBadgeClass(p.category)}">${p.category}</span></span>
          <span class="activity-time">${formatDate(p.created_at)}</span>`;
        recentPosts.appendChild(item);
      });
      if (!postsRes?.posts?.length) {
        recentPosts.innerHTML = '<div class="activity-item"><span class="activity-text" style="color:var(--text-muted)">No hay artículos</span></div>';
      }
    }

    // Draw category chart with all posts
    drawCategoryChart(postsRes?.posts || []);

  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

/* ─── POSTS ─── */
async function loadPosts() {
  const res = await apiFetch('/posts?limit=50');
  const data = await res?.json();
  const tbody = $('posts-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!data?.posts?.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📄</div><p>No hay artículos aún.</p></div></td></tr>`;
    return;
  }

  data.posts.forEach(post => {
    const tags = (() => { try { return JSON.parse(post.tags || '[]'); } catch(e) { return []; } })();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${post.title}</strong></td>
      <td><span class="badge ${categoryBadgeClass(post.category)}">${post.category}</span></td>
      <td>${tags.slice(0,2).map(t => `#${t}`).join(', ') || '—'}</td>
      <td><span class="badge ${post.published ? 'badge-published' : 'badge-draft'}">${post.published ? 'Publicado' : 'Borrador'}</span></td>
      <td>${formatDate(post.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-warning" onclick="openEditPost(${post.id})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeletePost(${post.id}, '${post.title.replace(/'/g, "\\'")}')">🗑️ Eliminar</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function openNewPost() {
  editingPost = null;
  $('post-modal-title').textContent = '✍️ Nuevo Artículo';
  $('post-form').reset();
  $('post-image-preview').innerHTML = '';
  $('post-image-preview').style.display = 'none';
  $('slug-preview').style.display = 'none';
  $('post-modal').classList.add('active');
  setTimeout(initPostEditorHelpers, 50);
}

async function openEditPost(id) {
  const res = await apiFetch('/posts/' + id);
  const post = await res?.json();
  if (!post) return;
  editingPost = post;
  $('post-modal-title').textContent = '✏️ Editar Artículo';
  $('post-title').value = post.title;
  $('post-category').value = post.category;
  $('post-content').value = post.content;
  $('post-excerpt').value = post.excerpt || '';
  const tags = (() => { try { return JSON.parse(post.tags || '[]'); } catch(e) { return []; } })();
  $('post-tags').value = tags.join(', ');
  $('post-published').checked = post.published === 1;
  $('post-image-url').value = post.image_url || '';

  const preview = $('post-image-preview');
  if (post.image_url) {
    preview.innerHTML = `<img src="${post.image_url}" style="max-height:120px;border-radius:8px;margin-top:0.5rem">`;
    preview.style.display = 'block';
  } else {
    preview.innerHTML = '';
    preview.style.display = 'none';
  }

  $('post-modal').classList.add('active');
  setTimeout(initPostEditorHelpers, 50);
}

$('post-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const tagsRaw = $('post-tags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const body = {
    title: $('post-title').value.trim(),
    category: $('post-category').value,
    content: $('post-content').value.trim(),
    excerpt: $('post-excerpt').value.trim(),
    tags,
    published: $('post-published').checked,
    image_url: $('post-image-url').value.trim() || null
  };

  if (!body.title || !body.content) { showToast('Título y contenido son requeridos', 'error'); return; }

  const method = editingPost ? 'PUT' : 'POST';
  const path = editingPost ? '/posts/' + editingPost.id : '/posts';
  const res = await apiFetch(path, { method, body: JSON.stringify(body) });
  if (res?.ok) {
    showToast(editingPost ? 'Artículo actualizado' : 'Artículo creado');
    closeModal('post-modal');
    loadPosts();
  } else {
    const err = await res?.json();
    showToast(err?.error || 'Error al guardar', 'error');
  }
});

function confirmDeletePost(id, title) {
  showConfirm(`¿Eliminar el artículo "${title}"? Esta acción no se puede deshacer.`, async () => {
    const res = await apiFetch('/posts/' + id, { method: 'DELETE' });
    if (res?.ok) { showToast('Artículo eliminado'); loadPosts(); }
    else showToast('Error al eliminar', 'error');
  });
}

/* Image upload for post form */
$('post-image-file')?.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('alt_text', $('post-title').value || file.name);

  showToast('Subiendo imagen...', 'info');
  const res = await apiFetch('/media', { method: 'POST', body: formData });
  if (res?.ok) {
    const media = await res.json();
    $('post-image-url').value = media.url;
    const preview = $('post-image-preview');
    preview.innerHTML = `<img src="${media.url}" style="max-height:120px;border-radius:8px;margin-top:0.5rem">`;
    preview.style.display = 'block';
    showToast('Imagen subida exitosamente');
  } else {
    showToast('Error al subir imagen', 'error');
  }
});

/* ─── MEDIA ─── */
async function loadMedia() {
  const res = await apiFetch('/media?type=image&limit=100');
  const data = await res?.json();
  const grid = $('media-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!data?.media?.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🖼️</div><p>No hay imágenes subidas aún.</p></div>`;
    return;
  }

  data.media.forEach(item => {
    const div = document.createElement('div');
    div.className = 'media-item';
    div.innerHTML = `
      <img src="${item.url}" alt="${item.alt_text || item.filename}" loading="lazy">
      <div class="media-item-overlay">
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteMedia(${item.id}, '${item.filename.replace(/'/g, "\\'")}')">🗑️</button>
      </div>`;
    grid.appendChild(div);
  });
}

async function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('alt_text', file.name);
  const res = await apiFetch('/media', { method: 'POST', body: formData });
  if (res?.ok) {
    showToast(`Imagen "${file.name}" subida exitosamente`);
    return await res.json();
  } else {
    showToast(`Error al subir "${file.name}"`, 'error');
    return null;
  }
}

function confirmDeleteMedia(id, filename) {
  showConfirm(`¿Eliminar la imagen "${filename}"?`, async () => {
    const res = await apiFetch('/media/' + id, { method: 'DELETE' });
    if (res?.ok) { showToast('Imagen eliminada'); loadMedia(); }
    else showToast('Error al eliminar', 'error');
  });
}

/* Upload zone */
const uploadZone = $('upload-zone');
const uploadInput = $('upload-input');

uploadZone?.addEventListener('click', () => uploadInput?.click());
uploadZone?.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone?.addEventListener('drop', async e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  for (const file of files) await uploadMedia(file);
  loadMedia();
});

uploadInput?.addEventListener('change', async e => {
  const files = Array.from(e.target.files);
  for (const file of files) await uploadMedia(file);
  loadMedia();
  e.target.value = '';
});

/* ─── VIDEOS ─── */
async function loadVideos() {
  const res = await apiFetch('/videos?limit=50');
  const data = await res?.json();
  const tbody = $('videos-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!data?.videos?.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">🎬</div><p>No hay videos aún.</p></div></td></tr>`;
    return;
  }

  data.videos.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${v.title}</strong></td>
      <td><a href="${v.video_url}" target="_blank" style="color:var(--secondary);font-size:0.8rem">${v.video_url.substring(0, 40)}...</a></td>
      <td>${formatDate(v.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-warning" onclick="openEditVideo(${v.id})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteVideo(${v.id}, '${v.title.replace(/'/g, "\\'")}')">🗑️ Eliminar</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function openNewVideo() {
  editingVideo = null;
  $('video-modal-title').textContent = '➕ Nuevo Video';
  $('video-form').reset();
  $('video-modal').classList.add('active');
}

async function openEditVideo(id) {
  const res = await apiFetch('/videos/' + id);
  const video = await res?.json();
  if (!video) return;
  editingVideo = video;
  $('video-modal-title').textContent = '✏️ Editar Video';
  $('video-title').value = video.title;
  $('video-url').value = video.video_url;
  $('video-thumbnail').value = video.thumbnail_url || '';
  $('video-description').value = video.description || '';
  $('video-modal').classList.add('active');
}

$('video-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    title: $('video-title').value.trim(),
    video_url: $('video-url').value.trim(),
    thumbnail_url: $('video-thumbnail').value.trim() || null,
    description: $('video-description').value.trim()
  };
  if (!body.title || !body.video_url) { showToast('Título y URL son requeridos', 'error'); return; }

  const method = editingVideo ? 'PUT' : 'POST';
  const path = editingVideo ? '/videos/' + editingVideo.id : '/videos';
  const res = await apiFetch(path, { method, body: JSON.stringify(body) });
  if (res?.ok) {
    showToast(editingVideo ? 'Video actualizado' : 'Video creado');
    closeModal('video-modal');
    loadVideos();
  } else {
    const err = await res?.json();
    showToast(err?.error || 'Error al guardar', 'error');
  }
});

function confirmDeleteVideo(id, title) {
  showConfirm(`¿Eliminar el video "${title}"?`, async () => {
    const res = await apiFetch('/videos/' + id, { method: 'DELETE' });
    if (res?.ok) { showToast('Video eliminado'); loadVideos(); }
    else showToast('Error al eliminar', 'error');
  });
}

/* ─── ALBUMS ─── */
async function loadAlbums() {
  const res = await apiFetch('/albums');
  const data = await res?.json();
  const tbody = $('albums-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!data?.albums?.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">📁</div><p>No hay álbumes aún.</p></div></td></tr>`;
    return;
  }

  data.albums.forEach(album => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${album.name}</strong></td>
      <td>${album.description || '—'}</td>
      <td>${album.image_count || 0} fotos</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-warning" onclick="openEditAlbum(${album.id})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteAlbum(${album.id}, '${album.name.replace(/'/g, "\\'")}')">🗑️ Eliminar</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function openNewAlbum() {
  editingAlbum = null;
  $('album-modal-title').textContent = '➕ Nuevo Álbum';
  $('album-form').reset();
  $('album-modal').classList.add('active');
}

async function openEditAlbum(id) {
  const res = await apiFetch('/albums/' + id);
  const album = await res?.json();
  if (!album) return;
  editingAlbum = album;
  $('album-modal-title').textContent = '✏️ Editar Álbum';
  $('album-name').value = album.name;
  $('album-description').value = album.description || '';
  $('album-cover').value = album.cover_url || '';
  $('album-modal').classList.add('active');
}

$('album-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    name: $('album-name').value.trim(),
    description: $('album-description').value.trim(),
    cover_url: $('album-cover').value.trim() || null
  };
  if (!body.name) { showToast('El nombre del álbum es requerido', 'error'); return; }

  const method = editingAlbum ? 'PUT' : 'POST';
  const path = editingAlbum ? '/albums/' + editingAlbum.id : '/albums';
  const res = await apiFetch(path, { method, body: JSON.stringify(body) });
  if (res?.ok) {
    showToast(editingAlbum ? 'Álbum actualizado' : 'Álbum creado');
    closeModal('album-modal');
    loadAlbums();
  } else {
    const err = await res?.json();
    showToast(err?.error || 'Error al guardar', 'error');
  }
});

function confirmDeleteAlbum(id, name) {
  showConfirm(`¿Eliminar el álbum "${name}"?`, async () => {
    const res = await apiFetch('/albums/' + id, { method: 'DELETE' });
    if (res?.ok) { showToast('Álbum eliminado'); loadAlbums(); }
    else showToast('Error al eliminar', 'error');
  });
}

/* ─── SOCIAL ─── */
async function loadSocial() {
  const res = await apiFetch('/social');
  const data = await res?.json();
  const list = $('social-list');
  if (!list) return;
  list.innerHTML = '';

  const socialEmojis = {
    facebook: '📘', instagram: '📷', tiktok: '🎵',
    twitter: '🐦', youtube: '📺', linkedin: '💼'
  };
  const socialColors = {
    facebook: '#1877F2', instagram: '#E4405F', tiktok: '#00F2EA',
    twitter: '#1DA1F2', youtube: '#FF0000', linkedin: '#0A66C2'
  };

  if (!data?.social?.length) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">No hay redes sociales configuradas.</p>';
    return;
  }

  data.social.forEach(link => {
    const color = link.color || socialColors[link.platform] || '#fff';
    const emoji = socialEmojis[link.platform] || '🌐';
    const item = document.createElement('div');
    item.className = 'social-form-item';
    item.innerHTML = `
      <div class="social-form-icon" style="background:${color}22;border:1px solid ${color}44">${emoji}</div>
      <div style="min-width:80px">
        <div style="font-weight:700;text-transform:capitalize">${link.platform}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${link.followers} seguidores</div>
      </div>
      <div class="social-form-fields">
        <input type="url" class="form-control" id="social-url-${link.platform}" value="${link.url}" placeholder="URL">
        <input type="text" class="form-control" id="social-followers-${link.platform}" value="${link.followers}" placeholder="Seguidores" style="max-width:120px">
        <label class="toggle-switch" title="Visible">
          <input type="checkbox" id="social-visible-${link.platform}" ${link.visible ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <button class="btn btn-sm btn-success" onclick="saveSocial('${link.platform}')">💾 Guardar</button>`;
    list.appendChild(item);
  });
}

async function saveSocial(platform) {
  const body = {
    url: $(`social-url-${platform}`).value.trim(),
    followers: $(`social-followers-${platform}`).value.trim(),
    visible: $(`social-visible-${platform}`).checked
  };
  const res = await apiFetch('/social/' + platform, { method: 'PUT', body: JSON.stringify(body) });
  if (res?.ok) showToast(`${platform} actualizado exitosamente`);
  else showToast('Error al guardar', 'error');
}

/* ─── SETTINGS ─── */
async function loadSettings() {
  const res = await apiFetch('/settings');
  const data = await res?.json();
  if (!data) return;

  if ($('setting-site-title')) $('setting-site-title').value = data.site_title || '';
  if ($('setting-tagline')) $('setting-tagline').value = data.site_tagline || '';
  if ($('setting-email')) $('setting-email').value = data.contact_email || '';
  if ($('setting-primary-color')) $('setting-primary-color').value = data.primary_color || '#6200EA';
  if ($('setting-secondary-color')) $('setting-secondary-color').value = data.secondary_color || '#00E5FF';
  if ($('setting-hero-title')) $('setting-hero-title').value = data.hero_title || '';
  if ($('setting-hero-subtitle')) $('setting-hero-subtitle').value = data.hero_subtitle || '';
}

$('settings-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    site_title: $('setting-site-title').value,
    site_tagline: $('setting-tagline').value,
    contact_email: $('setting-email').value,
    primary_color: $('setting-primary-color').value,
    secondary_color: $('setting-secondary-color').value,
    hero_title: $('setting-hero-title').value,
    hero_subtitle: $('setting-hero-subtitle').value
  };
  const res = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(body) });
  if (res?.ok) showToast('Configuración guardada exitosamente');
  else showToast('Error al guardar', 'error');
});

/* ─── MODALS ─── */
function closeModal(id) {
  $(id)?.classList.remove('active');
}

document.querySelectorAll('.modal-close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-overlay');
    if (modal) modal.classList.remove('active');
  });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

/* ─── INIT ─── */
function initAdminPanel() {
  $('login-page').style.display = 'none';
  $('admin-layout').classList.add('active');

  if (currentUser) {
    const nameEl = $('user-display-name');
    const avatarEl = $('user-avatar');
    if (nameEl) nameEl.textContent = currentUser.name || currentUser.email;
    if (avatarEl) avatarEl.textContent = (currentUser.name || currentUser.email).charAt(0).toUpperCase();
  }

  navigateTo('dashboard');
}

async function checkAuth() {
  if (!authToken) { showLoginPage(); return; }
  try {
    const res = await fetch(API('/auth/me'), { headers: { Authorization: 'Bearer ' + authToken } });
    if (!res.ok) { doLogout(); return; }
    currentUser = await res.json();
    initAdminPanel();
  } catch {
    doLogout();
  }
}

/* Expose global functions */
window.openNewPost = openNewPost;
window.openEditPost = openEditPost;
window.confirmDeletePost = confirmDeletePost;
window.openNewVideo = openNewVideo;
window.openEditVideo = openEditVideo;
window.confirmDeleteVideo = confirmDeleteVideo;
window.openNewAlbum = openNewAlbum;
window.openEditAlbum = openEditAlbum;
window.confirmDeleteAlbum = confirmDeleteAlbum;
window.saveSocial = saveSocial;
window.confirmDeleteMedia = confirmDeleteMedia;
window.closeModal = closeModal;
window.navigateTo = navigateTo;
window._adminNavigate = navigateTo;
window.autoFillThumbnail = autoFillThumbnail;

document.addEventListener('DOMContentLoaded', checkAuth);
