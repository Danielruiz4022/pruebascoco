const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'cococientifico.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      category TEXT DEFAULT 'General',
      image_url TEXT,
      tags TEXT DEFAULT '[]',
      published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'image',
      alt_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT NOT NULL,
      thumbnail_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS album_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL,
      media_id INTEGER NOT NULL,
      order_num INTEGER DEFAULT 0,
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS social_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      followers TEXT DEFAULT '0',
      visible INTEGER DEFAULT 1,
      icon TEXT,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedData(db);
}

function seedData(db) {
  // Seed admin user
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@cococientifico.com');
  if (!existingUser) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(
      'admin@cococientifico.com', passwordHash, 'Administrador'
    );
  }

  // Seed posts
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  if (postCount.count === 0) {
    const posts = [
      {
        title: 'Manglares: Los Guardianes Silenciosos de las Costas',
        slug: 'manglares-guardianes-silenciosos-de-las-costas',
        content: `Los manglares son uno de los ecosistemas más valiosos del planeta. Estos bosques costeros crecen en la interfaz entre el mar y la tierra en zonas tropicales, y son verdaderas fábricas de vida y escudos naturales contra desastres climáticos.\n\nUn manglar maduro puede albergar hasta 300 especies de aves y decenas de especies de peces y crustáceos. Sus raíces aéreas sumergidas crean laberintos donde se reproducen el 70% de las especies de peces comerciales del mundo tropical.\n\nDesde el punto de vista climático, los manglares capturan carbono a una tasa hasta cinco veces mayor que los bosques tropicales terrestres. Durante el tsunami de 2004, las comunidades protegidas por manglares sufrieron significativamente menos daños.\n\nSin embargo, hemos perdido más del 50% de los manglares del mundo en los últimos 50 años. La acuicultura intensiva, el desarrollo costero y la contaminación son sus principales amenazas. Iniciativas de restauración en México, Colombia, Indonesia y Filipinas muestran que es posible recuperarlos.`,
        excerpt: 'Los manglares capturan más carbono que cualquier bosque terrestre, protegen costas de tsunamis y son la cuna de la pesca artesanal tropical. Su conservación es urgente.',
        category: 'Conservación',
        image_url: null,
        tags: JSON.stringify(['manglares', 'ecosistemas', 'conservación', 'carbono azul', 'costas']),
        published: 1
      },
      {
        title: 'Ecoturismo: La Ciencia de Viajar sin Dejar Huella',
        slug: 'ecoturismo-la-ciencia-de-viajar-sin-dejar-huella',
        content: `El ecoturismo es mucho más que acampar en un bosque o fotografiar animales salvajes. Es una disciplina que busca equilibrar la experiencia humana con los ecosistemas naturales, generando beneficios reales para las comunidades locales y la conservación.\n\nDesde el punto de vista biológico, el diseño de rutas ecoturísticas requiere estudios de capacidad de carga ecosistémica: ¿Cuántas personas puede recibir un sendero sin alterar los patrones de anidación de las aves? ¿A qué distancia deben mantenerse los observadores de manadas de mamíferos?\n\nEl modelo de turismo de base comunitaria ha demostrado ser el más efectivo. En Costa Rica, comunidades Bribri gestionan reservas donde la entrada de visitantes financia directamente guardabosques locales. En Ecuador, el pueblo Huaorani del Amazonas ofrece expediciones culturales cuyos ingresos superan los de la extracción petrolera.\n\nEl ecoturismo genera globalmente más de 600 mil millones de dólares al año. Cuando se hace bien, convierte la biodiversidad en un activo económico que las comunidades tienen incentivos para proteger.`,
        excerpt: 'El ecoturismo bien diseñado convierte la biodiversidad en un activo económico que comunidades locales tienen incentivos para proteger. Ciencia, ética y viajes responsables.',
        category: 'Ecoturismo',
        image_url: null,
        tags: JSON.stringify(['ecoturismo', 'turismo sostenible', 'conservación', 'comunidades', 'biodiversidad']),
        published: 1
      },
      {
        title: 'Arrecifes de Coral: Los Bosques del Océano en Crisis',
        slug: 'arrecifes-de-coral-bosques-del-oceano-en-crisis',
        content: `Los arrecifes de coral cubren menos del 1% del fondo marino, pero albergan más del 25% de todas las especies marinas conocidas. Son la estructura biológica más compleja y biodiversa del océano, y están muriendo a una velocidad alarmante.\n\nEl coral es una simbiosis extraordinaria: el pólipo alberga microalgas fotosintéticas llamadas zooxantelas que producen hasta el 90% de su energía. Cuando el océano se calienta apenas 1-2°C, el coral expulsa estas algas en un proceso llamado blanqueamiento que, si persiste, es fatal.\n\nEntre 2014 y 2017, el evento de blanqueamiento más grande de la historia afectó el 75% de los arrecifes del mundo. La Gran Barrera de Coral de Australia perdió la mitad de sus corales en dos años.\n\nLas consecuencias van más allá de la biodiversidad: los arrecifes protegen costas, sostienen pesquerías que alimentan a más de mil millones de personas y generan 36 mil millones de dólares en turismo anual. Científicos desarrollan corales termotolerantes mediante selección asistida y edición genética.`,
        excerpt: 'El 75% de los arrecifes del mundo sufrió blanqueamiento masivo entre 2014 y 2017. La ciencia detrás de esta crisis y las soluciones que emergen para salvarlos.',
        category: 'Oceanografía',
        image_url: null,
        tags: JSON.stringify(['arrecifes de coral', 'océano', 'cambio climático', 'biodiversidad marina', 'conservación']),
        published: 1
      },
      {
        title: 'Desarrollo Sustentable: Vivir dentro de los Límites Planetarios',
        slug: 'desarrollo-sustentable-limites-planetarios',
        content: `En 2009, un equipo de 28 científicos publicó en Nature el concepto de "límites planetarios": nueve sistemas biofísicos que regulan la estabilidad de la Tierra, con umbrales seguros para cada uno. Ya hemos transgredido seis de ellos.\n\nLos límites planetarios incluyen el cambio climático, la pérdida de biodiversidad, los ciclos de nitrógeno y fósforo, el uso de agua dulce, el cambio en el uso del suelo y la contaminación química. Cada uno, cuando se destabiliza, puede desencadenar efectos en cascada irreversibles.\n\nLa economía circular es una de las herramientas más poderosas: diseñar sistemas donde los residuos de un proceso se convierten en insumos de otro. Dinamarca ya recicla o composta más del 85% de sus residuos sólidos.\n\nLa agroecología combina conocimientos indígenas con ciencia ecológica para diseñar sistemas agrícolas que producen alimentos sin agotar suelos ni contaminar acuíferos. En América Latina, más de 10 millones de pequeños agricultores practican sistemas agroecológicos más resilientes ante el cambio climático.`,
        excerpt: 'Ya superamos 6 de los 9 límites planetarios. Qué es el desarrollo sustentable, cómo se mide y cuáles son las herramientas científicas para alcanzarlo.',
        category: 'Sustentable',
        image_url: null,
        tags: JSON.stringify(['sustentabilidad', 'desarrollo sostenible', 'límites planetarios', 'economía circular', 'ODS']),
        published: 1
      },
      {
        title: 'Biodiversidad Tropical: El Inventario de la Vida que Aún No Conocemos',
        slug: 'biodiversidad-tropical-inventario-de-la-vida',
        content: `Se estima que en la Tierra existen entre 8 y 10 millones de especies. Solo hemos descrito científicamente alrededor de 2 millones. Desconocemos entre el 75% y el 80% de la biodiversidad del planeta, y los trópicos concentran la mayor parte de ese misterio.\n\nLa zona tropical cubre apenas el 40% de la superficie terrestre pero alberga más del 75% de todas las especies conocidas. La Amazonia brasileña por sí sola contiene más especies de árboles que todo el continente europeo. Una hectárea de selva tropical puede albergar más especies de hormigas que toda Gran Bretaña.\n\nLos métodos modernos han revolucionado el inventario de la vida. El metabarcoding —secuenciación masiva de ADN ambiental extraído de muestras de suelo o agua— permite identificar miles de especies en horas. Drones con cámaras hiperespectrales mapean la diversidad arbórea en extensas áreas desde el aire.\n\nCada año se describen entre 15,000 y 20,000 nuevas especies. Pero la tasa de extinción actual supera en 1,000 veces la tasa natural. Estamos perdiendo especies que ni siquiera conocemos, junto con compuestos que podrían transformar la medicina y la agricultura.`,
        excerpt: 'Desconocemos entre el 75% y 80% de las especies del planeta. En los trópicos, cada hectárea esconde más diversidad que países enteros. Un recorrido por la ciencia del inventario de la vida.',
        category: 'Biología',
        image_url: null,
        tags: JSON.stringify(['biodiversidad', 'biología tropical', 'especies', 'selva', 'taxonomía']),
        published: 1
      }
    ];

    const insertPost = db.prepare(`
      INSERT INTO posts (title, slug, content, excerpt, category, image_url, tags, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const post of posts) {
      insertPost.run(post.title, post.slug, post.content, post.excerpt, post.category, post.image_url, post.tags, post.published);
    }
  }

  // Seed social links
  const socialCount = db.prepare('SELECT COUNT(*) as count FROM social_links').get();
  if (socialCount.count === 0) {
    const socialLinks = [
      { platform: 'facebook', url: 'https://facebook.com/cococientifico', followers: '12.5K', visible: 1, icon: 'facebook', color: '#1877F2' },
      { platform: 'instagram', url: 'https://instagram.com/cococientifico', followers: '8.3K', visible: 1, icon: 'instagram', color: '#E4405F' },
      { platform: 'tiktok', url: 'https://tiktok.com/@cococientifico', followers: '25.1K', visible: 1, icon: 'tiktok', color: '#000000' },
      { platform: 'twitter', url: 'https://twitter.com/cococientifico', followers: '5.7K', visible: 1, icon: 'twitter', color: '#1DA1F2' },
      { platform: 'youtube', url: 'https://youtube.com/@cococientifico', followers: '3.2K', visible: 1, icon: 'youtube', color: '#FF0000' }
    ];

    const insertSocial = db.prepare(`
      INSERT INTO social_links (platform, url, followers, visible, icon, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const social of socialLinks) {
      insertSocial.run(social.platform, social.url, social.followers, social.visible, social.icon, social.color);
    }
  }

  // Seed default settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const defaultSettings = [
      { key: 'site_title', value: 'CocoCientifico' },
      { key: 'site_tagline', value: 'Ciencia, Naturaleza y Ecoturismo para todos' },
      { key: 'contact_email', value: 'contacto@cococientifico.com' },
      { key: 'primary_color', value: '#1B6B3A' },
      { key: 'secondary_color', value: '#0E9AA7' },
      { key: 'hero_title', value: 'Donde la Ciencia se Encuentra con la Naturaleza' },
      { key: 'hero_subtitle', value: 'Exploramos la biodiversidad, el ecoturismo, la biología tropical y el desarrollo sustentable' }
    ];

    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const setting of defaultSettings) {
      insertSetting.run(setting.key, setting.value);
    }
  }

  // Seed sample videos
  const videoCount = db.prepare('SELECT COUNT(*) as count FROM videos').get();
  if (videoCount.count === 0) {
    const videos = [
      {
        title: 'La Amazonia: El Pulmón del Planeta',
        description: 'Un recorrido visual por la mayor selva tropical del mundo, su biodiversidad y las amenazas que enfrenta.',
        video_url: 'https://www.youtube.com/embed/i7MbHTh-3Rk',
        thumbnail_url: 'https://img.youtube.com/vi/i7MbHTh-3Rk/maxresdefault.jpg'
      },
      {
        title: 'Arrecifes de Coral: Bajo el Mar',
        description: 'Inmersión visual en los arrecifes de coral del Caribe y el Pacífico, explicando su ecología y su crisis actual.',
        video_url: 'https://www.youtube.com/embed/kG9dMKvKAFQ',
        thumbnail_url: 'https://img.youtube.com/vi/kG9dMKvKAFQ/maxresdefault.jpg'
      },
      {
        title: 'Ecoturismo en Costa Rica',
        description: 'Cómo Costa Rica se convirtió en el modelo mundial de turismo sustentable y conservación de la biodiversidad.',
        video_url: 'https://www.youtube.com/embed/vVdDePf7X4U',
        thumbnail_url: 'https://img.youtube.com/vi/vVdDePf7X4U/maxresdefault.jpg'
      }
    ];

    const insertVideo = db.prepare(`
      INSERT INTO videos (title, description, video_url, thumbnail_url)
      VALUES (?, ?, ?, ?)
    `);

    for (const video of videos) {
      insertVideo.run(video.title, video.description, video.video_url, video.thumbnail_url);
    }
  }

  // Seed sample album
  const albumCount = db.prepare('SELECT COUNT(*) as count FROM albums').get();
  if (albumCount.count === 0) {
    db.prepare(`
      INSERT INTO albums (name, description, cover_url)
      VALUES (?, ?, ?)
    `).run('Galería de Ciencia', 'Imágenes fascinantes del mundo científico', null);
  }
}

module.exports = { getDb, initDb };
