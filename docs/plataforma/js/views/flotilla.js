/* FLOTILLA — listado de unidades y ficha de detalle */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;
  const ui = { q: '', status: 'todas', type: 'todos', marca: 'todas', sort: { key: 'id', dir: 'asc' } };

  function svcCell(u) {
    const svc = NK.unitSvc(u);
    const txt = svc.remaining < 0 ? `Vencido · ${F.km(-svc.remaining)}` : `en ${F.km(svc.remaining)}`;
    return `<div class="km-progress">
      <div class="lbl"><span class="${svc.tone === 'danger' ? '' : 'mono'}" style="${svc.tone === 'danger' ? 'color:var(--danger);font-weight:600' : ''}">${txt}</span><span class="muted">${svc.remaining < 0 ? '' : '≈ ' + F.dateS(svc.date)}</span></div>
      <div class="bar bar--${svc.tone === 'ok' ? 'ink' : svc.tone}" role="img" aria-label="${Math.round(svc.used * 100)} % del intervalo de servicio recorrido"><span style="width:${svc.used * 100}%"></span></div>
    </div>`;
  }

  NK.views.flotilla = {
    title: 'Flotilla',
    render(root, params) {
      const s = NK.store.state;
      const U = s.units;
      const counts = { todas: U.length, disponible: 0, mantenimiento: 0, fuera: 0 };
      U.forEach((u) => counts[u.status]++);
      const marcas = [...new Set(U.map((u) => u.marca))].sort();
      if (params.get('s')) ui.status = params.get('s');

      root.innerHTML = `<div class="view">
        ${NK.pageHead({ eyebrow: 'Operación', title: 'Flotilla', text: 'Consulte el estado, kilometraje y mantenimiento de cada unidad. Seleccione una fila para abrir su ficha completa.', actions: `<button class="btn" type="button" id="fl-export">${NK.icon('download')}Exportar lista</button>` })}
        <div class="chips" role="group" aria-label="Filtrar por estado" style="margin-bottom:14px">
          ${[['todas', 'Todas', ''], ['disponible', 'Disponibles', NK.UNIT_STATUS.disponible.color], ['mantenimiento', 'En mantenimiento', NK.UNIT_STATUS.mantenimiento.color], ['fuera', 'Fuera de servicio', NK.UNIT_STATUS.fuera.color]].map(([k, l, c]) => `<button type="button" class="chip" data-st="${k}" aria-pressed="${ui.status === k}">${c ? `<span class="sw" style="background:${c}"></span>` : ''}${l}<span class="count">${counts[k]}</span></button>`).join('')}
        </div>
        <section class="panel">
          <div class="toolbar">
            <div class="field-search">${NK.icon('search')}<input type="search" id="fl-q" placeholder="Buscar por número, marca, placas u operador" value="${esc(ui.q)}" aria-label="Buscar unidad"></div>
            <select class="select" id="fl-type" aria-label="Tipo de unidad">
              <option value="todos">Todos los tipos</option>
              ${Object.entries(NK.TYPE_LABEL).map(([k, v]) => `<option value="${k}" ${ui.type === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <select class="select" id="fl-marca" aria-label="Marca">
              <option value="todas">Todas las marcas</option>
              ${marcas.map((m) => `<option ${ui.marca === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
            <span class="grow"></span>
            <span class="muted small" id="fl-count"></span>
          </div>
          <div class="table-wrap" id="fl-table"></div>
        </section>
      </div>`;
      NK.icons();

      const draw = () => {
        const q = ui.q.trim().toLowerCase();
        let list = U.filter((u) => (ui.status === 'todas' || u.status === ui.status) && (ui.type === 'todos' || u.type === ui.type) && (ui.marca === 'todas' || u.marca === ui.marca) && (!q || [u.id, u.marca, u.modelo, u.placas, u.operador || '', String(u.year)].join(' ').toLowerCase().includes(q)));
        const keyMap = { next: (u) => NK.unitSvc(u).remaining, last: (u) => u.lastSvc.date, status: (u) => ['fuera', 'mantenimiento', 'disponible'].indexOf(u.status) };
        list = NK.sortBy(list, keyMap[ui.sort.key] || ui.sort.key, ui.sort.dir);
        document.getElementById('fl-count').textContent = `${list.length} de ${U.length} unidades`;
        const box = document.getElementById('fl-table');
        if (!list.length) { NK.mount(box, NK.empty('search-x', 'No hay unidades con esos filtros', 'Pruebe con otro término de búsqueda o quite algún filtro.', '<button class="btn btn--sm" id="fl-clear">Quitar filtros</button>')); box.querySelector('#fl-clear').onclick = () => { Object.assign(ui, { q: '', status: 'todas', type: 'todos', marca: 'todas' }); NK.views.flotilla.render(root, new URLSearchParams()); }; return; }
        box.innerHTML = `<table class="table table--cards">
          <thead><tr>
            ${NK.th('Número', 'id', ui.sort)}${NK.th('Marca y modelo', 'marca', ui.sort)}${NK.th('Año', 'year', ui.sort)}${NK.th('Tipo', 'type', ui.sort)}${NK.th('Estado', 'status', ui.sort)}${NK.th('Kilometraje', 'km', ui.sort, 'right')}${NK.th('Último mantenimiento', 'last', ui.sort)}${NK.th('Próximo mantenimiento', 'next', ui.sort)}<th><span class="sr-only">Abrir</span></th>
          </tr></thead>
          <tbody>
            ${list.map((u) => {
              const svc = NK.unitSvc(u);
              return `<tr class="is-click ${u.status === 'fuera' ? 'row-alert' : svc.remaining < 0 ? 'row-warn' : ''}" data-unit="${u.id}" tabindex="0">
                <td class="td-main"><span class="unit-id">${u.id}</span><span class="cell-sub">${u.placas}</span></td>
                <td data-label="Marca y modelo">${u.marca} <span class="muted">${u.modelo}</span></td>
                <td data-label="Año" class="mono">${u.year}</td>
                <td data-label="Tipo">${NK.TYPE_LABEL[u.type]}</td>
                <td data-label="Estado">${NK.unitBadge(u.status)}</td>
                <td data-label="Kilometraje" class="right mono">${F.n(u.km)}</td>
                <td data-label="Último mant.">${F.date(u.lastSvc.date)}<span class="cell-sub">${u.lastSvc.type}</span></td>
                <td data-label="Próximo mant.">${svcCell(u)}</td>
                <td class="right td-hide-m">${NK.icon('chevron-right', 'row-go')}</td>
              </tr>`;
            }).join('')}
          </tbody></table>`;
        NK.icons();
        NK.bindSort(box, ui.sort, draw);
        box.querySelectorAll('tr[data-unit]').forEach((tr) => {
          tr.addEventListener('click', () => NK.openUnit(tr.dataset.unit));
          tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') NK.openUnit(tr.dataset.unit); });
        });
      };
      draw();

      root.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { ui.status = b.dataset.st; root.querySelectorAll('[data-st]').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); }));
      const qi = document.getElementById('fl-q');
      qi.addEventListener('input', () => { ui.q = qi.value; draw(); });
      document.getElementById('fl-type').addEventListener('change', (e) => { ui.type = e.target.value; draw(); });
      document.getElementById('fl-marca').addEventListener('change', (e) => { ui.marca = e.target.value; draw(); });
      document.getElementById('fl-export').addEventListener('click', () => NK.toast('Lista preparada', 'En la versión final se descargará como Excel. Esta es una demostración.', 'info'));

      if (params.get('u')) NK.openUnit(params.get('u'));
    },
  };

  // ------------------------------------------------------------------
  // Ficha de unidad (panel lateral). Disponible desde cualquier módulo.
  // ------------------------------------------------------------------
  NK.openUnit = function (id, tab = 'general') {
    const s = NK.store.state;
    const u = NK.store.unit(id);
    if (!u) return;
    const svc = NK.unitSvc(u);
    const hist = s.history.filter((h) => h.unit === id);
    const orders = s.orders.filter((o) => o.unit === id);
    const cost12 = hist.reduce((a, h) => a + h.cost, 0);
    const tires = s.tires.filter((t) => t.unit === id);
    const retired = s.retired.filter((t) => t.unit === id);
    const inc = s.incidents.filter((i) => i.unit === id);
    const docs = s.docs.filter((d) => d.unit === id);
    const fuelMonth = u.kmpl ? Math.round((u.daily * 26) / u.kmpl) : 0;
    const tabs = [['general', 'General'], ['mtto', 'Mantenimientos', hist.length], ['gastos', 'Gastos'], ['llantas', 'Llantas', tires.length], ['incidencias', 'Incidencias', inc.length], ['docs', 'Documentación', docs.length], ['proximos', 'Próximos servicios']];

    const head = `
      <div class="drawer__top">
        <div class="unit-head">
          <div class="unit-head__art">${NK.truckSvg(u.type)}</div>
          <div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h2>${u.id}</h2>${NK.unitBadge(u.status)}</div>
            <p>${u.marca} ${u.modelo} · ${u.year} · ${NK.TYPE_LABEL[u.type]}</p>
          </div>
        </div>
        <button class="icon-btn" data-close aria-label="Cerrar ficha">${NK.icon('x')}</button>
      </div>
      <div class="tabs" role="tablist" aria-label="Secciones de la ficha">
        ${tabs.map(([k, l, c]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${k === tab}">${l}${c != null ? `<span class="count">${c}</span>` : ''}</button>`).join('')}
      </div>`;

    const d = NK.drawer({ head, body: '<div id="unit-body"></div>', label: `Ficha de la unidad ${u.id}` });
    const body = d.el.querySelector('#unit-body');

    const stats = `<div class="unit-stats">
      <div><span>Kilometraje</span><b>${F.n(u.km)}</b><small>km acumulados</small></div>
      <div><span>Próximo servicio</span><b style="${svc.remaining < 0 ? 'color:var(--danger)' : ''}">${svc.remaining < 0 ? 'Vencido' : F.n(svc.remaining)}</b><small>${svc.remaining < 0 ? `por ${F.km(-svc.remaining)}` : 'km restantes'}</small></div>
      <div><span>Gasto de mantenimiento</span><b>${F.moneyK(cost12)}</b><small>últimos 12 meses</small></div>
      <div><span>${u.kmpl ? 'Rendimiento' : 'Recorrido diario'}</span><b>${u.kmpl ? F.n2(u.kmpl) : F.n(u.daily)}</b><small>${u.kmpl ? 'km por litro' : 'km promedio'}</small></div>
    </div>`;

    const renderTab = (t) => {
      d.charts.forEach((c) => c.destroy()); d.charts.length = 0;
      let html = '';
      if (t === 'general') {
        html = stats + `
          ${u.status === 'fuera' ? `<div class="callout callout--warn" style="margin-bottom:16px">${NK.icon('octagon-alert')}<div><strong>Fuera de servicio.</strong> ${esc(u.outReason)}</div></div>` : ''}
          <section class="panel"><div class="panel__body">
            <dl class="kv" style="margin:0">
              <div><dt>Número económico</dt><dd class="mono">${u.id}</dd></div>
              <div><dt>Placas</dt><dd class="mono">${u.placas}</dd></div>
              <div><dt>Marca</dt><dd>${u.marca}</dd></div>
              <div><dt>Modelo</dt><dd>${u.modelo}</dd></div>
              <div><dt>Año</dt><dd class="mono">${u.year}</dd></div>
              <div><dt>Tipo</dt><dd>${NK.TYPE_LABEL[u.type]}</dd></div>
              <div><dt>Motor</dt><dd>${u.motor}</dd></div>
              <div><dt>Capacidad</dt><dd>${u.capacidad}</dd></div>
              <div><dt>Número de serie</dt><dd class="mono" style="font-size:13px">${u.vin}</dd></div>
              <div><dt>Operador asignado</dt><dd>${u.operador || '—'}</dd></div>
              <div><dt>Ruta habitual</dt><dd>${u.ruta}</dd></div>
              <div><dt>Intervalo de servicio</dt><dd class="mono">${F.km(u.interval)}</dd></div>
            </dl>
          </div></section>
          <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
            <button class="btn btn--primary" data-act="ot">${NK.icon('plus')}Crear orden de trabajo</button>
            <button class="btn" data-act="req">${NK.icon('clipboard-plus')}Solicitar material</button>
          </div>`;
      }
      if (t === 'mtto') {
        const rows = orders.filter((o) => o.status !== 'terminado').map((o) => ({ date: o.inDate, service: o.title, kind: o.type, cost: null, hours: o.hours, tech: o.tech, open: o })).concat(hist);
        html = rows.length ? `<section class="panel panel--flush"><div class="table-wrap"><table class="table table--cards table--compact">
          <thead><tr><th>Fecha</th><th>Servicio</th><th>Tipo</th><th>Técnico</th><th class="right">Horas</th><th class="right">Costo</th></tr></thead>
          <tbody>${rows.map((h) => `<tr>
            <td class="td-main">${F.date(h.date)}${h.open ? ' ' + NK.otBadge(h.open.status, true) : ''}</td>
            <td data-label="Servicio">${esc(h.service)}</td>
            <td data-label="Tipo">${NK.badge(h.kind, h.kind === 'Preventivo' ? 'info' : h.kind === 'Llantas' ? 'muted' : 'brand', 'badge--plain badge--sq')}</td>
            <td data-label="Técnico">${NK.store.tech(h.tech).name}</td>
            <td data-label="Horas" class="right mono">${F.n1(h.hours)}</td>
            <td data-label="Costo" class="right mono">${h.cost == null ? '<span class="muted">En curso</span>' : F.money(h.cost)}</td>
          </tr>`).join('')}</tbody></table></div></section>` : NK.empty('wrench', 'Sin servicios registrados', 'Esta unidad no tiene mantenimientos en los últimos 12 meses.');
      }
      if (t === 'gastos') {
        const byKind = {};
        hist.forEach((h) => { byKind[h.kind] = (byKind[h.kind] || 0) + h.cost; });
        const tireCost = tires.reduce((a, x) => a + (new Date(x.installDate) > new Date(Date.now() - 365 * 864e5) ? x.cost : 0), 0);
        const fuel12 = fuelMonth * 12 * 25.2;
        html = `<div class="unit-stats">
            <div><span>Preventivo</span><b>${F.moneyK(byKind.Preventivo || 0)}</b><small>12 meses</small></div>
            <div><span>Correctivo</span><b>${F.moneyK(byKind.Correctivo || 0)}</b><small>12 meses</small></div>
            <div><span>Llantas nuevas</span><b>${F.moneyK(tireCost)}</b><small>instaladas en 12 meses</small></div>
            <div><span>Combustible (estimado)</span><b>${u.kmpl ? F.moneyK(fuel12) : '—'}</b><small>${u.kmpl ? F.n(fuelMonth) + ' L/mes' : 'no aplica en remolque'}</small></div>
          </div>
          <section class="panel"><div class="panel__head"><div><h3>Gasto de mantenimiento por mes</h3><p class="panel__sub">Suma de servicios registrados</p></div></div>
          <div class="panel__body"><div class="chart-box chart-box--sm"><canvas id="u-cost"></canvas></div></div></section>
          <p class="chart-note">${NK.icon('info')}<span>Costo de mantenimiento por kilómetro: <b>${F.money2(cost12 / Math.max(1, u.daily * 300))}</b> (12 meses).</span></p>`;
      }
      if (t === 'llantas') {
        html = `<section class="panel panel--flush"><div class="table-wrap"><table class="table table--cards table--compact">
          <thead><tr><th>Posición</th><th>Marca y modelo</th><th>Instalación</th><th class="right">Km recorridos</th><th>Profundidad</th><th>Estado</th></tr></thead>
          <tbody>${tires.map((x) => { const st = NK.tireState(x); return `<tr class="is-click" data-tire="${x.id}" tabindex="0">
            <td class="td-main">${NK.POS_NAME(x.pos)}<span class="cell-sub mono">${x.serial}</span></td>
            <td data-label="Marca">${x.marca} <span class="muted">${x.modelo}</span></td>
            <td data-label="Instalación">${F.date(x.installDate)}</td>
            <td data-label="Km recorridos" class="right mono">${F.n(x.kmNow - x.kmInstall)}</td>
            <td data-label="Profundidad" class="mono">${F.n1(x.depth)} mm</td>
            <td data-label="Estado">${NK.badge(st.label, st.tone)}</td>
          </tr>`; }).join('')}</tbody></table></div></section>
          ${retired.length ? `<div class="section-title"><h2>Llantas retiradas de esta unidad</h2><span>${retired.length}</span></div>
          <section class="panel panel--flush"><table class="table table--cards table--compact"><tbody>${retired.map((x) => `<tr><td class="td-main">${F.date(x.retDate)} · ${NK.POS_NAME(x.pos)}</td><td data-label="Llanta">${x.marca} ${x.modelo}</td><td data-label="Recorrido" class="mono">${F.km(x.kmRan)}</td><td data-label="Motivo">${esc(x.reason)}</td></tr>`).join('')}</tbody></table></section>` : ''}`;
      }
      if (t === 'incidencias') {
        html = inc.length ? `<ul class="timeline" style="padding:0">${inc.map((i) => `<li><span class="tl-ic tl-ic--${i.sev === 'alta' ? 'danger' : i.sev === 'media' ? 'warn' : 'info'}">${NK.icon('triangle-alert')}</span><div><p><b>${esc(i.type)}</b> — ${esc(i.text)}</p><time>${F.date(i.date)} · severidad ${i.sev}</time></div></li>`).join('')}</ul>` : NK.empty('shield-check', 'Sin incidencias', 'No hay incidencias registradas para esta unidad en los últimos 12 meses.');
      }
      if (t === 'docs') {
        html = `<div class="doc-list">${docs.map((x) => { const dd = F.days(x.expires); const tone = dd < 0 ? 'danger' : dd <= 15 ? 'warn' : 'ok'; return `<div class="doc">
            <span class="doc__ic">${NK.icon('file-text')}</span>
            <div><strong>${x.name}</strong><span>${x.cat} · vence el ${F.date(x.expires)}</span></div>
            <div style="display:flex;gap:8px;align-items:center">${NK.badge(dd < 0 ? 'Vencido' : dd <= 15 ? `Vence en ${dd} días` : 'Vigente', tone)}<button class="icon-btn" data-doc="${esc(x.file)}" aria-label="Ver ${x.name}">${NK.icon('eye')}</button></div>
          </div>`; }).join('')}</div>`;
      }
      if (t === 'proximos') {
        const items = [];
        if (u.type !== 'tolva') {
          items.push({ name: svc.remaining < 0 || u.lastSvc.type === 'Preventivo A' ? 'Servicio preventivo B' : 'Servicio preventivo A', km: u.nextSvcKm, rem: svc.remaining });
          items.push({ name: 'Servicio preventivo C (transmisión y diferenciales)', km: u.nextSvcKm + u.interval * 2, rem: svc.remaining + u.interval * 2 });
          items.push({ name: 'Rotación y alineación de llantas', km: u.km + 8000, rem: 8000 });
        } else {
          items.push({ name: 'Preventivo de tolva (engrase, frenos y luces)', km: u.nextSvcKm, rem: svc.remaining });
          items.push({ name: 'Rotación de llantas', km: u.km + 12000, rem: 12000 });
        }
        html = `<section class="panel panel--flush"><table class="table table--cards"><thead><tr><th>Servicio</th><th class="right">Programado a</th><th>Faltan</th><th>Fecha estimada</th></tr></thead><tbody>
          ${items.map((it) => `<tr><td class="td-main"><strong>${it.name}</strong></td><td data-label="Programado a" class="right mono">${F.km(it.km)}</td><td data-label="Faltan">${it.rem < 0 ? NK.badge('Vencido', 'danger') : `<span class="mono">${F.km(it.rem)}</span>`}</td><td data-label="Fecha estimada">${it.rem < 0 ? 'Inmediato' : F.date(NK.dIn(Math.round(it.rem / u.daily)))}</td></tr>`).join('')}
        </tbody></table></section>
        <p class="chart-note">${NK.icon('info')}<span>Fechas estimadas con el recorrido promedio de la unidad: <b>${F.km(u.daily)} por día</b>.</span></p>`;
      }
      NK.mount(body, html);

      if (t === 'gastos') {
        const months = NK.MONTHS.map((m) => hist.filter((h) => { const d = new Date(h.date); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); }).reduce((a, h) => a + h.cost, 0));
        NK.chart(body.querySelector('#u-cost'), { type: 'bar', data: { labels: NK.monthLabels(), datasets: [{ data: months, backgroundColor: NK.C.steel, maxBarThickness: 22 }] }, options: { scales: { y: NK.axisMoney }, plugins: { tooltip: { callbacks: { label: (c) => ' ' + F.money(c.raw) } } } } }, d);
      }
      body.querySelectorAll('[data-act="ot"]').forEach((b) => b.addEventListener('click', () => { d.close(); NK.newOrder({ unit: u.id }); }));
      body.querySelectorAll('[data-act="req"]').forEach((b) => b.addEventListener('click', () => { d.close(); NK.newRequest({ ref: u.id }); }));
      body.querySelectorAll('[data-doc]').forEach((b) => b.addEventListener('click', () => NK.toast('Vista previa del documento', `${esc(b.dataset.doc)} — en la demostración no se adjuntan archivos reales.`, 'info')));
      body.querySelectorAll('[data-tire]').forEach((r) => r.addEventListener('click', () => NK.openTire(r.dataset.tire)));
    };

    d.el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      d.el.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b));
      renderTab(b.dataset.tab);
    }));
    renderTab(tab);
  };
})();
