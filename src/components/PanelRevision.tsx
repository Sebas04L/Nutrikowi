// Integridad de los datos del viaje: qué falta, qué es estimado y validación.

import { useState } from 'react';
import type { Viaje } from '../types';
import type { ResultadoViaje } from '../lib/calculos';
import { ETIQUETA_CALIDAD, type CalidadViaje } from '../lib/calidad';
import { useApp } from '../state/Contexto';
import { Cajon } from './PanelNodo';
import { Aviso, Boton, Campo, EntradaTexto, Seccion } from './ui';
import { Icono } from './Iconos';

export function GruposCalidad({ q, onIr }: { q: CalidadViaje; onIr?: (nodo: string) => void }) {
  return (
    <div className="calidad-grupos">
      {q.grupos.map((g) => {
        const clase = g.faltan.length ? 'falta' : g.estimados.length ? 'est' : 'ok';
        return (
          <div key={g.id} className={`calidad-grupo calidad-grupo--${clase}`}>
            <b>
              <Icono n={clase === 'ok' ? 'check' : clase === 'est' ? 'info' : 'alerta'} size={14} />
              {g.titulo}
            </b>
            {g.faltan.length > 0 && (
              <ul>{g.faltan.slice(0, 4).map((f) => <li key={f}>{f}</li>)}{g.faltan.length > 4 && <li>y {g.faltan.length - 4} más</li>}</ul>
            )}
            {g.estimados.length > 0 && <div className="nota" style={{ margin: '4px 0 0' }}>Estimado: {g.estimados.join(', ')}</div>}
            {g.faltan.length === 0 && g.estimados.length === 0 && <div className="nota" style={{ margin: '4px 0 0' }}>Completo</div>}
            {onIr && g.nodo && g.faltan.length > 0 && <button className="enlace-btn" style={{ fontSize: 12, marginTop: 4 }} onClick={() => onIr(g.nodo!)}>Completar →</button>}
          </div>
        );
      })}
    </div>
  );
}

export function PanelRevision({ viaje, r, q }: { viaje: Viaje; r: ResultadoViaje; q: CalidadViaje }) {
  const { setPanel, validarViaje, quitarValidacion, avisar } = useApp();
  const [responsable, setResponsable] = useState(viaje.revision.responsable);
  const [nota, setNota] = useState(viaje.revision.nota);
  return (
    <Cajon icono="check" sub={`Viaje ${viaje.config.folio}`} titulo="Revisión e integridad de los datos" onCerrar={() => setPanel(null)}
      cabExtra={<span className={`calidad-badge calidad-badge--${q.estado}`}><i />{ETIQUETA_CALIDAD[q.estado]}</span>}>
      <p className="cajon__desc">
        Los indicadores para la dirección deben calcularse con registros completos. Un dato desconocido queda vacío (nunca se convierte en cero) y un dato estimado se identifica como tal.
      </p>
      {q.errores.length > 0 && (
        <Aviso tono="rojo"><b>Datos a corregir:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{q.errores.map((e) => <li key={e}>{e}</li>)}</ul></Aviso>
      )}
      <Seccion titulo="Información requerida" icono="lista">
        <GruposCalidad q={q} onIr={(nodo) => setPanel({ tipo: 'nodo', id: nodo })} />
        <p className="nota">Actividades completas: {r.avance.completos} de {r.avance.aplicables} · datos requeridos capturados: {Math.round(r.completitud.pct * 100)} %.</p>
      </Seccion>

      <Seccion titulo="Validación" icono="check">
        {viaje.revision.invalidado && !viaje.revision.validado && <Aviso tono="ambar">La validación anterior quedó sin efecto: {viaje.revision.invalidado}</Aviso>}
        {viaje.revision.validado ? (
          <>
            <Aviso tono="verde">
              Validado el {new Date(viaje.revision.validado).toLocaleString('es-MX')}{viaje.revision.responsable ? ` por ${viaje.revision.responsable}` : ''}.
              {viaje.revision.nota && <><br />{viaje.revision.nota}</>}
              <br />Cualquier edición posterior quitará la validación automáticamente.
            </Aviso>
            <Boton variante="fantasma" onClick={() => { quitarValidacion(viaje.id); avisar('Validación retirada.'); }}>Quitar validación</Boton>
          </>
        ) : q.estado === 'listo' ? (
          <>
            <p className="nota">El registro tiene todos los datos requeridos. Revísalo y valídalo para incluirlo como información confiable.</p>
            <div className="rejilla-campos">
              <Campo label="Responsable de la revisión"><EntradaTexto value={responsable} onChange={setResponsable} placeholder="Nombre" /></Campo>
              <Campo label="Nota (opcional)"><EntradaTexto value={nota} onChange={setNota} /></Campo>
            </div>
            <div style={{ marginTop: 12 }}>
              <Boton variante="primario" icono="check" disabled={!responsable.trim()} onClick={() => { validarViaje(viaje.id, responsable.trim(), nota.trim()); avisar('Viaje validado.'); }}>Validar registro</Boton>
            </div>
          </>
        ) : (
          <p className="nota">La validación se habilita cuando no faltan datos requeridos y no hay datos por corregir.</p>
        )}
      </Seccion>
    </Cajon>
  );
}
