// Utilidades de fecha y hora. Las horas se guardan como texto local
// "AAAA-MM-DDTHH:MM" para que el ciclo pueda cruzar la medianoche sin ambigüedad.

import type { Categoria, ValorCampo } from '../types';

const RE_DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const RE_D = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDT(v: ValorCampo | undefined): number | null {
  if (typeof v !== 'string') return null;
  const m = RE_DT.exec(v);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
  return isNaN(d.getTime()) ? null : d.getTime();
}

const p2 = (n: number) => String(n).padStart(2, '0');

export function toDT(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function hoyStr(): string {
  return toDateStr(new Date());
}

export function ahoraDT(): string {
  return toDT(Date.now());
}

export function fechaDe(dt: string | null | undefined): string | null {
  return dt && RE_DT.test(dt) ? dt.slice(0, 10) : null;
}

export function horaDe(dt: string | null | undefined): string {
  return dt && RE_DT.test(dt) ? dt.slice(11, 16) : '';
}

export function sumarDias(fecha: string, n: number): string {
  const m = RE_D.exec(fecha);
  if (!m) return fecha;
  const d = new Date(+m[1], +m[2] - 1, +m[3] + n);
  return toDateStr(d);
}

export function difDias(desde: string, hasta: string): number {
  const a = RE_D.exec(desde);
  const b = RE_D.exec(hasta);
  if (!a || !b) return 0;
  const da = Date.UTC(+a[1], +a[2] - 1, +a[3]);
  const db = Date.UTC(+b[1], +b[2] - 1, +b[3]);
  return Math.round((db - da) / 86400000);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtFechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const m = RE_D.exec(fecha.slice(0, 10));
  if (!m) return fecha;
  return `${+m[3]} ${MESES[+m[2] - 1]}`;
}

export function fmtFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const m = RE_D.exec(fecha.slice(0, 10));
  if (!m) return fecha;
  return `${+m[3]} ${MESES[+m[2] - 1]} ${m[1]}`;
}

export function fmtHora(ms: number | null): string {
  if (ms == null) return '—';
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** Formato legible de una duración en minutos. Devuelve '—' si es null. */
export function fmtDur(min: number | null | undefined, opts: { corto?: boolean } = {}): string {
  if (min == null || !isFinite(min)) return '—';
  const neg = min < 0;
  const t = Math.round(Math.abs(min));
  const h = Math.floor(t / 60);
  const m = t % 60;
  let s: string;
  if (h === 0) s = `${m} min`;
  else if (opts.corto) s = `${h}h ${p2(m)}`;
  else s = m === 0 ? `${h} h` : `${h} h ${p2(m)} min`;
  return neg ? `−${s}` : s;
}

/** Texto para un campo editable de duración: "1:30". */
export function durATexto(min: number | null | undefined): string {
  if (min == null || !isFinite(min)) return '';
  const t = Math.round(min);
  return `${Math.floor(t / 60)}:${p2(t % 60)}`;
}

/**
 * Interpreta duraciones capturadas a mano. Acepta: "90", "1:30", "1h30",
 * "1 h 30 min", "45m", "2h", "1.5h". Devuelve minutos o null si no es válido.
 */
export function parseDur(texto: string): number | null {
  const s = texto.trim().toLowerCase().replace(',', '.');
  if (!s) return null;
  let m: RegExpExecArray | null;
  if ((m = /^(\d+):(\d{1,2})$/.exec(s))) return +m[1] * 60 + +m[2];
  if ((m = /^(\d+(?:\.\d+)?)$/.exec(s))) return Math.round(+m[1]);
  if ((m = /^(\d+(?:\.\d+)?)\s*h(?:r|rs|oras?)?$/.exec(s))) return Math.round(+m[1] * 60);
  if ((m = /^(\d+)\s*m(?:in|ins|inutos?)?$/.exec(s))) return +m[1];
  if ((m = /^(\d+)\s*h(?:r|rs|oras?)?\s*(\d+)\s*(?:m|min|mins|minutos?)?$/.exec(s))) return +m[1] * 60 + +m[2];
  return null;
}

export interface Intervalo {
  a: number;
  b: number;
  cat: Categoria;
  clave?: string;
}

/** Minutos cubiertos por la unión de intervalos (sin contar dos veces los solapes). */
export function minutosUnion(ints: { a: number; b: number }[]): number {
  const xs = ints.filter((i) => i.b > i.a).sort((x, y) => x.a - y.a);
  let total = 0;
  let curA = -Infinity;
  let curB = -Infinity;
  for (const i of xs) {
    if (i.a > curB) {
      if (curB > curA) total += curB - curA;
      curA = i.a;
      curB = i.b;
    } else if (i.b > curB) {
      curB = i.b;
    }
  }
  if (curB > curA) total += curB - curA;
  return total / 60000;
}

export const PRIORIDAD: Categoria[] = ['incidencia', 'espera', 'parada', 'operativo', 'traslado'];

export type Asignacion = Record<Categoria | 'sinRegistro', number>;

/**
 * Reparte un rango de tiempo real entre categorías sin duplicar minutos.
 * Cuando dos registros se solapan, el minuto se asigna una sola vez según
 * PRIORIDAD (incidencia > espera > parada > operativo > traslado). Lo que no cubre
 * ningún registro queda como "sinRegistro".
 */
export function asignarTiempo(ints: Intervalo[], desde: number, hasta: number): Asignacion {
  const res: Asignacion = { operativo: 0, espera: 0, traslado: 0, parada: 0, incidencia: 0, sinRegistro: 0 };
  if (!(hasta > desde)) return res;
  const recortados = ints
    .map((i) => ({ ...i, a: Math.max(i.a, desde), b: Math.min(i.b, hasta) }))
    .filter((i) => i.b > i.a);
  const cortes = new Set<number>([desde, hasta]);
  for (const i of recortados) {
    cortes.add(i.a);
    cortes.add(i.b);
  }
  const pts = [...cortes].sort((x, y) => x - y);
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    const activos = new Set(recortados.filter((i) => i.a <= a && i.b >= b).map((i) => i.cat));
    const cat = PRIORIDAD.find((c) => activos.has(c));
    res[cat ?? 'sinRegistro'] += (b - a) / 60000;
  }
  return res;
}
