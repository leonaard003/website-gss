/**
 * GSS - Gala Sukses Samudera
 * Server: landing page statis + API produk + CMS admin.
 *
 * Penyimpanan sengaja memakai file JSON (bukan database) karena katalog produk
 * berukuran kecil dan mudah di-backup/di-restore hanya dengan menyalin folder /data.
 */
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const SECRET_FILE = path.join(DATA_DIR, '.secret');

/** Bahasa yang didukung. Bahasa pertama adalah bawaan situs. */
const LANGS = ['en', 'id'];

const COOKIE_NAME = 'gss_admin';
const SESSION_MAX_AGE = 1000 * 60 * 60 * 8; // 8 jam

/* ------------------------------------------------------------------ *
 * Penyimpanan JSON
 * ------------------------------------------------------------------ */

/**
 * Semua penulisan file diserialkan lewat satu rantai promise. Tanpa ini, dua
 * request yang menulis bersamaan bisa saling menimpa (read-modify-write race).
 */
let writeQueue = Promise.resolve();

function readJSONSync(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  writeQueue = writeQueue.then(async () => {
    // Tulis ke file sementara lalu rename: rename bersifat atomik, sehingga file
    // asli tidak pernah dalam kondisi setengah tertulis kalau proses mati.
    const tmp = `${file}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
    await fsp.rename(tmp, file);
  });
  return writeQueue;
}

function ensureDirs() {
  for (const dir of [DATA_DIR, UPLOAD_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getSecret() {
  if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, 'utf8');
  return secret;
}

/* ------------------------------------------------------------------ *
 * Seed data awal
 * ------------------------------------------------------------------ */

/* [nama, kategori ID, kategori EN, deskripsi ID, deskripsi EN] */
const SEED_PRODUCTS = [
  ['Baby Octopus', 'Cephalopoda', 'Cephalopod',
   'Gurita muda dengan tekstur kenyal dan lembut. Ukuran serta bentuk penyajian disesuaikan dengan spesifikasi pembeli.',
   'Baby octopus with a tender, springy texture. Size and presentation are tailored to buyer specifications.'],
  ['Mahi-Mahi', 'Ikan', 'Fish',
   'Ikan lemadang dengan daging putih padat dan rasa yang bersih. Ukuran dan bentuk penyajian mengikuti spesifikasi pembeli.',
   'Mahi-mahi with firm white flesh and a clean flavour. Size and presentation follow buyer specifications.'],
  ['Crayfish', 'Krustasea', 'Crustacean',
   'Lobster air tawar dengan daging manis dan tekstur padat. Disortir per ukuran sesuai permintaan pembeli.',
   'Freshwater crayfish with sweet meat and a firm texture. Graded by size according to buyer requirements.'],
  ['Top Shell', 'Siput Laut', 'Sea Snail',
   'Siput laut bertekstur renyah, dibersihkan menyeluruh sebelum diproses. Spesifikasi mengikuti kebutuhan pasar tujuan.',
   'Sea snail with a crisp texture, thoroughly cleaned before processing. Specifications follow destination-market requirements.'],
  ['Squid', 'Cephalopoda', 'Cephalopod',
   'Cumi-cumi dengan daging putih bersih dan tekstur lembut. Bentuk penyajian disesuaikan dengan permintaan pembeli.',
   'Squid with clean white flesh and a tender texture. Presentation is tailored to buyer requests.'],
  ['Cuttlefish', 'Cephalopoda', 'Cephalopod',
   'Sotong dengan daging tebal dan putih bersih. Ukuran serta bentuk penyajian mengikuti spesifikasi pembeli.',
   'Cuttlefish with thick, clean white flesh. Size and presentation follow buyer specifications.'],
  ['Grease Snail', 'Siput Laut', 'Sea Snail',
   'Siput laut bercita rasa gurih dengan tekstur khas. Diproses dan disortir sesuai kebutuhan pasar tujuan.',
   'Sea snail with a savoury flavour and distinctive texture. Processed and graded to destination-market requirements.'],
  ['Moon Snail', 'Siput Laut', 'Sea Snail',
   'Siput bulan dengan daging lembut, dibersihkan menyeluruh sebelum diproses. Spesifikasi mengikuti permintaan pembeli.',
   'Moon snail with tender meat, thoroughly cleaned before processing. Specifications follow buyer requests.'],
];

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // buang diakritik hasil normalisasi NFD
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function seedProducts() {
  if (fs.existsSync(PRODUCTS_FILE)) return;
  const now = new Date().toISOString();
  const products = SEED_PRODUCTS.map(([name, category, categoryEn, description, descriptionEn], i) => ({
    id: crypto.randomUUID(),
    name,
    slug: slugify(name),
    category,
    categoryEn,
    description,
    descriptionEn,
    images: [`/assets/products/${slugify(name)}.jpg`],
    status: 'active',
    order: i,
    createdAt: now,
    updatedAt: now,
  }));
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
}

function seedUsers() {
  if (fs.existsSync(USERS_FILE)) return null;
  const username = process.env.GSS_ADMIN_USER || 'admin';
  const password = process.env.GSS_ADMIN_PASS || 'gss-admin-2026';
  const users = [{
    username,
    name: 'Administrator GSS',
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  }];
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  return { username, password };
}

function seedMessages() {
  if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
}

/* ------------------------------------------------------------------ *
 * Upload gambar
 * ------------------------------------------------------------------ */

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const base = slugify(req.body?.name || path.parse(file.originalname).name) || 'produk';
      const unique = crypto.randomBytes(4).toString('hex');
      cb(null, `${base}-${Date.now()}-${unique}${EXT_BY_MIME[file.mimetype] || '.jpg'}`);
    },
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Format gambar harus JPG, PNG, WEBP, atau AVIF.'));
    }
    cb(null, true);
  },
});

/**
 * Daftar foto sebuah produk, selalu sebagai array.
 * Data lama hanya punya field tunggal `image`; fungsi ini menjembatani
 * keduanya sehingga produk lama tetap tampil tanpa perlu migrasi paksa.
 */
function galleryOf(product) {
  if (Array.isArray(product.images) && product.images.length) {
    return product.images.filter((src) => typeof src === 'string' && src.trim());
  }
  return product.image ? [product.image] : [];
}

/** Hapus file upload lama agar folder tidak menumpuk file yatim. */
async function removeUpload(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const target = path.join(PUBLIC_DIR, imagePath.replace(/^\//, ''));
  // Jaga-jaga terhadap path traversal lewat data yang sudah tersimpan.
  if (!target.startsWith(UPLOAD_DIR)) return;
  await fsp.unlink(target).catch(() => {});
}

/* ------------------------------------------------------------------ *
 * Aplikasi
 * ------------------------------------------------------------------ */

ensureDirs();
seedProducts();
const seededCredentials = seedUsers();
seedMessages();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(getSecret()));

/* --- Autentikasi ------------------------------------------------- */

function currentUser(req) {
  const username = req.signedCookies?.[COOKIE_NAME];
  if (!username) return null;
  const users = readJSONSync(USERS_FILE, []);
  return users.find((u) => u.username === username) || null;
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Sesi berakhir. Silakan login kembali.' });
  req.user = user;
  next();
}

app.post('/api/admin/login', async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const users = readJSONSync(USERS_FILE, []);
  const user = users.find((u) => u.username === String(username).trim());
  const ok = user && (await bcrypt.compare(String(password), user.passwordHash));

  if (!ok) {
    // Pesan sengaja tidak membedakan "user tidak ada" dan "password salah",
    // supaya tidak membocorkan username mana yang valid.
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  res.cookie(COOKIE_NAME, user.username, {
    httpOnly: true,
    signed: true,
    sameSite: 'strict',
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
    maxAge: SESSION_MAX_AGE,
  });
  res.json({ ok: true, user: { username: user.username, name: user.name } });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get('/api/admin/me', requireAuth, (req, res) => {
  res.json({ user: { username: req.user.username, name: req.user.name } });
});

/* --- Produk (publik) --------------------------------------------- */

app.get('/api/products', (_req, res) => {
  // Kedua bahasa dikirim sekaligus supaya tombol ganti bahasa di sisi klien
  // tidak perlu memanggil ulang API.
  const products = readJSONSync(PRODUCTS_FILE, [])
    .filter((p) => p.status === 'active')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((p) => {
      const images = galleryOf(p);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: images[0] || '',   // sampul kartu
        images,                   // seluruh foto untuk slideshow
        category: { id: p.category, en: p.categoryEn || p.category },
        description: { id: p.description, en: p.descriptionEn || p.description },
      };
    });
  res.set('Cache-Control', 'no-store');
  res.json(products);
});

/* --- Konten halaman ---------------------------------------------- */

app.get('/api/content', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(readJSONSync(CONTENT_FILE, {}));
});

app.get('/api/admin/content', requireAuth, (_req, res) => {
  res.json(readJSONSync(CONTENT_FILE, {}));
});

app.put('/api/admin/content', requireAuth, async (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Format konten tidak valid.' });
  }
  // Cek kewarasan minimal: menyimpan objek kosong akan mengosongkan seluruh
  // halaman, dan itu hampir pasti bukan yang dimaksud admin.
  const current = readJSONSync(CONTENT_FILE, {});
  const missing = Object.keys(current).filter((k) => !(k in incoming));
  if (missing.length) {
    return res.status(400).json({ error: `Bagian berikut hilang dari kiriman: ${missing.join(', ')}.` });
  }
  await writeJSON(CONTENT_FILE, incoming);
  res.json({ ok: true });
});

/** Upload gambar untuk section halaman maupun galeri produk. */
app.post('/api/admin/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada berkas gambar yang dikirim.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

/**
 * Buang berkas yang terlanjur diunggah tetapi batal dipakai.
 * Karena foto diunggah seketika saat dipilih, membatalkan form akan
 * meninggalkan berkas yatim di disk bila tidak dibersihkan seperti ini.
 * removeUpload hanya menyentuh /uploads/ dan menolak path di luarnya.
 */
app.post('/api/admin/upload/cleanup', requireAuth, async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  await Promise.all(urls.slice(0, 50).map(removeUpload));
  res.json({ ok: true, dihapus: urls.length });
});

/* --- Produk (admin) ---------------------------------------------- */

app.get('/api/admin/products', requireAuth, (_req, res) => {
  const products = readJSONSync(PRODUCTS_FILE, []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(products);
});

function normalizeInput(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  // Field Inggris opsional: bila dikosongkan admin, versi Indonesia dipakai
  // sebagai cadangan supaya kartu produk tidak pernah tampil kosong.
  const categoryEn = String(body.categoryEn || '').trim() || category;
  const descriptionEn = String(body.descriptionEn || '').trim() || description;
  const status = body.status === 'draft' ? 'draft' : 'active';

  // Daftar foto dikirim sebagai array URL yang sudah diunggah lebih dulu
  // lewat /api/admin/upload. Urutannya menentukan urutan slideshow;
  // elemen pertama menjadi sampul kartu.
  const images = Array.isArray(body.images)
    ? body.images.filter((src) => typeof src === 'string' && src.trim()).slice(0, 12)
    : [];

  return { name, category, categoryEn, description, descriptionEn, status, images };
}

/** Hapus berkas unggahan yang tidak lagi dirujuk produk mana pun. */
async function pruneUploads(sebelum, sesudah) {
  const dipakai = new Set(sesudah);
  await Promise.all(sebelum.filter((src) => !dipakai.has(src)).map(removeUpload));
}

app.post('/api/admin/products', requireAuth, async (req, res) => {
  const { name, category, categoryEn, description, descriptionEn, status, images } =
    normalizeInput(req.body || {});
  if (!name || !category) {
    return res.status(400).json({ error: 'Nama dan kategori produk wajib diisi.' });
  }

  const products = readJSONSync(PRODUCTS_FILE, []);
  const now = new Date().toISOString();
  const product = {
    id: crypto.randomUUID(),
    name,
    slug: slugify(name),
    category,
    categoryEn,
    description,
    descriptionEn,
    images: images.length ? images : ['/assets/products/placeholder.svg'],
    status,
    order: products.length ? Math.max(...products.map((p) => p.order ?? 0)) + 1 : 0,
    createdAt: now,
    updatedAt: now,
  };

  products.push(product);
  await writeJSON(PRODUCTS_FILE, products);
  res.status(201).json(product);
});

app.put('/api/admin/products/:id', requireAuth, async (req, res) => {
  const products = readJSONSync(PRODUCTS_FILE, []);
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Produk tidak ditemukan.' });

  const { name, category, categoryEn, description, descriptionEn, status, images } =
    normalizeInput(req.body || {});
  if (!name || !category) {
    return res.status(400).json({ error: 'Nama dan kategori produk wajib diisi.' });
  }

  const previous = products[index];
  const galeriBaru = images.length ? images : ['/assets/products/placeholder.svg'];

  const updated = {
    ...previous,
    name,
    slug: slugify(name),
    category,
    categoryEn,
    description,
    descriptionEn,
    images: galeriBaru,
    status,
    updatedAt: new Date().toISOString(),
  };
  delete updated.image;   // field tunggal versi lama tidak dipakai lagi

  // Foto yang dibuang admin dihapus dari disk agar folder tidak menumpuk yatim
  await pruneUploads(galleryOf(previous), galeriBaru);

  products[index] = updated;
  await writeJSON(PRODUCTS_FILE, products);
  res.json(updated);
});

app.delete('/api/admin/products/:id', requireAuth, async (req, res) => {
  const products = readJSONSync(PRODUCTS_FILE, []);
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Produk tidak ditemukan.' });

  const [removed] = products.splice(index, 1);
  await writeJSON(PRODUCTS_FILE, products);
  // Seluruh foto produk ikut dihapus, bukan hanya sampulnya
  await Promise.all(galleryOf(removed).map(removeUpload));
  res.json({ ok: true });
});

/** Simpan ulang urutan produk (drag & drop di halaman admin). */
app.put('/api/admin/products-order', requireAuth, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
  if (!ids) return res.status(400).json({ error: 'Format urutan tidak valid.' });

  const products = readJSONSync(PRODUCTS_FILE, []);
  const position = new Map(ids.map((id, i) => [id, i]));
  for (const product of products) {
    if (position.has(product.id)) product.order = position.get(product.id);
  }
  await writeJSON(PRODUCTS_FILE, products);
  res.json({ ok: true });
});

/* --- Pesan kontak ------------------------------------------------- */

app.post('/api/contact', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Nama, email, dan pesan wajib diisi.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Format email tidak valid.' });
  }

  const messages = readJSONSync(MESSAGES_FILE, []);
  messages.unshift({
    id: crypto.randomUUID(),
    name: name.slice(0, 120),
    email: email.slice(0, 160),
    phone: phone.slice(0, 40),
    message: message.slice(0, 4000),
    read: false,
    createdAt: new Date().toISOString(),
  });
  await writeJSON(MESSAGES_FILE, messages.slice(0, 500));
  res.json({ ok: true });
});

app.get('/api/admin/messages', requireAuth, (_req, res) => {
  res.json(readJSONSync(MESSAGES_FILE, []));
});

app.delete('/api/admin/messages/:id', requireAuth, async (req, res) => {
  const messages = readJSONSync(MESSAGES_FILE, []).filter((m) => m.id !== req.params.id);
  await writeJSON(MESSAGES_FILE, messages);
  res.json({ ok: true });
});

/* --- Static & routing --------------------------------------------- */

app.use(express.static(PUBLIC_DIR, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    // `no-cache` = boleh disimpan, tapi WAJIB divalidasi ke server sebelum
    // dipakai. Tanpa ini peramban boleh memakai salinan lama dari memori
    // tanpa bertanya, sehingga perubahan CSS/JS baru terlihat setelah
    // hard-reload. Gambar tidak diperlakukan begitu — namanya sudah unik.
    if (/\.(?:js|css|html)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.get('/admin', (_req, res) => res.redirect('/admin/'));

// Penanganan error terpusat, terutama untuk error multer (ukuran/format file).
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Ukuran gambar maksimal 6 MB.' });
  }
  console.error(err);
  res.status(400).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log('\n  Gala Sukses Samudera');
  console.log(`  Landing page : http://localhost:${PORT}/`);
  console.log(`  CMS admin    : http://localhost:${PORT}/admin/`);
  if (seededCredentials) {
    console.log('\n  Akun admin dibuat otomatis:');
    console.log(`    username : ${seededCredentials.username}`);
    console.log(`    password : ${seededCredentials.password}`);
    console.log('  Ganti password ini sebelum situs dipublikasikan.\n');
  } else {
    console.log('');
  }
});
