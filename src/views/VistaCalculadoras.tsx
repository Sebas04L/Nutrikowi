// Calculadoras rápidas de combustible, rendimiento, mantenimiento, ralentí y descarga.
// La lógica está en lib/calculadoras.ts; aquí sólo la captura y la presentación.

import { useEffect, useState, type ReactNode } from 'react';
import type { ValorCampo } from '../types';
import { useApp } from '../state/Contexto';
import {
  calcComparador, calcCostoCombustible, calcDescarga, calcLitrosPorTon, calcLitrosViaje, calcMantenimiento, calcRalenti, calcRendimiento,
  ETIQUETAS_MANT, type N, type Resultado,
} from '../lib/calculadoras';
import { nombres } from '../lib/nombres';
import { CAMPOS } from '../lib/proceso';
import { fmtFechaCorta } from '../lib/tiempo';
import { Aviso, Boton, Campo, EntradaNumero, Modal, Segmentado, Selector } from '../components/ui';
import { Icono } from '../components/Iconos';

const CLAVE = 'nutrikowi.cicloLogistico.calculadoras';

type Estado = Record<string, N | string | boolean>;

function leer(): Estado {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '{}') ?? {};
  } catch {
    return {};
  }
}

const fmt = (x: N, dec = 2) => (x == null ? '—' : x.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
const mxn = (x: N) => (x == null ? '—' : x.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }));
const signo = (x: N, f: (v: N) => string) => (x == null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${f(Math.abs(x))}`);

async function copiarTexto(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

interface Dato {
  label: string;
  valor: string;
  sec?: boolean;
  sub?: string;
}

interface EnvioViaje {
  campos: { id: string; valor: ValorCampo; estimado?: boolean }[];
  nota?: string;
}

function Calc({ letra, titulo, desc, campos, r, datos, formula, explica, onLimpiar, textoCopia, estimado, envio }: {
  letra: string; titulo: string; desc: string; campos: ReactNode; r: Resultado; datos: Dato[]; formula: ReactNode; explica?: string;
  onLimpiar: () => void; textoCopia: string; estimado?: boolean; envio?: EnvioViaje | null;
}) {
  const { avisar } = useApp();
  const [enviar, setEnviar] = useState(false);
  const hayRes = datos.some((d) => d.valor !== '—') && r.errores.length === 0;
  return (
    <article className="calc" id={`calc-${letra}`}>
      <header className="calc__cab">
        <span className="calc__letra">{letra}</span>
        <div>
          <h3>{titulo}</h3>
          <p>{desc}</p>
        </div>
      </header>
      <div className="calc__campos">{campos}</div>
      {hayRes ? (
        <div className={`calc__res ${estimado ? 'calc__res--est' : ''}`} aria-live="polite">
          {datos.map((d) => (
            <div key={d.label} className={`calc__dato ${d.sec ? 'calc__dato--sec' : ''}`}>
              <span>{d.label}</span>
              <b>{d.valor}</b>
              {d.sub && <small>{d.sub}</small>}
            </div>
          ))}
        </div>
      ) : (
        <div className="calc__res calc__res--vacio">
          {r.errores.length ? 'Corrige los datos marcados para ver el resultado.' : r.faltan.length ? `Falta: ${r.faltan.join(', ')}.` : 'Captura los datos para calcular.'}
        </div>
      )}
      <div className="calc__formula"><Icono n="info" size={14} /><span><code>{formula}</code>{explica && <> {explica}</>}</span></div>
      <div className="calc__mensajes">
        {r.errores.map((e) => <Aviso key={e} tono="rojo">{e}</Aviso>)}
        {r.errores.length === 0 && r.avisos.map((a) => <Aviso key={a} tono="ambar">{a}</Aviso>)}
      </div>
      <div className="calc__espacio" />
      <footer className="calc__acciones">
        <Boton tam="sm" variante="fantasma" icono="cerrar" onClick={onLimpiar}>Limpiar</Boton>
        <span className="espaciador" />
        <Boton tam="sm" icono="copiar" disabled={!hayRes} onClick={async () => avisar((await copiarTexto(textoCopia)) ? 'Resultado copiado.' : 'No se pudo copiar en este navegador.', 'ok')}>Copiar</Boton>
        {envio !== undefined && <Boton tam="sm" icono="enviar" disabled={!hayRes || !envio} onClick={() => setEnviar(true)}>Enviar a un viaje</Boton>}
      </footer>
      {envio && <ModalEnvio abierto={enviar} onCerrar={() => setEnviar(false)} envio={envio} titulo={titulo} />}
    </article>
  );
}

function ModalEnvio({ abierto, onCerrar, envio, titulo }: { abierto: boolean; onCerrar: () => void; envio: EnvioViaje; titulo: string }) {
  const { ws, cat, activoId, actualizarViaje, avisar, setActivo, irA, setPanel } = useApp();
  const [id, setId] = useState(activoId ?? '');
  useEffect(() => {
    if (abierto) setId(activoId ?? ws.viajes[0]?.id ?? '');
  }, [abierto, activoId, ws.viajes]);
  const viaje = ws.viajes.find((v) => v.id === id);
  const ordenados = [...ws.viajes].sort((a, b) => (b.config.fecha + b.creado).localeCompare(a.config.fecha + a.creado));
  const aplicar = () => {
    if (!viaje) return;
    actualizarViaje(viaje.id, (vj) => {
      const v = { ...vj.v };
      const estimados = { ...vj.estimados };
      for (const c of envio.campos) {
        v[c.id] = c.valor;
        if (c.estimado) estimados[c.id] = true;
        else delete estimados[c.id];
      }
      return { ...vj, v, estimados };
    });
    avisar(`Datos de “${titulo}” enviados al viaje ${viaje.config.folio}.`);
    onCerrar();
    setActivo(viaje.id);
    irA('mapa');
    setTimeout(() => setPanel({ tipo: 'combustible' }), 0);
  };
  return (
    <Modal abierto={abierto} titulo="Enviar resultado a un viaje" onCerrar={onCerrar} ancho={560}
      acciones={<><Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton><Boton variante="primario" icono="enviar" disabled={!viaje} onClick={aplicar}>Guardar en el viaje</Boton></>}>
      {ws.viajes.length === 0 ? <p className="nota">No hay viajes en este espacio.</p> : (
        <>
          <Campo label="Viaje de destino">
            <Selector value={id} onChange={setId} vacio={null} opciones={ordenados.map((v) => {
              const n = nombres(v, cat);
              return { valor: v.id, texto: `${v.config.folio} · ${fmtFechaCorta(v.config.fecha)}${n.unidad ? ` · ${n.unidad}` : ''}${n.granja ? ` · ${n.granja}` : ''}` };
            })} />
          </Campo>
          <table className="comp-tabla" style={{ marginTop: 14 }}>
            <thead><tr><th>Dato del viaje</th><th>Valor actual</th><th>Nuevo valor</th></tr></thead>
            <tbody>
              {envio.campos.map((c) => (
                <tr key={c.id}>
                  <td>{CAMPOS[c.id]?.label ?? c.id}</td>
                  <td>{viaje?.v[c.id] != null ? String(viaje.v[c.id]) : '—'}</td>
                  <td><b>{String(c.valor)}</b>{c.estimado && <span className="est-marca">EST</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {envio.nota && <Aviso tono="ambar">{envio.nota}</Aviso>}
          <p className="nota">Los valores actuales del viaje se reemplazarán. Si el viaje estaba validado, deberá revisarse de nuevo.</p>
        </>
      )}
    </Modal>
  );
}

export function VistaCalculadoras() {
  const [e, setE] = useState<Estado>(leer);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(e));
    } catch {
      /* conveniencia: si no se puede guardar, no pasa nada */
    }
  }, [e]);
  const n = (k: string): N => (typeof e[k] === 'number' ? (e[k] as number) : null);
  const s = <T extends string>(k: string, def: T): T => (typeof e[k] === 'string' ? (e[k] as T) : def);
  const set = (k: string) => (v: N | string | boolean | null) => setE((x) => ({ ...x, [k]: v as N }));
  const limpiar = (pref: string) => () => setE((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(pref))));
  // Se invoca como función (no como componente) para que React conserve el foco al escribir.
  const num = ({ k, label, unidad, ayuda }: { k: string; label: string; unidad?: string; ayuda?: string }) => (
    <Campo key={k} label={label} ayuda={ayuda} htmlFor={`c-${k}`}>
      <EntradaNumero id={`c-${k}`} value={n(k)} onChange={set(k)} unidad={unidad} min={-1e12} />
    </Campo>
  );

  // A
  const rA = calcRendimiento(n('a.km'), n('a.l'));
  // B
  const medidoB = s<'medido' | 'estimado'>('b.rendOrigen', 'estimado') === 'medido';
  const rB = calcLitrosViaje(n('b.km'), n('b.rend'), medidoB);
  // C
  const baseC = s<'entregadas' | 'cargadas'>('c.base', 'entregadas');
  const rC = calcLitrosPorTon(n('c.l'), n('c.t'), baseC);
  // D
  const tipoD = s<'consumidos' | 'cargados'>('d.tipo', 'consumidos');
  const rD = calcCostoCombustible(n('d.l'), n('d.p'), tipoD, n('d.km'), n('d.t'));
  // E
  const compE = e['e.comparables'] === true;
  const rE = calcComparador({ km: n('e.kmA'), litros: n('e.lA'), ton: n('e.tA'), precio: n('e.pA') }, { km: n('e.kmB'), litros: n('e.lB'), ton: n('e.tB'), precio: n('e.pB') }, compE);
  // F
  const rF = calcMantenimiento({ manoObra: n('f.mo'), refacciones: n('f.ref'), aceites: n('f.ace'), servicios: n('f.ser'), otros: n('f.otr'), km: n('f.km') });
  // G
  const frecG = s<'unica' | 'diaria'>('g.frec', 'diaria');
  const medidoG = s<'medido' | 'estimado'>('g.origen', 'estimado') === 'medido';
  const minG = (n('g.h') != null || n('g.m') != null) ? (n('g.h') ?? 0) * 60 + (n('g.m') ?? 0) : null;
  const rG = calcRalenti(minG, n('g.lph'), n('g.p'), frecG, n('g.dias'), medidoG);
  // H
  const tdfH = s<'Diésel' | 'Eléctrica' | ''>('h.tdf', '');
  const rH = calcDescarga(n('h.min'), tdfH, n('h.lmed'), n('h.lph'), n('h.p'), n('h.t'));

  const v = rE.valores;
  return (
    <div className="pagina">
      <header className="pagina__cab">
        <div>
          <div className="pagina__eyebrow">Caja de herramientas</div>
          <h1>Calculadoras</h1>
          <p>Cálculos rápidos sin registrar un viaje completo. Cada resultado muestra su fórmula; los datos faltantes no se toman como cero y las estimaciones se identifican.</p>
        </div>
      </header>

      <div className="calc-rejilla">
        <Calc letra="A" titulo="Rendimiento de combustible" desc="Kilómetros por litro y litros por cada 100 km."
          campos={<>{num({ k: "a.km", label: "Kilómetros recorridos", unidad: "km" })}{num({ k: "a.l", label: "Litros consumidos", unidad: "L" })}</>}
          r={rA} datos={[{ label: 'Rendimiento', valor: rA.valores.kmL != null ? `${fmt(rA.valores.kmL)} km/L` : '—' }, { label: 'Consumo', valor: rA.valores.l100 != null ? `${fmt(rA.valores.l100, 1)} L/100 km` : '—', sec: true }]}
          formula="km ÷ litros  ·  litros ÷ km × 100" explica="Usa litros consumidos, no litros cargados."
          onLimpiar={limpiar('a.')} textoCopia={`Rendimiento: ${fmt(rA.valores.kmL)} km/L (${fmt(n('a.km'), 1)} km ÷ ${fmt(n('a.l'), 1)} L) · ${fmt(rA.valores.l100, 1)} L/100 km`}
          envio={rA.valores.kmL != null ? { campos: [{ id: 'comb.consumoTotal', valor: n('a.l') }], nota: 'Se guardará como consumo total MEDIDO del ciclo. Los kilómetros se capturan por tramo (ida y regreso) en el viaje.' } : null} />

        <Calc letra="B" titulo="Litros consumidos por viaje" desc="Estimación a partir de distancia y rendimiento."
          campos={<>
            {num({ k: "b.km", label: "Kilómetros recorridos", unidad: "km" })}
            {num({ k: "b.rend", label: "Rendimiento", unidad: "km/L" })}
            <Campo label="Origen del rendimiento" ancho="completo">
              <Segmentado value={medidoB ? 'medido' : 'estimado'} onChange={set('b.rendOrigen')} opciones={[{ valor: 'medido', texto: 'Medido en esta unidad' }, { valor: 'estimado', texto: 'Estimado / referencia' }]} />
            </Campo>
          </>}
          r={rB} estimado datos={[{ label: 'Litros estimados', valor: rB.valores.litros != null ? `${fmt(rB.valores.litros, 1)} L` : '—', sub: 'estimación' }]}
          formula="litros = km ÷ rendimiento" onLimpiar={limpiar('b.')}
          textoCopia={`Litros estimados: ${fmt(rB.valores.litros, 1)} L (${fmt(n('b.km'), 1)} km ÷ ${fmt(n('b.rend'))} km/L, rendimiento ${medidoB ? 'medido' : 'estimado'})`}
          envio={rB.valores.litros != null ? { campos: [{ id: 'comb.consumoEstimado', valor: Math.round(rB.valores.litros * 10) / 10, estimado: true }], nota: 'Se guarda como consumo ESTIMADO; nunca se presenta como consumo real.' } : null} />

        <Calc letra="C" titulo="Litros por tonelada" desc="Consumo por tonelada transportada o entregada."
          campos={<>
            {num({ k: "c.l", label: "Litros consumidos", unidad: "L" })}
            {num({ k: 'c.t', label: `Toneladas ${baseC}`, unidad: 't' })}
            <Campo label="Base del cálculo" ancho="completo">
              <Segmentado value={baseC} onChange={set('c.base')} opciones={[{ valor: 'entregadas', texto: 'Toneladas entregadas' }, { valor: 'cargadas', texto: 'Toneladas cargadas' }]} />
            </Campo>
          </>}
          r={rC} datos={[{ label: `Litros por tonelada ${baseC}`, valor: rC.valores.lt != null ? `${fmt(rC.valores.lt, 2)} L/t` : '—' }]}
          formula={`litros ÷ toneladas ${baseC}`} onLimpiar={limpiar('c.')}
          textoCopia={`${fmt(rC.valores.lt)} L/t (${fmt(n('c.l'), 1)} L ÷ ${fmt(n('c.t'))} t ${baseC})`} />

        <Calc letra="D" titulo="Costo de combustible" desc="Costo total y, para litros consumidos, costo por km y por tonelada."
          campos={<>
            <Campo label="Los litros son…" ancho="completo">
              <Segmentado value={tipoD} onChange={set('d.tipo')} opciones={[{ valor: 'consumidos', texto: 'Consumidos' }, { valor: 'cargados', texto: 'Cargados (abastecimiento)' }]} />
            </Campo>
            {num({ k: 'd.l', label: `Litros ${tipoD}`, unidad: 'L' })}
            {num({ k: "d.p", label: "Precio por litro", unidad: "MXN/L" })}
            {tipoD === 'consumidos' && <>{num({ k: "d.km", label: "Kilómetros (opcional)", unidad: "km" })}{num({ k: "d.t", label: "Toneladas (opcional)", unidad: "t" })}</>}
          </>}
          r={rD} datos={[
            { label: tipoD === 'consumidos' ? 'Costo del combustible consumido' : 'Costo del combustible cargado', valor: mxn(rD.valores.costo) },
            ...(rD.valores.costoKm != null ? [{ label: 'Costo por km', valor: mxn(rD.valores.costoKm), sec: true }] : []),
            ...(rD.valores.costoTon != null ? [{ label: 'Costo por tonelada', valor: mxn(rD.valores.costoTon), sec: true }] : []),
          ]}
          formula="litros × precio  ·  costo ÷ km  ·  costo ÷ toneladas" onLimpiar={limpiar('d.')}
          textoCopia={`Costo ${tipoD === 'consumidos' ? 'del combustible consumido' : 'del combustible cargado'}: ${mxn(rD.valores.costo)}${rD.valores.costoKm != null ? ` · ${mxn(rD.valores.costoKm)}/km` : ''}${rD.valores.costoTon != null ? ` · ${mxn(rD.valores.costoTon)}/t` : ''}`}
          envio={rD.valores.costo != null ? { campos: [{ id: 'comb.precioRef', valor: n('d.p') }], nota: 'Se guarda el precio por litro como precio de referencia para valuar el consumo del viaje (sólo se usa si el viaje no registró precio de carga).' } : null} />

        <Calc letra="E" titulo="Comparador de rendimiento" desc="Dos viajes o dos unidades, lado a lado."
          campos={<>
            {(['A', 'B'] as const).map((l) => (
              <div key={l} className="calc-lado">
                <h4>{l === 'A' ? 'Viaje o unidad A' : 'Viaje o unidad B'}</h4>
                {num({ k: `e.km${l}`, label: 'Kilómetros', unidad: 'km' })}
                {num({ k: `e.l${l}`, label: 'Litros consumidos', unidad: 'L' })}
                {num({ k: `e.t${l}`, label: 'Toneladas entregadas', unidad: 't' })}
                {num({ k: `e.p${l}`, label: 'Precio por litro', unidad: 'MXN/L' })}
              </div>
            ))}
            <Campo label="¿Son comparables? (misma ruta, carga y condiciones)" ancho="completo">
              <Segmentado value={compE ? 'si' : 'no'} onChange={(x) => set('e.comparables')(x === 'si')} opciones={[{ valor: 'si', texto: 'Sí, confirmado' }, { valor: 'no', texto: 'No / no confirmado' }]} />
            </Campo>
          </>}
          r={rE} datos={[
            { label: 'Diferencia (B − A)', valor: v.difRend != null ? `${signo(v.difRend, (x) => fmt(x))} km/L` : '—' },
            { label: 'Diferencia porcentual', valor: v.difPct != null ? `${signo(v.difPct, (x) => fmt(x, 1))} %` : '—', sec: true },
            ...(v.difLt != null ? [{ label: 'Diferencia L/t', valor: signo(v.difLt, (x) => fmt(x)), sec: true }] : []),
            ...(v.difCosto != null ? [{ label: 'Diferencia de costo', valor: signo(v.difCosto, (x) => mxn(x)), sec: true }] : []),
          ]}
          formula="rendimiento = km ÷ L  ·  diferencia % = (B − A) ÷ A × 100"
          explica={compE ? 'Las diferencias describen los datos capturados.' : 'Sin confirmar condiciones comparables no se declara cuál es mejor.'}
          onLimpiar={limpiar('e.')}
          textoCopia={`A: ${fmt(v.rendA)} km/L · B: ${fmt(v.rendB)} km/L · Diferencia ${signo(v.difRend, (x) => fmt(x))} km/L (${signo(v.difPct, (x) => fmt(x, 1))} %)${compE ? '' : ' · condiciones no confirmadas como comparables'}`} />

        <Calc letra="F" titulo="Costo por mantenimiento" desc="Costo total del servicio y costo por kilómetro."
          campos={<>
            {num({ k: "f.mo", label: ETIQUETAS_MANT.manoObra, unidad: "MXN" })}
            {num({ k: "f.ref", label: ETIQUETAS_MANT.refacciones, unidad: "MXN" })}
            {num({ k: "f.ace", label: ETIQUETAS_MANT.aceites, unidad: "MXN" })}
            {num({ k: "f.ser", label: ETIQUETAS_MANT.servicios, unidad: "MXN" })}
            {num({ k: "f.otr", label: ETIQUETAS_MANT.otros, unidad: "MXN" })}
            {num({ k: "f.km", label: "Km desde el último mantenimiento", unidad: "km" })}
          </>}
          r={rF} datos={[{ label: 'Costo total', valor: mxn(rF.valores.total) }, ...(rF.valores.costoKm != null ? [{ label: 'Costo por km', valor: mxn(rF.valores.costoKm), sec: true }] : [])]}
          formula="suma de conceptos  ·  total ÷ km del periodo" onLimpiar={limpiar('f.')}
          textoCopia={`Mantenimiento: ${mxn(rF.valores.total)}${rF.valores.costoKm != null ? ` · ${mxn(rF.valores.costoKm)}/km (${fmt(n('f.km'), 0)} km)` : ''}`}
          envio={rF.valores.total != null ? {
            campos: [
              { id: 'mant.aplica', valor: true },
              ...(n('f.mo') != null ? [{ id: 'mant.costoMO', valor: n('f.mo') }] : []),
              { id: 'mant.costoMat', valor: (n('f.ref') ?? 0) + (n('f.ace') ?? 0) + (n('f.ser') ?? 0) + (n('f.otr') ?? 0) },
            ],
            nota: 'En el viaje, refacciones, aceites, servicios externos y otros costos se suman como "materiales y refacciones".',
          } : null} />

        <Calc letra="G" titulo="Tiempo de ralentí" desc="Consumo y costo con el motor encendido sin desplazamiento."
          campos={<>
            {num({ k: "g.h", label: "Horas en ralentí", unidad: "h" })}
            {num({ k: "g.m", label: "Minutos en ralentí", unidad: "min" })}
            {num({ k: "g.lph", label: "Consumo del motor en ralentí", unidad: "L/h", ayuda: "Dato medido o estimado por el usuario; no hay valor predeterminado." })}
            <Campo label="Origen del consumo">
              <Segmentado value={medidoG ? 'medido' : 'estimado'} onChange={set('g.origen')} opciones={[{ valor: 'medido', texto: 'Medido' }, { valor: 'estimado', texto: 'Estimado' }]} />
            </Campo>
            {num({ k: "g.p", label: "Precio por litro", unidad: "MXN/L" })}
            <Campo label="Frecuencia">
              <Segmentado value={frecG} onChange={set('g.frec')} opciones={[{ valor: 'unica', texto: 'Una vez' }, { valor: 'diaria', texto: 'Diaria' }]} />
            </Campo>
            {frecG === 'diaria' && num({ k: 'g.dias', label: 'Días de operación al mes', unidad: 'días' })}
          </>}
          r={rG} estimado={!medidoG} datos={[
            { label: 'Litros en ralentí', valor: rG.valores.litros != null ? `${fmt(rG.valores.litros, 1)} L` : '—' },
            ...(rG.valores.costo != null ? [{ label: frecG === 'diaria' ? 'Costo diario' : 'Costo', valor: mxn(rG.valores.costo), sec: true }] : []),
            ...(rG.valores.costoMes != null ? [{ label: 'Costo mensual', valor: mxn(rG.valores.costoMes), sec: true, sub: `${fmt(rG.valores.litrosMes, 0)} L al mes` }] : []),
          ]}
          formula="litros = horas × L/h  ·  costo = litros × precio" onLimpiar={limpiar('g.')}
          textoCopia={`Ralentí: ${fmt(rG.valores.litros, 1)} L · ${mxn(rG.valores.costo)}${rG.valores.costoMes != null ? ` · ${mxn(rG.valores.costoMes)} al mes` : ''} (consumo ${medidoG ? 'medido' : 'estimado'})`} />

        <Calc letra="H" titulo="Consumo durante la descarga" desc="Diésel de la toma de fuerza durante la descarga."
          campos={<>
            <Campo label="Toma de fuerza accionada por" ancho="completo">
              <Segmentado value={tdfH || null} onChange={set('h.tdf')} opciones={[{ valor: 'Diésel', texto: 'Diésel' }, { valor: 'Eléctrica', texto: 'Sistema eléctrico' }]} />
            </Campo>
            {num({ k: "h.min", label: "Duración de la descarga", unidad: "min" })}
            {num({ k: "h.t", label: "Toneladas descargadas", unidad: "t" })}
            {num({ k: "h.lmed", label: "Litros medidos en la descarga", unidad: "L", ayuda: "Si se midieron, tienen prioridad." })}
            {num({ k: "h.lph", label: "o consumo por hora", unidad: "L/h", ayuda: "Dato del usuario; se reporta como estimación." })}
            {num({ k: "h.p", label: "Precio por litro", unidad: "MXN/L" })}
          </>}
          r={rH} estimado={n('h.lmed') == null} datos={[
            { label: n('h.lmed') != null ? 'Litros en la descarga' : 'Litros estimados', valor: rH.valores.litros != null ? `${fmt(rH.valores.litros, 1)} L` : '—' },
            ...(rH.valores.costo != null ? [{ label: 'Costo por descarga', valor: mxn(rH.valores.costo), sec: true }] : []),
            ...(rH.valores.costoTon != null ? [{ label: 'Costo por tonelada', valor: mxn(rH.valores.costoTon), sec: true }] : []),
          ]}
          formula="litros = minutos ÷ 60 × L/h (o medido)  ·  costo ÷ toneladas" onLimpiar={limpiar('h.')}
          textoCopia={`Descarga (TdF ${tdfH || 'sin definir'}): ${fmt(rH.valores.litros, 1)} L · ${mxn(rH.valores.costo)} · ${mxn(rH.valores.costoTon)}/t`}
          envio={rH.valores.litros != null && tdfH ? {
            campos: [{ id: 'desc.ptoTipo', valor: tdfH }, { id: 'desc.ptoLitros', valor: Math.round(rH.valores.litros * 10) / 10, estimado: n('h.lmed') == null }],
            nota: n('h.lmed') == null ? 'Los litros se guardan marcados como ESTIMADOS.' : undefined,
          } : null} />
      </div>

      {(v.rendA != null || v.rendB != null) && (
        <section className="tarjeta">
          <header className="tarjeta__cab"><h2><Icono n="comparar" size={18} />Detalle del comparador (E)</h2></header>
          <table className="comp-tabla">
            <thead><tr><th>Indicador</th><th>A</th><th>B</th><th>B − A</th></tr></thead>
            <tbody>
              <tr><td>Rendimiento (km/L)</td><td>{fmt(v.rendA)}</td><td>{fmt(v.rendB)}</td><td>{signo(v.difRend, (x) => fmt(x))}</td></tr>
              <tr><td>Litros por tonelada</td><td>{fmt(v.ltA)}</td><td>{fmt(v.ltB)}</td><td>{signo(v.difLt, (x) => fmt(x))}</td></tr>
              <tr><td>Costo del combustible</td><td>{mxn(v.costoA)}</td><td>{mxn(v.costoB)}</td><td>{signo(v.difCosto, (x) => mxn(x))}</td></tr>
              <tr><td>Costo por km</td><td>{mxn(v.costoKmA)}</td><td>{mxn(v.costoKmB)}</td><td>—</td></tr>
              <tr><td>Costo por tonelada</td><td>{mxn(v.costoTonA)}</td><td>{mxn(v.costoTonB)}</td><td>—</td></tr>
            </tbody>
          </table>
          {!compE && <Aviso tono="ambar">Condiciones no confirmadas como comparables: la tabla describe los datos, no indica qué unidad es mejor.</Aviso>}
        </section>
      )}
    </div>
  );
}
