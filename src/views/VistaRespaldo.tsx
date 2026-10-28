// Exportación CSV, respaldos JSON, restauración y datos de demostración.

import { useRef, useState } from 'react';
import { useApp } from '../state/Contexto';
import { copiaV1, crearRespaldo, descargarArchivo, leerRespaldo, tamanoGuardado, type RespaldoLeido } from '../lib/almacen';
import { csvEventos, csvTramos, csvViajes } from '../lib/exportar';
import { espacioVacio } from '../lib/datosBase';
import { hoyStr } from '../lib/tiempo';
import { Aviso, Boton, Confirmacion, Modal, type ConfirmacionPendiente } from '../components/ui';
import { Icono } from '../components/Iconos';

export function VistaRespaldo() {
  const { almacen, ws, modo, reemplazarAlmacen, restaurarDemo, avisar, guardadoEn, actualizarEspacio, setModo } = useApp();
  const archivo = useRef<HTMLInputElement>(null);
  const [leido, setLeido] = useState<(RespaldoLeido & { nombre: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conf, setConf] = useState<ConfirmacionPendiente | null>(null);
  const sufijo = modo === 'demo' ? '-DEMO' : '';

  const exportarCsv = () => {
    descargarArchivo(`nutrikowi-viajes${sufijo}-${hoyStr()}.csv`, csvViajes(ws.viajes, ws.catalogos, modo), 'text/csv;charset=utf-8');
    avisar(`CSV exportado con ${ws.viajes.length} viaje(s).`);
  };
  const exportarIncidencias = () => {
    descargarArchivo(`nutrikowi-incidencias-paradas${sufijo}-${hoyStr()}.csv`, csvEventos(ws.viajes, ws.catalogos, modo), 'text/csv;charset=utf-8');
    avisar('CSV de incidencias y paradas exportado.');
  };
  const exportarTramos = () => {
    descargarArchivo(`nutrikowi-velocidad${sufijo}-${hoyStr()}.csv`, csvTramos(ws.viajes, ws.catalogos, modo), 'text/csv;charset=utf-8');
    avisar('CSV de tramos de velocidad exportado.');
  };
  const v1 = copiaV1();
  const respaldar = () => {
    descargarArchivo(`nutrikowi-respaldo-${hoyStr()}.json`, crearRespaldo(almacen), 'application/json');
    avisar('Respaldo JSON descargado.');
  };
  const leerArchivo = async (f: File | undefined) => {
    setError(null);
    if (!f) return;
    try {
      const r = leerRespaldo(await f.text());
      setLeido({ ...r, nombre: f.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      if (archivo.current) archivo.current.value = '';
    }
  };

  const kb = Math.round(tamanoGuardado() / 1024);

  return (
    <div className="pagina">
      <header className="pagina__cab">
        <div>
          <h1>Exportar y respaldar</h1>
          <p>Los datos viven únicamente en este navegador. Descarga respaldos con frecuencia.</p>
        </div>
      </header>

      <Aviso tono="ambar" icono="alerta">
        <strong>El almacenamiento local del navegador no equivale a una base de datos centralizada.</strong> Los registros sólo existen en este equipo y
        en este navegador; se pierden si se borran los datos de navegación, si se usa otro navegador o equipo, o en ventanas privadas. Descarga un respaldo JSON
        al terminar cada jornada y guárdalo en un lugar seguro.
      </Aviso>

      <div className="rejilla-2">
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2><Icono n="respaldo" size={18} /> Exportar a CSV</h2></header>
          <p className="nota">
            Exporta los viajes del espacio actual ({modo === 'demo' ? <b>demostración, ficticios</b> : <b>datos reales</b>}): una fila por viaje con todos los datos capturados y los
            resultados calculados. Compatible con Excel (UTF-8).
          </p>
          <div className="fila-botones">
            <Boton variante="primario" icono="respaldo" onClick={exportarCsv} disabled={!ws.viajes.length}>Viajes ({ws.viajes.length})</Boton>
            <Boton icono="alerta" onClick={exportarIncidencias} disabled={!ws.viajes.length}>Incidencias y paradas</Boton>
            <Boton icono="velocimetro" onClick={exportarTramos} disabled={!ws.viajes.some((v) => v.tramos.length)}>Tramos de velocidad</Boton>
          </div>
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cab"><h2><Icono n="disco" size={18} /> Respaldo completo (JSON)</h2></header>
          <p className="nota">Incluye viajes reales, catálogos, hipótesis y el espacio de demostración, cada uno por separado. Sirve para restaurar o trasladar los datos a otro navegador.</p>
          <div className="fila-botones">
            <Boton variante="primario" icono="respaldo" onClick={respaldar}>Descargar respaldo</Boton>
            <Boton icono="subir" onClick={() => archivo.current?.click()}>Restaurar desde archivo…</Boton>
            <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={(e) => leerArchivo(e.target.files?.[0])} />
          </div>
          {error && <Aviso tono="rojo">{error}</Aviso>}
        </section>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2><Icono n="matraz" size={18} /> Datos de demostración</h2></header>
          <p className="nota">Los datos de demostración son <b>ficticios</b> y viven en un espacio separado: nunca se mezclan con los registros reales ni aparecen en sus indicadores o exportaciones.</p>
          <div className="fila-botones">
            {modo === 'real' ? <Boton icono="ojo" onClick={() => setModo('demo')}>Ver demostración</Boton> : <Boton icono="izq" onClick={() => setModo('real')}>Volver a datos reales</Boton>}
            <Boton icono="ciclo" onClick={() => setConf({
              titulo: 'Restaurar datos de demostración', confirmar: 'Restaurar',
              mensaje: 'Se regenerarán los viajes y catálogos ficticios de demostración. Los cambios hechos en la demostración se perderán. Los datos reales no se modifican.',
              accion: () => { restaurarDemo(); avisar('Datos de demostración restaurados.'); },
            })}>Restaurar demostración</Boton>
          </div>
        </section>

        <section className="tarjeta">
          <header className="tarjeta__cab"><h2><Icono n="info" size={18} /> Estado del almacenamiento</h2></header>
          <ul className="lista-estado">
            <li><span>Viajes reales</span><b>{almacen.real.viajes.length}</b></li>
            <li><span>Viajes de demostración</span><b>{almacen.demo.viajes.length}</b></li>
            <li><span>Espacio utilizado</span><b>{kb} KB</b></li>
            <li><span>Formato de datos</span><b>versión 2</b></li>
            <li><span>Último guardado</span><b>{guardadoEn ? new Date(guardadoEn).toLocaleTimeString('es-MX') : 'sin cambios en esta sesión'}</b></li>
          </ul>
          {v1 && (
            <div className="aviso aviso--verde" style={{ alignItems: 'center' }}>
              <Icono n="disco" size={16} />
              <div style={{ flex: 1 }}>Hay una copia intacta de los datos de la versión 1, guardada antes de la actualización.</div>
              <Boton tam="sm" icono="respaldo" onClick={() => descargarArchivo(`nutrikowi-datos-version1-${hoyStr()}.json`, v1, 'application/json')}>Descargar</Boton>
            </div>
          )}
          {modo === 'real' && almacen.real.viajes.length > 0 && (
            <Boton variante="peligro" icono="basura" onClick={() => setConf({
              titulo: 'Borrar todos los datos reales', confirmar: 'Borrar todo', peligro: true,
              mensaje: <>Se eliminarán <b>{almacen.real.viajes.length} viaje(s) reales</b>, sus catálogos e hipótesis de este navegador. Descarga un respaldo antes de continuar. No se puede deshacer.</>,
              accion: () => { actualizarEspacio(() => espacioVacio()); avisar('Datos reales eliminados.'); },
            })}>Borrar todos los datos reales</Boton>
          )}
        </section>
      </div>

      <Modal abierto={!!leido} titulo="Restaurar respaldo" onCerrar={() => setLeido(null)} acciones={
        <>
          <Boton variante="fantasma" onClick={() => setLeido(null)}>Cancelar</Boton>
          <Boton variante="primario" onClick={() => {
            if (!leido) return;
            reemplazarAlmacen(leido.almacen);
            setLeido(null);
            avisar('Respaldo restaurado.');
          }}>Reemplazar los datos actuales</Boton>
        </>
      }>
        {leido && (
          <div className="texto-modal">
            <p>Archivo: <b>{leido.nombre}</b>{leido.exportado && <> · exportado el {new Date(leido.exportado).toLocaleString('es-MX')}</>}</p>
            <p>Contiene <b>{leido.viajesReales}</b> viaje(s) reales y <b>{leido.viajesDemo}</b> de demostración.</p>
            {leido.versionOrigen === 1 && <Aviso tono="verde">Respaldo de la versión 1: se convertirá al formato actual sin perder registros (las incidencias pasan a “Incidencias y paradas”).</Aviso>}
            <Aviso tono="ambar">Los datos actuales de este navegador ({almacen.real.viajes.length} viajes reales) se reemplazarán por los del respaldo. Si no estás seguro, descarga primero un respaldo de los datos actuales.</Aviso>
            <Boton tam="sm" icono="respaldo" onClick={respaldar}>Descargar respaldo actual primero</Boton>
          </div>
        )}
      </Modal>
      <Confirmacion c={conf} onCerrar={() => setConf(null)} />
    </div>
  );
}
