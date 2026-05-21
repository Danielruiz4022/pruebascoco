'use strict';

// ── PARTICLES ──
function createParticles() {
  const container = document.querySelector('.particles');
  if (!container) return;
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (Math.random() * 15 + 10) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
    const colors = ['var(--secondary)', 'var(--primary-light)', 'var(--accent-light)'];
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(p);
  }
}

// ── NAVBAR SCROLL ──
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
  hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
  });
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger?.classList.remove('active');
    });
  });
}

// ── ANIMATED COUNTERS ──
function animateCounter(el, target, suffix) {
  const duration = 1800;
  const start = performance.now();
  const update = now => {
    const t = Math.min((now - start) / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    el.textContent = Math.floor(eased * target) + suffix;
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  if (!counters.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      animateCounter(el, parseInt(el.dataset.count), el.dataset.suffix || '');
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));
}

// ── SECTION BADGES ANIMATE IN ──
function initBadgeAnimations() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.section-badge').forEach(b => io.observe(b));
}

// ── 3D TILT EFFECT ON CARDS ──
function initTilt() {
  const cards = document.querySelectorAll('.post-card, .video-card, .album-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `translateY(-8px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ── STAGGER GRID REVEAL ──
function initStagger() {
  const grids = [
    document.querySelector('.posts-grid'),
    document.querySelector('.videos-grid'),
    document.querySelector('.albums-grid'),
    document.querySelector('.social-grid'),
  ];
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const cards = entry.target.querySelectorAll('.post-card,.video-card,.album-card,.social-card');
      cards.forEach((card, i) => {
        setTimeout(() => card.classList.add('visible'), i * 110);
      });
      io.unobserve(entry.target);
    });
  }, { threshold: 0.05 });
  grids.forEach(g => g && io.observe(g));
}

// ── CAROUSEL ──
let carouselIndex = 0;
let carouselTimer;
const slides = [];

function initCarousel(data) {
  const track = document.querySelector('.carousel-track');
  const dotsContainer = document.querySelector('.carousel-dots');
  if (!track) return;
  track.innerHTML = '';
  if (dotsContainer) dotsContainer.innerHTML = '';

  if (!data || data.length === 0) {
    const placeholders = [
      { title: 'Selvas y Bosques Tropicales', sub: 'La mayor biodiversidad del planeta', emoji: '🌴', cls: 'slide-nature-1' },
      { title: 'Arrecifes de Coral', sub: 'Los bosques del océano en peligro', emoji: '🐠', cls: 'slide-nature-2' },
      { title: 'Ecoturismo Responsable', sub: 'Viajar para conservar, no para destruir', emoji: '🌿', cls: 'slide-nature-3' },
    ];
    placeholders.forEach((p, i) => {
      slides.push({ title: p.title, sub: p.sub });
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.innerHTML = `
        <div class="carousel-slide-placeholder ${p.cls}">
          <div class="carousel-slide-content">
            <div style="font-size:4rem;margin-bottom:1rem">${p.emoji}</div>
            <h3>${p.title}</h3>
            <p>${p.sub}</p>
          </div>
        </div>`;
      track.appendChild(slide);
    });
  } else {
    data.forEach((item, i) => {
      slides.push(item);
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      if (item.url) {
        slide.innerHTML = `
          <img src="${item.url}" alt="${item.alt_text || 'slide'}">
          <div class="carousel-slide-content">
            <h3>${item.alt_text || 'CocoCientifico'}</h3>
          </div>`;
      } else {
        const cls = ['slide-gradient-1','slide-gradient-2','slide-gradient-3'][i % 3];
        slide.innerHTML = `
          <div class="carousel-slide-placeholder ${cls}">
            <div class="carousel-slide-content">
              <h3>${item.title || 'CocoCientifico'}</h3>
            </div>
          </div>`;
      }
      track.appendChild(slide);
    });
  }

  const count = track.children.length;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer?.appendChild(dot);
  }
  startCarouselTimer();
  enableCarouselTouch(track);
}

function goToSlide(n) {
  const track = document.querySelector('.carousel-track');
  const dots = document.querySelectorAll('.dot');
  const count = track?.children.length || 0;
  if (count === 0) return;
  carouselIndex = ((n % count) + count) % count;
  track.style.transform = `translateX(-${carouselIndex * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
}

function startCarouselTimer() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    const count = document.querySelector('.carousel-track')?.children.length || 0;
    goToSlide((carouselIndex + 1) % count);
  }, 5000);
}

function enableCarouselTouch(track) {
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      const count = track.children.length;
      goToSlide(diff > 0 ? (carouselIndex + 1) % count : (carouselIndex - 1 + count) % count);
      startCarouselTimer();
    }
  });
}

document.querySelector('.carousel-prev')?.addEventListener('click', () => {
  const count = document.querySelector('.carousel-track')?.children.length || 0;
  goToSlide((carouselIndex - 1 + count) % count);
  startCarouselTimer();
});
document.querySelector('.carousel-next')?.addEventListener('click', () => {
  const count = document.querySelector('.carousel-track')?.children.length || 0;
  goToSlide((carouselIndex + 1) % count);
  startCarouselTimer();
});

// ── POSTS ──
const categoryEmojis = {
  'Ecoturismo': '🌴', 'Biología': '🦋', 'Medio Ambiente': '🌿',
  'Sustentable': '♻️', 'Oceanografía': '🐠', 'Conservación': '🌱',
  'Turismo': '🗺️', 'General': '🔬'
};
const categoryClasses = {
  'Ecoturismo': 'cat-ecoturismo', 'Biología': 'cat-biologia', 'Medio Ambiente': 'cat-medio-ambiente',
  'Sustentable': 'cat-sustentable', 'Oceanografía': 'cat-oceanografia', 'Conservación': 'cat-conservacion',
  'Turismo': 'cat-turismo', 'General': 'cat-general'
};

function renderPosts(posts) {
  const grid = document.getElementById('posts-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!posts || posts.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1">No hay posts publicados aún.</p>';
    return;
  }
  posts.forEach(post => {
    const tags = (() => { try { return JSON.parse(post.tags || '[]'); } catch(e) { return []; } })();
    const catClass = categoryClasses[post.category] || 'cat-general';
    const emoji = categoryEmojis[post.category] || '📖';
    const date = new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <div class="post-card-image">
        ${post.image_url
          ? `<img src="${post.image_url}" alt="${post.title}" loading="lazy">`
          : `<div class="post-card-image-placeholder">${emoji}</div>`
        }
        <span class="category-badge ${catClass}">${post.category}</span>
      </div>
      <div class="post-card-body">
        <div class="post-meta">
          <span class="post-meta-date">📅 ${date}</span>
        </div>
        <h3>${post.title}</h3>
        <p>${post.excerpt || post.content.substring(0, 180) + '...'}</p>
        ${tags.length ? `<div class="post-tags">${tags.slice(0,3).map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
        <a class="read-more" onclick="openPost(${post.id})" href="javascript:void(0)">Leer más →</a>
      </div>`;
    grid.appendChild(card);
  });
}

function openPost(id) {
  fetch(`/api/posts/${id}`)
    .then(r => r.json())
    .then(post => {
      const modal = document.getElementById('post-modal');
      const tags = (() => { try { return JSON.parse(post.tags || '[]'); } catch(e) { return []; } })();
      const catClass = categoryClasses[post.category] || 'cat-general';
      const date = new Date(post.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      document.getElementById('modal-category').innerHTML = `<span class="category-badge ${catClass}" style="position:static">${post.category}</span>`;
      document.getElementById('modal-title').textContent = post.title;
      document.getElementById('modal-date').textContent = '📅 ' + date;
      const paragraphs = post.content.split('\n\n').filter(p => p.trim());
      document.getElementById('modal-content').innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
      const imgContainer = document.getElementById('modal-image-container');
      if (post.image_url) {
        imgContainer.innerHTML = `<img src="${post.image_url}" alt="${post.title}">`;
        imgContainer.style.display = 'block';
      } else {
        imgContainer.style.display = 'none';
      }
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
}

document.getElementById('modal-close')?.addEventListener('click', closePostModal);
document.getElementById('post-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closePostModal();
});
function closePostModal() {
  document.getElementById('post-modal')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ── VIDEOS ──
function renderVideos(videos) {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!videos || videos.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1">No hay videos disponibles aún.</p>';
    return;
  }
  videos.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-thumbnail">
        ${v.thumbnail_url
          ? `<img src="${v.thumbnail_url}" alt="${v.title}" loading="lazy">`
          : `<div class="video-thumbnail-placeholder">🎬</div>`
        }
        <div class="play-btn"><span>▶</span></div>
      </div>
      <div class="video-info">
        <h3>${v.title}</h3>
        <p>${v.description || ''}</p>
      </div>`;
    card.querySelector('.play-btn').addEventListener('click', () => openVideo(v.video_url, v.title));
    grid.appendChild(card);
  });
}

function openVideo(url, title) {
  const overlay = document.getElementById('video-modal');
  const iframe = document.getElementById('video-iframe');
  // Ensure proper YouTube embed URL with autoplay
  let embedUrl = url;
  if (url.includes('youtube.com/embed/')) {
    embedUrl = url + (url.includes('?') ? '&' : '?') + 'autoplay=1&rel=0&modestbranding=1';
  }
  iframe.src = embedUrl;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

document.getElementById('video-modal-close')?.addEventListener('click', closeVideoModal);
document.getElementById('video-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeVideoModal();
});
function closeVideoModal() {
  const overlay = document.getElementById('video-modal');
  overlay?.classList.remove('active');
  document.getElementById('video-iframe').src = '';
  document.body.style.overflow = '';
}

// ── ALBUMS ──
function renderAlbums(albums) {
  const grid = document.getElementById('albums-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!albums || albums.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1">No hay álbumes disponibles aún.</p>';
    return;
  }
  albums.forEach(album => {
    const card = document.createElement('div');
    card.className = 'album-card';
    card.innerHTML = `
      <div class="album-cover">
        ${album.cover_url
          ? `<img src="${album.cover_url}" alt="${album.name}">`
          : `<div class="album-cover-placeholder">🖼️</div>`
        }
        <div class="album-overlay">
          <span class="album-count">📸 ${album.image_count || 0} fotos</span>
        </div>
      </div>
      <div class="album-info">
        <h3>${album.name}</h3>
        <p>${album.description || ''}</p>
      </div>`;
    grid.appendChild(card);
  });
}

// ── SOCIAL ──
const socialIcons = {
  facebook: '📘', instagram: '📷', tiktok: '🎵',
  twitter: '🐦', youtube: '📺', linkedin: '💼'
};
const socialColors = {
  facebook: '#1877F2', instagram: '#E4405F', tiktok: '#00F2EA',
  twitter: '#1DA1F2', youtube: '#FF0000', linkedin: '#0A66C2'
};

function renderSocial(links) {
  const grid = document.getElementById('social-grid');
  if (!grid) return;
  grid.innerHTML = '';
  links.filter(l => l.visible).forEach(link => {
    const card = document.createElement('a');
    card.className = 'social-card';
    card.href = link.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.dataset.platform = link.platform;
    const color = link.color || socialColors[link.platform] || '#555';
    card.innerHTML = `
      <div class="social-icon-wrap" style="background:${color}18;border:2px solid ${color}44">
        <span style="font-size:2.2rem">${socialIcons[link.platform] || '🌐'}</span>
      </div>
      <span class="social-platform">${link.platform}</span>
      <span class="social-followers" style="color:${color}">${link.followers}</span>
      <span style="font-size:0.8rem;color:var(--text-secondary)">seguidores</span>`;
    grid.appendChild(card);
  });
}

// ── INTERSECTION OBSERVER ──
function observeReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ── INIT ──
async function init() {
  createParticles();
  initNavbar();
  initCounters();
  initBadgeAnimations();
  observeReveal();

  try {
    const [postsRes, videosRes, albumsRes, socialRes, mediaRes] = await Promise.all([
      fetch('/api/posts').then(r => r.json()),
      fetch('/api/videos').then(r => r.json()),
      fetch('/api/albums').then(r => r.json()),
      fetch('/api/social').then(r => r.json()),
      fetch('/api/media?type=image&limit=6').then(r => r.json()),
    ]);
    initCarousel(mediaRes.media);
    renderPosts(postsRes.posts);
    renderVideos(videosRes.videos);
    renderAlbums(albumsRes.albums);
    renderSocial(socialRes.social);
    // Init stagger and tilt after DOM is populated
    requestAnimationFrame(() => {
      initStagger();
      initTilt();
    });
  } catch (err) {
    console.error('Error loading data:', err);
    initCarousel([]);
    renderPosts([]);
    renderVideos([]);
    renderAlbums([]);
    renderSocial([]);
  }
}

document.addEventListener('DOMContentLoaded', init);
window.openPost = openPost;
