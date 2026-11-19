/* INICIO — resumen de la operación */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }

  NK.views.inicio = {
    title: 'Inicio',
    render(root) {
      const s = NK.store.state;
      const U = s.units;
      const cnt = { disponible: 0, mantenimiento: 0, fuera: 0 };
      U.forEach((u) => cnt[u.status]++);
      const avail = (cnt.disponible / U.length) * 100;

      const upcoming = U.filter((u) => u.status !== 'fuera').map((u) => ({ u, svc: NK.unitSvc(u) })).filter((x) => x.svc.days <= 14).sort((a, b) => a.svc.remaining - b.svc.remaining);
      const in7 = upcoming.filter((x) => x.svc.days <= 7);
      const overdue = upcoming.filter((x) => x.svc.remaining < 0);
      const reqOpen = s.requests.filter((r) => ['enviada', 'revision', 'autorizada', 'compra'].includes(r.status));
      const reqWait = s.requests.filter((r) => ['enviada', 'revision'].includes(r.status));
      const low = s.inventory.filter((i) => ['low', 'out'].includes(NK.stockState(i).key));
      const S = NK.series;
      const last = S.preventivo.length - 1;
      const gastoMes = S.preventivo[last] + S.correctivo[last] + S.llantas[last];
      const presupMes = (NK.budget[0].annual + NK.budget[1].annual + NK.budget[2].annual) / 12;
      const gastoPrev = S.preventivo[last - 1] + S.correctivo[last - 1] + S.llantas[last - 1];
      const dGasto = ((gastoMes - gastoPrev) / gastoPrev) * 100;
      const kmplNow = S.kmpl[last], kmplPrev = S.kmpl[last - 1];
      const docsSoon = s.docs.filter((d) => F.days(d.expires) <= 15);
      const docsExpired = docsSoon.filter((d) => F.days(d.expires) < 0);
      const tiresCrit = s.tires.filter((t) => NK.tireState(t).key === 'cambio');
      const otWait = s.orders.filter((o) => o.status === 'espera');

      const alerts = [];
      U.filter((u) => u.status === 'fuera').forEach((u) => alerts.push({ tone: 'danger', icon: 'octagon-alert', title: `${u.id} fuera de servicio`, text: u.outReason, go: `#/flotilla?u=${u.id}` }));
      if (overdue.length) alerts.push({ tone: 'danger', icon: 'calendar-x', title: `${overdue.length} servicios preventivos vencidos`, text: overdue.map((x) => x.u.id).join(', ') + ' superaron su kilometraje.', go: '#/taller?tab=programa' });
      if (low.length) alerts.push({ tone: 'warn', icon: 'package-x', title: `${low.length} artículos bajo mínimo en almacén`, text: low.slice(0, 3).map((i) => i.desc.split(' ').slice(0, 3).join(' ')).join(' · ') + (low.length > 3 ? '…' : ''), go: '#/inventario?low=1' });
      if (otWait.length) alerts.push({ tone: 'warn', icon: 'package-search', title: `${otWait.length} órdenes detenidas por material`, text: otWait.map((o) => o.unit).join(', '), go: '#/taller' });
      if (tiresCrit.length) alerts.push({ tone: 'warn', icon: 'circle-dot', title: `${tiresCrit.length} llantas requieren cambio`, text: 'Profundidad de dibujo en el límite.', go: '#/llantas?f=cambio' });
      if (docsSoon.length) alerts.push({ tone: docsExpired.length ? 'danger' : 'info', icon: 'file-warning', title: `${docsSoon.length} documentos vencidos o por vencer`, text: docsExpired.length ? `${docsExpired.length} ya vencido(s). Revise Administración.` : 'En los próximos 15 días.', go: '#/administracion?tab=docs' });

      const groups = [
        { type: 'tracto', label: 'Tractocamiones' },
        { type: 'torton', label: 'Camiones torton' },
        { type: 'tolva', label: 'Remolques tolva' },
      ];

      const now = new Date();
      root.innerHTML = `
      <div class="view">
        <div class="welcome">
          <div class="welcome__left">
            <img src="assets/logo-nutrikowi.png" alt="Nutrikowi" class="welcome__logo" width="1000" height="150">
            <div>
              <h1>${greeting()}, Daniel</h1>
              <p>Resumen de logística y taller · ${(() => { const t = F.dateL(now); return t[0].toUpperCase() + t.slice(1); })()}</p>
            </div>
          </div>
          <div class="welcome__right">
            <a class="btn" href="#/solicitudes?new=1">${NK.icon('clipboard-plus')}Solicitar material</a>
            <a class="btn btn--primary" href="#/taller?new=1">${NK.icon('plus')}Nueva orden de trabajo</a>
          </div>
        </div>

        <section class="hero" aria-labelledby="hero-title">
          <div class="hero__summary">
            <div class="hero__label"><span class="live" aria-hidden="true"></span><span id="hero-title">Estado de la flotilla</span></div>
            <div class="hero__big"><span class="num mono">${U.length}</span><span>unidades registradas</span></div>
            <p class="hero__avail"><b>${F.pct(avail)}</b> de la flotilla está disponible para operar hoy.</p>
            <div class="hero__stack" role="img" aria-label="${cnt.disponible} disponibles, ${cnt.mantenimiento} en mantenimiento, ${cnt.fuera} fuera de servicio">
              <span style="flex-grow:${cnt.disponible};background:${NK.UNIT_STATUS.disponible.color}"></span>
              <span style="flex-grow:${cnt.mantenimiento};background:${NK.UNIT_STATUS.mantenimiento.color}"></span>
              <span style="flex-grow:${cnt.fuera};background:${NK.UNIT_STATUS.fuera.color}"></span>
            </div>
            <div class="hero__facts">
              <div><b>${s.orders.filter((o) => o.status !== 'terminado').length}</b><span>órdenes abiertas en taller</span></div>
              <div><b style="${overdue.length ? 'color:#F2A091' : ''}">${overdue.length}</b><span>servicios vencidos</span></div>
              <div><b>${F.n(U.reduce((a, u) => a + (u.status === 'disponible' && u.type !== 'tolva' ? u.daily : 0), 0))}</b><span>km programados hoy</span></div>
            </div>
            <div class="hero__legend">
              ${['disponible', 'mantenimiento', 'fuera'].map((k) => `
                <button type="button" data-hl="${k}" aria-label="Resaltar unidades: ${NK.UNIT_STATUS[k].label}">
                  <span class="sw" style="background:${NK.UNIT_STATUS[k].color}"></span>
                  <span>${NK.UNIT_STATUS[k].label}</span>
                  <span class="num mono">${cnt[k]}</span>
                  <span class="pct">${F.pct((cnt[k] / U.length) * 100)}</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="hero__fleet">
            <div class="hero__fleet-head">
              <div>
                <h2>Mapa de unidades</h2>
                <p>Seleccione una unidad para ver su ficha. La franja superior indica su estado.</p>
              </div>
              <a class="link-btn" href="#/flotilla" style="color:#C9D6E0">Ver flotilla completa ${NK.icon('arrow-right')}</a>
            </div>
            <div class="fleet-groups">
              ${groups.map((g) => {
                const list = U.filter((u) => u.type === g.type);
                return `<div>
                  <div class="fleet-group__label"><b>${g.label}</b><span>${list.length} unidades</span></div>
                  <div class="fleet-grid">
                    ${list.map((u) => {
                      const st = NK.UNIT_STATUS[u.status];
                      const svc = NK.unitSvc(u);
                      const flag = u.status === 'disponible' && svc.remaining < 0 ? NK.icon('calendar-x') : '';
                      return `<button type="button" class="unit-tile" data-unit="${u.id}" data-st="${u.status}" style="--tile:${st.color}" aria-label="${u.id}, ${u.marca} ${u.modelo}, ${st.label}${flag ? ', servicio vencido' : ''}">
                        <span class="id">${u.id}</span><span class="st">${u.status === 'disponible' ? (flag ? 'Servicio vencido' : 'Disponible') : u.status === 'mantenimiento' ? 'En taller' : 'Fuera de servicio'}</span>${flag}
                      </button>`;
                    }).join('')}
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </section>

        <div class="ledger" style="margin-top:18px" role="list">
          <a class="ledger__cell" href="#/taller?tab=programa" role="listitem">
            <span class="ledger__label">${NK.icon('calendar-clock')}Mantenimientos próximos</span>
            <span class="ledger__value"><span class="num mono">${in7.length}</span><span class="unit">en los próximos 7 días</span></span>
            <span class="ledger__ctx">${overdue.length ? `<b style="color:var(--danger)">${overdue.length} vencidos</b> por kilometraje. ` : ''}${upcoming.length} programados en 14 días.</span>
          </a>
          <a class="ledger__cell" href="#/solicitudes" role="listitem">
            <span class="ledger__label">${NK.icon('clipboard-list')}Solicitudes pendientes</span>
            <span class="ledger__value"><span class="num mono">${reqOpen.length}</span><span class="unit">abiertas con Compras</span></span>
            <span class="ledger__ctx"><b>${reqWait.length}</b> esperan respuesta de Compras; ${reqOpen.length - reqWait.length} ya autorizadas o en compra.</span>
          </a>
          <a class="ledger__cell" href="#/reportes" role="listitem">
            <span class="ledger__label">${NK.icon('wallet')}Gasto de taller y llantas · ${NK.MES_L[now.getMonth()]}</span>
            <span class="ledger__value"><span class="num mono">${F.moneyK(gastoMes)}</span><span class="delta ${dGasto > 0 ? 'delta--up-bad' : 'delta--down-good'}">${NK.icon(dGasto > 0 ? 'arrow-up-right' : 'arrow-down-right')}${F.n1(Math.abs(dGasto))} %</span></span>
            <div class="bar ${gastoMes > presupMes ? 'bar--danger' : 'bar--ink'}" style="margin:4px 0 2px" role="img" aria-label="${F.pct((gastoMes / presupMes) * 100)} del presupuesto mensual"><span style="width:${Math.min(100, (gastoMes / presupMes) * 100)}%"></span></div>
            <span class="ledger__ctx"><b>${F.pct((gastoMes / presupMes) * 100)}</b> del presupuesto mensual (${F.moneyK(presupMes)}). Variación contra el mes anterior.</span>
          </a>
          <a class="ledger__cell" href="#/reportes" role="listitem">
            <span class="ledger__label">${NK.icon('fuel')}Rendimiento de combustible</span>
            <span class="ledger__value"><span class="num mono">${F.n2(kmplNow)}</span><span class="unit">km por litro</span><span class="delta ${kmplNow >= kmplPrev ? 'delta--up-good' : 'delta--down-bad'}">${NK.icon(kmplNow >= kmplPrev ? 'arrow-up-right' : 'arrow-down-right')}${F.n2(Math.abs(kmplNow - kmplPrev))}</span></span>
            <span class="ledger__ctx">Promedio de la flotilla motriz este mes: <b>${F.n(S.combustibleL[last])} L</b> para ${F.n(S.km[last])} km recorridos.</span>
          </a>
        </div>

        <div class="grid g-12" style="margin-top:18px">
          <section class="panel panel--fill span-8">
            <div class="panel__head">
              <div>
                <h2>Evolución de costos</h2>
                <p class="panel__sub">Gasto mensual de mantenimiento y llantas, últimos 12 meses. Combustible se analiza por separado.</p>
              </div>
              <div class="chart-legend">
                <span><i style="background:${NK.C.steel}"></i>Preventivo</span>
                <span><i style="background:${NK.C.brand}"></i>Correctivo</span>
                <span><i style="background:${NK.C.sand}"></i>Llantas</span>
              </div>
            </div>
            <div class="panel__body">
              <div class="chart-box chart-box--lg"><canvas id="ch-costs" role="img" aria-label="Gráfico de barras apiladas de costos mensuales"></canvas></div>
              <p class="chart-note">${NK.icon('info')}<span>El <b>mantenimiento correctivo</b> creció en los últimos tres meses, principalmente por frenos en tractocamiones 2018–2019.</span></p>
            </div>
          </section>

          <section class="panel span-4">
            <div class="panel__head">
              <div><h2>Requiere atención</h2><p class="panel__sub">Ordenado por impacto en la operación</p></div>
              <span class="badge badge--danger badge--plain mono">${alerts.length}</span>
            </div>
            <ul class="alerts" style="margin-top:10px">
              ${alerts.map((a) => `<li class="alert-item alert-item--${a.tone}">
                <span class="alert-item__ic">${NK.icon(a.icon)}</span>
                <div><strong>${esc(a.title)}</strong><span>${esc(a.text)}</span></div>
                <a class="icon-btn" href="${a.go}" aria-label="Ver: ${esc(a.title)}">${NK.icon('chevron-right')}</a>
              </li>`).join('')}
            </ul>
          </section>

          <section class="panel span-6">
            <div class="panel__head">
              <div><h2>Comparativo de mantenimiento</h2><p class="panel__sub">Servicios realizados por mes: preventivos contra correctivos</p></div>
              <div class="chart-legend"><span><i style="background:${NK.C.steel}"></i>Preventivos</span><span><i style="background:${NK.C.brand}"></i>Correctivos</span></div>
            </div>
            <div class="panel__body">
              <div class="chart-box"><canvas id="ch-mtto" role="img" aria-label="Gráfico de barras de mantenimientos preventivos y correctivos"></canvas></div>
              <p class="chart-note">${NK.icon('target')}<span>Meta: al menos <b>60 %</b> de los servicios deben ser preventivos. Este mes: <b>${F.pct((S.mttoPrev[last] / (S.mttoPrev[last] + S.mttoCorr[last])) * 100)}</b>.</span></p>
            </div>
          </section>

          <section class="panel span-6">
            <div class="panel__head">
              <div><h2>Consumo de combustible</h2><p class="panel__sub">Litros cargados por mes y rendimiento promedio (km/L)</p></div>
              <div class="chart-legend"><span><i style="background:#D5CFC4"></i>Litros</span><span><i class="line" style="background:${NK.C.ink}"></i>km/L</span></div>
            </div>
            <div class="panel__body">
              <div class="chart-box"><canvas id="ch-fuel" role="img" aria-label="Gráfico de litros de diésel y rendimiento por mes"></canvas></div>
              <p class="chart-note">${NK.icon('fuel')}<span>Gasto de diésel del mes: <b>${F.moneyK(S.combustible[last])}</b> a un precio promedio de ${F.money2(S.precioDiesel[last])} por litro.</span></p>
            </div>
          </section>

          <section class="panel span-7">
            <div class="panel__head">
              <div><h2>Próximos mantenimientos</h2><p class="panel__sub">Estimados por kilometraje promedio diario de cada unidad</p></div>
              <a class="link-btn" href="#/taller?tab=programa">Ver programa ${NK.icon('arrow-right')}</a>
            </div>
            <ul class="upcoming" style="margin-top:10px">
              ${upcoming.slice(0, 6).map(({ u, svc }) => `
                <li data-unit="${u.id}" tabindex="0" role="button" aria-label="Abrir ficha de ${u.id}">
                  <span class="when ${svc.remaining < 0 ? 'when--late' : svc.days <= 3 ? 'when--soon' : ''}">${svc.remaining < 0 ? `<b>!</b><small>vencido</small>` : `<b>${Math.max(0, svc.days)}</b><small>${svc.days === 1 ? 'día' : 'días'}</small>`}</span>
                  <div>
                    <strong><span class="mono">${u.id}</span> · ${u.type === 'tolva' ? 'Preventivo de tolva' : svc.remaining < 0 || u.lastSvc.type === 'Preventivo A' ? 'Preventivo B' : 'Preventivo A'}</strong>
                    <div class="meta">${u.marca} ${u.modelo} · ${svc.remaining < 0 ? `excedido por ${F.km(-svc.remaining)}` : `faltan ${F.km(svc.remaining)}`}</div>
                  </div>
                  ${u.status === 'mantenimiento' ? NK.badge('En taller', 'info') : svc.remaining < 0 ? NK.badge('Vencido', 'danger') : NK.badge(F.dateS(svc.date), 'muted', 'badge--plain')}
                </li>`).join('')}
            </ul>
          </section>

          <section class="panel span-5">
            <div class="panel__head"><div><h2>Actividad reciente</h2><p class="panel__sub">Movimientos de taller, almacén y compras</p></div></div>
            <ul class="timeline">
              ${s.activity.slice(0, 6).map((a) => `<li><span class="tl-ic tl-ic--${a.tone}">${NK.icon(a.icon)}</span><div><p>${a.text}</p><time datetime="${a.at}">${F.rel(a.at)}</time></div></li>`).join('')}
            </ul>
          </section>
        </div>
      </div>`;

      NK.icons();
      // Interacciones
      root.querySelectorAll('[data-unit]').forEach((el) => {
        const go = () => NK.openUnit(el.dataset.unit);
        el.addEventListener('click', go);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && el.tagName === 'LI') go(); });
      });
      let hl = null;
      root.querySelectorAll('[data-hl]').forEach((b) => b.addEventListener('click', () => {
        hl = hl === b.dataset.hl ? null : b.dataset.hl;
        root.querySelectorAll('.unit-tile').forEach((t) => t.classList.toggle('is-dim', !!hl && t.dataset.st !== hl));
        root.querySelectorAll('[data-hl]').forEach((x) => x.style.background = hl === x.dataset.hl ? 'rgba(255,255,255,.08)' : '');
      }));

      // Gráficos
      const C = NK.C, L = NK.monthLabels();
      NK.chart(document.getElementById('ch-costs'), {
        type: 'bar',
        data: { labels: L, datasets: [
          { label: 'Preventivo', data: S.preventivo, backgroundColor: C.steel, stack: 's', maxBarThickness: 34 },
          { label: 'Correctivo', data: S.correctivo, backgroundColor: C.brand, stack: 's', maxBarThickness: 34 },
          { label: 'Llantas', data: S.llantas, backgroundColor: C.sand, stack: 's', maxBarThickness: 34 },
        ] },
        options: { scales: { x: { stacked: true }, y: { stacked: true, ...NK.axisMoney } }, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${F.money(c.raw)}`, footer: (items) => 'Total: ' + F.money(items.reduce((a, b) => a + b.raw, 0)) } } } },
      });
      NK.chart(document.getElementById('ch-mtto'), {
        type: 'bar',
        data: { labels: L.slice(-6), datasets: [
          { label: 'Preventivos', data: S.mttoPrev.slice(-6), backgroundColor: C.steel, maxBarThickness: 22 },
          { label: 'Correctivos', data: S.mttoCorr.slice(-6), backgroundColor: C.brand, maxBarThickness: 22 },
        ] },
        options: { scales: { y: { grid: { color: '#EFEBE4' }, ticks: { padding: 8, precision: 0 } } }, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw} servicios` } } } },
      });
      NK.chart(document.getElementById('ch-fuel'), {
        type: 'bar',
        data: { labels: L, datasets: [
          { type: 'line', label: 'km/L', data: S.kmpl, borderColor: C.ink, borderWidth: 2, yAxisID: 'y2', pointRadius: 2.5, pointBackgroundColor: C.ink },
          { label: 'Litros', data: S.combustibleL, backgroundColor: '#D5CFC4', hoverBackgroundColor: '#BDB5A7', maxBarThickness: 26, yAxisID: 'y' },
        ] },
        options: { scales: { y: { grid: { color: '#EFEBE4' }, ticks: { callback: (v) => F.n(v / 1000) + ' mil L', padding: 8 } }, y2: { position: 'right', grid: { display: false }, border: { display: false }, min: 2.4, max: 3.4, ticks: { callback: (v) => F.n2(v), padding: 8 } } }, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label === 'Litros' ? ` Litros: ${F.n(c.raw)}` : ` Rendimiento: ${F.n2(c.raw)} km/L` } } } },
      });
    },
  };
})();
