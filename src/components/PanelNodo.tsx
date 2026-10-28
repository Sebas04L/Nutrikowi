// Panel lateral de una actividad del mapa: captura, cálculos e incidencias.

import { useEffect, useRef, type ReactNode } from 'react';
import type { Catalogos, Clasificacion, Evento, Viaje } from '../types';
import { NODOS, NODOS_LISTA, ETAPAS, CAMPOS, SEGMENTOS } from '../lib/proceso';
import { numero, type ResultadoViaje } from '../lib/calculos';
import { fmtDur, parseDT } from '../lib/tiempo';
import { useApp } from '../state/Contexto';
import { CampoViaje, EditorSegmento, useEdicionViaje } from './Editores';
import { ListaEventos } from './EditorEventos';
import { Aviso, Boton, EntradaTexto, Metrica, Pastilla, Seccion, Segmentado, SiNo } from './ui';
import { Icono } from './Iconos';
import { nombres } from '../lib/nombres';

export function Cajon({ titulo, sub, icono, onCerrar, children, pie, cabExtra, tono }: {
  titulo: ReactNode; sub?: ReactNode; icono?: string; onCerrar: () => void; children: ReactNode; pie?: ReactNode; cabExtra?: ReactNode; tono?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  useEffect(() => {
    // Foco inicial sólo al abrir; no se roba el foco en cada actualización.
    ref.current?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.modal-fondo')) cerrar.current();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <>
      <div className="cajon-fondo" onClick={onCerrar} />
      <aside className={`cajon ${tono ? `cajon--${tono}` : ''}`} role="dialog" aria-modal="false" aria-label={typeof titulo === 'string' ? titulo : undefined}>
        <header className="cajon__cab">
          {icono && <span className="cajon__icono"><Icono n={icono} size={20} /></span>}
          <div className="cajon__titulos">
            {sub && <div className="cajon__sub">{sub}</div>}
            <h2>{titulo}</h2>
          </div>
          <button ref={ref} className="icono-btn" onClick={onCerrar} aria-label="Cerrar panel"><Icono n="cerrar" /></button>
        </header>
        {cabExtra && <div className="cajon__extra">{cabExtra}</div>}
        <div className="cajon__cuerpo">{children}</div>
        {pie && <footer className="cajon__pie">{pie}</footer>}
      </aside>
    </>
  );
}

const ESTADO_TXT: Record<string, { t: string; tono: 'verde' | 'ambar' | 'rojo' | 'gris' | 'azul' }> = {
  completo: { t: 'Completada', tono: 'verde' },
  parcial: { t: 'En proceso', tono: 'ambar' },
  pendiente: { t: 'Pendiente', tono: 'gris' },
  no_aplica: { t: 'No aplica', tono: 'gris' },
  por_decidir: { t: 'Depende de una decisión', tono: 'azul' },
  error: { t: 'Revisar datos', tono: 'rojo' },
};

export function PanelNodo({ nodoId, viaje, r }: { nodoId: string; viaje: Viaje; r: ResultadoViaje }) {
  const { actualizarViaje, setPanel, cat, siguienteCiclo, avisar } = useApp();
  const n = NODOS[nodoId];
  const rn = r.nodos[nodoId];
  const idx = NODOS_LISTA.findIndex((x) => x.id === nodoId);
  const ant = NODOS_LISTA[idx - 1];
  const sig = NODOS_LISTA[idx + 1];

  const { fijar, estimar } = useEdicionViaje(viaje);

  const nEventos = viaje.eventos.filter((e) => e.nodo === nodoId).length;
  const setEventos = (lista: Evento[]) => actualizarViaje(viaje.id, (vj) => ({ ...vj, eventos: lista }));
  const clasif = viaje.clasif[nodoId] ?? { estado: null, nota: '' };
  const setClasif = (c: { estado: Clasificacion | null; nota: string }) =>
    actualizarViaje(viaje.id, (vj) => {
      const cl = { ...vj.clasif };
      if (!c.estado && !c.nota) delete cl[nodoId];
      else cl[nodoId] = c;
      return { ...vj, clasif: cl };
    });

  const e = ESTADO_TXT[rn.estado];
  const condicion = n.aplicaSi ? CAMPOS[n.aplicaSi] : null;
  const decisionNodo = n.aplicaSi ? NODOS_LISTA.find((x) => x.decide === n.aplicaSi) : null;
  const camposVisibles = n.campos.filter((c) => c !== n.decide);
  const mostrarCaptura = rn.aplica !== false;

  return (
    <Cajon
      key={nodoId}
      icono={n.icono}
      tono={n.tipo}
      sub={<>Etapa {n.etapa} · {ETAPAS[n.etapa].titulo} · {n.paso === '↺' ? 'Cierre' : `Paso ${n.paso}`}</>}
      titulo={n.titulo}
      onCerrar={() => setPanel(null)}
      cabExtra={
        <div className="cajon__estado">
          <Pastilla tono={e.tono}>{e.t}</Pastilla>
          {rn.min != null && n.tipo !== 'decision' && <Pastilla tono="neutro" icono="reloj">{fmtDur(rn.min)}</Pastilla>}
          {rn.acumulado != null && <Pastilla tono="neutro" title="Tiempo desde la llegada a planta">t+{fmtDur(rn.acumulado, { corto: true })}</Pastilla>}
          {rn.posibleRetraso && <Pastilla tono="ambar" icono="bandera">Posible retraso</Pastilla>}
        </div>
      }
      pie={
        <>
          <Boton variante="fantasma" icono="izq" disabled={!ant} onClick={() => ant && setPanel({ tipo: 'nodo', id: ant.id })}>Anterior</Boton>
          <span className="cajon__guardado"><Icono n="disco" size={14} /> Se guarda automáticamente</span>
          <Boton variante="primario" disabled={!sig} onClick={() => sig && setPanel({ tipo: 'nodo', id: sig.id })}>Siguiente <Icono n="der" size={16} /></Boton>
        </>
      }
    >
      <p className="cajon__desc">{n.descripcion}</p>
      {n.notas?.map((t) => <Aviso key={t}>{t}</Aviso>)}

      {n.decide && (
        <Seccion titulo="Decisión" icono="decision">
          <div className="decision-grande">
            <span>{CAMPOS[n.decide].label}</span>
            <SiNo value={viaje.v[n.decide] === true ? true : viaje.v[n.decide] === false ? false : null} onChange={(x) => fijar(n.decide!, x)} />
          </div>
          {CAMPOS[n.decide].ayuda && <p className="nota">{CAMPOS[n.decide].ayuda}</p>}
          {viaje.v[n.decide] == null && <p className="nota">Mientras no se defina, la actividad condicional queda “según decisión” y no bloquea el resto del flujo.</p>}
        </Seccion>
      )}

      {condicion && (
        <div className={`condicion condicion--${rn.aplica === true ? 'si' : rn.aplica === false ? 'no' : 'nd'}`}>
          <div>
            <strong>Actividad condicional.</strong> Aplica sólo si “{decisionNodo?.titulo ?? condicion.label}” es Sí.
          </div>
          <SiNo value={rn.aplica} onChange={(x) => fijar(n.aplicaSi!, x)} />
        </div>
      )}

      {mostrarCaptura && n.segmentos.length > 0 && (
        <Seccion titulo="Tiempos" icono="reloj">
          {n.segmentos.length > 1 && n.segmentos.some((s) => SEGMENTOS[s].aplicaSi) && (
            <CampoViaje id="desc.huboEspera" viaje={viaje} fijar={fijar} cat={cat} />
          )}
          {n.segmentos.map((s) => (
            <EditorSegmento key={s} segId={s} viaje={viaje} fijar={fijar} estimar={estimar} res={r.segmentos[s]} />
          ))}
          {r.segmentos[n.segmentos[0]] && n.segmentos.length > 1 && rn.min != null && (
            <p className="nota">
              Tiempo transcurrido en la actividad sin duplicar solapes: <strong>{fmtDur(rn.min)}</strong>. Suma imputada por actividad:{' '}
              {fmtDur(n.segmentos.reduce((t, s) => t + (r.segmentos[s].aplica !== false ? r.segmentos[s].min ?? 0 : 0), 0))}.
            </p>
          )}
        </Seccion>
      )}

      {mostrarCaptura && camposVisibles.filter((c) => c !== 'desc.huboEspera').length > 0 && (
        <Seccion titulo="Datos de la actividad" icono="editar">
          <div className="rejilla-campos">
            {camposVisibles.filter((c) => c !== 'desc.huboEspera').map((c) => <CampoViaje key={c} id={c} viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />)}
          </div>
        </Seccion>
      )}

      {mostrarCaptura && <Calculos nodoId={nodoId} viaje={viaje} r={r} cat={cat} />}

      {nodoId === 'cierre' && (
        <Seccion titulo="Siguiente ciclo" icono="ciclo">
          <p className="nota">Crea un viaje nuevo para la misma unidad, chofer y configuración. La hora de llegada a planta de este ciclo se usa como llegada del siguiente. Granja y ruta quedan por definir.</p>
          <Boton variante="primario" icono="ciclo" onClick={() => {
            const id = siguienteCiclo(viaje.id);
            if (id) {
              avisar('Se creó el siguiente ciclo de la unidad.');
              setPanel({ tipo: 'config' });
            }
          }}>Iniciar siguiente ciclo</Boton>
        </Seccion>
      )}

      {rn.faltantes.length > 0 && rn.aplica !== false && (
        <Aviso tono="ambar" icono="alerta">
          <strong>Datos faltantes:</strong> {rn.faltantes.join(' · ')}
        </Aviso>
      )}
      {r.alertas.filter((a) => a.nodo === nodoId && !a.texto.includes('fin es anterior')).map((a) => (
        <Aviso key={a.texto} tono="ambar">{a.texto}</Aviso>
      ))}

      {n.tipo !== 'decision' && (
        <Seccion titulo={`Incidencias y paradas (${nEventos})`} icono="alerta" extra={
          <Boton tam="sm" variante="fantasma" onClick={() => setPanel({ tipo: 'eventos' })}>Ver todas del viaje</Boton>
        }>
          <ListaEventos viaje={viaje} cat={cat} nodo={nodoId} onCambiar={setEventos} vacio="Sin incidencias ni paradas vinculadas a esta actividad." />
        </Seccion>
      )}

      {n.tipo !== 'decision' && (
        <Seccion titulo="Clasificación del tiempo" icono="analisis">
          <p className="nota">Para análisis: distingue tiempos normales, excepciones justificadas y situaciones pendientes de investigar. No es un juicio de eficiencia.</p>
          <Segmentado<Clasificacion>
            value={clasif.estado}
            onChange={(x) => setClasif({ ...clasif, estado: clasif.estado === x ? null : x })}
            opciones={[{ valor: 'normal', texto: 'Normal' }, { valor: 'excepcion', texto: 'Excepción' }, { valor: 'investigar', texto: 'Investigar' }]}
          />
          <div style={{ marginTop: 10 }}>
            <EntradaTexto multilinea value={clasif.nota} onChange={(x) => setClasif({ ...clasif, nota: x })} placeholder="Observación o hipótesis sobre este tiempo…" />
          </div>
        </Seccion>
      )}
    </Cajon>
  );
}

function Calculos({ nodoId, viaje, r, cat }: { nodoId: string; viaje: Viaje; r: ResultadoViaje; cat: Catalogos }) {
  const v = viaje.v;
  const items: ReactNode[] = [];
  const nom = nombres(viaje, cat);
  const ruta = cat.rutas.find((x) => x.id === viaje.config.rutaId);
  const { setPanel, irA } = useApp();
  switch (nodoId) {
    case 'llegada':
      if (r.segmentos.prelavado.min != null && r.segmentos.docs.min != null && r.nodos.llegada.min != null) {
        const solape = r.segmentos.prelavado.min + r.segmentos.docs.min - r.nodos.llegada.min;
        items.push(<Metrica key="s" label="Tiempo simultáneo" valor={fmtDur(Math.max(0, solape))} sub="prelavado y documentos al mismo tiempo" />);
      }
      break;
    case 'mant':
      items.push(<Metrica key="c" label="Costo total de mantenimiento" valor={r.mantenimiento.costo != null ? mxn(r.mantenimiento.costo) : r.mantenimiento.parcial != null ? `${mxn(r.mantenimiento.parcial)} (parcial)` : 'Pendiente'} sub="mano de obra + materiales" tono={r.mantenimiento.costo == null ? 'pendiente' : undefined} />);
      break;
    case 'diesel':
      items.push(<Metrica key="c" label="Costo del abastecimiento" valor={r.combustible.costoCarga != null ? mxn(r.combustible.costoCarga) : 'Pendiente'} sub="litros cargados × precio por litro" tono={r.combustible.costoCarga == null ? 'pendiente' : undefined} />);
      break;
    case 'carga': {
      const ini = parseDT(v['carga.inicio']);
      const listo = parseDT(v['carga.listo']);
      const aut = parseDT(v['carga.autorizacion']);
      if (ini != null && listo != null) items.push(<Metrica key="l" label="Alimento listo → inicio de carga" valor={fmtDur((ini - listo) / 60000)} />);
      if (ini != null && aut != null) items.push(<Metrica key="a" label="Autorización → inicio de carga" valor={fmtDur((ini - aut) / 60000)} />);
      const ton = numero(v['carga.ton']);
      if (ton != null && viaje.config.capacidadNominal) items.push(<Metrica key="c" label="Respecto a capacidad nominal" valor={`${Math.round((ton / viaje.config.capacidadNominal) * 100)} %`} sub="nominal; no equivale a carga legal" />);
      break;
    }
    case 'pesaje2': {
      const t = r.toneladas;
      items.push(<Metrica key="n" label="Toneladas netas" valor={t.netas != null ? `${t.netas.toFixed(2)} t` : 'Pendiente'} tono={t.netas == null ? 'pendiente' : undefined}
        sub={t.fuenteTara === 'tara' ? 'bruto cargado − tara' : t.fuenteTara === 'peso_vacio' ? 'bruto cargado − peso vacío (1er pesaje)' : 'requiere peso bruto y tara'} />);
      if (t.netas != null && t.cargadas != null) items.push(<Metrica key="d" label="Diferencia con toneladas cargadas" valor={`${(t.netas - t.cargadas).toFixed(2)} t`} />);
      break;
    }
    case 'salida_planta':
      items.push(<Metrica key="p" label="Tiempo total en planta" valor={r.etapas.planta != null ? fmtDur(r.etapas.planta) : 'Pendiente'} sub="llegada → salida" tono={r.etapas.planta == null ? 'pendiente' : undefined} />);
      break;
    case 'ida':
    case 'regreso': {
      const s = r.segmentos[nodoId];
      const km = numero(v[nodoId === 'ida' ? 'ida.km' : 'reg.km']);
      const lim = cat.limitesVelocidad;
      if (s.min != null && s.min > 0 && km != null) {
        const vel = km / (s.min / 60);
        items.push(<Metrica key="v" label="Velocidad promedio del trayecto" valor={`${vel.toFixed(1)} km/h`} tono={lim.carretera != null && vel > lim.carretera ? 'ambar' : undefined}
          sub={lim.carretera != null ? `dato de control · límite configurado ${lim.carretera} km/h` : 'dato de control'} />);
      }
      if (ruta?.km != null && lim.carretera && lim.terraceria) {
        const kt = ruta.kmTerraceria ?? 0;
        const minimo = ((ruta.km - kt) / lim.carretera + kt / lim.terraceria) * 60;
        items.push(<Metrica key="m" label="Tiempo mínimo teórico a los límites" valor={fmtDur(minimo)} sub={`${ruta.km} km (${kt} de terracería). Referencia, no objetivo.`} />);
      }
      items.unshift(<Metrica key="r" label="Destino y ruta" valor={nom.granja || 'Sin granja'} sub={nom.ruta || 'Sin ruta definida'} />);
      break;
    }
    case 'descarga': {
      const t = r.toneladas;
      if (t.entregadas != null && t.cargadas != null) items.push(<Metrica key="d" label="Descargadas − cargadas" valor={`${(t.entregadas - t.cargadas).toFixed(2)} t`} />);
      break;
    }
    case 'salida_granja':
      items.push(<Metrica key="g" label="Tiempo total en granja" valor={r.etapas.granja != null ? fmtDur(r.etapas.granja) : 'Pendiente'} sub="llegada → salida" tono={r.etapas.granja == null ? 'pendiente' : undefined} />);
      break;
    case 'cierre':
      items.push(
        <Metrica key="t" label="Duración total del ciclo" valor={r.total != null ? fmtDur(r.total) : 'Pendiente'} sub={r.fuenteTotal === 'suma_etapas' ? 'suma de etapas' : 'llegada → regreso a planta'} tono={r.total == null ? 'pendiente' : undefined} />,
        <Metrica key="p" label="Planta" valor={fmtDur(r.etapas.planta)} />,
        <Metrica key="i" label="Ida" valor={fmtDur(r.etapas.ida)} />,
        <Metrica key="g" label="Granja" valor={fmtDur(r.etapas.granja)} />,
        <Metrica key="r" label="Regreso" valor={fmtDur(r.etapas.regreso)} />,
      );
      break;
  }
  const conCombustible = ['diesel', 'ida', 'regreso', 'descarga'].includes(nodoId);
  const conVelocidad = nodoId === 'ida' || nodoId === 'regreso';
  if (!items.length && !conCombustible) return null;
  return (
    <Seccion titulo="Cálculos" icono="indicadores" extra={conCombustible ? <Boton tam="sm" variante="fantasma" icono="combustible" onClick={() => setPanel({ tipo: 'combustible' })}>Combustible y costos</Boton> : undefined}>
      {items.length > 0 ? <div className="rejilla-metricas">{items}</div> : <p className="nota">El consumo y su costo se calculan en el módulo de combustible.</p>}
      {conVelocidad && (
        <p className="nota">
          Para separar carretera y terracería, o registrar la velocidad máxima de telemetría, usa{' '}
          <button className="enlace-btn" onClick={() => irA('incidencias')}>Incidencias y velocidad</button>.
        </p>
      )}
    </Seccion>
  );
}

export const mxn = (x: number) => x.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
