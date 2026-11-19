/* TALLER — tablero de órdenes de trabajo, programa preventivo, historial y técnicos */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;
  const ui = { tab: 'tablero', q: '', prio: 'todas', tech: 'todos' };
  const COLS = ['pendiente', 'proceso', 'espera', 'terminado'];

  function card(o) {
    const u = NK.store.unit(o.unit);
    const t = NK.store.tech(o.tech);
    const missing = o.mats.filter((m) => { const it = NK.store.item(m.code); return it && it.exist < m.qty; }).length;
    return `<button type="button" class="wo" draggable="true" data-ot="${o.folio}" style="--prio:${NK.PRIO_COLOR[o.prio]}" aria-label="Orden ${o.folio}, ${o.unit}, ${esc(o.title)}, prioridad ${NK.PRIO[o.prio]}">
      <div class="wo__top"><span class="wo__folio">${o.folio}</span>${NK.prio(o.prio)}</div>
      <div class="wo__unit"><b>${o.unit}</b><span>${u ? `${u.marca} ${u.modelo}` : ''}</span></div>
      <p class="wo__desc"><strong style="color:var(--ink);font-weight:600">${esc(o.title)}.</strong> ${esc(o.desc)}</p>
      ${o.status === 'espera' && o.waitFor ? `<div class="wo__wait">${NK.icon('package-search')}<span>${esc(o.waitFor)}</span></div>` : ''}
      <div class="wo__foot">
        <span class="avatar avatar--xs" title="${t.name}">${t.id}</span>
        <span class="grow" title="${o.status === 'terminado' ? 'Terminó' : 'Ingresó'} ${F.date(o.status === 'terminado' ? o.doneDate : o.inDate)}">${t.name.split(' ')[0]} · ${F.rel(o.status === 'terminado' ? o.doneDate : o.inDate)}</span>
        ${o.mats.length ? `<span class="tag" title="Materiales requeridos">${NK.icon('package')}${o.mats.length}${missing ? ' <span style="color:var(--danger)">· falta</span>' : ''}</span>` : ''}
        <span class="tag">${o.type}</span>
      </div>
    </button>`;
  }

  function board(root) {
    const s = NK.store.state;
    const q = ui.q.toLowerCase();
    const list = s.orders.filter((o) => (ui.prio === 'todas' || o.prio === ui.prio || (ui.prio === 'alta' && o.prio === 'urgente')) && (ui.tech === 'todos' || o.tech === ui.tech) && (!q || [o.folio, o.unit, o.title, o.desc].join(' ').toLowerCase().includes(q)));
    const box = root.querySelector('#tab-body');
    box.innerHTML = `
      <div class="toolbar" style="padding:0 0 14px;border:0">
        <div class="field-search">${NK.icon('search')}<input type="search" id="ot-q" placeholder="Buscar folio, unidad o trabajo" value="${esc(ui.q)}" aria-label="Buscar orden de trabajo"></div>
        <select class="select" id="ot-prio" aria-label="Prioridad"><option value="todas">Todas las prioridades</option><option value="alta" ${ui.prio === 'alta' ? 'selected' : ''}>Urgente y alta</option><option value="media" ${ui.prio === 'media' ? 'selected' : ''}>Media</option><option value="baja" ${ui.prio === 'baja' ? 'selected' : ''}>Baja</option></select>
        <select class="select" id="ot-tech" aria-label="Responsable"><option value="todos">Todos los técnicos</option>${NK.TECHS.map((t) => `<option value="${t.id}" ${ui.tech === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
        <span class="grow"></span>
        <span class="muted small">${NK.icon('move')} Arrastre una tarjeta para cambiar su estado, o ábrala.</span>
      </div>
      <div class="board">
        ${COLS.map((c) => {
          const items = list.filter((o) => o.status === c).sort((a, b) => ['urgente', 'alta', 'media', 'baja'].indexOf(a.prio) - ['urgente', 'alta', 'media', 'baja'].indexOf(b.prio));
          const st = NK.OT_STATUS[c];
          return `<section class="col" data-col="${c}" aria-label="${st.label}">
            <div class="col__head"><span class="sw" style="background:${st.color}"></span><h3>${st.label}</h3><span class="count">${items.length}</span>${c === 'terminado' ? '<span class="hint">últimos 7 días</span>' : ''}</div>
            <div class="col__list">${items.map(card).join('') || `<div class="empty" style="padding:24px 10px"><p style="margin:0;font-size:13px">Sin órdenes en esta columna</p></div>`}</div>
          </section>`;
        }).join('')}
      </div>`;
    NK.icons();
    const qi = box.querySelector('#ot-q');
    qi.addEventListener('input', () => { ui.q = qi.value; board(root); const n = root.querySelector('#ot-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    box.querySelector('#ot-prio').addEventListener('change', (e) => { ui.prio = e.target.value; board(root); });
    box.querySelector('#ot-tech').addEventListener('change', (e) => { ui.tech = e.target.value; board(root); });
    box.querySelectorAll('.wo').forEach((w) => {
      w.addEventListener('click', () => openOrder(w.dataset.ot));
      w.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', w.dataset.ot); w.classList.add('is-dragging'); });
      w.addEventListener('dragend', () => w.classList.remove('is-dragging'));
    });
    box.querySelectorAll('.col').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('is-over'); moveOrder(e.dataTransfer.getData('text/plain'), col.dataset.col); });
    });
  }

  function moveOrder(folio, status, silent) {
    const s = NK.store.state;
    const o = NK.store.order(folio);
    if (!o || o.status === status) return;
    const prev = o.status;
    o.status = status;
    const u = NK.store.unit(o.unit);
    const msg = { pendiente: 'regresó a pendiente', proceso: 'pasó a en proceso', espera: 'quedó en espera de material', terminado: 'se marcó como terminada' }[status];
    o.log.push({ at: new Date().toISOString(), text: `Estado: ${NK.OT_STATUS[status].label}` });
    if (status === 'terminado') {
      o.doneDate = new Date().toISOString();
      if (u && u.status === 'mantenimiento' && !s.orders.some((x) => x.unit === u.id && x.folio !== folio && x.status !== 'terminado' && x.status !== 'pendiente')) {
        u.status = 'disponible';
        if (o.type === 'Preventivo') { u.lastSvc = { date: o.doneDate, km: u.km, type: o.title.includes('B') ? 'Preventivo B' : o.title.includes('tolva') ? 'Preventivo tolva' : 'Preventivo A' }; u.nextSvcKm = u.km + u.interval; }
      }
      // Descontar materiales reservados del inventario
      o.mats.forEach((m) => { const it = NK.store.item(m.code); if (it) { const q = Math.min(m.qty, it.exist); it.exist -= q; it.reserved = Math.max(0, it.reserved - m.qty); if (q) s.movements.unshift({ at: o.doneDate, code: m.code, type: 'salida', qty: q, ref: `${o.folio} · ${o.unit}`, by: NK.store.tech(o.tech).name }); } });
    } else if (prev === 'terminado') o.doneDate = null;
    if ((status === 'proceso' || status === 'espera') && u && u.status === 'disponible') u.status = 'mantenimiento';
    NK.store.log(status === 'terminado' ? 'circle-check' : 'wrench', status === 'terminado' ? 'ok' : 'info', `<b>${o.folio}</b> (${o.unit}) ${msg}`);
    NK.store.save();
    if (!silent) NK.toast(`${o.folio} ${msg}`, status === 'terminado' && u ? `${u.id} quedó disponible y los materiales se descontaron del inventario.` : '', status === 'terminado' ? 'ok' : 'info');
    NK.refresh();
  }

  function openOrder(folio) {
    const o = NK.store.order(folio);
    if (!o) return;
    const u = NK.store.unit(o.unit);
    const t = NK.store.tech(o.tech);
    const matsRows = o.mats.map((m) => { const it = NK.store.item(m.code); const ok = it && it.exist >= m.qty; return `<tr><td class="td-main"><span class="mono small">${m.code}</span> ${it ? esc(it.desc) : ''}</td><td data-label="Cantidad" class="right mono">${m.qty} <span class="muted">${it ? it.unit : ''}</span></td><td data-label="Almacén" class="right mono">${it ? it.exist : '—'}</td><td data-label="Estado">${ok ? NK.badge('Disponible', 'ok') : NK.badge('Falta material', 'danger')}</td></tr>`; }).join('');
    const missing = o.mats.filter((m) => { const it = NK.store.item(m.code); return it && it.exist < m.qty; });
    const m = NK.modal({
      title: `${o.folio} · ${o.title}`, icon: 'clipboard-list', size: 'lg',
      sub: `${o.unit} ${u ? `— ${u.marca} ${u.modelo}` : ''} · ${o.type}`,
      body: `
        <div class="field" style="margin-bottom:16px"><span class="label">Estado de la orden</span>
          <div class="stepper" role="group" aria-label="Cambiar estado">
            ${COLS.map((c) => `<button type="button" data-set="${c}" aria-pressed="${o.status === c}">${NK.icon(NK.OT_STATUS[c].icon)}${NK.OT_STATUS[c].short || NK.OT_STATUS[c].label}</button>`).join('')}
          </div>
        </div>
        <dl class="kv" style="margin:0 0 16px">
          <div><dt>Unidad</dt><dd class="mono">${o.unit}</dd></div>
          <div><dt>Tipo de mantenimiento</dt><dd>${o.type}</dd></div>
          <div><dt>Responsable</dt><dd>${t.name}</dd></div>
          <div><dt>Prioridad</dt><dd>${NK.prio(o.prio)}</dd></div>
          <div><dt>Fecha de ingreso</dt><dd>${F.date(o.inDate)}</dd></div>
          <div><dt>Tiempo trabajado</dt><dd class="mono">${F.n1(o.hours)} h <span class="muted">de ${F.n1(o.est)} h estimadas</span></dd></div>
        </dl>
        <div class="field" style="margin-bottom:16px"><span class="label">Descripción del trabajo</span><p style="color:var(--ink-2)">${esc(o.desc)}</p></div>
        ${o.status === 'espera' && o.waitFor ? `<div class="callout callout--warn" style="margin-bottom:16px">${NK.icon('package-search')}<div><strong>En espera:</strong> ${esc(o.waitFor)}</div></div>` : ''}
        <div class="field"><span class="label">Materiales requeridos</span>
          ${o.mats.length ? `<section class="panel panel--flush"><table class="table table--cards table--compact"><thead><tr><th>Artículo</th><th class="right">Cantidad</th><th class="right">En almacén</th><th>Estado</th></tr></thead><tbody>${matsRows}</tbody></table></section>` : '<p class="muted small">Esta orden no tiene materiales asignados.</p>'}
        </div>
        <div class="field" style="margin-top:16px"><span class="label">Bitácora</span>
          <ul class="timeline" style="padding:0">${o.log.slice().reverse().map((l) => `<li><span class="tl-ic">${NK.icon('dot')}</span><div><p>${esc(l.text)}</p><time>${F.date(l.at)} · ${F.time(l.at)}</time></div></li>`).join('')}</ul>
        </div>`,
      foot: `${missing.length ? `<button class="btn" data-req>${NK.icon('clipboard-plus')}Solicitar material faltante</button>` : ''}<span class="spacer"></span><button class="btn" data-close>Cerrar</button>${o.status !== 'terminado' ? `<button class="btn btn--dark" data-done>${NK.icon('circle-check')}Marcar como terminada</button>` : ''}`,
    });
    m.el.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => { moveOrder(o.folio, b.dataset.set); m.close(); }));
    const done = m.el.querySelector('[data-done]'); if (done) done.addEventListener('click', () => { moveOrder(o.folio, 'terminado'); m.close(); });
    const rq = m.el.querySelector('[data-req]'); if (rq) rq.addEventListener('click', () => { m.close(); NK.newRequest({ item: missing[0].code, qty: missing[0].qty, ref: `${o.folio} · ${o.unit}`, prio: o.prio === 'urgente' ? 'alta' : o.prio }); });
  }
  NK.openOrder = openOrder;

  // Nueva orden de trabajo
  NK.newOrder = function (pre = {}) {
    const s = NK.store.state;
    const inv = s.inventory;
    const lineHtml = (code = '', qty = 1) => `<div class="mat-line"><select aria-label="Material"><option value="">Seleccione material…</option>${inv.map((i) => `<option value="${i.code}" ${i.code === code ? 'selected' : ''}>${i.code} · ${esc(i.desc)} (disp. ${i.exist - i.reserved})</option>`).join('')}</select><input type="number" min="1" value="${qty}" aria-label="Cantidad"><button type="button" class="icon-btn" data-rm aria-label="Quitar material">${NK.icon('trash-2')}</button></div>`;
    const m = NK.modal({
      title: 'Nueva orden de trabajo', icon: 'clipboard-plus', size: 'lg',
      sub: 'Complete los datos principales. Podrá agregar detalles después.',
      body: `<form class="form" id="ot-form" novalidate>
        <div class="form-row">
          <div class="field"><label for="f-unit">Unidad</label><select id="f-unit" data-required><option value="">Seleccione la unidad…</option>${s.units.map((u) => `<option value="${u.id}" ${pre.unit === u.id ? 'selected' : ''}>${u.id} · ${u.marca} ${u.modelo} (${NK.UNIT_STATUS[u.status].label.toLowerCase()})</option>`).join('')}</select>${NK.fieldErr('Seleccione una unidad')}</div>
          <div class="field"><label for="f-tech">Responsable</label><select id="f-tech" data-required><option value="">Seleccione técnico…</option>${NK.TECHS.map((t) => `<option value="${t.id}">${t.name} · ${t.role}</option>`).join('')}</select>${NK.fieldErr('Asigne un responsable')}</div>
        </div>
        <div class="field"><span class="label">Tipo de mantenimiento</span>
          <div class="radio-cards" role="radiogroup">${['Preventivo', 'Correctivo', 'Llantas'].map((t, i) => `<label class="radio-card"><input type="radio" name="f-type" value="${t}" ${i === (pre.type === 'Preventivo' ? 0 : 1) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        </div>
        <div class="field"><label for="f-title">Trabajo a realizar</label><input id="f-title" data-required placeholder="Ej. Cambio de balatas eje de tracción" value="${esc(pre.title || '')}">${NK.fieldErr('Escriba un título breve')}</div>
        <div class="field"><label for="f-desc">Descripción <span class="opt">(opcional)</span></label><textarea id="f-desc" placeholder="Síntomas, hallazgos o instrucciones para el técnico"></textarea></div>
        <div class="field"><span class="label">Prioridad</span>
          <div class="radio-cards" role="radiogroup">${['baja', 'media', 'alta', 'urgente'].map((p) => `<label class="radio-card"><input type="radio" name="f-prio" value="${p}" ${p === (pre.prio || 'media') ? 'checked' : ''}><span>${NK.PRIO[p]}</span></label>`).join('')}</div>
        </div>
        <div class="field"><span class="label">Materiales requeridos <span class="opt">(opcional)</span></span>
          <div class="mat-lines" id="f-mats">${lineHtml()}</div>
          <button type="button" class="btn btn--ghost btn--sm" id="f-add" style="justify-self:start">${NK.icon('plus')}Agregar material</button>
          <span class="help">Los materiales se reservan en inventario al crear la orden.</span>
        </div>
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn--primary" id="f-save">${NK.icon('check')}Crear orden</button>`,
    });
    const el = m.el;
    const mats = el.querySelector('#f-mats');
    const bindRm = () => mats.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { if (mats.children.length > 1) b.parentElement.remove(); else b.parentElement.querySelector('select').value = ''; }));
    bindRm();
    el.querySelector('#f-add').addEventListener('click', () => { mats.insertAdjacentHTML('beforeend', lineHtml()); NK.icons(); bindRm(); });
    el.querySelectorAll('[data-required]').forEach((x) => x.addEventListener('input', () => x.closest('.field').classList.remove('is-invalid')));
    el.querySelector('#f-save').addEventListener('click', () => {
      const form = el.querySelector('#ot-form');
      if (!NK.validate(form)) return;
      const folio = NK.store.nextFolio('ot');
      const lines = [...mats.children].map((r) => ({ code: r.querySelector('select').value, qty: Number(r.querySelector('input').value) || 1 })).filter((x) => x.code);
      lines.forEach((l) => { const it = NK.store.item(l.code); if (it) it.reserved += l.qty; });
      const o = {
        folio, unit: el.querySelector('#f-unit').value, type: el.querySelector('input[name="f-type"]:checked').value,
        title: el.querySelector('#f-title').value.trim(), desc: el.querySelector('#f-desc').value.trim() || 'Sin descripción adicional.',
        tech: el.querySelector('#f-tech').value, prio: el.querySelector('input[name="f-prio"]:checked').value, status: 'pendiente',
        inDate: new Date().toISOString(), doneDate: null, hours: 0, est: 4, waitFor: null, mats: lines,
        log: [{ at: new Date().toISOString(), text: 'Orden creada por D. Treviño' }],
      };
      NK.store.state.orders.unshift(o);
      NK.store.log('clipboard-plus', 'brand', `Nueva orden <b>${folio}</b> para <b>${o.unit}</b>: ${esc(o.title)}`);
      NK.store.save();
      m.close();
      NK.toast(`Orden ${folio} creada`, `Asignada a ${NK.store.tech(o.tech).name}. Aparece en la columna Pendiente.`);
      if (location.hash.startsWith('#/taller')) NK.refresh(); else location.hash = '#/taller';
    });
  };

  // Programa preventivo
  function programa(root) {
    const s = NK.store.state;
    const list = s.units.filter((u) => u.status !== 'fuera').map((u) => ({ u, svc: NK.unitSvc(u) })).sort((a, b) => a.svc.days - b.svc.days);
    const hasOpen = (id) => s.orders.some((o) => o.unit === id && o.status !== 'terminado' && o.type === 'Preventivo');
    const buckets = [
      { title: 'Vencidos', tone: 'danger', test: (x) => x.svc.remaining < 0 },
      { title: 'Esta semana', tone: 'warn', test: (x) => x.svc.remaining >= 0 && x.svc.days <= 7 },
      { title: 'Próxima semana', tone: 'info', test: (x) => x.svc.days > 7 && x.svc.days <= 14 },
      { title: 'En 15 a 30 días', tone: 'muted', test: (x) => x.svc.days > 14 && x.svc.days <= 30 },
    ];
    const box = root.querySelector('#tab-body');
    box.innerHTML = `
      <div class="callout" style="margin-bottom:18px">${NK.icon('info')}<div>El programa se calcula con el <strong>kilometraje de cada unidad</strong> y su recorrido promedio diario. Use <strong>Programar</strong> para crear la orden de trabajo preventiva.</div></div>
      ${buckets.map((b) => {
        const items = list.filter(b.test);
        return `<div class="schedule-week"><h3>${NK.badge(b.title, b.tone)}<span class="muted small" style="font-weight:400">${items.length} unidades</span></h3>
          ${items.length ? `<section class="panel panel--flush"><table class="table table--cards"><thead><tr><th>Unidad</th><th>Servicio</th><th>Avance del intervalo</th><th>Fecha estimada</th><th class="right">Acción</th></tr></thead><tbody>
          ${items.map(({ u, svc }) => `<tr>
            <td class="td-main"><span class="unit-id">${u.id}</span><span class="cell-sub">${u.marca} ${u.modelo}</span></td>
            <td data-label="Servicio">${u.type === 'tolva' ? 'Preventivo de tolva' : u.lastSvc.type === 'Preventivo A' ? 'Preventivo B' : 'Preventivo A'}<span class="cell-sub">cada ${F.km(u.interval)}</span></td>
            <td data-label="Avance"><div class="km-progress"><div class="lbl"><span class="mono">${F.n(u.km - u.lastSvc.km)} / ${F.n(u.interval)} km</span></div><div class="bar bar--${svc.tone === 'ok' ? 'ink' : svc.tone}"><span style="width:${svc.used * 100}%"></span></div></div></td>
            <td data-label="Fecha estimada">${svc.remaining < 0 ? '<b style="color:var(--danger)">Inmediato</b>' : F.date(svc.date)}</td>
            <td class="right" data-label="Acción">${hasOpen(u.id) || u.status === 'mantenimiento' ? NK.badge('Orden abierta', 'info') : `<button class="btn btn--sm" data-prog="${u.id}">${NK.icon('calendar-plus')}Programar</button>`}</td>
          </tr>`).join('')}</tbody></table></section>` : `<p class="muted small" style="padding:4px 0 8px">Sin unidades en este periodo.</p>`}
        </div>`;
      }).join('')}`;
    NK.icons();
    box.querySelectorAll('[data-prog]').forEach((b) => b.addEventListener('click', () => {
      const u = NK.store.unit(b.dataset.prog);
      NK.newOrder({ unit: u.id, type: 'Preventivo', title: u.type === 'tolva' ? 'Preventivo de tolva' : `Servicio ${u.lastSvc.type === 'Preventivo A' ? 'preventivo B' : 'preventivo A'}`, prio: NK.unitSvc(u).remaining < 0 ? 'alta' : 'media' });
    }));
  }

  function historial(root) {
    const s = NK.store.state;
    const done = s.orders.filter((o) => o.status === 'terminado').map((o) => ({ date: o.doneDate, unit: o.unit, service: o.title, kind: o.type, tech: o.tech, hours: o.hours, cost: null, folio: o.folio }));
    const rows = done.concat(s.history.slice(0, 60)).sort((a, b) => b.date.localeCompare(a.date));
    const box = root.querySelector('#tab-body');
    const totalH = rows.reduce((a, r) => a + r.hours, 0);
    box.innerHTML = `<section class="panel panel--flush">
      <div class="toolbar"><strong style="font-size:15px">Servicios realizados</strong><span class="muted small">${rows.length} registros recientes · ${F.n1(totalH)} horas de trabajo</span></div>
      <div class="table-wrap"><table class="table table--cards"><thead><tr><th>Fecha</th><th>Unidad</th><th>Servicio</th><th>Tipo</th><th>Técnico</th><th class="right">Horas</th><th class="right">Costo</th></tr></thead><tbody>
      ${rows.map((r) => `<tr ${r.folio ? `class="is-click" data-ot="${r.folio}"` : ''}><td class="td-main">${F.date(r.date)}${r.folio ? ` <span class="mono small muted">${r.folio}</span>` : ''}</td><td data-label="Unidad" class="mono">${r.unit}</td><td data-label="Servicio">${esc(r.service)}</td><td data-label="Tipo">${NK.badge(r.kind, r.kind === 'Preventivo' ? 'info' : r.kind === 'Llantas' ? 'muted' : 'brand', 'badge--plain badge--sq')}</td><td data-label="Técnico">${NK.store.tech(r.tech).name}</td><td data-label="Horas" class="right mono">${F.n1(r.hours)}</td><td data-label="Costo" class="right mono">${r.cost == null ? '<span class="muted">Por cerrar</span>' : F.money(r.cost)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
    NK.icons();
    box.querySelectorAll('[data-ot]').forEach((r) => r.addEventListener('click', () => openOrder(r.dataset.ot)));
  }

  function tecnicos(root) {
    const s = NK.store.state;
    const box = root.querySelector('#tab-body');
    box.innerHTML = `<div class="tech-grid">${NK.TECHS.map((t) => {
      const open = s.orders.filter((o) => o.tech === t.id && o.status !== 'terminado');
      const week = s.history.filter((h) => h.tech === t.id && F.days(h.date) > -30).reduce((a, h) => a + h.hours, 0) / 4 + open.reduce((a, o) => a + o.hours, 0);
      const util = Math.min(100, (week / 40) * 100);
      return `<article class="tech">
        <div class="tech__head"><span class="avatar">${t.id}</span><div><strong>${t.name}</strong><span>${t.role} · turno ${t.shift.toLowerCase()}</span></div></div>
        <div class="tech__rows">
          <div><span class="muted">Órdenes abiertas</span><span class="num mono">${open.length}</span></div>
          <div><span class="muted">Horas registradas (semana)</span><span class="num mono">${F.n1(week)} h</span></div>
          <div><span class="muted">Ocupación</span><span class="num mono">${F.pct(util)}</span></div>
          <div class="bar ${util > 90 ? 'bar--danger' : util > 75 ? 'bar--warn' : 'bar--ink'}"><span style="width:${util}%"></span></div>
          <div style="display:block">${open.length ? open.map((o) => `<button class="tag" style="border:0;margin:2px 4px 2px 0;cursor:pointer" data-ot="${o.folio}">${o.unit} · ${NK.OT_STATUS[o.status].short || NK.OT_STATUS[o.status].label}</button>`).join('') : '<span class="muted small">Sin trabajos asignados</span>'}</div>
        </div>
      </article>`;
    }).join('')}</div>`;
    NK.icons();
    box.querySelectorAll('[data-ot]').forEach((b) => b.addEventListener('click', () => openOrder(b.dataset.ot)));
  }

  NK.views.taller = {
    title: 'Taller',
    render(root, params) {
      const s = NK.store.state;
      if (params.get('tab')) ui.tab = params.get('tab');
      const open = s.orders.filter((o) => o.status !== 'terminado');
      const tabs = [['tablero', 'Órdenes de trabajo', open.length], ['programa', 'Programa preventivo'], ['historial', 'Historial de servicios'], ['tecnicos', 'Técnicos']];
      const hoursOpen = open.reduce((a, o) => a + o.hours, 0);
      root.innerHTML = `<div class="view">
        ${NK.pageHead({ eyebrow: 'Operación', title: 'Taller y mantenimiento', text: `${open.length} órdenes abiertas · ${s.orders.filter((o) => o.status === 'espera').length} detenidas por material · ${F.n1(hoursOpen)} horas trabajadas en órdenes abiertas.`, actions: `<button class="btn btn--primary btn--lg" type="button" id="btn-new-ot">${NK.icon('plus')}Nueva orden de trabajo</button>` })}
        <div class="tabs" role="tablist">${tabs.map(([k, l, c]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${ui.tab === k}">${l}${c != null ? `<span class="count">${c}</span>` : ''}</button>`).join('')}</div>
        <div id="tab-body"></div>
      </div>`;
      NK.icons();
      const draw = () => ({ tablero: board, programa, historial, tecnicos }[ui.tab] || board)(root);
      draw();
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.tab; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b)); draw(); }));
      root.querySelector('#btn-new-ot').addEventListener('click', () => NK.newOrder());
      if (params.get('new')) NK.newOrder();
      if (params.get('ot')) openOrder(params.get('ot'));
    },
  };
})();
