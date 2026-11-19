/* Utilidades de interfaz compartidas: formato, etiquetas, modales, avisos y gráficos. */
(function () {
  const NK = window.NK;
  NK.views = {};

  // ------------------------------------------------------------------
  // Formato
  // ------------------------------------------------------------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NK.esc = esc;
  const nf = new Intl.NumberFormat('es-MX');
  const nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIA_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  NK.MES = MES; NK.MES_L = MES_L;

  NK.fmt = {
    n: (v) => nf.format(Math.round(v)),
    n1: (v) => nf1.format(v),
    n2: (v) => nf2.format(v),
    money: (v) => '$' + nf.format(Math.round(v)),
    money2: (v) => '$' + nf2.format(v),
    moneyK: (v) => {
      const a = Math.abs(v);
      if (a >= 1e6) return '$' + nf1.format(v / 1e6) + ' M';
      if (a >= 1e3) return '$' + nf.format(Math.round(v / 1e3)) + ' mil';
      return '$' + nf.format(v);
    },
    km: (v) => nf.format(Math.round(v)) + ' km',
    pct: (v, d = 0) => (d ? nf1.format(v) : nf.format(Math.round(v))) + ' %',
    date: (iso) => { const d = new Date(iso); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; },
    dateS: (iso) => { const d = new Date(iso); return `${d.getDate()} ${MES[d.getMonth()]}`; },
    dateL: (d) => `${DIA_L[d.getDay()]} ${d.getDate()} de ${MES_L[d.getMonth()]} de ${d.getFullYear()}`,
    time: (iso) => { const d = new Date(iso); return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); },
    month: (d) => MES[d.getMonth()] + (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''),
    rel: (iso) => {
      const diff = (new Date(iso).getTime() - Date.now()) / 86400000;
      const a = Math.abs(diff);
      if (a < 1 / 24) return 'hace un momento';
      if (a < 1) { const h = Math.round(a * 24); return diff < 0 ? `hace ${h} h` : `en ${h} h`; }
      const d = Math.round(a);
      if (d === 1) return diff < 0 ? 'ayer' : 'mañana';
      return diff < 0 ? `hace ${d} días` : `en ${d} días`;
    },
    days: (iso) => Math.round((new Date(iso).getTime() - NK.TODAY.getTime()) / 86400000),
  };
  const F = NK.fmt;

  NK.icon = (name, cls = '') => `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''}></i>`;
  NK.icons = (root) => { if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 }, ...(root ? { root } : {}) }); };
  NK.mount = (el, html) => { el.innerHTML = html; NK.icons(); };
  NK.initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  // ------------------------------------------------------------------
  // Estados y etiquetas
  // ------------------------------------------------------------------
  NK.UNIT_STATUS = {
    disponible: { label: 'Disponible', tone: 'ok', color: '#4FA676', icon: 'circle-check' },
    mantenimiento: { label: 'En mantenimiento', tone: 'info', color: '#6E93AE', icon: 'wrench' },
    fuera: { label: 'Fuera de servicio', tone: 'danger', color: '#E0614F', icon: 'octagon-alert' },
  };
  NK.OT_STATUS = {
    pendiente: { label: 'Pendiente', tone: 'muted', color: '#8D97A2', icon: 'inbox' },
    proceso: { label: 'En proceso', tone: 'info', color: '#2F5D7C', icon: 'loader' },
    espera: { label: 'En espera de material', short: 'Espera de material', tone: 'warn', color: '#C98A12', icon: 'package-search' },
    terminado: { label: 'Terminado', tone: 'ok', color: '#23774A', icon: 'circle-check' },
  };
  NK.REQ_STATUS = {
    borrador: { label: 'Borrador', tone: 'muted', icon: 'file-pen' },
    enviada: { label: 'Enviada a Compras', tone: 'brand', icon: 'send' },
    revision: { label: 'En revisión', tone: 'violet', icon: 'search' },
    autorizada: { label: 'Autorizada', tone: 'info', icon: 'badge-check' },
    compra: { label: 'En compra', tone: 'warn', icon: 'shopping-cart' },
    recibida: { label: 'Recibida', tone: 'ok', icon: 'package-check' },
    rechazada: { label: 'Rechazada', tone: 'danger', icon: 'circle-x' },
  };
  NK.badge = (label, tone, extra = '') => `<span class="badge badge--${tone} ${extra}">${esc(label)}</span>`;
  NK.unitBadge = (s) => NK.badge(NK.UNIT_STATUS[s].label, NK.UNIT_STATUS[s].tone);
  NK.otBadge = (s, short) => NK.badge(short && NK.OT_STATUS[s].short ? NK.OT_STATUS[s].short : NK.OT_STATUS[s].label, NK.OT_STATUS[s].tone);
  NK.reqBadge = (s) => NK.badge(NK.REQ_STATUS[s].label, NK.REQ_STATUS[s].tone);
  NK.PRIO = { urgente: 'Urgente', alta: 'Alta', media: 'Media', baja: 'Baja' };
  NK.PRIO_COLOR = { urgente: '#B42318', alta: '#B42318', media: '#C98A12', baja: '#8D97A2' };
  NK.prio = (p) => `<span class="prio prio--${p}"><i aria-hidden="true"><b></b><b></b><b></b></i>${NK.PRIO[p]}</span>`;

  NK.stockState = (it) => {
    const avail = it.exist - it.reserved;
    if (it.exist <= 0 || avail <= 0) return { key: 'out', label: it.exist <= 0 ? 'Agotado' : 'Sin disponible', tone: 'danger' };
    if (avail < it.min) return { key: 'low', label: 'Bajo mínimo', tone: 'warn' };
    if (avail < it.min * 1.3) return { key: 'near', label: 'Cerca del mínimo', tone: 'muted' };
    return { key: 'ok', label: 'Suficiente', tone: 'ok' };
  };

  NK.tireState = (t) => {
    if (t.depth <= NK.MIN_DEPTH[t.kind] + 0.5) return { key: 'cambio', label: 'Cambio requerido', tone: 'danger', color: '#D9534A' };
    if (t.depth <= NK.MIN_DEPTH[t.kind] + 3) return { key: 'revisar', label: 'Revisar pronto', tone: 'warn', color: '#E3A93A' };
    return { key: 'bien', label: 'Buen estado', tone: 'ok', color: '#5AAE7E' };
  };

  NK.unitSvc = (u) => {
    const remaining = u.nextSvcKm - u.km;
    const used = 1 - remaining / u.interval;
    const days = Math.round(remaining / u.daily);
    let tone = 'ok';
    if (remaining < 0) tone = 'danger'; else if (remaining < u.interval * 0.12) tone = 'warn';
    return { remaining, used: Math.max(0, Math.min(1, used)), days, tone, date: NK.dIn(Math.max(0, days)) };
  };

  // ------------------------------------------------------------------
  // Ilustraciones lineales de unidades (vista lateral)
  // ------------------------------------------------------------------
  NK.truckSvg = (type) => {
    const wheel = (x) => `<circle cx="${x}" cy="44" r="6"/><circle cx="${x}" cy="44" r="2"/>`;
    if (type === 'tracto') return `<svg viewBox="0 0 120 54" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 38V20l6-10h16v28"/><path d="M14 10v10H8"/><path d="M30 38h70"/><path d="M30 26h20v12"/><path d="M38 6v10"/><path d="M94 32h14v6"/><path d="M60 34h44"/>${wheel(18)}${wheel(70)}${wheel(84)}</svg>`;
    if (type === 'torton') return `<svg viewBox="0 0 120 54" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 38V20l6-10h16v28"/><path d="M14 10v10H8"/><rect x="34" y="8" width="76" height="30" rx="2"/><path d="M34 18h76"/><path d="M30 38h4"/>${wheel(18)}${wheel(80)}${wheel(95)}</svg>`;
    return `<svg viewBox="0 0 120 54" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14h108l-10 20H16z"/><path d="M16 34l10 4h68l10-4"/><path d="M46 38l6 4h16l6-4"/><path d="M6 14l2-6h104l2 6"/><path d="M4 32h10"/>${wheel(84)}${wheel(98)}</svg>`;
  };

  // ------------------------------------------------------------------
  // Capas: modal y panel lateral
  // ------------------------------------------------------------------
  const layer = () => document.getElementById('layer');
  const openLayers = [];

  function trapFocus(container, e) {
    const f = container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function createLayer({ kind, html, size, label, onClose }) {
    const prev = document.activeElement;
    const ov = document.createElement('div');
    ov.className = 'overlay' + (kind === 'drawer' ? ' overlay--drawer' : '');
    ov.innerHTML = html;
    const panel = ov.firstElementChild;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (label) panel.setAttribute('aria-label', label);
    if (size) panel.classList.add(`${kind}--${size}`);
    layer().appendChild(ov);
    document.body.style.overflow = 'hidden';
    const api = {
      el: panel,
      charts: [],
      close() {
        if (api.closed) return; api.closed = true;
        api.charts.forEach((c) => c.destroy());
        ov.classList.add('is-closing');
        setTimeout(() => { ov.remove(); if (!layer().children.length) document.body.style.overflow = ''; }, 170);
        const i = openLayers.indexOf(api); if (i >= 0) openLayers.splice(i, 1);
        if (prev && prev.focus) prev.focus();
        onClose && onClose();
      },
    };
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) api.close(); });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Tab') trapFocus(panel, e); });
    panel.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); });
    openLayers.push(api);
    NK.icons();
    setTimeout(() => { const af = panel.querySelector('[autofocus]') || panel.querySelector('input, select, textarea') || panel.querySelector('button'); af && af.focus({ preventScroll: true }); }, 30);
    return api;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openLayers.length) { openLayers[openLayers.length - 1].close(); } });

  NK.modal = function ({ title, sub, icon, body, foot, size, onClose }) {
    return createLayer({
      kind: 'modal', size, label: title, onClose,
      html: `<div class="modal">
        <div class="modal__head">
          ${icon ? `<div class="modal__icon">${NK.icon(icon)}</div>` : ''}
          <div><h2>${esc(title)}</h2>${sub ? `<p>${sub}</p>` : ''}</div>
          <button class="icon-btn" type="button" data-close aria-label="Cerrar">${NK.icon('x')}</button>
        </div>
        <div class="modal__body">${body}</div>
        ${foot ? `<div class="modal__foot">${foot}</div>` : ''}
      </div>`,
    });
  };

  NK.drawer = function ({ head, body, size, label, onClose }) {
    return createLayer({
      kind: 'drawer', size, label, onClose,
      html: `<div class="drawer"><div class="drawer__head">${head}</div><div class="drawer__body">${body}</div></div>`,
    });
  };

  NK.confirm = function ({ title, text, ok = 'Confirmar', tone = 'primary', icon = 'circle-help' }) {
    return new Promise((resolve) => {
      let done = false;
      const m = NK.modal({ title, icon, size: 'sm', body: `<p style="color:var(--ink-2)">${text}</p>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn--${tone}" data-ok>${esc(ok)}</button>`, onClose: () => { if (!done) resolve(false); } });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; resolve(true); m.close(); });
    });
  };

  // ------------------------------------------------------------------
  // Avisos y notificaciones
  // ------------------------------------------------------------------
  NK.toast = function (title, text = '', tone = 'ok') {
    const icon = { ok: 'circle-check', warn: 'triangle-alert', info: 'info', brand: 'send' }[tone] || 'info';
    const t = document.createElement('div');
    t.className = `toast toast--${tone}`;
    t.setAttribute('role', 'status');
    t.innerHTML = `${NK.icon(icon)}<div><strong>${esc(title)}</strong>${text ? `<span>${text}</span>` : ''}</div><button type="button" aria-label="Cerrar aviso">${NK.icon('x')}</button>`;
    document.getElementById('toasts').appendChild(t);
    NK.icons();
    const kill = () => { t.classList.add('is-out'); setTimeout(() => t.remove(), 210); };
    t.querySelector('button').addEventListener('click', kill);
    setTimeout(kill, 4800);
  };

  NK.notify = function (title, text, icon = 'bell') {
    const s = NK.store.state;
    s.notifications.unshift({ id: 'n' + Date.now(), at: new Date().toISOString(), icon, title, text, unread: true });
    s.notifications = s.notifications.slice(0, 20);
    NK.store.save();
    NK.renderNotifDot && NK.renderNotifDot();
  };

  // ------------------------------------------------------------------
  // Gráficos (Chart.js)
  // ------------------------------------------------------------------
  NK.C = { ink: '#18222B', ink2: '#44515E', ink3: '#66727F', line: '#E3DFD7', brand: '#EE7814', brandSoft: 'rgba(238,120,20,.14)', steel: '#2F5D7C', steel2: '#6E93AE', steelSoft: 'rgba(47,93,124,.12)', sand: '#C8B08C', ok: '#23774A', okSoft: '#9FCFB3', warn: '#C98A12', danger: '#B42318', grey: '#B9B3A8' };
  let pageCharts = [];
  NK.chart = function (canvas, cfg, owner) {
    if (!window.Chart || !canvas) return null;
    const c = new window.Chart(canvas, cfg);
    (owner ? owner.charts : pageCharts).push(c);
    return c;
  };
  NK.destroyCharts = () => { pageCharts.forEach((c) => c.destroy()); pageCharts = []; };

  if (window.Chart) {
    const Ch = window.Chart;
    Ch.defaults.font.family = '"Fira Sans", system-ui, sans-serif';
    Ch.defaults.font.size = 12.5;
    Ch.defaults.color = '#66727F';
    Ch.defaults.borderColor = '#ECE8E1';
    Ch.defaults.maintainAspectRatio = false;
    Ch.defaults.animation.duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
    Ch.defaults.plugins.legend.display = false;
    Object.assign(Ch.defaults.plugins.tooltip, {
      backgroundColor: '#18222B', titleColor: '#fff', bodyColor: '#DCE2E7', padding: 10, cornerRadius: 6,
      titleFont: { weight: '600', size: 13 }, bodyFont: { size: 12.5 }, boxPadding: 4, usePointStyle: true,
    });
    Ch.defaults.elements.bar.borderRadius = 3;
    Ch.defaults.elements.line.tension = 0.32;
    Ch.defaults.elements.point.radius = 0;
    Ch.defaults.elements.point.hoverRadius = 5;
    Ch.defaults.scale.grid.drawTicks = false;
    Ch.defaults.scales.linear.border = { display: false };
    Ch.defaults.scales.category.grid = { display: false };
    Object.assign(Ch.defaults.scales.category.ticks, { maxRotation: 0, autoSkipPadding: 10 });
  }
  NK.axisMoney = { ticks: { callback: (v) => F.moneyK(v), padding: 8 }, grid: { color: '#EFEBE4' } };
  NK.monthLabels = (n = 12) => NK.MONTHS.slice(-n).map(F.month);

  // ------------------------------------------------------------------
  // Tabla con ordenamiento sencillo
  // ------------------------------------------------------------------
  NK.sortBy = function (arr, key, dir) {
    const m = dir === 'desc' ? -1 : 1;
    return arr.slice().sort((a, b) => {
      const va = typeof key === 'function' ? key(a) : a[key];
      const vb = typeof key === 'function' ? key(b) : b[key];
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === 'number') return (va - vb) * m;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * m;
    });
  };
  NK.th = (label, key, sort, cls = '') => {
    const active = sort && sort.key === key;
    const ind = active ? (sort.dir === 'asc' ? '▲' : '▼') : '';
    return `<th class="sortable ${cls}" data-sort="${key}" aria-sort="${active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}" tabindex="0">${label}<span class="sort-ind" aria-hidden="true">${ind}</span></th>`;
  };
  NK.bindSort = (root, sort, rerender) => {
    root.querySelectorAll('th[data-sort]').forEach((th) => {
      const go = () => { const k = th.dataset.sort; if (sort.key === k) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'; else { sort.key = k; sort.dir = 'asc'; } rerender(); };
      th.addEventListener('click', go);
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  };

  NK.empty = (icon, title, text, action = '') => `<div class="empty"><div class="empty__art">${NK.icon(icon)}</div><h3>${esc(title)}</h3><p>${text}</p>${action}</div>`;

  NK.pageHead = ({ eyebrow, title, text, actions = '' }) => `
    <div class="page-head">
      <div>
        <div class="page-head__eyebrow">${esc(eyebrow)}</div>
        <h1>${esc(title)}</h1>
        ${text ? `<p>${text}</p>` : ''}
      </div>
      ${actions ? `<div class="page-head__actions">${actions}</div>` : ''}
    </div>`;

  // Validación simple de formularios
  NK.validate = (form) => {
    let ok = true;
    form.querySelectorAll('[data-required]').forEach((el) => {
      const field = el.closest('.field');
      const val = (el.value || '').trim();
      const bad = !val || (el.type === 'number' && Number(val) <= 0);
      field.classList.toggle('is-invalid', bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    return ok;
  };
  NK.fieldErr = (msg) => `<span class="error">${NK.icon('circle-alert')}${esc(msg)}</span>`;
})();
