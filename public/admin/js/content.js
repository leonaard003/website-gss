/**
 * GSS CMS — editor konten halaman utama.
 *
 * Form dibangun dari SCHEMA di bawah, bukan ditulis manual per section.
 * Menambah field cukup menambah satu baris di skema; renderer, pengikatan
 * data, dan penyimpanan mengikuti otomatis.
 */
(function () {
  'use strict';

  const { api, toast, showState } = window.GSSAdmin;
  const $ = (sel) => document.querySelector(sel);

  /** Salinan kerja. Perubahan ditulis ke sini, lalu dikirim saat Simpan. */
  let draft = null;
  let dirty = false;

  /* ================================================================
     Skema
     type:
       text   — satu baris, dua bahasa
       area   — banyak baris, dua bahasa
       lines  — banyak baris, tiap baris jadi baris baru di halaman
       plain  — satu baris, TIDAK diterjemahkan (email, nomor, dsb.)
       image  — unggah gambar
       list   — daftar berulang; `fields` untuk objek, `simple` untuk teks saja
     ================================================================ */
  const SCHEMA = [
    {
      key: 'hero', label: 'Hero', icon: 'M3 3h18v18H3z',
      note: 'Bagian paling atas halaman — foto besar dan judul utama.',
      fields: [
        { path: 'title', label: 'Judul Utama', type: 'lines',
          hint: 'Satu baris teks = satu baris judul di halaman. Baris terakhir otomatis berwarna emas.' },
        { path: 'subtitle', label: 'Subjudul', type: 'area' },
        { path: 'image', label: 'Foto Hero', type: 'image', hint: 'Rasio 16:9 (lebar). Disarankan minimal 1920×1080.' },
        { path: 'stats', label: 'Statistik', type: 'list', fields: [
          { path: 'value', label: 'Angka / Kata Kunci', type: 'text' },
          { path: 'label', label: 'Keterangan', type: 'text' },
        ] },
      ],
    },
    {
      key: 'about', label: 'Tentang Kami', icon: 'M12 2 4 6v12l8 4 8-4V6z',
      fields: [
        { path: 'title', label: 'Judul', type: 'lines' },
        { path: 'lead', label: 'Paragraf Pembuka', type: 'area' },
        { path: 'body1', label: 'Paragraf Kedua', type: 'area' },
        { path: 'body2', label: 'Paragraf Ketiga', type: 'area' },
        { path: 'image', label: 'Foto', type: 'image', hint: 'Rasio 4:5 (potret). Disarankan minimal 1200×1500.' },
        { path: 'badgeTitle', label: 'Kartu Emas — Judul', type: 'text' },
        { path: 'badgeSubtitle', label: 'Kartu Emas — Keterangan', type: 'text' },
      ],
    },
    {
      key: 'visionMission', label: 'Visi & Misi', icon: 'M12 2v20M2 12h20',
      note: 'Pernyataan resmi perusahaan. Ubah dengan hati-hati.',
      fields: [
        { path: 'title', label: 'Judul', type: 'lines' },
        { path: 'image', label: 'Foto', type: 'image', hint: 'Rasio 3:4 (potret).' },
        { path: 'vision.label', label: 'Visi — Nama Blok', type: 'text' },
        { path: 'vision.heading', label: 'Visi — Pernyataan', type: 'area' },
        { path: 'vision.text', label: 'Visi — Penjelasan', type: 'area' },
        { path: 'vision.points', label: 'Visi — Poin', type: 'list', simple: true },
        { path: 'mission.label', label: 'Misi — Nama Blok', type: 'text' },
        { path: 'mission.heading', label: 'Misi — Pernyataan', type: 'area' },
        { path: 'mission.text', label: 'Misi — Penjelasan', type: 'area' },
        { path: 'mission.points', label: 'Misi — Poin', type: 'list', simple: true,
          hint: 'Teks sebelum tanda “ — ” akan ditebalkan di halaman.' },
      ],
    },
    {
      key: 'values', label: 'Core Values', icon: 'M12 2 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6z',
      fields: [
        { path: 'title', label: 'Judul', type: 'lines' },
        { path: 'lead', label: 'Paragraf Pembuka', type: 'area' },
        { path: 'items', label: 'Daftar Nilai', type: 'list', fields: [
          { path: 'icon', label: 'Ikon', type: 'select',
            options: ['shield', 'tag', 'sliders', 'award', 'eye'] },
          { path: 'title', label: 'Judul', type: 'text' },
          { path: 'text', label: 'Penjelasan', type: 'area' },
        ] },
      ],
    },
    {
      key: 'history', label: 'Perjalanan Kami', icon: 'M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
      fields: [
        { path: 'title', label: 'Judul', type: 'lines' },
        { path: 'lead', label: 'Paragraf Pembuka', type: 'area' },
        { path: 'body1', label: 'Paragraf Kedua', type: 'area' },
        { path: 'body2', label: 'Paragraf Ketiga', type: 'area' },
        { path: 'growthFrom', label: 'Kapasitas Awal — Angka', type: 'text' },
        { path: 'growthFromLabel', label: 'Kapasitas Awal — Keterangan', type: 'text' },
        { path: 'growthTo', label: 'Kapasitas Kini — Angka', type: 'text' },
        { path: 'growthToLabel', label: 'Kapasitas Kini — Keterangan', type: 'text' },
        { path: 'growthMultiplier', label: 'Teks di Atas Bar', type: 'text' },
        { path: 'growthLabel', label: 'Judul Panel Pertumbuhan', type: 'text' },
        { path: 'growthNote', label: 'Catatan Panel Pertumbuhan', type: 'area' },
        { path: 'timeline', label: 'Tahapan', type: 'list', fields: [
          { path: 'phase', label: 'Fase / Tahun', type: 'text' },
          { path: 'title', label: 'Judul', type: 'text' },
          { path: 'text', label: 'Penjelasan', type: 'area' },
        ] },
      ],
    },
    {
      key: 'products', label: 'Judul Section Produk', icon: 'M20 7 12 3 4 7v10l8 4 8-4z',
      note: 'Hanya judul dan pengantar. Daftar produknya diatur di menu Produk.',
      fields: [
        { path: 'title', label: 'Judul', type: 'lines' },
        { path: 'lead', label: 'Paragraf Pembuka', type: 'area' },
      ],
    },
    {
      key: 'quality', label: 'Quality Control', icon: 'm9 12 2 2 4-4M12 3 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6z',
      fields: [
        { path: 'title', label: 'Judul', type: 'lines' },
        { path: 'lead', label: 'Paragraf Pembuka', type: 'area' },
        { path: 'steps', label: 'Tahapan Pemeriksaan', type: 'list', fields: [
          { path: 'title', label: 'Nama Tahap', type: 'text' },
          { path: 'text', label: 'Penjelasan', type: 'area' },
        ] },
      ],
    },
    {
      key: 'contact', label: 'Kontak', icon: 'M12 22s8-5.4 8-12a8 8 0 1 0-16 0c0 6.6 8 12 8 12z',
      fields: [
        { path: 'title', label: 'Judul', type: 'lines' },
        { path: 'lead', label: 'Paragraf Pembuka', type: 'area' },
        { path: 'whatsapp', label: 'WhatsApp (tampil di halaman)', type: 'plain' },
        { path: 'whatsappNumber', label: 'WhatsApp (untuk tautan)', type: 'plain',
          hint: 'Hanya angka dengan kode negara, tanpa + atau spasi. Contoh: 6282163072591' },
        { path: 'email', label: 'Email', type: 'plain' },
        { path: 'instagram', label: 'Instagram', type: 'plain', hint: 'Nama pengguna saja, tanpa tanda @.' },
        { path: 'addressLine1', label: 'Alamat — Baris Utama', type: 'text' },
        { path: 'addressLine2', label: 'Alamat — Baris Lanjutan', type: 'lines' },
        { path: 'mapQuery', label: 'Pencarian Peta', type: 'plain',
          hint: 'Alamat lengkap, atau koordinat "lintang,bujur" untuk penanda yang lebih tepat.' },
        { path: 'formTitle', label: 'Formulir — Judul', type: 'text' },
        { path: 'formSubtitle', label: 'Formulir — Keterangan', type: 'area' },
      ],
    },
    {
      key: 'footer', label: 'Footer', icon: 'M4 18h16M4 6h16M4 12h16',
      fields: [{ path: 'about', label: 'Paragraf Footer', type: 'area' }],
    },
  ];

  /* ================================================================
     Bantuan jalur bersarang
     ================================================================ */
  const getAt = (obj, path) =>
    path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  function setAt(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const parent = keys.reduce((o, k) => (o[k] ??= {}), obj);
    parent[last] = value;
  }

  function markDirty() {
    dirty = true;
    const btn = $('#contentSave');
    btn.disabled = false;
    btn.classList.add('is-dirty');
  }

  /* ================================================================
     Pembuat elemen form
     ================================================================ */
  function el(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent != null) node.textContent = textContent;
    return node;
  }

  function label(text, note) {
    const span = el('span', null, text);
    if (note) {
      const em = el('em', 'field-lang', note);
      span.append(' ', em);
    }
    return span;
  }

  /** Satu kolom input untuk satu bahasa. */
  function langInput(type, value, onChange, placeholder) {
    const node = document.createElement(type === 'text' ? 'input' : 'textarea');
    node.className = type === 'text' ? 'input' : 'textarea';
    if (type === 'text') node.type = 'text';
    if (type === 'lines') node.rows = 3;
    if (placeholder) node.placeholder = placeholder;
    node.value = value ?? '';
    node.addEventListener('input', () => { onChange(node.value); markDirty(); });
    return node;
  }

  /** Field dua bahasa: satu label, dua kolom input berdampingan. */
  function bilingualField(field, container) {
    const value = getAt(container, field.path);
    const inputType = field.type === 'text' ? 'text' : field.type;

    const wrap = el('div', 'field');
    wrap.append(label(field.label));

    const grid = el('div', 'bi-grid');
    [['id', 'Indonesia'], ['en', 'English']].forEach(([code, name]) => {
      const cell = el('label', 'bi-cell');
      cell.append(el('span', 'bi-tag', name));
      cell.append(langInput(inputType, value?.[code], (v) => {
        const current = getAt(container, field.path);
        if (current && typeof current === 'object') current[code] = v;
        else setAt(container, field.path, { id: '', en: '', [code]: v });
      }));
      grid.append(cell);
    });

    wrap.append(grid);
    if (field.hint) wrap.append(el('p', 'field-note', field.hint));
    return wrap;
  }

  /** Field satu nilai tanpa terjemahan. */
  function plainField(field, container) {
    const wrap = el('label', 'field');
    wrap.append(label(field.label));
    wrap.append(langInput('text', getAt(container, field.path), (v) => setAt(container, field.path, v)));
    if (field.hint) wrap.append(el('p', 'field-note', field.hint));
    return wrap;
  }

  function selectField(field, container, onChange) {
    const wrap = el('label', 'field');
    wrap.append(label(field.label));
    const select = el('select', 'select');
    (field.options || []).forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      select.append(o);
    });
    select.value = getAt(container, field.path) ?? field.options[0];
    select.addEventListener('change', () => {
      (onChange || ((v) => setAt(container, field.path, v)))(select.value);
      markDirty();
    });
    wrap.append(select);
    return wrap;
  }

  /** Field gambar: pratinjau + unggah langsung ke server. */
  function imageField(field, container) {
    const wrap = el('div', 'field');
    wrap.append(label(field.label));

    const box = el('div', 'uploader');
    const preview = document.createElement('img');
    preview.className = 'uploader__preview';
    preview.alt = 'Pratinjau';
    preview.src = getAt(container, field.path) || '/assets/products/placeholder.svg';

    const side = el('div');
    const pick = el('button', 'btn btn--ghost', 'Ganti Foto');
    pick.type = 'button';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/avif';
    input.style.display = 'none';

    const hint = el('p', 'uploader__hint', field.hint || '');
    side.append(pick, hint, input);

    pick.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 6 * 1024 * 1024) { toast('Ukuran gambar maksimal 6 MB.', 'error'); return; }

      pick.disabled = true;
      pick.textContent = 'Mengunggah…';
      try {
        const body = new FormData();
        body.append('image', file);
        // Gambar diunggah langsung agar pratinjau memakai berkas yang benar-benar
        // tersimpan di server, bukan URL sementara di peramban.
        const { url } = await api('/api/admin/upload', { method: 'POST', body });
        setAt(container, field.path, url);
        preview.src = url;
        markDirty();
        toast('Foto terunggah. Jangan lupa klik Simpan Perubahan.');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        pick.disabled = false;
        pick.textContent = 'Ganti Foto';
        input.value = '';
      }
    });

    box.append(preview, side);
    wrap.append(box);
    return wrap;
  }

  /** Daftar berulang dengan tombol tambah/hapus dan pengatur urutan. */
  function listField(field, container) {
    const wrap = el('div', 'field');
    wrap.append(label(field.label));
    if (field.hint) wrap.append(el('p', 'field-note', field.hint));

    const list = el('div', 'repeat');
    wrap.append(list);

    const render = () => {
      const items = getAt(container, field.path) || [];
      list.replaceChildren();

      items.forEach((item, index) => {
        const row = el('div', 'repeat__item');

        const head = el('div', 'repeat__head');
        head.append(el('span', 'repeat__num', String(index + 1).padStart(2, '0')));

        const tools = el('div', 'repeat__tools');
        const mk = (title, d, fn, disabled) => {
          const b = el('button', 'icon-btn');
          b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.disabled = !!disabled;
          const ns = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(ns, 'svg');
          svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
          svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
          const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.append(p);
          b.append(svg);
          b.addEventListener('click', fn);
          return b;
        };
        tools.append(
          mk('Naikkan', 'm18 15-6-6-6 6', () => {
            [items[index - 1], items[index]] = [items[index], items[index - 1]];
            markDirty(); render();
          }, index === 0),
          mk('Turunkan', 'm6 9 6 6 6-6', () => {
            [items[index + 1], items[index]] = [items[index], items[index + 1]];
            markDirty(); render();
          }, index === items.length - 1),
          mk('Hapus', 'M3 6h18M8 6V4h8v2M19 6v14H5V6M10 11v6M14 11v6', () => {
            items.splice(index, 1);
            markDirty(); render();
          }),
        );
        head.append(tools);
        row.append(head);

        if (field.simple) {
          row.append(bilingualField({ path: String(index), label: 'Teks', type: 'area' }, items));
        } else {
          field.fields.forEach((sub) => {
            if (sub.type === 'select') row.append(selectField(sub, item));
            else row.append(bilingualField(sub, item));
          });
        }
        list.append(row);
      });

      const add = el('button', 'btn btn--ghost repeat__add', `+ Tambah ${field.label}`);
      add.type = 'button';
      add.addEventListener('click', () => {
        const arr = getAt(container, field.path) || [];
        if (field.simple) arr.push({ id: '', en: '' });
        else {
          const blank = {};
          field.fields.forEach((s) => {
            blank[s.path] = s.type === 'select' ? (s.options[0]) : { id: '', en: '' };
          });
          arr.push(blank);
        }
        setAt(container, field.path, arr);
        markDirty(); render();
      });
      list.append(add);
    };

    render();
    return wrap;
  }

  /* ================================================================
     Render panel per section
     ================================================================ */
  function renderSection(section) {
    const panel = el('div', 'card content-panel hidden');
    panel.id = `panel-${section.key}`;
    panel.setAttribute('role', 'tabpanel');

    const inner = el('div', 'content-panel__body');
    if (section.note) inner.append(el('p', 'panel-note', section.note));

    const data = draft[section.key];
    if (!data) {
      inner.append(el('p', 'field-note', 'Bagian ini belum ada di data konten.'));
      panel.append(inner);
      return panel;
    }

    section.fields.forEach((field) => {
      if (field.type === 'image') inner.append(imageField(field, data));
      else if (field.type === 'list') inner.append(listField(field, data));
      else if (field.type === 'plain') inner.append(plainField(field, data));
      else inner.append(bilingualField(field, data));
    });

    panel.append(inner);
    return panel;
  }

  function renderTabs() {
    const tabs = $('#contentTabs');
    const panels = $('#contentPanels');
    tabs.replaceChildren();
    panels.replaceChildren();

    SCHEMA.forEach((section, i) => {
      const tab = el('button', 'section-tab' + (i === 0 ? ' is-active' : ''), section.label);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => {
        document.querySelectorAll('.section-tab').forEach((b) => b.classList.toggle('is-active', b === tab));
        document.querySelectorAll('.content-panel').forEach((p) => {
          p.classList.toggle('hidden', p.id !== `panel-${section.key}`);
        });
      });
      tabs.append(tab);

      const panel = renderSection(section);
      if (i === 0) panel.classList.remove('hidden');
      panels.append(panel);
    });
  }

  /* ================================================================
     Muat & simpan
     ================================================================ */
  async function load() {
    try {
      draft = await api('/api/admin/content');
      renderTabs();
      $('#contentState').replaceChildren();
    } catch (err) {
      showState($('#contentState'), {
        icon: ['M12 8v5M12 17h.01'],
        title: 'Gagal memuat konten',
        text: err.message,
        action: { label: 'Coba Lagi', onClick: load },
      });
    }
  }

  $('#contentSave').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.textContent = 'Menyimpan…';
    try {
      await api('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      dirty = false;
      btn.classList.remove('is-dirty');
      toast('Konten halaman berhasil disimpan.');
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    } finally {
      btn.innerHTML = original;
      btn.disabled = !dirty;
    }
  });

  // Cegah perubahan hilang karena menutup tab tanpa sengaja.
  window.addEventListener('beforeunload', (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  document.addEventListener('gss:admin-ready', load, { once: true });
})();
