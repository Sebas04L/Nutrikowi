// Análisis del proceso: dónde se concentra el tiempo, esperas, variabilidad, rutas,
// incidencias, rendimiento, costos e información faltante. Cada gráfico permite ver
// los viajes que originan su resultado.

import { useMemo, useState } from 'react';
import type { ClaseEvento } from '../../types';
import { composicionEtapas, desviacion, estad, mediana, porActividad, type ViajeCalc } from '../../lib/analisis';
import { claseDe, esIncidencia, ETIQUETA_CLASE } from '../../lib/eventos';
import { ETIQUETA_CATEGORIA, NODOS, NODOS_LISTA, ORDEN_CATEGORIAS, SEGMENTOS_LISTA } from '../../lib/proceso';
import { fmtDur, fmtFechaCorta } from '../../lib/tiempo';
import { useApp } from '../../state/Contexto';
import { MapaRecorrido, Leyenda, type DatoNodoMapa } from '../../components/MapaRecorrido';
import { BarraProporcion, Segmentado } from '../../components/ui';
import { Icono } from '../../components/Iconos';
import { mxn, num, OrigenViajes, type ItemOrigen } from './comun';

type MetricaCalor = 'prom' | 'mediana' | 'espera' | 'cv';

export function Proceso({ calcs }: { calcs: ViajeCalc[] }) {
  const { cat, irA, setActivo } = useApp();
  const [metrica, setMetrica] = useState<MetricaCalor>('prom');
  const [selNodo, setSelNodo] = useState<string | null>(null);
  const [origen, setOrigen] = useState<{ titulo: string; items: ItemOrigen[]; nodo?: string } | null>(null);
  const filas = useMemo(() => porActividad(calcs), [calcs]);

  // Mapa de calor
  const datosCalor = useMemo(() => {
    const val = (f: (typeof filas)[number]) => {
      if (metrica === 'prom') return f.dur.prom;
      if (metrica === 'mediana') return f.dur.mediana;
      if (metrica === 'espera') return f.espera.prom;
      const xs = calcs.map((c) => c.r.nodos[f.nodo].min).filter((x): x is number => x != null);
      const sd = desviacion(xs);
      return xs.length >= 3 && sd != null && f.dur.prom ? sd / f.dur.prom : null;
    };
    const max = Math.max(0.0001, ...filas.map((f) => val(f) ?? 0));
    const d: Record<string, DatoNodoMapa> = {};
    for (const n of NODOS_LISTA) {
      const f = filas.find((x) => x.nodo === n.id);
      if (!f) {
        const si = calcs.filter((c) => n.decide && c.viaje.v[n.decide] === true).length;
        const no = calcs.filter((c) => n.decide && c.viaje.v[n.decide] === false).length;
        d[n.id] = { estado: 'calor', valor: `${si} sí · ${no} no`, intensidad: 0 };
        continue;
      }
      const x = val(f);
      const e = metrica === 'espera' ? f.espera : f.dur;
      d[n.id] = {
        estado: 'calor', valor: x != null ? (metrica === 'cv' ? `CV ${(x * 100).toFixed(0)} %` : fmtDur(x, { corto: true })) : n.tipo === 'hito' ? '—' : 'Sin datos',
        pendiente: x == null, intensidad: x != null ? x / max : 0, sub: e.n ? `n=${e.n}` : undefined, incidencias: f.incidencias,
        titulo: `${n.titulo}. Aplica en ${f.aplicaEn} viaje(s); ${e.n} con dato.`,
      };
    }
    return d;
  }, [filas, metrica, calcs]);

  const drillNodo = (id: string) => {
    setSelNodo(id);
    const n = NODOS[id];
    setOrigen({
      titulo: n.titulo, nodo: id,
      items: calcs.filter((c) => c.r.nodos[id].aplica !== false).map((c) => ({
        calc: c,
        valor: n.decide ? (c.viaje.v[n.decide] === true ? 'Sí' : c.viaje.v[n.decide] === false ? 'No' : '—') : c.r.nodos[id].min != null ? fmtDur(c.r.nodos[id].min, { corto: true }) : 'sin dato',
      })),
    });
  };

  // Distribución promedio del ciclo (6 partes)
  const partes = useMemo(() => {
    if (!calcs.length) return [];
    const comps = calcs.map((c) => composicionEtapas(c.r));
    return comps[0].map((p, i) => {
      const e = estad(comps.map((cp) => cp[i].min));
      return { id: p.id, label: p.label, cat: p.cat, prom: e.prom, n: e.n };
    });
  }, [calcs]);
  const totalPartes = partes.reduce((t, p) => t + (p.prom ?? 0), 0);

  // Operativo vs espera (ciclos con hora de llegada y regreso)
  const ciclos = calcs.filter((c) => c.r.rangoReal === 'ciclo' && c.r.real).sort((a, b) => a.viaje.config.fecha.localeCompare(b.viaje.config.fecha));
  const repartoProm = ORDEN_CATEGORIAS.map((k) => ({ k, v: ciclos.length ? ciclos.reduce((t, c) => t + c.r.real![k], 0) / ciclos.length : 0 }));
  const sumaReparto = repartoProm.reduce((t, x) => t + x.v, 0);

  // Variabilidad por segmento (n ≥ 3)
  const variab = SEGMENTOS_LISTA.map((s) => {
    const xs = calcs.map((c) => c.r.segmentos[s.id]).filter((x) => x.aplica !== false && x.min != null).map((x) => x.min!);
    const e = estad(xs);
    const sd = desviacion(xs);
    return { s, n: xs.length, med: mediana(xs), min: e.min, max: e.max, cv: xs.length >= 3 && sd != null && e.prom ? sd / e.prom : null };
  }).filter((x) => x.cv != null).sort((a, b) => b.cv! - a.cv!);
  const maxVar = Math.max(1, ...variab.map((x) => x.max ?? 0));

  // Por ruta
  const porRuta = useMemo(() => {
    const m = new Map<string, ViajeCalc[]>();
    for (const c of calcs) m.set(c.viaje.config.rutaId || '—', [...(m.get(c.viaje.config.rutaId || '—') ?? []), c]);
    return [...m.entries()].map(([id, cs]) => {
      const md = (f: (c: ViajeCalc) => number | null) => mediana(cs.map(f).filter((x): x is number => x != null));
      const ruta = cat.rutas.find((r) => r.id === id);
      return { id, nombre: ruta?.nombre ?? 'Sin ruta', km: ruta?.km ?? null, cs, ciclo: md((c) => c.r.total), planta: md((c) => c.r.etapas.planta), tray: md((c) => c.r.traslado), granja: md((c) => c.r.etapas.granja), espera: md((c) => c.r.espera) };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [calcs, cat.rutas]);

  // Incidencias por actividad y clase
  const incPorClase: Record<ClaseEvento, number> = { necesaria: 0, operativa: 0, demora: 0, falla: 0, otra: 0 };
  for (const c of calcs) for (const e of c.viaje.eventos) incPorClase[claseDe(e.tipo, cat)]++;
  const incPorNodo = NODOS_LISTA.map((n) => {
    const evs = calcs.flatMap((c) => c.viaje.eventos.filter((e) => e.nodo === n.id));
    const inc = evs.filter((e) => esIncidencia(claseDe(e.tipo, cat))).length;
    return { n, k: evs.length, inc, par: evs.length - inc };
  }).filter((x) => x.k > 0).sort((a, b) => b.k - a.k);
  const sinNodo = calcs.reduce((t, c) => t + c.viaje.eventos.filter((e) => !e.nodo).length, 0);
  const maxInc = Math.max(1, ...incPorNodo.map((x) => x.k), sinNodo);

  // Rendimiento en el tiempo
  const puntosRend = calcs
    .map((c) => ({ c, v: c.r.combustible.rendimiento ?? c.r.combustible.rendimientoEstimado, est: c.r.combustible.rendimiento == null }))
    .filter((x) => x.v != null)
    .sort((a, b) => (a.c.r.inicio ?? 0) - (b.c.r.inicio ?? 0) || a.c.viaje.config.fecha.localeCompare(b.c.viaje.config.fecha));

  // Costos por viaje
  const costos = calcs.map((c) => ({ c, costo: c.r.combustible.costoConsumido, costoT: c.r.combustible.costoPorTon }))
    .filter((x) => x.costo != null).sort((a, b) => a.c.viaje.config.fecha.localeCompare(b.c.viaje.config.fecha));
  const maxCosto = Math.max(1, ...costos.map((x) => x.costo!));

  // Información faltante
  const grupos = calcs[0]?.q.grupos.map((g) => g.id) ?? [];
  const faltaPorGrupo = grupos.map((id) => {
    const g0 = calcs[0].q.grupos.find((g) => g.id === id)!;
    const con = calcs.filter((c) => (c.q.grupos.find((g) => g.id === id)?.faltan.length ?? 0) > 0);
    const est = calcs.filter((c) => (c.q.grupos.find((g) => g.id === id)?.estimados.length ?? 0) > 0);
    return { id, titulo: g0.titulo, con, est };
  });

  const abrir = (id: string) => { setActivo(id); irA('mapa'); };

  return (
    <>
      <section className="escena-tarjeta">
        <header className="escena-tarjeta__cab">
          <h2><Icono n="mapa" size={18} />¿Dónde se concentra el tiempo?</h2>
          <Segmentado<MetricaCalor> value={metrica} onChange={setMetrica} opciones={[{ valor: 'prom', texto: 'Promedio' }, { valor: 'mediana', texto: 'Mediana' }, { valor: 'espera', texto: 'Esperas' }, { valor: 'cv', texto: 'Variabilidad' }]} />
        </header>
        <p className="nota" style={{ padding: '0 20px' }}>
          Intensidad proporcional al valor de cada actividad en {calcs.length} viaje(s). {metrica === 'cv' ? 'Variabilidad = desviación estándar ÷ promedio (requiere al menos 3 viajes con dato).' : 'Selecciona una estación para ver los viajes que la originan.'}
        </p>
        <MapaRecorrido datos={datosCalor} decisiones={{}} seleccionado={selNodo} onSelect={drillNodo} calor />
        {origen?.nodo && <div style={{ padding: '0 20px 14px' }}><OrigenViajes titulo={origen.titulo} items={origen.items} nodo={origen.nodo} onCerrar={() => { setOrigen(null); setSelNodo(null); }} /></div>}
        <Leyenda calor />
      </section>

      <div className="rejilla-2">
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>¿Qué etapa consume más tiempo?</h2><span className="tarjeta__ayuda">Promedio por viaje con dato</span></header>
          {totalPartes > 0 ? (
            <>
              <BarraProporcion alto={16} partes={partes.map((p) => ({ valor: p.prom ?? 0, clase: `cat-${p.cat}`, titulo: `${p.label}: ${fmtDur(p.prom)}` }))} />
              <ul className="barras-h" style={{ marginTop: 12 }}>
                {[...partes].sort((a, b) => (b.prom ?? -1) - (a.prom ?? -1)).map((p) => (
                  <li key={p.id} className={`clicable ${origen?.titulo === p.label ? 'sel' : ''}`} onClick={() => {
                    const i = partes.findIndex((x) => x.id === p.id);
                    setOrigen({ titulo: p.label, items: calcs.map((c) => ({ calc: c, valor: composicionEtapas(c.r)[i].min })).filter((x) => x.valor != null).map((x) => ({ calc: x.calc, valor: fmtDur(x.valor, { corto: true }) })) });
                  }}>
                    <span className="barras-h__et"><i className={`punto cat-${p.cat}`} />{p.label}</span>
                    <span className="barras-h__pista"><span className={`barras-h__barra barras-h__barra--${p.cat === 'operativo' ? 'op' : p.cat}`} style={{ width: `${((p.prom ?? 0) / Math.max(...partes.map((x) => x.prom ?? 0))) * 100}%`, background: `var(--c-${p.cat})` }} /></span>
                    <span className="barras-h__val">{fmtDur(p.prom, { corto: true })}<small>{p.prom != null ? `${Math.round((p.prom / totalPartes) * 100)} % · n=${p.n}` : 'sin dato'}</small></span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="nota">Se necesitan viajes con horarios de etapa.</p>}
          {origen && !origen.nodo && partes.some((p) => p.label === origen.titulo) && <OrigenViajes titulo={origen.titulo} items={origen.items} onCerrar={() => setOrigen(null)} />}
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>Tiempo operativo frente a espera</h2><span className="tarjeta__ayuda">{ciclos.length} ciclo(s) completos · sin duplicar solapes</span></header>
          {ciclos.length ? (
            <>
              <BarraProporcion alto={16} partes={repartoProm.map((x) => ({ valor: x.v, clase: `cat-${x.k}`, titulo: `${ETIQUETA_CATEGORIA[x.k]}: ${fmtDur(x.v)}` }))} />
              <div className="reparto__ley" style={{ marginBottom: 10 }}>
                {repartoProm.filter((x) => x.v > 0).map((x) => <span key={x.k}><i className={`cat-${x.k}`} />{ETIQUETA_CATEGORIA[x.k]} <b>{Math.round((x.v / sumaReparto) * 100)} %</b></span>)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
                {ciclos.map((c) => (
                  <button key={c.viaje.id} type="button" onClick={() => abrir(c.viaje.id)} title="Abrir en el mapa"
                    style={{ display: 'grid', gridTemplateColumns: '92px 1fr 64px', gap: 8, alignItems: 'center', border: 0, background: 'none', padding: '2px 0', textAlign: 'left', fontSize: 12 }}>
                    <span className="num" style={{ fontWeight: 650 }}>{c.viaje.config.folio}</span>
                    <BarraProporcion alto={10} partes={ORDEN_CATEGORIAS.map((k) => ({ valor: c.r.real![k], clase: `cat-${k}`, titulo: `${ETIQUETA_CATEGORIA[k]}: ${fmtDur(c.r.real![k])}` }))} />
                    <span className="num muted" style={{ textAlign: 'right' }}>{fmtDur(c.r.total, { corto: true })}</span>
                  </button>
                ))}
              </div>
            </>
          ) : <p className="nota">Se necesita al menos un ciclo con hora de llegada a planta y hora de regreso.</p>}
        </section>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>¿Qué actividades varían más entre viajes?</h2><span className="tarjeta__ayuda">Rango mín–máx · CV = desviación ÷ promedio</span></header>
          {variab.length === 0 ? <p className="nota">Se necesitan al menos 3 viajes con dato por actividad.</p> : (
            <ul className="barras-h">
              {variab.slice(0, 9).map((x) => (
                <li key={x.s.id} className="clicable" onClick={() => setOrigen({ titulo: x.s.label, items: calcs.filter((c) => c.r.segmentos[x.s.id].min != null).map((c) => ({ calc: c, valor: fmtDur(c.r.segmentos[x.s.id].min, { corto: true }) })) })}
                  title={`Mediana ${fmtDur(x.med)} · rango ${fmtDur(x.min)}–${fmtDur(x.max)} · n=${x.n}`}>
                  <span className="barras-h__et">{x.s.label}</span>
                  <span className="barras-h__pista">
                    <span className="barras-h__rango" style={{ left: `${((x.min ?? 0) / maxVar) * 100}%`, width: `${(((x.max ?? 0) - (x.min ?? 0)) / maxVar) * 100}%`, background: `color-mix(in srgb, var(--c-${x.s.categoria}) 55%, transparent)` }} />
                    <span style={{ position: 'absolute', top: 1, bottom: 1, width: 3, borderRadius: 2, background: 'var(--ink)', left: `calc(${((x.med ?? 0) / maxVar) * 100}% - 1px)` }} />
                  </span>
                  <span className="barras-h__val">CV {Math.round(x.cv! * 100)} %<small>{fmtDur(x.min, { corto: true })}–{fmtDur(x.max, { corto: true })} · n={x.n}</small></span>
                </li>
              ))}
            </ul>
          )}
          <p className="nota">Una variabilidad alta indica tiempos poco predecibles; revisa si se trata de excepciones justificadas antes de concluir.</p>
          {origen && !origen.nodo && variab.some((x) => x.s.label === origen.titulo) && <OrigenViajes titulo={origen.titulo} items={origen.items} onCerrar={() => setOrigen(null)} />}
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>¿Qué rutas presentan diferencias?</h2><span className="tarjeta__ayuda">Medianas por ruta · orden alfabético</span></header>
          <div className="tabla-envoltura">
            <table className="tabla tabla--compacta">
              <thead><tr><th>Ruta</th><th className="num">Viajes</th><th className="num">Ciclo</th><th className="num">Planta</th><th className="num">Espera</th><th className="num">Trayecto</th><th className="num">Granja</th></tr></thead>
              <tbody>
                {porRuta.map((x) => (
                  <tr key={x.id} className="clicable" onClick={() => setOrigen({ titulo: `Ruta: ${x.nombre}`, items: x.cs.map((c) => ({ calc: c, valor: c.r.total != null ? fmtDur(c.r.total, { corto: true }) : 'ciclo incompleto' })) })}>
                    <td>{x.nombre}<div className="nota-tabla">{x.km != null ? `${x.km} km` : 'km sin registrar'}</div></td>
                    <td className="num">{x.cs.length}</td><td className="num">{fmtDur(x.ciclo, { corto: true })}</td><td className="num">{fmtDur(x.planta, { corto: true })}</td>
                    <td className="num">{fmtDur(x.espera, { corto: true })}</td><td className="num">{fmtDur(x.tray, { corto: true })}</td><td className="num">{fmtDur(x.granja, { corto: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nota">Las rutas difieren en distancia y accesos: el trayecto no es comparable entre rutas; planta, espera y granja sí pueden compararse con cautela.</p>
          {origen && !origen.nodo && origen.titulo.startsWith('Ruta:') && <OrigenViajes titulo={origen.titulo} items={origen.items} onCerrar={() => setOrigen(null)} />}
        </section>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>Frecuencia de incidencias y paradas</h2>
            <div className="reparto__ley" style={{ margin: 0 }}><span><i className="cat-incidencia" />Incidencias</span><span><i className="cat-parada" />Paradas necesarias u operativas</span></div>
          </header>
          <div className="reparto__ley" style={{ marginBottom: 10 }}>
            {(Object.keys(incPorClase) as ClaseEvento[]).filter((k) => incPorClase[k]).map((k) => <span key={k}><b>{incPorClase[k]}</b> {ETIQUETA_CLASE[k].toLowerCase()}</span>)}
          </div>
          {incPorNodo.length === 0 && sinNodo === 0 ? <p className="nota">Sin eventos registrados.</p> : (
            <ul className="barras-h">
              {incPorNodo.map(({ n, k, inc, par }) => (
                <li key={n.id} className="clicable" onClick={() => setOrigen({ titulo: `Eventos en ${n.corto}`, nodo: n.id, items: calcs.filter((c) => c.viaje.eventos.some((e) => e.nodo === n.id)).map((c) => ({ calc: c, valor: `${c.viaje.eventos.filter((e) => e.nodo === n.id).length}`, nota: c.viaje.eventos.filter((e) => e.nodo === n.id).map((e) => e.tipo).join(', ') })) })}>
                  <span className="barras-h__et"><b>{n.paso}</b>{n.corto}</span>
                  <span className="barras-h__pista" style={{ display: 'flex', gap: 2 }}>
                    {inc > 0 && <span className="barras-h__barra barras-h__barra--incidencia" style={{ width: `${(inc / maxInc) * 100}%`, borderRadius: 0 }} title={`${inc} incidencia(s)`} />}
                    {par > 0 && <span className="barras-h__barra barras-h__barra--parada" style={{ width: `${(par / maxInc) * 100}%` }} title={`${par} parada(s) necesarias u operativas`} />}
                  </span>
                  <span className="barras-h__val">{k}<small>{inc} inc. · {par} par.</small></span>
                </li>
              ))}
              {sinNodo > 0 && (
                <li><span className="barras-h__et muted">Sin actividad vinculada</span><span className="barras-h__pista"><span className="barras-h__barra barras-h__barra--hito" style={{ width: `${(sinNodo / maxInc) * 100}%` }} /></span><span className="barras-h__val">{sinNodo}</span></li>
              )}
            </ul>
          )}
          {origen?.nodo && origen.titulo.startsWith('Eventos en') && <OrigenViajes titulo={origen.titulo} items={origen.items} nodo={origen.nodo} onCerrar={() => setOrigen(null)} />}
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>Evolución del rendimiento de combustible</h2><span className="tarjeta__ayuda">● medido · ○ estimado</span></header>
          <GraficoRendimiento puntos={puntosRend.map((p) => ({ id: p.c.viaje.id, etq: `${p.c.viaje.config.folio} · ${fmtFechaCorta(p.c.viaje.config.fecha)}`, v: p.v!, est: p.est }))} onAbrir={abrir} />
        </section>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>Costo de combustible por viaje</h2><span className="tarjeta__ayuda">Consumo medido × precio · {costos.length} de {calcs.length} viajes</span></header>
          {costos.length === 0 ? <p className="nota">Sin viajes con consumo medido y precio.</p> : (
            <ul className="barras-h">
              {costos.map(({ c, costo, costoT }) => (
                <li key={c.viaje.id} className="clicable" onClick={() => abrir(c.viaje.id)} title="Abrir en el mapa">
                  <span className="barras-h__et">{c.viaje.config.folio} <span className="muted" style={{ fontSize: 11 }}>{fmtFechaCorta(c.viaje.config.fecha)}</span></span>
                  <span className="barras-h__pista"><span className="barras-h__barra" style={{ width: `${(costo! / maxCosto) * 100}%`, background: 'var(--g800)' }} /></span>
                  <span className="barras-h__val">{mxn(costo)}<small>{costoT != null ? `${mxn(costoT)}/t` : 'sin costo/t'}</small></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>¿Qué información falta para un análisis confiable?</h2><button className="enlace-btn" onClick={() => irA('viajes')}>Ir a la revisión de datos</button></header>
          <table className="tabla tabla--compacta">
            <thead><tr><th>Información</th><th className="num">Viajes con faltantes</th><th className="num">Con datos estimados</th></tr></thead>
            <tbody>
              {faltaPorGrupo.map((g) => (
                <tr key={g.id} className="clicable" onClick={() => setOrigen({ titulo: `Faltan: ${g.titulo}`, items: g.con.map((c) => ({ calc: c, valor: `${c.q.grupos.find((x) => x.id === g.id)!.faltan.length} dato(s)` })) })}>
                  <td>{g.titulo}</td>
                  <td className="num"><span className="mini-barra"><span style={{ width: `${(g.con.length / Math.max(1, calcs.length)) * 100}%` }} /></span>{g.con.length}/{calcs.length}</td>
                  <td className="num">{g.est.length || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="nota">
            Integridad: {calcs.filter((c) => c.q.estado === 'validado').length} validados · {calcs.filter((c) => c.q.estado === 'listo').length} listos para revisión · {calcs.filter((c) => c.q.estado === 'incompleto').length} incompletos.
          </p>
          {origen && !origen.nodo && origen.titulo.startsWith('Faltan:') && <OrigenViajes titulo={origen.titulo} items={origen.items} onCerrar={() => setOrigen(null)} />}
        </section>
      </div>
    </>
  );
}

function GraficoRendimiento({ puntos, onAbrir }: { puntos: { id: string; etq: string; v: number; est: boolean }[]; onAbrir: (id: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  if (puntos.length < 2) return <p className="nota">Se necesitan al menos 2 viajes con rendimiento para mostrar la evolución.</p>;
  const W = 560, H = 200, m = { l: 44, r: 14, t: 16, b: 26 };
  const vs = puntos.map((p) => p.v);
  const lo = Math.floor((Math.min(...vs) - 0.1) * 10) / 10;
  const hi = Math.ceil((Math.max(...vs) + 0.1) * 10) / 10;
  const x = (i: number) => m.l + (i / (puntos.length - 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo || 1)) * (H - m.t - m.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const medidos = puntos.map((p, i) => ({ ...p, i })).filter((p) => !p.est);
  const h = hover != null ? puntos[hover] : null;
  return (
    <div>
      <div style={{ minHeight: 20, fontSize: 12.5, color: 'var(--ink-2)' }}>
        {h ? <><b>{h.etq}</b> · {num(h.v, 2)} km/L {h.est && <span className="est-marca">ESTIMADO</span>}</> : <span className="muted">Pasa el cursor sobre un punto; haz clic para abrir el viaje.</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rendimiento por viaje en orden cronológico" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill="var(--ink-3)">{t.toFixed(1)}</text>
          </g>
        ))}
        <text x={m.l} y={H - 6} fontSize={10.5} fill="var(--ink-3)">más antiguo</text>
        <text x={W - m.r} y={H - 6} textAnchor="end" fontSize={10.5} fill="var(--ink-3)">más reciente</text>
        {medidos.length > 1 && <path d={medidos.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)},${y(p.v)}`).join(' ')} fill="none" stroke="var(--g600)" strokeWidth={2} strokeLinejoin="round" />}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} stroke="var(--ink-4)" strokeDasharray="3 3" />}
        {puntos.map((p, i) => (
          <g key={p.id} onMouseEnter={() => setHover(i)} onClick={() => onAbrir(p.id)} style={{ cursor: 'pointer' }}>
            <circle cx={x(i)} cy={y(p.v)} r={12} fill="transparent" />
            <circle cx={x(i)} cy={y(p.v)} r={hover === i ? 6 : 4.5} fill={p.est ? 'var(--surface)' : 'var(--g700)'} stroke={p.est ? 'var(--amber-500)' : 'var(--surface)'} strokeWidth={2} />
          </g>
        ))}
      </svg>
      <p className="nota">La línea une sólo rendimientos medidos. Las rutas y cargas difieren entre viajes: úsalo para detectar cambios, no para clasificar unidades.</p>
    </div>
  );
}
