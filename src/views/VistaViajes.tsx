// Historial y gestión de viajes, y revisión de la integridad de los datos.

import { useState } from 'react';
import { useApp } from '../state/Contexto';
import { nombres } from '../lib/nombres';
import { ETIQUETA_CALIDAD, type EstadoCalidad } from '../lib/calidad';
import { fmtDur, fmtFecha } from '../lib/tiempo';
import { BarraFiltros, useFiltrados } from '../components/BarraFiltros';
import { GruposCalidad } from '../components/PanelRevision';
import { Camion, tipoCamionDe } from '../components/Ilustraciones';
import { Boton, Confirmacion, Vacio, type ConfirmacionPendiente } from '../components/ui';
import { Icono } from '../components/Iconos';

type Pestana = 'lista' | 'revision';

export function VistaViajes() {
  const { ws, cat, setActivo, irA, setPanel, crearViaje, duplicarPlantilla, eliminarViaje, avisar, compararIds, setCompararIds, activoId, setSubAnalisis, filtros, setFiltros } = useApp();
  const [pest, setPest] = useState<Pestana>('lista');
  const [busca, setBusca] = useState('');
  const [conf, setConf] = useState<ConfirmacionPendiente | null>(null);
  const { calcs, total } = useFiltrados();
  const lista = calcs
    .map((c) => ({ ...c, n: nombres(c.viaje, cat) }))
    .filter(({ viaje, n }) => {
      if (!busca.trim()) return true;
      const t = busca.toLowerCase();
      return [viaje.config.folio, n.unidad, n.granja, n.ruta, n.chofer, viaje.config.observaciones].some((x) => x?.toLowerCase().includes(t));
    })
    .sort((a, b) => (b.viaje.config.fecha + b.viaje.creado).localeCompare(a.viaje.config.fecha + a.viaje.creado));
  const folio = (id: string | null) => ws.viajes.find((v) => v.id === id)?.config.folio;
  const conteo: Record<EstadoCalidad, number> = { incompleto: 0, listo: 0, validado: 0 };
  for (const c of calcs) conteo[c.q.estado]++;

  const abrir = (id: string, panel?: 'config' | 'revision') => {
    setActivo(id);
    irA('mapa');
    if (panel) setTimeout(() => setPanel({ tipo: panel }), 0);
  };
  const toggleComparar = (id: string) =>
    setCompararIds(compararIds.includes(id) ? compararIds.filter((x) => x !== id) : compararIds.length >= 6 ? compararIds : [...compararIds, id]);

  return (
    <div className="pagina">
      <header className="pagina__cab">
        <div>
          <div className="pagina__eyebrow">Registro</div>
          <h1>Viajes</h1>
          <p>Consulta, continúa, duplica o compara viajes. Los incompletos se conservan para continuarlos después.</p>
        </div>
        <div className="fila-botones">
          {compararIds.length > 0 && <Boton icono="comparar" onClick={() => { setSubAnalisis('comparador'); irA('analisis'); }}>Comparar seleccionados ({compararIds.length})</Boton>}
          <Boton variante="primario" icono="mas" onClick={() => { crearViaje(); irA('mapa'); setTimeout(() => setPanel({ tipo: 'config' }), 0); }}>Nuevo viaje</Boton>
        </div>
      </header>
      <div className="subnav" role="tablist">
        <button role="tab" aria-selected={pest === 'lista'} className={pest === 'lista' ? 'activo' : ''} onClick={() => setPest('lista')}><Icono n="lista" size={16} />Todos los viajes <span className="nav__badge">{total}</span></button>
        <button role="tab" aria-selected={pest === 'revision'} className={pest === 'revision' ? 'activo' : ''} onClick={() => setPest('revision')}><Icono n="validar" size={16} />Revisión de datos <span className="nav__badge">{conteo.incompleto + conteo.listo}</span></button>
      </div>
      <BarraFiltros total={total} filtrados={calcs.length} />

      {pest === 'revision' && (
        <>
          <div className="kpis">
            {(['incompleto', 'listo', 'validado'] as const).map((k) => (
              <button key={k} type="button" className="kpi" style={{ border: 0, textAlign: 'left', boxShadow: filtros.calidad === k ? 'inset 0 -3px 0 var(--g600)' : undefined }}
                onClick={() => setFiltros({ ...filtros, calidad: filtros.calidad === k ? '' : k })}>
                <span className="kpi__cab"><span className={`calidad-badge calidad-badge--${k}`} style={{ padding: '1px 8px' }}><i />{ETIQUETA_CALIDAD[k]}</span></span>
                <span className="kpi__valor">{conteo[k]}</span>
                <span className="kpi__base">{k === 'incompleto' ? 'faltan datos requeridos o hay datos por corregir' : k === 'listo' ? 'completos, pendientes de validar' : 'revisados y confiables para reportar'}</span>
              </button>
            ))}
          </div>
          {calcs.filter((c) => c.q.estado !== 'validado').length === 0 ? (
            <Vacio icono="validar" titulo="No hay viajes pendientes de revisión">Todos los viajes filtrados están validados.</Vacio>
          ) : calcs.filter((c) => c.q.estado !== 'validado').sort((a, b) => b.q.faltantes - a.q.faltantes).map((c) => (
            <section key={c.viaje.id} className="tarjeta">
              <header className="tarjeta__cab">
                <h2>
                  <button className="enlace-btn enlace-btn--fuerte" onClick={() => abrir(c.viaje.id)}>{c.viaje.config.folio}</button>
                  <span className="muted" style={{ fontWeight: 500, fontSize: 13 }}>{fmtFecha(c.viaje.config.fecha)} · {nombres(c.viaje, cat).unidad || 'sin unidad'} · {nombres(c.viaje, cat).granja || 'sin granja'}</span>
                </h2>
                <div className="fila-botones">
                  <span className={`calidad-badge calidad-badge--${c.q.estado}`}><i />{ETIQUETA_CALIDAD[c.q.estado]}{c.q.faltantes ? ` · faltan ${c.q.faltantes}` : ''}</span>
                  <Boton tam="sm" variante={c.q.estado === 'listo' ? 'primario' : 'secundario'} icono={c.q.estado === 'listo' ? 'validar' : 'editar'} onClick={() => abrir(c.viaje.id, 'revision')}>
                    {c.q.estado === 'listo' ? 'Revisar y validar' : 'Completar'}
                  </Boton>
                </div>
              </header>
              {c.q.errores.length > 0 && <p className="nota" style={{ color: 'var(--red)' }}>{c.q.errores.join(' · ')}</p>}
              <GruposCalidad q={c.q} onIr={(nodo) => { setActivo(c.viaje.id); irA('mapa'); setTimeout(() => setPanel({ tipo: 'nodo', id: nodo }), 0); }} />
            </section>
          ))}
        </>
      )}

      {pest === 'lista' && (
        <>
          <div className="buscador">
            <Icono n="buscar" size={16} />
            <input className="input" placeholder="Buscar por folio, unidad, granja, ruta o chofer…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {lista.length === 0 ? (
            <div style={{ marginTop: 14 }}><Vacio icono="lista" titulo={ws.viajes.length ? 'Ningún viaje coincide con los filtros' : 'Todavía no hay viajes'} /></div>
          ) : (
            <div className="tabla-envoltura">
              <table className="tabla tabla--viajes">
                <thead>
                  <tr>
                    <th title="Seleccionar para comparar (máx. 6)"><Icono n="comparar" size={14} /></th>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Unidad</th>
                    <th>Destino y ruta</th>
                    <th>Integridad</th>
                    <th>Avance</th>
                    <th className="num">Ciclo</th>
                    <th className="num">Espera</th>
                    <th className="num">Incid. / paradas</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map(({ viaje, r, q, n }) => (
                    <tr key={viaje.id} className={viaje.id === activoId ? 'activo' : ''}>
                      <td data-l="Comparar">
                        <input type="checkbox" checked={compararIds.includes(viaje.id)} onChange={() => toggleComparar(viaje.id)} aria-label={`Comparar ${viaje.config.folio}`}
                          disabled={!compararIds.includes(viaje.id) && compararIds.length >= 6} />
                      </td>
                      <td data-l="Folio">
                        <button className="enlace-btn enlace-btn--fuerte" onClick={() => abrir(viaje.id)}>{viaje.config.folio || 'Sin folio'}</button>
                        {viaje.plantillaDe && <div className="nota-tabla">Plantilla de {folio(viaje.plantillaDe) ?? 'viaje eliminado'}</div>}
                        {viaje.cicloAnterior && <div className="nota-tabla">Sigue a {folio(viaje.cicloAnterior) ?? 'viaje eliminado'}</div>}
                      </td>
                      <td data-l="Fecha">{fmtFecha(viaje.config.fecha)}</td>
                      <td data-l="Unidad">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <Camion tipo={tipoCamionDe(viaje.config, cat)} ancho={54} />
                          <span>{n.unidad || '—'}<div className="nota-tabla">{n.chofer}</div></span>
                        </span>
                      </td>
                      <td data-l="Destino">{n.granja || '—'}<div className="nota-tabla">{n.ruta}</div></td>
                      <td data-l="Integridad">
                        <button type="button" className={`calidad-badge calidad-badge--${q.estado}`} onClick={() => abrir(viaje.id, 'revision')} title={q.faltantes ? `Faltan ${q.faltantes} dato(s)` : undefined}>
                          <i />{ETIQUETA_CALIDAD[q.estado]}
                        </button>
                      </td>
                      <td data-l="Avance">
                        <span className="num" style={{ fontSize: 12.5 }}>{r.avance.completos}/{r.avance.aplicables} act.</span>
                        <div className="progreso"><div style={{ width: `${Math.round(r.completitud.pct * 100)}%` }} /></div>
                      </td>
                      <td data-l="Ciclo" className="num">{r.total != null ? fmtDur(r.total, { corto: true }) : <span className="pend">Pendiente</span>}</td>
                      <td data-l="Espera" className="num">{r.espera != null ? fmtDur(r.espera, { corto: true }) : <span className="pend">—</span>}</td>
                      <td data-l="Incid. / paradas" className="num">{r.eventos.incidencias || r.eventos.paradas ? `${r.eventos.incidencias} / ${r.eventos.paradas}` : '—'}</td>
                      <td className="acciones">
                        <button className="icono-btn" title="Abrir en el mapa" aria-label="Abrir en el mapa" onClick={() => abrir(viaje.id)}><Icono n="mapa" size={16} /></button>
                        <button className="icono-btn" title="Editar configuración" aria-label="Editar configuración" onClick={() => abrir(viaje.id, 'config')}><Icono n="editar" size={16} /></button>
                        <button className="icono-btn" title="Duplicar como plantilla (sólo configuración)" aria-label="Duplicar como plantilla" onClick={() => {
                          duplicarPlantilla(viaje.id);
                          avisar('Plantilla creada: se copió la configuración, sin tiempos, cantidades ni eventos.');
                        }}><Icono n="copiar" size={16} /></button>
                        <button className="icono-btn icono-btn--peligro" title="Eliminar" aria-label="Eliminar viaje" onClick={() => setConf({
                          titulo: 'Eliminar viaje', confirmar: 'Eliminar', peligro: true,
                          mensaje: <>¿Eliminar el viaje <strong>{viaje.config.folio}</strong> y todos sus registros? No se puede deshacer, salvo con un respaldo JSON.</>,
                          accion: () => { eliminarViaje(viaje.id); avisar('Viaje eliminado.'); },
                        })}><Icono n="basura" size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <Confirmacion c={conf} onCerrar={() => setConf(null)} />
    </div>
  );
}
