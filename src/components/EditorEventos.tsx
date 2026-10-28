// Registro de incidencias y paradas de un viaje (componente reutilizado en el mapa y en la vista Incidencias).

import { useState } from 'react';
import type { Catalogos, Evento, Viaje } from '../types';
import { NODOS, NODOS_LISTA } from '../lib/proceso';
import { claseDe, duracionEvento, errorEvento, esIncidencia, estadoConsumo, ETIQUETA_CLASE, ETIQUETA_CONSUMO, kmEvento } from '../lib/eventos';
import { eventoVacio } from '../lib/datosBase';
import { fmtDur, fmtFecha, fmtHora, parseDT } from '../lib/tiempo';
import { CampoHora } from './CampoHora';
import { Boton, Campo, Confirmacion, EntradaDuracion, EntradaNumero, EntradaTexto, Pastilla, Segmentado, Selector, SiNo, type ConfirmacionPendiente } from './ui';
import { Icono } from './Iconos';

const TONO_CLASE = { necesaria: 'plum', operativa: 'plum', demora: 'ambar', falla: 'rojo', otra: 'gris' } as const;

export function ResumenEvento({ e, cat }: { e: Evento; cat: Catalogos }) {
  const clase = claseDe(e.tipo, cat);
  const d = duracionEvento(e);
  const a = parseDT(e.inicio);
  const b = parseDT(e.fin);
  const km = kmEvento(e);
  return (
    <span className="evento__resumen">
      <Pastilla tono={TONO_CLASE[clase]}>{esIncidencia(clase) ? 'Incidencia' : 'Parada'} · {ETIQUETA_CLASE[clase].toLowerCase()}</Pastilla>
      {d != null ? <Pastilla tono="neutro" icono="reloj">{fmtDur(d)}{a != null && b != null ? ` · ${fmtHora(a)}–${fmtHora(b)}` : ''}</Pastilla> : <Pastilla tono="gris">Sin duración</Pastilla>}
      <Pastilla tono="gris">{ETIQUETA_CONSUMO[estadoConsumo(e)]}{e.litros != null && (e.consumo === 'medido' || e.consumo === 'estimado') ? ` · ${e.litros} L` : ''}</Pastilla>
      {km != null && km > 0 && <Pastilla tono="gris">{km} km</Pastilla>}
      {e.afectoEntrega && <Pastilla tono="rojo">Afectó la entrega</Pastilla>}
      {e.desperfecto && <Pastilla tono="rojo">Desperfecto</Pastilla>}
    </span>
  );
}

export function EditorEvento({ e, viaje, cat, onChange, onBorrar, mostrarActividad = true }: {
  e: Evento; viaje: Viaje; cat: Catalogos; onChange: (e: Evento) => void; onBorrar: () => void; mostrarActividad?: boolean;
}) {
  const clase = claseDe(e.tipo, cat);
  const err = errorEvento(e);
  const set = (p: Partial<Evento>) => onChange({ ...e, ...p });
  const tipos = cat.tiposEvento.some((t) => t.nombre === e.tipo) ? cat.tiposEvento : [{ nombre: e.tipo, clase: 'otra' as const }, ...cat.tiposEvento];
  return (
    <div className={`evento ${esIncidencia(clase) ? '' : 'evento--parada'}`}>
      <div className="evento__cab">
        <select className="input input--fuerte" value={e.tipo} onChange={(x) => set({ tipo: x.target.value })} aria-label="Tipo de evento">
          {(['necesaria', 'operativa', 'demora', 'falla', 'otra'] as const).map((c) => {
            const del = tipos.filter((t) => t.clase === c);
            return del.length ? (
              <optgroup key={c} label={ETIQUETA_CLASE[c]}>
                {del.map((t) => <option key={t.nombre} value={t.nombre}>{t.nombre}</option>)}
              </optgroup>
            ) : null;
          })}
        </select>
        <button className="icono-btn icono-btn--peligro" onClick={onBorrar} aria-label="Eliminar evento" title="Eliminar"><Icono n="basura" size={16} /></button>
      </div>
      <ResumenEvento e={e} cat={cat} />
      {err && <div className="evento__err">{err}</div>}

      <div className="evento__grid">
        {mostrarActividad && (
          <Campo label="Actividad del proceso" ancho="completo">
            <Selector value={e.nodo ?? ''} onChange={(x) => set({ nodo: x || null })} vacio="Sin vincular a una actividad"
              opciones={NODOS_LISTA.filter((n) => n.tipo !== 'decision').map((n) => ({ valor: n.id, texto: `${n.paso} · ${n.corto}` }))} />
          </Campo>
        )}
        <Campo label="Hora de inicio" ancho="completo"><CampoHora compacto value={e.inicio} onChange={(x) => set({ inicio: x })} fechaBase={e.fecha ?? viaje.config.fecha} /></Campo>
        <Campo label="Hora de finalización" ancho="completo"><CampoHora compacto value={e.fin} onChange={(x) => set({ fin: x })} fechaBase={e.inicio?.slice(0, 10) ?? e.fecha ?? viaje.config.fecha} referencia={parseDT(e.inicio)} /></Campo>
        <Campo label="Duración (si no hay horarios)"><EntradaDuracion value={e.duracionMin} onChange={(x) => set({ duracionMin: x })} /></Campo>
        <Campo label="Fecha (si no hay horarios)">
          <input type="date" className="input" value={e.fecha ?? ''} onChange={(x) => set({ fecha: x.target.value || null })} disabled={!!e.inicio} title={e.inicio ? 'Se toma de la hora de inicio' : undefined} />
        </Campo>
        <Campo label="Odómetro al iniciar"><EntradaNumero value={e.odoInicio} onChange={(x) => set({ odoInicio: x })} unidad="km" /></Campo>
        <Campo label="Odómetro al finalizar"><EntradaNumero value={e.odoFin} onChange={(x) => set({ odoFin: x })} unidad="km" /></Campo>
        <Campo label="Ubicación o lugar" ancho="completo"><EntradaTexto value={e.lugar} onChange={(x) => set({ lugar: x })} placeholder="Ej. km 42, caseta, acceso a granja…" /></Campo>
        <Campo label="Motivo" ancho="completo"><EntradaTexto value={e.motivo} onChange={(x) => set({ motivo: x })} placeholder="¿Por qué ocurrió la parada o el retraso?" /></Campo>
        <Campo label="Motor durante la parada">
          <Segmentado<'apagado' | 'encendido'> value={e.motor} onChange={(x) => set({ motor: e.motor === x ? null : x })} opciones={[{ valor: 'apagado', texto: 'Apagado' }, { valor: 'encendido', texto: 'Encendido' }]} />
        </Campo>
        <Campo label="Consumo de diésel asociado">
          <Selector value={e.consumo ?? ''} onChange={(x) => set({ consumo: (x || null) as Evento['consumo'], ...(x === 'sin_consumo' || !x ? { litros: null } : {}) })} vacio="Sin información"
            opciones={[{ valor: 'medido', texto: 'Consumo medido' }, { valor: 'estimado', texto: 'Consumo estimado' }, { valor: 'sin_consumo', texto: 'Sin consumo' }]} />
        </Campo>
        {(e.consumo === 'medido' || e.consumo === 'estimado') && (
          <Campo label={`Litros ${e.consumo === 'medido' ? 'medidos' : 'estimados'}`}><EntradaNumero value={e.litros} onChange={(x) => set({ litros: x })} unidad="L" /></Campo>
        )}
        <Campo label="¿Hubo desperfecto mecánico?"><SiNo value={e.desperfecto} onChange={(x) => set({ desperfecto: x })} /></Campo>
        <Campo label="¿Afectó el horario de entrega?"><SiNo value={e.afectoEntrega} onChange={(x) => set({ afectoEntrega: x })} /></Campo>
        <Campo label="Observaciones" ancho="completo"><EntradaTexto multilinea value={e.observaciones} onChange={(x) => set({ observaciones: x })} /></Campo>
      </div>
      <p className="nota" style={{ margin: 0 }}>
        {esIncidencia(clase)
          ? 'Se contabiliza como tiempo de incidencia, sin sumarse dos veces al ciclo.'
          : 'Parada necesaria u operativa: se registra por separado y no se considera tiempo improductivo.'}
      </p>
    </div>
  );
}

/** Lista editable de eventos. Si se indica `nodo`, sólo muestra y crea eventos de esa actividad. */
export function ListaEventos({ viaje, cat, onCambiar, nodo, vacio }: {
  viaje: Viaje; cat: Catalogos; onCambiar: (eventos: Evento[]) => void; nodo?: string; vacio?: string;
}) {
  const [conf, setConf] = useState<ConfirmacionPendiente | null>(null);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const lista = viaje.eventos.filter((e) => (nodo ? e.nodo === nodo : true));
  const ordenados = [...lista].sort((a, b) => (a.inicio ?? a.fecha ?? '9').localeCompare(b.inicio ?? b.fecha ?? '9'));
  const agregar = (tipo: string) => {
    const e = eventoVacio(tipo, nodo ?? null);
    onCambiar([...viaje.eventos, e]);
    setAbiertos((a) => ({ ...a, [e.id]: true }));
  };
  const primerIncid = cat.tiposEvento.find((t) => esIncidencia(t.clase))?.nombre ?? 'Otro';
  const primerParada = cat.tiposEvento.find((t) => !esIncidencia(t.clase))?.nombre ?? 'Parada operativa';
  return (
    <div>
      <div className="fila-botones" style={{ marginBottom: 10 }}>
        <Boton tam="sm" icono="alerta" onClick={() => agregar(primerIncid)}>Agregar incidencia</Boton>
        <Boton tam="sm" icono="bandera" onClick={() => agregar(primerParada)}>Agregar parada</Boton>
      </div>
      {ordenados.length === 0 && <p className="nota">{vacio ?? 'Sin incidencias ni paradas registradas.'}</p>}
      {ordenados.map((e) => {
        const abierto = abiertos[e.id] ?? false;
        const clase = claseDe(e.tipo, cat);
        if (!abierto) {
          return (
            <div key={e.id} className="evento-compacto">
              <i style={{ background: esIncidencia(clase) ? 'var(--c-incidencia)' : 'var(--c-parada)' }} />
              <div className="evento-compacto__txt">
                <b>{e.tipo}</b>{e.nodo && !nodo ? <span className="muted"> · {NODOS[e.nodo]?.corto}</span> : null}
                <small>{[e.motivo, e.lugar, e.inicio ? fmtFecha(e.inicio) : e.fecha ? fmtFecha(e.fecha) : null].filter(Boolean).join(' · ') || 'Sin detalle'}</small>
              </div>
              <span className="muted num" style={{ fontSize: 12.5 }}>{duracionEvento(e) != null ? fmtDur(duracionEvento(e)) : '—'}</span>
              <Boton tam="sm" variante="fantasma" icono="editar" onClick={() => setAbiertos((a) => ({ ...a, [e.id]: true }))}>Editar</Boton>
            </div>
          );
        }
        return (
          <div key={e.id}>
            <EditorEvento e={e} viaje={viaje} cat={cat} mostrarActividad={!nodo}
              onChange={(x) => onCambiar(viaje.eventos.map((y) => (y.id === e.id ? x : y)))}
              onBorrar={() => setConf({
                titulo: 'Eliminar evento', confirmar: 'Eliminar', peligro: true,
                mensaje: `¿Eliminar “${e.tipo}”${e.motivo ? ` (${e.motivo})` : ''} del registro?`,
                accion: () => onCambiar(viaje.eventos.filter((y) => y.id !== e.id)),
              })} />
            <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 10 }}>
              <button className="enlace-btn" onClick={() => setAbiertos((a) => ({ ...a, [e.id]: false }))}>Contraer</button>
            </div>
          </div>
        );
      })}
      <Confirmacion c={conf} onCerrar={() => setConf(null)} />
    </div>
  );
}
