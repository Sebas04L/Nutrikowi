// Estado global: almacén persistente, navegación y avisos.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Almacen, Catalogos, ConfigViaje, EspacioTrabajo, Modo, Viaje } from '../types';
import { cargar, guardar } from '../lib/almacen';
import { espacioDemo } from '../lib/demo';
import { nuevoViaje, siguienteFolio } from '../lib/datosBase';
import { hoyStr } from '../lib/tiempo';
import { uid } from '../lib/ids';
import { FILTROS_VACIOS, type Filtros } from '../lib/analisis';

export type Vista = 'mapa' | 'viajes' | 'calculadoras' | 'incidencias' | 'analisis' | 'catalogos' | 'respaldo';
export type Panel =
  | { tipo: 'nodo'; id: string }
  | { tipo: 'config' }
  | { tipo: 'combustible' }
  | { tipo: 'eventos' }
  | { tipo: 'revision' }
  | null;

interface Toast {
  id: string;
  texto: string;
  tono: 'ok' | 'error';
}

interface Ctx {
  almacen: Almacen;
  modo: Modo;
  ws: EspacioTrabajo;
  cat: Catalogos;
  setModo: (m: Modo) => void;
  actualizarEspacio: (fn: (ws: EspacioTrabajo) => EspacioTrabajo) => void;
  actualizarCatalogos: (fn: (c: Catalogos) => Catalogos) => void;
  actualizarViaje: (id: string, fn: (v: Viaje) => Viaje) => void;
  validarViaje: (id: string, responsable: string, nota: string) => void;
  quitarValidacion: (id: string) => void;
  crearViaje: (config?: Partial<ConfigViaje>, extra?: Partial<Viaje>) => string;
  eliminarViaje: (id: string) => void;
  duplicarPlantilla: (id: string) => string | null;
  siguienteCiclo: (id: string) => string | null;
  restaurarDemo: () => void;
  reemplazarAlmacen: (a: Almacen) => void;
  activoId: string | null;
  setActivo: (id: string | null) => void;
  vista: Vista;
  irA: (v: Vista) => void;
  panel: Panel;
  setPanel: (p: Panel) => void;
  avisar: (texto: string, tono?: 'ok' | 'error') => void;
  toasts: Toast[];
  guardadoEn: number | null;
  errorGuardado: string | null;
  avisoCarga: string | null;
  migrado: boolean;
  descartarMigrado: () => void;
  compararIds: string[];
  setCompararIds: (ids: string[]) => void;
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  subAnalisis: SubAnalisis;
  setSubAnalisis: (s: SubAnalisis) => void;
}

export type SubAnalisis = 'indicadores' | 'proceso' | 'comparador' | 'investigar';

const Contexto = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(Contexto);
  if (!c) throw new Error('Contexto no disponible');
  return c;
}

const CLAVE_UI = 'nutrikowi.cicloLogistico.ui';
const VISTAS: Vista[] = ['mapa', 'viajes', 'calculadoras', 'incidencias', 'analisis', 'catalogos', 'respaldo'];

/** Lee la vista del hash; los nombres de la versión 1 se redirigen. */
function vistaDeHash(): Vista | null {
  const h = location.hash.replace('#', '');
  if (h === 'indicadores') return 'analisis';
  return (VISTAS as string[]).includes(h) ? (h as Vista) : null;
}

function leerUI(): { activo: Record<Modo, string | null> } {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE_UI) || '{}');
    return { activo: { real: x?.activo?.real ?? null, demo: x?.activo?.demo ?? null } };
  } catch {
    return { activo: { real: null, demo: null } };
  }
}

export function Proveedor({ children }: { children: ReactNode }) {
  const inicial = useMemo(() => cargar(), []);
  const [almacen, setAlmacen] = useState<Almacen>(inicial.almacen);
  const [avisoCarga] = useState(inicial.aviso);
  const [migrado, setMigrado] = useState(inicial.migrado);
  const [guardadoEn, setGuardadoEn] = useState<number | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [activos, setActivos] = useState(() => leerUI().activo);
  const [vista, setVista] = useState<Vista>(() => vistaDeHash() ?? 'mapa');
  const [panel, setPanel] = useState<Panel>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [compararIds, setCompararIds] = useState<string[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [subAnalisis, setSubAnalisis] = useState<SubAnalisis>('indicadores');

  // Persistencia con pequeño retardo y descarga inmediata al ocultar la pestaña.
  const pendiente = useRef<Almacen | null>(null);
  const primera = useRef(true);
  const flush = useCallback(() => {
    if (!pendiente.current) return;
    const err = guardar(pendiente.current);
    pendiente.current = null;
    setErrorGuardado(err);
    if (!err) setGuardadoEn(Date.now());
  }, []);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      let existe = true;
      try {
        existe = !!localStorage.getItem('nutrikowi.cicloLogistico.v1');
      } catch {
        existe = true;
      }
      // Primer uso, o datos recién migrados de la v1 (la copia original ya quedó resguardada).
      if (!existe || inicial.migrado) {
        pendiente.current = almacen;
        flush();
      }
      return;
    }
    pendiente.current = almacen;
    const t = setTimeout(flush, 250);
    return () => clearTimeout(t);
  }, [almacen, flush]);
  useEffect(() => {
    const h = () => flush();
    const vis = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('beforeunload', h);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('beforeunload', h);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [flush]);
  useEffect(() => {
    // Solicita almacenamiento persistente para reducir el riesgo de borrado automático.
    navigator.storage?.persist?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_UI, JSON.stringify({ activo: activos }));
    } catch {
      /* ignorar */
    }
  }, [activos]);

  // Navegación por hash (permite usar el botón Atrás del navegador)
  useEffect(() => {
    const h = () => {
      const v = vistaDeHash();
      if (v) setVista(v);
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const irA = useCallback((v: Vista) => {
    setVista(v);
    setPanel(null);
    if (location.hash !== `#${v}`) history.pushState(null, '', `#${v}`);
    window.scrollTo({ top: 0 });
  }, []);

  const avisar = useCallback((texto: string, tono: 'ok' | 'error' = 'ok') => {
    const id = uid();
    setToasts((t) => [...t, { id, texto, tono }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const modo = almacen.modo;
  const ws = almacen[modo];

  const actualizarEspacio = useCallback((fn: (ws: EspacioTrabajo) => EspacioTrabajo) => {
    setAlmacen((a) => ({ ...a, [a.modo]: fn(a[a.modo]) }));
  }, []);
  const actualizarCatalogos = useCallback((fn: (c: Catalogos) => Catalogos) => actualizarEspacio((w) => ({ ...w, catalogos: fn(w.catalogos) })), [actualizarEspacio]);
  // Cualquier edición de un viaje validado deja sin efecto la validación (debe revisarse de nuevo).
  const actualizarViaje = useCallback((id: string, fn: (v: Viaje) => Viaje) => {
    actualizarEspacio((w) => ({
      ...w,
      viajes: w.viajes.map((v) => {
        if (v.id !== id) return v;
        const nuevo = fn(v);
        const revision = v.revision.validado ? { ...nuevo.revision, validado: null, invalidado: `Editado el ${new Date().toLocaleString('es-MX')} después de validarse.` } : nuevo.revision;
        return { ...nuevo, revision, actualizado: new Date().toISOString() };
      }),
    }));
  }, [actualizarEspacio]);
  const validarViaje = useCallback((id: string, responsable: string, nota: string) => {
    actualizarEspacio((w) => ({
      ...w,
      viajes: w.viajes.map((v) => (v.id === id ? { ...v, revision: { validado: new Date().toISOString(), responsable, nota, invalidado: null } } : v)),
    }));
  }, [actualizarEspacio]);
  const quitarValidacion = useCallback((id: string) => {
    actualizarEspacio((w) => ({
      ...w,
      viajes: w.viajes.map((v) => (v.id === id ? { ...v, revision: { ...v.revision, validado: null, invalidado: 'Validación retirada manualmente.' } } : v)),
    }));
  }, [actualizarEspacio]);

  const setActivo = useCallback((id: string | null) => setActivos((a) => ({ ...a, [almacen.modo]: id })), [almacen.modo]);

  const crearViaje = useCallback((config?: Partial<ConfigViaje>, extra?: Partial<Viaje>) => {
    const v = { ...nuevoViaje(ws.viajes, config), ...extra };
    actualizarEspacio((w) => ({ ...w, viajes: [v, ...w.viajes] }));
    setActivos((a) => ({ ...a, [modo]: v.id }));
    return v.id;
  }, [ws.viajes, actualizarEspacio, modo]);

  const eliminarViaje = useCallback((id: string) => {
    actualizarEspacio((w) => ({ ...w, viajes: w.viajes.filter((v) => v.id !== id) }));
    setActivos((a) => (a[modo] === id ? { ...a, [modo]: null } : a));
    setCompararIds((c) => c.filter((x) => x !== id));
  }, [actualizarEspacio, modo]);

  const duplicarPlantilla = useCallback((id: string) => {
    const o = ws.viajes.find((v) => v.id === id);
    if (!o) return null;
    const fecha = hoyStr();
    // Sólo se copia la configuración: los tiempos, cantidades e incidencias reales no se duplican.
    return crearViaje({ ...o.config, fecha, folio: siguienteFolio(ws.viajes, fecha) }, { plantillaDe: o.id });
  }, [ws.viajes, crearViaje]);

  const siguienteCiclo = useCallback((id: string) => {
    const o = ws.viajes.find((v) => v.id === id);
    if (!o) return null;
    const llegada = typeof o.v['reg.llegada'] === 'string' ? (o.v['reg.llegada'] as string) : null;
    const fecha = llegada ? llegada.slice(0, 10) : hoyStr();
    const c = o.config;
    return crearViaje(
      {
        fecha, unidadId: c.unidadId, choferId: c.choferId, tipoUnidad: c.tipoUnidad, configuracionId: c.configuracionId,
        tipoTolva: c.tipoTolva, numTolvas: c.numTolvas, compartimentosPorTolva: c.compartimentosPorTolva, capacidadNominal: c.capacidadNominal,
        folio: siguienteFolio(ws.viajes, fecha),
      },
      { cicloAnterior: o.id, v: llegada ? { 'llegada.hora': llegada } : {} },
    );
  }, [ws.viajes, crearViaje]);

  const restaurarDemo = useCallback(() => {
    setAlmacen((a) => ({ ...a, demo: espacioDemo() }));
    setActivos((a) => ({ ...a, demo: null }));
  }, []);

  const reemplazarAlmacen = useCallback((nuevo: Almacen) => {
    setAlmacen(nuevo);
    setActivos({ real: null, demo: null });
    setCompararIds([]);
    setFiltros(FILTROS_VACIOS);
    setPanel(null);
  }, []);

  const setModo = useCallback((m: Modo) => {
    setAlmacen((a) => ({ ...a, modo: m }));
    setPanel(null);
    setCompararIds([]);
    setFiltros(FILTROS_VACIOS);
  }, []);

  // Viaje activo válido
  let activoId = activos[modo];
  if (activoId && !ws.viajes.some((v) => v.id === activoId)) activoId = null;
  if (!activoId && ws.viajes.length) activoId = ws.viajes[0].id;

  const valor: Ctx = {
    almacen, modo, ws, cat: ws.catalogos, setModo, actualizarEspacio, actualizarCatalogos, actualizarViaje, validarViaje, quitarValidacion, crearViaje, eliminarViaje,
    duplicarPlantilla, siguienteCiclo, restaurarDemo, reemplazarAlmacen, activoId, setActivo, vista, irA, panel, setPanel, avisar, toasts,
    guardadoEn, errorGuardado, avisoCarga, migrado, descartarMigrado: () => setMigrado(false), compararIds, setCompararIds, filtros, setFiltros, subAnalisis, setSubAnalisis,
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
