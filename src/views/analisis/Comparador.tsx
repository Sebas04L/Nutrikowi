// Comparador visual de viajes: composición del tiempo por etapa, diferencias por actividad
// e indicadores lado a lado, con advertencias cuando los viajes no son comparables.

import { useMemo } from 'react';
import { claveComparable, composicionEtapas, diferenciasContexto, METRICAS_COMPARADOR, type ViajeCalc } from '../../lib/analisis';
import { SEGMENTOS_LISTA } from '../../lib/proceso';
import { nombres } from '../../lib/nombres';
import { fmtDur, fmtFechaCorta } from '../../lib/tiempo';
import { useApp } from '../../state/Contexto';
import { Aviso, Boton, Selector } from '../../components/ui';
import { Icono } from '../../components/Iconos';
import { formato } from './comun';

const COLOR_PARTE: Record<string, string> = {
  planta_espera: 'var(--c-espera)', planta: 'var(--g800)', ida: 'var(--c-traslado)', granja_espera: 'var(--c-espera)', granja: 'var(--g600)', regreso: 'var(--c-traslado)',
};

export function Comparador({ calcs, todos }: { calcs: ViajeCalc[]; todos: ViajeCalc[] }) {
  const { cat, compararIds, setCompararIds, setActivo, irA } = useApp();
  const sel = compararIds.map((id) => todos.find((c) => c.viaje.id === id)).filter((x): x is ViajeCalc => !!x);
  const opciones = calcs.filter((c) => !compararIds.includes(c.viaje.id));
  const contexto = useMemo(() => (sel.length >= 2 ? diferenciasContexto(sel.map((c) => c.viaje)) : []), [sel]);
  const maxTotal = Math.max(1, ...sel.map((c) => composicionEtapas(c.r).reduce((t, p) => t + (p.min ?? 0), 0)));
  const ref = sel[0];
  const equivalentes = ref ? calcs.filter((c) => c.viaje.id !== ref.viaje.id && claveComparable(c.viaje) === claveComparable(ref.viaje) && !compararIds.includes(c.viaje.id)) : [];

  return (
    <>
      <section className="tarjeta" style={{ marginTop: 0 }}>
        <header className="tarjeta__cab">
          <h2><Icono n="comparar" size={18} />Viajes a comparar</h2>
          <span className="tarjeta__ayuda">Hasta 6 viajes. El primero es la referencia para las diferencias.</span>
        </header>
        <div className="comp-viajes">
          {sel.map((c, i) => {
            const n = nombres(c.viaje, cat);
            return (
              <span key={c.viaje.id} className="comp-tag" title={`${n.unidad} · ${n.ruta}`}>
                {i === 0 && <span className="pastilla pastilla--verde" style={{ margin: 0 }}>Referencia</span>}
                {c.viaje.config.folio} <span className="muted">· {fmtFechaCorta(c.viaje.config.fecha)} · {n.unidad || 'sin unidad'}</span>
                <button className="icono-btn icono-btn--sm" aria-label={`Quitar ${c.viaje.config.folio}`} onClick={() => setCompararIds(compararIds.filter((x) => x !== c.viaje.id))}><Icono n="cerrar" size={12} /></button>
              </span>
            );
          })}
          {sel.length < 6 && (
            <span style={{ minWidth: 260 }}>
              <Selector value="" onChange={(x) => x && setCompararIds([...compararIds, x])} vacio="Agregar viaje…"
                opciones={opciones.map((c) => ({ valor: c.viaje.id, texto: `${c.viaje.config.folio} · ${fmtFechaCorta(c.viaje.config.fecha)} · ${nombres(c.viaje, cat).unidad} · ${nombres(c.viaje, cat).ruta}` }))} />
            </span>
          )}
          {ref && equivalentes.length > 0 && sel.length < 6 && (
            <Boton tam="sm" variante="fantasma" icono="capas" onClick={() => setCompararIds([...compararIds, ...equivalentes.slice(0, 6 - sel.length).map((c) => c.viaje.id)])}>
              Agregar viajes equivalentes ({equivalentes.length})
            </Boton>
          )}
          {sel.length > 0 && <button className="enlace-btn" onClick={() => setCompararIds([])}>Limpiar</button>}
        </div>
        {sel.length < 2 && <p className="nota">Selecciona al menos dos viajes (aquí o marcándolos en la lista de Viajes). “Viajes equivalentes” agrega los de la misma ruta y configuración que la referencia.</p>}
        {contexto.length > 0 && (
          <Aviso tono="ambar">
            <b>Contexto distinto:</b> {contexto.join(' · ')}. Las diferencias pueden deberse a estas condiciones y no a la operación; evita conclusiones directas.
          </Aviso>
        )}
        {sel.length >= 2 && contexto.length === 0 && <Aviso tono="verde">Misma ruta, granja, unidad, configuración, alimento y carga similar: comparación equivalente.</Aviso>}
      </section>

      {sel.length >= 2 && (
        <>
          <section className="tarjeta">
            <header className="tarjeta__cab">
              <h2>Composición del tiempo por etapa</h2>
              <div className="reparto__ley" style={{ margin: 0 }}>
                <span><i style={{ background: 'var(--c-espera)' }} />Espera</span>
                <span><i style={{ background: 'var(--g800)' }} />Planta</span>
                <span><i style={{ background: 'var(--c-traslado)' }} />Traslado</span>
                <span><i style={{ background: 'var(--g600)' }} />Granja</span>
                <span><i className="cat-sinRegistro" />Sin dato</span>
              </div>
            </header>
            <div className="comp-filas">
              {sel.map((c) => {
                const partes = composicionEtapas(c.r);
                const suma = partes.reduce((t, p) => t + (p.min ?? 0), 0);
                const faltan = partes.filter((p) => p.min == null);
                const n = nombres(c.viaje, cat);
                return (
                  <div key={c.viaje.id} className="comp-fila">
                    <div className="comp-fila__et">
                      <button className="enlace-btn enlace-btn--fuerte" onClick={() => { setActivo(c.viaje.id); irA('mapa'); }}>{c.viaje.config.folio}</button>
                      <small>{fmtFechaCorta(c.viaje.config.fecha)} · {n.unidad} · {n.ruta}</small>
                    </div>
                    <div className="comp-apilada" style={{ width: `${Math.max(12, (suma / maxTotal) * 100)}%` }}>
                      {partes.map((p) => (p.min ? (
                        <div key={p.id} className="comp-apilada__p" style={{ flexGrow: p.min, background: COLOR_PARTE[p.id] }} title={`${p.label}: ${fmtDur(p.min)}`}>
                          {p.min / maxTotal > 0.07 ? fmtDur(p.min, { corto: true }) : ''}
                        </div>
                      ) : null))}
                      {faltan.length > 0 && <div className="comp-apilada__p comp-apilada__p--vacio" style={{ flexGrow: Math.max(maxTotal * 0.08, 1) }} title={`Sin dato: ${faltan.map((p) => p.label).join(', ')}`}>sin dato</div>}
                    </div>
                    <div className="comp-fila__total">{c.r.total != null ? fmtDur(c.r.total, { corto: true }) : '—'}<small>{c.r.total != null ? 'ciclo' : 'ciclo incompleto'}</small></div>
                  </div>
                );
              })}
            </div>
            <p className="nota">Barras en la misma escala de tiempo. Espera en planta = fila de lavado + autorización; espera en granja = espera para descargar.</p>
          </section>

          {sel.slice(1).map((c) => <Diferencias key={c.viaje.id} a={ref} b={c} />)}

          <section className="tarjeta">
            <header className="tarjeta__cab"><h2>Indicadores lado a lado</h2><span className="tarjeta__ayuda"><span className="est-marca">EST</span> = valor estimado, no medido</span></header>
            <div className="tabla-envoltura">
              <table className="tabla tabla--compacta">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    {sel.map((c) => <th key={c.viaje.id} className="num">{c.viaje.config.folio}</th>)}
                    {sel.length === 2 && <th className="num">Diferencia</th>}
                  </tr>
                </thead>
                <tbody>
                  {(['Tiempo', 'Combustible y costo', 'Eventos'] as const).map((g) => [
                    <tr key={g} className="fila-fuerte"><td colSpan={sel.length + 2}>{g}</td></tr>,
                    ...METRICAS_COMPARADOR.filter((m) => m.grupo === g).map((m) => {
                      const ds = sel.map((c) => m.dato(c.r));
                      const dif = sel.length === 2 && ds[0].v != null && ds[1].v != null ? ds[1].v - ds[0].v : null;
                      return (
                        <tr key={m.id}>
                          <td>{m.label}</td>
                          {ds.map((d, i) => <td key={i} className="num">{d.v != null ? <>{formato(d.v, m.formato)}{d.est && <span className="est-marca">EST</span>}</> : <span className="pend">—</span>}</td>)}
                          {sel.length === 2 && <td className="num">{dif != null ? `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${formato(Math.abs(dif), m.formato)}${ds.some((d) => d.est) ? ' (incluye estimado)' : ''}` : '—'}</td>}
                        </tr>
                      );
                    }),
                  ])}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/** Diferencia por actividad de B respecto a la referencia A. */
function Diferencias({ a, b }: { a: ViajeCalc; b: ViajeCalc }) {
  const filas = SEGMENTOS_LISTA.map((s) => {
    const x = a.r.segmentos[s.id];
    const y = b.r.segmentos[s.id];
    const va = x.aplica === false ? 0 : x.min;
    const vb = y.aplica === false ? 0 : y.min;
    return { s, va, vb, dif: va != null && vb != null ? vb - va : null };
  }).filter((f) => f.dif != null && Math.abs(f.dif) >= 1).sort((p, q) => Math.abs(q.dif!) - Math.abs(p.dif!));
  const sinDato = SEGMENTOS_LISTA.filter((s) => (a.r.segmentos[s.id].aplica !== false && a.r.segmentos[s.id].min == null) || (b.r.segmentos[s.id].aplica !== false && b.r.segmentos[s.id].min == null));
  const difTotal = a.r.total != null && b.r.total != null ? b.r.total - a.r.total : null;
  const explicada = filas.reduce((t, f) => t + f.dif!, 0);
  const maxAbs = Math.max(1, ...filas.map((f) => Math.abs(f.dif!)));
  return (
    <section className="tarjeta">
      <header className="tarjeta__cab">
        <h2>¿Qué etapas explican la diferencia? <span className="muted" style={{ fontWeight: 500 }}>{b.viaje.config.folio} frente a {a.viaje.config.folio}</span></h2>
        {difTotal != null && <span className="pastilla pastilla--neutro">Ciclo: {difTotal > 0 ? '+' : difTotal < 0 ? '−' : ''}{fmtDur(Math.abs(difTotal))}</span>}
      </header>
      {filas.length === 0 ? <p className="nota">No hay actividades con dato en ambos viajes y diferencia de al menos 1 minuto.</p> : (
        <ul className="comp-diferencias">
          {filas.slice(0, 12).map((f) => (
            <li key={f.s.id}>
              <span>{f.s.label}<span className="muted" style={{ fontSize: 11.5 }}> · {fmtDur(f.va, { corto: true })} → {fmtDur(f.vb, { corto: true })}</span></span>
              <span className="dif-eje">
                <span className={`dif-barra ${f.dif! > 0 ? 'dif-barra--mas' : 'dif-barra--menos'}`} style={{ width: `${(Math.abs(f.dif!) / maxAbs) * 50}%` }} />
              </span>
              <span className="num" style={{ textAlign: 'right', fontWeight: 650 }}>{f.dif! > 0 ? '+' : '−'}{fmtDur(Math.abs(f.dif!), { corto: true })}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="nota">
        Barras hacia la derecha: {b.viaje.config.folio} tardó más; hacia la izquierda: tardó menos. Suma de diferencias por actividad: {explicada >= 0 ? '+' : '−'}{fmtDur(Math.abs(explicada))}
        {difTotal != null && Math.abs(difTotal - explicada) >= 1 && ` · el resto (${difTotal - explicada > 0 ? '+' : '−'}${fmtDur(Math.abs(difTotal - explicada))}) corresponde a tiempo entre actividades, solapes o actividades sin registrar`}.
        {sinDato.length > 0 && ` Sin dato en alguno de los dos viajes: ${sinDato.slice(0, 5).map((s) => s.label).join(', ')}${sinDato.length > 5 ? '…' : ''}.`}
      </p>
    </section>
  );
}
