// Definición del proceso logístico de NUTRIKOWI: campos, segmentos de tiempo,
// nodos del mapa y su disposición. La secuencia respeta los 17 pasos acordados.

import type { Categoria } from '../types';

export type TipoCampo = 'hora' | 'duracion' | 'numero' | 'texto' | 'textarea' | 'sino' | 'opcion' | 'catalogo';
export type CatalogoLista = 'tiposAlimento' | 'tiposMantenimiento' | 'procedimientosBio' | 'metodosMedicion';

export interface CampoDef {
  id: string;
  label: string;
  tipo: TipoCampo;
  unidad?: string;
  opciones?: string[];
  catalogo?: CatalogoLista;
  ayuda?: string;
  placeholder?: string;
  decimales?: number;
}

export interface SegmentoDef {
  id: string;
  label: string;
  categoria: Categoria;
  inicio: string;
  fin: string;
  manual: string;
  nodo: string;
  /** Si se define, el segmento sólo aplica cuando ese campo sí/no es verdadero. */
  aplicaSi?: string;
  inicioLabel?: string;
  finLabel?: string;
}

export type TipoNodo = 'actividad' | 'decision' | 'espera' | 'traslado' | 'hito';
export type Etapa = 'A' | 'B' | 'C';

export type Icono =
  | 'llegada' | 'decision' | 'espera' | 'lavado' | 'mantenimiento' | 'diesel' | 'autorizacion'
  | 'bascula' | 'carga' | 'factura' | 'salida' | 'ruta' | 'granja' | 'bioseguridad'
  | 'hoja' | 'descarga' | 'regreso' | 'ciclo';

export interface NodoDef {
  id: string;
  paso: string;
  titulo: string;
  corto: string;
  etapa: Etapa;
  tipo: TipoNodo;
  icono: Icono;
  descripcion: string;
  segmentos: string[];
  campos: string[];
  /** Requisitos para considerar la actividad completa: id de campo o "seg:<id>". */
  requeridos: string[];
  /** Nodo condicional: sólo aplica si este campo sí/no es verdadero. */
  aplicaSi?: string;
  /** Para nodos de decisión: el campo sí/no que se decide. */
  decide?: string;
  notas?: string[];
}

// ───────────────────────── Campos ─────────────────────────

const CAMPOS_LISTA: CampoDef[] = [];
const C = (c: CampoDef) => CAMPOS_LISTA.push(c);
const hora = (id: string, label: string, ayuda?: string) => C({ id, label, tipo: 'hora', ayuda });
const num = (id: string, label: string, unidad: string, decimales = 2, ayuda?: string) =>
  C({ id, label, tipo: 'numero', unidad, decimales, ayuda });
const area = (id: string, label: string, placeholder?: string) => C({ id, label, tipo: 'textarea', placeholder });
const sino = (id: string, label: string, ayuda?: string) => C({ id, label, tipo: 'sino', ayuda });

// Paso 1
hora('llegada.hora', 'Hora de llegada a planta');
area('llegada.pendientes', 'Incidencias o documentos pendientes', 'Ej. falta carta porte, sello vencido…');
// Paso 2
sino('lavado.hayFila', '¿Había fila para entrar al lavado?', 'Sí: la unidad esperó posición. No: pasó directo.');
C({ id: 'lavado.posicion', label: 'Posición de lavado utilizada', tipo: 'opcion', opciones: ['Posición 1', 'Posición 2'] });
// Paso 3
sino('mant.aplica', '¿Se realizó mantenimiento?');
C({ id: 'mant.tipo', label: 'Tipo de mantenimiento', tipo: 'catalogo', catalogo: 'tiposMantenimiento' });
num('mant.costoMO', 'Costo de mano de obra', 'MXN');
num('mant.costoMat', 'Costo de materiales y refacciones', 'MXN');
area('mant.obs', 'Observaciones del mantenimiento');
sino('diesel.aplica', '¿Se cargó diésel en planta?');
num('diesel.litros', 'Litros cargados', 'L', 1);
num('diesel.precio', 'Precio por litro', 'MXN/L', 2);
// Paso 4
hora('aut.hora', 'Hora de autorización del supervisor');
num('p1.pesoVacio', 'Peso bruto de la unidad vacía', 'kg', 0, 'Si la báscula lo reporta. Puede usarse como tara.');
// Paso 5
C({ id: 'carga.tipoAlimento', label: 'Tipo de alimento', tipo: 'catalogo', catalogo: 'tiposAlimento' });
hora('carga.listo', 'Hora en que el alimento quedó listo');
hora('carga.autorizacion', 'Hora de autorización para cargar');
num('carga.ton', 'Toneladas cargadas', 't', 2);
num('carga.compartimentos', 'Compartimentos utilizados', 'comp.', 0);
area('carga.obs', 'Observaciones de la carga');
// Paso 6
num('p2.pesoBruto', 'Peso bruto de la unidad cargada', 'kg', 0);
num('p2.tara', 'Tara de la unidad', 'kg', 0, 'Si se deja vacía se usa el peso de la unidad vacía del primer pesaje, cuando exista.');
// Paso 8
hora('salida.hora', 'Hora de salida efectiva de planta');
area('salida.obs', 'Observaciones de la salida');
// Paso 9
num('ida.km', 'Kilómetros recorridos (ida)', 'km', 1);
num('ida.litros', 'Litros consumidos en el trayecto de ida', 'L', 1, 'Sólo si existe una medición confiable.');
// Paso 10
hora('granja.llegada', 'Hora de llegada a granja');
// Paso 12
C({ id: 'bio.proc', label: 'Procedimiento aplicado', tipo: 'catalogo', catalogo: 'procedimientosBio' });
area('bio.obs', 'Observaciones de bioseguridad');
// Paso 14
sino('desc.huboEspera', '¿Hubo espera antes de descargar?');
num('desc.ton', 'Toneladas descargadas', 't', 2);
num('desc.compartimentos', 'Compartimentos descargados', 'comp.', 0);
sino('desc.apoyo', '¿El encargado de granja ayudó a abrir tolvas?');
C({ id: 'desc.ptoTipo', label: 'Accionamiento de la toma de fuerza', tipo: 'opcion', opciones: ['Diésel', 'Eléctrica'] });
num('desc.ptoLitros', 'Diésel consumido por la toma de fuerza', 'L', 1, 'Sólo si se pudo medir por separado.');
// Paso 15
hora('biof.entrega', 'Hora de entrega del equipo de bioseguridad');
// Paso 16
hora('salidaG.hora', 'Hora de salida efectiva de granja');
// Paso 17
hora('reg.llegada', 'Hora de llegada a planta');
num('reg.km', 'Kilómetros recorridos (regreso)', 'km', 1);
num('reg.litros', 'Litros consumidos en el regreso', 'L', 1, 'Sólo si existe una medición confiable.');
area('cierre.obs', 'Observaciones generales del ciclo');
// Módulo de combustible
num('comb.precioRef', 'Precio de referencia para valuar el consumo', 'MXN/L', 2,
  'Se usa sólo si en este viaje no se registró precio de carga.');
num('comb.consumoTotal', 'Consumo total medido del ciclo', 'L', 1,
  'Litros realmente consumidos en todo el ciclo, si se midieron como un solo dato.');
num('comb.consumoEstimado', 'Consumo estimado del ciclo', 'L', 1,
  'Estimación manual. Se reporta siempre como estimado, nunca como consumo real.');
C({ id: 'comb.metodo', label: 'Método de medición del consumo', tipo: 'catalogo', catalogo: 'metodosMedicion' });
num('comb.nivelInicial', 'Nivel de combustible al llegar a planta', 'L', 1);
num('comb.nivelFinal', 'Nivel de combustible al regresar a planta', 'L', 1);
area('comb.obs', 'Observaciones de combustible');

// ───────────────────────── Segmentos ─────────────────────────

const SEG_LISTA: SegmentoDef[] = [];

function seg(
  id: string, nodo: string, label: string, categoria: Categoria,
  o: { pref?: string; inicio?: string; fin?: string; manual?: string; aplicaSi?: string; inicioLabel?: string; finLabel?: string } = {},
) {
  const pref = o.pref ?? id;
  const s: SegmentoDef = {
    id, nodo, label, categoria,
    inicio: o.inicio ?? `${pref}.inicio`,
    fin: o.fin ?? `${pref}.fin`,
    manual: o.manual ?? `${pref}.dur`,
    aplicaSi: o.aplicaSi,
    inicioLabel: o.inicioLabel,
    finLabel: o.finLabel,
  };
  SEG_LISTA.push(s);
  for (const [fid, lab] of [[s.inicio, o.inicioLabel ?? `Inicio · ${label}`], [s.fin, o.finLabel ?? `Fin · ${label}`]] as const) {
    if (!CAMPOS_LISTA.some((c) => c.id === fid)) C({ id: fid, label: lab, tipo: 'hora' });
  }
  C({ id: s.manual, label: `Duración capturada · ${label}`, tipo: 'duracion' });
}

seg('prelavado', 'llegada', 'Prelavado', 'operativo');
seg('docs', 'llegada', 'Revisión documental', 'operativo');
seg('esperaLavado', 'lavado_espera', 'Espera en fila de lavado', 'espera', {
  inicio: 'lavado.entradaFila', fin: 'lavado.inicio', manual: 'lavado.esperaDur',
  inicioLabel: 'Entrada a la fila', finLabel: 'Inicio del lavado',
});
seg('lavado', 'lavado', 'Lavado completo', 'operativo', { inicioLabel: 'Inicio del lavado', finLabel: 'Fin del lavado' });
seg('mant', 'mant', 'Mantenimiento', 'operativo');
seg('diesel', 'diesel', 'Carga de diésel', 'operativo');
seg('esperaAut', 'autorizacion', 'Espera de autorización', 'espera', { pref: 'aut' });
seg('pesaje1', 'pesaje1', 'Primer pesaje', 'operativo', { pref: 'p1' });
seg('carga', 'carga', 'Carga de alimento', 'operativo');
seg('pesaje2', 'pesaje2', 'Segundo pesaje', 'operativo', { pref: 'p2' });
seg('factura', 'factura', 'Factura y flejes', 'operativo', { pref: 'fact' });
seg('ida', 'ida', 'Trayecto planta → granja', 'traslado', {
  inicio: 'salida.hora', fin: 'granja.llegada', manual: 'ida.dur',
  inicioLabel: 'Salida de planta', finLabel: 'Llegada a granja',
});
seg('pesajeG1', 'granja_llegada', 'Pesaje de llegada en granja', 'operativo', { pref: 'pg1' });
seg('lavadoGranja', 'lavado_granja', 'Lavado en granja', 'operativo', { pref: 'lavg' });
seg('bio', 'bio', 'Procedimiento de bioseguridad', 'operativo');
seg('hoja', 'hoja', 'Entrega de hoja del reparto', 'operativo', {
  inicio: 'hoja.entrega', fin: 'hoja.fin', inicioLabel: 'Entrega de la hoja', finLabel: 'Fin del trámite',
});
seg('esperaDescarga', 'descarga', 'Espera para descargar', 'espera', { pref: 'desc.espera', aplicaSi: 'desc.huboEspera',
  inicio: 'desc.esperaInicio', fin: 'desc.esperaFin', manual: 'desc.esperaDur' });
seg('descarga', 'descarga', 'Descarga de alimento', 'operativo', { pref: 'desc' });
seg('pesajeG2', 'pesaje_bio_final', 'Pesaje de salida en granja', 'operativo', { pref: 'pg2' });
seg('bioCierre', 'pesaje_bio_final', 'Cierre de bioseguridad', 'operativo', {
  pref: 'biof', inicioLabel: 'Inicio del procedimiento de salida', finLabel: 'Fin del procedimiento',
});
seg('regreso', 'regreso', 'Trayecto granja → planta', 'traslado', {
  inicio: 'salidaG.hora', fin: 'reg.llegada', manual: 'reg.dur',
  inicioLabel: 'Salida de granja', finLabel: 'Llegada a planta',
});

export const SEGMENTOS: Record<string, SegmentoDef> = Object.fromEntries(SEG_LISTA.map((s) => [s.id, s]));
export const SEGMENTOS_LISTA = SEG_LISTA;
export const CAMPOS: Record<string, CampoDef> = Object.fromEntries(CAMPOS_LISTA.map((c) => [c.id, c]));
export const CAMPOS_LISTA_ORDEN = CAMPOS_LISTA;

// ───────────────────────── Nodos ─────────────────────────

export const NODOS_LISTA: NodoDef[] = [
  {
    id: 'llegada', paso: '1', etapa: 'A', tipo: 'actividad', icono: 'llegada',
    titulo: 'Llegada a planta, prelavado y verificación de documentos', corto: 'Llegada y prelavado',
    descripcion: 'El tráiler llega a planta. Se realiza el prelavado y la revisión de documentos; ambas actividades pueden ocurrir al mismo tiempo.',
    segmentos: ['prelavado', 'docs'], campos: ['llegada.hora', 'llegada.pendientes'],
    requeridos: ['llegada.hora', 'seg:prelavado', 'seg:docs'],
  },
  {
    id: 'lavado_dec', paso: '2', etapa: 'A', tipo: 'decision', icono: 'decision',
    titulo: '¿Hay fila en el lavado?', corto: '¿Fila en lavado?',
    descripcion: 'Si hay fila, la unidad espera posición; si no, pasa directamente al lavado.',
    segmentos: [], campos: ['lavado.hayFila', 'lavado.posicion'], requeridos: ['lavado.hayFila'], decide: 'lavado.hayFila',
    notas: ['La planta dispone de dos posiciones de lavado: pueden lavarse dos tráileres al mismo tiempo.'],
  },
  {
    id: 'lavado_espera', paso: '2', etapa: 'A', tipo: 'espera', icono: 'espera',
    titulo: 'Espera en fila de lavado', corto: 'Espera de lavado',
    descripcion: 'Tiempo desde que la unidad entra a la fila hasta que inicia su lavado.',
    segmentos: ['esperaLavado'], campos: [], requeridos: ['seg:esperaLavado'], aplicaSi: 'lavado.hayFila',
  },
  {
    id: 'lavado', paso: '2', etapa: 'A', tipo: 'actividad', icono: 'lavado',
    titulo: 'Lavado completo', corto: 'Lavado completo',
    descripcion: 'Lavado completo de la unidad en una de las dos posiciones.',
    segmentos: ['lavado'], campos: [], requeridos: ['seg:lavado'],
  },
  {
    id: 'mant_dec', paso: '3', etapa: 'A', tipo: 'decision', icono: 'decision',
    titulo: '¿Requiere mantenimiento?', corto: '¿Mantenimiento?',
    descripcion: 'Decisión independiente: la unidad puede requerir mantenimiento, diésel, ambos o ninguno.',
    segmentos: [], campos: ['mant.aplica'], requeridos: ['mant.aplica'], decide: 'mant.aplica',
  },
  {
    id: 'mant', paso: '3', etapa: 'A', tipo: 'actividad', icono: 'mantenimiento',
    titulo: 'Mantenimiento de la unidad', corto: 'Mantenimiento',
    descripcion: 'Mantenimiento realizado después del lavado. Registra tiempos y costos.',
    segmentos: ['mant'], campos: ['mant.tipo', 'mant.costoMO', 'mant.costoMat', 'mant.obs'],
    requeridos: ['mant.tipo', 'seg:mant', 'mant.costoMO', 'mant.costoMat'], aplicaSi: 'mant.aplica',
  },
  {
    id: 'diesel_dec', paso: '3', etapa: 'A', tipo: 'decision', icono: 'decision',
    titulo: '¿Carga diésel en planta?', corto: '¿Carga diésel?',
    descripcion: 'Decisión independiente del mantenimiento.',
    segmentos: [], campos: ['diesel.aplica'], requeridos: ['diesel.aplica'], decide: 'diesel.aplica',
  },
  {
    id: 'diesel', paso: '3', etapa: 'A', tipo: 'actividad', icono: 'diesel',
    titulo: 'Carga de diésel', corto: 'Carga de diésel',
    descripcion: 'Abastecimiento en planta. Los litros cargados no equivalen al consumo del viaje.',
    segmentos: ['diesel'], campos: ['diesel.litros', 'diesel.precio'],
    requeridos: ['diesel.litros', 'diesel.precio', 'seg:diesel'], aplicaSi: 'diesel.aplica',
  },
  {
    id: 'autorizacion', paso: '4', etapa: 'A', tipo: 'espera', icono: 'autorizacion',
    titulo: 'Espera de autorización del supervisor', corto: 'Autorización',
    descripcion: 'La unidad espera a que el supervisor indique que puede avanzar a báscula.',
    segmentos: ['esperaAut'], campos: ['aut.hora'], requeridos: ['seg:esperaAut', 'aut.hora'],
  },
  {
    id: 'pesaje1', paso: '4', etapa: 'A', tipo: 'actividad', icono: 'bascula',
    titulo: 'Primer pesaje (unidad vacía)', corto: 'Primer pesaje',
    descripcion: 'Pesaje en báscula antes de la carga.',
    segmentos: ['pesaje1'], campos: ['p1.pesoVacio'], requeridos: ['seg:pesaje1'],
  },
  {
    id: 'carga', paso: '5', etapa: 'A', tipo: 'actividad', icono: 'carga',
    titulo: 'Carga del alimento', corto: 'Carga de alimento',
    descripcion: 'La carga comienza cuando el alimento está listo y el supervisor autorizó avanzar.',
    segmentos: ['carga'], campos: ['carga.tipoAlimento', 'carga.listo', 'carga.autorizacion', 'carga.ton', 'carga.compartimentos', 'carga.obs'],
    requeridos: ['carga.tipoAlimento', 'carga.listo', 'carga.autorizacion', 'seg:carga', 'carga.ton', 'carga.compartimentos'],
  },
  {
    id: 'pesaje2', paso: '6', etapa: 'A', tipo: 'actividad', icono: 'bascula',
    titulo: 'Segundo pesaje (unidad cargada)', corto: 'Segundo pesaje',
    descripcion: 'Pesaje con carga. Las toneladas netas se calculan como peso bruto menos tara.',
    segmentos: ['pesaje2'], campos: ['p2.pesoBruto', 'p2.tara'], requeridos: ['seg:pesaje2', 'p2.pesoBruto'],
  },
  {
    id: 'factura', paso: '7', etapa: 'A', tipo: 'actividad', icono: 'factura',
    titulo: 'Factura y flejes', corto: 'Factura y flejes',
    descripcion: 'Emisión de factura y colocación de flejes.',
    segmentos: ['factura'], campos: [], requeridos: ['seg:factura'],
  },
  {
    id: 'salida_planta', paso: '8', etapa: 'A', tipo: 'hito', icono: 'salida',
    titulo: 'Salida de planta', corto: 'Salida de planta',
    descripcion: 'Hora de salida efectiva. Cierra la etapa de planta e inicia el trayecto.',
    segmentos: [], campos: ['salida.hora', 'salida.obs'], requeridos: ['salida.hora'],
  },
  {
    id: 'ida', paso: '9', etapa: 'B', tipo: 'traslado', icono: 'ruta',
    titulo: 'Trayecto de planta a granja', corto: 'Trayecto a granja',
    descripcion: 'Recorrido de la planta en Pueblo Mayo a la granja de destino.',
    segmentos: ['ida'], campos: ['ida.km', 'ida.litros'], requeridos: ['seg:ida', 'ida.km'],
    notas: ['Restricciones operativas: velocidad máxima de referencia 80 km/h; en accesos de terracería, máximo 35 km/h.'],
  },
  {
    id: 'granja_llegada', paso: '10', etapa: 'B', tipo: 'actividad', icono: 'granja',
    titulo: 'Llegada a granja y pesaje', corto: 'Llegada y pesaje',
    descripcion: 'Registro de llegada y pesaje en granja.',
    segmentos: ['pesajeG1'], campos: ['granja.llegada'], requeridos: ['granja.llegada', 'seg:pesajeG1'],
  },
  {
    id: 'lavado_granja', paso: '11', etapa: 'B', tipo: 'actividad', icono: 'lavado',
    titulo: 'Lavado de la unidad en granja', corto: 'Lavado en granja',
    descripcion: 'Lavado de la unidad antes de ingresar a la zona de descarga.',
    segmentos: ['lavadoGranja'], campos: [], requeridos: ['seg:lavadoGranja'],
  },
  {
    id: 'bio', paso: '12', etapa: 'B', tipo: 'actividad', icono: 'bioseguridad',
    titulo: 'Procedimiento de bioseguridad del chofer', corto: 'Bioseguridad',
    descripcion: 'Colocación de equipo de bioseguridad o baño, según corresponda a la granja.',
    segmentos: ['bio'], campos: ['bio.proc', 'bio.obs'], requeridos: ['bio.proc', 'seg:bio'],
  },
  {
    id: 'hoja', paso: '13', etapa: 'B', tipo: 'actividad', icono: 'hoja',
    titulo: 'Entrega de la hoja del reparto', corto: 'Hoja del reparto',
    descripcion: 'Entrega de la hoja del reparto y trámite asociado.',
    segmentos: ['hoja'], campos: [], requeridos: ['seg:hoja'],
  },
  {
    id: 'descarga', paso: '14', etapa: 'B', tipo: 'actividad', icono: 'descarga',
    titulo: 'Descarga del alimento', corto: 'Descarga',
    descripcion: 'Descarga en los compartimentos o tolvas asignados. En ocasiones el encargado de la granja ayuda a abrir las tolvas.',
    segmentos: ['esperaDescarga', 'descarga'],
    campos: ['desc.huboEspera', 'desc.ton', 'desc.compartimentos', 'desc.apoyo', 'desc.ptoTipo', 'desc.ptoLitros'],
    requeridos: ['desc.huboEspera', 'seg:esperaDescarga', 'seg:descarga', 'desc.ton', 'desc.compartimentos', 'desc.apoyo'],
  },
  {
    id: 'pesaje_bio_final', paso: '15', etapa: 'B', tipo: 'actividad', icono: 'bascula',
    titulo: 'Pesaje y entrega del equipo de bioseguridad', corto: 'Pesaje y entrega',
    descripcion: 'Pesaje de salida, finalización del procedimiento y entrega del equipo, según corresponda.',
    segmentos: ['pesajeG2', 'bioCierre'], campos: ['biof.entrega'], requeridos: ['seg:pesajeG2'],
  },
  {
    id: 'salida_granja', paso: '16', etapa: 'B', tipo: 'hito', icono: 'salida',
    titulo: 'Salida de granja', corto: 'Salida de granja',
    descripcion: 'Hora de salida efectiva de la granja.',
    segmentos: [], campos: ['salidaG.hora'], requeridos: ['salidaG.hora'],
  },
  {
    id: 'regreso', paso: '17', etapa: 'C', tipo: 'traslado', icono: 'regreso',
    titulo: 'Trayecto de regreso a planta', corto: 'Regreso a planta',
    descripcion: 'Recorrido de la granja a la planta.',
    segmentos: ['regreso'], campos: ['reg.km', 'reg.litros'], requeridos: ['seg:regreso', 'reg.km'],
    notas: ['Restricciones operativas: velocidad máxima de referencia 80 km/h; en accesos de terracería, máximo 35 km/h.'],
  },
  {
    id: 'cierre', paso: '↺', etapa: 'C', tipo: 'hito', icono: 'ciclo',
    titulo: 'Llegada a planta y reinicio del ciclo', corto: 'Reinicio del ciclo',
    descripcion: 'Al llegar a planta el ciclo se cierra y la unidad vuelve al paso 1.',
    segmentos: [], campos: ['reg.llegada', 'cierre.obs'], requeridos: ['reg.llegada'],
  },
];

export const NODOS: Record<string, NodoDef> = Object.fromEntries(NODOS_LISTA.map((n) => [n.id, n]));

export const ETAPAS: Record<Etapa, { titulo: string; corto: string }> = {
  A: { titulo: 'Planta NUTRIKOWI', corto: 'Planta' },
  B: { titulo: 'Traslado y operación en granja', corto: 'Granja' },
  C: { titulo: 'Regreso a planta y reinicio', corto: 'Regreso' },
};

/** Orden cronológico esperado de todos los campos de hora (para sugerir el día). */
export const ORDEN_HORAS: string[] = (() => {
  const out: string[] = [];
  const add = (id: string) => {
    if (CAMPOS[id]?.tipo === 'hora' && !out.includes(id)) out.push(id);
  };
  for (const n of NODOS_LISTA) {
    for (const c of n.campos) if (c === 'llegada.hora' || c === 'granja.llegada') add(c);
    for (const sid of n.segmentos) {
      add(SEGMENTOS[sid].inicio);
      add(SEGMENTOS[sid].fin);
    }
    for (const c of n.campos) add(c);
  }
  return out;
})();

export const ETIQUETA_CATEGORIA: Record<Categoria | 'sinRegistro', string> = {
  operativo: 'Operación',
  espera: 'Espera',
  traslado: 'Traslado',
  parada: 'Parada necesaria u operativa',
  incidencia: 'Incidencia',
  sinRegistro: 'Sin registrar',
};

/** Orden de las categorías en barras apiladas (fijo: el color sigue a la categoría). */
export const ORDEN_CATEGORIAS = ['operativo', 'espera', 'traslado', 'parada', 'incidencia', 'sinRegistro'] as const;

// La disposición visual del mapa (coordenadas del recorrido ilustrado) vive en lib/escena.ts.
