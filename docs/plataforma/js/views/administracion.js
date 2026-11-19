/* ADMINISTRACIÓN LOGÍSTICA — presupuesto, gastos, documentación, pendientes y análisis asistido (demostración) */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;
  const ui = { tab: 'resumen' };

  function budgetData() {
    const S = NK.series;
    const m = new Date().getMonth() + 1; // meses transcurridos del año
    const ytd = (arr) => arr.slice(-m).reduce((a, b) => a + b, 0);
    const used = {
      'Mantenimiento preventivo': ytd(S.preventivo),
      'Mantenimiento correctivo': ytd(S.correctivo),
      'Llantas': ytd(S.llantas),
      'Combustible': ytd(S.combustible),
      'Documentación y seguros': 1048000,
      'Horas extra de taller': ytd(S.horasExtra) * 410,
    };
    const committed = { 'Mantenimiento preventivo': 42000, 'Mantenimiento correctivo': 96000, 'Llantas': 61000, 'Combustible': 380000, 'Documentación y seguros': 168000, 'Horas extra de taller': 0 };
    return NK.budget.map((b) => ({ ...b, used: used[b.cat], committed: committed[b.cat], expected: (b.annual * m) / 12 }));
  }

  NK.views.administracion = {
    title: 'Administración',
    render(root, params) {
      if (params.get('tab')) ui.tab = params.get('tab');
      const tabs = [['resumen', 'Resumen'], ['presupuesto', 'Presupuesto y gastos'], ['docs', 'Documentación'], ['pendientes', 'Pendientes y compromisos'], ['ia', 'Análisis asistido']];
      root.innerHTML = `<div class="view">
        ${NK.pageHead({ eyebrow: 'Gestión', title: 'Administración logística', text: 'Espacio del encargado administrativo de Logística: presupuesto, gastos, documentación, pendientes y seguimiento de compromisos.', actions: `<button class="btn" type="button" id="ad-report">${NK.icon('file-text')}Reporte para Dirección</button>` })}
        <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${ui.tab === k}">${k === 'ia' ? NK.icon('sparkles') : ''}${l}</button>`).join('')}</div>
        <div id="ad-body"></div>
      </div>`;
      NK.icons();
      const draw = () => { NK.destroyCharts(); ({ resumen, presupuesto, docs, pendientes, ia }[ui.tab])(root.querySelector('#ad-body')); };
      draw();
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.tab; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b)); draw(); }));
      root.querySelector('#ad-report').addEventListener('click', () => NK.toast('Reporte para Dirección', 'En la versión final se generará un documento con indicadores, gastos y compromisos del mes.', 'info'));
      NK.goAdminTab = (t) => { ui.tab = t; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x.dataset.tab === t)); draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    },
  };

  function kpis() {
    const S = NK.series, l = S.preventivo.length - 1;
    return [
      ['Disponibilidad de flotilla', F.pct(S.disponibilidad[l], 1), '≥ 90 %', S.disponibilidad[l] >= 90 ? 'ok' : S.disponibilidad[l] >= 86 ? 'warn' : 'danger'],
      ['Servicios preventivos a tiempo', '82 %', '≥ 95 %', 'warn'],
      ['Proporción preventivo / total', F.pct((S.mttoPrev[l] / (S.mttoPrev[l] + S.mttoCorr[l])) * 100), '≥ 60 %', (S.mttoPrev[l] / (S.mttoPrev[l] + S.mttoCorr[l])) >= 0.6 ? 'ok' : 'warn'],
      ['Rendimiento de combustible', F.n2(S.kmpl[l]) + ' km/L', '≥ 2.90', S.kmpl[l] >= 2.9 ? 'ok' : 'warn'],
      ['Costo de mantenimiento por km', F.money2((S.preventivo[l] + S.correctivo[l]) / S.km[l]), '≤ $1.60', (S.preventivo[l] + S.correctivo[l]) / S.km[l] <= 1.6 ? 'ok' : 'danger'],
      ['Horas extra del taller', S.horasExtra[l] + ' h', '≤ 60 h', S.horasExtra[l] <= 60 ? 'ok' : 'danger'],
      ['Solicitudes atendidas en ≤ 3 días', '74 %', '≥ 85 %', 'warn'],
    ];
  }

  function resumen(box) {
    const s = NK.store.state;
    const bd = budgetData();
    const totA = bd.reduce((a, b) => a + b.annual, 0), totU = bd.reduce((a, b) => a + b.used, 0), totE = bd.reduce((a, b) => a + b.expected, 0);
    const pend = s.pendientes.filter((p) => !p.done);
    const docsSoon = s.adminDocs.concat(s.docs.map((d) => ({ name: `${d.name} · ${d.unit}`, expires: d.expires }))).filter((d) => F.days(d.expires) <= 30).sort((a, b) => a.expires.localeCompare(b.expires));
    box.innerHTML = `<div class="grid g-12">
      <section class="panel span-8">
        <div class="panel__head"><div><h2>Indicadores contra meta</h2><p class="panel__sub">Mes en curso · semáforo: verde cumple, ámbar en vigilancia, rojo fuera de meta</p></div></div>
        <ul class="kpi-list" style="margin-top:10px">
          <li style="font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);background:var(--surface-2)"><span>Indicador</span><span class="num" style="font-family:var(--font)">Actual</span><span class="num" style="font-family:var(--font)">Meta</span><span></span></li>
          ${kpis().map(([n, v, m, t]) => `<li><span>${n}</span><span class="num mono">${v}</span><span class="num mono muted">${m}</span><span class="sem sem--${t}" role="img" aria-label="${t === 'ok' ? 'Cumple' : t === 'warn' ? 'En vigilancia' : 'Fuera de meta'}"></span></li>`).join('')}
        </ul>
      </section>
      <section class="panel span-4">
        <div class="panel__head"><div><h2>Presupuesto anual</h2><p class="panel__sub">Ejercido al día de hoy</p></div></div>
        <div class="panel__body">
          <div class="big-stat"><span class="num mono">${F.moneyK(totU)}</span><span class="muted small">de ${F.moneyK(totA)}</span></div>
          <div class="bar bar--lg ${totU > totE ? 'bar--danger' : 'bar--ink'}" style="margin:12px 0 6px"><span style="width:${(totU / totA) * 100}%"></span><span class="marker" style="left:${(totE / totA) * 100}%" title="Esperado a la fecha"></span></div>
          <p class="muted small">Ejercido <b class="mono" style="color:var(--ink)">${F.pct((totU / totA) * 100)}</b>. La marca indica lo esperado a la fecha (${F.pct((totE / totA) * 100)}).</p>
          <div class="callout ${totU > totE ? 'callout--warn' : ''}" style="margin-top:14px">${NK.icon(totU > totE ? 'triangle-alert' : 'info')}<div>${totU > totE ? `Gasto <strong>${F.moneyK(totU - totE)}</strong> arriba de lo esperado, impulsado por mantenimiento correctivo.` : 'El gasto está dentro de lo esperado.'}</div></div>
          <button class="btn btn--block" style="margin-top:14px" data-go="presupuesto">${NK.icon('wallet')}Ver detalle por categoría</button>
        </div>
      </section>
      <section class="panel span-6">
        <div class="panel__head"><div><h2>Pendientes administrativos</h2><p class="panel__sub">${pend.length} abiertos</p></div><button class="link-btn" data-go="pendientes">Ver todos ${NK.icon('arrow-right')}</button></div>
        <ul class="checklist" style="margin-top:8px">${pend.slice(0, 4).map((p) => `<li><button class="check" role="checkbox" aria-checked="false" data-chk="${p.id}" aria-label="Marcar como hecho: ${esc(p.text)}">${NK.icon('check')}</button><div><strong>${esc(p.text)}</strong><span>${esc(p.meta)}</span></div><span></span></li>`).join('')}</ul>
      </section>
      <section class="panel span-6">
        <div class="panel__head"><div><h2>Vencimientos próximos</h2><p class="panel__sub">Documentos vencidos o que vencen en 30 días</p></div><button class="link-btn" data-go="docs">Ver documentación ${NK.icon('arrow-right')}</button></div>
        <ul class="alerts" style="margin-top:8px">${docsSoon.slice(0, 5).map((d) => { const dd = F.days(d.expires); return `<li class="alert-item alert-item--${dd < 0 ? 'danger' : dd <= 15 ? 'warn' : 'info'}"><span class="alert-item__ic">${NK.icon('file-text')}</span><div><strong>${esc(d.name)}</strong><span>${dd < 0 ? `Venció hace ${-dd} días` : `Vence en ${dd} días · ${F.date(d.expires)}`}</span></div><span></span></li>`; }).join('')}</ul>
      </section>
      <section class="panel span-12" style="display:flex;align-items:center;gap:18px;padding:18px 22px;flex-wrap:wrap;background:var(--night);border-color:var(--night);color:var(--night-ink)">
        <span class="ai__mark" style="background:var(--brand);color:var(--ink)">${NK.icon('sparkles')}</span>
        <div style="flex:1;min-width:240px"><strong style="font-size:16px;color:#fff">Análisis asistido (vista previa)</strong><p style="color:var(--night-ink-2);font-size:14px">Haga preguntas sobre gastos, flotilla o taller y obtenga hallazgos con datos de respaldo. Demostración de una función futura.</p></div>
        <button class="btn btn--primary" data-go="ia">${NK.icon('sparkles')}Probar análisis</button>
      </section>
    </div>`;
    NK.icons();
    box.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => NK.goAdminTab(b.dataset.go)));
    box.querySelectorAll('[data-chk]').forEach((b) => b.addEventListener('click', () => togglePend(b.dataset.chk, () => resumen(box))));
  }

  function togglePend(id, cb) {
    const p = NK.store.state.pendientes.find((x) => x.id === id);
    p.done = !p.done;
    NK.store.save();
    if (p.done) NK.toast('Pendiente completado', esc(p.text));
    cb();
  }

  function presupuesto(box) {
    const s = NK.store.state;
    const bd = budgetData();
    box.innerHTML = `
      <section class="panel" style="margin-bottom:18px">
        <div class="panel__head" style="padding-bottom:12px"><div><h2>Presupuesto por categoría</h2><p class="panel__sub">Ejercicio ${new Date().getFullYear()} · ejercido, comprometido y disponible</p></div>
          <div class="chart-legend"><span><i style="background:var(--ink)"></i>Ejercido</span><span><i style="background:repeating-linear-gradient(135deg,#6E93AE 0 3px,#9DB6C8 3px 6px)"></i>Comprometido</span><span><i style="background:var(--surface-3);border:1px solid var(--line-2)"></i>Disponible</span><span><i class="dash" style="border-color:var(--danger)"></i>Esperado a la fecha</span></div></div>
        <div class="budget-row budget-row--head"><span>Categoría</span><span>Avance</span><span class="right" style="text-align:right">Ejercido</span><span style="text-align:right">Disponible</span><span style="text-align:right">% usado</span></div>
        ${bd.map((b) => { const pu = (b.used / b.annual) * 100, pc = (b.committed / b.annual) * 100, pe = (b.expected / b.annual) * 100; const over = b.used > b.expected * 1.03; return `<div class="budget-row">
          <span><strong style="font-weight:600">${b.cat}</strong><br><span class="muted small mono">${F.moneyK(b.annual)} anual</span></span>
          <div style="position:relative"><div class="budget-bar" role="img" aria-label="${F.pct(pu)} ejercido, ${F.pct(pc)} comprometido"><span class="used" style="width:${pu}%;${over ? 'background:var(--danger)' : ''}"></span><span class="committed" style="width:${pc}%"></span></div><span style="position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--danger);left:${pe}%;border-radius:1px" aria-hidden="true"></span></div>
          <span class="mono" style="text-align:right">${F.moneyK(b.used)}</span>
          <span class="mono" style="text-align:right">${F.moneyK(b.annual - b.used - b.committed)}</span>
          <span style="text-align:right">${over ? NK.badge(F.pct(pu), 'danger') : NK.badge(F.pct(pu), 'muted', 'badge--plain')}</span>
        </div>`; }).join('')}
      </section>
      <div class="grid g-12">
        <section class="panel span-7 panel--flush">
          <div class="toolbar"><strong style="font-size:15px">Gastos recientes</strong><span class="grow"></span><button class="btn btn--sm" id="ad-exp">${NK.icon('plus')}Registrar gasto</button></div>
          <div class="table-wrap"><table class="table table--cards table--compact"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Unidad</th><th class="right">Monto</th><th>Estado</th></tr></thead><tbody>
            ${s.expenses.map((e) => `<tr><td class="td-main">${F.date(e.date)}</td><td data-label="Concepto">${esc(e.concept)}</td><td data-label="Categoría"><span class="tag">${e.cat}</span></td><td data-label="Unidad" class="mono">${e.unit}</td><td data-label="Monto" class="right mono">${F.money(e.amount)}</td><td data-label="Estado">${NK.badge(e.status, e.status === 'Pagado' ? 'ok' : e.status === 'Por pagar' ? 'warn' : 'muted')}</td></tr>`).join('')}
          </tbody></table></div>
        </section>
        <section class="panel span-5">
          <div class="panel__head"><div><h2>Distribución del gasto del año</h2><p class="panel__sub">Sin combustible, para ver mejor las demás categorías</p></div></div>
          <div class="panel__body"><div class="chart-box"><canvas id="ad-donut" role="img" aria-label="Distribución del gasto por categoría"></canvas></div>
          <div class="chart-legend" style="margin-top:12px;justify-content:center">${bd.filter((b) => b.cat !== 'Combustible').map((b, i) => `<span><i style="background:${[NK.C.steel, NK.C.brand, NK.C.sand, NK.C.ink, NK.C.steel2][i]}"></i>${b.cat}</span>`).join('')}</div></div>
        </section>
      </div>`;
    NK.icons();
    const nb = bd.filter((b) => b.cat !== 'Combustible');
    NK.chart(box.querySelector('#ad-donut'), { type: 'doughnut', data: { labels: nb.map((b) => b.cat), datasets: [{ data: nb.map((b) => b.used), backgroundColor: [NK.C.steel, NK.C.brand, NK.C.sand, NK.C.ink, NK.C.steel2], borderColor: '#fff', borderWidth: 2 }] }, options: { cutout: '64%', plugins: { tooltip: { callbacks: { label: (c) => ` ${c.label}: ${F.money(c.raw)}` } } } } });
    box.querySelector('#ad-exp').addEventListener('click', () => {
      const m = NK.modal({ title: 'Registrar gasto', icon: 'receipt', size: 'sm', body: `<form class="form" novalidate>
          <div class="field"><label for="ex-c">Concepto</label><input id="ex-c" data-required placeholder="Ej. Reparación de radiador">${NK.fieldErr('Escriba el concepto')}</div>
          <div class="form-row"><div class="field"><label for="ex-a">Monto (MXN)</label><input id="ex-a" type="number" min="1" data-required inputmode="decimal">${NK.fieldErr('Indique el monto')}</div>
          <div class="field"><label for="ex-u">Unidad</label><select id="ex-u"><option>—</option>${s.units.map((u) => `<option>${u.id}</option>`).join('')}</select></div></div>
          <div class="field"><label for="ex-k">Categoría</label><select id="ex-k">${NK.budget.map((b) => `<option>${b.cat}</option>`).join('')}</select></div>
        </form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn--dark" id="ex-save">${NK.icon('check')}Guardar</button>` });
      m.el.querySelector('#ex-save').addEventListener('click', () => {
        if (!NK.validate(m.el.querySelector('form'))) return;
        s.expenses.unshift({ date: new Date().toISOString(), concept: m.el.querySelector('#ex-c').value.trim(), cat: m.el.querySelector('#ex-k').value, unit: m.el.querySelector('#ex-u').value, amount: Number(m.el.querySelector('#ex-a').value), status: 'Por pagar' });
        NK.store.save(); m.close(); NK.toast('Gasto registrado', 'Se agregó a la lista de gastos recientes.'); presupuesto(box);
      });
    });
  }

  function docs(box) {
    const s = NK.store.state;
    const rows = s.adminDocs.map((d) => ({ ...d, scope: 'Empresa' })).concat(s.docs.map((d) => ({ name: d.name, owner: d.unit, cat: d.cat, expires: d.expires, scope: 'Unidad' })));
    let f = 'riesgo';
    const draw = () => {
      const list = rows.filter((d) => f === 'todos' || (f === 'riesgo' ? F.days(d.expires) <= 30 : d.scope === 'Empresa')).sort((a, b) => a.expires.localeCompare(b.expires));
      const venc = rows.filter((d) => F.days(d.expires) < 0).length, prox = rows.filter((d) => F.days(d.expires) >= 0 && F.days(d.expires) <= 30).length;
      box.innerHTML = `<div class="inv-summary">
          <div><span class="ic ic--danger">${NK.icon('file-x')}</span><div><b>${venc}</b><span>Documentos vencidos</span></div></div>
          <div><span class="ic ic--warn">${NK.icon('file-clock')}</span><div><b>${prox}</b><span>Vencen en 30 días</span></div></div>
          <div><span class="ic ic--info">${NK.icon('files')}</span><div><b>${rows.length}</b><span>Documentos controlados</span></div></div>
          <div><span class="ic">${NK.icon('building-2')}</span><div><b>${s.adminDocs.length}</b><span>Permisos, contratos y pólizas de empresa</span></div></div>
        </div>
        <section class="panel panel--flush">
          <div class="toolbar"><div class="seg" role="group">${[['riesgo', 'Vencidos y por vencer'], ['empresa', 'De la empresa'], ['todos', 'Todos']].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div><span class="grow"></span><button class="btn btn--sm" id="doc-up">${NK.icon('upload')}Cargar documento</button></div>
          <div class="table-wrap"><table class="table table--cards"><thead><tr><th>Documento</th><th>Responsable / unidad</th><th>Tipo</th><th>Vencimiento</th><th>Estado</th><th><span class="sr-only">Ver</span></th></tr></thead><tbody>
            ${list.map((d) => { const dd = F.days(d.expires); return `<tr class="${dd < 0 ? 'row-alert' : dd <= 15 ? 'row-warn' : ''}"><td class="td-main"><strong style="font-weight:600">${esc(d.name)}</strong></td><td data-label="Responsable" class="${d.scope === 'Unidad' ? 'mono' : ''}">${esc(d.owner)}</td><td data-label="Tipo"><span class="tag">${d.cat}</span></td><td data-label="Vencimiento">${F.date(d.expires)}</td><td data-label="Estado">${NK.badge(dd < 0 ? `Vencido hace ${-dd} d` : dd <= 30 ? `Vence en ${dd} d` : 'Vigente', dd < 0 ? 'danger' : dd <= 15 ? 'warn' : dd <= 30 ? 'muted' : 'ok')}</td><td class="right"><button class="btn btn--xs btn--ghost" data-view>${NK.icon('eye')}Ver</button></td></tr>`; }).join('')}
          </tbody></table></div>
        </section>`;
      NK.icons();
      box.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { f = b.dataset.f; draw(); }));
      box.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => NK.toast('Vista previa', 'En la demostración no se adjuntan archivos reales.', 'info')));
      box.querySelector('#doc-up').addEventListener('click', () => NK.toast('Carga de documentos', 'Función disponible en la versión con servidor. Aquí sólo se muestra la interfaz.', 'info'));
    };
    draw();
  }

  function pendientes(box) {
    const s = NK.store.state;
    box.innerHTML = `<div class="grid g-12">
      <section class="panel span-5">
        <div class="panel__head"><div><h2>Pendientes administrativos</h2><p class="panel__sub">${s.pendientes.filter((p) => !p.done).length} abiertos · ${s.pendientes.filter((p) => p.done).length} completados</p></div></div>
        <ul class="checklist" style="margin-top:8px">${s.pendientes.map((p) => `<li class="${p.done ? 'is-done' : ''}"><button class="check" role="checkbox" aria-checked="${p.done}" data-chk="${p.id}" aria-label="${p.done ? 'Reabrir' : 'Marcar como hecho'}: ${esc(p.text)}">${NK.icon('check')}</button><div><strong>${esc(p.text)}</strong><span>${esc(p.meta)}</span></div><span></span></li>`).join('')}</ul>
        <form class="panel__foot" id="pd-add" style="gap:8px"><input class="select" style="background-image:none;flex:1;padding-right:12px;cursor:text" id="pd-text" placeholder="Agregar pendiente…" aria-label="Nuevo pendiente"><button class="btn btn--sm btn--dark" type="submit">${NK.icon('plus')}Agregar</button></form>
      </section>
      <section class="panel span-7 panel--flush">
        <div class="toolbar"><strong style="font-size:15px">Seguimiento de compromisos</strong><span class="muted small">Acuerdos con Dirección y otras áreas</span></div>
        <div class="table-wrap"><table class="table table--cards"><thead><tr><th>Compromiso</th><th>Responsable</th><th>Fecha</th><th>Avance</th><th>Estado</th></tr></thead><tbody>
          ${s.compromisos.map((c) => `<tr><td class="td-main"><strong style="font-weight:600">${esc(c.text)}</strong></td><td data-label="Responsable">${esc(c.owner)}</td><td data-label="Fecha">${F.date(c.due)}<span class="cell-sub">${F.rel(c.due)}</span></td><td data-label="Avance"><div class="km-progress" style="min-width:110px"><div class="lbl"><span class="mono">${c.progress} %</span></div><div class="bar ${c.status === 'atrasado' ? 'bar--danger' : c.status === 'en riesgo' ? 'bar--warn' : 'bar--ink'}"><span style="width:${c.progress}%"></span></div></div></td><td data-label="Estado">${NK.badge(c.status[0].toUpperCase() + c.status.slice(1), c.status === 'atrasado' ? 'danger' : c.status === 'en riesgo' ? 'warn' : 'ok')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </div>`;
    NK.icons();
    box.querySelectorAll('[data-chk]').forEach((b) => b.addEventListener('click', () => togglePend(b.dataset.chk, () => pendientes(box))));
    box.querySelector('#pd-add').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = box.querySelector('#pd-text').value.trim();
      if (!v) { box.querySelector('#pd-text').focus(); return; }
      s.pendientes.unshift({ id: 'p' + Date.now(), text: v, meta: 'Agregado hoy', done: false });
      NK.store.save(); NK.toast('Pendiente agregado', esc(v)); pendientes(box);
    });
  }

  // ------------------------------------------------------------------
  // Análisis asistido — resultado simulado, sin servicio de IA real
  // ------------------------------------------------------------------
  const PROMPTS = [
    'Analizar los gastos de mantenimiento de los últimos seis meses',
    '¿Qué unidades cuestan más por kilómetro?',
    '¿Por qué bajó la disponibilidad de la flotilla?',
    '¿Qué artículos del almacén conviene reabastecer este mes?',
  ];

  function result(q) {
    const S = NK.series;
    const s = NK.store.state;
    const last6c = S.correctivo.slice(-6), first = S.correctivo.slice(-6, -3), lastq = S.correctivo.slice(-3);
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const growth = (avg(lastq) / avg(first) - 1) * 100;
    const brakes = s.history.filter((h) => F.days(h.date) > -95 && h.service.startsWith('Frenos'));
    const brakeOld = brakes.filter((h) => { const u = NK.store.unit(h.unit); return u && u.type === 'tracto' && u.year <= 2019; });
    const brakeCost = brakes.reduce((a, h) => a + h.cost, 0);
    const unitsOld = [...new Set(brakeOld.map((h) => h.unit))];
    const lq = q.toLowerCase();
    if (lq.includes('disponibilidad')) {
      return { finding: `La disponibilidad bajó a ${F.pct(S.disponibilidad[11], 1)} porque 3 unidades llevan más de 6 días fuera de servicio.`, why: ['T-107 espera autorización de una reparación mayor de motor (9 días detenida).', 'TO-206 y TV-308 tienen daños estructurales que requieren valoración externa.', 'Las órdenes en espera de material suman días adicionales de taller.'], data: 'disp', rec: ['Definir esta semana la reparación o baja de T-107 con Dirección.', 'Enviar TV-308 a valoración con un taller de estructuras.', 'Mantener stock mínimo de balatas y refrigerante para evitar órdenes detenidas.'], impact: [['+5.1 pts', 'disponibilidad al reincorporar 2 unidades'], ['≈ 18', 'viajes adicionales por mes'], ['2–3 semanas', 'tiempo estimado de recuperación']] };
    }
    return {
      finding: `El mantenimiento correctivo de los últimos 3 meses es ${F.pct(growth)} mayor que en los 3 meses anteriores. El ${F.pct((brakeOld.length / Math.max(1, brakes.length)) * 100)} de las reparaciones de frenos se concentra en tractocamiones modelo 2018–2019.`,
      why: [
        `Las unidades ${unitsOld.slice(0, 4).join(', ')} superan los 800 mil km y muestran desgaste acelerado de balatas y tambores.`,
        'Varios servicios preventivos se realizaron con retraso (3 unidades vencidas hoy), lo que adelanta fallas de frenos.',
        'Las horas extra del taller subieron en el mismo periodo, lo que confirma mayor carga de trabajo no programado.',
      ],
      data: 'mtto',
      dataText: `${brakes.length} reparaciones de frenos en 90 días por ${F.money(brakeCost)}; ${brakeOld.length} de ellas en tractocamiones 2018–2019.`,
      rec: [
        'Incluir inspección de frenos (balatas, tambores y matracas) en cada preventivo A de tractocamiones 2018–2019.',
        'Reducir a cero los preventivos vencidos antes de fin de mes.',
        'Evaluar con Compras un contrato de suministro de balatas para bajar el costo unitario y evitar órdenes detenidas.',
      ],
      impact: [[F.moneyK(avg(lastq) - avg(first)), 'ahorro mensual posible al volver al nivel anterior'], ['−30 %', 'horas extra estimadas'], ['+2 a 3', 'unidades disponibles por semana']],
    };
  }

  function ia(box) {
    box.innerHTML = `<div class="ai">
      <div class="ai__head">
        <div class="ai__title"><span class="ai__mark">${NK.icon('sparkles')}</span><div><h2>Análisis asistido</h2><p>Escriba una pregunta sobre la operación. El sistema revisará órdenes, gastos, inventario y flotilla para darle una respuesta con respaldo.</p></div><span class="badge badge--brand" style="margin-left:auto">Demostración</span></div>
        <form class="ai__form" id="ai-form">
          <div class="field"><label class="sr-only" for="ai-q">Pregunta</label><textarea id="ai-q" rows="1" placeholder="Ej. Analizar los gastos de mantenimiento de los últimos seis meses">${PROMPTS[0]}</textarea></div>
          <button class="btn btn--primary btn--lg" type="submit">${NK.icon('sparkles')}Analizar</button>
        </form>
        <div class="ai__suggest">${PROMPTS.map((p) => `<button type="button" data-p="${esc(p)}">${NK.icon('corner-down-right')}${esc(p)}</button>`).join('')}</div>
      </div>
      <div class="ai__body" id="ai-out">${NK.empty('sparkles', 'Listo para analizar', 'Elija una pregunta sugerida o escriba la suya y presione <b>Analizar</b>.')}</div>
    </div>`;
    NK.icons();
    const out = box.querySelector('#ai-out');
    const qEl = box.querySelector('#ai-q');
    box.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { qEl.value = b.dataset.p; run(); }));
    box.querySelector('#ai-form').addEventListener('submit', (e) => { e.preventDefault(); run(); });
    qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } });
    let timer;
    function run() {
      const q = qEl.value.trim();
      if (!q) { qEl.focus(); return; }
      clearTimeout(timer);
      NK.destroyCharts();
      const steps = ['Leyendo órdenes de trabajo y servicios de los últimos 6 meses', 'Cruzando gastos por categoría y por unidad', 'Comparando con el kilometraje y la antigüedad de cada unidad', 'Redactando hallazgos y recomendaciones'];
      NK.mount(out, `<p class="small muted" style="margin-bottom:12px">Pregunta: <b style="color:var(--ink)">${esc(q)}</b></p><div class="ai__steps">${steps.map((s2, i) => `<div class="ai__step" data-step="${i}">${NK.icon('circle')}<span>${s2}</span></div>`).join('')}</div>`);
      let i = 0;
      const tick = () => {
        const prevEl = out.querySelector(`[data-step="${i - 1}"]`);
        if (prevEl) { prevEl.className = 'ai__step is-done'; NK.mount(prevEl, `${NK.icon('circle-check')}<span>${steps[i - 1]}</span>`); }
        const el = out.querySelector(`[data-step="${i}"]`);
        if (el) { el.className = 'ai__step is-run'; NK.mount(el, `${NK.icon('loader-circle')}<span>${steps[i]}</span>`); i++; timer = setTimeout(tick, 650); }
        else timer = setTimeout(() => show(q), 300);
      };
      tick();
    }
    function show(q) {
      const r = result(q);
      const S = NK.series;
      NK.mount(out, `<p class="small muted" style="margin-bottom:14px">Pregunta: <b style="color:var(--ink)">${esc(q)}</b></p>
        <div class="ai-result">
          <div class="ai-block ai-block--finding ai-block--wide"><div class="ai-block__label">${NK.icon('search-check')}Hallazgo</div><h3>${r.finding}</h3></div>
          <div class="ai-block"><div class="ai-block__label">${NK.icon('message-circle-question')}Posible explicación</div><ul>${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
          <div class="ai-block"><div class="ai-block__label">${NK.icon('chart-column')}Datos que respaldan el hallazgo</div><div class="chart-box chart-box--sm"><canvas id="ai-chart" role="img" aria-label="Datos de respaldo"></canvas></div>${r.dataText ? `<p class="small" style="margin-top:8px">${r.dataText}</p>` : ''}</div>
          <div class="ai-block"><div class="ai-block__label">${NK.icon('list-checks')}Recomendación</div><ul>${r.rec.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
          <div class="ai-block"><div class="ai-block__label">${NK.icon('trending-up')}Impacto potencial</div><div class="ai-impact">${r.impact.map(([v, t]) => `<div><b>${v}</b><span>${t}</span></div>`).join('')}</div></div>
        </div>
        <div class="ai-disclaimer">${NK.icon('info')}<span>Resultado simulado para demostrar la interfaz. No se conectó ningún servicio de inteligencia artificial y los datos son ficticios.</span></div>
        <div class="btn-group" style="margin-top:14px"><button class="btn btn--sm" data-copy>${NK.icon('copy')}Copiar resumen</button><button class="btn btn--sm" data-add>${NK.icon('list-plus')}Agregar recomendaciones a pendientes</button></div>`);
      const L = NK.monthLabels(6);
      if (r.data === 'disp') NK.chart(out.querySelector('#ai-chart'), { type: 'line', data: { labels: L, datasets: [{ label: 'Disponibilidad', data: S.disponibilidad.slice(-6), borderColor: NK.C.steel, backgroundColor: NK.C.steelSoft, fill: true, pointRadius: 3, pointBackgroundColor: NK.C.steel }, { label: 'Meta', data: L.map(() => 90), borderColor: NK.C.danger, borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 }] }, options: { scales: { y: { suggestedMin: 82, suggestedMax: 95, ticks: { callback: (v) => v + ' %' }, grid: { color: '#EFEBE4' } } } } });
      else NK.chart(out.querySelector('#ai-chart'), { type: 'bar', data: { labels: L, datasets: [{ label: 'Correctivo', data: S.correctivo.slice(-6), backgroundColor: L.map((_, i) => (i >= 3 ? NK.C.brand : '#F3C7A0')), maxBarThickness: 30 }] }, options: { scales: { y: NK.axisMoney }, plugins: { tooltip: { callbacks: { label: (c) => ' Correctivo: ' + F.money(c.raw) } } } } });
      out.querySelector('[data-copy]').addEventListener('click', () => { const t = `Hallazgo: ${r.finding.replace(/<[^>]+>/g, '')}\nRecomendaciones:\n- ${r.rec.join('\n- ')}`; try { navigator.clipboard.writeText(t); } catch (e) { /* sin portapapeles */ } NK.toast('Resumen copiado', 'Puede pegarlo en un correo o reporte.'); });
      out.querySelector('[data-add]').addEventListener('click', (e) => { const st = NK.store.state; r.rec.forEach((t, k) => st.pendientes.unshift({ id: 'p' + Date.now() + k, text: t, meta: 'Sugerido por análisis asistido', done: false })); NK.store.save(); e.currentTarget.disabled = true; NK.toast(`${r.rec.length} pendientes agregados`, 'Los encontrará en Pendientes y compromisos.'); });
    }
  }
})();
