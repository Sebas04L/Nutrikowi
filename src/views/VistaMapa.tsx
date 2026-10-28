// Pantalla principal: centro de control del viaje + recorrido ilustrado del proceso.

import { useMemo } from 'react';
import { useApp } from '../state/Contexto';
import { calcularViaje } from '../lib/calculos';
import { calidadViaje, ETIQUETA_CALIDAD } from '../lib/calidad';
import { nombres } from '../lib/nombres';
import { ETIQUETA_CATEGORIA, ORDEN_CATEGORIAS } from '../lib/proceso';
import { fmtDur, fmtFechaCorta } from '../lib/tiempo';
import { MapaRecorrido, Leyenda, datosMapaViaje, type ContextoEscena } from '../components/MapaRecorrido';
import { Camion, RecorridoIlustracion, tipoCamionDe } from '../components/Ilustraciones';
import { PanelNodo } from '../components/PanelNodo';
import { PanelConfig } from '../components/PanelConfig';
import { PanelCombustible } from '../components/PanelCombustible';
import { PanelEventos } from '../components/PanelEventos';
import { PanelRevision } from '../components/PanelRevision';
import { Aviso, BarraProporcion, Boton } from '../components/ui';
import { Icono } from '../components/Iconos';

function Anillo({ frac, tam = 46 }: { frac: number; tam?: number }) {
  const r = tam / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden="true">
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={5} />
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--g600)" strokeWidth={5} strokeLinecap="round"
        strokeDasharray={`${Math.max(0, Math.min(1, frac)) * c} ${c}`} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
    </svg>
  );
}

export function VistaMapa() {
  const { ws, cat, activoId, setActivo, panel, setPanel, crearViaje, actualizarViaje, modo, setModo } = useApp();
  const viaje = ws.viajes.find((v) => v.id === activoId) ?? null;
  const r = useMemo(() => (viaje ? calcularViaje(viaje, cat) : null), [viaje, cat]);
  const q = useMemo(() => (viaje && r ? calidadViaje(viaje, r) : null), [viaje, r]);
  const mapa = useMemo(() => (viaje && r ? datosMapaViaje(viaje, r) : null), [viaje, r]);
  const ordenados = useMemo(() => [...ws.viajes].sort((a, b) => (b.config.fecha + b.creado).localeCompare(a.config.fecha + a.creado)), [ws.viajes]);

  if (!viaje || !r || !mapa || !q) {
    return (
      <div className="pagina">
        <div className="vacio">
          <div className="vacio__ilus"><RecorridoIlustracion /></div>
          <h3>Registra el primer recorrido</h3>
          <p>Configura un viaje —unidad, granja, ruta y tráiler— y registra cada actividad directamente sobre el recorrido: planta, carretera, granja y regreso.</p>
          <div className="fila-botones">
            <Boton variante="primario" icono="mas" onClick={() => { crearViaje(); setPanel({ tipo: 'config' }); }}>Crear el primer viaje</Boton>
            {modo === 'real' && <Boton variante="fantasma" icono="ojo" onClick={() => setModo('demo')}>Explorar la demostración</Boton>}
          </div>
        </div>
      </div>
    );
  }

  const n = nombres(viaje, cat);
  const ruta = cat.rutas.find((x) => x.id === viaje.config.rutaId);
  const granja = cat.granjas.find((g) => g.id === viaje.config.granjaId);
  const unidad = cat.unidades.find((u) => u.id === viaje.config.unidadId);
  const tipoCamion = tipoCamionDe(viaje.config, cat);
  const contexto: ContextoEscena = {
    granja: n.granja, procedimientoBio: granja?.procedimientoBio ? `Bioseguridad: ${granja.procedimientoBio.toLowerCase()}` : '',
    ruta: n.ruta, km: ruta?.km ?? viaje.config.kmEstimados, kmTerraceria: ruta?.kmTerraceria ?? null, limites: cat.limitesVelocidad,
    tipoCamion, compartimentos: viaje.config.compartimentosPorTolva, unidad: unidad?.numero ?? '',
  };
  const enCurso = r.total == null;
  const real = r.real;
  const etapas = [
    { k: 'A', l: 'Planta', v: r.etapas.planta, c: 'var(--g800)' },
    { k: 'ida', l: 'Ida', v: r.etapas.ida, c: '#4f6b62' },
    { k: 'B', l: 'Granja', v: r.etapas.granja, c: 'var(--g600)' },
    { k: 'reg', l: 'Regreso', v: r.etapas.regreso, c: '#7c8c86' },
  ];
  const sumaEtapas = etapas.reduce((t, e) => t + (e.v ?? 0), 0);

  return (
    <div className="pagina pagina--mapa">
      <section className="centro">
        <div className="centro__viaje">
          <div className="centro__eyebrow">
            <span>Viaje {modo === 'demo' && <span className="etiqueta-demo" style={{ marginLeft: 6 }}>ficticio</span>}</span>
            <span>{ordenados.length} registrado{ordenados.length === 1 ? '' : 's'}</span>
          </div>
          <select aria-label="Viaje activo" className="input input--fuerte" value={viaje.id} onChange={(e) => { setActivo(e.target.value); setPanel(null); }}>
            {ordenados.map((v) => {
              const nn = nombres(v, cat);
              return <option key={v.id} value={v.id}>{v.config.folio || 'Sin folio'} · {fmtFechaCorta(v.config.fecha)}{nn.unidad ? ` · ${nn.unidad}` : ''}{nn.granja ? ` · ${nn.granja}` : ''}</option>;
            })}
          </select>
          <div className="centro__unidad">
            <div className="centro__camion"><Camion tipo={tipoCamion} compartimentos={viaje.config.compartimentosPorTolva} titulo={n.configuracion || 'Unidad'} /></div>
            <div className="centro__meta">
              <span><b>{n.unidad || 'Sin unidad'}</b>{viaje.config.tipoUnidad ? ` · ${viaje.config.tipoUnidad}` : ''}</span>
              <span title={n.configuracion}>{n.configuracion || 'Configuración sin definir'}</span>
              <span>{n.granja || 'Granja sin definir'}{n.ruta ? ` · ${n.ruta}` : ''}</span>
              <span>{viaje.config.tipoAlimento || 'Alimento sin definir'}{n.chofer ? ` · ${n.chofer}` : ''}</span>
            </div>
          </div>
        </div>

        <div className="centro__ciclo">
          <div className="centro__eyebrow"><span>{enCurso ? 'Ciclo en curso · tiempo acumulado' : 'Duración total del ciclo'}</span></div>
          <div className="centro__total">
            <span className={`centro__valor ${enCurso && r.acumulado == null ? 'pend' : ''}`}>
              {enCurso ? (r.acumulado != null ? fmtDur(r.acumulado, { corto: true }) : 'Sin registros') : fmtDur(r.total, { corto: true })}
            </span>
            <span className="centro__sub">
              {enCurso ? 'desde la llegada hasta la última hora registrada' : r.fuenteTotal === 'suma_etapas' ? 'suma de etapas' : 'llegada → regreso a planta'}
            </span>
          </div>
          <div className="etapas-barra" role="img" aria-label="Duración por etapa">
            {sumaEtapas > 0 ? etapas.filter((e) => e.v).map((e) => (
              <div key={e.k} className={`etapas-barra__p etapas-barra__p--${e.k}`} style={{ flexGrow: e.v! }} title={`${e.l}: ${fmtDur(e.v)}`}>
                {e.v! / sumaEtapas > 0.12 ? e.l : ''}
              </div>
            )) : <div className="etapas-barra__p etapas-barra__p--vacio">Las etapas aparecerán al registrar horarios</div>}
          </div>
          <div className="etapas-ley">
            {etapas.map((e) => (
              <div key={e.k}>
                <span><i style={{ background: e.c }} />{e.l}</span>
                <b className={e.v == null ? 'pend' : ''}>{e.v != null ? fmtDur(e.v, { corto: true }) : 'Pendiente'}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="centro__estado">
          <div className="anillo">
            <Anillo frac={r.avance.aplicables ? r.avance.completos / r.avance.aplicables : 0} />
            <div className="anillo__txt">
              <b>{r.avance.completos} de {r.avance.aplicables}</b>
              actividades completas · {Math.round(r.completitud.pct * 100)} % de datos
            </div>
          </div>
          <div className="indicadores-mini">
            <div className="ind-mini ind-mini--espera"><span><Icono n="espera" size={13} />Espera</span><b className={r.espera == null && r.imputado.espera === 0 ? 'pend' : ''}>{r.espera != null ? fmtDur(r.espera, { corto: true }) : r.imputado.espera > 0 ? `≥ ${fmtDur(r.imputado.espera, { corto: true })}` : '—'}</b></div>
            <div className="ind-mini ind-mini--inc"><span><Icono n="alerta" size={13} />Incidencias</span><b>{r.eventos.incidencias}</b></div>
            <div className="ind-mini"><span><Icono n="bandera" size={13} />Paradas</span><b>{r.eventos.paradas}</b></div>
            <div className="ind-mini"><span><Icono n="combustible" size={13} />Rendimiento</span>
              <b className={r.combustible.rendimiento == null ? 'pend' : ''}>
                {r.combustible.rendimiento != null ? `${r.combustible.rendimiento.toFixed(2)} km/L` : r.combustible.rendimientoEstimado != null ? <>≈ {r.combustible.rendimientoEstimado.toFixed(2)}<span className="est-marca">EST</span></> : '—'}
              </b>
            </div>
          </div>
          <button type="button" className={`calidad-badge calidad-badge--${q.estado}`} onClick={() => setPanel({ tipo: 'revision' })} title="Ver integridad de los datos">
            <i />{ETIQUETA_CALIDAD[q.estado]}{q.faltantes > 0 && ` · faltan ${q.faltantes}`}
          </button>
        </div>

        <div className="centro__acciones">
          <Boton icono="ajustes" onClick={() => setPanel({ tipo: 'config' })}>Configuración</Boton>
          <Boton icono="combustible" onClick={() => setPanel({ tipo: 'combustible' })}>Combustible y costos</Boton>
          <Boton icono="alerta" onClick={() => setPanel({ tipo: 'eventos' })}>Incidencias y paradas{r.eventos.total ? ` (${r.eventos.total})` : ''}</Boton>
          <Boton icono="check" onClick={() => setPanel({ tipo: 'revision' })}>Revisión de datos</Boton>
          <span className="espaciador" />
          <Boton variante="primario" icono="mas" onClick={() => { crearViaje(); setPanel({ tipo: 'config' }); }}>Nuevo viaje</Boton>
        </div>
      </section>

      {modo === 'demo' && <Aviso tono="ambar" icono="matraz">Estás viendo un viaje de demostración con datos ficticios.</Aviso>}
      {r.alertas.length > 0 && (
        <details className="alertas">
          <summary><Icono n="alerta" size={15} /> {r.alertas.length} aviso(s) de calidad de datos en este viaje</summary>
          <ul>{r.alertas.map((a, i) => <li key={i}><button className="enlace-btn" onClick={() => setPanel(a.nodo ? { tipo: 'nodo', id: a.nodo } : { tipo: 'eventos' })}>{a.texto}</button></li>)}</ul>
        </details>
      )}

      <section className="escena-tarjeta">
        <header className="escena-tarjeta__cab">
          <h2><Icono n="mapa" size={18} />Recorrido del ciclo logístico</h2>
          <p>Selecciona una actividad, decisión o tramo para registrar o consultar sus datos.</p>
        </header>
        <MapaRecorrido
          datos={mapa.datos}
          decisiones={viaje.v}
          seleccionado={panel?.tipo === 'nodo' ? panel.id : null}
          siguiente={mapa.siguiente}
          onSelect={(id) => setPanel({ tipo: 'nodo', id })}
          onDecidir={(campo, valor) => actualizarViaje(viaje.id, (vj) => {
            const v = { ...vj.v };
            if (valor === null) delete v[campo];
            else v[campo] = valor;
            return { ...vj, v };
          })}
          claveAnim={viaje.id}
          contexto={contexto}
        />
        <Leyenda />
      </section>

      <section className="reparto">
        <div className="reparto__cab">
          <span>Composición del tiempo real {r.rangoReal === 'parcial' ? '(tramo registrado)' : ''} · sin duplicar actividades simultáneas</span>
          {r.solape > 0 && <span className="reparto__solape" title="Minutos en que dos actividades ocurrieron al mismo tiempo; se cuentan una sola vez">Solape detectado: {fmtDur(r.solape)}</span>}
        </div>
        <BarraProporcion alto={12} partes={real ? ORDEN_CATEGORIAS.map((k) => ({ valor: real[k], clase: `cat-${k}`, titulo: `${ETIQUETA_CATEGORIA[k]}: ${fmtDur(real[k])}` })) : []} />
        <div className="reparto__ley">
          {real ? ORDEN_CATEGORIAS.filter((k) => real[k] > 0 || k === 'operativo' || k === 'espera').map((k) => (
            <span key={k}><i className={`cat-${k}`} />{ETIQUETA_CATEGORIA[k]} <b>{fmtDur(real[k])}</b></span>
          )) : <span className="pend">Se mostrará al registrar horarios.</span>}
        </div>
      </section>

      {panel?.tipo === 'nodo' && <PanelNodo nodoId={panel.id} viaje={viaje} r={r} />}
      {panel?.tipo === 'config' && <PanelConfig viaje={viaje} />}
      {panel?.tipo === 'combustible' && <PanelCombustible viaje={viaje} r={r} />}
      {panel?.tipo === 'eventos' && <PanelEventos viaje={viaje} r={r} />}
      {panel?.tipo === 'revision' && <PanelRevision viaje={viaje} r={r} q={q} />}
    </div>
  );
}
