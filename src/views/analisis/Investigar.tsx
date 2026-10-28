// Tiempos para investigar (frente a viajes comparables), clasificación y registro de hipótesis.

import { useMemo, useState } from 'react';
import type { EstadoHipotesis, Hipotesis } from '../../types';
import { atipicos, porActividad, type ViajeCalc } from '../../lib/analisis';
import { NODOS, NODOS_LISTA, SEGMENTOS } from '../../lib/proceso';
import { nombres } from '../../lib/nombres';
import { fmtDur, fmtFecha, fmtFechaCorta, hoyStr } from '../../lib/tiempo';
import { uid } from '../../lib/ids';
import { useApp } from '../../state/Contexto';
import { Boton, Confirmacion, EntradaTexto, Pastilla, Selector, type ConfirmacionPendiente } from '../../components/ui';
import { Icono } from '../../components/Iconos';

export function Investigar({ calcs }: { calcs: ViajeCalc[] }) {
  const { cat, setActivo, irA, setPanel } = useApp();
  const [factor, setFactor] = useState('1.5');
  const raros = useMemo(() => atipicos(calcs, Number(factor)), [calcs, factor]);
  const filas = useMemo(() => porActividad(calcs), [calcs]);
  const clasificados = filas.filter((f) => f.clasif.normal + f.clasif.excepcion + f.clasif.investigar > 0);
  const abrir = (id: string, nodo?: string) => {
    setActivo(id);
    irA('mapa');
    if (nodo) setTimeout(() => setPanel({ tipo: 'nodo', id: nodo }), 0);
  };
  return (
    <>
      <section className="tarjeta" style={{ marginTop: 0 }}>
        <header className="tarjeta__cab">
          <h2><Icono n="analisis" size={18} />Tiempos para investigar</h2>
          <label className="inline-control">Umbral
            <Selector value={factor} onChange={(x) => setFactor(x || '1.5')} vacio={null} opciones={[{ valor: '1.25', texto: '1.25 × mediana' }, { valor: '1.5', texto: '1.5 × mediana' }, { valor: '2', texto: '2 × mediana' }]} />
          </label>
        </header>
        <p className="nota">Valores que superan el umbral respecto a la mediana de viajes <b>comparables</b> (misma ruta y configuración, mínimo 3 viajes con dato). Es una señal para revisar, no un juicio de eficiencia. No se calculan ahorros.</p>
        {raros.length === 0 ? <p className="nota">No hay valores por encima del umbral o no hay grupos con suficientes viajes comparables.</p> : (
          <div className="tabla-envoltura">
            <table className="tabla tabla--compacta">
              <thead><tr><th>Viaje</th><th>Actividad</th><th className="num">Registrado</th><th className="num">Mediana del grupo</th><th className="num">Relación</th><th>Clasificación</th></tr></thead>
              <tbody>
                {raros.slice(0, 30).map((a) => {
                  const nodo = SEGMENTOS[a.segmento].nodo;
                  const cl = a.viaje.clasif[nodo]?.estado;
                  return (
                    <tr key={a.viaje.id + a.segmento} className="clicable" onClick={() => abrir(a.viaje.id, nodo)}>
                      <td><span className="enlace-btn enlace-btn--fuerte">{a.viaje.config.folio}</span><div className="nota-tabla">{fmtFechaCorta(a.viaje.config.fecha)} · {nombres(a.viaje, cat).unidad}</div></td>
                      <td>{SEGMENTOS[a.segmento].label}</td>
                      <td className="num">{fmtDur(a.valor)}</td><td className="num">{fmtDur(a.mediana)} <small className="muted">n={a.n}</small></td>
                      <td className="num">{(a.valor / a.mediana).toFixed(2)}×</td>
                      <td>{cl === 'excepcion' ? <Pastilla tono="gris">Excepción</Pastilla> : cl === 'normal' ? <Pastilla tono="verde">Normal</Pastilla> : cl === 'investigar' ? <Pastilla tono="ambar">Investigar</Pastilla> : <span className="pend">Sin clasificar</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {clasificados.length > 0 && (
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2>Clasificación de tiempos registrada</h2><span className="tarjeta__ayuda">Normal · excepción justificada · pendiente de investigar</span></header>
          <table className="tabla tabla--compacta">
            <thead><tr><th>Actividad</th><th className="num">Normal</th><th className="num">Excepción</th><th className="num">Investigar</th></tr></thead>
            <tbody>
              {clasificados.map((f) => (
                <tr key={f.nodo}><td>{NODOS[f.nodo].corto}</td><td className="num">{f.clasif.normal}</td><td className="num">{f.clasif.excepcion}</td><td className="num">{f.clasif.investigar}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <PanelHipotesis />
    </>
  );
}

const ESTADOS_H: { valor: EstadoHipotesis; texto: string }[] = [
  { valor: 'abierta', texto: 'Abierta' }, { valor: 'en_analisis', texto: 'En análisis' }, { valor: 'validada', texto: 'Validada' }, { valor: 'descartada', texto: 'Descartada' },
];

function PanelHipotesis() {
  const { ws, actualizarEspacio } = useApp();
  const [conf, setConf] = useState<ConfirmacionPendiente | null>(null);
  const set = (lista: Hipotesis[]) => actualizarEspacio((w) => ({ ...w, hipotesis: lista }));
  const upd = (id: string, p: Partial<Hipotesis>) => set(ws.hipotesis.map((h) => (h.id === id ? { ...h, ...p } : h)));
  return (
    <section className="tarjeta">
      <header className="tarjeta__cab">
        <h2><Icono n="hipotesis" size={18} />Observaciones e hipótesis de mejora</h2>
        <Boton tam="sm" icono="mas" onClick={() => set([{ id: uid(), fecha: hoyStr(), actividad: 'general', texto: '', evidencia: '', estado: 'abierta' }, ...ws.hipotesis])}>Nueva hipótesis</Boton>
      </header>
      <p className="nota">Registra hipótesis antes de concluir. Valida con viajes equivalentes y documenta la evidencia; cualquier escenario de ahorro debe tratarse como hipotético.</p>
      {ws.hipotesis.length === 0 && <p className="nota">Aún no hay hipótesis registradas.</p>}
      <div className="hipotesis">
        {ws.hipotesis.map((h) => (
          <div key={h.id} className={`hipotesis__item hipotesis__item--${h.estado}`}>
            <div className="hipotesis__cab">
              <Selector value={h.actividad} onChange={(x) => upd(h.id, { actividad: x || 'general' })} vacio={null}
                opciones={[{ valor: 'general', texto: 'General' }, ...NODOS_LISTA.map((n) => ({ valor: n.id, texto: `${n.paso} · ${n.corto}` }))]} />
              <Selector<EstadoHipotesis> value={h.estado} onChange={(x) => x && upd(h.id, { estado: x })} vacio={null} opciones={ESTADOS_H} />
              <span className="muted">{fmtFecha(h.fecha)}</span>
              <button className="icono-btn icono-btn--peligro" aria-label="Eliminar hipótesis" onClick={() => setConf({
                titulo: 'Eliminar hipótesis', confirmar: 'Eliminar', peligro: true, mensaje: '¿Eliminar esta hipótesis?', accion: () => set(ws.hipotesis.filter((x) => x.id !== h.id)),
              })}><Icono n="basura" size={15} /></button>
            </div>
            <EntradaTexto multilinea value={h.texto} onChange={(x) => upd(h.id, { texto: x })} placeholder="Hipótesis u observación…" />
            <EntradaTexto multilinea value={h.evidencia} onChange={(x) => upd(h.id, { evidencia: x })} placeholder="Evidencia, viajes de referencia o cómo validarla…" />
          </div>
        ))}
      </div>
      <Confirmacion c={conf} onCerrar={() => setConf(null)} />
    </section>
  );
}
