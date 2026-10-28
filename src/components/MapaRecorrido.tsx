// Mapa del ciclo logístico como recorrido ilustrado:
// Planta NUTRIKOWI → carretera → Granja → carretera → Planta.
// Escritorio y tableta: escena escalable con estaciones sobre una línea de proceso.
// Celular: recorrido vertical con la misma lógica y las mismas acciones.

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Catalogos, Clasificacion, ValorCampo, Viaje } from '../types';
import { ETIQUETA_ESTADO, type EstadoNodo, type ResultadoViaje } from '../lib/calculos';
import { NODOS, NODOS_LISTA, ETAPAS, type Etapa, type NodoDef } from '../lib/proceso';
import { ESCENA, FILA, POS, TRAMOS, ZONAS, chevrones, puntosTramo, rutaSuave, type TramoEscena } from '../lib/escena';
import { fmtDur } from '../lib/tiempo';
import { Icono } from './Iconos';
import { Camion, GranjaIlustracion, PlantaIlustracion, type TipoCamion } from './Ilustraciones';

export interface DatoNodoMapa {
  estado: EstadoNodo | 'calor';
  valor: string;
  pendiente?: boolean;
  sub?: string;
  espera?: string | null;
  incidencias?: number;
  paradas?: number;
  faltantes?: number;
  retraso?: boolean;
  decision?: boolean | null;
  progreso?: number;
  intensidad?: number;
  clasif?: Clasificacion | null;
  titulo?: string;
}

function durCompacta(min: number): string {
  const t = Math.round(min);
  return t < 60 ? `${t} min` : `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')}`;
}

/** Datos esenciales de cada nodo para el mapa (el detalle vive en el panel lateral). */
export function datosMapaViaje(viaje: Viaje, r: ResultadoViaje): { datos: Record<string, DatoNodoMapa>; siguiente: string | null } {
  const datos: Record<string, DatoNodoMapa> = {};
  let siguiente: string | null = null;
  for (const n of NODOS_LISTA) {
    const rn = r.nodos[n.id];
    const decision = n.decide ? (viaje.v[n.decide] === true ? true : viaje.v[n.decide] === false ? false : null) : undefined;
    let valor: string;
    let pendiente = false;
    if (rn.estado === 'no_aplica') {
      valor = 'No aplica';
      pendiente = true;
    } else if (rn.estado === 'por_decidir') {
      valor = 'Según decisión';
      pendiente = true;
    } else if (n.tipo === 'decision') valor = decision === true ? 'Sí' : decision === false ? 'No' : 'Por definir';
    else if (n.tipo === 'hito') {
      const t = rn.ultimaHora;
      valor = t != null ? new Date(t).toTimeString().slice(0, 5) : 'Pendiente';
      pendiente = t == null;
    } else if (rn.min != null) valor = durCompacta(rn.min);
    else {
      valor = rn.estado === 'error' ? 'Revisar horas' : 'Pendiente';
      pendiente = true;
    }
    const sinEstado = rn.estado === 'no_aplica' || rn.estado === 'por_decidir';
    datos[n.id] = {
      estado: rn.estado,
      valor,
      pendiente,
      sub: rn.acumulado != null && !sinEstado ? `t+${fmtDur(rn.acumulado, { corto: true })}` : undefined,
      espera: rn.minEspera != null && rn.minEspera > 0 && n.tipo !== 'espera' ? durCompacta(rn.minEspera) : null,
      incidencias: rn.incidencias,
      paradas: rn.eventos - rn.incidencias,
      faltantes: sinEstado ? 0 : rn.faltantes.length,
      retraso: rn.posibleRetraso,
      decision: decision ?? null,
      progreso: rn.requeridos ? rn.cumplidos / rn.requeridos : 0,
      clasif: viaje.clasif[n.id]?.estado ?? null,
      titulo: rn.faltantes.length && !sinEstado ? `Falta: ${rn.faltantes.join(', ')}` : undefined,
    };
    if (!siguiente && ['pendiente', 'parcial', 'error'].includes(rn.estado)) siguiente = n.id;
  }
  return { datos, siguiente };
}

// ─────────────────────── Estado de los tramos ───────────────────────

type EstadoTramo = 'hecho' | 'pend' | 'inactivo';

function estadoTramo(t: TramoEscena, datos: Record<string, DatoNodoMapa>, dec: Record<string, ValorCampo>, calor: boolean): EstadoTramo {
  if (t.rama) {
    const val = dec[t.rama.campo];
    if ((val === true || val === false) && val !== t.rama.valor) return 'inactivo';
  }
  if (calor) return 'pend';
  const est = (id: string): EstadoNodo | 'calor' => {
    const union: Record<string, [string, string]> = { '@jA': ['lavado_dec', 'lavado_espera'], '@jB': ['mant_dec', 'mant'], '@jC': ['diesel_dec', 'diesel'] };
    if (union[id]) {
      const [d, n] = union[id];
      const ed = datos[d]?.estado;
      const en = datos[n]?.estado;
      return ed === 'completo' && (en === 'completo' || en === 'no_aplica') ? 'completo' : 'pendiente';
    }
    return datos[id]?.estado ?? 'pendiente';
  };
  const eDe = est(t.de);
  const eA = est(t.a);
  if (eDe === 'no_aplica' || eA === 'no_aplica') return 'inactivo';
  return eDe === 'completo' ? 'hecho' : 'pend';
}

/** Posición de la unidad: en la actividad en curso (o en la última estación antes de una decisión). */
function posicionCamion(siguiente: string | null): { x: number; y: number; dir: 'der' | 'izq'; ruta: boolean } {
  // Ciclo completo: la unidad está de regreso en la entrada de planta.
  if (!siguiente) return { x: POS.regreso.x - 28, y: POS.regreso.y - 24, dir: 'izq', ruta: true };
  let id = siguiente;
  if (NODOS[id]?.tipo === 'decision') {
    const idx = NODOS_LISTA.findIndex((n) => n.id === id);
    const previo = NODOS_LISTA.slice(0, idx).reverse().find((n) => n.tipo !== 'decision' && !n.aplicaSi);
    id = previo?.id ?? 'llegada';
  }
  const p = POS[id];
  if (p.forma === 'pildora') return { x: p.x - 30, y: p.y - 24, dir: p.dir, ruta: true };
  return { x: p.x, y: p.y - 62, dir: p.dir, ruta: false };
}

// ─────────────────────── Componente principal ───────────────────────

export interface PropsMapa {
  datos: Record<string, DatoNodoMapa>;
  decisiones: Record<string, ValorCampo>;
  seleccionado: string | null;
  siguiente?: string | null;
  onSelect: (id: string) => void;
  onDecidir?: (campo: string, valor: boolean | null) => void;
  calor?: boolean;
  claveAnim?: string;
  contexto?: ContextoEscena;
}

export interface ContextoEscena {
  granja: string;
  procedimientoBio: string;
  ruta: string;
  km: number | null;
  kmTerraceria: number | null;
  limites: Catalogos['limitesVelocidad'];
  tipoCamion: TipoCamion;
  compartimentos: number | null;
  unidad: string;
}

export function MapaRecorrido(props: PropsMapa) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAncho(el.clientWidth));
    ro.observe(el);
    setAncho(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const vertical = ancho > 0 && ancho < 760;
  return (
    <div ref={ref} className="escena">
      {ancho === 0 ? <div style={{ height: 200 }} /> : vertical ? <RutaVertical {...props} /> : <Escena {...props} disp={ancho} />}
    </div>
  );
}

function Escena({ datos, decisiones, seleccionado, siguiente, onSelect, calor, claveAnim, contexto, disp }: PropsMapa & { disp: number }) {
  const escala = Math.max(0.66, Math.min(1.12, (disp - 8) / ESCENA.W));
  const tramos = useMemo(
    () => TRAMOS.map((t) => ({ t, pts: puntosTramo(t), est: estadoTramo(t, datos, decisiones, !!calor) })),
    [datos, decisiones, calor],
  );
  const camion = posicionCamion(siguiente ?? null);
  const ctx = contexto;
  const fracTerr = ctx?.km && ctx.kmTerraceria ? Math.min(0.6, Math.max(0.08, ctx.kmTerraceria / ctx.km)) : 0;
  const largoRuta = ZONAS.ruta.x1 - ZONAS.ruta.x0;
  return (
    <div className="escena__scroll">
      <div className="escena__marco" style={{ width: ESCENA.W * escala, height: ESCENA.H * escala }} key={claveAnim}>
        <div className="escena__lienzo" style={{ width: ESCENA.W, height: ESCENA.H, transform: `scale(${escala})` }}>
          <svg className="escena__svg" width={ESCENA.W} height={ESCENA.H} viewBox={`0 0 ${ESCENA.W} ${ESCENA.H}`} aria-hidden="true">
            <defs>
              <pattern id="nk-puntos" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" fill="#e3d9c4" />
              </pattern>
              <pattern id="nk-terraceria" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#e6d4ad" />
                <circle cx="2" cy="2" r="0.9" fill="#c9b07a" />
                <circle cx="6" cy="6" r="0.7" fill="#c9b07a" />
              </pattern>
              <linearGradient id="nk-planta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f6f1e4" />
                <stop offset="1" stopColor="#f9f6ee" />
              </linearGradient>
              <linearGradient id="nk-granja" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#eef3e7" />
                <stop offset="1" stopColor="#f6f8f1" />
              </linearGradient>
            </defs>

            {/* Zonas */}
            <rect x={ZONAS.planta.x} y={ZONAS.planta.y} width={ZONAS.planta.w} height={ZONAS.planta.h} rx={26} fill="url(#nk-planta)" stroke="#e7dec9" />
            <rect x={ZONAS.planta.x} y={ZONAS.planta.y} width={ZONAS.planta.w} height={ZONAS.planta.h} rx={26} fill="url(#nk-puntos)" opacity={0.7} />
            <rect x={ZONAS.granja.x} y={ZONAS.granja.y} width={ZONAS.granja.w} height={ZONAS.granja.h} rx={26} fill="url(#nk-granja)" stroke="#dde5d3" />
            <PlantaIlustracion x={376} y={26} ancho={326} />
            <GranjaIlustracion x={1176} y={30} ancho={246} />

            {/* Paisaje entre planta y granja */}
            <path d={`M${ZONAS.ruta.x0 + 10} 352 C 800 330, 900 372, ${ZONAS.ruta.x1 - 10} 348`} stroke="#e4dcc8" strokeWidth={1.4} fill="none" strokeDasharray="1 7" strokeLinecap="round" />

            {/* Carreteras */}
            {[FILA.arriba, FILA.abajo].map((y) => (
              <g key={y}>
                <rect x={ZONAS.ruta.x0 - 6} y={y - 18} width={largoRuta + 12} height={36} rx={6} fill="#ddd5c3" />
                {fracTerr > 0 && (
                  <rect x={ZONAS.ruta.x1 - largoRuta * fracTerr} y={y - 18} width={largoRuta * fracTerr + 6} height={36} rx={4} fill="url(#nk-terraceria)" />
                )}
                <path d={`M${ZONAS.ruta.x0} ${y - 18} H${ZONAS.ruta.x1} M${ZONAS.ruta.x0} ${y + 18} H${ZONAS.ruta.x1}`} stroke="#cdc3ad" strokeWidth={1.2} />
                <path d={`M${ZONAS.ruta.x0 + 8} ${y} H${ZONAS.ruta.x1 - largoRuta * fracTerr - 8}`} stroke="#fffdf8" strokeWidth={2} strokeDasharray="12 10" />
              </g>
            ))}
            {ctx?.limites.carretera != null && <Senal x={ZONAS.ruta.x0 + 28} y={FILA.arriba + 44} v={ctx.limites.carretera} abajo />}
            {ctx?.limites.terraceria != null && fracTerr > 0 && <Senal x={ZONAS.ruta.x1 - largoRuta * fracTerr + 14} y={FILA.arriba + 44} v={ctx.limites.terraceria} terr abajo />}
            {ctx?.limites.terraceria != null && fracTerr > 0 && <Senal x={ZONAS.ruta.x1 - largoRuta * fracTerr + 14} y={FILA.abajo - 44} v={ctx.limites.terraceria} terr />}
            {ctx?.limites.carretera != null && <Senal x={ZONAS.ruta.x1 - largoRuta * fracTerr - 26} y={FILA.abajo - 44} v={ctx.limites.carretera} />}

            {/* Línea del proceso */}
            {tramos.map(({ t, pts, est }, i) =>
              t.tipo === 'ciclo' ? (
                <path key={i} d={rutaSuave(pts)} className="trazo-ciclo" />
              ) : t.tipo === 'carretera' ? (
                est === 'hecho' ? <path key={i} d={rutaSuave(pts)} className="trazo-hecho" style={{ strokeWidth: 4 }} /> : null
              ) : est === 'inactivo' ? (
                <path key={i} d={rutaSuave(pts)} className="trazo-inactivo" />
              ) : (
                <g key={i}>
                  <path d={rutaSuave(pts)} className="trazo-base" />
                  {est === 'hecho' && <path d={rutaSuave(pts)} className="trazo-hecho" />}
                </g>
              ),
            )}
            {!calor && siguiente &&
              tramos.filter(({ t, est }) => t.a === siguiente && est !== 'inactivo' && t.tipo !== 'ciclo').map(({ pts }, i) => <path key={`s${i}`} d={rutaSuave(pts)} className="trazo-sig" />)}
            {tramos.filter(({ t, est }) => est !== 'inactivo' && !t.tipo).flatMap(({ pts, est }, i) =>
              chevrones(pts, 74).map((c, j) => (
                <path key={`c${i}-${j}`} d="M-3,-4 L2,0 L-3,4" className={`chevron ${est === 'hecho' ? '' : 'chevron--base'}`} transform={`translate(${c.x} ${c.y}) rotate(${c.ang})`} />
              )),
            )}
            {tramos.filter(({ t }) => t.etiqueta).map(({ t, pts, est }, i) => {
              const [x0, y0] = pts[0];
              const abajo = !!t.via;
              return (
                <text key={`e${i}`} x={abajo ? x0 - 20 : x0 - 26} y={abajo ? y0 + 40 : y0 - 9} className={`etq-rama ${est === 'hecho' ? 'etq-rama--activa' : ''}`}>
                  {t.etiqueta}
                </text>
              );
            })}
            {/* Conectores de las píldoras de carretera */}
            <path d={`M${POS.ida.x} ${FILA.arriba - 18} V${FILA.arriba - 34}`} stroke="#cdc3ad" strokeWidth={1.5} strokeDasharray="2 3" />
            <path d={`M${POS.regreso.x} ${FILA.abajo + 18} V${FILA.abajo + 34}`} stroke="#cdc3ad" strokeWidth={1.5} strokeDasharray="2 3" />
          </svg>

          {/* Títulos de zona */}
          <div className="zona-titulo" style={{ left: 40, top: 36 }}>
            <span className="zona-titulo__eyebrow"><b>A</b>{ETAPAS.A.titulo}</span>
            <h3>Planta · Pueblo Mayo</h3>
            <span>Recepción, preparación, carga y despacho</span>
          </div>
          <span className="subzona" style={{ left: 42, top: 196 }}>Báscula · carga · despacho</span>
          <span className="subzona" style={{ left: 42, top: 616 }}>Recepción · lavado · servicio de la unidad</span>
          <div className="zona-titulo" style={{ left: 1024, top: 36, maxWidth: 156 }}>
            <span className="zona-titulo__eyebrow"><b>B</b>Granja</span>
            <h3 style={{ fontSize: 16, lineHeight: 1.2 }}>{ctx?.granja || 'Granja de destino'}</h3>
            <span style={{ whiteSpace: 'normal' }}>{ctx?.procedimientoBio || 'Descarga y bioseguridad'}</span>
          </div>
          <div className="zona-titulo" style={{ left: 744, top: 36 }}>
            <span className="zona-titulo__eyebrow"><b>B</b>Traslado</span>
            <span style={{ whiteSpace: 'normal', maxWidth: 230 }}>{ctx?.ruta || 'Ruta sin definir'}{ctx?.km != null ? ` · ${ctx.km} km` : ''}{ctx?.kmTerraceria ? ` (${ctx.kmTerraceria} km de terracería)` : ''}</span>
          </div>
          <div className="zona-titulo" style={{ left: 744, top: 560 }}>
            <span className="zona-titulo__eyebrow"><b style={{ background: '#4a514d' }}>C</b>{ETAPAS.C.titulo}</span>
          </div>
          {ctx?.limites && (
            <div className="subzona" style={{ left: 778, top: 326, textTransform: 'none', letterSpacing: 0, fontWeight: 600, fontSize: 11, width: 170, textAlign: 'center', color: '#8a8f86' }}>
              Límites operativos configurables, no objetivos
            </div>
          )}

          {/* Nodos */}
          {NODOS_LISTA.map((n, i) => {
            const p = POS[n.id];
            const d = datos[n.id];
            const comun = { n, d, sel: seleccionado === n.id, sig: !calor && siguiente === n.id, onClick: () => onSelect(n.id), retraso: i * 18, calor: !!calor };
            if (p.forma === 'rombo') return <Rombo key={n.id} {...comun} x={p.x} y={p.y} />;
            if (p.forma === 'pildora') return <Pildora key={n.id} {...comun} x={p.x} y={p.y + (p.y === FILA.arriba ? -56 : 56)} />;
            return <Estacion key={n.id} {...comun} x={p.x} y={p.y} etqArriba={n.id === 'cierre'} />;
          })}

          {!calor && ctx && (
            <div className={`camion-movil ${camion.dir === 'izq' ? 'camion-movil--izq' : ''}`} style={{ left: camion.x - 48, top: camion.y, margin: 0 }}>
              <div className="camion-movil__cuerpo">
                <Camion tipo={ctx.tipoCamion} compartimentos={ctx.compartimentos} ancho={96} />
              </div>
              {ctx.unidad && <span className="camion-movil__etq">{ctx.unidad}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Senal({ x, y, v, terr, abajo }: { x: number; y: number; v: number; terr?: boolean; abajo?: boolean }) {
  return (
    <g>
      <path d={abajo ? `M${x} ${y - 12} V${y - 26}` : `M${x} ${y + 12} V${y + 26}`} stroke="#8a8f86" strokeWidth={1.6} />
      <circle cx={x} cy={y} r={12} fill="#fffdf8" stroke={terr ? '#a67c2a' : '#4a514d'} strokeWidth={2.6} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#222725">{v}</text>
    </g>
  );
}

interface PropsNodo {
  n: NodoDef;
  d?: DatoNodoMapa;
  sel: boolean;
  sig: boolean;
  onClick: () => void;
  retraso: number;
  calor: boolean;
  x: number;
  y: number;
}

const CIRC = 2 * Math.PI * 19.5;

function Estacion({ n, d, sel, sig, onClick, retraso, calor, x, y, etqArriba }: PropsNodo & { etqArriba?: boolean }) {
  const est = d?.estado ?? 'pendiente';
  const completo = est === 'completo';
  const prog = completo ? 1 : est === 'parcial' ? Math.max(0.08, d?.progreso ?? 0) : 0;
  const estilo: CSSProperties = { left: x, top: y, animationDelay: `${retraso}ms` };
  if (calor && d?.intensidad != null) (estilo as Record<string, unknown>)['--calor'] = d.intensidad;
  const clases = [
    'estacion', `est--${est}`, `estacion--${n.tipo}`, n.aplicaSi ? 'estacion--opcional' : '', sel ? 'sel' : '', sig ? 'sig' : '',
    calor ? 'estacion--calor' : '', calor && (d?.intensidad ?? 0) > 0.55 ? 'alta' : '',
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button" className={clases} style={estilo} onClick={onClick} aria-pressed={sel}
      aria-label={`${n.paso === '↺' ? 'Cierre' : `Paso ${n.paso}`}: ${n.titulo}. ${calor ? '' : ETIQUETA_ESTADO[est as EstadoNodo] ?? ''}. ${d?.valor ?? ''}`}
      title={d?.titulo}
    >
      <span className="estacion__circulo">
        <svg className="estacion__anillo" viewBox="0 0 42 42" aria-hidden="true">
          <circle className="base" cx="21" cy="21" r="19.5" />
          {prog > 0 && <circle className="prog" cx="21" cy="21" r="19.5" strokeDasharray={`${prog * CIRC} ${CIRC}`} transform="rotate(-90 21 21)" />}
        </svg>
        <span className="estacion__icono"><Icono n={n.icono} size={18} /></span>
        {completo && !calor && <span className="estacion__check"><Icono n="check" size={11} /></span>}
        {!!d?.incidencias && <span className="estacion__inc" title={`${d.incidencias} incidencia(s)`}>{d.incidencias}</span>}
        {!!d?.paradas && <span className="estacion__par" title={`${d.paradas} parada(s) necesarias u operativas`}>{d.paradas}</span>}
      </span>
      <span className="estacion__txt" style={etqArriba ? { position: 'absolute', bottom: 'calc(100% + 2px)' } : undefined}>
        <span className="estacion__nombre"><em>{n.paso === '↺' ? '↺' : n.paso}</em>{n.corto}</span>
        <span className={`estacion__valor ${d?.pendiente ? 'estacion__valor--pend' : ''}`}>{d?.valor}</span>
        {d?.espera && <span className="estacion__espera" title="Tiempo de espera registrado"><Icono n="espera" size={10} />{d.espera}</span>}
        {calor && d?.sub && <span className="nota-tabla">{d.sub}</span>}
      </span>
    </button>
  );
}

function Rombo({ n, d, sel, sig, onClick, retraso, x, y }: PropsNodo) {
  const dec = d?.decision;
  return (
    <button
      type="button" className={`rombo ${dec === true ? 'rombo--si' : dec === false ? 'rombo--no' : 'rombo--nd'} ${sel ? 'sel' : ''} ${sig ? 'sig' : ''}`}
      style={{ left: x, top: y, animationDelay: `${retraso}ms` }} onClick={onClick} aria-pressed={sel}
      aria-label={`Decisión, paso ${n.paso}: ${n.titulo} Respuesta: ${d?.valor ?? 'por definir'}`} title={`${n.titulo} ${d?.valor ?? ''}`}
    >
      <span className="rombo__forma" />
      <span className="rombo__valor">{dec === true ? 'Sí' : dec === false ? 'No' : '?'}</span>
      <span className="rombo__et">{n.corto}{d?.estado === 'calor' && <><br /><span className="muted">{d.valor}</span></>}</span>
    </button>
  );
}

function Pildora({ n, d, sel, sig, onClick, retraso, calor, x, y }: PropsNodo) {
  const est = d?.estado ?? 'pendiente';
  const estilo: CSSProperties = { left: x, top: y, animationDelay: `${retraso}ms` };
  if (calor && d?.intensidad != null) estilo.boxShadow = `0 0 0 ${2 + Math.round(d.intensidad * 4)}px rgba(29, 107, 73, ${0.25 + d.intensidad * 0.55})`;
  return (
    <button type="button" className={`pildora-ruta est--${est} ${sel ? 'sel' : ''} ${sig ? 'sig' : ''}`} style={estilo} onClick={onClick} aria-pressed={sel}
      aria-label={`Paso ${n.paso}: ${n.titulo}. ${d?.valor ?? ''}`} title={d?.titulo}>
      <span className="pildora-ruta__icono"><Icono n={est === 'completo' && !calor ? 'check' : n.icono} size={15} /></span>
      <span className="pildora-ruta__txt">
        <small>Paso {n.paso}</small>
        <b>{n.corto}</b>
        <span className={d?.pendiente ? 'pend' : ''}>{d?.valor}{calor && d?.sub ? ` · ${d.sub}` : ''}</span>
      </span>
      {!!d?.incidencias && <span className="estacion__inc">{d.incidencias}</span>}
      {!!d?.paradas && <span className="estacion__par" style={{ left: 'auto', right: d?.incidencias ? 14 : -6, top: -6 }}>{d.paradas}</span>}
    </button>
  );
}

// ─────────────────────── Celular: recorrido vertical ───────────────────────

function RutaVertical({ datos, decisiones, seleccionado, siguiente, onSelect, onDecidir, calor, contexto }: PropsMapa) {
  const grupos: { etapa: Etapa; zona: 'planta' | 'granja' | null; ids: string[] }[] = [
    { etapa: 'A', zona: 'planta', ids: ['llegada', 'lavado_dec', 'lavado_espera', 'lavado', 'mant_dec', 'mant', 'diesel_dec', 'diesel', 'autorizacion', 'pesaje1', 'carga', 'pesaje2', 'factura', 'salida_planta'] },
    { etapa: 'B', zona: null, ids: ['ida'] },
    { etapa: 'B', zona: 'granja', ids: ['granja_llegada', 'lavado_granja', 'bio', 'hoja', 'descarga', 'pesaje_bio_final', 'salida_granja'] },
    { etapa: 'C', zona: null, ids: ['regreso', 'cierre'] },
  ];
  const actual = !calor ? (siguiente ?? 'cierre') : null;
  return (
    <div className="ruta-v">
      {grupos.map((g, gi) => {
        if (!g.zona) {
          return (
            <div key={gi}>
              {g.ids.map((id) => {
                const n = NODOS[id];
                const d = datos[id];
                if (n.tipo === 'traslado') {
                  return (
                    <button key={id} type="button" className={`rv-ruta ${seleccionado === id ? 'sel' : ''}`} onClick={() => onSelect(id)}>
                      <span className="rv-ruta__camion" style={id === 'regreso' ? { transform: 'scaleX(-1)' } : undefined}>
                        {contexto && (actual === id || calor) ? <Camion tipo={contexto.tipoCamion} ancho={92} /> : <Icono n={n.icono} size={22} />}
                      </span>
                      <span className="rv-ruta__txt">
                        <small>Paso {n.paso} · {n.corto}</small>
                        <b>{d?.valor}</b>
                        {!!d?.incidencias && <span className="chip chip--inc" style={{ marginLeft: 6 }}>{d.incidencias} inc.</span>}
                        {!!d?.paradas && <span className="chip chip--par" style={{ marginLeft: 4 }}>{d.paradas} par.</span>}
                      </span>
                    </button>
                  );
                }
                return <ItemV key={id} n={n} d={d} sel={seleccionado === id} sig={siguiente === id} aqui={actual === id} onClick={() => onSelect(id)} contexto={contexto} />;
              })}
              {g.etapa === 'C' && (
                <button type="button" className="rv-ciclo" onClick={() => onSelect('cierre')}>
                  <Icono n="ciclo" size={16} /> Al llegar a planta, la unidad vuelve al paso 1
                </button>
              )}
            </div>
          );
        }
        return (
          <section key={gi} className={`ruta-v__zona ruta-v__zona--${g.zona}`}>
            <header className="ruta-v__cab">
              {g.zona === 'planta' ? <PlantaIlustracion ancho={120} /> : <GranjaIlustracion ancho={120} />}
              <div>
                <small>{g.etapa} · {g.zona === 'planta' ? 'Planta' : 'Granja'}</small>
                <h3>{g.zona === 'planta' ? 'Planta · Pueblo Mayo' : contexto?.granja || 'Granja de destino'}</h3>
              </div>
            </header>
            <ol className="ruta-v__lista">
              {g.ids.map((id) => {
                const n = NODOS[id];
                const d = datos[id];
                if (n.tipo === 'decision') {
                  const val = n.decide ? decisiones[n.decide] : null;
                  return (
                    <li key={id} className={`rv-item rv-item--decision ${seleccionado === id ? 'sel' : ''}`}>
                      <button type="button" className="rv-dec__btn" onClick={() => onSelect(id)}>
                        <span className="rv-dec__texto">
                          <span className="rv-paso">Paso {n.paso} · Decisión</span>
                          {n.titulo}
                        </span>
                      </button>
                      {onDecidir && n.decide && !calor ? (
                        <span className="segmentado segmentado--sm">
                          <button type="button" className={val === true ? 'activo' : ''} onClick={() => onDecidir(n.decide!, val === true ? null : true)}>Sí</button>
                          <button type="button" className={val === false ? 'activo' : ''} onClick={() => onDecidir(n.decide!, val === false ? null : false)}>No</button>
                        </span>
                      ) : (
                        <span className="rv-valor">{d?.valor}</span>
                      )}
                    </li>
                  );
                }
                return <ItemV key={id} n={n} d={d} sel={seleccionado === id} sig={siguiente === id} aqui={actual === id} onClick={() => onSelect(id)} contexto={contexto} enLista />;
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function ItemV({ n, d, sel, sig, aqui, onClick, contexto, enLista }: {
  n: NodoDef; d?: DatoNodoMapa; sel: boolean; sig: boolean; aqui: boolean; onClick: () => void; contexto?: ContextoEscena; enLista?: boolean;
}) {
  const est = d?.estado ?? 'pendiente';
  const Tag = enLista ? 'li' : 'div';
  return (
    <Tag className={`rv-item est--${est} ${n.aplicaSi ? 'rv-item--cond' : ''} ${n.tipo === 'espera' ? 'rv-item--espera' : ''} ${sel ? 'sel' : ''} ${sig ? 'sig' : ''}`}>
      <button type="button" className="rv-card" onClick={onClick}>
        <span className="rv-icono"><Icono n={est === 'completo' ? 'check' : n.icono} size={16} /></span>
        <span className="rv-card__txt">
          <span className="rv-paso">{n.paso === '↺' ? 'Cierre' : `Paso ${n.paso}`}{n.aplicaSi ? ' · opcional' : ''}{d?.sub ? ` · ${d.sub}` : ''}</span>
          <span className="rv-titulo">{n.corto}</span>
          <span className="rv-chips">
            {d?.espera && <span className="chip chip--espera"><Icono n="espera" size={10} />{d.espera}</span>}
            {!!d?.incidencias && <span className="chip chip--inc">{d.incidencias} inc.</span>}
            {!!d?.paradas && <span className="chip chip--par">{d.paradas} par.</span>}
            {!!d?.faltantes && <span className="chip chip--falta">{d.faltantes} faltan</span>}
            {aqui && contexto && <span className="chip chip--falta" style={{ color: 'var(--g800)', borderColor: 'var(--g200)', background: 'var(--g50)' }}>Unidad aquí</span>}
          </span>
        </span>
        <span className={`rv-valor ${d?.pendiente ? 'pend' : ''}`}>{d?.valor}</span>
      </button>
    </Tag>
  );
}

export function Leyenda({ calor }: { calor?: boolean }) {
  return (
    <div className="leyenda">
      {!calor && (
        <span className="leyenda__grupo">
          <span className="ley-est ley-est--completo" />Completada
          <span className="ley-est ley-est--parcial" />En proceso
          <span className="ley-est" />Pendiente
          <span className="ley-est ley-est--no_aplica" />No aplica
        </span>
      )}
      <span className="leyenda__grupo">
        <span className="ley-est ley-est--espera" />Espera
        <span className="ley-rombo" />Decisión
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink-4)', marginLeft: 8 }}>OPCIONAL</span>Actividad opcional (ramal)
      </span>
      <span className="leyenda__grupo">
        <span className="ley-inc">2</span>Incidencias
        <span className="ley-par">1</span>Paradas necesarias u operativas
      </span>
      {!calor && (
        <span className="leyenda__grupo">
          <span className="ley-linea" />Recorrido completado
          <span className="ley-linea ley-linea--base" />Por recorrer
          <span className="ley-linea ley-linea--inactiva" />Ramal que no aplica
        </span>
      )}
    </div>
  );
}
