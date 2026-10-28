// Catálogos iniciales y fábricas de registros vacíos.
// Sólo se precargan las configuraciones de tráiler indicadas por NUTRIKOWI y
// listas genéricas editables. Granjas, rutas, unidades y choferes inician vacíos.

import type { Catalogos, ConfigViaje, ConfiguracionTrailer, EspacioTrabajo, Evento, Revision, TipoEvento, Tramo, Viaje } from '../types';
import { uid } from './ids';
import { hoyStr } from './tiempo';

export function configuracionesIniciales(): ConfiguracionTrailer[] {
  return [
    {
      id: 'cfg-full-2x28', nombre: 'Full · 2 tolvas de 28 t', tipoUnidad: 'Full', numTolvas: 2, tipoTolva: 'Tolva (2 × 28 t)',
      capacidadPorTolva: 28, capacidadNominal: 56, compartimentosPorTolva: 4,
      notas: 'Capacidad nominal conjunta. No equivale a carga legal autorizada.', activo: true,
    },
    {
      id: 'cfg-tracto-38', nombre: 'Tractocamión · tolva individual de 38 t', tipoUnidad: 'Tractocamión', numTolvas: 1, tipoTolva: 'Tolva individual',
      capacidadPorTolva: 38, capacidadNominal: 38, compartimentosPorTolva: null,
      notas: 'Número de compartimentos por confirmar.', activo: true,
    },
    {
      id: 'cfg-tracto-cil-28', nombre: 'Tractocamión · tolva cilíndrica de 28 t', tipoUnidad: 'Tractocamión', numTolvas: 1, tipoTolva: 'Tolva cilíndrica',
      capacidadPorTolva: 28, capacidadNominal: 28, compartimentosPorTolva: 8, notas: '', activo: true,
    },
  ];
}

export function catalogosIniciales(): Catalogos {
  return {
    granjas: [],
    rutas: [],
    unidades: [],
    choferes: [],
    configuraciones: configuracionesIniciales(),
    tiposAlimento: ['Pellet', 'Harina'],
    tiposMantenimiento: ['Preventivo', 'Correctivo', 'Llantas', 'Frenos', 'Sistema eléctrico', 'Otro'],
    procedimientosBio: ['Colocación de equipo de bioseguridad', 'Baño'],
    metodosMedicion: ['Telemetría / computadora de motor', 'Llenado a tanque lleno', 'Medición de nivel', 'Flujómetro', 'Otro'],
    tiposEvento: tiposEventoIniciales(),
    tiemposReferencia: {},
    // Límites operativos indicados por NUTRIKOWI. Son restricciones configurables, no objetivos.
    limitesVelocidad: { carretera: 80, terraceria: 35 },
  };
}

/** Categorías de incidencias y paradas. Editables desde Catálogos. */
export function tiposEventoIniciales(): TipoEvento[] {
  return [
    { nombre: 'Parada operativa', clase: 'operativa' },
    { nombre: 'Descanso del chofer', clase: 'necesaria' },
    { nombre: 'Carga de combustible', clase: 'necesaria' },
    { nombre: 'Tráfico', clase: 'demora' },
    { nombre: 'Camino complicado', clase: 'demora' },
    { nombre: 'Falla mecánica', clase: 'falla' },
    { nombre: 'Espera en granja', clase: 'demora' },
    { nombre: 'Espera en planta', clase: 'demora' },
    { nombre: 'Otro', clase: 'otra' },
  ];
}

export function revisionVacia(): Revision {
  return { validado: null, responsable: '', nota: '', invalidado: null };
}

export function eventoVacio(tipo = 'Parada operativa', nodo: string | null = null): Evento {
  return {
    id: uid(), tipo, nodo, fecha: null, inicio: null, fin: null, duracionMin: null, odoInicio: null, odoFin: null,
    lugar: '', motivo: '', observaciones: '', motor: null, consumo: null, litros: null, desperfecto: null, afectoEntrega: null,
  };
}

export function tramoVacio(sentido: Tramo['sentido'] = 'ida', tipo: Tramo['tipo'] = 'carretera'): Tramo {
  return { id: uid(), sentido, tipo, km: null, inicio: null, fin: null, duracionMin: null, velMax: null, observaciones: '' };
}

export function espacioVacio(): EspacioTrabajo {
  return { catalogos: catalogosIniciales(), viajes: [], hipotesis: [] };
}

export function configViajeVacia(fecha = hoyStr()): ConfigViaje {
  return {
    fecha, folio: '', granjaId: '', rutaId: '', unidadId: '', choferId: '', tipoUnidad: '', configuracionId: '',
    tipoTolva: '', numTolvas: null, compartimentosPorTolva: null, capacidadNominal: null, tipoAlimento: '',
    toneladasProgramadas: null, kmEstimados: null, observaciones: '',
  };
}

export function siguienteFolio(viajes: Viaje[], fecha: string): string {
  const base = `V-${fecha.replace(/-/g, '')}`;
  let n = 1;
  const usados = new Set(viajes.map((v) => v.config.folio));
  while (usados.has(`${base}-${String(n).padStart(2, '0')}`)) n++;
  return `${base}-${String(n).padStart(2, '0')}`;
}

export function nuevoViaje(viajes: Viaje[], config?: Partial<ConfigViaje>): Viaje {
  const ahora = new Date().toISOString();
  const c = { ...configViajeVacia(), ...config };
  if (!c.folio) c.folio = siguienteFolio(viajes, c.fecha);
  return {
    id: uid(), creado: ahora, actualizado: ahora, config: c, v: {}, estimados: {}, eventos: [], tramos: [], clasif: {},
    revision: revisionVacia(), plantillaDe: null, cicloAnterior: null,
  };
}
