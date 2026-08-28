/**
 * GSS — landing page.
 * Menangani: dwibahasa (EN/ID), pengisian konten dari CMS, navigasi,
 * reveal on scroll, slider produk, dan formulir kontak.
 */
(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LANGS = ['en', 'id'];
  const STORAGE_KEY = 'gss-lang';
  const FALLBACK_IMAGE = '/assets/products/placeholder.svg';

  /** Bahasa bawaan situs adalah Inggris; pilihan pengguna diingat per peramban. */
  let lang = LANGS.includes(localStorage.getItem(STORAGE_KEY))
    ? localStorage.getItem(STORAGE_KEY)
    : 'en';

  let content = null;
  let products = [];

  /* ================================================================
     1. Kamus antarmuka
     Hanya label struktural. Teks perusahaan tidak di sini — semuanya
     berasal dari CMS lewat /api/content agar bisa disunting admin.
     ================================================================ */
  const UI = {
    en: {
      'nav.home': 'Home', 'nav.about': 'About Us', 'nav.products': 'Products',
      'nav.quality': 'Quality Control', 'nav.contact': 'Contact', 'nav.cta': 'Contact Us',
      'nav.open': 'Open menu', 'nav.close': 'Close menu',
      'hero.ctaPrimary': 'View Products', 'hero.ctaSecondary': 'About Us', 'hero.scroll': 'Scroll',
      'slider.prev': 'Previous product', 'slider.next': 'Next product',
      'contact.email': 'Email', 'contact.address': 'Address',
      'contact.waHint': 'Tap to chat directly', 'contact.waAria': 'Contact us on WhatsApp',
      'form.name': 'Name', 'form.namePh': 'Your full name',
      'form.email': 'Email', 'form.phone': 'Phone / WhatsApp',
      'form.message': 'Message',
      'form.messagePh': 'Products of interest, estimated volume, destination country…',
      'form.submit': 'Send Message', 'form.sending': 'Sending…',
      'form.required': 'Name, email and message are required.',
      'form.ok': 'Thank you. We have received your message.',
      'form.errSuffix': ' You can also reach us on WhatsApp.',
      'footer.nav': 'Navigation', 'footer.contact': 'Contact',
      'footer.rights': 'All rights reserved.',
      'products.empty': 'No products have been published yet.',
      'products.error': 'Products could not be loaded. Please refresh the page.',
      'lb.close': 'Close', 'lb.prev': 'Previous photo', 'lb.next': 'Next photo', 'lb.photo': 'Photo',
    },
    id: {
      'nav.home': 'Beranda', 'nav.about': 'Tentang Kami', 'nav.products': 'Produk',
      'nav.quality': 'Quality Control', 'nav.contact': 'Kontak', 'nav.cta': 'Hubungi Kami',
      'nav.open': 'Buka menu', 'nav.close': 'Tutup menu',
      'hero.ctaPrimary': 'Lihat Produk', 'hero.ctaSecondary': 'Tentang Kami', 'hero.scroll': 'Gulir',
      'slider.prev': 'Produk sebelumnya', 'slider.next': 'Produk berikutnya',
      'contact.email': 'Email', 'contact.address': 'Alamat',
      'contact.waHint': 'Klik untuk chat langsung', 'contact.waAria': 'Hubungi kami via WhatsApp',
      'form.name': 'Nama', 'form.namePh': 'Nama lengkap Anda',
      'form.email': 'Email', 'form.phone': 'Nomor Telepon / WhatsApp',
      'form.message': 'Pesan',
      'form.messagePh': 'Produk yang diminati, perkiraan volume, negara tujuan…',
      'form.submit': 'Kirim Pesan', 'form.sending': 'Mengirim…',
      'form.required': 'Nama, email, dan pesan wajib diisi.',
      'form.ok': 'Terima kasih. Pesan Anda sudah kami terima.',
      'form.errSuffix': ' Anda juga bisa menghubungi kami via WhatsApp.',
      'footer.nav': 'Navigasi', 'footer.contact': 'Kontak',
      'footer.rights': 'Seluruh hak cipta dilindungi.',
      'products.empty': 'Belum ada produk yang dipublikasikan.',
      'products.error': 'Produk sedang tidak dapat dimuat. Silakan muat ulang halaman.',
      'lb.close': 'Tutup', 'lb.prev': 'Foto sebelumnya', 'lb.next': 'Foto berikutnya', 'lb.photo': 'Foto',
    },
  };

  const t = (key) => UI[lang][key] ?? UI.en[key] ?? key;

  /* ================================================================
     2. Akses konten CMS
     ================================================================ */

  /** Telusuri objek konten dengan jalur bertitik, mis. "about.badgeTitle". */
  function at(path) {
    return path.split('.').reduce((obj, key) => (obj == null ? obj : obj[key]), content);
  }

  /**
   * Ambil nilai untuk bahasa aktif.
   * Nilai bisa berupa string biasa (tidak diterjemahkan, mis. alamat email)
   * atau objek { id, en }. Bila terjemahan kosong, versi Inggris dipakai.
   */
  function val(node) {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    return node[lang] || node.en || node.id || '';
  }

  const text = (path) => val(at(path));

  /** Tulis teks multi-baris tanpa innerHTML: teks murni + elemen <br>. */
  function setMultiline(el, value) {
    el.replaceChildren();
    String(value).split('\n').forEach((line, i) => {
      if (i) el.append(document.createElement('br'));
      el.append(document.createTextNode(line));
    });
  }

  /* ================================================================
     3. Ikon
     ================================================================ */
  const ICON_PATHS = {
    shield:  ['M12 2 4 5.5v6c0 4.7 3.4 8.9 8 10.5 4.6-1.6 8-5.8 8-10.5v-6z', 'm9 12 2 2 4-4'],
    tag:     ['M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z', 'M7.5 7.5h.01'],
    sliders: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
    award:   ['M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'm8.2 13.3-1.4 7.5 5.2-3 5.2 3-1.4-7.5'],
    eye:     ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
    images:  ['M8 3h13v13', 'M3 8h13v13H3z'],
    expand:  ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  };

  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    (ICON_PATHS[name] || ICON_PATHS.shield).forEach((d) => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      svg.append(p);
    });
    return svg;
  }

  /* ================================================================
     4. Perender daftar
     Setiap kunci cocok dengan atribut data-c-list pada HTML.
     ================================================================ */

  function el(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent != null) node.textContent = textContent;
    return node;
  }

  const LIST_RENDERERS = {
    'hero.stats': (box, items) => {
      box.replaceChildren(...items.map((s) => {
        const d = el('div', 'hero__stat');
        d.append(el('b', null, val(s.value)), el('span', null, val(s.label)));
        return d;
      }));
    },

    'visionMission.vision.points': renderPoints,
    'visionMission.mission.points': renderPoints,

    'values.items': (box, items) => {
      box.replaceChildren(...items.map((v, i) => {
        const card = el('article', 'value reveal');
        card.style.setProperty('--i', String(i));
        const iconBox = el('div', 'value__icon');
        iconBox.append(icon(v.icon));
        card.append(iconBox, el('h3', null, val(v.title)), el('p', null, val(v.text)));
        return card;
      }));
    },

    'history.timeline': (box, items) => {
      box.replaceChildren(...items.map((m, i) => {
        const li = el('li', 'timeline__item reveal' + (i === items.length - 1 ? ' timeline__item--now' : ''));
        li.style.setProperty('--i', String(i));
        const marker = el('span', 'timeline__marker');
        marker.setAttribute('aria-hidden', 'true');
        li.append(marker, el('span', 'timeline__phase', val(m.phase)),
                  el('h3', null, val(m.title)), el('p', null, val(m.text)));
        return li;
      }));
    },

    'quality.steps': (box, items) => {
      box.replaceChildren(...items.map((s, i) => {
        const card = el('article', 'qc__step reveal');
        card.style.setProperty('--i', String(i));
        card.append(el('h3', null, val(s.title)), el('p', null, val(s.text)));
        return card;
      }));
    },
  };

  function renderPoints(box, items) {
    box.replaceChildren(...items.map((p) => {
      const li = document.createElement('li');
      const value = val(p);
      // Pola "Judul — penjelasan": bagian sebelum em dash ditebalkan.
      const dash = value.indexOf(' — ');
      if (dash > 0) {
        li.append(el('strong', null, value.slice(0, dash)));
        li.append(document.createTextNode(value.slice(dash)));
      } else {
        li.append(el('strong', null, value));
      }
      return li;
    }));
  }

  /* ================================================================
     5. Terapkan konten & bahasa ke halaman
     ================================================================ */

  function applyUIStrings() {
    $$('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((node) => { node.placeholder = t(node.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  }

  function applyContent() {
    if (!content) return;

    $$('[data-c]').forEach((node) => { node.textContent = text(node.dataset.c); });
    $$('[data-c-br]').forEach((node) => { setMultiline(node, text(node.dataset.cBr)); });
    $$('[data-c-src]').forEach((node) => {
      const src = text(node.dataset.cSrc);
      if (src && node.getAttribute('src') !== src) node.setAttribute('src', src);
    });

    // Judul hero: tiap baris dibungkus .line agar animasi naik tetap bekerja,
    // dan baris terakhir diberi warna emas.
    const heroTitle = $('[data-c-lines]');
    if (heroTitle) {
      const lines = text(heroTitle.dataset.cLines).split('\n');
      heroTitle.replaceChildren(...lines.map((line, i) => {
        const wrap = el('span', 'line');
        wrap.append(el('span', i === lines.length - 1 ? 'gold' : null, line));
        return wrap;
      }));
    }

    $$('[data-c-list]').forEach((box) => {
      const path = box.dataset.cList;
      const items = at(path);
      if (Array.isArray(items) && LIST_RENDERERS[path]) LIST_RENDERERS[path](box, items);
    });

    applyContactLinks();
    renderProducts();
    observeReveals();
  }

  /** Tautan kontak dibangun dari data CMS agar nomor/email cukup diubah sekali. */
  function applyContactLinks() {
    const waNumber = String(at('contact.whatsappNumber') || '').replace(/\D/g, '');
    const email = String(at('contact.email') || '');
    const ig = String(at('contact.instagram') || '');
    const mapQuery = String(at('contact.mapQuery') || '');

    const waHref = `https://wa.me/${waNumber}`;
    ['#waLink', '#waLinkFoot', '#waFloat'].forEach((sel) => {
      const node = $(sel); if (node && waNumber) node.href = waHref;
    });
    ['#mailLink', '#mailLinkFoot'].forEach((sel) => {
      const node = $(sel); if (node && email) node.href = `mailto:${email}`;
    });
    ['#igLink', '#igLinkFoot'].forEach((sel) => {
      const node = $(sel); if (node && ig) node.href = `https://instagram.com/${ig}`;
    });
    const igText = ig ? `@${ig}` : '';
    ['#igHandle', '#igLinkFoot'].forEach((sel) => {
      const node = $(sel); if (node && igText) node.textContent = igText;
    });

    if (mapQuery) {
      const frame = $('#mapFrame');
      const link = $('#mapLink');
      const encoded = encodeURIComponent(mapQuery);
      if (frame) frame.src = `https://www.google.com/maps?q=${encoded}&hl=${lang}&z=16&output=embed`;
      if (link) link.href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    }
  }

  function setLanguage(next) {
    if (!LANGS.includes(next)) return;
    lang = next;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    $$('.lang__btn').forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    applyUIStrings();
    applyContent();
  }

  $$('.lang__btn').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  /* ================================================================
     6. Navigasi
     ================================================================ */
  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const navMenu = $('#navMenu');
  const waFloat = $('#waFloat');

  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
    waFloat.classList.toggle('is-visible', window.scrollY > 600);
  };

  function closeMenu() {
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', t('nav.open'));
  }

  navToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? t('nav.close') : t('nav.open'));
  });

  navMenu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeMenu();
      navToggle.focus();
    }
  });

  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => {
    if (e.matches) closeMenu();
  });

  const navLinks = $$('.nav__link');
  const sections = navLinks.map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);

  if (sections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((s) => navObserver.observe(s));
  }

  /* ================================================================
     7. Reveal saat scroll
     ================================================================ */
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function observeReveals(root = document) {
    $$('.reveal, .growth', root).forEach((node) => {
      if (node.classList.contains('is-visible')) return;
      if (prefersReducedMotion) node.classList.add('is-visible');
      else revealObserver.observe(node);
    });
  }

  /* ================================================================
     8. Slider produk
     ================================================================ */
  const track = $('#sliderTrack');
  const prevBtn = $('#prevBtn');
  const nextBtn = $('#nextBtn');
  const progress = $('#sliderProgress');

  function skeletonCard() {
    const card = el('article', 'product product--skeleton');
    card.append(el('div', 'product__media'));
    const body = el('div', 'product__body');
    body.append(el('div', 'skeleton-line skeleton-line--title'),
                el('div', 'skeleton-line'),
                el('div', 'skeleton-line skeleton-line--short'));
    card.append(body);
    return card;
  }

  function productCard(product, index) {
    // <button>, bukan <article>: kartu ini benar-benar dapat diklik, jadi
    // harus fokusabel dan bisa diaktifkan lewat Enter/Space secara bawaan.
    const card = el('button', 'product reveal');
    card.type = 'button';
    card.style.setProperty('--i', String(Math.min(index, 4)));
    // Kartu diteruskan sebagai pemicu agar fokus kembali ke sini saat ditutup.
    // Mengandalkan document.activeElement tidak aman: aktivasi lewat keyboard
    // maupun klik programatik tidak selalu memindahkan fokus ke tombol.
    card.addEventListener('click', () => openLightbox(index, card));

    const foto = Array.isArray(product.images) && product.images.length
      ? product.images
      : [product.image || FALLBACK_IMAGE];

    const media = el('div', 'product__media');
    const img = document.createElement('img');
    img.src = foto[0];
    img.alt = product.name;
    img.loading = index < 4 ? 'eager' : 'lazy';
    img.addEventListener('error', () => { img.src = FALLBACK_IMAGE; }, { once: true });
    media.append(img, el('span', 'product__cat', val(product.category)));

    // Penanda jumlah foto: memberi tahu bahwa masih ada yang bisa dilihat
    if (foto.length > 1) {
      const count = el('span', 'product__count');
      count.append(icon('images'), document.createTextNode(String(foto.length)));
      media.append(count);
    }

    const zoom = el('span', 'product__zoom');
    zoom.append(icon('expand'));
    media.append(zoom);

    const body = el('div', 'product__body');
    body.append(el('h3', null, product.name), el('p', null, val(product.description)));

    card.append(media, body);
    return card;
  }

  /* ================================================================
     8b. Slideshow foto produk (lightbox)
     ================================================================ */
  const lb = $('#lightbox');
  const lbTrack = $('#lbTrack');
  const lbDots = $('#lbDots');
  const lbCounter = $('#lbCounter');
  const lbPrev = $('#lbPrev');
  const lbNext = $('#lbNext');

  let lbFoto = [];
  let lbIndex = 0;
  let lbPemicu = null;   // elemen yang membuka, untuk mengembalikan fokus

  function lbRender() {
    lbTrack.replaceChildren(...lbFoto.map((src, i) => {
      const slide = el('div', 'lb__slide');
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      // Hanya slide aktif dan tetangganya dimuat awal; sisanya menyusul
      img.loading = Math.abs(i - lbIndex) <= 1 ? 'eager' : 'lazy';
      img.addEventListener('error', () => { img.src = FALLBACK_IMAGE; }, { once: true });
      slide.append(img);
      return slide;
    }));

    lbDots.replaceChildren(...lbFoto.map((_, i) => {
      const dot = el('button', 'lb__dot');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `${t('lb.photo')} ${i + 1}`);
      dot.addEventListener('click', () => lbGoto(i));
      return dot;
    }));

    const banyak = lbFoto.length > 1;
    lbPrev.hidden = !banyak;
    lbNext.hidden = !banyak;
    lbDots.hidden = !banyak;
    lbCounter.hidden = !banyak;

    lbGoto(lbIndex);
  }

  function lbGoto(i) {
    lbIndex = (i + lbFoto.length) % lbFoto.length;   // memutar di kedua ujung
    lbTrack.style.transform = `translateX(-${lbIndex * 100}%)`;
    lbCounter.textContent = `${lbIndex + 1} / ${lbFoto.length}`;
    $$('.lb__dot', lbDots).forEach((d, n) => {
      d.classList.toggle('is-active', n === lbIndex);
      d.setAttribute('aria-selected', String(n === lbIndex));
    });
  }

  function openLightbox(productIndex, pemicu) {
    const product = products[productIndex];
    if (!product) return;

    lbPemicu = pemicu || document.activeElement;
    lbFoto = Array.isArray(product.images) && product.images.length
      ? product.images
      : [product.image || FALLBACK_IMAGE];
    lbIndex = 0;

    $('#lbCat').textContent = val(product.category);
    $('#lbTitle').textContent = product.name;
    // Deskripsi penuh: kartu memotongnya di tiga baris, di sini utuh
    $('#lbDesc').textContent = val(product.description);

    lbRender();
    lb.hidden = false;
    document.body.classList.add('lb-open');
    requestAnimationFrame(() => lb.classList.add('is-open'));
    $('#lbClose').focus();
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    document.body.classList.remove('lb-open');
    // Tunggu transisi selesai sebelum menyembunyikan dari pohon aksesibilitas
    setTimeout(() => { lb.hidden = true; lbTrack.replaceChildren(); }, 260);
    lbPemicu?.focus();
  }

  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbBackdrop').addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => lbGoto(lbIndex - 1));
  lbNext.addEventListener('click', () => lbGoto(lbIndex + 1));

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); lbGoto(lbIndex + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); lbGoto(lbIndex - 1); }
  });

  // Geser dengan jari di layar sentuh
  let sentuhX = null;
  lbTrack.addEventListener('touchstart', (e) => { sentuhX = e.changedTouches[0].clientX; }, { passive: true });
  lbTrack.addEventListener('touchend', (e) => {
    if (sentuhX === null) return;
    const delta = e.changedTouches[0].clientX - sentuhX;
    if (Math.abs(delta) > 45) lbGoto(lbIndex + (delta < 0 ? 1 : -1));
    sentuhX = null;
  }, { passive: true });

  function renderMessage(className, message) {
    track.replaceChildren(el('p', className, message));
    updateSliderControls();
  }

  function renderProducts() {
    if (!products.length) return;
    track.replaceChildren(...products.map(productCard));
    observeReveals(track);
    updateSliderControls();
  }

  async function loadProducts() {
    track.replaceChildren(...Array.from({ length: 4 }, skeletonCard));
    try {
      const res = await fetch('/api/products', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      products = await res.json();

      if (!Array.isArray(products) || products.length === 0) {
        products = [];
        renderMessage('products__empty', t('products.empty'));
        return;
      }
      renderProducts();
    } catch (err) {
      console.error('Gagal memuat produk:', err);
      renderMessage('products__error', t('products.error'));
    }
  }

  /**
   * Posisi scrollLeft yang membuat tiap kartu rata di tepi kiri track.
   * Diukur dari geometri kartu yang sebenarnya, bukan dari perkalian
   * (lebar kartu + gap): lebar kartu memakai flex-basis persentase, sehingga
   * pembulatan sub-piksel membuat jarak antar kartu berselang-seling
   * 295/296 px. Perkalian akan meleset makin jauh tiap langkah, lalu
   * scroll-snap menariknya kembali — itu yang tampak sebagai "looping".
   */
  function cardOffsets() {
    const padLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    // offsetLeft diukur pada sistem koordinat konten yang tidak terpengaruh
    // posisi scroll, sehingga nilainya tetap benar kapan pun dibaca — termasuk
    // di tengah animasi scroll. getBoundingClientRect() relatif viewport,
    // jadi nilainya bergeser mengikuti scrollLeft dan tidak bisa dipakai di sini.
    return $$('.product', track).map((card) =>
      Math.round(card.offsetLeft - track.offsetLeft - padLeft)
    );
  }

  /** Geser satu kartu ke arah `direction` (1 = maju, -1 = mundur). */
  function slide(direction) {
    const max = track.scrollWidth - track.clientWidth;
    const offsets = cardOffsets();
    const now = track.scrollLeft;
    const EPS = 8; // toleransi agar posisi saat ini tidak terpilih sebagai target

    let target = direction > 0
      ? offsets.find((p) => p > now + EPS)
      : offsets.filter((p) => p < now - EPS).pop();

    // Kartu terakhir tidak bisa rata-kiri karena keburu mentok ujung track,
    // jadi langkah terakhir diarahkan ke ujung.
    if (target === undefined) target = direction > 0 ? max : 0;

    const dest = Math.max(0, Math.min(target, max));
    track.scrollTo({ left: dest, behavior: 'smooth' });
    updateSliderControls(dest);
  }

  /**
   * @param {number} [assumed] Posisi yang dituju. Diisi saat tombol ditekan
   *   supaya status tombol langsung benar tanpa menunggu animasi scroll —
   *   dan tanpa bergantung pada requestAnimationFrame, yang dibekukan browser
   *   ketika tab berada di latar belakang.
   */
  function updateSliderControls(assumed) {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const pos = typeof assumed === 'number' ? assumed : track.scrollLeft;
    if (prevBtn) prevBtn.disabled = pos <= 2;
    if (nextBtn) nextBtn.disabled = pos >= maxScroll - 2 || maxScroll <= 0;

    if (progress) {
      const ratio = maxScroll > 0 ? pos / maxScroll : 0;
      const visible = maxScroll > 0 ? track.clientWidth / track.scrollWidth : 1;
      const width = Math.max(visible, 0.15);
      progress.style.width = `${width * 100}%`;
      progress.style.transform = `translateX(${ratio * (100 / width - 100)}%)`;
    }
  }

  prevBtn?.addEventListener('click', () => slide(-1));
  nextBtn?.addEventListener('click', () => slide(1));

  let scrollTick = false;
  track.addEventListener('scroll', () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => { updateSliderControls(); scrollTick = false; });
  }, { passive: true });

  window.addEventListener('resize', updateSliderControls);

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); slide(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); slide(-1); }
  });

  /* ================================================================
     9. Formulir kontak
     ================================================================ */
  const form = $('#contactForm');
  const formStatus = $('#formStatus');
  const submitBtn = $('#submitBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    formStatus.className = 'form__status';

    if (!data.name?.trim() || !data.email?.trim() || !data.message?.trim()) {
      formStatus.textContent = t('form.required');
      formStatus.classList.add('is-error');
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerHTML;   // tombol berisi ikon SVG
    submitBtn.textContent = t('form.sending');
    formStatus.textContent = '';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Failed to send message.');

      form.reset();
      formStatus.textContent = t('form.ok');
      formStatus.classList.add('is-ok');
    } catch (err) {
      formStatus.textContent = err.message + t('form.errSuffix');
      formStatus.classList.add('is-error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
      applyUIStrings();
    }
  });

  /* ================================================================
     10. Bootstrap
     ================================================================ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  observeReveals();

  (async function init() {
    // Konten dan produk diambil bersamaan; keduanya independen.
    const [contentRes] = await Promise.allSettled([
      fetch('/api/content', { headers: { Accept: 'application/json' } }).then((r) => r.json()),
      loadProducts(),
    ]);

    if (contentRes.status === 'fulfilled') content = contentRes.value;
    else console.error('Gagal memuat konten halaman:', contentRes.reason);

    // setLanguage memanggil applyUIStrings + applyContent sekaligus.
    setLanguage(lang);
  })();
})();
