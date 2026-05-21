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
        title: 'El Fascinante Mundo de los Agujeros Negros',
        slug: 'el-fascinante-mundo-de-los-agujeros-negros',
        content: `Los agujeros negros son una de las estructuras más misteriosas y fascinantes del universo. Estas regiones del espacio-tiempo tienen una gravedad tan intensa que nada, ni siquiera la luz, puede escapar de ellas una vez que cruza el horizonte de eventos.

La existencia de los agujeros negros fue predicha por la teoría de la relatividad general de Albert Einstein en 1916, aunque el término "agujero negro" no fue acuñado hasta 1967 por el físico John Wheeler. En 2019, el Telescopio de Horizonte de Sucesos (EHT) capturó la primera imagen directa de un agujero negro, ubicado en el centro de la galaxia M87.

Los agujeros negros se clasifican en tres tipos principales según su masa: los estelares (resultado del colapso de estrellas masivas), los de masa intermedia, y los supermasivos que habitan en el centro de la mayoría de las galaxias grandes, incluyendo nuestra Vía Láctea con Sagitario A*.

La física cerca del horizonte de eventos desafía nuestra comprensión convencional del espacio y el tiempo. El tiempo se dilata extremadamente, y la gravedad causa el fenómeno conocido como "espaguetificación" para cualquier objeto que se acerque demasiado.`,
        excerpt: 'Explora los misterios de los agujeros negros, desde su formación hasta las últimas imágenes capturadas por el Telescopio de Horizonte de Sucesos.',
        category: 'Astronomía',
        image_url: null,
        tags: JSON.stringify(['astronomía', 'física', 'espacio', 'agujeros negros']),
        published: 1
      },
      {
        title: 'CRISPR: La Revolución en la Edición Genética',
        slug: 'crispr-la-revolucion-en-la-edicion-genetica',
        content: `CRISPR-Cas9 ha transformado radicalmente la biología molecular y la medicina. Esta tecnología, derivada del sistema inmune de las bacterias, permite editar el ADN con una precisión sin precedentes, abriendo posibilidades que hace una década parecían ciencia ficción.

La técnica funciona como "tijeras moleculares": la proteína Cas9 actúa como la herramienta de corte, guiada por una secuencia de ARN diseñada específicamente para encontrar la región del ADN que queremos modificar. Una vez localizado el objetivo, Cas9 realiza un corte preciso en la doble hélice.

Las aplicaciones de CRISPR son revolucionarias: desde el tratamiento de enfermedades genéticas como la anemia falciforme y la distrofia muscular de Duchenne, hasta el desarrollo de cultivos resistentes a enfermedades y el potencial para combatir el cáncer mediante la modificación de células T.

En 2020, Jennifer Doudna y Emmanuelle Charpentier recibieron el Premio Nobel de Química por el desarrollo de CRISPR, reconociendo una de las herramientas más poderosas de la biología moderna.`,
        excerpt: 'Descubre cómo CRISPR-Cas9 está revolucionando la medicina y la biología, permitiendo editar genes con una precisión sorprendente.',
        category: 'Biología',
        image_url: null,
        tags: JSON.stringify(['genética', 'CRISPR', 'biología molecular', 'medicina']),
        published: 1
      },
      {
        title: 'Inteligencia Artificial: El Futuro que Ya Está Aquí',
        slug: 'inteligencia-artificial-el-futuro-que-ya-esta-aqui',
        content: `La inteligencia artificial ha dejado de ser un concepto futurista para convertirse en una tecnología omnipresente en nuestra vida cotidiana. Desde los asistentes virtuales hasta los sistemas de diagnóstico médico, la IA está transformando todos los sectores de la sociedad.

El aprendizaje profundo (deep learning), una subcategoría del aprendizaje automático, ha sido el motor de esta revolución. Redes neuronales artificiales inspiradas en el cerebro humano pueden ahora reconocer imágenes con mayor precisión que los humanos, traducir idiomas en tiempo real y componer música original.

Los modelos de lenguaje grande (LLMs) como GPT han demostrado capacidades sorprendentes de generación de texto, razonamiento y resolución de problemas. Esto plantea preguntas fundamentales sobre la naturaleza de la inteligencia y la creatividad.

Sin embargo, la IA también presenta desafíos importantes: sesgos algorítmicos, privacidad de datos, impacto en el empleo y preguntas éticas sobre la autonomía de los sistemas. La gobernanza responsable de la IA será uno de los grandes retos del siglo XXI.`,
        excerpt: 'Un viaje por el estado actual de la inteligencia artificial: sus logros extraordinarios, sus aplicaciones reales y los desafíos éticos que plantea.',
        category: 'Tecnología',
        image_url: null,
        tags: JSON.stringify(['IA', 'machine learning', 'tecnología', 'futuro']),
        published: 1
      },
      {
        title: 'El Cambio Climático: Evidencias y Soluciones',
        slug: 'el-cambio-climatico-evidencias-y-soluciones',
        content: `El cambio climático es el desafío más urgente que enfrenta la humanidad en el siglo XXI. Las evidencias científicas son contundentes: la temperatura media global ha aumentado aproximadamente 1.1°C desde la era preindustrial, y los efectos se hacen cada vez más evidentes en todo el planeta.

Los datos del IPCC (Panel Intergubernamental de Cambio Climático) muestran que las concentraciones de CO₂ en la atmósfera han alcanzado niveles sin precedentes en al menos 800,000 años. Los glaciares retroceden, el nivel del mar sube y los eventos climáticos extremos se vuelven más frecuentes e intensos.

La buena noticia es que las soluciones existen: la transición hacia energías renovables (solar, eólica, geotérmica), la electromovilidad, la eficiencia energética y la captura de carbono son herramientas poderosas. La energía solar ha experimentado una reducción del 90% en costos en la última década.

La economía circular, la reforestación inteligente y los cambios en nuestros sistemas alimentarios (reducción del consumo de carne, menos desperdicio) también son parte esencial de la solución. La acción individual importa, pero los cambios sistémicos y políticos son fundamentales.`,
        excerpt: 'Analizamos las evidencias científicas del cambio climático y las soluciones tecnológicas y sociales que pueden guiarnos hacia un futuro sostenible.',
        category: 'Medio Ambiente',
        image_url: null,
        tags: JSON.stringify(['cambio climático', 'medio ambiente', 'sostenibilidad', 'energía']),
        published: 1
      },
      {
        title: 'Física Cuántica: La Extraña Realidad a Escala Subatómica',
        slug: 'fisica-cuantica-la-extrana-realidad-a-escala-subatomica',
        content: `La mecánica cuántica es quizás la teoría física más exitosa y al mismo tiempo más desconcertante jamás desarrollada. Describe el comportamiento de la materia y la energía a escalas subatómicas, donde las reglas del mundo cotidiano dejan de aplicarse.

El principio de superposición establece que las partículas pueden existir en múltiples estados simultáneamente hasta que son observadas. El famoso experimento mental del "Gato de Schrödinger" ilustra esta paradoja: un gato en una caja puede estar vivo y muerto al mismo tiempo desde la perspectiva cuántica.

El entrelazamiento cuántico, descrito por Einstein como "acción fantasmal a distancia", conecta partículas de manera que el estado de una afecta instantáneamente a la otra, sin importar la distancia que las separe. Este fenómeno es la base de la computación cuántica y la criptografía cuántica.

Las computadoras cuánticas, que utilizan qubits en lugar de bits clásicos, prometen resolver problemas que tomarían millones de años a las computadoras convencionales: desde el diseño de medicamentos hasta la optimización de rutas logísticas. Empresas como IBM, Google y startups especializadas están en una carrera por alcanzar la "supremacía cuántica".`,
        excerpt: 'Adéntrate en el extraño mundo cuántico donde las partículas existen en múltiples estados, el entrelazamiento desafía la intuición y las computadoras del futuro toman forma.',
        category: 'Física',
        image_url: null,
        tags: JSON.stringify(['física cuántica', 'mecánica cuántica', 'computación cuántica', 'ciencia']),
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
      { key: 'site_tagline', value: 'Ciencia para todos, explicada de forma apasionante' },
      { key: 'contact_email', value: 'contacto@cococientifico.com' },
      { key: 'primary_color', value: '#6200EA' },
      { key: 'secondary_color', value: '#00E5FF' },
      { key: 'hero_title', value: 'Descubre la Ciencia que Transforma el Mundo' },
      { key: 'hero_subtitle', value: 'Exploramos los misterios del universo, la tecnología del futuro y la naturaleza de la realidad' }
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
        title: 'La Relatividad Explicada en 10 Minutos',
        description: 'Una explicación visual y accesible de la teoría de la relatividad especial y general de Einstein.',
        video_url: 'https://www.youtube.com/embed/yuD34tEpRFw',
        thumbnail_url: 'https://img.youtube.com/vi/yuD34tEpRFw/maxresdefault.jpg'
      },
      {
        title: 'Cómo Funciona el ADN',
        description: 'Viaje al interior de la célula para entender cómo el ADN almacena y transmite la información genética.',
        video_url: 'https://www.youtube.com/embed/zwibgNGe4aY',
        thumbnail_url: 'https://img.youtube.com/vi/zwibgNGe4aY/maxresdefault.jpg'
      },
      {
        title: 'El Universo Observable',
        description: 'Exploramos la escala del universo observable, desde los quarks hasta los supercúmulos de galaxias.',
        video_url: 'https://www.youtube.com/embed/17jymDn0W6U',
        thumbnail_url: 'https://img.youtube.com/vi/17jymDn0W6U/maxresdefault.jpg'
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
