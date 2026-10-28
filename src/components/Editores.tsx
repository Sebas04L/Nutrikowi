// Editores de campos y segmentos conectados al viaje.

import type { Catalogos, ValorCampo, Viaje } from '../types';
import { CAMPOS, ORDEN_HORAS, SEGMENTOS } from '../lib/proceso';
import type { ResultadoSegmento } from '../lib/calculos';
import { fmtDur, parseDT } from '../lib/tiempo';
import { CampoHora } from './CampoHora';
import { Campo, EntradaDuracion, EntradaNumero, EntradaTexto, Pastilla, Selector, SiNo } from './ui';
import { Icono } from './Iconos';
import { ETIQUETA_CATEGORIA } from '../lib/proceso';
import { CAMPOS_ESTIMABLES } from '../lib/calidad';
import { useApp } from '../state/Contexto';

export type Fijar = (id: string, valor: ValorCampo) => void;
export type Estimar = (id: string, estimado: boolean) => void;

/** Funciones de edición de un viaje: fijar un valor (vacío ⇒ se elimina) y marcarlo como estimado. */
export function useEdicionViaje(viaje: Viaje): { fijar: Fijar; estimar: Estimar } {
  const { actualizarViaje } = useApp();
  const fijar: Fijar = (id, valor) =>
    actualizarViaje(viaje.id, (vj) => {
      const v = { ...vj.v };
      const estimados = { ...vj.estimados };
      if (valor === null || valor === '') {
        delete v[id];
        delete estimados[id];
      } else v[id] = valor;
      return { ...vj, v, estimados };
    });
  const estimar: Estimar = (id, est) =>
    actualizarViaje(viaje.id, (vj) => {
      const estimados = { ...vj.estimados };
      if (est) estimados[id] = true;
      else delete estimados[id];
      return { ...vj, estimados };
    });
  return { fijar, estimar };
}

/** Selector Medido / Estimado para un dato numérico ya capturado. */
export function ToggleEstimado({ estimado, onChange }: { estimado: boolean; onChange: (x: boolean) => void }) {
  return (
    <span className="toggle-est" role="radiogroup" aria-label="Origen del dato">
      <button type="button" role="radio" aria-checked={!estimado} className={!estimado ? 'activo' : ''} onClick={() => onChange(false)}>Medido</button>
      <button type="button" role="radio" aria-checked={estimado} className={estimado ? 'activo es-est' : ''} onClick={() => onChange(true)}>Estimado</button>
    </span>
  );
}

/** Hora registrada más reciente entre los campos que preceden a `id` en el proceso. */
export function horaPrevia(v: Viaje['v'], id: string): number | null {
  const idx = ORDEN_HORAS.indexOf(id);
  let max: number | null = null;
  for (let i = 0; i < (idx < 0 ? ORDEN_HORAS.length : idx); i++) {
    const t = parseDT(v[ORDEN_HORAS[i]]);
    if (t != null && (max == null || t > max)) max = t;
  }
  return max;
}

export function EntradaCampo({ id, viaje, fijar, cat, htmlId }: { id: string; viaje: Viaje; fijar: Fijar; cat: Catalogos; htmlId?: string }) {
  const def = CAMPOS[id];
  const val = viaje.v[id];
  if (!def) return null;
  switch (def.tipo) {
    case 'hora':
      return <CampoHora id={htmlId} value={typeof val === 'string' ? val : null} onChange={(x) => fijar(id, x)} fechaBase={viaje.config.fecha} referencia={horaPrevia(viaje.v, id)} />;
    case 'duracion':
      return <EntradaDuracion id={htmlId} value={typeof val === 'number' ? val : null} onChange={(x) => fijar(id, x)} />;
    case 'numero':
      return <EntradaNumero id={htmlId} value={typeof val === 'number' ? val : null} onChange={(x) => fijar(id, x)} unidad={def.unidad} />;
    case 'texto':
      return <EntradaTexto id={htmlId} value={typeof val === 'string' ? val : ''} onChange={(x) => fijar(id, x || null)} placeholder={def.placeholder} />;
    case 'textarea':
      return <EntradaTexto id={htmlId} multilinea value={typeof val === 'string' ? val : ''} onChange={(x) => fijar(id, x || null)} placeholder={def.placeholder} />;
    case 'sino':
      return <SiNo value={val === true ? true : val === false ? false : null} onChange={(x) => fijar(id, x)} />;
    case 'opcion':
      return <Selector id={htmlId} value={typeof val === 'string' ? val : ''} onChange={(x) => fijar(id, x || null)} opciones={(def.opciones ?? []).map((o) => ({ valor: o, texto: o }))} vacio="Sin registrar" />;
    case 'catalogo': {
      const lista = def.catalogo ? cat[def.catalogo] : [];
      return <Selector id={htmlId} value={typeof val === 'string' ? val : ''} onChange={(x) => fijar(id, x || null)} opciones={lista.map((o) => ({ valor: o, texto: o }))} vacio="Sin registrar" />;
    }
  }
}

export function CampoViaje({ id, viaje, fijar, cat, ancho, estimar }: { id: string; viaje: Viaje; fijar: Fijar; cat: Catalogos; ancho?: 'completo'; estimar?: Estimar }) {
  const def = CAMPOS[id];
  const htmlId = `f-${id.replace('.', '-')}`;
  const completo = ancho ?? (def.tipo === 'textarea' || def.tipo === 'hora' ? 'completo' : undefined);
  const conToggle = !!estimar && CAMPOS_ESTIMABLES.has(id) && viaje.v[id] != null;
  return (
    <Campo label={def.label} ayuda={def.ayuda} ancho={completo} htmlFor={def.tipo === 'sino' ? undefined : htmlId}
      extra={conToggle ? <ToggleEstimado estimado={!!viaje.estimados[id]} onChange={(x) => estimar!(id, x)} /> : undefined}>
      <EntradaCampo id={id} viaje={viaje} fijar={fijar} cat={cat} htmlId={htmlId} />
    </Campo>
  );
}

const TONO_CAT = { operativo: 'verde', espera: 'ambar', traslado: 'teal', parada: 'plum', incidencia: 'rojo' } as const;

export function EditorSegmento({ segId, viaje, fijar, res, estimar }: { segId: string; viaje: Viaje; fijar: Fijar; res: ResultadoSegmento; estimar?: Estimar }) {
  const s = SEGMENTOS[segId];
  const val = (k: string) => (typeof viaje.v[k] === 'string' ? (viaje.v[k] as string) : null);
  const man = viaje.v[s.manual];
  const hid = (k: string) => `f-${k.replace('.', '-')}`;
  if (res.aplica === false) return null;
  return (
    <div className={`segmento segmento--${s.categoria} ${res.error ? 'segmento--error' : ''}`}>
      <div className="segmento__cab">
        <span className="segmento__titulo">{s.label}</span>
        <Pastilla tono={TONO_CAT[s.categoria]}>{ETIQUETA_CATEGORIA[s.categoria]}</Pastilla>
      </div>
      <div className="segmento__horas">
        <Campo label={s.inicioLabel ?? 'Inicio'} htmlFor={hid(s.inicio)}>
          <CampoHora id={hid(s.inicio)} value={val(s.inicio)} onChange={(x) => fijar(s.inicio, x)} fechaBase={viaje.config.fecha} referencia={horaPrevia(viaje.v, s.inicio)} />
        </Campo>
        <Campo label={s.finLabel ?? 'Fin'} htmlFor={hid(s.fin)}>
          <CampoHora id={hid(s.fin)} value={val(s.fin)} onChange={(x) => fijar(s.fin, x)} fechaBase={viaje.config.fecha} referencia={parseDT(viaje.v[s.inicio]) ?? horaPrevia(viaje.v, s.fin)} />
        </Campo>
      </div>
      <div className="segmento__pie">
        <div className="segmento__manual">
          <label htmlFor={hid(s.manual)}>
            Sin horarios, capturar duración:
            {estimar && typeof man === 'number' && <ToggleEstimado estimado={!!viaje.estimados[s.manual]} onChange={(x) => estimar(s.manual, x)} />}
          </label>
          <EntradaDuracion id={hid(s.manual)} value={typeof man === 'number' ? man : null} onChange={(x) => fijar(s.manual, x)} />
        </div>
        <div className={`segmento__res ${res.min == null ? 'pend' : ''}`}>
          {res.min != null ? (
            <>
              <strong>{fmtDur(res.min)}</strong>
              <span>{res.fuente === 'horario' ? 'calculado con horarios' : res.estimado ? 'duración estimada' : 'duración capturada'}</span>
            </>
          ) : (
            <>
              <strong>Pendiente</strong>
              <span>faltan horarios o duración</span>
            </>
          )}
        </div>
      </div>
      {res.error && <div className="segmento__msg segmento__msg--error"><Icono n="alerta" size={14} />{res.error}</div>}
      {res.aviso && <div className="segmento__msg"><Icono n="info" size={14} />{res.aviso}</div>}
      {res.referencia != null && (
        <div className={`segmento__msg ${res.excedeReferencia ? 'segmento__msg--ambar' : ''}`}>
          <Icono n="bandera" size={14} />
          Tiempo de referencia: {fmtDur(res.referencia)}
          {res.excedeReferencia && res.min != null && ` · lo supera por ${fmtDur(res.min - res.referencia)} (posible retraso, revisar contexto)`}
        </div>
      )}
    </div>
  );
}
