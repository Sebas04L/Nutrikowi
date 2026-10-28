import { useMemo } from 'react';
import { useApp } from '../state/Contexto';
import { calcularTodos, filtrar, filtrarCalidad, FILTROS_VACIOS, type Filtros } from '../lib/analisis';
import { ETIQUETA_CALIDAD, type EstadoCalidad } from '../lib/calidad';
import { Selector } from './ui';
import { Icono } from './Iconos';

/** Viajes del espacio actual con los filtros aplicados (incluye el filtro de integridad). */
export function useFiltrados() {
  const { ws, cat, filtros } = useApp();
  return useMemo(() => {
    const calcs = filtrarCalidad(calcularTodos(filtrar(ws.viajes, filtros), cat), filtros);
    return { calcs, viajes: calcs.map((c) => c.viaje), total: ws.viajes.length };
  }, [ws, cat, filtros]);
}

export function BarraFiltros({ total, filtrados, conCalidad = true }: { total: number; filtrados: number; conCalidad?: boolean }) {
  const { cat, ws, filtros: f, setFiltros } = useApp();
  const set = (p: Partial<Filtros>) => setFiltros({ ...f, ...p });
  const activos = Object.values(f).filter(Boolean).length;
  const rutas = cat.rutas.filter((r) => !f.granjaId || r.granjaId === f.granjaId);
  const tolvas = [...new Set([...cat.configuraciones.map((c) => c.tipoTolva), ...ws.viajes.map((v) => v.config.tipoTolva)].filter(Boolean))].sort();
  return (
    <div className="filtros">
      <span className="filtros__titulo"><Icono n="filtro" size={15} /> Filtros</span>
      <Selector value={f.granjaId} onChange={(x) => set({ granjaId: x, rutaId: '' })} vacio="Todas las granjas" opciones={cat.granjas.map((g) => ({ valor: g.id, texto: g.nombre }))} />
      <Selector value={f.rutaId} onChange={(x) => set({ rutaId: x })} vacio="Todas las rutas" opciones={rutas.map((r) => ({ valor: r.id, texto: r.nombre }))} />
      <Selector value={f.unidadId} onChange={(x) => set({ unidadId: x })} vacio="Todas las unidades" opciones={cat.unidades.map((u) => ({ valor: u.id, texto: u.numero }))} />
      <Selector value={f.configuracionId} onChange={(x) => set({ configuracionId: x })} vacio="Todos los tipos de tráiler" opciones={cat.configuraciones.map((c) => ({ valor: c.id, texto: c.nombre }))} />
      <Selector value={f.tipoTolva} onChange={(x) => set({ tipoTolva: x })} vacio="Todo tipo de tolva" opciones={tolvas.map((t) => ({ valor: t, texto: t }))} />
      <Selector value={f.tipoAlimento} onChange={(x) => set({ tipoAlimento: x })} vacio="Todo alimento" opciones={cat.tiposAlimento.map((t) => ({ valor: t, texto: t }))} />
      <Selector value={f.choferId} onChange={(x) => set({ choferId: x })} vacio="Todos los choferes" opciones={cat.choferes.map((c) => ({ valor: c.id, texto: c.nombre }))} />
      {conCalidad && (
        <Selector<EstadoCalidad> value={f.calidad} onChange={(x) => set({ calidad: x })} vacio="Toda integridad"
          opciones={(['incompleto', 'listo', 'validado'] as const).map((k) => ({ valor: k, texto: ETIQUETA_CALIDAD[k] }))} />
      )}
      <label className="filtros__fecha">Desde<input type="date" className="input" value={f.desde} onChange={(e) => set({ desde: e.target.value })} /></label>
      <label className="filtros__fecha">Hasta<input type="date" className="input" value={f.hasta} onChange={(e) => set({ hasta: e.target.value })} /></label>
      <span className="filtros__conteo">{filtrados} de {total} viajes</span>
      {activos > 0 && <button className="enlace-btn" onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</button>}
    </div>
  );
}
