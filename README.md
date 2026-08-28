# Gala Sukses Samudera — Landing Page & CMS

Landing page satu halaman (single-page scroll) untuk perusahaan pengolahan & ekspor
seafood **Gala Sukses Samudera (GSS)**, Medan — Indonesia, lengkap dengan CMS terpisah
untuk mengelola katalog produk.

---

## Menjalankan

```bash
npm install
npm start
```

| Halaman | URL |
|---|---|
| Landing page | http://localhost:3000/ |
| CMS admin | http://localhost:3000/admin/ |

Akun admin dibuat otomatis saat server pertama kali dijalankan dan dicetak di terminal:

```
username : admin
password : gss-admin-2026
```

> **Ganti password ini sebelum situs dipublikasikan.** Lihat bagian
> [Mengganti password admin](#mengganti-password-admin).

Untuk pengembangan dengan auto-reload:

```bash
npm run dev
```

---

## Dwibahasa (EN / ID)

Situs berjalan dalam dua bahasa dengan **bahasa Inggris sebagai bawaan**. Tombol
`EN | ID` ada di bar navigasi; pilihan pengguna diingat di peramban
(`localStorage`), dan atribut `<html lang>` ikut berubah.

Teks dibagi dua jenis:

| Jenis | Disimpan di | Bisa diubah lewat CMS? |
|---|---|---|
| **Isi perusahaan** — judul, paragraf, visi, misi, nilai, tahapan QC, kontak | `data/content.json` | ✅ ya |
| **Label antarmuka** — menu, tombol, label formulir | `UI` di `public/js/main.js` | ❌ tidak (ubah di kode) |

Setiap teks isi berbentuk pasangan `{ "id": "…", "en": "…" }`. Bila salah satu
kosong, situs memakai bahasa yang tersedia sebagai cadangan — halaman tidak
pernah tampil kosong.

Teks Inggris bukan hasil terjemahan mesin: seluruhnya kalimat asli dari
company profile GSS. Versi Indonesia adalah terjemahannya.

---

## CMS — apa saja yang bisa diubah

Buka `/admin/`. Ada tiga menu:

### 1. Konten Halaman

Sembilan tab, satu untuk tiap bagian halaman utama. Setiap kolom teks tampil
berpasangan (Indonesia | English).

| Tab | Yang bisa diubah |
|---|---|
| **Hero** | Judul besar, subjudul, **foto hero**, empat statistik |
| **Tentang Kami** | Label, judul, tiga paragraf, **foto**, kartu emas, fakta ringkas |
| **Visi & Misi** | Label, judul, **foto**, pernyataan Visi + poin, pernyataan Misi + poin |
| **Core Values** | Judul, pengantar, kelima nilai (ikon, judul, penjelasan) |
| **Perjalanan Kami** | Judul, tiga paragraf, angka kapasitas awal & kini, panel pertumbuhan, tahapan timeline |
| **Judul Section Produk** | Label, judul, pengantar (daftar produknya di menu Produk) |
| **Quality Control** | Judul, pengantar, kelima tahap |
| **Kontak** | WhatsApp, email, Instagram, alamat, pencarian peta, judul formulir |
| **Footer** | Paragraf footer |

Catatan penggunaan:

- **Judul besar**: satu baris teks = satu baris di halaman. Baris terakhir
  otomatis berwarna emas.
- **Daftar** (statistik, nilai, timeline, poin, tahap QC) bisa ditambah, dihapus,
  dan diubah urutannya lewat tombol ↑ ↓ 🗑.
- **Foto** diunggah langsung; pratinjau langsung berganti. Perubahan baru
  tersimpan setelah menekan **Simpan Perubahan**.
- Tombol Simpan menyala dengan titik merah saat ada perubahan belum tersimpan,
  dan peramban akan memperingatkan bila tab ditutup sebelum disimpan.
- Poin Misi: teks sebelum tanda ` — ` akan ditebalkan di halaman.

### 2. Produk

Tabel produk dengan tambah / edit / hapus / atur urutan. Kategori dan deskripsi
kini punya kolom Indonesia dan English — kolom English boleh dikosongkan dan
akan memakai teks Indonesia sebagai cadangan.

### 3. Pesan Masuk

Pesan dari formulir kontak.

---

## Yang perlu Anda lengkapi

Tiga hal berikut sengaja dibiarkan sebagai placeholder karena datanya belum tersedia.

### 1. Titik peta ⚠️

Alamat lengkap sudah terpasang dari company profile:

> Jl. Titi Pahlawan No. 13B, Paya Pasir, Kec. Medan Marelan,
> Kota Medan, Sumatera Utara 20254

Embed peta saat ini mencari lokasi berdasarkan **teks alamat**. Google biasanya
menemukannya, tetapi untuk alamat industri penanda kadang meleset beberapa ratus meter.
Cara memastikannya tepat — ganti parameter `q=` pada `<iframe>` di section Kontak
`public/index.html` dengan koordinat:

```html
src="https://www.google.com/maps?q=3.7405,98.6512&hl=id&z=17&output=embed"
```

Ambil koordinatnya dari Google Maps → klik kanan tepat di lokasi pabrik → salin angka
lintang/bujur yang muncul. (Angka di atas hanya contoh format, bukan lokasi GSS.)
Embed ini tidak memerlukan API key.

### 2. Foto — semua sudah terisi, tapi periksa kembali

Seluruh foto di situs **diekstrak dari company profile PDF**, bukan foto stok:

| Foto | Sumber di PDF | Dipakai di |
|---|---|---|
| Logo GSS | Halaman sampul (1251 × 1251, transparan) | Nav, footer, CMS, favicon |
| `hero-ocean.jpg` | Halaman 3 — lini sortasi | Latar hero |
| `about-factory.jpg` | Halaman 8 — area cuci tangan | Section Tentang Kami |
| `vision-mission.jpg` | Halaman 3 — potongan berbeda | Section Visi & Misi |
| 8 foto produk | Halaman 7 | Kartu produk |

Foto produk dipetakan ke tiap komoditas berdasarkan **koordinat penempatan gambar
dan label di halaman 7 PDF**, bukan tebakan. Meski begitu, sebaiknya Anda cek
sekilas — bila ada yang tertukar, cukup unggah ulang lewat CMS.

Ketiga foto section (hero, tentang kami, visi & misi) juga bisa diganti lewat
**CMS → Konten Halaman**, tanpa menyentuh kode. Rasio yang disarankan:

- Hero — 16:9 lanskap, minimal 1920 × 1080. Pilih foto yang bagian kirinya
  relatif lengang, karena headline diletakkan di kiri-bawah.
- Tentang Kami — 4:5 potret, minimal 1200 × 1500.
- Visi & Misi — 3:4 potret.

### 3. Foto produk

Unggah lewat CMS: `/admin/` → **Produk** → tombol Edit (ikon pensil) →
*Pilih Foto* → Simpan. Rasio ideal 4:3, maksimal 6 MB, format JPG/PNG/WEBP/AVIF.
Foto lama otomatis dihapus dari server saat diganti, jadi folder `uploads/`
tidak menumpuk berkas tak terpakai.

---

## Sumber isi & batas klaim

Seluruh teks perusahaan pada landing page berasal dari **company profile GSS
(`COMPRO - GSS.pdf`)** dan merupakan terjemahan setia ke bahasa Indonesia:

| Section | Sumber |
|---|---|
| Tentang Kami | Halaman *About Us* |
| Visi & Misi | Halaman *Vission and Mission* — pernyataan resmi, **jangan diparafrase** |
| Core Values | Halaman *Core Value* — kelima poin |
| History | Halaman *History* — termasuk tahun berdiri 2020 |
| Quality Control | Halaman *Quality Control* — kelima tahap |
| Kontak | Halaman *Contact Us* |

Tiga hal yang sengaja **tidak** dimasukkan, dan alasannya:

- **`www.reallygreatsite.com`** di halaman sampul PDF adalah placeholder bawaan
  template Canva, bukan domain GSS. Tidak dipasang di mana pun.
- **Sertifikasi (HACCP, BRC, dsb.)** tidak disebutkan sama sekali di company profile,
  jadi tidak ada klaim sertifikasi di situs. Jangan menambahkannya tanpa dokumen
  sertifikat yang berlaku — ini klaim yang mengikat secara hukum di pasar ekspor.
- **Satuan waktu kapasitas.** Company profile menulis "3–5 tons" dan "15–20 tons"
  tanpa menyebut per hari/minggu/bulan, sehingga label di situs hanya menulis "Ton".
  Kalau satuannya per hari, tambahkan sendiri di section History dan strip hero.

### Deskripsi produk perlu ditinjau

Company profile hanya mencantumkan **nama** kedelapan produk, tanpa deskripsi. Teks
deskripsi di CMS saat ini berisi karakteristik umum spesies ditambah klausul
"sesuai spesifikasi pembeli" — aman, tetapi belum mencerminkan spesifikasi GSS
yang sebenarnya.

Sebaiknya Anda perbarui lewat `/admin/` dengan data riil: bentuk penyajian
(*whole cleaned*, *tube*, *fillet*, *loin*, dsb.), rentang ukuran/grade, jenis kemasan,
dan pasar tujuan utama. Tidak perlu menyentuh kode.

---

## Palet warna identitas

Dua warna resmi GSS:

| | Hex | Token CSS | Dipakai untuk |
|---|---|---|---|
| ⬛ Navy | `#002F60` | `--navy-800` | Band gelap, tombol primer, ikon, logo |
| 🟨 Emas | `#8D7C24` | `--gold-500` | Tombol aksen, bidang emas, garis, logo |

Turunan lain dalam `:root` **bukan warna baru** — semuanya versi gelap/terang dari dua
warna di atas, dan ada murni untuk memenuhi ambang kontras teks:

| Token | Hex | Alasan keberadaannya |
|---|---|---|
| `--navy-950` | `#000D1C` | Warna teks di atas bidang emas. Navy identitas di atas emas hanya 2.1:1 — tidak terbaca. Nilai ini mencapai **4.7:1**. |
| `--navy-900` | `#001A38` | Band gelap kedua, agar section berselang-seling tetap terbaca bedanya. |
| `--navy-700` | `#054A8C` | Warna hover tombol navy. |
| `--gold-600` | `#6B5D1B` | Teks emas kecil di atas latar terang (label eyebrow). Emas identitas di atas putih hanya 3.8:1; nilai ini **6.0:1**. |
| `--gold-400` | `#C9B249` | Teks emas kecil di atas latar navy. Emas identitas di atas navy hanya 3.2:1; nilai ini **6.3:1**. |

Alasannya: `#8D7C24` adalah emas yang cukup gelap. Sebagai **bidang** (tombol, badge,
garis) ia sempurna, tetapi sebagai **teks kecil** ia gagal ambang keterbacaan WCAG di
kedua latar. Karena itu emas identitas tetap dipakai penuh untuk semua bidang, dan
hanya digeser terang/gelap ketika berperan sebagai teks berukuran kecil.

Ingin mengubah warna? Cukup ubah `--navy-800` dan `--gold-500` di dua tempat:
`public/css/style.css` dan `public/admin/css/admin.css` — lalu sesuaikan turunannya.
Logo (`public/assets/logo-gss.svg`) dan favicon memakai nilai hex langsung, jadi perlu
disunting terpisah.

---

## Struktur folder

```
Website GSS/
├── server.js                  # Express: API produk, autentikasi, upload, form kontak
├── package.json
├── data/                      # Penyimpanan (JSON) — backup cukup salin folder ini
│   ├── products.json          #   katalog produk
│   ├── users.json             #   akun admin (password ter-hash bcrypt)
│   ├── messages.json          #   pesan dari formulir kontak
│   └── .secret                #   kunci penanda-tangan cookie (dibuat otomatis)
└── public/
    ├── index.html             # Landing page — seluruh 10 section
    ├── css/style.css
    ├── js/main.js             # Nav, reveal on scroll, slider, form kontak
    ├── assets/
    │   ├── logo-gss.svg       # Logo kapal layar (navy + emas)
    │   ├── favicon.svg
    │   ├── hero-ocean.jpg     # ← LETAKKAN FOTO ANDA DI SINI
    │   ├── about-factory.jpg  # ← LETAKKAN FOTO ANDA DI SINI
    │   ├── placeholder-*.svg  # Cadangan bila foto di atas belum ada
    │   └── products/*.svg     # Placeholder awal 8 produk
    ├── uploads/               # Foto produk hasil unggahan CMS
    └── admin/
        ├── login.html
        ├── index.html         # Tabel produk + inbox pesan
        ├── css/admin.css
        └── js/admin.js
```

---

## Section pada landing page

| # | Section | `id` | Catatan |
|---|---|---|---|
| 1 | Navigation | — | Hamburger di bawah 980 px, smooth-scroll, penanda menu aktif |
| 2 | Hero | `#home` | Foto full-width, headline animasi baris, strip statistik |
| 3 | Tentang Kami | `#tentang` | Foto pabrik + profil perusahaan |
| 4 | Vision & Mission | `#visi-misi` | Dua kolom, band gelap |
| 5 | Core Values | `#nilai` | 5 poin berikon |
| 6 | History | `#sejarah` | Narasi + highlight 3–5 ton → 15–20 ton |
| 7 | **Produk** | `#produk` | **Slider — data dari CMS** |
| 8 | Quality Control | `#quality` | 5 tahap bernomor |
| 9 | Kontak | `#kontak` | WhatsApp, email, Instagram, alamat, peta, form |
| 10 | Footer | — | Logo, kontak singkat, alamat |

Menu navigasi sengaja hanya memuat lima tautan sesuai permintaan (Home, Tentang Kami,
Produk, Quality Control, Kontak). Section Visi & Misi, Core Values, dan History tetap
dapat dijangkau dengan menggulir, dan tautannya tersedia lewat anchor `id` di atas.

---

## Cara kerja CMS ↔ landing page

Section Produk **tidak menyimpan data apa pun di dalam HTML**. Saat halaman dibuka,
`main.js` memanggil `GET /api/products`, lalu membangun kartu produk dari respons JSON.

```
Admin menyimpan produk  →  data/products.json  →  GET /api/products  →  kartu slider
```

Konsekuensinya:

- Tambah / edit / hapus produk lewat CMS **langsung tercermin** di halaman utama pada
  pemuatan berikutnya, tanpa menyentuh kode.
- Produk berstatus **Draft** tidak dikirim oleh `/api/products` sama sekali — jadi
  benar-benar tidak terlihat pengunjung, bukan sekadar disembunyikan lewat CSS.
- Urutan kartu di slider mengikuti urutan di tabel admin (tombol ↑ ↓).

### Endpoint

| Method | Endpoint | Auth | Keterangan |
|---|---|:--:|---|
| `GET` | `/api/products` | — | Produk berstatus aktif, untuk landing page |
| `POST` | `/api/contact` | — | Menerima kiriman formulir kontak |
| `POST` | `/api/admin/login` | — | Login, memasang cookie sesi bertanda tangan |
| `POST` | `/api/admin/logout` | — | Keluar |
| `GET` | `/api/admin/me` | ✓ | Data pengguna sesi berjalan |
| `GET` | `/api/admin/products` | ✓ | Semua produk, termasuk draft |
| `POST` | `/api/admin/products` | ✓ | Tambah (multipart, field `image`) |
| `PUT` | `/api/admin/products/:id` | ✓ | Ubah (multipart, `image` opsional) |
| `DELETE` | `/api/admin/products/:id` | ✓ | Hapus produk + fotonya |
| `PUT` | `/api/admin/products-order` | ✓ | Simpan urutan `{ ids: [...] }` |
| `GET` | `/api/admin/messages` | ✓ | Pesan masuk |
| `DELETE` | `/api/admin/messages/:id` | ✓ | Hapus pesan |

---

## Mengganti password admin

Cara paling sederhana — hapus akun lama lalu buat ulang dengan kredensial pilihan Anda:

```bash
rm data/users.json
```

Lalu jalankan server dengan variabel lingkungan:

```bash
GSS_ADMIN_USER=admin GSS_ADMIN_PASS="password-baru-yang-kuat" npm start
```

Di PowerShell:

```powershell
$env:GSS_ADMIN_USER="admin"; $env:GSS_ADMIN_PASS="password-baru-yang-kuat"; npm start
```

Password disimpan sebagai hash bcrypt, bukan teks polos. Setelah akun terbentuk,
variabel lingkungan tersebut tidak dibaca lagi pada start berikutnya.

---

## Catatan keamanan

Yang sudah diterapkan:

- Password di-hash bcrypt (cost 10); pesan login sengaja tidak membedakan
  "username salah" dan "password salah" agar tidak membocorkan username yang valid.
- Sesi memakai cookie `httpOnly` + `signed` + `sameSite=strict`, berlaku 8 jam.
  Flag `secure` menyala otomatis saat diakses lewat HTTPS.
- Upload dibatasi jenis MIME gambar, satu file, maksimal 6 MB, dan nama file
  di-sanitasi sehingga tidak bisa dipakai untuk *path traversal*.
- Semua render data pengguna memakai `textContent` / DOM API, bukan `innerHTML`,
  sehingga input yang mengandung HTML tidak pernah dieksekusi sebagai markup.
- Halaman admin memakai `<meta name="robots" content="noindex, nofollow">`.

Yang perlu Anda tambahkan **sebelum produksi**:

- **HTTPS.** Cookie sesi baru mendapat flag `secure` bila koneksi HTTPS. Jalankan di
  belakang reverse proxy (Nginx / Caddy) dengan sertifikat TLS.
- **Rate limiting** pada `/api/admin/login` dan `/api/contact` untuk menahan
  percobaan brute-force dan spam formulir. Paket `express-rate-limit` cukup memadai.
- **Backup `data/`.** Seluruh isi CMS ada di folder itu — cukup salin berkala.

---

## Deployment

Aplikasi ini butuh runtime Node.js (bukan hosting statis), karena CMS menulis file.
Cocok untuk VPS, Railway, Render, Fly.io, atau cPanel dengan dukungan Node.

Yang perlu diperhatikan di platform mana pun:

1. **Port** dibaca dari `process.env.PORT`, jatuh ke `3000` bila tidak diset.
2. **Penyimpanan persisten.** Folder `data/` dan `public/uploads/` harus berada pada
   volume yang tidak terhapus saat redeploy. Pada platform dengan filesystem sementara
   (mis. Heroku, sebagian konfigurasi Railway), pasang *persistent volume* — kalau
   tidak, produk dan foto akan hilang setiap deploy.
3. Jalankan dengan process manager (`pm2`, `systemd`) agar otomatis hidup kembali.

---

## Kompatibilitas & aksesibilitas

- Diuji pada peramban modern (Chrome, Edge, Firefox, Safari). Fitur yang dipakai —
  `IntersectionObserver`, `scroll-snap`, `clamp()`, `:focus-visible` — didukung luas.
- Animasi otomatis dinonaktifkan bila sistem pengguna mengaktifkan
  *reduce motion* (`prefers-reduced-motion`).
- Slider produk bisa dinavigasi dengan tombol panah kiri/kanan saat difokuskan.
- Semua kontrol interaktif punya `aria-label`, dan menu hamburger memperbarui
  `aria-expanded`.
