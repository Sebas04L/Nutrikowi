/* CONTROL DE LLANTAS — ciclo de vida, diagrama de ejes y retiro */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;
  const ui = { unit: 'T-113', tire: null, tab: 'montadas', f: 'todas', q: '', page: 0 };
  const PAGE = 20;

  function axleSvg(u, tires) {
    const L = NK.TIRE_LAYOUTS[u.type];
    const W = 360, cx = W / 2;
    const tw = 26, th = 56, gap = 4;
    const axleY0 = u.type === 'tolva' ? 220 : 90;
    const axleGap = u.type === 'tolva' ? 78 : 150;
    const positions = [];
    L.forEach((ax, ai) => {
      const y = ax.axle === 1 ? axleY0 : (u.type === 'tolva' ? axleY0 + axleGap * ai : axleY0 + 150 + (ai - 1) * 76);
      if (ax.pos.length === 2) {
        positions.push({ p: ax.pos[0], x: cx - 112 - tw / 2, y });
        positions.push({ p: ax.pos[1], x: cx + 112 - tw / 2, y });
      } else {
        positions.push({ p: ax.pos[0], x: cx - 112 - tw - gap / 2, y }); // izq. exterior
        positions.push({ p: ax.pos[1], x: cx - 112 + gap / 2, y });      // izq. interior
        positions.push({ p: ax.pos[2], x: cx + 112 - tw - gap / 2, y }); // der. interior
        positions.push({ p: ax.pos[3], x: cx + 112 + gap / 2, y });      // der. exterior
      }
    });
    const lastY = Math.max(...positions.map((p) => p.y));
    const H = lastY + 110;
    const bodyTop = u.type === 'tolva' ? 30 : 20;
    const body = u.type === 'tolva'
      ? `<rect x="${cx - 86}" y="${bodyTop}" width="172" height="${H - bodyTop - 30}" rx="8" fill="#fff" stroke="#C9C3B8" stroke-width="2"/>
         <path d="M${cx - 60} ${bodyTop + 40} h120 M${cx - 60} ${bodyTop + 90} h120 M${cx - 60} ${bodyTop + 140} h120" stroke="#E3DFD7" stroke-width="2"/>
         <circle cx="${cx}" cy="${bodyTop + 16}" r="6" fill="#C9C3B8"/><text x="${cx}" y="${bodyTop - 8}" text-anchor="middle" font-size="11" fill="#66727F" font-family="Fira Sans">Frente (perno rey)</text>`
      : `<rect x="${cx - 70}" y="${bodyTop}" width="140" height="92" rx="14" fill="#fff" stroke="#C9C3B8" stroke-width="2"/>
         <rect x="${cx - 52}" y="${bodyTop + 10}" width="104" height="28" rx="5" fill="#EFECE5"/>
         <rect x="${cx - 26}" y="${bodyTop + 112}" width="52" height="${H - bodyTop - 150}" rx="4" fill="#fff" stroke="#C9C3B8" stroke-width="2"/>
         ${u.type === 'tracto' ? `<circle cx="${cx}" cy="${axleY0 + 188}" r="20" fill="none" stroke="#C9C3B8" stroke-width="2" stroke-dasharray="4 4"/><text x="${cx}" y="${axleY0 + 192}" text-anchor="middle" font-size="9" fill="#8D97A2" font-family="Fira Sans">5ª rueda</text>` : `<rect x="${cx - 70}" y="${bodyTop + 120}" width="140" height="${H - bodyTop - 160}" rx="6" fill="none" stroke="#D9D5CD" stroke-width="2" stroke-dasharray="6 5"/>`}
         <text x="${cx}" y="${bodyTop - 6}" text-anchor="middle" font-size="11" fill="#66727F" font-family="Fira Sans">Frente</text>`;
    const axles = [...new Set(positions.map((p) => p.y))].map((y) => `<line x1="${cx - 120}" x2="${cx + 120}" y1="${y + th / 2}" y2="${y + th / 2}" stroke="#18222B" stroke-width="5" stroke-linecap="round"/>`).join('');
    const tiresSvg = positions.map(({ p, x, y }) => {
      const t = tires.find((tt) => tt.pos === p);
      if (!t) return '';
      const st = NK.tireState(t);
      const sel = ui.tire === t.id;
      return `<g class="axle-tire ${sel ? 'is-sel' : ''}" data-tire="${t.id}" tabindex="0" role="button" aria-label="${NK.POS_NAME(p)}: ${t.marca} ${t.modelo}, ${F.n1(t.depth)} milímetros, ${st.label}">
        <rect class="t" x="${x}" y="${y}" width="${tw}" height="${th}" rx="5" fill="${st.color}"/>
        <path d="M${x + 6} ${y + 8} v${th - 16} M${x + 13} ${y + 8} v${th - 16} M${x + 20} ${y + 8} v${th - 16}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
        <text x="${x + tw / 2}" y="${y + th + 15}" text-anchor="middle" font-size="10.5" font-family="Fira Code" fill="#18222B" font-weight="600">${F.n1(t.depth)}</text>
      </g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Diagrama de llantas de ${u.id}">${body}${axles}${tiresSvg}</svg>`;
  }

  function tireSide(t) {
    if (!t) return `<div class="tire-card">${NK.empty('mouse-pointer-click', 'Seleccione una llanta', 'Toque cualquier llanta del diagrama para ver su detalle y su historial.')}</div>`;
    const st = NK.tireState(t);
    const ran = t.kmNow - t.kmInstall;
    const lifePct = Math.min(100, (ran / t.life) * 100);
    const nd = NK.NEW_DEPTH[t.kind], md = NK.MIN_DEPTH[t.kind];
    const treadPct = Math.max(0, ((t.depth - md) / (nd - md)) * 100);
    return `<div class="tire-card">
      <div class="tire-card__pos">${NK.POS_NAME(t.pos)} · ${t.kind === 'direccion' ? 'Dirección' : t.kind === 'traccion' ? 'Tracción' : 'Remolque'}</div>
      <h3>${t.marca} ${t.modelo}</h3>
      <p class="muted small mono">${t.serial} · ${t.medida}</p>
      <div class="depth-gauge"><div><span class="num mono">${F.n1(t.depth)}</span> <small>mm de dibujo</small></div>${NK.badge(st.label, st.tone)}</div>
      <div class="bar bar--lg ${st.tone === 'ok' ? 'bar--ok' : st.tone === 'warn' ? 'bar--warn' : 'bar--danger'}" role="img" aria-label="Dibujo restante ${Math.round(treadPct)} %"><span style="width:${treadPct}%"></span></div>
      <p class="muted xs" style="margin-top:6px">Nueva: ${nd} mm · Retiro: ${md} mm</p>
      <dl class="kv kv--1" style="margin:14px 0 0">
        <div><dt>Instalación</dt><dd>${F.date(t.installDate)}</dd></div>
        <div><dt>Km inicial</dt><dd class="mono">${F.n(t.kmInstall)}</dd></div>
        <div><dt>Km actual</dt><dd class="mono">${F.n(t.kmNow)}</dd></div>
        <div><dt>Kilómetros recorridos</dt><dd class="mono">${F.n(ran)}</dd></div>
        <div><dt>Vida útil consumida</dt><dd class="mono">${F.pct(lifePct)}</dd></div>
        <div><dt>Costo por km</dt><dd class="mono">${F.money2(t.cost / Math.max(ran, 1000))}</dd></div>
      </dl>
      <button class="btn btn--block" style="margin-top:14px" data-open-tire="${t.id}">${NK.icon('history')}Ver historial completo</button>
    </div>`;
  }

  NK.views.llantas = {
    title: 'Llantas',
    render(root, params) {
      const s = NK.store.state;
      const T = s.tires;
      if (params.get('f')) { ui.f = params.get('f'); ui.tab = 'montadas'; }
      const ranTotal = T.reduce((a, t) => a + (t.kmNow - t.kmInstall), 0);
      const avgLife = T.reduce((a, t) => a + Math.min(1, (t.kmNow - t.kmInstall) / t.life), 0) / T.length;
      const cpk = s.retired.reduce((a, t) => a + t.cost, 0) / s.retired.reduce((a, t) => a + t.kmRan, 0);
      const revisar = T.filter((t) => NK.tireState(t).key !== 'bien');
      const cambio = T.filter((t) => NK.tireState(t).key === 'cambio');
      const u = NK.store.unit(ui.unit);
      const uTires = T.filter((t) => t.unit === ui.unit);
      if (!ui.tire || !uTires.some((t) => t.id === ui.tire)) ui.tire = (uTires.find((t) => NK.tireState(t).key !== 'bien') || uTires[0]).id;

      root.innerHTML = `<div class="view">
        ${NK.pageHead({ eyebrow: 'Operación', title: 'Control de llantas', text: 'Ciclo de vida de cada llanta: instalación, rotaciones, reparaciones, desgaste y retiro. Las mediciones de profundidad determinan el estado.', actions: `<button class="btn" type="button" id="ll-measure">${NK.icon('ruler')}Registrar medición</button>` })}

        <div class="ledger ledger--5" style="margin-bottom:18px" id="ll-ledger">
          <div class="ledger__cell"><span class="ledger__label">${NK.icon('circle-dot')}Llantas montadas</span><span class="ledger__value"><span class="num mono">${T.length}</span></span><span class="ledger__ctx">en ${s.units.length} unidades</span></div>
          <div class="ledger__cell"><span class="ledger__label">${NK.icon('route')}Km recorridos</span><span class="ledger__value"><span class="num mono">${F.n(ranTotal / T.length / 1000)}</span><span class="unit">mil km</span></span><span class="ledger__ctx">promedio por llanta desde su instalación</span></div>
          <div class="ledger__cell"><span class="ledger__label">${NK.icon('hourglass')}Vida útil consumida</span><span class="ledger__value"><span class="num mono">${F.pct(avgLife * 100)}</span></span><div class="bar bar--ink"><span style="width:${avgLife * 100}%"></span></div><span class="ledger__ctx">contra vida estimada por modelo</span></div>
          <div class="ledger__cell"><span class="ledger__label">${NK.icon('coins')}Costo por km</span><span class="ledger__value"><span class="num mono">${F.money2(cpk * 100)}</span><span class="unit">por 100 km</span></span><span class="ledger__ctx">calculado con llantas retiradas</span></div>
          <button type="button" class="ledger__cell" style="border:0;background:none;text-align:left;cursor:pointer" id="ll-goto-rev"><span class="ledger__label">${NK.icon('triangle-alert')}Próximas a revisión</span><span class="ledger__value"><span class="num mono" style="color:var(--warn)">${revisar.length}</span><span class="unit">· ${cambio.length} cambio</span></span><span class="ledger__ctx">${s.retired.length} retiradas en 12 meses</span></button>
        </div>

        <div class="tire-layout">
          <section class="panel">
            <div class="panel__head" style="padding-bottom:6px"><div><h2>Unidades</h2><p class="panel__sub">Puntos: llantas por revisar</p></div></div>
            <div class="unit-picker" role="group" aria-label="Seleccionar unidad">
              ${['tracto', 'torton', 'tolva'].map((tp) => `<div class="unit-picker__group">${NK.TYPE_LABEL[tp]}s</div>` + s.units.filter((x) => x.type === tp).map((x) => {
                const tt = T.filter((t) => t.unit === x.id);
                const bad = tt.filter((t) => NK.tireState(t).key !== 'bien');
                return `<button type="button" data-unit="${x.id}" aria-pressed="${x.id === ui.unit}"><b>${x.id}</b><small>${tt.length} llantas${bad.length ? ` · ${bad.length} por revisar` : ''}</small><span class="dots">${bad.slice(0, 4).map((t) => `<i style="background:${NK.tireState(t).color}"></i>`).join('')}</span></button>`;
              }).join('')).join('')}
            </div>
          </section>

          <section class="panel">
            <div class="panel__head"><div><h2><span class="mono">${u.id}</span> · ${u.marca} ${u.modelo}</h2><p class="panel__sub">Vista superior. El número bajo cada llanta es la profundidad de dibujo en milímetros.</p></div><button class="link-btn" data-unitcard="${u.id}">Ficha de unidad ${NK.icon('arrow-up-right')}</button></div>
            <div class="panel__body">
              <div class="axle-stage">${axleSvg(u, uTires)}</div>
              <div class="axle-legend"><span><i style="background:#5AAE7E"></i>Buen estado</span><span><i style="background:#E3A93A"></i>Revisar pronto</span><span><i style="background:#D9534A"></i>Cambio requerido</span></div>
            </div>
          </section>

          <section class="panel tire-side" id="tire-side">${tireSide(T.find((t) => t.id === ui.tire))}</section>
        </div>

        <div class="tabs" role="tablist" style="margin-top:26px">
          <button role="tab" type="button" data-tab="montadas" aria-selected="${ui.tab === 'montadas'}">Todas las llantas montadas<span class="count">${T.length}</span></button>
          <button role="tab" type="button" data-tab="retiradas" aria-selected="${ui.tab === 'retiradas'}">Llantas retiradas<span class="count">${s.retired.length}</span></button>
        </div>
        <section class="panel" id="ll-list"></section>
      </div>`;
      NK.icons();

      const drawList = () => {
        const box = root.querySelector('#ll-list');
        if (ui.tab === 'retiradas') {
          box.innerHTML = `<div class="table-wrap"><table class="table table--cards"><thead><tr><th>Fecha de retiro</th><th>Unidad / posición</th><th>Llanta</th><th class="right">Km recorridos</th><th class="right">Costo por km</th><th>Motivo</th></tr></thead><tbody>
            ${s.retired.map((t) => `<tr class="${t.reason.startsWith('Desgaste normal') ? '' : 'row-warn'}"><td class="td-main">${F.date(t.retDate)}</td><td data-label="Unidad"><span class="mono">${t.unit}</span> <span class="muted">${NK.POS_NAME(t.pos)}</span></td><td data-label="Llanta">${t.marca} ${t.modelo}<span class="cell-sub mono">${t.serial}</span></td><td data-label="Km recorridos" class="right mono">${F.n(t.kmRan)}</td><td data-label="Costo por km" class="right mono">${F.money2(t.cost / t.kmRan)}</td><td data-label="Motivo">${t.reason.startsWith('Desgaste normal') ? NK.badge(t.reason, 'muted', 'badge--plain') : NK.badge(t.reason, 'warn')}</td></tr>`).join('')}
          </tbody></table></div>`;
          NK.icons();
          return;
        }
        const q = ui.q.toLowerCase();
        const list = NK.sortBy(T.filter((t) => (ui.f === 'todas' || NK.tireState(t).key === ui.f || (ui.f === 'revisar' && NK.tireState(t).key === 'cambio')) && (!q || [t.unit, t.marca, t.modelo, t.serial].join(' ').toLowerCase().includes(q))), (t) => t.depth, 'asc');
        const pages = Math.max(1, Math.ceil(list.length / PAGE));
        ui.page = Math.min(ui.page, pages - 1);
        const slice = list.slice(ui.page * PAGE, ui.page * PAGE + PAGE);
        box.innerHTML = `<div class="toolbar">
            <div class="field-search">${NK.icon('search')}<input type="search" id="ll-q" placeholder="Buscar unidad, marca o número de serie" value="${esc(ui.q)}" aria-label="Buscar llanta"></div>
            <div class="seg" role="group" aria-label="Filtrar por estado">${[['todas', 'Todas'], ['revisar', 'Por revisar'], ['cambio', 'Cambio requerido'], ['bien', 'Buen estado']].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${ui.f === k}">${l}</button>`).join('')}</div>
            <span class="grow"></span><span class="muted small">${list.length} llantas · ordenadas por menor profundidad</span>
          </div>
          <div class="table-wrap"><table class="table table--cards"><thead><tr><th>Unidad</th><th>Posición</th><th>Marca y modelo</th><th>Medida</th><th>Instalación</th><th class="right">Km inicial</th><th class="right">Km actual</th><th>Profundidad</th><th>Estado</th></tr></thead><tbody>
          ${slice.map((t) => { const st = NK.tireState(t); const pct = Math.max(0, ((t.depth - NK.MIN_DEPTH[t.kind]) / (NK.NEW_DEPTH[t.kind] - NK.MIN_DEPTH[t.kind])) * 100); return `<tr class="is-click ${st.key === 'cambio' ? 'row-alert' : ''}" data-tire="${t.id}" tabindex="0">
            <td class="td-main"><span class="unit-id">${t.unit}</span><span class="cell-sub mono">${t.serial}</span></td>
            <td data-label="Posición">${NK.POS_NAME(t.pos)}</td>
            <td data-label="Marca y modelo">${t.marca} <span class="muted">${t.modelo}</span></td>
            <td data-label="Medida" class="mono">${t.medida}</td>
            <td data-label="Instalación">${F.date(t.installDate)}</td>
            <td data-label="Km inicial" class="right mono">${F.n(t.kmInstall)}</td>
            <td data-label="Km actual" class="right mono">${F.n(t.kmNow)}</td>
            <td data-label="Profundidad"><div class="tread"><span class="mono">${F.n1(t.depth)} mm</span><span class="tread__bar"><span style="width:${pct}%;background:${st.color}"></span></span></div></td>
            <td data-label="Estado">${NK.badge(st.label, st.tone)}</td>
          </tr>`; }).join('')}
          </tbody></table></div>
          <div class="pager"><span>Página ${ui.page + 1} de ${pages}</span><div class="btn-group"><button class="btn btn--sm" data-pg="-1" ${ui.page === 0 ? 'disabled' : ''}>${NK.icon('chevron-left')}Anterior</button><button class="btn btn--sm" data-pg="1" ${ui.page >= pages - 1 ? 'disabled' : ''}>Siguiente${NK.icon('chevron-right')}</button></div></div>`;
        NK.icons();
        box.querySelector('#ll-q').addEventListener('input', (e) => { ui.q = e.target.value; ui.page = 0; drawList(); const n = box.querySelector('#ll-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
        box.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { ui.f = b.dataset.f; ui.page = 0; drawList(); }));
        box.querySelectorAll('[data-pg]').forEach((b) => b.addEventListener('click', () => { ui.page += Number(b.dataset.pg); drawList(); }));
        box.querySelectorAll('tr[data-tire]').forEach((r) => { r.addEventListener('click', () => NK.openTire(r.dataset.tire)); r.addEventListener('keydown', (e) => { if (e.key === 'Enter') NK.openTire(r.dataset.tire); }); });
      };
      drawList();

      const bindSide = () => { const b = root.querySelector('[data-open-tire]'); if (b) b.addEventListener('click', () => NK.openTire(b.dataset.openTire)); };
      bindSide();
      root.querySelectorAll('.axle-tire').forEach((g) => {
        const sel = () => {
          ui.tire = g.dataset.tire;
          root.querySelectorAll('.axle-tire').forEach((x) => x.classList.toggle('is-sel', x === g));
          NK.mount(root.querySelector('#tire-side'), tireSide(T.find((t) => t.id === ui.tire)));
          bindSide();
          if (window.innerWidth < 1360) root.querySelector('#tire-side').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        g.addEventListener('click', sel);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } });
      });
      root.querySelectorAll('.unit-picker [data-unit]').forEach((b) => b.addEventListener('click', () => { ui.unit = b.dataset.unit; ui.tire = null; const y = window.scrollY; NK.refresh(); window.scrollTo(0, y); }));
      root.querySelector('[data-unitcard]').addEventListener('click', (e) => NK.openUnit(e.currentTarget.dataset.unitcard, 'llantas'));
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.tab; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b)); drawList(); }));
      root.querySelector('#ll-goto-rev').addEventListener('click', () => { ui.tab = 'montadas'; ui.f = 'revisar'; ui.page = 0; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x.dataset.tab === 'montadas')); drawList(); root.querySelector('#ll-list').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      root.querySelector('#ll-measure').addEventListener('click', () => measure(ui.tire));
    },
  };

  function measure(tireId) {
    const s = NK.store.state;
    const t = s.tires.find((x) => x.id === tireId);
    const m = NK.modal({
      title: 'Registrar medición', icon: 'ruler', size: 'sm', sub: t ? `${t.unit} · ${NK.POS_NAME(t.pos)} · ${t.marca} ${t.modelo}` : '',
      body: `<form class="form" novalidate>
        <div class="field"><label for="ms-d">Profundidad de dibujo (mm)</label><input id="ms-d" type="number" step="0.1" min="0.5" max="25" value="${t ? t.depth : ''}" data-required inputmode="decimal">${NK.fieldErr('Indique la profundidad medida')}<span class="help">Medir en la ranura principal, en tres puntos, y registrar el menor valor.</span></div>
        <div class="field"><label for="ms-p">Presión (psi) <span class="opt">(opcional)</span></label><input id="ms-p" type="number" value="${t ? t.pressure : 105}" inputmode="numeric"></div>
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn--dark" id="ms-save">${NK.icon('check')}Guardar medición</button>`,
    });
    m.el.querySelector('#ms-save').addEventListener('click', () => {
      if (!NK.validate(m.el.querySelector('form'))) return;
      const d = Math.round(Number(m.el.querySelector('#ms-d').value) * 10) / 10;
      t.depth = d; t.pressure = Number(m.el.querySelector('#ms-p').value) || t.pressure;
      t.hist.push({ type: 'medicion', date: new Date().toISOString(), km: t.kmNow, text: `Medición de profundidad: ${d} mm` });
      const st = NK.tireState(t);
      NK.store.log('ruler', st.tone === 'ok' ? 'ok' : 'warn', `Medición de llanta en <b>${t.unit}</b> (${NK.POS_NAME(t.pos)}): ${d} mm`);
      NK.store.save(); m.close();
      NK.toast('Medición registrada', `${t.unit} · ${NK.POS_NAME(t.pos)}: ${d} mm — ${st.label}.`, st.key === 'bien' ? 'ok' : 'warn');
      NK.refresh();
    });
  }

  NK.openTire = function (id) {
    const s = NK.store.state;
    const t = s.tires.find((x) => x.id === id);
    if (!t) return;
    const st = NK.tireState(t);
    const ran = t.kmNow - t.kmInstall;
    const ICON = { instalacion: ['circle-plus', 'brand'], rotacion: ['refresh-cw', 'info'], reparacion: ['wrench', 'warn'], medicion: ['ruler', 'ok'], retiro: ['circle-x', 'danger'] };
    const LBL = { instalacion: 'Instalación', rotacion: 'Rotación', reparacion: 'Reparación', medicion: 'Medición', retiro: 'Retiro' };
    const m = NK.modal({
      title: `${t.marca} ${t.modelo}`, icon: 'circle-dot', size: 'lg', sub: `${t.unit} · ${NK.POS_NAME(t.pos)} · serie ${t.serial} · ${t.medida}`,
      body: `<div class="unit-stats">
          <div><span>Profundidad</span><b>${F.n1(t.depth)} mm</b><small>${st.label}</small></div>
          <div><span>Km recorridos</span><b>${F.n(ran)}</b><small>desde ${F.n(t.kmInstall)}</small></div>
          <div><span>Vida útil estimada</span><b>${F.pct(Math.min(100, (ran / t.life) * 100))}</b><small>de ${F.km(t.life)}</small></div>
          <div><span>Costo por km</span><b>${F.money2(t.cost / Math.max(1000, ran))}</b><small>costo ${F.money(t.cost)}</small></div>
        </div>
        <div class="field"><span class="label">Historial de la llanta</span>
          <ul class="timeline" style="padding:0">${t.hist.slice().reverse().map((h) => `<li><span class="tl-ic tl-ic--${ICON[h.type][1]}">${NK.icon(ICON[h.type][0])}</span><div><p><b>${LBL[h.type]}</b> — ${esc(h.text)}</p><time>${F.date(h.date)} · ${F.km(h.km)}</time></div></li>`).join('')}</ul>
        </div>`,
      foot: `<button class="btn btn--danger" data-retire>${NK.icon('circle-x')}Registrar retiro</button><span class="spacer"></span><button class="btn" data-rot>${NK.icon('refresh-cw')}Registrar rotación</button><button class="btn" data-close>Cerrar</button>`,
    });
    m.el.querySelector('[data-rot]').addEventListener('click', () => {
      t.hist.push({ type: 'rotacion', date: new Date().toISOString(), km: t.kmNow, text: 'Rotación registrada desde la plataforma' });
      NK.store.log('refresh-cw', 'info', `Rotación de llanta registrada en <b>${t.unit}</b> (${NK.POS_NAME(t.pos)})`);
      NK.store.save(); m.close(); NK.toast('Rotación registrada', `${t.unit} · ${NK.POS_NAME(t.pos)}`); NK.refresh();
    });
    m.el.querySelector('[data-retire]').addEventListener('click', async () => {
      if (!(await NK.confirm({ title: 'Registrar retiro', text: `Se retirará la llanta ${t.serial} de ${t.unit} (${NK.POS_NAME(t.pos)}) y se instalará una llanta nueva de demostración en su lugar.`, ok: 'Registrar retiro', tone: 'danger', icon: 'circle-x' }))) return;
      s.retired.unshift({ id: 'LL-R' + Date.now(), serial: t.serial, unit: t.unit, pos: t.pos, marca: t.marca, modelo: t.modelo, medida: t.medida, retDate: new Date().toISOString(), kmRan: Math.max(ran, 1000), reason: t.depth <= NK.MIN_DEPTH[t.kind] + 0.5 ? 'Desgaste normal (límite legal)' : 'Retiro preventivo', cost: t.cost, depth: t.depth });
      Object.assign(t, { serial: t.marca.slice(0, 2).toUpperCase() + Math.floor(1e6 + Math.random() * 9e6), installDate: new Date().toISOString(), kmInstall: t.kmNow, depth: NK.NEW_DEPTH[t.kind], hist: [{ type: 'instalacion', date: new Date().toISOString(), km: t.kmNow, text: `Instalada nueva en ${NK.POS_NAME(t.pos)}` }] });
      NK.store.log('circle-x', 'warn', `Retiro y reemplazo de llanta en <b>${t.unit}</b> (${NK.POS_NAME(t.pos)})`);
      NK.store.save(); m.close(); NK.toast('Retiro registrado', 'La llanta pasó a la lista de retiradas y la posición tiene una llanta nueva.'); NK.refresh();
    });
  };
})();
