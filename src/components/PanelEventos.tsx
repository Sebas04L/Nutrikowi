// Panel lateral "Incidencias y paradas" del viaje activo.

import type { Evento, Viaje } from '../types';
import type { ResultadoViaje } from '../lib/calculos';
import { fmtDur } from '../lib/tiempo';
import { useApp } from '../state/Contexto';
import { Cajon } from './PanelNodo';
import { ListaEventos } from './EditorEventos';
import { Boton, Metrica, Seccion } from './ui';

export function PanelEventos({ viaje, r }: { viaje: Viaje; r: ResultadoViaje }) {
  const { actualizarViaje, setPanel, cat, irA } = useApp();
  const e = r.eventos;
  const setEventos = (lista: Evento[]) => actualizarViaje(viaje.id, (vj) => ({ ...vj, eventos: lista }));
  return (
    <Cajon icono="alerta" sub={`Viaje ${viaje.config.folio}`} titulo="Incidencias y paradas" onCerrar={() => setPanel(null)}
      pie={<><span className="cajon__guardado">Se guarda automáticamente</span><Boton variante="fantasma" icono="ruta" onClick={() => irA('incidencias')}>Velocidad y resumen general</Boton></>}>
      <p className="cajon__desc">
        Registra cada parada o retraso relevante. Las paradas necesarias u operativas (descansos, bioseguridad, cargas de combustible) se mantienen separadas de las incidencias.
      </p>
      <div className="rejilla-metricas" style={{ marginTop: 12 }}>
        <Metrica label="Incidencias" valor={e.incidencias} sub={e.minIncidencia ? fmtDur(e.minIncidencia) : 'sin tiempo registrado'} />
        <Metrica label="Paradas necesarias u operativas" valor={e.paradas} sub={e.minParada ? fmtDur(e.minParada) : 'sin tiempo registrado'} />
        <Metrica label="Afectaron la entrega" valor={e.afectaronEntrega} />
        <Metrica label="Motor encendido detenido" valor={e.motorEncendidoMin ? fmtDur(e.motorEncendidoMin) : '—'} sub={e.litrosMedidos || e.litrosEstimados ? `${e.litrosMedidos ? `${e.litrosMedidos} L medidos` : ''}${e.litrosMedidos && e.litrosEstimados ? ' · ' : ''}${e.litrosEstimados ? `${e.litrosEstimados} L estimados` : ''}` : 'sin consumo registrado'} />
      </div>
      {e.sinDuracion > 0 && <p className="nota">{e.sinDuracion} evento(s) sin horario ni duración: cuentan en el número de eventos, sin minutos.</p>}
      <Seccion titulo="Registro del viaje" icono="lista">
        <ListaEventos viaje={viaje} cat={cat} onCambiar={setEventos} />
      </Seccion>
    </Cajon>
  );
}
