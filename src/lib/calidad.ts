// Integridad de los datos de un viaje, para no presentar indicadores con información incompleta.
// Estados: incompleto → listo para revisión → validado (acción explícita del usuario).

import type { Viaje } from '../types';
import { CAMPOS, NODOS_LISTA, SEGMENTOS } from './proceso';
import { tieneValor, type ResultadoViaje } from './calculos';

export type EstadoCalidad = 'incompleto' | 'listo' | 'validado';

export const ETIQUETA_CALIDAD: Record<EstadoCalidad, string> = {
  incompleto: 'Registro incompleto',
  listo: 'Listo para revisión',
  validado: 'Validado',
};

export type IdGrupo = 'horarios' | 'km' | 'litros' | 'toneladas' | 'carga' | 'costos' | 'decisiones';

export interface GrupoCalidad {
  id: IdGrupo;
  titulo: string;
  faltan: string[];
  estimados: string[];
  /** Nodo al que conviene ir para completar el dato. */
  nodo: string | null;
}

export interface CalidadViaje {
  estado: EstadoCalidad;
  grupos: GrupoCalidad[];
  faltantes: number;
  estimados: string[];
  errores: string[];
}

const lbl = (id: string) => CAMPOS[id]?.label ?? id;

export function calidadViaje(viaje: Viaje, r: ResultadoViaje): CalidadViaje {
  const v = viaje.v;
  const est = (id: string) => !!viaje.estimados?.[id];
  const falta = (id: string) => !tieneValor(v[id]);
  const grupos: GrupoCalidad[] = [];
  const add = (id: IdGrupo, titulo: string, faltan: string[], estimados: string[] = [], nodo: string | null = null) =>
    grupos.push({ id, titulo, faltan, estimados, nodo });

  // Decisiones
  const dec = NODOS_LISTA.filter((n) => n.decide && falta(n.decide)).map((n) => n.titulo);
  add('decisiones', 'Decisiones del proceso', dec, [], NODOS_LISTA.find((n) => n.decide && falta(n.decide))?.id ?? null);

  // Horarios: segmentos que aplican sin duración + hitos
  const faltanH: string[] = [];
  const estH: string[] = [];
  let nodoH: string | null = null;
  for (const n of NODOS_LISTA) {
    if (r.nodos[n.id].aplica === false) continue;
    for (const sid of n.segmentos) {
      const s = r.segmentos[sid];
      if (s.aplica === false) continue;
      if (s.min == null) {
        faltanH.push(SEGMENTOS[sid].label);
        nodoH ??= n.id;
      } else if (s.estimado) estH.push(`${SEGMENTOS[sid].label} (duración estimada)`);
    }
  }
  for (const [id, nodo] of [['llegada.hora', 'llegada'], ['salida.hora', 'salida_planta'], ['granja.llegada', 'granja_llegada'], ['salidaG.hora', 'salida_granja'], ['reg.llegada', 'cierre']] as const) {
    if (falta(id) && !faltanH.some((x) => x.toLowerCase().includes(lbl(id).toLowerCase()))) {
      faltanH.push(lbl(id));
      nodoH ??= nodo;
    }
  }
  add('horarios', 'Horarios', faltanH, estH, nodoH);

  // Kilómetros
  const fk = (['ida.km', 'reg.km'] as const).filter(falta).map(lbl);
  add('km', 'Kilómetros', fk, (['ida.km', 'reg.km'] as const).filter((id) => !falta(id) && est(id)).map(lbl), fk.length ? (falta('ida.km') ? 'ida' : 'regreso') : null);

  // Litros consumidos
  const c = r.combustible;
  add(
    'litros', 'Litros consumidos',
    c.calidad === 'insuficiente' ? ['Consumo medido del ciclo (total, por tramos o por niveles)'] : [],
    c.calidad === 'estimado' ? [c.fuenteEstimado === 'rendimiento_ref' ? 'Consumo calculado con rendimiento de referencia' : 'Consumo estimado'] : [],
    c.calidad === 'insuficiente' ? 'ida' : null,
  );

  // Toneladas entregadas
  add('toneladas', 'Toneladas entregadas', falta('desc.ton') ? [lbl('desc.ton')] : [], !falta('desc.ton') && est('desc.ton') ? [lbl('desc.ton')] : [], falta('desc.ton') ? 'descarga' : null);

  // Carga y descarga
  const fc = ['carga.tipoAlimento', 'carga.ton', 'carga.compartimentos', 'p2.pesoBruto', 'desc.compartimentos'].filter(falta).map(lbl);
  add('carga', 'Datos de carga y descarga', fc, ['carga.ton', 'p2.pesoBruto'].filter((id) => !falta(id) && est(id)).map(lbl), fc.length ? 'carga' : null);

  // Costos relevantes
  const fcost: string[] = [];
  if (v['diesel.aplica'] === true) {
    if (falta('diesel.litros')) fcost.push(lbl('diesel.litros'));
    if (falta('diesel.precio')) fcost.push(lbl('diesel.precio'));
  }
  if (c.precioValuacion == null) fcost.push('Precio por litro para valuar el consumo');
  if (v['mant.aplica'] === true) {
    if (falta('mant.costoMO')) fcost.push(lbl('mant.costoMO'));
    if (falta('mant.costoMat')) fcost.push(lbl('mant.costoMat'));
  }
  add('costos', 'Costos relevantes', fcost, [], fcost.length ? (v['mant.aplica'] === true && (falta('mant.costoMO') || falta('mant.costoMat')) ? 'mant' : 'diesel') : null);

  const errores = r.alertas.filter((a) => /anterior|menor que|negativo|posterior/.test(a.texto)).map((a) => a.texto);
  const faltantes = grupos.reduce((t, g) => t + g.faltan.length, 0);
  const estimados = grupos.flatMap((g) => g.estimados);
  const estado: EstadoCalidad = viaje.revision?.validado ? 'validado' : faltantes === 0 && errores.length === 0 ? 'listo' : 'incompleto';
  return { estado, grupos, faltantes, estimados, errores };
}

/** Campos numéricos que pueden marcarse como estimados en lugar de medidos. */
export const CAMPOS_ESTIMABLES = new Set([
  'ida.km', 'reg.km', 'ida.litros', 'reg.litros', 'comb.consumoTotal', 'desc.ptoLitros', 'desc.ton', 'carga.ton',
  'comb.nivelInicial', 'comb.nivelFinal', 'p2.pesoBruto', 'p1.pesoVacio', 'p2.tara', 'diesel.litros',
]);
