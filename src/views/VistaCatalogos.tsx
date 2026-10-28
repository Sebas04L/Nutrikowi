// Catálogos editables: granjas, rutas, unidades, choferes, configuraciones,
// listas de opciones y tiempos de referencia.

import { useState } from 'react';
import type { Catalogos, ClaseEvento, TipoEvento } from '../types';
import { useApp } from '../state/Contexto';
import { uid } from '../lib/ids';
import { SEGMENTOS_LISTA, NODOS } from '../lib/proceso';
import { DESCRIPCION_CLASE, ETIQUETA_CLASE } from '../lib/eventos';
import { Aviso, Boton, Confirmacion, EntradaNumero, Segmentado, type ConfirmacionPendiente } from '../components/ui';
import { Icono } from '../components/Iconos';

type Pestana = 'granjas' | 'rutas' | 'unidades' | 'choferes' | 'configuraciones' | 'listas' | 'eventos' | 'referencias';

interface Col {
  k: string;
  t: string;
  tipo: 'texto' | 'numero' | 'select';
  opciones?: { valor: string; texto: string }[];
  ancho?: number;
  unidad?: string;
}

type Fila = { id: string; activo: boolean } & Record<string, unknown>;

function TablaEditable({ filas, cols, onCambiar, onAgregar, onEliminar, usos, nombre }: {
  filas: Fila[]; cols: Col[]; onCambiar: (id: string, k: string, v: unknown) => void; onAgregar: () => void; onEliminar: (id: string) => void;
  usos: (id: string) => number; nombre: string;
}) {
  const [conf, setConf] = useState<ConfirmacionPendiente | null>(null);
  return (
    <>
      <div className="tabla-envoltura">
        <table className="tabla tabla--editable">
          <thead>
            <tr>
              {cols.map((c) => <th key={c.k} style={{ minWidth: c.ancho }}>{c.t}</th>)}
              <th>Estado</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={cols.length + 2} className="vacio-tabla">Sin registros. Agrega el primero.</td></tr>}
            {filas.map((f) => (
              <tr key={f.id} className={f.activo ? '' : 'inactivo'}>
                {cols.map((c) => (
                  <td key={c.k} data-l={c.t}>
                    {c.tipo === 'texto' && <input className="input input--celda" value={String(f[c.k] ?? '')} onChange={(e) => onCambiar(f.id, c.k, e.target.value)} aria-label={c.t} />}
                    {c.tipo === 'numero' && <EntradaNumero value={(f[c.k] as number | null) ?? null} onChange={(x) => onCambiar(f.id, c.k, x)} unidad={c.unidad} />}
                    {c.tipo === 'select' && (
                      <select className="input input--celda" value={String(f[c.k] ?? '')} onChange={(e) => onCambiar(f.id, c.k, e.target.value)} aria-label={c.t}>
                        <option value="">—</option>
                        {c.opciones?.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                      </select>
                    )}
                  </td>
                ))}
                <td data-l="Estado">
                  <button className={`interruptor ${f.activo ? 'on' : ''}`} onClick={() => onCambiar(f.id, 'activo', !f.activo)} title={f.activo ? 'Archivar (deja de aparecer en listas)' : 'Reactivar'}>
                    {f.activo ? 'Activo' : 'Archivado'}
                  </button>
                </td>
                <td className="acciones">
                  <button className="icono-btn icono-btn--peligro" aria-label="Eliminar" title="Eliminar" onClick={() => {
                    const u = usos(f.id);
                    setConf(u > 0
                      ? { titulo: 'Registro en uso', confirmar: 'Archivar', mensaje: <>Este registro se usa en {u} viaje(s). Para no perder la referencia en el historial, se recomienda <strong>archivarlo</strong>: dejará de aparecer en las listas pero los viajes conservarán su nombre.</>, accion: () => onCambiar(f.id, 'activo', false) }
                      : { titulo: `Eliminar ${nombre}`, confirmar: 'Eliminar', peligro: true, mensaje: '¿Eliminar este registro del catálogo?', accion: () => onEliminar(f.id) });
                  }}><Icono n="basura" size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Boton icono="mas" onClick={onAgregar}>Agregar {nombre}</Boton>
      <Confirmacion c={conf} onCerrar={() => setConf(null)} />
    </>
  );
}

function ListaChips({ titulo, valores, onCambiar, ayuda }: { titulo: string; valores: string[]; onCambiar: (v: string[]) => void; ayuda?: string }) {
  const [nuevo, setNuevo] = useState('');
  const agregar = () => {
    const t = nuevo.trim();
    if (t && !valores.includes(t)) onCambiar([...valores, t]);
    setNuevo('');
  };
  return (
    <div className="lista-chips">
      <h3>{titulo}</h3>
      {ayuda && <p className="nota">{ayuda}</p>}
      <div className="lista-chips__items">
        {valores.map((v) => (
          <span key={v} className="chip-editable">
            {v}
            <button aria-label={`Quitar ${v}`} onClick={() => onCambiar(valores.filter((x) => x !== v))}><Icono n="cerrar" size={12} /></button>
          </span>
        ))}
      </div>
      <div className="lista-chips__alta">
        <input className="input input--sm" value={nuevo} placeholder="Nueva opción" onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} />
        <Boton tam="sm" icono="mas" onClick={agregar}>Agregar</Boton>
      </div>
    </div>
  );
}

export function VistaCatalogos() {
  const { cat, actualizarCatalogos, ws, modo } = useApp();
  const [p, setP] = useState<Pestana>('granjas');
  const usos = (campo: keyof typeof ws.viajes[number]['config']) => (id: string) => ws.viajes.filter((v) => v.config[campo] === id).length;

  function editor<K extends 'granjas' | 'rutas' | 'unidades' | 'choferes' | 'configuraciones'>(k: K, cols: Col[], nuevo: () => Catalogos[K][number], nombre: string, campoUso: keyof typeof ws.viajes[number]['config']) {
    return (
      <TablaEditable
        nombre={nombre}
        filas={cat[k] as unknown as Fila[]}
        cols={cols}
        usos={usos(campoUso)}
        onCambiar={(id, campo, v) => actualizarCatalogos((c) => ({ ...c, [k]: (c[k] as unknown as Fila[]).map((x) => (x.id === id ? { ...x, [campo]: v } : x)) }))}
        onAgregar={() => actualizarCatalogos((c) => ({ ...c, [k]: [...(c[k] as unknown as Fila[]), nuevo()] }))}
        onEliminar={(id) => actualizarCatalogos((c) => ({ ...c, [k]: (c[k] as unknown as Fila[]).filter((x) => x.id !== id) }))}
      />
    );
  }

  const pestanas: { valor: Pestana; texto: string }[] = [
    { valor: 'granjas', texto: `Granjas (${cat.granjas.length})` }, { valor: 'rutas', texto: `Rutas (${cat.rutas.length})` },
    { valor: 'unidades', texto: `Unidades (${cat.unidades.length})` }, { valor: 'choferes', texto: `Choferes (${cat.choferes.length})` },
    { valor: 'configuraciones', texto: 'Configuraciones' }, { valor: 'listas', texto: 'Listas de opciones' }, { valor: 'eventos', texto: `Incidencias y paradas (${cat.tiposEvento.length})` }, { valor: 'referencias', texto: 'Referencias y límites' },
  ];

  return (
    <div className="pagina">
      <header className="pagina__cab">
        <div>
          <h1>Catálogos {modo === 'demo' && <span className="etiqueta-demo">demostración</span>}</h1>
          <p>Todos los catálogos y valores operativos son editables. {modo === 'demo' ? 'Estos catálogos son ficticios y no afectan los datos reales.' : 'Los catálogos reales inician vacíos, salvo las configuraciones de tráiler indicadas.'}</p>
        </div>
      </header>
      <div className="pestanas"><Segmentado value={p} onChange={setP} opciones={pestanas} /></div>
      <section className="tarjeta">
        {p === 'granjas' && editor('granjas', [
          { k: 'nombre', t: 'Nombre', tipo: 'texto', ancho: 200 },
          { k: 'ubicacion', t: 'Ubicación', tipo: 'texto', ancho: 160 },
          { k: 'procedimientoBio', t: 'Procedimiento de bioseguridad habitual', tipo: 'select', opciones: cat.procedimientosBio.map((x) => ({ valor: x, texto: x })), ancho: 200 },
          { k: 'notas', t: 'Notas', tipo: 'texto', ancho: 160 },
        ], () => ({ id: uid(), nombre: '', ubicacion: '', procedimientoBio: '', notas: '', activo: true }), 'granja', 'granjaId')}
        {p === 'rutas' && (
          <>
            {editor('rutas', [
              { k: 'nombre', t: 'Nombre de la ruta', tipo: 'texto', ancho: 200 },
              { k: 'granjaId', t: 'Granja', tipo: 'select', opciones: cat.granjas.map((g) => ({ valor: g.id, texto: g.nombre })), ancho: 160 },
              { k: 'km', t: 'Km (ida)', tipo: 'numero', unidad: 'km', ancho: 110 },
              { k: 'kmTerraceria', t: 'Km de terracería', tipo: 'numero', unidad: 'km', ancho: 110 },
              { k: 'notas', t: 'Notas', tipo: 'texto', ancho: 160 },
            ], () => ({ id: uid(), nombre: '', granjaId: '', km: null, kmTerraceria: null, notas: '', activo: true }), 'ruta', 'rutaId')}
            <p className="nota">Los km de terracería permiten calcular una cota teórica de tiempo a 80 km/h en carretera y 35 km/h en terracería. Es una referencia de control, no un objetivo.</p>
          </>
        )}
        {p === 'unidades' && editor('unidades', [
          { k: 'numero', t: 'Número de unidad', tipo: 'texto', ancho: 120 },
          { k: 'tipoUnidad', t: 'Tipo', tipo: 'select', opciones: [...new Set(['Full', 'Tractocamión', ...cat.configuraciones.map((c) => c.tipoUnidad)])].map((t) => ({ valor: t, texto: t })), ancho: 130 },
          { k: 'configuracionId', t: 'Configuración habitual', tipo: 'select', opciones: cat.configuraciones.map((c) => ({ valor: c.id, texto: c.nombre })), ancho: 200 },
          { k: 'capacidadTanque', t: 'Tanque', tipo: 'numero', unidad: 'L', ancho: 100 },
          { k: 'rendimientoRef', t: 'Rend. de referencia', tipo: 'numero', unidad: 'km/L', ancho: 110 },
          { k: 'tomaFuerza', t: 'Toma de fuerza', tipo: 'select', opciones: [{ valor: 'Diésel', texto: 'Diésel' }, { valor: 'Eléctrica', texto: 'Eléctrica' }], ancho: 110 },
          { k: 'notas', t: 'Notas', tipo: 'texto', ancho: 140 },
        ], () => ({ id: uid(), numero: '', tipoUnidad: '', configuracionId: '', capacidadTanque: null, rendimientoRef: null, tomaFuerza: '' as const, notas: '', activo: true }), 'unidad', 'unidadId')}
        {p === 'unidades' && <p className="nota">El rendimiento de referencia es opcional y sólo se usa para estimaciones, que siempre se marcan como tales.</p>}
        {p === 'choferes' && editor('choferes', [
          { k: 'nombre', t: 'Nombre', tipo: 'texto', ancho: 220 },
          { k: 'notas', t: 'Notas', tipo: 'texto', ancho: 220 },
        ], () => ({ id: uid(), nombre: '', notas: '', activo: true }), 'chofer', 'choferId')}
        {p === 'configuraciones' && (
          <>
            <Aviso>Capacidades nominales: no deben interpretarse como carga legal disponible. Si se confirma que hay diferencias entre unidades, crea configuraciones adicionales.</Aviso>
            {editor('configuraciones', [
              { k: 'nombre', t: 'Nombre', tipo: 'texto', ancho: 220 },
              { k: 'tipoUnidad', t: 'Tipo de unidad', tipo: 'texto', ancho: 120 },
              { k: 'numTolvas', t: 'Tolvas', tipo: 'numero', ancho: 80 },
              { k: 'tipoTolva', t: 'Tipo de tolva', tipo: 'texto', ancho: 150 },
              { k: 'capacidadPorTolva', t: 'Cap. por tolva', tipo: 'numero', unidad: 't', ancho: 100 },
              { k: 'capacidadNominal', t: 'Cap. nominal total', tipo: 'numero', unidad: 't', ancho: 100 },
              { k: 'compartimentosPorTolva', t: 'Compartimentos por tolva', tipo: 'numero', ancho: 100 },
              { k: 'notas', t: 'Notas', tipo: 'texto', ancho: 180 },
            ], () => ({ id: uid(), nombre: '', tipoUnidad: '', numTolvas: null, tipoTolva: '', capacidadPorTolva: null, capacidadNominal: null, compartimentosPorTolva: null, notas: '', activo: true }), 'configuración', 'configuracionId')}
          </>
        )}
        {p === 'listas' && (
          <div className="rejilla-2">
            <ListaChips titulo="Tipos de alimento" valores={cat.tiposAlimento} onCambiar={(v) => actualizarCatalogos((c) => ({ ...c, tiposAlimento: v }))} />
            <ListaChips titulo="Tipos de mantenimiento" valores={cat.tiposMantenimiento} onCambiar={(v) => actualizarCatalogos((c) => ({ ...c, tiposMantenimiento: v }))} />
            <ListaChips titulo="Procedimientos de bioseguridad" valores={cat.procedimientosBio} onCambiar={(v) => actualizarCatalogos((c) => ({ ...c, procedimientosBio: v }))} />
            <ListaChips titulo="Métodos de medición de combustible" valores={cat.metodosMedicion} onCambiar={(v) => actualizarCatalogos((c) => ({ ...c, metodosMedicion: v }))} />
          </div>
        )}
        {p === 'eventos' && <TiposEvento />}
        {p === 'referencias' && (
          <>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Límites operativos de velocidad</h3>
            <p className="nota">Restricciones configurables, no objetivos. Si una velocidad registrada o calculada las supera, la herramienta muestra un aviso para revisar el dato.</p>
            <div className="rejilla-campos" style={{ maxWidth: 520, marginBottom: 22 }}>
              <div className="campo"><span className="campo__label">Carretera</span><EntradaNumero value={cat.limitesVelocidad.carretera} unidad="km/h" onChange={(x) => actualizarCatalogos((c) => ({ ...c, limitesVelocidad: { ...c.limitesVelocidad, carretera: x } }))} /></div>
              <div className="campo"><span className="campo__label">Acceso de terracería a granjas</span><EntradaNumero value={cat.limitesVelocidad.terraceria} unidad="km/h" onChange={(x) => actualizarCatalogos((c) => ({ ...c, limitesVelocidad: { ...c.limitesVelocidad, terraceria: x } }))} /></div>
            </div>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Tiempos de referencia por actividad</h3>
            <p className="nota">Tiempos de referencia opcionales por actividad. Si una duración registrada los supera, el mapa marca un <b>posible retraso</b> para revisar. Déjalos vacíos si no hay un estándar acordado; la herramienta no los inventa.</p>
            <div className="tabla-envoltura">
              <table className="tabla tabla--compacta">
                <thead><tr><th>Paso</th><th>Actividad</th><th>Tipo</th><th style={{ minWidth: 140 }}>Referencia</th></tr></thead>
                <tbody>
                  {SEGMENTOS_LISTA.map((s) => (
                    <tr key={s.id}>
                      <td>{NODOS[s.nodo].paso}</td>
                      <td>{s.label}</td>
                      <td className="muted">{s.categoria === 'espera' ? 'Espera' : s.categoria === 'traslado' ? 'Traslado' : 'Operación'}</td>
                      <td><EntradaNumero value={cat.tiemposReferencia[s.id] ?? null} unidad="min" onChange={(x) => actualizarCatalogos((c) => ({ ...c, tiemposReferencia: { ...c.tiemposReferencia, [s.id]: x } }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const CLASES: ClaseEvento[] = ['necesaria', 'operativa', 'demora', 'falla', 'otra'];

function TiposEvento() {
  const { cat, actualizarCatalogos, ws } = useApp();
  const [nuevo, setNuevo] = useState('');
  const [clase, setClase] = useState<ClaseEvento>('demora');
  const set = (lista: TipoEvento[]) => actualizarCatalogos((c) => ({ ...c, tiposEvento: lista }));
  const usos = (n: string) => ws.viajes.reduce((t, v) => t + v.eventos.filter((e) => e.tipo === n).length, 0);
  return (
    <>
      <p className="nota">Categorías para el registro de incidencias y paradas. La clase define cómo se analiza el tiempo: las paradas <b>necesarias</b> u <b>operativas</b> no se cuentan como incidencias ni como tiempo improductivo.</p>
      <div className="tabla-envoltura">
        <table className="tabla tabla--editable">
          <thead><tr><th style={{ minWidth: 220 }}>Tipo de evento</th><th style={{ minWidth: 170 }}>Clase</th><th>Descripción de la clase</th><th className="num">Usos</th><th aria-label="Acciones" /></tr></thead>
          <tbody>
            {cat.tiposEvento.map((t, i) => (
              <tr key={i}>
                <td><input className="input input--celda" value={t.nombre} aria-label="Nombre del tipo" onChange={(e) => set(cat.tiposEvento.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} disabled={usos(t.nombre) > 0} title={usos(t.nombre) > 0 ? 'En uso: no se puede renombrar para no perder la referencia' : undefined} /></td>
                <td>
                  <select className="input input--celda" value={t.clase} aria-label="Clase" onChange={(e) => set(cat.tiposEvento.map((x, j) => (j === i ? { ...x, clase: e.target.value as ClaseEvento } : x)))}>
                    {CLASES.map((c) => <option key={c} value={c}>{ETIQUETA_CLASE[c]}</option>)}
                  </select>
                </td>
                <td className="muted" style={{ fontSize: 12.5 }}>{DESCRIPCION_CLASE[t.clase]}</td>
                <td className="num">{usos(t.nombre)}</td>
                <td className="acciones">
                  <button className="icono-btn icono-btn--peligro" aria-label="Eliminar tipo" disabled={usos(t.nombre) > 0} title={usos(t.nombre) > 0 ? 'En uso en viajes registrados' : 'Eliminar'} onClick={() => set(cat.tiposEvento.filter((_, j) => j !== i))}><Icono n="basura" size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lista-chips__alta" style={{ maxWidth: 560, marginTop: 12 }}>
        <input className="input input--sm" value={nuevo} placeholder="Nuevo tipo de evento" onChange={(e) => setNuevo(e.target.value)} />
        <select className="input input--sm" style={{ width: 170 }} value={clase} onChange={(e) => setClase(e.target.value as ClaseEvento)} aria-label="Clase del nuevo tipo">
          {CLASES.map((c) => <option key={c} value={c}>{ETIQUETA_CLASE[c]}</option>)}
        </select>
        <Boton tam="sm" icono="mas" disabled={!nuevo.trim() || cat.tiposEvento.some((t) => t.nombre.toLowerCase() === nuevo.trim().toLowerCase())}
          onClick={() => { set([...cat.tiposEvento, { nombre: nuevo.trim(), clase }]); setNuevo(''); }}>Agregar</Boton>
      </div>
    </>
  );
}
