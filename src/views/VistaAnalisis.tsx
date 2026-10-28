// Análisis: indicadores, proceso, comparador de viajes y tiempos para investigar.

import { useApp, type SubAnalisis } from '../state/Contexto';
import { calcularTodos } from '../lib/analisis';
import { BarraFiltros, useFiltrados } from '../components/BarraFiltros';
import { Vacio } from '../components/ui';
import { Icono } from '../components/Iconos';
import { Indicadores } from './analisis/Indicadores';
import { Proceso } from './analisis/Proceso';
import { Comparador } from './analisis/Comparador';
import { Investigar } from './analisis/Investigar';
import { useMemo } from 'react';

const PESTANAS: { id: SubAnalisis; t: string; i: string }[] = [
  { id: 'indicadores', t: 'Indicadores', i: 'indicadores' },
  { id: 'proceso', t: 'Análisis del proceso', i: 'mapa' },
  { id: 'comparador', t: 'Comparador de viajes', i: 'comparar' },
  { id: 'investigar', t: 'Investigar y mejorar', i: 'hipotesis' },
];

export function VistaAnalisis() {
  const { ws, cat, modo, subAnalisis, setSubAnalisis, compararIds } = useApp();
  const { calcs, total } = useFiltrados();
  const todos = useMemo(() => calcularTodos(ws.viajes, cat), [ws.viajes, cat]);
  if (!ws.viajes.length) {
    return <div className="pagina"><Vacio icono="indicadores" titulo="Sin registros para analizar">Los indicadores y análisis se calculan automáticamente a partir de los viajes registrados en el mapa.</Vacio></div>;
  }
  return (
    <div className="pagina">
      <header className="pagina__cab">
        <div>
          <div className="pagina__eyebrow">Análisis {modo === 'demo' && <span className="etiqueta-demo" style={{ marginLeft: 6 }}>demostración</span>}</div>
          <h1>Análisis del ciclo logístico</h1>
          <p>Cada indicador indica cuántos viajes tienen el dato. Los datos estimados se marcan y no se mezclan con mediciones. Un tiempo mayor no implica por sí mismo ineficiencia.</p>
        </div>
      </header>
      <div className="subnav" role="tablist">
        {PESTANAS.map((p) => (
          <button key={p.id} role="tab" aria-selected={subAnalisis === p.id} className={subAnalisis === p.id ? 'activo' : ''} onClick={() => setSubAnalisis(p.id)}>
            <Icono n={p.i} size={16} />{p.t}
            {p.id === 'comparador' && compararIds.length > 0 && <span className="nav__badge">{compararIds.length}</span>}
          </button>
        ))}
      </div>
      <BarraFiltros total={total} filtrados={calcs.length} />
      <div style={{ marginTop: 16 }}>
        {calcs.length === 0 ? <Vacio icono="filtro" titulo="Ningún viaje coincide con los filtros" /> : (
          <>
            {subAnalisis === 'indicadores' && <Indicadores calcs={calcs} />}
            {subAnalisis === 'proceso' && <Proceso calcs={calcs} />}
            {subAnalisis === 'comparador' && <Comparador calcs={calcs} todos={todos} />}
            {subAnalisis === 'investigar' && <Investigar calcs={calcs} />}
          </>
        )}
      </div>
    </div>
  );
}
