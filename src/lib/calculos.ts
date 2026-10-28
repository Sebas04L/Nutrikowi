// Cálculos de un viaje: duraciones, estado de cada nodo, tiempos por etapa,
// reparto sin duplicar solapes, combustible, toneladas, costos, incidencias, paradas y velocidad.
// Regla general: un dato faltante se reporta como null (pendiente), nunca como cero.
// Un dato marcado como estimado nunca se presenta como medición.

import type { Catalogos, Categoria, ClaseEvento, ValorCampo, Viaje } from '../types';
import { CAMPOS, NODOS, NODOS_LISTA, SEGMENTOS, SEGMENTOS_LISTA, type NodoDef } from './proceso';
import { asignarTiempo, minutosUnion, parseDT, type Asignacion, type Intervalo } from './tiempo';
import { categoriaEvento, claseDe, duracionEvento, esIncidencia, estadoConsumo } from './eventos';
import { calcularTramo, velocidadPromedio, type ResultadoTramo } from './velocidad';

export type EstadoNodo = 'pendiente' | 'parcial' | 'completo' | 'no_aplica' | 'por_decidir' | 'error';

export const ETIQUETA_ESTADO: Record<EstadoNodo, string> = {
  pendiente: 'Pendiente',
  parcial: 'En proceso',
  completo: 'Completada',
  no_aplica: 'No aplica',
  por_decidir: 'Según decisión',
  error: 'Revisar datos',
};

export interface ResultadoSegmento {
  id: string;
  nodo: string;
  categoria: Categoria;
  aplica: boolean | null;
  inicio: number | null;
  fin: number | null;
  min: number | null;
  fuente: 'horario' | 'captura' | 'no_aplica' | null;
  /** La duración proviene de una captura marcada como estimada. */
  estimado: boolean;
  error: string | null;
  aviso: string | null;
  referencia: number | null;
  excedeReferencia: boolean;
}

export interface ResultadoNodo {
  id: string;
  estado: EstadoNodo;
  aplica: boolean | null;
  faltantes: string[];
  requeridos: number;
  cumplidos: number;
  min: number | null;
  minEspera: number | null;
  ultimaHora: number | null;
  acumulado: number | null;
  /** Eventos (incidencias y paradas) vinculados a la actividad. */
  eventos: number;
  incidencias: number;
  posibleRetraso: boolean;
  tieneDatos: boolean;
}

export type CalidadDato = 'medido' | 'estimado' | 'insuficiente';

export interface ResultadoCombustible {
  litrosCargados: number | null;
  precioCarga: number | null;
  costoCarga: number | null;
  km: number | null;
  kmEstimado: boolean;
  kmFaltante: string | null;
  /** Litros consumidos MEDIDOS (null si no hay medición o si alguna entrada es estimada). */
  litrosConsumidos: number | null;
  fuenteConsumo: 'total' | 'tramos' | 'niveles' | null;
  litrosTraslado: number | null;
  incluyeTdf: boolean | null;
  tdfSinMedir: boolean;
  litrosEstimados: number | null;
  fuenteEstimado: 'captura' | 'rendimiento_ref' | 'datos_estimados' | null;
  calidad: CalidadDato;
  rendimiento: number | null;
  rendimientoEstimado: number | null;
  lt100km: number | null;
  precioValuacion: number | null;
  fuentePrecio: 'carga' | 'referencia' | null;
  costoConsumido: number | null;
  costoPorKm: number | null;
  costoPorTon: number | null;
  litrosPorTon: number | null;
  costoEstimado: number | null;
  /** Indicadores calculados con datos estimados (nunca se mezclan con los medidos). */
  est: { lt100km: number | null; costoPorKm: number | null; costoPorTon: number | null; litrosPorTon: number | null };
  notas: string[];
}

export interface ResumenEventos {
  total: number;
  incidencias: number;
  paradas: number;
  minIncidencia: number;
  minParada: number;
  sinDuracion: number;
  afectaronEntrega: number;
  fallas: number;
  motorEncendidoMin: number;
  litrosMedidos: number;
  litrosEstimados: number;
  porTipo: Record<string, number>;
  porClase: Record<ClaseEvento, number>;
}

export interface ResultadoViaje {
  segmentos: Record<string, ResultadoSegmento>;
  nodos: Record<string, ResultadoNodo>;
  inicio: number | null;
  fin: number | null;
  total: number | null;
  fuenteTotal: 'horario' | 'suma_etapas' | null;
  /** Tiempo transcurrido desde la llegada hasta la última hora registrada. */
  acumulado: number | null;
  etapas: { planta: number | null; ida: number | null; granja: number | null; regreso: number | null };
  /** Ida + regreso (sólo si ambos tienen dato). */
  traslado: number | null;
  /** Suma de minutos imputados a cada categoría (puede exceder el tiempo real si hay solapes). */
  imputado: Record<Categoria, number>;
  /** Reparto del tiempo real sin duplicar (null si no hay rango con horarios). */
  real: Asignacion | null;
  rangoReal: 'ciclo' | 'parcial' | null;
  solape: number;
  sinHorario: number;
  espera: number | null;
  lavado: number | null;
  carga: number | null;
  descarga: number | null;
  /** Tiempo operativo en planta y granja (suma de actividades no-espera, no-traslado). */
  operativo: number | null;
  toneladas: {
    programadas: number | null;
    cargadas: number | null;
    netas: number | null;
    fuenteTara: 'tara' | 'peso_vacio' | null;
    entregadas: number | null;
    entregadasEstimadas: boolean;
  };
  mantenimiento: { aplica: boolean | null; costo: number | null; parcial: number | null };
  combustible: ResultadoCombustible;
  costoRegistrado: number | null;
  costoPorTon: number | null;
  eventos: ResumenEventos;
  velocidad: { tramos: ResultadoTramo[]; ida: number | null; regreso: number | null; excesos: number };
  completitud: { requeridos: number; cumplidos: number; pct: number };
  avance: { completos: number; aplicables: number };
  alertas: { nodo?: string; texto: string }[];
}

const vacio = (v: ValorCampo | undefined) => v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v));
export const tieneValor = (v: ValorCampo | undefined) => !vacio(v);

export function numero(v: ValorCampo | undefined): number | null {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v);
  return null;
}

export function sino(v: ValorCampo | undefined): boolean | null {
  return v === true ? true : v === false ? false : null;
}

function aplicaNodo(n: NodoDef, v: Viaje['v']): boolean | null {
  return n.aplicaSi ? sino(v[n.aplicaSi]) : true;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function calcularViaje(viaje: Viaje, cat: Catalogos): ResultadoViaje {
  const v = viaje.v;
  const est = (id: string) => !!viaje.estimados?.[id];
  const alertas: ResultadoViaje['alertas'] = [];

  // ── Segmentos
  const segmentos: Record<string, ResultadoSegmento> = {};
  for (const s of SEGMENTOS_LISTA) {
    const nodo = NODOS[s.nodo];
    let aplica = aplicaNodo(nodo, v);
    if (aplica !== false && s.aplicaSi) {
      const a2 = sino(v[s.aplicaSi]);
      aplica = aplica === null || a2 === null ? (a2 === false ? false : null) : a2;
    }
    const ini = parseDT(v[s.inicio]);
    const fin = parseDT(v[s.fin]);
    const man = numero(v[s.manual]);
    let min: number | null = null;
    let fuente: ResultadoSegmento['fuente'] = null;
    let error: string | null = null;
    let aviso: string | null = null;
    if (aplica === false) {
      fuente = 'no_aplica';
    } else if (ini != null && fin != null) {
      if (fin < ini) error = 'La hora de fin es anterior a la de inicio.';
      else {
        min = (fin - ini) / 60000;
        fuente = 'horario';
        if (man != null && Math.abs(man - min) >= 1) aviso = 'Hay una duración capturada distinta; se usa la calculada con horarios.';
      }
    } else if (man != null) {
      min = man;
      fuente = 'captura';
    }
    if (min != null && min > 24 * 60 && s.categoria !== 'traslado') aviso = 'Duración mayor a 24 h: revisa el día de las horas.';
    const referencia = cat.tiemposReferencia[s.id] ?? null;
    segmentos[s.id] = {
      id: s.id, nodo: s.nodo, categoria: s.categoria, aplica,
      inicio: ini, fin, min, fuente, estimado: fuente === 'captura' && est(s.manual), error, aviso, referencia,
      excedeReferencia: referencia != null && min != null && min > referencia,
    };
  }

  // ── Inicio y fin del ciclo
  const inicio = parseDT(v['llegada.hora']);
  const fin = parseDT(v['reg.llegada']);

  // ── Eventos (incidencias y paradas)
  const eventosPorNodo: Record<string, { total: number; incid: number; retraso: boolean }> = {};
  const porTipo: Record<string, number> = {};
  const porClase: Record<ClaseEvento, number> = { necesaria: 0, operativa: 0, demora: 0, falla: 0, otra: 0 };
  const resEv: ResumenEventos = {
    total: 0, incidencias: 0, paradas: 0, minIncidencia: 0, minParada: 0, sinDuracion: 0, afectaronEntrega: 0, fallas: 0,
    motorEncendidoMin: 0, litrosMedidos: 0, litrosEstimados: 0, porTipo, porClase,
  };
  const intsEventos: Intervalo[] = [];
  for (const e of viaje.eventos ?? []) {
    const clase = claseDe(e.tipo, cat);
    const incid = esIncidencia(clase);
    const d = duracionEvento(e);
    resEv.total++;
    porTipo[e.tipo || 'Sin tipo'] = (porTipo[e.tipo || 'Sin tipo'] ?? 0) + 1;
    porClase[clase]++;
    if (incid) resEv.incidencias++;
    else resEv.paradas++;
    if (d == null) resEv.sinDuracion++;
    else if (incid) resEv.minIncidencia += d;
    else resEv.minParada += d;
    if (e.afectoEntrega) resEv.afectaronEntrega++;
    if (e.desperfecto || clase === 'falla') resEv.fallas++;
    if (e.motor === 'encendido' && d != null) resEv.motorEncendidoMin += d;
    const ec = estadoConsumo(e);
    if (ec === 'medido') resEv.litrosMedidos += e.litros ?? 0;
    if (ec === 'estimado') resEv.litrosEstimados += e.litros ?? 0;
    if (e.nodo && NODOS[e.nodo]) {
      const x = (eventosPorNodo[e.nodo] ??= { total: 0, incid: 0, retraso: false });
      x.total++;
      if (incid) x.incid++;
      if (clase === 'demora' || clase === 'falla') x.retraso = true;
    }
    const a = parseDT(e.inicio);
    const b = parseDT(e.fin);
    if (a != null && b != null && b > a) intsEventos.push({ a, b, cat: categoriaEvento(clase), clave: e.id });
  }

  // ── Nodos
  const nodos: Record<string, ResultadoNodo> = {};
  let completos = 0;
  let aplicables = 0;
  let reqTotal = 0;
  let reqOk = 0;
  for (const n of NODOS_LISTA) {
    const aplica = aplicaNodo(n, v);
    const faltantes: string[] = [];
    let cumplidos = 0;
    let requeridos = 0;
    let error = false;
    for (const r of n.requeridos) {
      if (r.startsWith('seg:')) {
        const sr = segmentos[r.slice(4)];
        if (sr.aplica === false) continue;
        requeridos++;
        if (sr.error) error = true;
        if (sr.min != null) cumplidos++;
        else faltantes.push(SEGMENTOS[sr.id].label);
      } else {
        requeridos++;
        if (tieneValor(v[r])) cumplidos++;
        else faltantes.push(CAMPOS[r]?.label ?? r);
      }
    }
    const ids = [...n.campos];
    for (const sid of n.segmentos) {
      const s = SEGMENTOS[sid];
      ids.push(s.inicio, s.fin, s.manual);
    }
    const ev = eventosPorNodo[n.id];
    const tieneDatos = ids.some((id) => tieneValor(v[id])) || !!ev;

    const segs = n.segmentos.map((id) => segmentos[id]).filter((s) => s.aplica !== false);
    let min: number | null = null;
    let minEspera: number | null = null;
    if (segs.length) {
      const conHorario = segs.filter((s) => s.fuente === 'horario');
      const capturados = segs.filter((s) => s.fuente === 'captura');
      if (conHorario.length || capturados.length) {
        min = minutosUnion(conHorario.map((s) => ({ a: s.inicio!, b: s.fin! }))) + capturados.reduce((t, s) => t + (s.min ?? 0), 0);
      }
      const esperas = segs.filter((s) => s.categoria === 'espera' && s.min != null);
      if (esperas.length) minEspera = esperas.reduce((t, s) => t + s.min!, 0);
    }
    let ultimaHora: number | null = null;
    for (const id of ids) {
      if (CAMPOS[id]?.tipo === 'hora') {
        const t = parseDT(v[id]);
        if (t != null && (ultimaHora == null || t > ultimaHora)) ultimaHora = t;
      }
    }
    const posibleRetraso = segs.some((s) => s.excedeReferencia) || !!ev?.retraso;

    let estado: EstadoNodo;
    if (aplica === false) estado = 'no_aplica';
    else if (aplica === null && !tieneDatos) estado = 'por_decidir';
    else if (error) estado = 'error';
    else if (requeridos > 0 && cumplidos === requeridos) estado = 'completo';
    else if (tieneDatos || cumplidos > 0) estado = 'parcial';
    else estado = 'pendiente';

    if (aplica !== false) {
      aplicables++;
      if (estado === 'completo') completos++;
      reqTotal += requeridos;
      reqOk += cumplidos;
    }
    nodos[n.id] = {
      id: n.id, estado, aplica, faltantes, requeridos, cumplidos, min, minEspera, ultimaHora,
      acumulado: inicio != null && ultimaHora != null ? (ultimaHora - inicio) / 60000 : null,
      eventos: ev?.total ?? 0, incidencias: ev?.incid ?? 0, posibleRetraso, tieneDatos,
    };
  }

  // ── Etapas (tiempo real transcurrido entre hitos)
  const t = (id: string) => parseDT(v[id]);
  const entre = (a: number | null, b: number | null) => (a != null && b != null && b >= a ? (b - a) / 60000 : null);
  const salida = t('salida.hora');
  const llegG = t('granja.llegada');
  const salG = t('salidaG.hora');
  const etapas = {
    planta: entre(inicio, salida),
    ida: segmentos.ida.min,
    granja: entre(llegG, salG),
    regreso: segmentos.regreso.min,
  };
  let total = entre(inicio, fin);
  let fuenteTotal: ResultadoViaje['fuenteTotal'] = total != null ? 'horario' : null;
  if (total == null && Object.values(etapas).every((x) => x != null)) {
    total = etapas.planta! + etapas.ida! + etapas.granja! + etapas.regreso!;
    fuenteTotal = 'suma_etapas';
  }
  if (inicio != null && fin != null && fin < inicio) alertas.push({ nodo: 'cierre', texto: 'La llegada a planta es anterior a la llegada inicial del ciclo.' });

  let ultima: number | null = null;
  for (const n of Object.values(nodos)) if (n.ultimaHora != null && (ultima == null || n.ultimaHora > ultima)) ultima = n.ultimaHora;
  const acumulado = inicio != null && ultima != null && ultima >= inicio ? (ultima - inicio) / 60000 : null;

  // ── Imputado y reparto real
  const imputado: Record<Categoria, number> = { operativo: 0, espera: 0, traslado: 0, parada: 0, incidencia: 0 };
  const ints: Intervalo[] = [];
  let sinHorario = 0;
  for (const s of Object.values(segmentos)) {
    if (s.aplica === false || s.min == null) continue;
    imputado[s.categoria] += s.min;
    if (s.fuente === 'horario') ints.push({ a: s.inicio!, b: s.fin!, cat: s.categoria, clave: s.id });
    else sinHorario += s.min;
  }
  imputado.incidencia += resEv.minIncidencia;
  imputado.parada += resEv.minParada;
  ints.push(...intsEventos);
  let real: Asignacion | null = null;
  let rangoReal: ResultadoViaje['rangoReal'] = null;
  const timed = ints.filter((i) => i.cat !== 'incidencia' && i.cat !== 'parada');
  if (inicio != null && fin != null && fin > inicio) {
    real = asignarTiempo(ints, inicio, fin);
    rangoReal = 'ciclo';
  } else if (timed.length) {
    const a = Math.min(inicio ?? Infinity, ...timed.map((i) => i.a));
    const b = Math.max(...timed.map((i) => i.b), ultima ?? -Infinity);
    real = asignarTiempo(ints, a, b);
    rangoReal = 'parcial';
  }
  const sumTimed = timed.reduce((tt, i) => tt + (i.b - i.a) / 60000, 0);
  const solape = Math.max(0, sumTimed - minutosUnion(timed));

  // ── Toneladas
  const tara = numero(v['p2.tara']);
  const pesoVacio = numero(v['p1.pesoVacio']);
  const bruto = numero(v['p2.pesoBruto']);
  const taraUsada = tara ?? pesoVacio;
  const netas = bruto != null && taraUsada != null ? r2((bruto - taraUsada) / 1000) : null;
  if (netas != null && netas < 0) alertas.push({ nodo: 'pesaje2', texto: 'El peso bruto cargado es menor que la tara.' });
  const cargadas = numero(v['carga.ton']);
  const entregadas = numero(v['desc.ton']);
  const capNom = viaje.config.capacidadNominal;
  if (cargadas != null && capNom != null && cargadas > capNom)
    alertas.push({ nodo: 'carga', texto: `Toneladas cargadas (${cargadas}) superan la capacidad nominal registrada (${capNom} t).` });
  if (entregadas != null && cargadas != null && entregadas > cargadas + 0.5)
    alertas.push({ nodo: 'descarga', texto: `Las toneladas descargadas (${entregadas}) superan las cargadas (${cargadas}).` });
  const comps = numero(v['carga.compartimentos']);
  const compMax = viaje.config.compartimentosPorTolva != null && viaje.config.numTolvas != null ? viaje.config.compartimentosPorTolva * viaje.config.numTolvas : null;
  if (comps != null && compMax != null && comps > compMax)
    alertas.push({ nodo: 'carga', texto: `Se registraron ${comps} compartimentos y la configuración tiene ${compMax}.` });

  // ── Mantenimiento
  const mantAplica = sino(v['mant.aplica']);
  const mo = numero(v['mant.costoMO']);
  const mat = numero(v['mant.costoMat']);
  const mantenimiento = {
    aplica: mantAplica,
    costo: mantAplica === true && mo != null && mat != null ? mo + mat : mantAplica === false ? 0 : null,
    parcial: mantAplica === true && (mo != null || mat != null) && !(mo != null && mat != null) ? (mo ?? 0) + (mat ?? 0) : null,
  };

  // ── Combustible
  const combustible = calcularCombustible(viaje, cat, entregadas);

  // ── Velocidad
  const lim = cat.limitesVelocidad;
  const tramos = (viaje.tramos ?? []).map((x) => calcularTramo(x, lim));
  const vIda = velocidadPromedio(numero(v['ida.km']), segmentos.ida.min);
  const vReg = velocidadPromedio(numero(v['reg.km']), segmentos.regreso.min);
  let excesos = 0;
  for (const [vel, nodo, txt] of [[vIda, 'ida', 'ida'], [vReg, 'regreso', 'regreso']] as const) {
    if (vel != null && lim.carretera != null && vel > lim.carretera) {
      excesos++;
      alertas.push({ nodo, texto: `La velocidad promedio calculada del trayecto de ${txt} (${vel.toFixed(0)} km/h) supera el límite configurado de ${lim.carretera} km/h. Revisa horas o kilómetros.` });
    }
  }
  for (const tr of tramos) {
    if (tr.excedeProm || tr.excedeMax) excesos++;
    if (tr.error) alertas.push({ texto: `Tramo de velocidad: ${tr.error}` });
  }
  for (const s of Object.values(segmentos)) if (s.error) alertas.push({ nodo: s.nodo, texto: `${SEGMENTOS[s.id].label}: ${s.error}` });

  // ── Costos registrados
  const costoRegistrado =
    combustible.costoConsumido != null && mantenimiento.costo != null ? combustible.costoConsumido + mantenimiento.costo : null;
  const costoPorTon = costoRegistrado != null && entregadas != null && entregadas > 0 && !est('desc.ton') ? costoRegistrado / entregadas : null;

  // Tiempo operativo: actividades de planta y granja que no son espera ni traslado (sin duplicar solapes por nodo)
  const nodosOp = NODOS_LISTA.filter((n) => n.tipo === 'actividad' && nodos[n.id].aplica !== false);
  const operativo = nodosOp.every((n) => nodos[n.id].min != null)
    ? nodosOp.reduce((tt, n) => tt + (nodos[n.id].min! - (nodos[n.id].minEspera ?? 0)), 0)
    : null;

  return {
    segmentos, nodos, inicio, fin, total, fuenteTotal, acumulado, etapas,
    traslado: etapas.ida != null && etapas.regreso != null ? etapas.ida + etapas.regreso : null,
    imputado, real, rangoReal, solape, sinHorario,
    espera: sumaSi([segmentos.esperaLavado, segmentos.esperaAut, segmentos.esperaDescarga]),
    lavado: segmentos.lavado.min,
    carga: segmentos.carga.min,
    descarga: segmentos.descarga.min,
    operativo,
    toneladas: {
      programadas: viaje.config.toneladasProgramadas,
      cargadas, netas,
      fuenteTara: tara != null ? 'tara' : pesoVacio != null ? 'peso_vacio' : null,
      entregadas,
      entregadasEstimadas: est('desc.ton'),
    },
    mantenimiento, combustible, costoRegistrado, costoPorTon,
    eventos: resEv,
    velocidad: { tramos, ida: vIda, regreso: vReg, excesos },
    completitud: { requeridos: reqTotal, cumplidos: reqOk, pct: reqTotal ? reqOk / reqTotal : 0 },
    avance: { completos, aplicables },
    alertas,
  };
}

/** Suma segmentos sólo si todos los que aplican tienen dato; los que no aplican cuentan 0. */
function sumaSi(segs: ResultadoSegmento[]): number | null {
  let t = 0;
  for (const s of segs) {
    if (s.aplica === false) continue;
    if (s.min == null) return null;
    t += s.min;
  }
  return t;
}

export function calcularCombustible(viaje: Viaje, cat: Catalogos, tonEntregadas: number | null): ResultadoCombustible {
  const v = viaje.v;
  const est = (id: string) => !!viaje.estimados?.[id];
  const notas: string[] = [];
  const dieselAplica = sino(v['diesel.aplica']);
  const litrosCargados = dieselAplica === true ? numero(v['diesel.litros']) : dieselAplica === false ? 0 : null;
  const precioCarga = dieselAplica === true ? numero(v['diesel.precio']) : null;
  const costoCarga = dieselAplica === true && litrosCargados != null && precioCarga != null ? litrosCargados * precioCarga : dieselAplica === false ? 0 : null;

  const kmIda = numero(v['ida.km']);
  const kmReg = numero(v['reg.km']);
  const km = kmIda != null && kmReg != null ? kmIda + kmReg : null;
  const kmEstimado = km != null && (est('ida.km') || est('reg.km'));
  const kmFaltante = km != null ? null : kmIda == null && kmReg == null ? 'Faltan km de ida y regreso' : kmIda == null ? 'Faltan km de ida' : 'Faltan km de regreso';

  const lIda = numero(v['ida.litros']);
  const lReg = numero(v['reg.litros']);
  const ptoTipo = (v['desc.ptoTipo'] as string) || unidadDe(viaje, cat)?.tomaFuerza || '';
  const lPto = numero(v['desc.ptoLitros']);
  const total = numero(v['comb.consumoTotal']);
  const nIni = numero(v['comb.nivelInicial']);
  const nFin = numero(v['comb.nivelFinal']);

  let consumo: number | null = null;
  let fuenteConsumo: ResultadoCombustible['fuenteConsumo'] = null;
  let traslado: number | null = null;
  let incluyeTdf: boolean | null = null;
  let usaEstimados = false;
  const tdfSinMedir = ptoTipo === 'Diésel' && lPto == null;

  if (total != null) {
    consumo = total;
    fuenteConsumo = 'total';
    incluyeTdf = ptoTipo === 'Diésel' ? true : null;
    traslado = lPto != null ? total - lPto : total;
    usaEstimados = est('comb.consumoTotal') || (lPto != null && est('desc.ptoLitros'));
    if (lPto == null && ptoTipo === 'Diésel') notas.push('El rendimiento incluye el diésel de la toma de fuerza porque no se midió por separado.');
  } else if (lIda != null && lReg != null) {
    traslado = lIda + lReg;
    consumo = traslado + (lPto ?? 0);
    fuenteConsumo = 'tramos';
    incluyeTdf = lPto != null;
    usaEstimados = est('ida.litros') || est('reg.litros') || (lPto != null && est('desc.ptoLitros'));
    if (tdfSinMedir) notas.push('El consumo del ciclo no incluye la toma de fuerza (accionada con diésel, sin medir).');
  } else if (nIni != null && nFin != null && litrosCargados != null) {
    consumo = nIni + litrosCargados - nFin;
    fuenteConsumo = 'niveles';
    traslado = lPto != null ? consumo - lPto : consumo;
    usaEstimados = est('comb.nivelInicial') || est('comb.nivelFinal') || est('diesel.litros');
    notas.push('Consumo por balance de niveles: nivel inicial + litros cargados − nivel final.');
    if (consumo < 0) {
      notas.push('El balance de niveles da un valor negativo; revisa los niveles capturados.');
      consumo = null;
      traslado = null;
      fuenteConsumo = null;
    }
  } else if (lIda != null || lReg != null) {
    notas.push('Sólo hay consumo de un tramo; no se puede calcular el consumo del ciclo.');
  }

  // Consumo medido sólo si ninguna entrada está marcada como estimada.
  const litrosConsumidos = usaEstimados ? null : consumo;
  const litrosTraslado = usaEstimados ? null : traslado;

  let litrosEstimados: number | null = null;
  let fuenteEstimado: ResultadoCombustible['fuenteEstimado'] = null;
  let trasladoEst: number | null = null;
  if (usaEstimados && consumo != null) {
    litrosEstimados = consumo;
    trasladoEst = traslado;
    fuenteEstimado = 'datos_estimados';
    notas.push('Uno o más datos de consumo están marcados como estimados: los resultados se presentan como estimación.');
  }
  if (litrosEstimados == null && litrosConsumidos == null) {
    const capt = numero(v['comb.consumoEstimado']);
    if (capt != null) {
      litrosEstimados = capt;
      trasladoEst = capt;
      fuenteEstimado = 'captura';
    } else {
      const rendRef = unidadDe(viaje, cat)?.rendimientoRef ?? null;
      const kmBase = km ?? viaje.config.kmEstimados;
      if (rendRef != null && rendRef > 0 && kmBase != null) {
        litrosEstimados = kmBase / rendRef;
        trasladoEst = litrosEstimados;
        fuenteEstimado = 'rendimiento_ref';
      }
    }
  }

  const calidad: CalidadDato = litrosConsumidos != null ? 'medido' : litrosEstimados != null ? 'estimado' : 'insuficiente';
  if (calidad !== 'medido' && litrosCargados != null && litrosCargados > 0)
    notas.push('Los litros cargados no se usan como consumo: una recarga no representa el consumo de un solo viaje.');
  if (kmEstimado) notas.push('Los kilómetros están marcados como estimados: el rendimiento se presenta como estimación.');

  const medidoCompleto = calidad === 'medido' && !kmEstimado;
  const rendimiento = medidoCompleto && km != null && litrosTraslado != null && litrosTraslado > 0 ? km / litrosTraslado : null;
  const baseRendEst = litrosTraslado ?? trasladoEst;
  const rendimientoEstimado = rendimiento == null && km != null && baseRendEst != null && baseRendEst > 0 ? km / baseRendEst : null;
  const lt100km = medidoCompleto && km != null && km > 0 && litrosTraslado != null ? (litrosTraslado / km) * 100 : null;

  const precioRef = numero(v['comb.precioRef']);
  const precioValuacion = precioCarga ?? precioRef;
  const fuentePrecio = precioCarga != null ? 'carga' : precioRef != null ? 'referencia' : null;
  const costoConsumido = litrosConsumidos != null && precioValuacion != null ? litrosConsumidos * precioValuacion : null;
  const costoPorKm = medidoCompleto && costoConsumido != null && km != null && km > 0 ? costoConsumido / km : null;
  const tonOk = tonEntregadas != null && tonEntregadas > 0;
  const tonEst = est('desc.ton');
  const costoPorTon = costoConsumido != null && tonOk && !tonEst ? costoConsumido / tonEntregadas! : null;
  const litrosPorTon = litrosConsumidos != null && tonOk && !tonEst ? litrosConsumidos / tonEntregadas! : null;
  const costoEstimado = calidad === 'estimado' && litrosEstimados != null && precioValuacion != null ? litrosEstimados * precioValuacion : null;

  // Variantes estimadas (sólo cuando no existe el valor medido)
  const litrosAny = litrosConsumidos ?? litrosEstimados;
  const costoAny = costoConsumido ?? costoEstimado;
  const estObj = {
    lt100km: lt100km == null && km != null && km > 0 && (litrosTraslado ?? trasladoEst) != null ? ((litrosTraslado ?? trasladoEst)! / km) * 100 : null,
    costoPorKm: costoPorKm == null && costoAny != null && km != null && km > 0 ? costoAny / km : null,
    costoPorTon: costoPorTon == null && costoAny != null && tonOk ? costoAny / tonEntregadas! : null,
    litrosPorTon: litrosPorTon == null && litrosAny != null && tonOk ? litrosAny / tonEntregadas! : null,
  };

  return {
    litrosCargados, precioCarga, costoCarga, km, kmEstimado, kmFaltante, litrosConsumidos, fuenteConsumo, litrosTraslado, incluyeTdf, tdfSinMedir,
    litrosEstimados, fuenteEstimado, calidad, rendimiento, rendimientoEstimado, lt100km, precioValuacion, fuentePrecio,
    costoConsumido, costoPorKm, costoPorTon, litrosPorTon, costoEstimado, est: estObj, notas,
  };
}

export function unidadDe(viaje: Viaje, cat: Catalogos) {
  return cat.unidades.find((u) => u.id === viaje.config.unidadId) ?? null;
}
