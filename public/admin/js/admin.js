/**
 * GSS CMS — pengelolaan produk & pesan masuk.
 * Semua render memakai DOM API (bukan innerHTML) agar konten dari input
 * pengguna tidak pernah ditafsirkan sebagai markup.
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const PLACEHOLDER = '/assets/products/placeholder.svg';

  /** State di memori — sumber kebenaran tetap server, ini hanya cache render. */
  let products = [];
  let messages = [];
  let editingId = null;      // null = mode tambah
  let deletingId = null;

  /* ================================================================
     Utilitas
     ================================================================ */

  /** Buat elemen dengan kelas dan teks sekaligus. */
  function el(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent != null) node.textContent = textContent;
    return node;
  }

  const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICON_ERR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>';

  function toast(message, type = 'ok') {
    const node = document.createElement('div');
    node.className = `toast toast--${type}`;
    node.innerHTML = type === 'ok' ? ICON_OK : ICON_ERR; // ikon statis, bukan input pengguna
    node.append(document.createTextNode(message));
    $('#toastWrap').append(node);

    setTimeout(() => {
      node.classList.add('is-leaving');
      node.addEventListener('animationend', () => node.remove(), { once: true });
    }, 3200);
  }

  /** Wrapper fetch: melempar Error dengan pesan dari server, dan menangani sesi habis. */
  async function api(url, options = {}) {
    const res = await fetch(url, options);

    if (res.status === 401) {
      window.location.replace('/admin/login.html');
      throw new Error('Sesi berakhir.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Terjadi kesalahan (HTTP ${res.status}).`);
    return data;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function svgIcon(paths, width = 17) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('width', String(width));
    for (const d of paths) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      svg.append(p);
    }
    return svg;
  }

  function iconButton({ label, paths, className = '', onClick, disabled = false }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `icon-btn ${className}`.trim();
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.disabled = disabled;
    btn.append(svgIcon(paths));
    btn.addEventListener('click', onClick);
    return btn;
  }

  function showState(container, { icon, title, text, action }) {
    container.replaceChildren();
    const box = document.createElement('div');
    box.className = 'state';
    if (icon) box.append(svgIcon(icon, 46));

    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    box.append(h, p);

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'btn btn--gold';
      btn.textContent = action.label;
      btn.addEventListener('click', action.onClick);
      box.append(btn);
    }
    container.append(box);
  }

  /* ================================================================
     Modal
     ================================================================ */

  let lastFocused = null;

  function openModal(modal) {
    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    // Fokuskan kontrol pertama supaya alur keyboard tidak "terjebak" di belakang overlay.
    modal.querySelector('input, select, textarea, button')?.focus();
  }

  function closeModal(modal) {
    modal.classList.remove('is-open');
    lastFocused?.focus();
  }

  /**
   * Form produk perlu penutupan khusus (membersihkan foto yang terlanjur
   * diunggah), jadi semua jalur keluar diarahkan ke sana — bukan hanya
   * tombol Batal, tetapi juga Escape dan klik latar.
   */
  function dismissModal(modal) {
    if (modal.id === 'productModal') tutupFormProduk();
    else closeModal(modal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.is-open').forEach(dismissModal);
  });

  // Klik pada area gelap (bukan panel) menutup modal.
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('mousedown', (e) => {
      if (e.target === modal) dismissModal(modal);
    });
  });

  /* ================================================================
     Produk — render
     ================================================================ */

  const productBody = $('#productBody');
  const productState = $('#productState');
  const searchInput = $('#searchInput');
  const statusFilter = $('#statusFilter');

  function visibleProducts() {
    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    return products.filter((p) => {
      if (status && p.status !== status) return false;
      if (!query) return true;
      return `${p.name} ${p.category}`.toLowerCase().includes(query);
    });
  }

  function productRow(product, indexInFullList) {
    const tr = document.createElement('tr');

    // Foto — sampul + jumlah foto bila lebih dari satu
    const tdImg = document.createElement('td');
    const wrapImg = el('div', 'cell-thumbWrap');
    const foto = Array.isArray(product.images) ? product.images : [];
    const img = document.createElement('img');
    img.className = 'cell-thumb';
    img.src = foto[0] || PLACEHOLDER;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.src = PLACEHOLDER; }, { once: true });
    wrapImg.append(img);
    if (foto.length > 1) wrapImg.append(el('span', 'cell-count', String(foto.length)));
    tdImg.append(wrapImg);

    // Nama + potongan deskripsi
    const tdName = document.createElement('td');
    const name = document.createElement('div');
    name.className = 'cell-name';
    name.textContent = product.name;
    tdName.append(name);
    if (product.description) {
      const desc = document.createElement('div');
      desc.className = 'cell-desc';
      desc.textContent = product.description;
      tdName.append(desc);
    }

    // Kategori
    const tdCat = document.createElement('td');
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = product.category;
    tdCat.append(chip);

    // Status
    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    const isActive = product.status === 'active';
    badge.className = `badge badge--${isActive ? 'active' : 'draft'}`;
    badge.textContent = isActive ? 'Aktif' : 'Draft';
    tdStatus.append(badge);

    // Aksi
    const tdActions = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';

    actions.append(
      iconButton({
        label: 'Naikkan urutan',
        paths: ['m18 15-6-6-6 6'],
        disabled: indexInFullList === 0,
        onClick: () => moveProduct(product.id, -1),
      }),
      iconButton({
        label: 'Turunkan urutan',
        paths: ['m6 9 6 6 6-6'],
        disabled: indexInFullList === products.length - 1,
        onClick: () => moveProduct(product.id, 1),
      }),
      iconButton({
        label: `Edit ${product.name}`,
        paths: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z'],
        onClick: () => openProductForm(product),
      }),
      iconButton({
        label: `Hapus ${product.name}`,
        className: 'icon-btn--danger',
        paths: ['M3 6h18', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M10 11v6M14 11v6'],
        onClick: () => askDelete(product),
      }),
    );

    tdActions.append(actions);
    tr.append(tdImg, tdName, tdCat, tdStatus, tdActions);
    return tr;
  }

  function renderProducts() {
    const list = visibleProducts();
    productBody.replaceChildren();
    productState.replaceChildren();

    if (products.length === 0) {
      showState(productState, {
        icon: ['M20 7 12 3 4 7v10l8 4 8-4z', 'm4 7 8 4 8-4M12 21V11'],
        title: 'Belum ada produk',
        text: 'Tambahkan produk pertama agar tampil di section Produk halaman utama.',
        action: { label: 'Tambah Produk', onClick: () => openProductForm(null) },
      });
      return;
    }

    if (list.length === 0) {
      showState(productState, {
        icon: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3'],
        title: 'Tidak ada hasil',
        text: 'Tidak ada produk yang cocok dengan pencarian atau filter Anda.',
      });
      return;
    }

    const rows = list.map((p) => productRow(p, products.indexOf(p)));
    productBody.append(...rows);
  }

  function renderCategoryOptions() {
    const datalist = $('#categoryOptions');
    const unique = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
    datalist.replaceChildren(...unique.map((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      return opt;
    }));
  }

  async function loadProducts() {
    // Baris skeleton menjaga tinggi tabel agar tidak "melompat" saat data tiba.
    productBody.replaceChildren(...Array.from({ length: 4 }, () => {
      const tr = document.createElement('tr');
      tr.className = 'skeleton-row';
      for (let i = 0; i < 5; i++) {
        const td = document.createElement('td');
        td.append(document.createElement('div'));
        tr.append(td);
      }
      return tr;
    }));

    try {
      products = await api('/api/admin/products');
      renderProducts();
      renderCategoryOptions();
    } catch (err) {
      productBody.replaceChildren();
      showState(productState, {
        icon: ['M12 8v5M12 17h.01'],
        title: 'Gagal memuat data',
        text: err.message,
        action: { label: 'Coba Lagi', onClick: loadProducts },
      });
    }
  }

  /* ================================================================
     Produk — urutan
     ================================================================ */

  async function moveProduct(id, delta) {
    const from = products.findIndex((p) => p.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= products.length) return;

    // Optimistic update: tukar posisi di UI dulu, lalu simpan ke server.
    [products[from], products[to]] = [products[to], products[from]];
    renderProducts();

    try {
      await api('/api/admin/products-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: products.map((p) => p.id) }),
      });
    } catch (err) {
      toast(err.message, 'error');
      loadProducts(); // kembalikan ke kondisi server bila gagal
    }
  }

  /* ================================================================
     Produk — form tambah/edit
     ================================================================ */

  const productModal = $('#productModal');
  const productForm = $('#productForm');
  const imageInput = $('#imageInput');
  const galleryGrid = $('#galleryGrid');
  const galleryDrop = $('#galleryDrop');
  const formError = $('#formError');
  const saveBtn = $('#saveBtn');

  /** Daftar URL foto produk yang sedang disunting, urut. Indeks 0 = sampul. */
  let gallery = [];
  /** Foto yang diunggah selama sesi form ini. Dipakai untuk membersihkan
   *  berkas yatim bila form ditutup tanpa disimpan. */
  let unggahanSesi = [];
  const MAX_FOTO = 12;

  /** Minta server menghapus berkas yang batal dipakai. Gagal-diam: ini
   *  hanya kebersihan disk, tidak boleh mengganggu alur kerja admin. */
  function bersihkanYatim(urls) {
    const daftar = urls.filter((u) => u && u.startsWith('/uploads/'));
    if (!daftar.length) return;
    fetch('/api/admin/upload/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: daftar }),
    }).catch(() => {});
  }

  function tutupFormProduk() {
    // Semua unggahan sesi ini belum tersimpan di produk mana pun
    bersihkanYatim(unggahanSesi);
    unggahanSesi = [];
    closeModal(productModal);
  }

  function renderGallery() {
    galleryGrid.replaceChildren();

    if (!gallery.length) {
      galleryGrid.append(el('p', 'field-note', 'Belum ada foto. Produk akan memakai gambar cadangan.'));
      return;
    }

    gallery.forEach((src, index) => {
      const item = el('div', 'gthumb');

      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => { img.src = PLACEHOLDER; }, { once: true });
      item.append(img);

      if (index === 0) item.append(el('span', 'gthumb__badge', 'Sampul'));

      const tools = el('div', 'gthumb__tools');
      const mk = (label, d, fn, disabled) => {
        const b = el('button', 'icon-btn');
        b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.disabled = !!disabled;
        b.append(svgIcon([d], 15));
        b.addEventListener('click', fn);
        return b;
      };
      tools.append(
        mk('Geser ke kiri', 'm15 18-6-6 6-6', () => {
          [gallery[index - 1], gallery[index]] = [gallery[index], gallery[index - 1]];
          renderGallery();
        }, index === 0),
        mk('Geser ke kanan', 'm9 18 6-6-6-6', () => {
          [gallery[index + 1], gallery[index]] = [gallery[index], gallery[index + 1]];
          renderGallery();
        }, index === gallery.length - 1),
        mk('Hapus foto', 'M18 6 6 18M6 6l12 12', () => {
          gallery.splice(index, 1);
          renderGallery();
        }),
      );
      item.append(tools);
      galleryGrid.append(item);
    });
  }

  function openProductForm(product) {
    editingId = product?.id ?? null;
    formError.textContent = '';
    productForm.reset();
    imageInput.value = '';

    $('#modalTitle').textContent = product ? 'Edit Produk' : 'Tambah Produk';
    $('#modalSubtitle').textContent = product
      ? 'Foto pertama menjadi sampul kartu; sisanya tampil sebagai slideshow.'
      : 'Lengkapi data produk di bawah ini.';

    $('#nameInput').value = product?.name ?? '';
    $('#categoryInput').value = product?.category ?? '';
    $('#categoryEnInput').value = product?.categoryEn ?? '';
    $('#descInput').value = product?.description ?? '';
    $('#descEnInput').value = product?.descriptionEn ?? '';
    $('#statusInput').value = product?.status ?? 'active';

    // Salin array agar batal-edit tidak mengubah data di tabel
    gallery = Array.isArray(product?.images) ? [...product.images] : [];
    unggahanSesi = [];
    renderGallery();

    openModal(productModal);
  }

  $('#addBtn').addEventListener('click', () => openProductForm(null));
  $('#modalClose').addEventListener('click', tutupFormProduk);
  $('#cancelBtn').addEventListener('click', tutupFormProduk);
  $('#pickBtn').addEventListener('click', () => imageInput.click());

  /**
   * Foto diunggah langsung saat dipilih, bukan ditahan sampai Simpan.
   * Dengan begitu form hanya perlu menyimpan daftar URL — penambahan,
   * penghapusan, dan pengurutan jadi operasi array biasa.
   */
  async function unggahBerkas(files) {
    const daftar = [...files];
    if (!daftar.length) return;

    const sisa = MAX_FOTO - gallery.length;
    if (sisa <= 0) { toast(`Maksimal ${MAX_FOTO} foto per produk.`, 'error'); return; }
    if (daftar.length > sisa) toast(`Hanya ${sisa} foto pertama yang diunggah (batas ${MAX_FOTO}).`, 'error');

    const pickBtn = $('#pickBtn');
    pickBtn.disabled = true;
    const labelAsli = pickBtn.textContent;
    let berhasil = 0;

    for (const [i, file] of daftar.slice(0, sisa).entries()) {
      pickBtn.textContent = `Mengunggah ${i + 1}/${Math.min(daftar.length, sisa)}…`;
      if (!file.type.startsWith('image/')) { toast(`${file.name}: bukan berkas gambar.`, 'error'); continue; }
      if (file.size > 6 * 1024 * 1024) { toast(`${file.name}: melebihi 6 MB.`, 'error'); continue; }
      try {
        const body = new FormData();
        body.append('image', file);
        const { url } = await api('/api/admin/upload', { method: 'POST', body });
        gallery.push(url);
        unggahanSesi.push(url);
        berhasil++;
        renderGallery();
      } catch (err) {
        toast(`${file.name}: ${err.message}`, 'error');
      }
    }

    pickBtn.disabled = false;
    pickBtn.textContent = labelAsli;
    imageInput.value = '';
    if (berhasil) toast(`${berhasil} foto terunggah. Klik Simpan Produk untuk menerapkan.`);
  }

  imageInput.addEventListener('change', () => unggahBerkas(imageInput.files));

  ['dragenter', 'dragover'].forEach((evt) => {
    galleryDrop.addEventListener(evt, (e) => { e.preventDefault(); galleryDrop.classList.add('is-drag'); });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    galleryDrop.addEventListener(evt, (e) => { e.preventDefault(); galleryDrop.classList.remove('is-drag'); });
  });
  galleryDrop.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) unggahBerkas(e.dataTransfer.files);
  });

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';

    const name = $('#nameInput').value.trim();
    const category = $('#categoryInput').value.trim();

    if (!name || !category) {
      formError.textContent = 'Nama dan kategori produk wajib diisi.';
      return;
    }

    // Foto sudah diunggah lebih dulu, jadi yang dikirim cukup daftar URL-nya.
    const payload = {
      name,
      category,
      categoryEn: $('#categoryEnInput').value.trim(),
      description: $('#descInput').value.trim(),
      descriptionEn: $('#descEnInput').value.trim(),
      status: $('#statusInput').value,
      images: gallery,
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan…';

    try {
      const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
      await api(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      bersihkanYatim(unggahanSesi.filter((u) => !gallery.includes(u)));
      unggahanSesi = [];
      closeModal(productModal);
      toast(editingId ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
      await loadProducts();
    } catch (err) {
      formError.textContent = err.message;
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan Produk';
    }
  });

  /* ================================================================
     Produk — hapus
     ================================================================ */

  const deleteModal = $('#deleteModal');

  function askDelete(product) {
    deletingId = product.id;
    $('#deleteText').textContent =
      `“${product.name}” akan dihapus permanen beserta fotonya, dan langsung hilang dari halaman utama.`;
    openModal(deleteModal);
  }

  $('#deleteCancel').addEventListener('click', () => closeModal(deleteModal));

  $('#deleteConfirm').addEventListener('click', async (e) => {
    if (!deletingId) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Menghapus…';

    try {
      await api(`/api/admin/products/${deletingId}`, { method: 'DELETE' });
      closeModal(deleteModal);
      toast('Produk berhasil dihapus.');
      await loadProducts();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      deletingId = null;
      btn.disabled = false;
      btn.textContent = 'Ya, Hapus';
    }
  });

  /* ================================================================
     Pesan masuk
     ================================================================ */

  const messageList = $('#messageList');
  const messageState = $('#messageState');
  const msgBadge = $('#msgBadge');

  function messageCard(msg) {
    const wrap = document.createElement('article');
    wrap.className = 'message';

    const head = document.createElement('div');
    head.className = 'message__head';
    const name = document.createElement('span');
    name.className = 'message__name';
    name.textContent = msg.name;
    const meta = document.createElement('span');
    meta.className = 'message__meta';
    meta.textContent = formatDate(msg.createdAt);
    head.append(name, meta);

    const contact = document.createElement('div');
    contact.className = 'message__contact';

    const mail = document.createElement('a');
    mail.href = `mailto:${encodeURIComponent(msg.email)}`;
    mail.textContent = msg.email;
    contact.append(mail);

    if (msg.phone) {
      const wa = document.createElement('a');
      wa.href = `https://wa.me/${msg.phone.replace(/\D/g, '')}`;
      wa.target = '_blank';
      wa.rel = 'noopener';
      wa.textContent = msg.phone;
      contact.append(wa);
    }

    const text = document.createElement('p');
    text.className = 'message__text';
    text.textContent = msg.message;

    const actions = document.createElement('div');
    actions.className = 'message__actions';
    const del = document.createElement('button');
    del.className = 'btn btn--ghost';
    del.textContent = 'Hapus';
    del.addEventListener('click', async () => {
      del.disabled = true;
      try {
        await api(`/api/admin/messages/${msg.id}`, { method: 'DELETE' });
        toast('Pesan dihapus.');
        await loadMessages();
      } catch (err) {
        toast(err.message, 'error');
        del.disabled = false;
      }
    });
    actions.append(del);

    wrap.append(head, contact, text, actions);
    return wrap;
  }

  async function loadMessages() {
    try {
      messages = await api('/api/admin/messages');
      messageList.replaceChildren();
      messageState.replaceChildren();

      msgBadge.textContent = String(messages.length);
      msgBadge.classList.toggle('hidden', messages.length === 0);

      if (messages.length === 0) {
        showState(messageState, {
          icon: ['M2 4h20v16H2z', 'm2.5 7 8.4 5.6a2 2 0 0 0 2.2 0L21.5 7'],
          title: 'Belum ada pesan',
          text: 'Pesan dari formulir kontak akan muncul di sini.',
        });
        return;
      }

      messageList.append(...messages.map(messageCard));
    } catch (err) {
      showState(messageState, { icon: ['M12 8v5M12 17h.01'], title: 'Gagal memuat pesan', text: err.message });
    }
  }

  /* ================================================================
     Navigasi view & sesi
     ================================================================ */

  const VIEWS = { content: '#viewContent', products: '#viewProducts', messages: '#viewMessages' };

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-active', b === btn));
      Object.entries(VIEWS).forEach(([name, sel]) => {
        $(sel)?.classList.toggle('hidden', name !== view);
      });
    });
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    window.location.replace('/admin/login.html');
  });

  searchInput.addEventListener('input', renderProducts);
  statusFilter.addEventListener('change', renderProducts);

  /* ================================================================
     Bootstrap
     ================================================================ */

  /* Dibagikan ke content.js agar penanganan sesi 401 dan notifikasi
     hanya ada satu implementasi. */
  window.GSSAdmin = { api, toast, showState };

  (async function init() {
    try {
      const { user } = await api('/api/admin/me');
      $('#userName').textContent = user.name || user.username;
      $('#userHandle').textContent = `@${user.username}`;
    } catch {
      return; // api() sudah mengalihkan ke halaman login saat 401
    }

    await Promise.all([loadProducts(), loadMessages()]);
    document.dispatchEvent(new CustomEvent('gss:admin-ready'));
  })();
})();
