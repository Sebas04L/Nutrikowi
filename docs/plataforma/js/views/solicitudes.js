/* SOLICITUDES DE MATERIALES — el supervisor solicita, Compras valida y adquiere */
(function () {
  const NK = window.NK, F = NK.fmt, esc = NK.esc;
  const ui = { stage: 'abiertas', q: '' };
  const LANES = [
    { key: 'taller', title: 'Taller', who: 'Supervisor solicita', icon: 'wrench', steps: ['borrador', 'enviada'] },
    { key: 'compras', title: 'Compras', who: 'Valida, autoriza y compra', icon: 'shopping-cart', steps: ['revision', 'autorizada', 'compra'] },
    { key: 'almacen', title: 'Almacén', who: 'Recibe', icon: 'package-check', steps: ['recibida'] },
  ];

  NK.views.solicitudes = {
    title: 'Solicitudes de material',
    render(root, params) {
      const s = NK.store.state;
      const R = s.requests;
      const count = (st) => R.filter((r) => r.status === st).length;
      const open = R.filter((r) => !['recibida', 'rechazada', 'borrador'].includes(r.status));

      root.innerHTML = `<div class="view">
        ${NK.pageHead({ eyebrow: 'Almacén', title: 'Solicitudes de material', text: 'El supervisor de taller envía sus solicitudes <b>directamente a Compras</b>, sin intermediarios. Compras conserva la validación, la autorización de proveedores y la adquisición.', actions: `<button class="btn btn--primary btn--lg" type="button" id="btn-new-req">${NK.icon('clipboard-plus')}Nueva solicitud</button>` })}

        <div class="flow" role="group" aria-label="Flujo de la solicitud. Seleccione una etapa para filtrar.">
          ${LANES.map((l) => `<div class="flow__lane flow__lane--${l.key}">
            <div class="flow__lane-head">${NK.icon(l.icon)}${l.title}<span class="who">${l.who}</span></div>
            <div class="flow__steps">${l.steps.map((st) => `<button type="button" class="flow__step" data-stage="${st}" aria-pressed="${ui.stage === st}"><b>${count(st)}</b><span>${NK.REQ_STATUS[st].label}</span></button>`).join('')}</div>
            ${l.key === 'compras' ? `<div class="flow__reject"><span>${NK.icon('circle-x')} Rechazadas por Compras: <b class="mono">${count('rechazada')}</b></span><button class="link-btn" data-stage="rechazada">Ver</button></div>` : ''}
          </div>`).join('')}
        </div>

        <section class="panel">
          <div class="toolbar">
            <div class="seg" role="group" aria-label="Vista">
              <button type="button" data-stage="abiertas" aria-pressed="${ui.stage === 'abiertas'}">Abiertas <span class="count">${open.length}</span></button>
              <button type="button" data-stage="todas" aria-pressed="${ui.stage === 'todas'}">Todas <span class="count">${R.length}</span></button>
            </div>
            <div class="field-search">${NK.icon('search')}<input type="search" id="rq-q" placeholder="Buscar folio, material o unidad" value="${esc(ui.q)}" aria-label="Buscar solicitud"></div>
            <span class="grow"></span>
            <span class="muted small" id="rq-count"></span>
          </div>
          <div class="table-wrap" id="rq-table"></div>
        </section>
      </div>`;
      NK.icons();

      const draw = () => {
        const q = ui.q.toLowerCase();
        const list = R.filter((r) => (ui.stage === 'todas' || (ui.stage === 'abiertas' ? !['recibida', 'rechazada'].includes(r.status) : r.status === ui.stage)) && (!q || [r.folio, r.desc, r.ref, r.item].join(' ').toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date));
        root.querySelector('#rq-count').textContent = `${list.length} solicitudes`;
        const box = root.querySelector('#rq-table');
        if (!list.length) { NK.mount(box, NK.empty('clipboard-check', 'Sin solicitudes en esta etapa', 'Cuando una solicitud llegue a esta etapa aparecerá aquí.')); return; }
        box.innerHTML = `<table class="table table--cards"><thead><tr><th>Folio</th><th>Material solicitado</th><th class="right">Cantidad</th><th>Relacionada con</th><th>Prioridad</th><th>Fecha</th><th>Estado</th><th><span class="sr-only">Abrir</span></th></tr></thead><tbody>
          ${list.map((r) => `<tr class="is-click" data-req="${r.folio}" tabindex="0">
            <td class="td-main"><span class="mono" style="font-weight:600">${r.folio}</span><span class="cell-sub">${r.by}</span></td>
            <td data-label="Material">${esc(r.desc)}<span class="cell-sub mono">${r.item}</span></td>
            <td data-label="Cantidad" class="right mono">${r.qty} <span class="muted">${r.unitLabel}</span></td>
            <td data-label="Relacionada con">${esc(r.ref)}</td>
            <td data-label="Prioridad">${NK.prio(r.prio)}</td>
            <td data-label="Fecha">${F.date(r.date)}</td>
            <td data-label="Estado">${NK.reqBadge(r.status)}</td>
            <td class="right td-hide-m">${NK.icon('chevron-right', 'row-go')}</td>
          </tr>`).join('')}</tbody></table>`;
        NK.icons();
        box.querySelectorAll('[data-req]').forEach((tr) => { tr.addEventListener('click', () => openReq(tr.dataset.req)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') openReq(tr.dataset.req); }); });
      };
      draw();
      root.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => { ui.stage = ui.stage === b.dataset.stage && !['abiertas', 'todas'].includes(b.dataset.stage) ? 'abiertas' : b.dataset.stage; root.querySelectorAll('[data-stage]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.stage === ui.stage)); draw(); }));
      root.querySelector('#rq-q').addEventListener('input', (e) => { ui.q = e.target.value; draw(); });
      root.querySelector('#btn-new-req').addEventListener('click', () => NK.newRequest());
      if (params.get('new')) NK.newRequest();
      if (params.get('r')) openReq(params.get('r'));
    },
  };

  function setStatus(r, status, text, by) {
    r.status = status;
    r.hist.push({ status, at: new Date().toISOString(), text, by });
    if (status === 'recibida') {
      const it = NK.store.item(r.item);
      if (it) { it.exist += r.qty; NK.store.state.movements.unshift({ at: new Date().toISOString(), code: it.code, type: 'entrada', qty: r.qty, ref: `${r.folio} · Compras`, by: 'Almacén' }); }
    }
    NK.store.log(NK.REQ_STATUS[status].icon, status === 'rechazada' ? 'danger' : status === 'recibida' ? 'ok' : 'brand', `<b>${r.folio}</b>: ${esc(text)}`);
    NK.store.save();
  }

  function openReq(folio) {
    const r = NK.store.request(folio);
    if (!r) return;
    const flow = NK.REQ_FLOW;
    const idx = r.status === 'rechazada' ? r.hist.filter((h) => h.status !== 'rechazada').length - 1 : flow.indexOf(r.status);
    const it = NK.store.item(r.item);
    const next = { enviada: ['revision', 'Poner en revisión'], revision: ['autorizada', 'Autorizar'], autorizada: ['compra', 'Generar orden de compra'], compra: ['recibida', 'Marcar como recibida'] }[r.status];
    const m = NK.modal({
      title: `Solicitud ${r.folio}`, icon: NK.REQ_STATUS[r.status].icon, size: 'lg',
      sub: `${esc(r.by)} · ${r.role} · ${F.date(r.date)}`,
      body: `
        <div class="status-track" aria-label="Avance de la solicitud">${flow.map((st, i) => `<div class="${r.status === 'rechazada' && i === idx + 1 ? 'is-rejected is-current' : i < idx || (i === idx && r.status === 'recibida') ? 'is-done' : i === idx ? 'is-current' : ''}">${r.status === 'rechazada' && i === idx + 1 ? 'Rechazada' : NK.REQ_STATUS[st].label}</div>`).join('')}</div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">${NK.reqBadge(r.status)}${NK.prio(r.prio)}</div>
        <dl class="kv" style="margin:0 0 16px">
          <div><dt>Material</dt><dd>${esc(r.desc)}</dd></div>
          <div><dt>Código</dt><dd class="mono">${r.item}</dd></div>
          <div><dt>Cantidad</dt><dd class="mono">${r.qty} ${r.unitLabel}</dd></div>
          <div><dt>Relacionada con</dt><dd>${esc(r.ref)}</dd></div>
          <div><dt>Existencia actual</dt><dd class="mono">${it ? `${it.exist} (mín. ${it.min})` : '—'}</dd></div>
          <div><dt>Costo de referencia</dt><dd class="mono">${r.estCost ? F.money(r.estCost) : '—'} <span class="muted small">(último precio)</span></dd></div>
        </dl>
        <div class="field" style="margin-bottom:16px"><span class="label">Justificación</span><p style="color:var(--ink-2)">${esc(r.why)}</p></div>
        <div class="field"><span class="label">Seguimiento</span>
          <ul class="timeline" style="padding:0">${r.hist.slice().reverse().map((h) => `<li><span class="tl-ic tl-ic--${h.status === 'rechazada' ? 'danger' : h.status === 'recibida' ? 'ok' : h.by === 'Compras' ? 'info' : 'brand'}">${NK.icon(NK.REQ_STATUS[h.status].icon)}</span><div><p><b>${esc(h.by)}</b> — ${esc(h.text)}</p><time>${F.date(h.at)} · ${F.time(h.at)}</time></div></li>`).join('')}</ul>
        </div>
        ${next || r.status === 'revision' ? `<div class="sim-box">
          <h4>${NK.icon('flask-conical')}Simulación de la respuesta de Compras</h4>
          <p>En el sistema real, estas acciones las realiza el área de Compras. El supervisor sólo da seguimiento. Aquí puede simularlas para ver el flujo completo.</p>
          <div class="btn-group">${next ? `<button class="btn btn--sm" data-sim="${next[0]}">${NK.icon(NK.REQ_STATUS[next[0]].icon)}${next[1]}</button>` : ''}${['enviada', 'revision'].includes(r.status) ? `<button class="btn btn--sm btn--danger" data-sim="rechazada">${NK.icon('circle-x')}Rechazar</button>` : ''}</div>
        </div>` : ''}`,
      foot: r.status === 'borrador'
        ? `<button class="btn btn--danger" data-del>${NK.icon('trash-2')}Eliminar borrador</button><span class="spacer"></span><button class="btn" data-close>Cerrar</button><button class="btn btn--primary" data-send>${NK.icon('send')}Enviar a Compras</button>`
        : `<span class="spacer"></span><button class="btn" data-close>Cerrar</button>`,
    });
    const send = m.el.querySelector('[data-send]');
    if (send) send.addEventListener('click', () => { setStatus(r, 'enviada', 'Enviada a Compras', 'D. Treviño'); m.close(); NK.toast(`${r.folio} enviada a Compras`, 'Compras recibirá la solicitud y le notificará cada cambio.', 'brand'); NK.refresh(); });
    const del = m.el.querySelector('[data-del]');
    if (del) del.addEventListener('click', async () => { if (await NK.confirm({ title: 'Eliminar borrador', text: `¿Desea eliminar el borrador ${r.folio}? Esta acción no se puede deshacer.`, ok: 'Eliminar', tone: 'danger', icon: 'trash-2' })) { const s = NK.store.state; s.requests = s.requests.filter((x) => x !== r); NK.store.save(); m.close(); NK.toast('Borrador eliminado', '', 'info'); NK.refresh(); } });
    m.el.querySelectorAll('[data-sim]').forEach((b) => b.addEventListener('click', () => {
      const st = b.dataset.sim;
      const text = { revision: 'Compras inició la revisión', autorizada: 'Autorizada por Compras', compra: 'Compras generó la orden de compra con el proveedor', recibida: 'Material recibido en almacén', rechazada: 'Compras rechazó la solicitud: se requiere mayor justificación' }[st];
      setStatus(r, st, text, st === 'recibida' ? 'Almacén' : 'Compras');
      m.close();
      NK.notify(`${r.folio}: ${NK.REQ_STATUS[st].label}`, st === 'recibida' ? `Se registró la entrada de ${r.qty} ${r.unitLabel} en inventario.` : `${esc(r.desc)} — ${text}.`, NK.REQ_STATUS[st].icon);
      NK.toast(`${r.folio}: ${NK.REQ_STATUS[st].label}`, st === 'recibida' ? 'La existencia del inventario se actualizó automáticamente.' : 'Se notificó al supervisor de taller.', st === 'rechazada' ? 'warn' : 'ok');
      NK.refresh();
      setTimeout(() => openReq(r.folio), 200);
    }));
  }

  // Nueva solicitud
  NK.newRequest = function (pre = {}) {
    const s = NK.store.state;
    const m = NK.modal({
      title: 'Nueva solicitud de material', icon: 'clipboard-plus', size: 'lg',
      sub: 'La solicitud llega directamente a Compras. Compras decide el proveedor y realiza la compra.',
      body: `<form class="form" novalidate>
        <div class="field"><label for="rq-item">Material</label><select id="rq-item" data-required><option value="">Seleccione del catálogo del almacén…</option>${s.inventory.map((i) => { const st = NK.stockState(i); return `<option value="${i.code}" ${pre.item === i.code ? 'selected' : ''}>${i.code} · ${esc(i.desc)}${st.key === 'low' || st.key === 'out' ? ' — ' + st.label.toLowerCase() : ''}</option>`; }).join('')}</select>${NK.fieldErr('Seleccione el material')}<span class="help" id="rq-help"></span></div>
        <div class="form-row">
          <div class="field"><label for="rq-qty">Cantidad</label><input id="rq-qty" type="number" min="1" value="${pre.qty || 1}" data-required inputmode="numeric">${NK.fieldErr('Indique la cantidad')}</div>
          <div class="field"><label for="rq-ref">Unidad u orden relacionada</label><select id="rq-ref"><option>Stock de taller</option><option>Programa preventivo</option>${s.orders.filter((o) => o.status !== 'terminado').map((o) => `<option ${pre.ref === `${o.folio} · ${o.unit}` ? 'selected' : ''}>${o.folio} · ${o.unit}</option>`).join('')}${s.units.map((u) => `<option ${pre.ref === u.id ? 'selected' : ''}>${u.id}</option>`).join('')}</select></div>
        </div>
        <div class="field"><span class="label">Prioridad</span><div class="radio-cards">${['baja', 'media', 'alta'].map((p) => `<label class="radio-card"><input type="radio" name="rq-prio" value="${p}" ${p === (pre.prio || 'media') ? 'checked' : ''}><span>${NK.PRIO[p]}</span></label>`).join('')}</div></div>
        <div class="field"><label for="rq-why">Justificación</label><textarea id="rq-why" data-required placeholder="¿Para qué se necesita y qué pasa si no llega a tiempo?"></textarea>${NK.fieldErr('Explique brevemente por qué se necesita')}<span class="help">Una buena justificación agiliza la autorización de Compras.</span></div>
        <div class="callout callout--brand">${NK.icon('info')}<div>El supervisor <strong>solicita</strong>; Compras <strong>valida, autoriza proveedor y compra</strong>. Recibirá una notificación en cada cambio de estado.</div></div>
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><span class="spacer"></span><button class="btn" data-save="borrador">${NK.icon('save')}Guardar borrador</button><button class="btn btn--primary" data-save="enviada">${NK.icon('send')}Enviar a Compras</button>`,
    });
    const sel = m.el.querySelector('#rq-item'), help = m.el.querySelector('#rq-help');
    const upd = () => { const it = NK.store.item(sel.value); help.textContent = it ? `Existencia ${it.exist} ${it.unit} · reservado ${it.reserved} · mínimo ${it.min}` : ''; };
    sel.addEventListener('change', upd); upd();
    m.el.querySelectorAll('[data-required]').forEach((x) => x.addEventListener('input', () => x.closest('.field').classList.remove('is-invalid')));
    m.el.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => {
      if (!NK.validate(m.el.querySelector('form'))) return;
      const it = NK.store.item(sel.value);
      const status = b.dataset.save;
      const folio = NK.store.nextFolio('sm');
      const now = new Date().toISOString();
      const r = { folio, by: 'Daniel Treviño', role: 'Supervisor de Taller', date: now, item: it.code, desc: it.desc, unitLabel: it.unit, qty: Number(m.el.querySelector('#rq-qty').value), ref: m.el.querySelector('#rq-ref').value, prio: m.el.querySelector('input[name="rq-prio"]:checked').value, status: 'borrador', why: m.el.querySelector('#rq-why').value.trim(), hist: [{ status: 'borrador', at: now, text: 'Creada como borrador', by: 'D. Treviño' }], estCost: it.cost * Number(m.el.querySelector('#rq-qty').value) };
      s.requests.unshift(r);
      if (status === 'enviada') setStatus(r, 'enviada', 'Enviada a Compras', 'D. Treviño'); else { NK.store.log('file-pen', 'info', `Borrador de solicitud <b>${folio}</b> guardado`); NK.store.save(); }
      m.close();
      NK.toast(status === 'enviada' ? `${folio} enviada a Compras` : `Borrador ${folio} guardado`, status === 'enviada' ? 'Puede dar seguimiento desde Solicitudes de material.' : 'Puede enviarlo cuando esté listo.', status === 'enviada' ? 'brand' : 'info');
      if (location.hash.startsWith('#/solicitudes')) NK.refresh(); else location.hash = '#/solicitudes';
    }));
  };
})();
