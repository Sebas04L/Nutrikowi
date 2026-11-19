/* REPORTES Y ANÁLISIS */
(function () {
  const NK = window.NK, F = NK.fmt;
  const ui = { period: 12, unit: 'todas', gasto: 'todos', cat: 'todas', estado: 'todos' };

  function selection(s) {
    let units = s.units;
    if (ui.unit.startsWith('tipo:')) units = units.filter((u) => u.type === ui.unit.slice(5));
    else if (ui.unit !== 'todas') units = units.filter((u) => u.id === ui.unit);
    if (ui.estado !== 'todos') units = units.filter((u) => u.status === ui.estado);
    return units;
  }

  NK.views.reportes = {
    title: 'Reportes',
    render(root) {
      const s = NK.store.state;
      root.innerHTML = `<div class="view">
        ${NK.pageHead({ eyebrow: 'Gestión', title: 'Reportes y análisis', text: 'Desempeño de Logística y Taller. Cada gráfico indica qué pregunta responde y la conclusión principal. Use los filtros para acotar el análisis.', actions: `<button class="btn" type="button" id="rp-print">${NK.icon('printer')}Imprimir</button><button class="btn btn--dark" type="button" id="rp-export">${NK.icon('file-down')}Exportar PDF</button>` })}
        <form class="filters" id="rp-filters" aria-label="Filtros del reporte">
          <div class="field"><label for="rp-period">Periodo</label><select class="select" id="rp-period"><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select></div>
          <div class="field"><label for="rp-unit">Unidad</label><select class="select" id="rp-unit"><option value="todas">Toda la flotilla</option><optgroup label="Por tipo">${Object.entries(NK.TYPE_LABEL).map(([k, v]) => `<option value="tipo:${k}">${v}s</option>`).join('')}</optgroup><optgroup label="Unidad específica">${s.units.map((u) => `<option value="${u.id}">${u.id} · ${u.marca}</option>`).join('')}</optgroup></select></div>
          <div class="field"><label for="rp-gasto">Tipo de gasto</label><select class="select" id="rp-gasto"><option value="todos">Todos</option><option value="mtto">Mantenimiento</option><option value="llantas">Llantas</option><option value="comb">Combustible</option></select></div>
          <div class="field"><label for="rp-cat">Categoría</label><select class="select" id="rp-cat"><option value="todas">Todas</option><option value="Preventivo">Preventivo</option><option value="Correctivo">Correctivo</option></select></div>
          <div class="field"><label for="rp-estado">Estado de unidad</label><select class="select" id="rp-estado"><option value="todos">Todos</option><option value="disponible">Disponible</option><option value="mantenimiento">En mantenimiento</option><option value="fuera">Fuera de servicio</option></select></div>
          <span class="grow"></span>
          <button type="button" class="btn btn--ghost btn--sm" id="rp-reset">${NK.icon('rotate-ccw')}Limpiar</button>
        </form>
        <div id="rp-body"></div>
      </div>`;
      NK.icons();
      const form = root.querySelector('#rp-filters');
      const map = { 'rp-period': 'period', 'rp-unit': 'unit', 'rp-gasto': 'gasto', 'rp-cat': 'cat', 'rp-estado': 'estado' };
      Object.entries(map).forEach(([id, k]) => { const el = form.querySelector('#' + id); el.value = String(ui[k]); el.addEventListener('change', () => { ui[k] = k === 'period' ? Number(el.value) : el.value; draw(root); }); });
      root.querySelector('#rp-reset').addEventListener('click', () => { Object.assign(ui, { period: 12, unit: 'todas', gasto: 'todos', cat: 'todas', estado: 'todos' }); Object.entries(map).forEach(([id, k]) => (form.querySelector('#' + id).value = String(ui[k]))); draw(root); });
      root.querySelector('#rp-export').addEventListener('click', () => NK.toast('Reporte en preparación', 'En la versión final se generará un PDF con los filtros aplicados.', 'info'));
      root.querySelector('#rp-print').addEventListener('click', () => window.print());
      draw(root);
    },
  };

  function draw(root) {
    NK.destroyCharts();
    const s = NK.store.state;
    const S = NK.series;
    const C = NK.C;
    const n = ui.period;
    const L = NK.monthLabels(n);
    const sel = selection(s);
    const motor = sel.filter((u) => u.type !== 'tolva');
    const fleetShare = sel.length / s.units.length;
    const motorShare = motor.length / s.units.filter((u) => u.type !== 'tolva').length;
    const sl = (arr, f = 1) => arr.slice(-n).map((v) => Math.round(v * f));
    const showM = ui.gasto === 'todos' || ui.gasto === 'mtto';
    const showT = ui.gasto === 'todos' || ui.gasto === 'llantas';
    const showC = ui.gasto === 'todos' || ui.gasto === 'comb';
    const showPrev = ui.cat !== 'Correctivo', showCorr = ui.cat !== 'Preventivo';

    const prev = sl(S.preventivo, fleetShare), corr = sl(S.correctivo, fleetShare), llan = sl(S.llantas, fleetShare);
    const litros = sl(S.combustibleL, motorShare), comb = sl(S.combustible, motorShare), km = sl(S.km, motorShare || fleetShare);
    const total = (showM ? (showPrev ? prev.reduce((a, b) => a + b, 0) : 0) + (showCorr ? corr.reduce((a, b) => a + b, 0) : 0) : 0) + (showT ? llan.reduce((a, b) => a + b, 0) : 0) + (showC ? comb.reduce((a, b) => a + b, 0) : 0);
    const kmTot = km.reduce((a, b) => a + b, 0);

    // Costos por unidad desde el historial real de servicios
    const since = Date.now() - n * 30.4 * 864e5;
    const perUnit = sel.map((u) => {
      const h = s.history.filter((x) => x.unit === u.id && new Date(x.date).getTime() >= since && (ui.cat === 'todas' || x.kind === ui.cat));
      const mt = showM ? h.filter((x) => x.kind !== 'Llantas').reduce((a, x) => a + x.cost, 0) : 0;
      const tl = showT ? s.tires.filter((t) => t.unit === u.id && new Date(t.installDate).getTime() >= since).reduce((a, t) => a + t.cost, 0) + h.filter((x) => x.kind === 'Llantas').reduce((a, x) => a + x.cost, 0) : 0;
      const fu = showC && u.kmpl ? (u.daily * 26 * n / u.kmpl) * 25.2 : 0;
      return { u, mt, tl, fu, total: mt + tl + fu, km: u.daily * 26 * n };
    }).sort((a, b) => b.total - a.total);
    const top = perUnit.slice(0, 10);

    const types = ['tracto', 'torton', 'tolva'].map((t) => { const rows = perUnit.filter((x) => x.u.type === t); const tot = rows.reduce((a, x) => a + x.total, 0); const k = rows.reduce((a, x) => a + x.km, 0); return { t, cpk: k ? tot / k : 0, n: rows.length }; }).filter((x) => x.n);

    const chips = [];
    if (ui.unit !== 'todas') chips.push(ui.unit.startsWith('tipo:') ? NK.TYPE_LABEL[ui.unit.slice(5)] + 's' : ui.unit);
    if (ui.gasto !== 'todos') chips.push({ mtto: 'Mantenimiento', llantas: 'Llantas', comb: 'Combustible' }[ui.gasto]);
    if (ui.cat !== 'todas') chips.push(ui.cat);
    if (ui.estado !== 'todos') chips.push(NK.UNIT_STATUS[ui.estado].label);

    const body = root.querySelector('#rp-body');
    if (!sel.length) { NK.mount(body, `<section class="panel">${NK.empty('filter-x', 'No hay unidades con esta combinación', 'Por ejemplo, la unidad elegida no tiene el estado seleccionado. Ajuste los filtros.')}</section>`); return; }

    const card = (id, span, title, q, legend, extra = '', insight = '', cls = '') => `<section class="panel report-card span-${span}">
      <div class="panel__head"><div><h2>${title}</h2><p class="q">${q}</p></div>${legend ? `<div class="chart-legend">${legend}</div>` : ''}</div>
      <div class="panel__body"><div class="chart-box ${cls}"><canvas id="${id}" role="img" aria-label="${title}"></canvas></div>${extra}${insight ? `<div class="insight">${NK.icon('lightbulb')}<span>${insight}</span></div>` : ''}</div>
    </section>`;
    const lg = (c, t, kind = '') => `<span><i class="${kind}" style="background:${c};border-color:${c}"></i>${t}</span>`;

    const last = (a) => a[a.length - 1];
    const avgArr = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const corrGrowth = (avgArr(corr.slice(-3)) / avgArr(S.correctivo.slice(0, 6).map((v) => v * fleetShare)) - 1) * 100;
    const disp = S.disponibilidad.slice(-n);
    const hx = S.horasExtra.slice(-n);

    let html = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
      <span class="muted small">Mostrando:</span><span class="tag">${n} meses</span><span class="tag">${sel.length} unidades</span>${chips.map((c) => `<span class="tag" style="background:var(--brand-50);color:var(--brand-700)">${c}</span>`).join('')}
      <span class="grow" style="flex:1"></span><span class="small">Gasto total del periodo: <b class="mono">${F.money(total)}</b>${kmTot ? ` · <b class="mono">${F.money2(total / kmTot)}</b> por km` : ''}</span>
    </div><div class="grid g-12">`;

    if (showM) html += card('r-mtto', 6, 'Gastos de mantenimiento', '¿Cuánto se gasta al mes en mantenimiento y de qué tipo?', (showPrev ? lg(C.steel, 'Preventivo') : '') + (showCorr ? lg(C.brand, 'Correctivo') : ''), '', `El correctivo de los últimos 3 meses está <b>${F.pct(corrGrowth)}</b> ${corrGrowth >= 0 ? 'por encima' : 'por debajo'} del promedio del primer semestre.`);
    if (showT) html += card('r-llan', 6, 'Gastos de llantas', '¿Cómo se comporta la compra y reparación de llantas?', lg(C.sand, 'Llantas') + lg(C.ink, 'Promedio', 'dash'), '', `Promedio mensual: <b>${F.money(avgArr(llan))}</b>. El pico de ${L[L.length - 2] || L[0]} corresponde a reemplazo de llantas de tracción.`);
    if (showC && motor.length) html += card('r-fuel', 6, 'Consumo de combustible', 'Litros de diésel por mes y rendimiento promedio', lg('#D5CFC4', 'Litros') + lg(C.ink, 'km/L', 'line'), '', `Rendimiento promedio del periodo: <b>${F.n2(avgArr(S.kmpl.slice(-n)))} km/L</b>. Gasto de diésel: <b>${F.money(comb.reduce((a, b) => a + b, 0))}</b>.`);
    html += card('r-unit', 6, 'Costo por unidad', `Las ${Math.min(10, top.length)} unidades con mayor gasto en el periodo`, (showM ? lg(C.steel, 'Mantenimiento') : '') + (showT ? lg(C.sand, 'Llantas') : '') + (showC && motor.length ? lg('#9AA6B0', 'Combustible (est.)') : ''), '', top[0] ? `<b>${top[0].u.id}</b> (${top[0].u.marca} ${top[0].u.year}) concentra el mayor gasto: ${F.money(top[0].total)}.` : '', 'chart-box--lg');
    html += card('r-cpk', 6, 'Costo por kilómetro', 'Costo total dividido entre kilómetros recorridos, por tipo de unidad', lg(C.ink, 'Costo por km'), '', 'El costo por km de los remolques no incluye combustible; se carga al tractocamión que los arrastra.');
    html += card('r-disp', 6, 'Disponibilidad de flotilla', 'Porcentaje promedio de unidades listas para operar', lg(C.steel, 'Disponibilidad', 'line') + lg(C.danger, 'Meta 90 %', 'dash'), '', `Último mes: <b>${F.pct(last(disp), 1)}</b>. ${last(disp) < 90 ? 'Por debajo de la meta por unidades fuera de servicio (T-107, TO-206, TV-308).' : 'Dentro de la meta.'}`);
    if (showM) html += card('r-count', 6, 'Mantenimientos realizados', 'Número de servicios por mes', (showPrev ? lg(C.steel, 'Preventivos') : '') + (showCorr ? lg(C.brand, 'Correctivos') : ''), '', `Total del periodo: <b>${(showPrev ? S.mttoPrev.slice(-n).reduce((a, b) => a + b, 0) : 0) + (showCorr ? S.mttoCorr.slice(-n).reduce((a, b) => a + b, 0) : 0)}</b> servicios.`);
    html += card('r-hx', 6, 'Horas extra del taller', 'Horas extra pagadas al personal del taller por mes', lg(C.brand, 'Horas extra'), '', `Las horas extra subieron a <b>${last(hx)} h</b> el último mes, ligado al aumento de correctivos.`);
    html += card('r-req', 6, 'Solicitudes de materiales', 'Solicitudes enviadas a Compras por mes y cuántas fueron rechazadas', lg(C.steel, 'Atendidas') + lg(C.danger, 'Rechazadas'), '', `Tasa de rechazo del periodo: <b>${F.pct((S.solicitudesRech.slice(-n).reduce((a, b) => a + b, 0) / S.solicitudes.slice(-n).reduce((a, b) => a + b, 0)) * 100)}</b>.`);
    html += `<section class="panel span-6"><div class="panel__head"><div><h2>Tendencias mensuales</h2><p class="q">Variación del último mes contra el promedio del periodo</p></div></div><div class="panel__body table-wrap" style="padding-top:8px">
      <table class="table table--compact trend-table"><thead><tr><th>Indicador</th><th class="right">Último mes</th><th class="right">Promedio</th><th class="right">Variación</th><th>Tendencia</th></tr></thead><tbody>
      ${[
        ['Mantenimiento', S.preventivo.map((v, i) => (v + S.correctivo[i]) * fleetShare), true, F.moneyK],
        ['Llantas', S.llantas.map((v) => v * fleetShare), true, F.moneyK],
        ['Combustible', S.combustible.map((v) => v * motorShare), true, F.moneyK],
        ['Rendimiento km/L', S.kmpl, false, F.n2],
        ['Disponibilidad', S.disponibilidad, false, (v) => F.pct(v, 1)],
        ['Horas extra', S.horasExtra, true, (v) => F.n(v) + ' h'],
      ].map(([name, arr, upBad, fmt], i) => { const a = arr.slice(-n); const lv = a[a.length - 1], av = avgArr(a); const d = ((lv - av) / av) * 100; const bad = upBad ? d > 2 : d < -2; const good = upBad ? d < -2 : d > 2; return `<tr><td>${name}</td><td class="right mono">${fmt(lv)}</td><td class="right mono muted">${fmt(av)}</td><td class="right"><span class="delta ${bad ? (d > 0 ? 'delta--up-bad' : 'delta--down-bad') : good ? (d > 0 ? 'delta--up-good' : 'delta--down-good') : 'delta--flat'}">${d >= 0 ? '+' : '−'}${F.n1(Math.abs(d))} %</span></td><td><canvas class="spark" id="sp-${i}" width="90" height="26" aria-hidden="true"></canvas></td></tr>`; }).join('')}
      </tbody></table></div></section>`;
    html += '</div>';
    NK.mount(body, html);

    const yMoney = { y: NK.axisMoney };
    const idx = { interaction: { mode: 'index', intersect: false } };
    const money = { plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${F.money(c.raw)}` } } } };
    const $ = (id) => document.getElementById(id);

    if ($('r-mtto')) NK.chart($('r-mtto'), { type: 'bar', data: { labels: L, datasets: [showPrev && { label: 'Preventivo', data: prev, backgroundColor: C.steel, stack: 'a', maxBarThickness: 28 }, showCorr && { label: 'Correctivo', data: corr, backgroundColor: C.brand, stack: 'a', maxBarThickness: 28 }].filter(Boolean) }, options: { scales: { x: { stacked: true }, y: { stacked: true, ...NK.axisMoney } }, ...idx, ...money } });
    if ($('r-llan')) { const av = avgArr(llan); NK.chart($('r-llan'), { type: 'bar', data: { labels: L, datasets: [{ type: 'line', label: 'Promedio', data: llan.map(() => av), borderColor: C.ink, borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 }, { label: 'Llantas', data: llan, backgroundColor: C.sand, maxBarThickness: 28 }] }, options: { scales: yMoney, ...idx, ...money } }); }
    if ($('r-fuel')) NK.chart($('r-fuel'), { type: 'bar', data: { labels: L, datasets: [{ type: 'line', label: 'km/L', data: S.kmpl.slice(-n), borderColor: C.ink, borderWidth: 2, pointRadius: 2.5, pointBackgroundColor: C.ink, yAxisID: 'y2' }, { label: 'Litros', data: litros, backgroundColor: '#D5CFC4', maxBarThickness: 28 }] }, options: { scales: { y: { grid: { color: '#EFEBE4' }, ticks: { callback: (v) => F.n(v / 1000) + ' mil L' } }, y2: { position: 'right', grid: { display: false }, border: { display: false }, min: 2.4, max: 3.4, ticks: { callback: (v) => F.n2(v) } } }, ...idx, plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label === 'Litros' ? ` Litros: ${F.n(c.raw)}` : ` ${F.n2(c.raw)} km/L` } } } } });
    NK.chart($('r-unit'), { type: 'bar', data: { labels: top.map((x) => x.u.id), datasets: [showM && { label: 'Mantenimiento', data: top.map((x) => x.mt), backgroundColor: C.steel }, showT && { label: 'Llantas', data: top.map((x) => x.tl), backgroundColor: C.sand }, showC && motor.length && { label: 'Combustible (est.)', data: top.map((x) => Math.round(x.fu)), backgroundColor: '#9AA6B0' }].filter(Boolean) }, options: { indexAxis: 'y', scales: { x: { stacked: true, ...NK.axisMoney, grid: { color: '#EFEBE4' } }, y: { stacked: true, grid: { display: false }, ticks: { font: { family: '"Fira Code", monospace', size: 12 } } } }, ...idx, ...money, datasets: { bar: { maxBarThickness: 18 } } } });
    NK.chart($('r-cpk'), { type: 'bar', data: { labels: types.map((t) => NK.TYPE_LABEL[t.t]), datasets: [{ label: 'Costo por km', data: types.map((t) => Math.round(t.cpk * 100) / 100), backgroundColor: [C.ink, C.steel, C.steel2], maxBarThickness: 64 }] }, options: { scales: { y: { grid: { color: '#EFEBE4' }, ticks: { callback: (v) => '$' + F.n2(v) } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${F.money2(c.raw)} por km` } } } } });
    NK.chart($('r-disp'), { type: 'line', data: { labels: L, datasets: [{ label: 'Disponibilidad', data: disp, borderColor: C.steel, backgroundColor: C.steelSoft, fill: true, borderWidth: 2.2, pointRadius: 2.5, pointBackgroundColor: C.steel }, { label: 'Meta', data: disp.map(() => 90), borderColor: C.danger, borderDash: [6, 5], borderWidth: 1.5, pointRadius: 0, fill: false }] }, options: { scales: { y: { suggestedMin: 80, suggestedMax: 96, grid: { color: '#EFEBE4' }, ticks: { callback: (v) => v + ' %' } } }, ...idx, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${F.n1(c.raw)} %` } } } } });
    if ($('r-count')) NK.chart($('r-count'), { type: 'bar', data: { labels: L, datasets: [showPrev && { label: 'Preventivos', data: S.mttoPrev.slice(-n), backgroundColor: C.steel, maxBarThickness: 16 }, showCorr && { label: 'Correctivos', data: S.mttoCorr.slice(-n), backgroundColor: C.brand, maxBarThickness: 16 }].filter(Boolean) }, options: { scales: { y: { grid: { color: '#EFEBE4' }, ticks: { precision: 0 } } }, ...idx } });
    NK.chart($('r-hx'), { type: 'line', data: { labels: L, datasets: [{ label: 'Horas extra', data: hx, borderColor: C.brand, backgroundColor: C.brandSoft, fill: true, borderWidth: 2.2, pointRadius: 2.5, pointBackgroundColor: C.brand }] }, options: { scales: { y: { grid: { color: '#EFEBE4' }, beginAtZero: true, ticks: { callback: (v) => v + ' h' } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.raw} horas` } } } } });
    NK.chart($('r-req'), { type: 'bar', data: { labels: L, datasets: [{ label: 'Atendidas', data: S.solicitudes.slice(-n).map((v, i) => v - S.solicitudesRech.slice(-n)[i]), backgroundColor: C.steel, stack: 'r', maxBarThickness: 24 }, { label: 'Rechazadas', data: S.solicitudesRech.slice(-n), backgroundColor: C.danger, stack: 'r', maxBarThickness: 24 }] }, options: { scales: { x: { stacked: true }, y: { stacked: true, grid: { color: '#EFEBE4' }, ticks: { precision: 0 } } }, ...idx } });
    const sparkData = [S.preventivo.map((v, i) => v + S.correctivo[i]), S.llantas, S.combustible, S.kmpl, S.disponibilidad, S.horasExtra];
    sparkData.forEach((arr, i) => { const c = $('sp-' + i); if (c) NK.chart(c, { type: 'line', data: { labels: arr.slice(-n).map((_, j) => j), datasets: [{ data: arr.slice(-n), borderColor: C.ink3, borderWidth: 1.5, pointRadius: 0 }] }, options: { responsive: false, animation: false, events: [], scales: { x: { display: false }, y: { display: false } }, plugins: { tooltip: { enabled: false } } } }); });
  }
})();
