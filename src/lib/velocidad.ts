// Análisis de velocidad. La velocidad promedio se calcula con distancia y tiempo;
// la velocidad máxima sólo existe si se registró por telemetría. Ninguna se inventa.
// Los límites son restricciones operativas configurables, no objetivos.

import type { LimitesVelocidad, Tramo, TipoTramo } from '../types';
import { parseDT } from './tiempo';

export interface ResultadoTramo {
  id: string;
  sentido: Tramo['sentido'];
  tipo: TipoTramo;
  km: number | null;
  min: number | null;
  fuente: 'horario' | 'captura' | null;
  /** Velocidad promedio del tramo = km ÷ horas de desplazamiento. */
  vProm: number | null;
  velMax: number | null;
  limite: number | null;
  excedeProm: boolean;
  excedeMax: boolean;
  error: string | null;
  faltan: string[];
}

export function limiteDe(tipo: TipoTramo, lim: LimitesVelocidad): number | null {
  return tipo === 'terraceria' ? lim.terraceria : lim.carretera;
}

export function velocidadPromedio(km: number | null, min: number | null): number | null {
  if (km == null || min == null || min <= 0 || km < 0) return null;
  return km / (min / 60);
}

export function calcularTramo(t: Tramo, lim: LimitesVelocidad): ResultadoTramo {
  const a = parseDT(t.inicio);
  const b = parseDT(t.fin);
  let min: number | null = null;
  let fuente: ResultadoTramo['fuente'] = null;
  let error: string | null = null;
  if (a != null && b != null) {
    if (b <= a) error = 'La hora de fin debe ser posterior a la de inicio.';
    else {
      min = (b - a) / 60000;
      fuente = 'horario';
    }
  } else if (t.duracionMin != null) {
    min = t.duracionMin;
    fuente = 'captura';
  }
  const faltan: string[] = [];
  if (t.km == null) faltan.push('distancia');
  if (min == null && !error) faltan.push('horario o duración');
  const vProm = velocidadPromedio(t.km, min);
  const limite = limiteDe(t.tipo, lim);
  return {
    id: t.id, sentido: t.sentido, tipo: t.tipo, km: t.km, min, fuente, vProm, velMax: t.velMax, limite,
    excedeProm: limite != null && vProm != null && vProm > limite,
    excedeMax: limite != null && t.velMax != null && t.velMax > limite,
    error, faltan,
  };
}

export const ETIQUETA_TRAMO: Record<TipoTramo, string> = { carretera: 'Carretera', terraceria: 'Acceso de terracería' };
export const ETIQUETA_SENTIDO: Record<Tramo['sentido'], string> = { ida: 'Ida', regreso: 'Regreso', otro: 'Otro' };
