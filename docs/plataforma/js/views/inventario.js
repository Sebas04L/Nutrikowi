/* INVENTARIO DEL TALLER */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;
  const CATS = ['Lubricantes', 'Filtros', 'Refacciones', 'Consumibles', 'Materiales de mantenimiento'];
  const ui = { cat: 'Todos', q: '', low: false, sort: { key: 'code', dir: 'asc' } };

  function meter(it) {
    const avail = it.exist - it.reserved;
    const st = NK.stockState(it);
    const max = Math.max(it.min * 2.2, it.exist, 1);
    return `<div class="stock-meter stock-meter--${st.key}" role="img" aria-label="Disponible ${avail}, mínimo ${it.min}">
      <div class="stock-meter__bar"><span class="stock-meter__fill" style="width:${Math.max(0, (avail / max) * 100)}%"></span><span class="stock-meter__min" style="left:${(it.min / max) * 100}%"></span></div>
    </div>`;
  }

  NK.views.inventario = {
    title: 'Inventario',
    render(root, params) {
      const s = NK.store.state;
      if (params.get('low')) ui.low = true;
      const inv = s.inventory;
      const lows = inv.filter((i) => NK.stockState(i).key === 'low');
      const outs = inv.filter((i) => NK.stockState(i).key === 'out');
      const value = inv.reduce((a, i) => a + i.exist * i.cost, 0);
      const todayMov = s.movements.filter((m) => F.days(m.at) > -7).length;

      root.innerHTML = `<div class="view">
        ${NK.pageHead({ eyebrow: 'Almacén', title: 'Inventario del taller', text: 'Existencias de lubricantes, filtros, refacciones y consumibles. <b>Disponible</b> = existencia menos lo reservado para órdenes de trabajo.', actions: `
          <button class="btn" type="button" data-act="mov">${NK.icon('history')}Movimientos</button>
          <button class="btn" type="button" data-act="in">${NK.icon('package-plus')}Registrar entrada</button>
          <button class="btn" type="button" data-act="out">${NK.icon('package-minus')}Registrar salida</button>
          <button class="btn btn--primary" type="button" data-act="req">${NK.icon('clipboard-plus')}Solicitar material</button>` })}

        <div class="inv-summary">
          <button type="button" data-quick="out"><span class="ic ic--danger">${NK.icon('package-x')}</span><div><b>${outs.length}</b><span>Agotados o sin disponible</span></div></button>
          <button type="button" data-quick="low"><span class="ic ic--warn">${NK.icon('triangle-alert')}</span><div><b>${lows.length}</b><span>Por debajo del mínimo</span></div></button>
          <div><span class="ic">${NK.icon('boxes')}</span><div><b>${inv.length}</b><span>Artículos controlados</span></div></div>
          <div><span class="ic ic--info">${NK.icon('wallet')}</span><div><b>${F.moneyK(value)}</b><span>Valor del inventario · ${todayMov} movimientos esta semana</span></div></div>
        </div>

        <section class="panel">
          <div class="tabs" role="tablist" style="margin:0;padding:0 12px">${['Todos'].concat(CATS).map((c) => `<button role="tab" type="button" data-cat="${c}" aria-selected="${ui.cat === c}">${c === 'Materiales de mantenimiento' ? 'Materiales' : c}<span class="count">${c === 'Todos' ? inv.length : inv.filter((i) => i.cat === c).length}</span></button>`).join('')}</div>
          <div class="toolbar">
            <div class="field-search">${NK.icon('search')}<input type="search" id="inv-q" placeholder="Buscar código, descripción o ubicación" value="${esc(ui.q)}" aria-label="Buscar artículo"></div>
            <label class="toggle"><input type="checkbox" id="inv-low" ${ui.low ? 'checked' : ''}><span class="track"></span>Sólo lo que necesita reabastecimiento</label>
            <span class="grow"></span>
            <span class="muted small" id="inv-count"></span>
          </div>
          <div class="table-wrap" id="inv-table"></div>
          <div class="pager"><span>${NK.icon('info')} La línea negra en la barra marca el stock mínimo de cada artículo.</span></div>
        </section>
      </div>`;
      NK.icons();

      const draw = () => {
        const q = ui.q.toLowerCase();
        let list = inv.filter((i) => (ui.cat === 'Todos' || i.cat === ui.cat) && (!ui.low || ['low', 'out'].includes(NK.stockState(i).key)) && (!q || [i.code, i.desc, i.loc].join(' ').toLowerCase().includes(q)));
        const keyMap = { avail: (i) => i.exist - i.reserved, state: (i) => ['out', 'low', 'near', 'ok'].indexOf(NK.stockState(i).key) };
        list = NK.sortBy(list, keyMap[ui.sort.key] || ui.sort.key, ui.sort.dir);
        root.querySelector('#inv-count').textContent = `${list.length} artículos`;
        const box = root.querySelector('#inv-table');
        if (!list.length) { NK.mount(box, NK.empty(ui.low ? 'circle-check' : 'search-x', ui.low ? 'Todo en orden' : 'Sin resultados', ui.low ? 'No hay artículos de esta categoría que necesiten reabastecimiento.' : 'No encontramos artículos con ese criterio.')); return; }
        box.innerHTML = `<table class="table table--cards">
          <thead><tr>${NK.th('Código', 'code', ui.sort)}${NK.th('Descripción', 'desc', ui.sort)}${NK.th('Existencia', 'exist', ui.sort, 'right')}${NK.th('Reservada', 'reserved', ui.sort, 'right')}${NK.th('Disponible', 'avail', ui.sort, 'right')}${NK.th('Mínimo', 'min', ui.sort, 'right')}<th>Nivel</th>${NK.th('Ubicación', 'loc', ui.sort)}${NK.th('Estado', 'state', ui.sort)}<th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>${list.map((i) => {
            const st = NK.stockState(i);
            const avail = i.exist - i.reserved;
            return `<tr class="${st.key === 'out' ? 'row-alert' : st.key === 'low' ? 'row-warn' : ''}">
              <td class="td-main"><span class="mono" style="font-weight:600">${i.code}</span> <span class="cell-sub show-m">${esc(i.desc)}</span></td>
              <td data-label="Descripción" class="td-hide-m" style="text-align:left">${esc(i.desc)}<span class="cell-sub">${i.unit} · ${i.cat}</span></td>
              <td data-label="Existencia" class="right mono">${i.exist}</td>
              <td data-label="Reservada" class="right mono muted">${i.reserved}</td>
              <td data-label="Disponible" class="right"><span class="qty-big ${st.key === 'out' || st.key === 'low' ? 'is-low' : ''}">${avail}</span></td>
              <td data-label="Mínimo" class="right mono">${i.min}</td>
              <td data-label="Nivel">${meter(i)}</td>
              <td data-label="Ubicación"><span class="tag">${NK.icon('map-pin')}${i.loc}</span></td>
              <td data-label="Estado">${NK.badge(st.label, st.tone)}</td>
              <td class="right"><div class="btn-group" style="justify-content:flex-end;flex-wrap:nowrap">
                <button class="btn btn--xs btn--ghost" data-in="${i.code}" aria-label="Registrar entrada de ${i.code}" title="Registrar entrada">${NK.icon('plus')}</button>
                <button class="btn btn--xs btn--ghost" data-out="${i.code}" aria-label="Registrar salida de ${i.code}" title="Registrar salida">${NK.icon('minus')}</button>
                ${st.key === 'low' || st.key === 'out' ? `<button class="btn btn--xs" data-req="${i.code}">${NK.icon('clipboard-plus')}Solicitar</button>` : ''}
              </div></td>
            </tr>`;
          }).join('')}</tbody></table>`;
        NK.icons();
        NK.bindSort(box, ui.sort, draw);
        box.querySelectorAll('[data-in]').forEach((b) => b.addEventListener('click', () => movement('entrada', b.dataset.in)));
        box.querySelectorAll('[data-out]').forEach((b) => b.addEventListener('click', () => movement('salida', b.dataset.out)));
        box.querySelectorAll('[data-req]').forEach((b) => b.addEventListener('click', () => { const it = NK.store.item(b.dataset.req); NK.newRequest({ item: it.code, qty: Math.max(1, it.min * 2 - (it.exist - it.reserved)) }); }));
      };
      draw();

      root.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { ui.cat = b.dataset.cat; root.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-selected', x === b)); draw(); }));
      root.querySelector('#inv-q').addEventListener('input', (e) => { ui.q = e.target.value; draw(); });
      root.querySelector('#inv-low').addEventListener('change', (e) => { ui.low = e.target.checked; draw(); });
      root.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => { ui.low = true; ui.cat = 'Todos'; NK.refresh(); }));
      root.querySelector('[data-act="in"]').addEventListener('click', () => movement('entrada'));
      root.querySelector('[data-act="out"]').addEventListener('click', () => movement('salida'));
      root.querySelector('[data-act="mov"]').addEventListener('click', movements);
      root.querySelector('[data-act="req"]').addEventListener('click', () => NK.newRequest());
    },
  };

  function movement(type, code) {
    const s = NK.store.state;
    const isIn = type === 'entrada';
    const m = NK.modal({
      title: isIn ? 'Registrar entrada' : 'Registrar salida', icon: isIn ? 'package-plus' : 'package-minus', size: 'sm',
      sub: isIn ? 'Material que ingresa al almacén del taller.' : 'Material que sale del almacén hacia una unidad u orden.',
      body: `<form class="form" novalidate>
        <div class="field"><label for="mv-item">Artículo</label><select id="mv-item" data-required><option value="">Seleccione…</option>${s.inventory.map((i) => `<option value="${i.code}" ${i.code === code ? 'selected' : ''}>${i.code} · ${esc(i.desc)}</option>`).join('')}</select>${NK.fieldErr('Seleccione un artículo')}<span class="help" id="mv-help"></span></div>
        <div class="field"><label for="mv-qty">Cantidad</label><input id="mv-qty" type="number" min="1" value="1" data-required inputmode="numeric"><span class="error" id="mv-err">${NK.icon('circle-alert')}<span>Indique una cantidad válida</span></span></div>
        <div class="field"><label for="mv-ref">${isIn ? 'Origen' : 'Destino'}</label>
          ${isIn ? `<select id="mv-ref"><option>Compra recibida</option><option>Devolución de orden de trabajo</option><option>Ajuste de inventario</option></select>` : `<select id="mv-ref">${s.orders.filter((o) => o.status !== 'terminado').map((o) => `<option>${o.folio} · ${o.unit}</option>`).join('')}<option>Consumo general del taller</option></select>`}
        </div>
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn--dark" id="mv-save">${NK.icon('check')}Registrar ${type}</button>`,
    });
    const sel = m.el.querySelector('#mv-item'), qty = m.el.querySelector('#mv-qty'), help = m.el.querySelector('#mv-help');
    const upd = () => { const it = NK.store.item(sel.value); help.textContent = it ? `Existencia actual: ${it.exist} ${it.unit} · disponible ${it.exist - it.reserved} · ubicación ${it.loc}` : ''; };
    sel.addEventListener('change', upd); upd();
    m.el.querySelector('#mv-save').addEventListener('click', () => {
      if (!NK.validate(m.el.querySelector('form'))) return;
      const it = NK.store.item(sel.value), q = Number(qty.value);
      if (!isIn && q > it.exist) { const f = qty.closest('.field'); f.classList.add('is-invalid'); f.querySelector('#mv-err span').textContent = `Sólo hay ${it.exist} en existencia`; return; }
      it.exist += isIn ? q : -q;
      const ref = m.el.querySelector('#mv-ref').value;
      s.movements.unshift({ at: new Date().toISOString(), code: it.code, type, qty: q, ref, by: 'D. Treviño' });
      NK.store.log(isIn ? 'package-plus' : 'package-minus', isIn ? 'ok' : 'warn', `${isIn ? 'Entrada' : 'Salida'} de almacén: ${q} ${it.unit} de <b>${esc(it.desc)}</b>`);
      NK.store.save();
      m.close();
      const st = NK.stockState(it);
      NK.toast(`${isIn ? 'Entrada' : 'Salida'} registrada`, `${it.code}: existencia actual ${it.exist} ${it.unit}.${st.key === 'low' || st.key === 'out' ? ' Quedó por debajo del mínimo.' : ''}`, st.key === 'low' || st.key === 'out' ? 'warn' : 'ok');
      NK.refresh();
    });
  }

  function movements() {
    const s = NK.store.state;
    const m = NK.modal({
      title: 'Movimientos de inventario', icon: 'history', size: 'lg', sub: 'Entradas y salidas recientes del almacén del taller.',
      body: `<div class="seg" role="group" style="margin-bottom:14px" id="mv-f"><button type="button" aria-pressed="true" data-f="all">Todos</button><button type="button" aria-pressed="false" data-f="entrada">Entradas</button><button type="button" aria-pressed="false" data-f="salida">Salidas</button></div><div id="mv-list"></div>`,
      foot: `<button class="btn" data-close>Cerrar</button>`,
    });
    const draw = (f) => {
      const list = s.movements.filter((x) => f === 'all' || x.type === f);
      NK.mount(m.el.querySelector('#mv-list'), list.length ? `<section class="panel panel--flush"><table class="table table--cards table--compact"><thead><tr><th>Fecha</th><th>Artículo</th><th>Movimiento</th><th class="right">Cantidad</th><th>Referencia</th><th>Registró</th></tr></thead><tbody>
        ${list.map((x) => { const it = NK.store.item(x.code); return `<tr><td class="td-main">${F.date(x.at)} <span class="muted small">${F.time(x.at)}</span></td><td data-label="Artículo"><span class="mono small">${x.code}</span> ${it ? esc(it.desc) : ''}</td><td data-label="Movimiento">${x.type === 'entrada' ? `<span class="mov-in">${NK.icon('arrow-down-left')} Entrada</span>` : `<span class="mov-out">${NK.icon('arrow-up-right')} Salida</span>`}</td><td data-label="Cantidad" class="right mono" style="font-weight:600">${x.type === 'entrada' ? '+' : '−'}${x.qty}</td><td data-label="Referencia">${esc(x.ref)}</td><td data-label="Registró">${esc(x.by)}</td></tr>`; }).join('')}
      </tbody></table></section>` : NK.empty('history', 'Sin movimientos', 'No hay movimientos de este tipo.'));
    };
    draw('all');
    m.el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { m.el.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(b.dataset.f); }));
  }
})();
