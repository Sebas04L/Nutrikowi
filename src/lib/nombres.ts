import type { Catalogos, Viaje } from '../types';

/** Resuelve los nombres legibles de los catálogos referenciados por un viaje. */
export function nombres(v: Viaje, cat: Catalogos) {
  const c = v.config;
  return {
    granja: cat.granjas.find((g) => g.id === c.granjaId)?.nombre ?? (c.granjaId ? '(eliminada)' : ''),
    ruta: cat.rutas.find((r) => r.id === c.rutaId)?.nombre ?? (c.rutaId ? '(eliminada)' : ''),
    unidad: cat.unidades.find((u) => u.id === c.unidadId)?.numero ?? (c.unidadId ? '(eliminada)' : ''),
    chofer: cat.choferes.find((x) => x.id === c.choferId)?.nombre ?? (c.choferId ? '(eliminado)' : ''),
    configuracion: cat.configuraciones.find((x) => x.id === c.configuracionId)?.nombre ?? (c.configuracionId ? '(eliminada)' : ''),
  };
}
