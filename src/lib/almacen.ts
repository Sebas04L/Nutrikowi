// Persistencia local en el navegador (localStorage), migración de versiones y respaldos JSON.
//
// Estrategia de migración v1 → v2:
//  1. La clave de almacenamiento no cambia (nutrikowi.cicloLogistico.v1; el sufijo es histórico).
//  2. Si los datos guardados son versión 1, antes de transformarlos se guarda una copia exacta
//     en la clave nutrikowi.cicloLogistico.respaldo-v1 (sólo la primera vez).
//  3. Las incidencias por actividad de la v1 se convierten en eventos del registro
//     "Incidencias y paradas", vinculados a la misma actividad. No se descarta ningún dato.
//  4. Los tipos de incidencia de la v1 se conservan en el nuevo catálogo de tipos de evento.
//  5. Los respaldos JSON de la v1 siguen pudiéndose importar: pasan por la misma migración.

import type {
  Almacen, Catalogos, Chofer, ClaseEvento, ConfiguracionTrailer, EspacioTrabajo, Evento, Granja, Ruta, TipoEvento, Tramo, Unidad, Viaje,
} from '../types';
import { catalogosIniciales, configViajeVacia, espacioVacio, eventoVacio, revisionVacia, tiposEventoIniciales } from './datosBase';
import { espacioDemo } from './demo';
import { uid } from './ids';

export const CLAVE = 'nutrikowi.cicloLogistico.v1';
export const CLAVE_RESPALDO_V1 = 'nutrikowi.cicloLogistico.respaldo-v1';
const APP = 'nutrikowi-ciclo-logistico';
export const VERSION_DATOS = 2;

export function almacenInicial(): Almacen {
  return { version: 2, modo: 'real', real: espacioVacio(), demo: espacioDemo() };
}

export interface ResultadoCarga {
  almacen: Almacen;
  aviso: string | null;
  migrado: boolean;
}

export function cargar(): ResultadoCarga {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CLAVE);
  } catch {
    return { almacen: almacenInicial(), aviso: 'El navegador no permite usar el almacenamiento local. Los datos no se conservarán al recargar.', migrado: false };
  }
  if (!raw) return { almacen: almacenInicial(), aviso: null, migrado: false };
  try {
    const obj = JSON.parse(raw);
    const migrado = esObj(obj) && obj.version === 1;
    if (migrado) {
      try {
        if (!localStorage.getItem(CLAVE_RESPALDO_V1)) localStorage.setItem(CLAVE_RESPALDO_V1, raw);
      } catch {
        /* sin espacio: la migración continúa; los datos originales siguen en CLAVE hasta el primer guardado */
      }
    }
    return { almacen: normalizarAlmacen(obj), aviso: null, migrado };
  } catch {
    try {
      localStorage.setItem(`${CLAVE}.danado.${Date.now()}`, raw);
    } catch {
      /* sin espacio */
    }
    return { almacen: almacenInicial(), aviso: 'Los datos guardados no se pudieron leer. Se conservó una copia aparte y se inició un espacio nuevo. Restaura tu último respaldo JSON.', migrado: false };
  }
}

export function guardar(a: Almacen): string | null {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(a));
    return null;
  } catch (e) {
    const lleno = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return lleno
      ? 'El almacenamiento del navegador está lleno. Descarga un respaldo y elimina registros antiguos.'
      : 'No se pudieron guardar los cambios en este navegador.';
  }
}

export function tamanoGuardado(): number {
  try {
    return ((localStorage.getItem(CLAVE)?.length ?? 0) + (localStorage.getItem(CLAVE_RESPALDO_V1)?.length ?? 0)) * 2;
  } catch {
    return 0;
  }
}

export function copiaV1(): string | null {
  try {
    return localStorage.getItem(CLAVE_RESPALDO_V1);
  } catch {
    return null;
  }
}

// ── Normalización y migración (tolerante a respaldos de versiones anteriores o incompletos)

const esObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown) => (typeof x === 'string' ? x : '');
const strN = (x: unknown) => (typeof x === 'string' && x ? x : null);
const numN = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : null);
const boolN = (x: unknown) => (x === true ? true : x === false ? false : null);

/** Clase sugerida para tipos de incidencia heredados de la v1. */
function claseHeredada(nombre: string): ClaseEvento {
  const n = nombre.toLowerCase();
  if (/desperfecto|falla|mec[aá]nic/.test(n)) return 'falla';
  if (/bioseguridad|descanso|combustible/.test(n)) return 'necesaria';
  if (/retraso|camino|clima|tr[aá]fico|espera|documental|b[aá]scula/.test(n)) return 'demora';
  if (/otro/.test(n)) return 'otra';
  return 'demora';
}

function normalizarTiposEvento(x: Record<string, unknown>): TipoEvento[] {
  if (Array.isArray(x.tiposEvento)) {
    return (x.tiposEvento as unknown[])
      .filter(esObj)
      .map((t) => ({ nombre: str(t.nombre), clase: (['necesaria', 'operativa', 'demora', 'falla', 'otra'].includes(t.clase as string) ? t.clase : 'otra') as ClaseEvento }))
      .filter((t) => t.nombre);
  }
  // v1: lista de nombres en tiposIncidencia → se conservan y se agregan las nuevas categorías.
  const lista = tiposEventoIniciales();
  if (Array.isArray(x.tiposIncidencia)) {
    for (const n of x.tiposIncidencia as unknown[]) {
      if (typeof n === 'string' && n && !lista.some((t) => t.nombre.toLowerCase() === n.toLowerCase())) lista.push({ nombre: n, clase: claseHeredada(n) });
    }
  }
  return lista;
}

function normalizarCatalogos(x: unknown): Catalogos {
  const base = catalogosIniciales();
  if (!esObj(x)) return base;
  const arr = <T,>(k: string, def: T[]): T[] => (Array.isArray(x[k]) ? (x[k] as T[]) : def);
  const lim = esObj(x.limitesVelocidad) ? x.limitesVelocidad : null;
  return {
    granjas: arr<Partial<Granja>>('granjas', base.granjas).map((g) => ({ ubicacion: '', procedimientoBio: '', notas: '', activo: true, ...g }) as Granja),
    rutas: arr<Partial<Ruta>>('rutas', base.rutas).map((r) => ({ km: null, kmTerraceria: null, notas: '', activo: true, ...r }) as Ruta),
    unidades: arr<Partial<Unidad>>('unidades', base.unidades).map((u) => ({ capacidadTanque: null, rendimientoRef: null, tomaFuerza: '', notas: '', activo: true, ...u }) as Unidad),
    choferes: arr<Partial<Chofer>>('choferes', base.choferes).map((c) => ({ notas: '', activo: true, ...c }) as Chofer),
    configuraciones: arr<Partial<ConfiguracionTrailer>>('configuraciones', base.configuraciones).map((c) => ({ notas: '', activo: true, ...c }) as ConfiguracionTrailer),
    tiposAlimento: arr('tiposAlimento', base.tiposAlimento),
    tiposMantenimiento: arr('tiposMantenimiento', base.tiposMantenimiento),
    procedimientosBio: arr('procedimientosBio', base.procedimientosBio),
    metodosMedicion: arr('metodosMedicion', base.metodosMedicion),
    tiposEvento: normalizarTiposEvento(x),
    tiemposReferencia: esObj(x.tiemposReferencia) ? (x.tiemposReferencia as Catalogos['tiemposReferencia']) : {},
    limitesVelocidad: lim ? { carretera: numN(lim.carretera), terraceria: numN(lim.terraceria) } : base.limitesVelocidad,
  };
}

function normalizarEvento(x: unknown, nodoDefecto: string | null = null): Evento | null {
  if (!esObj(x)) return null;
  const e = eventoVacio(str(x.tipo) || 'Otro', typeof x.nodo === 'string' ? x.nodo : nodoDefecto);
  return {
    ...e,
    id: typeof x.id === 'string' ? x.id : uid(),
    fecha: strN(x.fecha),
    inicio: strN(x.inicio),
    fin: strN(x.fin),
    duracionMin: numN(x.duracionMin),
    odoInicio: numN(x.odoInicio),
    odoFin: numN(x.odoFin),
    lugar: str(x.lugar),
    motivo: str(x.motivo),
    // v1 usaba "descripcion"; se conserva como observaciones.
    observaciones: str(x.observaciones) || str(x.descripcion),
    motor: x.motor === 'apagado' || x.motor === 'encendido' ? x.motor : null,
    consumo: x.consumo === 'medido' || x.consumo === 'estimado' || x.consumo === 'sin_consumo' ? x.consumo : null,
    litros: numN(x.litros),
    desperfecto: boolN(x.desperfecto),
    afectoEntrega: boolN(x.afectoEntrega),
  };
}

function normalizarTramo(x: unknown): Tramo | null {
  if (!esObj(x)) return null;
  return {
    id: typeof x.id === 'string' ? x.id : uid(),
    sentido: x.sentido === 'regreso' || x.sentido === 'otro' ? x.sentido : 'ida',
    tipo: x.tipo === 'terraceria' ? 'terraceria' : 'carretera',
    km: numN(x.km),
    inicio: strN(x.inicio),
    fin: strN(x.fin),
    duracionMin: numN(x.duracionMin),
    velMax: numN(x.velMax),
    observaciones: str(x.observaciones),
  };
}

export function normalizarViaje(x: unknown): Viaje | null {
  if (!esObj(x) || typeof x.id !== 'string') return null;
  const ahora = new Date().toISOString();
  const eventos: Evento[] = Array.isArray(x.eventos) ? (x.eventos.map((e) => normalizarEvento(e)).filter(Boolean) as Evento[]) : [];
  // Migración v1: incidencias por actividad → eventos vinculados a esa actividad.
  if (esObj(x.incidencias)) {
    for (const [nodo, lista] of Object.entries(x.incidencias)) {
      if (!Array.isArray(lista)) continue;
      for (const i of lista) {
        const e = normalizarEvento(i, nodo);
        if (e && !eventos.some((y) => y.id === e.id)) eventos.push({ ...e, nodo });
      }
    }
  }
  const rev = esObj(x.revision) ? x.revision : {};
  return {
    id: x.id,
    creado: typeof x.creado === 'string' ? x.creado : ahora,
    actualizado: typeof x.actualizado === 'string' ? x.actualizado : ahora,
    config: { ...configViajeVacia(), ...(esObj(x.config) ? x.config : {}) } as Viaje['config'],
    v: esObj(x.v) ? (x.v as Viaje['v']) : {},
    estimados: esObj(x.estimados) ? (Object.fromEntries(Object.entries(x.estimados).filter(([, b]) => b === true)) as Viaje['estimados']) : {},
    eventos,
    tramos: Array.isArray(x.tramos) ? (x.tramos.map(normalizarTramo).filter(Boolean) as Tramo[]) : [],
    clasif: esObj(x.clasif) ? (x.clasif as Viaje['clasif']) : {},
    revision: { ...revisionVacia(), validado: strN(rev.validado), responsable: str(rev.responsable), nota: str(rev.nota), invalidado: strN(rev.invalidado) },
    plantillaDe: typeof x.plantillaDe === 'string' ? x.plantillaDe : null,
    cicloAnterior: typeof x.cicloAnterior === 'string' ? x.cicloAnterior : null,
  };
}

export function normalizarEspacio(x: unknown): EspacioTrabajo {
  if (!esObj(x)) return espacioVacio();
  return {
    catalogos: normalizarCatalogos(x.catalogos),
    viajes: Array.isArray(x.viajes) ? (x.viajes.map(normalizarViaje).filter(Boolean) as Viaje[]) : [],
    hipotesis: Array.isArray(x.hipotesis) ? (x.hipotesis as EspacioTrabajo['hipotesis']) : [],
  };
}

/** Acepta datos de la versión 1 o 2 y devuelve siempre la estructura de la versión 2. */
export function normalizarAlmacen(x: unknown): Almacen {
  if (!esObj(x) || (x.version !== 1 && x.version !== 2)) throw new Error('Formato no reconocido');
  return {
    version: 2,
    modo: x.modo === 'demo' ? 'demo' : 'real',
    real: normalizarEspacio(x.real),
    demo: esObj(x.demo) ? normalizarEspacio(x.demo) : espacioDemo(),
  };
}

// ── Respaldos

export function crearRespaldo(a: Almacen): string {
  return JSON.stringify({ app: APP, version: VERSION_DATOS, exportado: new Date().toISOString(), datos: a }, null, 2);
}

export interface RespaldoLeido {
  almacen: Almacen;
  exportado: string | null;
  versionOrigen: number;
  viajesReales: number;
  viajesDemo: number;
}

export function leerRespaldo(texto: string): RespaldoLeido {
  let obj: unknown;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!esObj(obj)) throw new Error('El archivo no es un respaldo de esta herramienta.');
  // Se acepta también el contenido crudo del almacenamiento (por ejemplo, la copia de seguridad v1).
  if (obj.app !== APP) {
    if ((obj.version === 1 || obj.version === 2) && esObj(obj.real)) {
      const almacen = normalizarAlmacen(obj);
      return { almacen, exportado: null, versionOrigen: obj.version as number, viajesReales: almacen.real.viajes.length, viajesDemo: almacen.demo.viajes.length };
    }
    throw new Error('El archivo no es un respaldo de esta herramienta.');
  }
  if (obj.version !== 1 && obj.version !== 2) throw new Error(`Versión de respaldo no compatible (${String(obj.version)}).`);
  const almacen = normalizarAlmacen(obj.datos);
  return {
    almacen,
    exportado: typeof obj.exportado === 'string' ? obj.exportado : null,
    versionOrigen: obj.version as number,
    viajesReales: almacen.real.viajes.length,
    viajesDemo: almacen.demo.viajes.length,
  };
}

type Descargas = { save: (r: { filename: string; data: string }) => Promise<unknown> };

/**
 * Descarga un archivo generado. Si la aplicación se abre como página publicada en claude.ai,
 * usa la confirmación de descarga del visor; en cualquier otro caso (Vite, archivo local),
 * usa la descarga normal del navegador.
 */
export async function descargarArchivo(nombre: string, contenido: string, tipo: string): Promise<void> {
  const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<Descargas | null> } }).claude;
  if (claude?.use) {
    let d: Descargas | null = null;
    try { d = await claude.use('downloads'); } catch { d = null; }
    if (d) {
      try { await d.save({ filename: nombre, data: contenido }); } catch { /* el usuario rechazó o no está disponible */ }
      return;
    }
  }
  descargaNavegador(nombre, contenido, tipo);
}

function descargaNavegador(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
