// Configuración del viaje (datos generales antes de registrar tiempos).

import { useState } from 'react';
import type { ConfigViaje, Viaje } from '../types';
import { useApp } from '../state/Contexto';
import { uid } from '../lib/ids';
import { Cajon } from './PanelNodo';
import { Aviso, Boton, Campo, Confirmacion, EntradaNumero, EntradaTexto, Seccion, Selector, type ConfirmacionPendiente } from './ui';
import { Icono } from './Iconos';
import { Camion, tipoCamionDe } from './Ilustraciones';

function AltaRapida({ placeholder, onCrear }: { placeholder: string; onCrear: (nombre: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [txt, setTxt] = useState('');
  if (!abierto)
    return (
      <button type="button" className="enlace-btn" onClick={() => setAbierto(true)}>
        <Icono n="mas" size={13} /> Nuevo
      </button>
    );
  const crear = () => {
    if (txt.trim()) onCrear(txt.trim());
    setTxt('');
    setAbierto(false);
  };
  return (
    <span className="alta-rapida">
      <input className="input input--sm" autoFocus value={txt} placeholder={placeholder} onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') crear(); if (e.key === 'Escape') setAbierto(false); }} />
      <button type="button" className="enlace-btn" onClick={crear}>Agregar</button>
    </span>
  );
}

export function PanelConfig({ viaje }: { viaje: Viaje }) {
  const { actualizarViaje, setPanel, cat, actualizarCatalogos, ws, duplicarPlantilla, eliminarViaje, avisar, irA, modo } = useApp();
  const [conf, setConf] = useState<ConfirmacionPendiente | null>(null);
  const c = viaje.config;
  const set = (patch: Partial<ConfigViaje>) => actualizarViaje(viaje.id, (v) => ({ ...v, config: { ...v.config, ...patch } }));

  const aplicarConfiguracion = (id: string): Partial<ConfigViaje> => {
    const cfg = cat.configuraciones.find((x) => x.id === id);
    if (!cfg) return { configuracionId: id };
    return {
      configuracionId: id, tipoUnidad: cfg.tipoUnidad, tipoTolva: cfg.tipoTolva, numTolvas: cfg.numTolvas,
      compartimentosPorTolva: cfg.compartimentosPorTolva, capacidadNominal: cfg.capacidadNominal,
    };
  };
  const elegirUnidad = (id: string) => {
    const u = cat.unidades.find((x) => x.id === id);
    set({ unidadId: id, ...(u ? { tipoUnidad: u.tipoUnidad, ...(u.configuracionId ? aplicarConfiguracion(u.configuracionId) : {}) } : {}) });
  };
  const elegirGranja = (id: string) => {
    const rutaValida = cat.rutas.find((r) => r.id === c.rutaId)?.granjaId === id;
    set({ granjaId: id, ...(rutaValida ? {} : { rutaId: '' }) });
  };
  const elegirRuta = (id: string) => {
    const r = cat.rutas.find((x) => x.id === id);
    set({ rutaId: id, ...(r && !c.granjaId ? { granjaId: r.granjaId } : {}), ...(r?.km != null && c.kmEstimados == null ? { kmEstimados: r.km } : {}) });
  };

  const activos = <T extends { activo: boolean; id: string }>(xs: T[], actual: string) => xs.filter((x) => x.activo || x.id === actual);
  const rutas = activos(cat.rutas, c.rutaId).filter((r) => !c.granjaId || r.granjaId === c.granjaId);
  const folioDuplicado = ws.viajes.some((v) => v.id !== viaje.id && v.config.folio.trim() && v.config.folio.trim() === c.folio.trim());
  const cfgSel = cat.configuraciones.find((x) => x.id === c.configuracionId);

  return (
    <Cajon
      icono="ajustes"
      sub={modo === 'demo' ? 'Viaje de demostración (ficticio)' : 'Configuración del viaje'}
      titulo={c.folio || 'Viaje sin folio'}
      onCerrar={() => setPanel(null)}
      pie={
        <>
          <Boton variante="fantasma" icono="copiar" onClick={() => {
            const id = duplicarPlantilla(viaje.id);
            if (id) avisar('Se creó un viaje nuevo con esta configuración. Los tiempos y cantidades no se copiaron.');
          }}>Duplicar como plantilla</Boton>
          <Boton variante="primario" onClick={() => setPanel({ tipo: 'nodo', id: 'llegada' })}>Registrar actividades <Icono n="der" size={16} /></Boton>
        </>
      }
    >
      <Seccion titulo="Identificación" icono="factura">
        <div className="rejilla-campos">
          <Campo label="Fecha del viaje" htmlFor="cfg-fecha">
            <input id="cfg-fecha" type="date" className="input" value={c.fecha} onChange={(e) => e.target.value && set({ fecha: e.target.value })} />
          </Campo>
          <Campo label="Identificador del viaje (folio)" htmlFor="cfg-folio" error={folioDuplicado ? 'Ya existe otro viaje con este folio.' : null} ayuda={`ID interno único: ${viaje.id.slice(0, 8)}…`}>
            <EntradaTexto id="cfg-folio" value={c.folio} onChange={(x) => set({ folio: x })} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Destino" icono="granja" extra={<button className="enlace-btn" onClick={() => irA('catalogos')}>Administrar catálogos</button>}>
        <div className="rejilla-campos">
          <Campo label="Granja de destino" htmlFor="cfg-granja" extra={<AltaRapida placeholder="Nombre de la granja" onCrear={(nombre) => {
            const id = uid();
            actualizarCatalogos((k) => ({ ...k, granjas: [...k.granjas, { id, nombre, ubicacion: '', procedimientoBio: '', notas: '', activo: true }] }));
            set({ granjaId: id, rutaId: '' });
          }} />}>
            <Selector id="cfg-granja" value={c.granjaId} onChange={elegirGranja} opciones={activos(cat.granjas, c.granjaId).map((g) => ({ valor: g.id, texto: g.nombre }))} />
          </Campo>
          <Campo label="Ruta" htmlFor="cfg-ruta" ayuda={c.granjaId && rutas.length === 0 ? 'No hay rutas registradas para esta granja.' : undefined}
            extra={c.granjaId ? <AltaRapida placeholder="Nombre de la ruta" onCrear={(nombre) => {
              const id = uid();
              actualizarCatalogos((k) => ({ ...k, rutas: [...k.rutas, { id, nombre, granjaId: c.granjaId, km: null, kmTerraceria: null, notas: '', activo: true }] }));
              set({ rutaId: id });
            }} /> : undefined}>
            <Selector id="cfg-ruta" value={c.rutaId} onChange={elegirRuta} opciones={rutas.map((r) => ({ valor: r.id, texto: `${r.nombre}${r.km != null ? ` · ${r.km} km` : ''}` }))} />
          </Campo>
          <Campo label="Kilómetros estimados (ida)" htmlFor="cfg-km">
            <EntradaNumero id="cfg-km" value={c.kmEstimados} onChange={(x) => set({ kmEstimados: x })} unidad="km" />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Unidad y chofer" icono="llegada">
        <div className="vista-unidad">
          <Camion tipo={tipoCamionDe(c, cat)} compartimentos={c.compartimentosPorTolva} titulo={cfgSel?.nombre ?? 'Unidad'} />
          <span>
            {cfgSel?.nombre ?? 'Selecciona la configuración del tráiler'}
            {c.numTolvas != null && c.compartimentosPorTolva != null ? ` · ${c.numTolvas * c.compartimentosPorTolva} compartimentos` : ''}
          </span>
        </div>
        <div className="rejilla-campos">
          <Campo label="Número de unidad" htmlFor="cfg-unidad" extra={<AltaRapida placeholder="Número económico" onCrear={(numero) => {
            const id = uid();
            actualizarCatalogos((k) => ({ ...k, unidades: [...k.unidades, { id, numero, tipoUnidad: c.tipoUnidad, configuracionId: c.configuracionId, capacidadTanque: null, rendimientoRef: null, tomaFuerza: '', notas: '', activo: true }] }));
            set({ unidadId: id });
          }} />}>
            <Selector id="cfg-unidad" value={c.unidadId} onChange={elegirUnidad} opciones={activos(cat.unidades, c.unidadId).map((u) => ({ valor: u.id, texto: `${u.numero}${u.tipoUnidad ? ` · ${u.tipoUnidad}` : ''}` }))} />
          </Campo>
          <Campo label="Chofer" htmlFor="cfg-chofer" extra={<AltaRapida placeholder="Nombre del chofer" onCrear={(nombre) => {
            const id = uid();
            actualizarCatalogos((k) => ({ ...k, choferes: [...k.choferes, { id, nombre, notas: '', activo: true }] }));
            set({ choferId: id });
          }} />}>
            <Selector id="cfg-chofer" value={c.choferId} onChange={(x) => set({ choferId: x })} opciones={activos(cat.choferes, c.choferId).map((x) => ({ valor: x.id, texto: x.nombre }))} />
          </Campo>
          <Campo label="Tipo de unidad" htmlFor="cfg-tipo">
            <Selector id="cfg-tipo" value={c.tipoUnidad} onChange={(x) => set({ tipoUnidad: x })}
              opciones={[...new Set(['Full', 'Tractocamión', ...cat.configuraciones.map((x) => x.tipoUnidad)].filter(Boolean))].map((t) => ({ valor: t, texto: t }))} />
          </Campo>
          <Campo label="Tipo de tráiler o configuración" htmlFor="cfg-cfg">
            <Selector id="cfg-cfg" value={c.configuracionId} onChange={(x) => set(aplicarConfiguracion(x))} opciones={activos(cat.configuraciones, c.configuracionId).map((x) => ({ valor: x.id, texto: x.nombre }))} />
          </Campo>
          <Campo label="Tipo de tolva" htmlFor="cfg-tolva">
            <EntradaTexto id="cfg-tolva" value={c.tipoTolva} onChange={(x) => set({ tipoTolva: x })} />
          </Campo>
          <Campo label="Número de tolvas" htmlFor="cfg-ntol">
            <EntradaNumero id="cfg-ntol" value={c.numTolvas} onChange={(x) => set({ numTolvas: x })} unidad="tolvas" />
          </Campo>
          <Campo label="Compartimentos por tolva" htmlFor="cfg-comp" ayuda={c.compartimentosPorTolva == null ? 'Por confirmar' : undefined}>
            <EntradaNumero id="cfg-comp" value={c.compartimentosPorTolva} onChange={(x) => set({ compartimentosPorTolva: x })} unidad="comp." />
          </Campo>
          <Campo label="Capacidad nominal" htmlFor="cfg-cap" ayuda="Nominal. No equivale a carga legal disponible.">
            <EntradaNumero id="cfg-cap" value={c.capacidadNominal} onChange={(x) => set({ capacidadNominal: x })} unidad="t" />
          </Campo>
        </div>
        {cfgSel?.notas && <Aviso>{cfgSel.notas}</Aviso>}
      </Seccion>

      <Seccion titulo="Carga programada" icono="carga">
        <div className="rejilla-campos">
          <Campo label="Tipo de alimento" htmlFor="cfg-alim">
            <Selector id="cfg-alim" value={c.tipoAlimento} onChange={(x) => set({ tipoAlimento: x })} opciones={cat.tiposAlimento.map((t) => ({ valor: t, texto: t }))} />
          </Campo>
          <Campo label="Toneladas programadas" htmlFor="cfg-ton" ayuda="La carga real se registra en el paso 5.">
            <EntradaNumero id="cfg-ton" value={c.toneladasProgramadas} onChange={(x) => set({ toneladasProgramadas: x })} unidad="t" />
          </Campo>
          <Campo label="Observaciones" ancho="completo" htmlFor="cfg-obs">
            <EntradaTexto id="cfg-obs" multilinea value={c.observaciones} onChange={(x) => set({ observaciones: x })} />
          </Campo>
        </div>
        {c.toneladasProgramadas != null && c.capacidadNominal != null && c.toneladasProgramadas > c.capacidadNominal && (
          <Aviso tono="ambar">Las toneladas programadas superan la capacidad nominal registrada.</Aviso>
        )}
      </Seccion>

      <Seccion titulo="Zona de riesgo" icono="basura">
        <Boton variante="peligro" icono="basura" onClick={() => setConf({
          titulo: 'Eliminar viaje', confirmar: 'Eliminar definitivamente', peligro: true,
          mensaje: <>Se eliminará el viaje <strong>{c.folio}</strong> con todos sus tiempos, incidencias y costos. Esta acción no se puede deshacer, salvo restaurando un respaldo JSON.</>,
          accion: () => { eliminarViaje(viaje.id); setPanel(null); avisar('Viaje eliminado.'); },
        })}>Eliminar este viaje</Boton>
      </Seccion>
      <Confirmacion c={conf} onCerrar={() => setConf(null)} />
    </Cajon>
  );
}
