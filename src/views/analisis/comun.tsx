// Piezas compartidas por las vistas de análisis.

import type { ReactNode } from 'react';
import type { ViajeCalc } from '../../lib/analisis';
import type { FormatoMetrica } from '../../lib/analisis';
import { nombres } from '../../lib/nombres';
import { fmtDur, fmtFechaCorta } from '../../lib/tiempo';
import { useApp } from '../../state/Contexto';
import { Icono } from '../../components/Iconos';

export const mxn = (x: number | null) => (x == null ? '—' : x.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }));
export const num = (x: number | null, d = 1) => (x == null ? '—' : x.toLocaleString('es-MX', { maximumFractionDigits: d, minimumFractionDigits: d }));

export function formato(v: number | null, f: FormatoMetrica): string {
  if (v == null) return '—';
  switch (f) {
    case 'dur': return fmtDur(v, { corto: true });
    case 'km': return `${num(v, 1)} km`;
    case 'l': return `${num(v, 1)} L`;
    case 'kml': return `${num(v, 2)} km/L`;
    case 'lt': return `${num(v, 2)} L/t`;
    case 'mxn': return mxn(v);
    case 'n': return String(Math.round(v));
  }
}

export interface ItemOrigen {
  calc: ViajeCalc;
  valor: string;
  nota?: string;
}

/** Lista de los viajes que originan un resultado seleccionado en un gráfico. */
export function OrigenViajes({ titulo, items, onCerrar, nodo }: { titulo: ReactNode; items: ItemOrigen[]; onCerrar: () => void; nodo?: string }) {
  const { cat, setActivo, irA, setPanel } = useApp();
  const abrir = (id: string) => {
    setActivo(id);
    irA('mapa');
    if (nodo) setTimeout(() => setPanel({ tipo: 'nodo', id: nodo }), 0);
  };
  return (
    <div className="origen">
      <div className="origen__cab">
        <h4>{titulo} <span className="muted">· {items.length} viaje(s)</span></h4>
        <button className="icono-btn icono-btn--sm" onClick={onCerrar} aria-label="Cerrar detalle"><Icono n="cerrar" size={14} /></button>
      </div>
      {items.length === 0 ? <p className="nota">Ningún viaje tiene este dato.</p> : (
        <div className="chips-viajes">
          {items.map(({ calc, valor, nota }) => {
            const n = nombres(calc.viaje, cat);
            return (
              <button key={calc.viaje.id} className="chip-viaje" onClick={() => abrir(calc.viaje.id)} title={`${n.unidad} · ${n.ruta}${nota ? ` · ${nota}` : ''}`}>
                {calc.viaje.config.folio} · {fmtFechaCorta(calc.viaje.config.fecha)} · <b>{valor}</b>{nota ? <span className="muted"> · {nota}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
