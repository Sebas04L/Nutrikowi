// Tipos centrales de la aplicación (modelo de datos versión 2).

export type Modo = 'real' | 'demo';

/**
 * Categorías de tiempo. Cada minuto del ciclo se asigna a una sola categoría.
 * "parada" agrupa paradas necesarias u operativas (descansos, bioseguridad, cargas de combustible…)
 * para que no se confundan con incidencias improductivas.
 */
export type Categoria = 'operativo' | 'espera' | 'traslado' | 'parada' | 'incidencia';

export type ValorCampo = string | number | boolean | null;

export interface Granja {
  id: string;
  nombre: string;
  ubicacion: string;
  procedimientoBio: string;
  notas: string;
  activo: boolean;
}

export interface Ruta {
  id: string;
  nombre: string;
  granjaId: string;
  km: number | null;
  kmTerraceria: number | null;
  notas: string;
  activo: boolean;
}

export interface ConfiguracionTrailer {
  id: string;
  nombre: string;
  tipoUnidad: string;
  numTolvas: number | null;
  tipoTolva: string;
  capacidadPorTolva: number | null;
  capacidadNominal: number | null;
  compartimentosPorTolva: number | null;
  notas: string;
  activo: boolean;
}

export interface Unidad {
  id: string;
  numero: string;
  tipoUnidad: string;
  configuracionId: string;
  capacidadTanque: number | null;
  rendimientoRef: number | null;
  tomaFuerza: '' | 'Diésel' | 'Eléctrica';
  notas: string;
  activo: boolean;
}

export interface Chofer {
  id: string;
  nombre: string;
  notas: string;
  activo: boolean;
}

/**
 * Clase de un tipo de evento. Permite distinguir paradas necesarias u operativas
 * (que no son tiempo improductivo) de demoras y fallas.
 */
export type ClaseEvento = 'necesaria' | 'operativa' | 'demora' | 'falla' | 'otra';

export interface TipoEvento {
  nombre: string;
  clase: ClaseEvento;
}

export interface LimitesVelocidad {
  carretera: number | null;
  terraceria: number | null;
}

export interface Catalogos {
  granjas: Granja[];
  rutas: Ruta[];
  unidades: Unidad[];
  choferes: Chofer[];
  configuraciones: ConfiguracionTrailer[];
  tiposAlimento: string[];
  tiposMantenimiento: string[];
  procedimientosBio: string[];
  metodosMedicion: string[];
  tiposEvento: TipoEvento[];
  /** Tiempo de referencia (minutos) por segmento. Vacío = sin referencia. */
  tiemposReferencia: Record<string, number | null>;
  /** Límites operativos de velocidad (km/h). Son restricciones, no objetivos. */
  limitesVelocidad: LimitesVelocidad;
}

/** Incidencia o parada registrada durante un viaje. */
export interface Evento {
  id: string;
  tipo: string;
  /** Actividad del proceso a la que se vincula (opcional). */
  nodo: string | null;
  fecha: string | null;
  inicio: string | null;
  fin: string | null;
  duracionMin: number | null;
  odoInicio: number | null;
  odoFin: number | null;
  lugar: string;
  motivo: string;
  observaciones: string;
  motor: 'apagado' | 'encendido' | null;
  /** Información de consumo de diésel asociado a la parada. */
  consumo: 'medido' | 'estimado' | 'sin_consumo' | null;
  litros: number | null;
  desperfecto: boolean | null;
  afectoEntrega: boolean | null;
}

export type TipoTramo = 'carretera' | 'terraceria';

/** Tramo de recorrido para análisis de velocidad. */
export interface Tramo {
  id: string;
  sentido: 'ida' | 'regreso' | 'otro';
  tipo: TipoTramo;
  km: number | null;
  inicio: string | null;
  fin: string | null;
  duracionMin: number | null;
  /** Velocidad máxima registrada por telemetría (km/h). Sólo si existe la medición. */
  velMax: number | null;
  observaciones: string;
}

export type Clasificacion = 'normal' | 'excepcion' | 'investigar';

export interface ClasificacionNodo {
  estado: Clasificacion | null;
  nota: string;
}

export interface ConfigViaje {
  fecha: string;
  folio: string;
  granjaId: string;
  rutaId: string;
  unidadId: string;
  choferId: string;
  tipoUnidad: string;
  configuracionId: string;
  tipoTolva: string;
  numTolvas: number | null;
  compartimentosPorTolva: number | null;
  capacidadNominal: number | null;
  tipoAlimento: string;
  toneladasProgramadas: number | null;
  kmEstimados: number | null;
  observaciones: string;
}

export interface Revision {
  /** Fecha ISO de validación; null si no está validado. */
  validado: string | null;
  responsable: string;
  nota: string;
  /** Motivo por el que una validación anterior quedó sin efecto. */
  invalidado: string | null;
}

export interface Viaje {
  id: string;
  creado: string;
  actualizado: string;
  config: ConfigViaje;
  /** Valores capturados, indexados por id de campo (ver lib/proceso.ts). */
  v: Record<string, ValorCampo>;
  /** Campos cuyo valor es una estimación (no una medición). */
  estimados: Record<string, true>;
  eventos: Evento[];
  tramos: Tramo[];
  clasif: Record<string, ClasificacionNodo>;
  revision: Revision;
  plantillaDe: string | null;
  cicloAnterior: string | null;
}

export type EstadoHipotesis = 'abierta' | 'en_analisis' | 'validada' | 'descartada';

export interface Hipotesis {
  id: string;
  fecha: string;
  actividad: string;
  texto: string;
  evidencia: string;
  estado: EstadoHipotesis;
}

export interface EspacioTrabajo {
  catalogos: Catalogos;
  viajes: Viaje[];
  hipotesis: Hipotesis[];
}

export interface Almacen {
  version: 2;
  modo: Modo;
  real: EspacioTrabajo;
  demo: EspacioTrabajo;
}
