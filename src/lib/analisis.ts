// Agregados para indicadores y análisis. Toda estadística reporta cuántos
// viajes tienen el dato (n) para no presentar promedios con datos faltantes como completos.

import type { Catalogos, Viaje } from '../types';
import { calcularViaje, type ResultadoViaje } from './calculos';
import { calidadViaje, type CalidadViaje, type EstadoCalidad } from './calidad';
import { NODOS_LISTA, SEGMENTOS_LISTA } from './proceso';

export interface Filtros {
  granjaId: string;
  rutaId: string;
  unidadId: string;
  configuracionId: string;
  tipoTolva: string;
  tipoAlimento: string;
  choferId: string;
  calidad: '' | EstadoCalidad;
  desde: string;
  hasta: string;
}

export const FILTROS_VACIOS: Filtros = { granjaId: '', rutaId: '', unidadId: '', configuracionId: '', tipoTolva: '', tipoAlimento: '', choferId: '', calidad: '', desde: '', hasta: '' };

export function filtrar(viajes: Viaje[], f: Filtros): Viaje[] {
  return viajes.filter((v) => {
    const c = v.config;
    if (f.granjaId && c.granjaId !== f.granjaId) return false;
    if (f.rutaId && c.rutaId !== f.rutaId) return false;
    if (f.unidadId && c.unidadId !== f.unidadId) return false;
    if (f.configuracionId && c.configuracionId !== f.configuracionId) return false;
    if (f.choferId && c.choferId !== f.choferId) return false;
    if (f.tipoTolva && c.tipoTolva !== f.tipoTolva) return false;
    if (f.tipoAlimento) {
      const ta = (v.v['carga.tipoAlimento'] as string) || c.tipoAlimento;
      if (ta !== f.tipoAlimento) return false;
    }
    if (f.desde && c.fecha < f.desde) return false;
    if (f.hasta && c.fecha > f.hasta) return false;
    return true;
  });
}

export interface ViajeCalc {
  viaje: Viaje;
  r: ResultadoViaje;
  q: CalidadViaje;
}

/** Filtro por estado de integridad (requiere los cálculos). */
export function filtrarCalidad(calcs: ViajeCalc[], f: Filtros): ViajeCalc[] {
  return f.calidad ? calcs.filter((c) => c.q.estado === f.calidad) : calcs;
}

export function calcularTodos(viajes: Viaje[], cat: Catalogos): ViajeCalc[] {
  return viajes.map((viaje) => {
    const r = calcularViaje(viaje, cat);
    return { viaje, r, q: calidadViaje(viaje, r) };
  });
}

export interface Estad {
  n: number;
  de: number;
  prom: number | null;
  suma: number | null;
  min: number | null;
  max: number | null;
  mediana: number | null;
}

export function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function estad(vals: (number | null | undefined)[]): Estad {
  const xs = vals.filter((x): x is number => x != null && isFinite(x));
  if (!xs.length) return { n: 0, de: vals.length, prom: null, suma: null, min: null, max: null, mediana: null };
  const suma = xs.reduce((a, b) => a + b, 0);
  return { n: xs.length, de: vals.length, prom: suma / xs.length, suma, min: Math.min(...xs), max: Math.max(...xs), mediana: mediana(xs) };
}

export const claveComparable = (v: Viaje) => `${v.config.rutaId || '—'}|${v.config.configuracionId || '—'}`;

export interface GrupoComparable {
  clave: string;
  rutaId: string;
  configuracionId: string;
  viajes: ViajeCalc[];
}

export function gruposComparables(calcs: ViajeCalc[]): GrupoComparable[] {
  const m = new Map<string, GrupoComparable>();
  for (const c of calcs) {
    const k = claveComparable(c.viaje);
    if (!m.has(k)) m.set(k, { clave: k, rutaId: c.viaje.config.rutaId, configuracionId: c.viaje.config.configuracionId, viajes: [] });
    m.get(k)!.viajes.push(c);
  }
  return [...m.values()].sort((a, b) => b.viajes.length - a.viajes.length);
}

/** Rendimiento agregado ponderado: suma de km ÷ suma de litros, sólo con viajes medidos. */
export function rendimientoPonderado(calcs: { r: ResultadoViaje }[]) {
  let km = 0;
  let l = 0;
  let n = 0;
  for (const { r } of calcs) {
    const c = r.combustible;
    if (c.rendimiento != null && c.km != null && c.litrosTraslado != null) {
      km += c.km;
      l += c.litrosTraslado;
      n++;
    }
  }
  return { valor: n && l > 0 ? km / l : null, n, de: calcs.length };
}

export interface FilaActividad {
  nodo: string;
  dur: Estad;
  espera: Estad;
  aplicaEn: number;
  faltantes: number;
  incidencias: number;
  clasif: { normal: number; excepcion: number; investigar: number };
}

export function porActividad(calcs: ViajeCalc[]): FilaActividad[] {
  return NODOS_LISTA.filter((n) => n.tipo !== 'decision').map((n) => {
    const aplican = calcs.filter((c) => c.r.nodos[n.id].aplica !== false);
    const clasif = { normal: 0, excepcion: 0, investigar: 0 };
    for (const c of calcs) {
      const e = c.viaje.clasif[n.id]?.estado;
      if (e) clasif[e]++;
    }
    return {
      nodo: n.id,
      dur: estad(aplican.map((c) => c.r.nodos[n.id].min)),
      espera: estad(aplican.map((c) => c.r.nodos[n.id].minEspera)),
      aplicaEn: aplican.length,
      faltantes: aplican.filter((c) => c.r.nodos[n.id].faltantes.length > 0).length,
      incidencias: calcs.reduce((t, c) => t + c.r.nodos[n.id].incidencias, 0),
      clasif,
    };
  });
}

export interface Atipico {
  viaje: Viaje;
  segmento: string;
  valor: number;
  mediana: number;
  n: number;
}

/**
 * Segmentos cuyo tiempo supera `factor` × la mediana de su grupo comparable
 * (misma ruta y misma configuración). Requiere al menos 3 viajes con dato.
 * Es una señal para investigar, no un juicio de eficiencia.
 */
export function atipicos(calcs: ViajeCalc[], factor: number): Atipico[] {
  const out: Atipico[] = [];
  for (const g of gruposComparables(calcs)) {
    for (const s of SEGMENTOS_LISTA) {
      const vals = g.viajes.map((c) => ({ c, x: c.r.segmentos[s.id].min })).filter((o): o is { c: ViajeCalc; x: number } => o.x != null);
      if (vals.length < 3) continue;
      const med = mediana(vals.map((o) => o.x))!;
      if (med <= 0) continue;
      for (const o of vals) if (o.x > med * factor) out.push({ viaje: o.c.viaje, segmento: s.id, valor: o.x, mediana: med, n: vals.length });
    }
  }
  return out.sort((a, b) => b.valor / b.mediana - a.valor / a.mediana);
}

// ───────────────────────── Composición por etapa y comparador ─────────────────────────

export interface ParteEtapa {
  id: string;
  label: string;
  cat: 'operativo' | 'espera' | 'traslado';
  min: number | null;
}

/** Composición del ciclo en 6 partes sin duplicar (planta y granja separan su espera). */
export function composicionEtapas(r: ResultadoViaje): ParteEtapa[] {
  const espPlanta = [r.segmentos.esperaLavado, r.segmentos.esperaAut].filter((s) => s.aplica !== false);
  const ePlanta = espPlanta.every((s) => s.min != null) ? espPlanta.reduce((t, s) => t + s.min!, 0) : null;
  const eGranja = r.segmentos.esperaDescarga.aplica === false ? 0 : r.segmentos.esperaDescarga.min;
  return [
    { id: 'planta_espera', label: 'Espera en planta', cat: 'espera', min: ePlanta },
    { id: 'planta', label: 'Planta (resto)', cat: 'operativo', min: r.etapas.planta != null && ePlanta != null ? Math.max(0, r.etapas.planta - ePlanta) : null },
    { id: 'ida', label: 'Trayecto ida', cat: 'traslado', min: r.etapas.ida },
    { id: 'granja_espera', label: 'Espera en granja', cat: 'espera', min: eGranja },
    { id: 'granja', label: 'Granja (resto)', cat: 'operativo', min: r.etapas.granja != null && eGranja != null ? Math.max(0, r.etapas.granja - eGranja) : null },
    { id: 'regreso', label: 'Trayecto regreso', cat: 'traslado', min: r.etapas.regreso },
  ];
}

export type FormatoMetrica = 'dur' | 'km' | 'l' | 'kml' | 'lt' | 'mxn' | 'n';

export interface DatoMetrica {
  v: number | null;
  est?: boolean;
}

export interface MetricaComparador {
  id: string;
  label: string;
  formato: FormatoMetrica;
  grupo: 'Tiempo' | 'Combustible y costo' | 'Eventos';
  dato: (r: ResultadoViaje) => DatoMetrica;
}

const med = (v: number | null): DatoMetrica => ({ v });

export const METRICAS_COMPARADOR: MetricaComparador[] = [
  { id: 'total', label: 'Duración total del ciclo', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.total) },
  { id: 'planta', label: 'Tiempo en planta', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.etapas.planta) },
  { id: 'espera', label: 'Tiempo de espera', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.espera) },
  { id: 'lavado', label: 'Tiempo de lavado', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.lavado) },
  { id: 'carga', label: 'Tiempo de carga', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.carga) },
  { id: 'traslado', label: 'Tiempo de traslado (ida + regreso)', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.traslado) },
  { id: 'granja', label: 'Tiempo en granja', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.etapas.granja) },
  { id: 'descarga', label: 'Tiempo de descarga', formato: 'dur', grupo: 'Tiempo', dato: (r) => med(r.descarga) },
  { id: 'km', label: 'Kilómetros recorridos', formato: 'km', grupo: 'Combustible y costo', dato: (r) => ({ v: r.combustible.km, est: r.combustible.kmEstimado }) },
  { id: 'litros', label: 'Litros consumidos', formato: 'l', grupo: 'Combustible y costo', dato: (r) => (r.combustible.litrosConsumidos != null ? med(r.combustible.litrosConsumidos) : { v: r.combustible.litrosEstimados, est: r.combustible.litrosEstimados != null }) },
  { id: 'rend', label: 'Rendimiento', formato: 'kml', grupo: 'Combustible y costo', dato: (r) => (r.combustible.rendimiento != null ? med(r.combustible.rendimiento) : { v: r.combustible.rendimientoEstimado, est: r.combustible.rendimientoEstimado != null }) },
  { id: 'lt', label: 'Litros por tonelada', formato: 'lt', grupo: 'Combustible y costo', dato: (r) => (r.combustible.litrosPorTon != null ? med(r.combustible.litrosPorTon) : { v: r.combustible.est.litrosPorTon, est: r.combustible.est.litrosPorTon != null }) },
  { id: 'costoKm', label: 'Costo de combustible por km', formato: 'mxn', grupo: 'Combustible y costo', dato: (r) => (r.combustible.costoPorKm != null ? med(r.combustible.costoPorKm) : { v: r.combustible.est.costoPorKm, est: r.combustible.est.costoPorKm != null }) },
  { id: 'costoTon', label: 'Costo de combustible por tonelada', formato: 'mxn', grupo: 'Combustible y costo', dato: (r) => (r.combustible.costoPorTon != null ? med(r.combustible.costoPorTon) : { v: r.combustible.est.costoPorTon, est: r.combustible.est.costoPorTon != null }) },
  { id: 'paradas', label: 'Paradas necesarias u operativas', formato: 'n', grupo: 'Eventos', dato: (r) => med(r.eventos.paradas) },
  { id: 'incidencias', label: 'Incidencias', formato: 'n', grupo: 'Eventos', dato: (r) => med(r.eventos.incidencias) },
];

/** Diferencias de contexto que limitan la comparación entre viajes. */
export function diferenciasContexto(vs: Viaje[]): string[] {
  const out: string[] = [];
  const distintos = (f: (v: Viaje) => string) => new Set(vs.map(f)).size > 1;
  if (distintos((v) => v.config.rutaId)) out.push('Rutas distintas');
  if (distintos((v) => v.config.granjaId)) out.push('Granjas distintas');
  if (distintos((v) => v.config.unidadId)) out.push('Unidades distintas');
  if (distintos((v) => v.config.configuracionId)) out.push('Configuraciones de tráiler distintas');
  if (distintos((v) => String(v.v['carga.tipoAlimento'] ?? v.config.tipoAlimento))) out.push('Tipo de alimento distinto');
  const tons = vs.map((v) => (typeof v.v['carga.ton'] === 'number' ? (v.v['carga.ton'] as number) : null));
  if (tons.every((t) => t != null)) {
    const mn = Math.min(...(tons as number[]));
    const mx = Math.max(...(tons as number[]));
    if (mn > 0 && (mx - mn) / mn > 0.1) out.push(`Carga distinta (${mn.toFixed(1)}–${mx.toFixed(1)} t)`);
  } else out.push('Carga sin registrar en algún viaje');
  return out;
}

/** Desviación estándar muestral. */
export function desviacion(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((t, x) => t + (x - m) ** 2, 0) / (xs.length - 1));
}
