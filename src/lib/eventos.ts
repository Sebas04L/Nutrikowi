// Incidencias y paradas: clasificación, duración y estado de la información de consumo.

import type { Catalogos, Categoria, ClaseEvento, Evento } from '../types';
import { parseDT } from './tiempo';

export const ETIQUETA_CLASE: Record<ClaseEvento, string> = {
  necesaria: 'Necesaria',
  operativa: 'Operativa',
  demora: 'Demora',
  falla: 'Falla',
  otra: 'Otra',
};

export const DESCRIPCION_CLASE: Record<ClaseEvento, string> = {
  necesaria: 'Descansos obligatorios, bioseguridad, cargas de combustible: necesarias, no improductivas.',
  operativa: 'Paradas propias de la operación.',
  demora: 'Tiempo perdido por causas externas o esperas.',
  falla: 'Desperfectos o fallas mecánicas.',
  otra: 'Sin clasificar.',
};

export function claseDe(tipo: string, cat: Catalogos): ClaseEvento {
  const t = cat.tiposEvento.find((x) => x.nombre.toLowerCase() === tipo.toLowerCase());
  return t?.clase ?? 'otra';
}

/** Las paradas necesarias u operativas no se cuentan como incidencia. */
export function esIncidencia(clase: ClaseEvento): boolean {
  return clase === 'demora' || clase === 'falla' || clase === 'otra';
}

export function categoriaEvento(clase: ClaseEvento): Categoria {
  return esIncidencia(clase) ? 'incidencia' : 'parada';
}

export function duracionEvento(e: Pick<Evento, 'inicio' | 'fin' | 'duracionMin'>): number | null {
  const a = parseDT(e.inicio);
  const b = parseDT(e.fin);
  if (a != null && b != null && b >= a) return (b - a) / 60000;
  return e.duracionMin ?? null;
}

export function errorEvento(e: Evento): string | null {
  const a = parseDT(e.inicio);
  const b = parseDT(e.fin);
  if (a != null && b != null && b < a) return 'La hora de fin es anterior a la de inicio.';
  if (e.odoInicio != null && e.odoFin != null && e.odoFin < e.odoInicio) return 'El odómetro final es menor que el inicial.';
  if (e.motor === 'apagado' && e.consumo && e.consumo !== 'sin_consumo' && e.litros != null && e.litros > 0)
    return 'Se registró consumo con el motor apagado; revisa el dato.';
  return null;
}

export function kmEvento(e: Evento): number | null {
  return e.odoInicio != null && e.odoFin != null && e.odoFin >= e.odoInicio ? e.odoFin - e.odoInicio : null;
}

export type EstadoConsumo = 'motor_apagado' | 'medido' | 'estimado' | 'sin_consumo' | 'encendido_sin_dato' | 'sin_informacion';

export const ETIQUETA_CONSUMO: Record<EstadoConsumo, string> = {
  motor_apagado: 'Motor apagado',
  medido: 'Consumo medido',
  estimado: 'Consumo estimado',
  sin_consumo: 'Sin consumo',
  encendido_sin_dato: 'Motor encendido, sin dato de consumo',
  sin_informacion: 'Sin información suficiente',
};

export function estadoConsumo(e: Evento): EstadoConsumo {
  if (e.consumo === 'medido' && e.litros != null) return 'medido';
  if (e.consumo === 'estimado' && e.litros != null) return 'estimado';
  if (e.motor === 'apagado') return 'motor_apagado';
  if (e.consumo === 'sin_consumo') return 'sin_consumo';
  if (e.motor === 'encendido') return 'encendido_sin_dato';
  return 'sin_informacion';
}

/** Fecha efectiva del evento: la de su hora de inicio o la capturada. */
export function fechaEvento(e: Evento): string | null {
  return e.inicio?.slice(0, 10) ?? e.fin?.slice(0, 10) ?? e.fecha ?? null;
}
