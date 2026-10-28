// Incidencias y paradas por viaje, análisis de velocidad y resumen general.

import { useMemo, useState } from 'react';
import type { Evento, Tramo, Viaje } from '../types';
import { useApp } from '../state/Contexto';
import { calcularViaje } from '../lib/calculos';
import { claseDe, duracionEvento, esIncidencia, estadoConsumo, ETIQUETA_CLASE, ETIQUETA_CONSUMO, fechaEvento } from '../lib/eventos';
import { calcularTramo, ETIQUETA_SENTIDO, ETIQUETA_TRAMO } from '../lib/velocidad';
import { tramoVacio } from '../lib/datosBase';
import { nombres } from '../lib/nombres';
import { NODOS } from '../lib/proceso';
import { fmtDur, fmtFecha, fmtFechaCorta, parseDT } from '../lib/tiempo';
import { BarraFiltros, useFiltrados } from '../components/BarraFiltros';
import { ListaEventos } from '../components/EditorEventos';
import { CampoHora } from '../components/CampoHora';
import { Aviso, Boton, Campo, Confirmacion, EntradaDuracion, EntradaNumero, EntradaTexto, Pastilla, Segmentado, Vacio, type ConfirmacionPendiente } from '../components/ui';
import { Icono } from '../components/Iconos';

type Pestana = 'viaje' | 'resumen';

export function VistaIncidencias() {
  const { ws, cat, activoId, setActivo, actualizarViaje, irA, setPanel } = useApp();
  const [pest, setPest] = useState<Pestana>('viaje');
  const viaje = ws.viajes.find((v) => v.id === activoId) ?? null;
  const ordenados = useMemo(() => [...ws.viajes].sort((a, b) => (b.config.fecha + b.creado).localeCompare(a.config.fecha + a.creado)), [ws.viajes]);

  if (!ws.viajes.length) {
    return <div className="pagina"><Vacio icono="alerta" titulo="Sin viajes registrados">Crea un viaje desde el mapa para registrar sus incidencias, paradas y tramos de velocidad.</Vacio></div>;
  }
  const totalEventos = ws.viajes.reduce((t, v) => t + v.eventos.length, 0);
  return (
    <div className="pagina">
      <header className="pagina__cab">
        <div>
          <div className="pagina__eyebrow">Paradas, retrasos y velocidad</div>
          <h1>Incidencias y paradas</h1>
          <p>Registra cada parada o retraso relevante del viaje. Las paradas necesarias (descansos, bioseguridad, cargas de combustible) se distinguen de las incidencias: no todo tiempo detenido es improductivo.</p>
        </div>
      </header>
      <div className="subnav" role="tablist">
        <button role="tab" aria-selected={pest === 'viaje'} className={pest === 'viaje' ? 'activo' : ''} onClick={() => setPest('viaje')}><Icono n="lista" size={16} />Registro por viaje</button>
        <button role="tab" aria-selected={pest === 'resumen'} className={pest === 'resumen' ? 'activo' : ''} onClick={() => setPest('resumen')}><Icono n="indicadores" size={16} />Resumen general <span className="nav__badge">{totalEventos}</span></button>
      </div>

      {pest === 'viaje' && viaje && (
        <>
          <div className="filtros">
            <span className="filtros__titulo"><Icono n="llegada" size={15} />Viaje</span>
            <select className="input input--fuerte" style={{ maxWidth: 460 }} value={viaje.id} onChange={(e) => setActivo(e.target.value)} aria-label="Viaje">
              {ordenados.map((v) => {
                const n = nombres(v, cat);
                return <option key={v.id} value={v.id}>{v.config.folio} · {fmtFechaCorta(v.config.fecha)}{n.unidad ? ` · ${n.unidad}` : ''}{n.granja ? ` · ${n.granja}` : ''}</option>;
              })}
            </select>
            <span className="filtros__conteo"><button className="enlace-btn" onClick={() => { irA('mapa'); setTimeout(() => setPanel({ tipo: 'eventos' }), 0); }}>Abrir en el mapa</button></span>
          </div>
          <div className="rejilla-2" style={{ alignItems: 'start' }}>
            <section className="tarjeta">
              <header className="tarjeta__cab"><h2><Icono n="alerta" size={18} />Incidencias y paradas · {viaje.config.folio}</h2></header>
              <ListaEventos viaje={viaje} cat={cat} onCambiar={(lista: Evento[]) => actualizarViaje(viaje.id, (vj) => ({ ...vj, eventos: lista }))} />
            </section>
            <SeccionVelocidad viaje={viaje} />
          </div>
        </>
      )}
      {pest === 'resumen' && <Resumen />}
    </div>
  );
}

function SeccionVelocidad({ viaje }: { viaje: Viaje }) {
  const { cat, actualizarViaje, actualizarCatalogos } = useApp();
  const [conf, setConf] = useState<ConfirmacionPendiente | null>(null);
  const r = useMemo(() => calcularViaje(viaje, cat), [viaje, cat]);
  const lim = cat.limitesVelocidad;
  const setTramos = (t: Tramo[]) => actualizarViaje(viaje.id, (vj) => ({ ...vj, tramos: t }));
  const upd = (id: string, p: Partial<Tramo>) => setTramos(viaje.tramos.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const kmIda = typeof viaje.v['ida.km'] === 'number' ? (viaje.v['ida.km'] as number) : null;
  const kmReg = typeof viaje.v['reg.km'] === 'number' ? (viaje.v['reg.km'] as number) : null;
  const fila = (txt: string, km: number | null, min: number | null, vel: number | null) => (
    <tr key={txt}>
      <td>{txt}</td><td className="num">{km != null ? `${km} km` : <span className="pend">—</span>}</td><td className="num">{min != null ? fmtDur(min) : <span className="pend">—</span>}</td>
      <td className="num">{vel != null ? <b className={lim.carretera != null && vel > lim.carretera ? 'dif-pos' : ''}>{vel.toFixed(1)} km/h</b> : <span className="pend">Datos insuficientes</span>}</td>
    </tr>
  );
  return (
    <section className="tarjeta">
      <header className="tarjeta__cab"><h2><Icono n="velocimetro" size={18} />Análisis de velocidad</h2></header>
      <div className="aviso">
        <Icono n="info" size={16} />
        <div>
          <b>Velocidad promedio</b> = kilómetros ÷ horas de desplazamiento (se calcula). <b>Velocidad máxima</b> = dato de telemetría (sólo si existe; no se calcula ni se inventa).
          Los límites son restricciones operativas, no objetivos.
        </div>
      </div>
      <div className="rejilla-campos" style={{ marginTop: 10 }}>
        <Campo label="Límite en carretera" ayuda="Configurable"><EntradaNumero value={lim.carretera} unidad="km/h" onChange={(x) => actualizarCatalogos((c) => ({ ...c, limitesVelocidad: { ...c.limitesVelocidad, carretera: x } }))} /></Campo>
        <Campo label="Límite en acceso de terracería" ayuda="Configurable"><EntradaNumero value={lim.terraceria} unidad="km/h" onChange={(x) => actualizarCatalogos((c) => ({ ...c, limitesVelocidad: { ...c.limitesVelocidad, terraceria: x } }))} /></Campo>
      </div>

      <h3 style={{ fontSize: 13, marginTop: 18 }}>Trayectos completos (del registro del viaje)</h3>
      <table className="tabla tabla--compacta">
        <thead><tr><th>Trayecto</th><th className="num">Distancia</th><th className="num">Tiempo</th><th className="num">Vel. promedio</th></tr></thead>
        <tbody>
          {fila('Ida (paso 9)', kmIda, r.segmentos.ida.min, r.velocidad.ida)}
          {fila('Regreso (paso 17)', kmReg, r.segmentos.regreso.min, r.velocidad.regreso)}
        </tbody>
      </table>
      <p className="nota">El promedio de un trayecto incluye carretera, terracería y paradas. Para separar tramos registra los tramos abajo.</p>

      <div className="tarjeta__cab" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 13 }}>Tramos detallados</h3>
        <div className="fila-botones">
          <Boton tam="sm" icono="mas" onClick={() => setTramos([...viaje.tramos, tramoVacio('ida', 'carretera')])}>Tramo de carretera</Boton>
          <Boton tam="sm" icono="mas" onClick={() => setTramos([...viaje.tramos, tramoVacio('ida', 'terraceria')])}>Tramo de terracería</Boton>
        </div>
      </div>
      {viaje.tramos.length === 0 && <p className="nota">Sin tramos registrados.</p>}
      {viaje.tramos.map((t) => {
        const rt = calcularTramo(t, lim);
        return (
          <div key={t.id} className={`evento tramo tramo--${t.tipo}`}>
            <div className="evento__cab">
              <Segmentado<Tramo['tipo']> value={t.tipo} onChange={(x) => upd(t.id, { tipo: x })} opciones={[{ valor: 'carretera', texto: 'Carretera' }, { valor: 'terraceria', texto: 'Terracería' }]} />
              <Segmentado<Tramo['sentido']> value={t.sentido} onChange={(x) => upd(t.id, { sentido: x })} opciones={[{ valor: 'ida', texto: 'Ida' }, { valor: 'regreso', texto: 'Regreso' }, { valor: 'otro', texto: 'Otro' }]} />
              <span style={{ flex: 1 }} />
              <button className="icono-btn icono-btn--peligro" aria-label="Eliminar tramo" onClick={() => setConf({ titulo: 'Eliminar tramo', confirmar: 'Eliminar', peligro: true, mensaje: '¿Eliminar este tramo de velocidad?', accion: () => setTramos(viaje.tramos.filter((x) => x.id !== t.id)) })}><Icono n="basura" size={16} /></button>
            </div>
            <div className="evento__resumen">
              <Pastilla tono={rt.vProm != null ? (rt.excedeProm ? 'ambar' : 'verde') : 'gris'}>Promedio: {rt.vProm != null ? `${rt.vProm.toFixed(1)} km/h` : `faltan ${rt.faltan.join(' y ') || 'datos'}`}</Pastilla>
              <Pastilla tono={t.velMax != null ? (rt.excedeMax ? 'ambar' : 'neutro') : 'gris'}>Máxima (telemetría): {t.velMax != null ? `${t.velMax} km/h` : 'sin dato'}</Pastilla>
              {rt.limite != null && <Pastilla tono="gris">Límite {ETIQUETA_TRAMO[t.tipo].toLowerCase()}: {rt.limite} km/h</Pastilla>}
            </div>
            {(rt.excedeProm || rt.excedeMax) && <Aviso tono="ambar">El valor registrado supera el límite operativo configurado. Revisa el dato (distancia, horarios o lectura de telemetría); no se modifica ninguna medición.</Aviso>}
            {rt.error && <div className="evento__err">{rt.error}</div>}
            <div className="evento__grid">
              <Campo label="Distancia del tramo"><EntradaNumero value={t.km} onChange={(x) => upd(t.id, { km: x })} unidad="km" /></Campo>
              <Campo label="Velocidad máxima registrada" ayuda="Sólo con telemetría"><EntradaNumero value={t.velMax} onChange={(x) => upd(t.id, { velMax: x })} unidad="km/h" /></Campo>
              <Campo label="Hora de inicio" ancho="completo"><CampoHora compacto value={t.inicio} onChange={(x) => upd(t.id, { inicio: x })} fechaBase={viaje.config.fecha} /></Campo>
              <Campo label="Hora de finalización" ancho="completo"><CampoHora compacto value={t.fin} onChange={(x) => upd(t.id, { fin: x })} fechaBase={t.inicio?.slice(0, 10) ?? viaje.config.fecha} referencia={parseDT(t.inicio)} /></Campo>
              <Campo label="o duración"><EntradaDuracion value={t.duracionMin} onChange={(x) => upd(t.id, { duracionMin: x })} /></Campo>
              <Campo label="Observaciones"><EntradaTexto value={t.observaciones} onChange={(x) => upd(t.id, { observaciones: x })} /></Campo>
            </div>
          </div>
        );
      })}
      <Confirmacion c={conf} onCerrar={() => setConf(null)} />
    </section>
  );
}

function Resumen() {
  const { ws, cat, setActivo, irA, setPanel } = useApp();
  const { calcs } = useFiltrados();
  const [tipoSel, setTipoSel] = useState<string>('');
  const eventos = calcs.flatMap(({ viaje }) => viaje.eventos.map((e) => ({ e, viaje, clase: claseDe(e.tipo, cat) })));
  const porTipo = new Map<string, { n: number; min: number; afecto: number; clase: string; viajes: Set<string> }>();
  for (const { e, viaje, clase } of eventos) {
    const x = porTipo.get(e.tipo) ?? { n: 0, min: 0, afecto: 0, clase: ETIQUETA_CLASE[clase], viajes: new Set<string>() };
    x.n++;
    x.min += duracionEvento(e) ?? 0;
    if (e.afectoEntrega) x.afecto++;
    x.viajes.add(viaje.id);
    porTipo.set(e.tipo, x);
  }
  const tipos = [...porTipo.entries()].sort((a, b) => b[1].n - a[1].n);
  const maxN = Math.max(1, ...tipos.map(([, x]) => x.n));
  const porUnidad = new Map<string, { incid: number; paradas: number; fallas: number; viajes: number }>();
  for (const { viaje, r } of calcs) {
    const k = viaje.config.unidadId || '—';
    const x = porUnidad.get(k) ?? { incid: 0, paradas: 0, fallas: 0, viajes: 0 };
    x.viajes++;
    x.incid += r.eventos.incidencias;
    x.paradas += r.eventos.paradas;
    x.fallas += r.eventos.fallas;
    porUnidad.set(k, x);
  }
  const tramos = calcs.flatMap(({ viaje }) => viaje.tramos.map((t) => ({ t, rt: calcularTramo(t, cat.limitesVelocidad), viaje })));
  const lista = eventos.filter((x) => !tipoSel || x.e.tipo === tipoSel).sort((a, b) => (fechaEvento(b.e) ?? b.viaje.config.fecha).localeCompare(fechaEvento(a.e) ?? a.viaje.config.fecha));
  const abrir = (id: string) => { setActivo(id); irA('mapa'); setTimeout(() => setPanel({ tipo: 'eventos' }), 0); };

  return (
    <>
      <BarraFiltros total={ws.viajes.length} filtrados={calcs.length} />
      <div className="rejilla-2">
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>Eventos por tipo</h2><span className="tarjeta__ayuda">Selecciona un tipo para ver sus registros</span></header>
          {tipos.length === 0 ? <p className="nota">Sin eventos en los viajes filtrados.</p> : (
            <ul className="barras-h">
              {tipos.map(([t, x]) => (
                <li key={t} className={`clicable ${tipoSel === t ? 'sel' : ''}`} onClick={() => setTipoSel(tipoSel === t ? '' : t)} title={`${x.n} evento(s) en ${x.viajes.size} viaje(s)`}>
                  <span className="barras-h__et">{t} <span className="muted" style={{ fontSize: 11 }}>· {x.clase}</span></span>
                  <span className="barras-h__pista"><span className={`barras-h__barra barras-h__barra--${esIncidencia(claseDe(t, cat)) ? 'incidencia' : 'parada'}`} style={{ width: `${(x.n / maxN) * 100}%` }} /></span>
                  <span className="barras-h__val">{x.n}<small>{x.min ? fmtDur(x.min) : 'sin minutos'}{x.afecto ? ` · ${x.afecto} afectó entrega` : ''}</small></span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>Por unidad</h2><span className="tarjeta__ayuda">Incidencias recurrentes; ordenado por número de unidad</span></header>
          <table className="tabla tabla--compacta">
            <thead><tr><th>Unidad</th><th className="num">Viajes</th><th className="num">Incidencias</th><th className="num">Fallas</th><th className="num">Paradas</th><th className="num">Incid. por viaje</th></tr></thead>
            <tbody>
              {[...porUnidad.entries()].sort((a, b) => (cat.unidades.find((u) => u.id === a[0])?.numero ?? '').localeCompare(cat.unidades.find((u) => u.id === b[0])?.numero ?? '')).map(([id, x]) => (
                <tr key={id}>
                  <td>{cat.unidades.find((u) => u.id === id)?.numero ?? 'Sin unidad'}</td>
                  <td className="num">{x.viajes}</td><td className="num">{x.incid}</td><td className="num">{x.fallas}</td><td className="num">{x.paradas}</td>
                  <td className="num">{(x.incid / x.viajes).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="nota">Con pocos viajes, las tasas por viaje pueden variar mucho; interpreta con cautela.</p>
        </section>
      </div>

      <section className="tarjeta">
        <header className="tarjeta__cab">
          <h2>Registro de eventos {tipoSel && <Pastilla tono="neutro">{tipoSel}</Pastilla>}</h2>
          {tipoSel && <button className="enlace-btn" onClick={() => setTipoSel('')}>Ver todos</button>}
        </header>
        <div className="tabla-envoltura">
          <table className="tabla tabla--compacta">
            <thead><tr><th>Fecha</th><th>Viaje</th><th>Tipo</th><th>Actividad</th><th>Motivo · lugar</th><th className="num">Duración</th><th>Motor / consumo</th><th>Efecto</th></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={8} className="vacio-tabla">Sin eventos.</td></tr>}
              {lista.slice(0, 200).map(({ e, viaje, clase }) => (
                <tr key={e.id} className="clicable" onClick={() => abrir(viaje.id)}>
                  <td>{fmtFecha(fechaEvento(e) ?? viaje.config.fecha)}{!fechaEvento(e) && <div className="nota-tabla">fecha del viaje</div>}</td>
                  <td><span className="enlace-btn enlace-btn--fuerte">{viaje.config.folio}</span><div className="nota-tabla">{nombres(viaje, cat).unidad}</div></td>
                  <td>{e.tipo}<div className="nota-tabla">{ETIQUETA_CLASE[clase]}</div></td>
                  <td>{e.nodo ? NODOS[e.nodo]?.corto : '—'}</td>
                  <td>{[e.motivo, e.lugar].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="num">{duracionEvento(e) != null ? fmtDur(duracionEvento(e)) : '—'}</td>
                  <td>{e.motor ? `Motor ${e.motor}` : '—'}{estadoConsumo(e) !== 'motor_apagado' && <div className="nota-tabla">{ETIQUETA_CONSUMO[estadoConsumo(e)]}{e.litros != null ? ` · ${e.litros} L` : ''}</div>}</td>
                  <td>{e.afectoEntrega ? <Pastilla tono="rojo">Afectó entrega</Pastilla> : e.desperfecto ? <Pastilla tono="rojo">Desperfecto</Pastilla> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta">
        <header className="tarjeta__cab"><h2><Icono n="velocimetro" size={18} />Tramos de velocidad registrados</h2><span className="tarjeta__ayuda">Promedio calculado; máxima sólo si existe telemetría</span></header>
        {tramos.length === 0 ? <p className="nota">Sin tramos registrados en los viajes filtrados.</p> : (
          <div className="tabla-envoltura">
            <table className="tabla tabla--compacta">
              <thead><tr><th>Viaje</th><th>Ruta</th><th>Sentido</th><th>Tipo</th><th className="num">Km</th><th className="num">Tiempo</th><th className="num">Promedio</th><th className="num">Máxima</th><th className="num">Límite</th><th>Revisión</th></tr></thead>
              <tbody>
                {tramos.map(({ t, rt, viaje }) => (
                  <tr key={t.id}>
                    <td>{viaje.config.folio}</td><td>{nombres(viaje, cat).ruta || '—'}</td><td>{ETIQUETA_SENTIDO[t.sentido]}</td><td>{ETIQUETA_TRAMO[t.tipo]}</td>
                    <td className="num">{t.km ?? '—'}</td><td className="num">{rt.min != null ? fmtDur(rt.min) : '—'}</td>
                    <td className="num">{rt.vProm != null ? `${rt.vProm.toFixed(1)} km/h` : '—'}</td>
                    <td className="num">{t.velMax != null ? `${t.velMax} km/h` : <span className="pend">sin dato</span>}</td>
                    <td className="num">{rt.limite ?? '—'}</td>
                    <td>{rt.excedeProm || rt.excedeMax ? <Pastilla tono="ambar">Revisar dato</Pastilla> : rt.error ? <Pastilla tono="rojo">Error</Pastilla> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
