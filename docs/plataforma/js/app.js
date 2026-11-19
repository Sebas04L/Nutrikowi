/* Navegación, búsqueda general, notificaciones y arranque */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;
  const main = document.getElementById('main');
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const menuBtn = document.getElementById('btn-menu');
  let current = null;

  function parse() {
    const h = location.hash.replace(/^#\/?/, '') || 'inicio';
    const [path, qs] = h.split('?');
    return { route: NK.views[path] ? path : 'inicio', params: new URLSearchParams(qs || '') };
  }

  function render(keepScroll) {
    const { route, params } = parse();
    const changed = route !== current;
    current = route;
    NK.destroyCharts();
    const y = window.scrollY;
    NK.views[route].render(main, params);
    document.title = `${NK.views[route].title} · Nutrikowi Logística y Taller`;
    document.querySelectorAll('.nav__item').forEach((a) => {
      const on = a.dataset.route === route;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    updateCounts();
    if (changed && !keepScroll) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); } else window.scrollTo(0, y);
    // Quitar parámetros de acción (new=1, u=…) para que recargar no repita la acción
    if ([...params.keys()].some((k) => ['new', 'u', 'ot', 'r'].includes(k))) history.replaceState(null, '', `#/${route}`);
  }
  NK.refresh = () => render(true);

  function updateCounts() {
    const s = NK.store.state;
    const open = s.orders.filter((o) => o.status !== 'terminado' && o.status !== 'pendiente').length;
    const low = s.inventory.filter((i) => ['low', 'out'].includes(NK.stockState(i).key)).length;
    document.getElementById('nav-count-taller').textContent = open || '';
    document.getElementById('nav-count-inv').textContent = low || '';
    document.getElementById('nav-count-inv').title = `${low} artículos bajo mínimo`;
  }

  // Menú móvil
  function setMenu(open) {
    sidebar.classList.toggle('is-open', open);
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open);
    if (open) sidebar.querySelector('.nav__item.is-active, .nav__item').focus();
  }
  menuBtn.addEventListener('click', () => setMenu(!sidebar.classList.contains('is-open')));
  scrim.addEventListener('click', () => setMenu(false));
  sidebar.addEventListener('click', (e) => { if (e.target.closest('.nav__item, .brand-link')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar.classList.contains('is-open')) setMenu(false); });

  // Restablecer
  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (await NK.confirm({ title: 'Restablecer demostración', text: 'Se borrarán los cambios hechos durante la demostración (órdenes, solicitudes, movimientos) y se cargarán los datos iniciales.', ok: 'Restablecer', icon: 'rotate-ccw' })) {
      NK.store.reset(); renderNotifDot(); render(true); NK.toast('Demostración restablecida', 'Se cargaron los datos iniciales.');
    }
  });

  // Notificaciones
  const nBtn = document.getElementById('btn-notif');
  const nPanel = document.getElementById('notif-panel');
  function renderNotifDot() { document.getElementById('notif-dot').hidden = !NK.store.state.notifications.some((n) => n.unread); }
  NK.renderNotifDot = renderNotifDot;
  function renderNotifs() {
    const list = NK.store.state.notifications;
    nPanel.innerHTML = `<div class="notif__head"><h3>Notificaciones</h3><button class="link-btn" id="n-read">Marcar todo como leído</button></div>
      <div class="notif__list">${list.length ? list.map((n) => `<div class="notif__item ${n.unread ? 'is-unread' : ''}"><span class="notif__icon">${NK.icon(n.icon)}</span><div><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p><time>${F.rel(n.at)}</time></div></div>`).join('') : NK.empty('bell-off', 'Sin notificaciones', 'Aquí verá los cambios de sus solicitudes y alertas del taller.')}</div>`;
    NK.icons();
    nPanel.querySelector('#n-read').addEventListener('click', () => { list.forEach((n) => (n.unread = false)); NK.store.save(); renderNotifs(); renderNotifDot(); });
  }
  nBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = nPanel.hidden;
    nPanel.hidden = !open; nBtn.setAttribute('aria-expanded', open);
    if (open) renderNotifs();
    else { NK.store.state.notifications.forEach((n) => (n.unread = false)); NK.store.save(); renderNotifDot(); }
  });
  document.addEventListener('click', (e) => { if (!nPanel.hidden && !e.target.closest('.notif')) { nPanel.hidden = true; nBtn.setAttribute('aria-expanded', false); NK.store.state.notifications.forEach((n) => (n.unread = false)); NK.store.save(); renderNotifDot(); } });

  // Búsqueda general
  const sIn = document.getElementById('global-search');
  const sOut = document.getElementById('search-results');
  let focusIdx = -1;
  function search(q) {
    const s = NK.store.state;
    q = q.trim().toLowerCase();
    if (!q) { sOut.hidden = true; return; }
    const groups = [
      ['Unidades', 'truck', s.units.filter((u) => [u.id, u.marca, u.modelo, u.placas].join(' ').toLowerCase().includes(q)).slice(0, 5).map((u) => ({ code: u.id, text: `${u.marca} ${u.modelo} · ${NK.UNIT_STATUS[u.status].label}`, go: () => NK.openUnit(u.id) }))],
      ['Órdenes de trabajo', 'wrench', s.orders.filter((o) => [o.folio, o.unit, o.title].join(' ').toLowerCase().includes(q)).slice(0, 4).map((o) => ({ code: o.folio, text: `${o.unit} · ${o.title}`, go: () => { location.hash = '#/taller'; setTimeout(() => NK.openOrder(o.folio), 50); } }))],
      ['Inventario', 'package', s.inventory.filter((i) => [i.code, i.desc].join(' ').toLowerCase().includes(q)).slice(0, 4).map((i) => ({ code: i.code, text: `${i.desc} · disp. ${i.exist - i.reserved}`, go: () => { location.hash = '#/inventario'; } }))],
      ['Solicitudes', 'clipboard-list', s.requests.filter((r) => [r.folio, r.desc].join(' ').toLowerCase().includes(q)).slice(0, 4).map((r) => ({ code: r.folio, text: `${r.desc} · ${NK.REQ_STATUS[r.status].label}`, go: () => { location.hash = `#/solicitudes?r=${r.folio}`; } }))],
    ].filter((g) => g[2].length);
    const items = [];
    sOut.innerHTML = groups.length ? groups.map(([title, icon, list]) => `<div class="search__group">${title}</div>${list.map((it) => { items.push(it); return `<button type="button" class="search__item" data-i="${items.length - 1}">${NK.icon(icon)}<span class="mono">${esc(it.code)}</span><span>${esc(it.text)}</span></button>`; }).join('')}`).join('') : `<div class="search__empty">Sin resultados para “${esc(q)}”</div>`;
    sOut.hidden = false;
    NK.icons();
    focusIdx = -1;
    sOut._items = items;
    sOut.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('mousedown', (e) => { e.preventDefault(); choose(Number(b.dataset.i)); }));
  }
  function choose(i) { const it = sOut._items && sOut._items[i]; if (!it) return; sOut.hidden = true; sIn.value = ''; sIn.blur(); it.go(); }
  sIn.addEventListener('input', () => search(sIn.value));
  sIn.addEventListener('focus', () => { if (sIn.value) search(sIn.value); });
  sIn.addEventListener('blur', () => setTimeout(() => (sOut.hidden = true), 120));
  sIn.addEventListener('keydown', (e) => {
    const btns = [...sOut.querySelectorAll('[data-i]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(0, Math.min(btns.length - 1, focusIdx + (e.key === 'ArrowDown' ? 1 : -1))); btns.forEach((b, k) => b.classList.toggle('is-focus', k === focusIdx)); }
    if (e.key === 'Enter') { e.preventDefault(); choose(focusIdx >= 0 ? focusIdx : 0); }
    if (e.key === 'Escape') { sIn.value = ''; sOut.hidden = true; sIn.blur(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !document.querySelector('.overlay')) { e.preventDefault(); sIn.focus(); }
  });

  // Notificación simulada de Compras durante la demostración (una sola vez por sesión)
  setTimeout(() => {
    let shown = false;
    try { shown = sessionStorage.getItem('nk-sim-notif') === '1'; sessionStorage.setItem('nk-sim-notif', '1'); } catch (e) { /* noop */ }
    if (shown) return;
    const r = NK.store.state.requests.find((x) => x.status === 'enviada');
    if (!r) return;
    NK.notify(`Compras recibió ${r.folio}`, `${r.desc}: la solicitud está en la bandeja de Compras.`, 'inbox');
    NK.toast(`Compras recibió ${r.folio}`, 'Notificación simulada de la demostración.', 'info');
  }, 9000);

  window.addEventListener('hashchange', () => { sIn.value = ''; sOut.hidden = true; render(false); });
  renderNotifDot();
  NK.icons();
  render(false);
})();
