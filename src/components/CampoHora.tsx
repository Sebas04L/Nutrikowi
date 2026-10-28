// Captura de hora con día del viaje. Guarda "AAAA-MM-DDTHH:MM".
// Si el campo está vacío y se escribe una hora, el día se sugiere a partir de la
// hora anterior del proceso: si la nueva hora es menor, se asume el día siguiente
// (cruce de medianoche). El día siempre queda visible y se puede corregir.

import { ahoraDT, difDias, fechaDe, fmtFechaCorta, horaDe, parseDT, sumarDias, toDT } from '../lib/tiempo';
import { Icono } from './Iconos';

export function CampoHora({ value, onChange, fechaBase, referencia, id, compacto }: {
  value: string | null;
  onChange: (v: string | null) => void;
  fechaBase: string;
  /** Hora previa en el proceso (ms) para sugerir el día. */
  referencia?: number | null;
  id?: string;
  compacto?: boolean;
}) {
  const fecha = fechaDe(value);
  const hora = horaDe(value);
  const base = fechaBase || fechaDe(ahoraDT())!;
  const dias = [-1, 0, 1, 2, 3].map((d) => sumarDias(base, d));
  if (fecha && !dias.includes(fecha)) dias.push(fecha);

  const sugerirFecha = (hhmm: string): string => {
    if (referencia == null) return base;
    const fRef = toDT(referencia).slice(0, 10);
    const cand = parseDT(`${fRef}T${hhmm}`);
    if (cand != null && cand < referencia - 60000 * 60) return sumarDias(fRef, 1);
    return fRef;
  };

  const cambiarHora = (hhmm: string) => {
    if (!hhmm) return onChange(null);
    onChange(`${fecha ?? sugerirFecha(hhmm)}T${hhmm}`);
  };
  const cambiarDia = (f: string) => {
    if (!hora) return;
    onChange(`${f}T${hora}`);
  };
  const etiquetaDia = (f: string) => {
    const d = difDias(base, f);
    return `${fmtFechaCorta(f)}${d === 0 ? '' : d > 0 ? ` (+${d})` : ` (${d})`}`;
  };

  return (
    <div className={`campo-hora ${compacto ? 'campo-hora--compacto' : ''} ${value ? 'con-valor' : ''}`}>
      <input id={id} type="time" className="input input--hora" value={hora} onChange={(e) => cambiarHora(e.target.value)} aria-label="Hora" />
      <select
        className="input input--dia" value={fecha ?? ''} disabled={!hora} onChange={(e) => cambiarDia(e.target.value)}
        aria-label="Día" title="Día de la hora registrada"
      >
        {!fecha && <option value="">Día</option>}
        {dias.sort().map((f) => (
          <option key={f} value={f}>{etiquetaDia(f)}</option>
        ))}
      </select>
      <button type="button" className="icono-btn icono-btn--sm" title="Registrar la hora actual" aria-label="Registrar la hora actual" onClick={() => onChange(ahoraDT())}>
        <Icono n="reloj" size={15} />
      </button>
      {value && (
        <button type="button" className="icono-btn icono-btn--sm" title="Borrar" aria-label="Borrar hora" onClick={() => onChange(null)}>
          <Icono n="cerrar" size={14} />
        </button>
      )}
    </div>
  );
}
