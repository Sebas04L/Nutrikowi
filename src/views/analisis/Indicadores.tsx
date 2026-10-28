// Indicadores generales (promedios sólo con viajes que tienen el dato).

import { useMemo, useState } from 'react';
import { estad, gruposComparables, rendimientoPonderado, type Estad, type ViajeCalc } from '../../lib/analisis';
import { fmtDur } from '../../lib/tiempo';
import { useApp } from '../../state/Contexto';
import { Aviso } from '../../components/ui';
import { Icono } from '../../components/Iconos';
import { mxn, num, OrigenViajes, type ItemOrigen } from './comun';

function Kpi({ label, valor, base, nota, icono, onClick, sel }: { label: string; valor: string; base: string; nota?: string; icono: string; onClick?: () => void; sel?: boolean }) {
  const pend = valor === '—';
  return (
    <button type="button" className="kpi" onClick={onClick} style={{ border: 0, textAlign: 'left', cursor: onClick ? 'pointer' : 'default', boxShadow: sel ? 'inset 0 -3px 0 var(--g600)' : undefined }}>
      <span className="kpi__cab"><Icono n={icono} size={15} />{label}</span>
      <span className={`kpi__valor ${pend ? 'pend' : ''}`}>{pend ? 'Sin datos' : valor}</span>
      <span className="kpi__base">{base}</span>
      {nota && <span className="kpi__nota">{nota}</span>}
    </button>
  );
}

const baseN = (e: Estad, txt = 'promedio por viaje') => (e.n ? `${txt} · ${e.n} de ${e.de} viajes con dato` : `0 de ${e.de} viajes con dato`);

export function Indicadores({ calcs }: { calcs: ViajeCalc[] }) {
  const { cat } = useApp();
  const [sel, setSel] = useState<{ id: string; titulo: string; items: ItemOrigen[] } | null>(null);
  const k = useMemo(() => {
    const e = (f: (c: ViajeCalc) => number | null) => estad(calcs.map(f));
    let cSum = 0, tSum = 0, nCt = 0, lSum = 0, tlSum = 0, nLt = 0;
    for (const { r } of calcs) {
      const c = r.combustible;
      const tonOk = r.toneladas.entregadas != null && r.toneladas.entregadas > 0 && !r.toneladas.entregadasEstimadas;
      if (c.costoConsumido != null && tonOk) { cSum += c.costoConsumido; tSum += r.toneladas.entregadas!; nCt++; }
      if (c.litrosConsumidos != null && tonOk) { lSum += c.litrosConsumidos; tlSum += r.toneladas.entregadas!; nLt++; }
    }
    return {
      ciclo: e((c) => c.r.total), planta: e((c) => c.r.etapas.planta), tray: e((c) => c.r.traslado), granja: e((c) => c.r.etapas.granja),
      espera: e((c) => c.r.espera), lavado: e((c) => c.r.lavado), carga: e((c) => c.r.carga), descarga: e((c) => c.r.descarga),
      litros: e((c) => c.r.combustible.litrosConsumidos), costo: e((c) => c.r.combustible.costoConsumido), ton: e((c) => c.r.toneladas.entregadas),
      rend: rendimientoPonderado(calcs), costoTon: { v: nCt ? cSum / tSum : null, n: nCt }, lt: { v: nLt ? lSum / tlSum : null, n: nLt },
      inc: calcs.reduce((t, c) => t + c.r.eventos.incidencias, 0), par: calcs.reduce((t, c) => t + c.r.eventos.paradas, 0),
      mant: e((c) => c.r.mantenimiento.costo),
    };
  }, [calcs]);

  const drill = (id: string, titulo: string, f: (c: ViajeCalc) => string | null) =>
    setSel(sel?.id === id ? null : { id, titulo, items: calcs.map((c) => ({ calc: c, valor: f(c) })).filter((x): x is ItemOrigen => x.valor != null) });
  const dur = (f: (c: ViajeCalc) => number | null) => (c: ViajeCalc) => (f(c) != null ? fmtDur(f(c)!, { corto: true }) : null);

  const rutas = new Set(calcs.map((c) => c.viaje.config.rutaId)).size;
  const cfgs = new Set(calcs.map((c) => c.viaje.config.configuracionId)).size;
  const grupos = gruposComparables(calcs);

  const porUnidad = useMemo(() => {
    const m = new Map<string, ViajeCalc[]>();
    for (const c of calcs) m.set(c.viaje.config.unidadId || '—', [...(m.get(c.viaje.config.unidadId || '—') ?? []), c]);
    return [...m.entries()].map(([id, cs]) => {
      const medidos = cs.filter((c) => c.r.combustible.calidad === 'medido');
      const rp = rendimientoPonderado(cs);
      const costo = estad(medidos.map((c) => c.r.combustible.costoConsumido));
      const kmMed = estad(medidos.map((c) => (c.r.combustible.costoConsumido != null && !c.r.combustible.kmEstimado ? c.r.combustible.km : null)));
      return {
        id, nombre: cat.unidades.find((u) => u.id === id)?.numero ?? 'Sin unidad', viajes: cs.length, medidos: medidos.length,
        km: estad(cs.map((c) => c.r.combustible.km)).suma, litros: estad(medidos.map((c) => c.r.combustible.litrosConsumidos)).suma,
        cargados: estad(cs.map((c) => c.r.combustible.litrosCargados)).suma, rend: rp.valor,
        costoKm: costo.suma != null && kmMed.suma ? costo.suma / kmMed.suma : null,
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [calcs, cat.unidades]);

  return (
    <>
      {(rutas > 1 || cfgs > 1) && (
        <Aviso tono="ambar">La selección mezcla {rutas} ruta(s) y {cfgs} configuración(es) de tráiler. Los promedios describen el conjunto; para comparar unidades usa los grupos comparables o filtra por ruta y configuración.</Aviso>
      )}
      <p className="nota">Selecciona un indicador para ver los viajes que lo originan.</p>
      <section className="kpis">
        <Kpi icono="ciclo" label="Duración del ciclo" valor={fmtDur(k.ciclo.prom, { corto: true })} base={baseN(k.ciclo)} nota={k.ciclo.n > 1 ? `mín ${fmtDur(k.ciclo.min, { corto: true })} · máx ${fmtDur(k.ciclo.max, { corto: true })}` : undefined} sel={sel?.id === 'ciclo'} onClick={() => drill('ciclo', 'Duración del ciclo', dur((c) => c.r.total))} />
        <Kpi icono="granja" label="Tiempo dentro de planta" valor={fmtDur(k.planta.prom, { corto: true })} base={baseN(k.planta)} sel={sel?.id === 'planta'} onClick={() => drill('planta', 'Tiempo en planta', dur((c) => c.r.etapas.planta))} />
        <Kpi icono="ruta" label="Tiempo en trayecto" valor={fmtDur(k.tray.prom, { corto: true })} base={baseN(k.tray)} nota="ida + regreso" sel={sel?.id === 'tray'} onClick={() => drill('tray', 'Tiempo en trayecto', dur((c) => c.r.traslado))} />
        <Kpi icono="bioseguridad" label="Tiempo en granja" valor={fmtDur(k.granja.prom, { corto: true })} base={baseN(k.granja)} sel={sel?.id === 'granja'} onClick={() => drill('granja', 'Tiempo en granja', dur((c) => c.r.etapas.granja))} />
        <Kpi icono="espera" label="Tiempo de espera" valor={fmtDur(k.espera.prom, { corto: true })} base={baseN(k.espera)} nota="lavado + autorización + descarga" sel={sel?.id === 'espera'} onClick={() => drill('espera', 'Tiempo de espera', dur((c) => c.r.espera))} />
        <Kpi icono="lavado" label="Tiempo de lavado" valor={fmtDur(k.lavado.prom, { corto: true })} base={baseN(k.lavado)} sel={sel?.id === 'lavado'} onClick={() => drill('lavado', 'Tiempo de lavado', dur((c) => c.r.lavado))} />
        <Kpi icono="carga" label="Tiempo de carga" valor={fmtDur(k.carga.prom, { corto: true })} base={baseN(k.carga)} sel={sel?.id === 'carga'} onClick={() => drill('carga', 'Tiempo de carga', dur((c) => c.r.carga))} />
        <Kpi icono="descarga" label="Tiempo de descarga" valor={fmtDur(k.descarga.prom, { corto: true })} base={baseN(k.descarga)} sel={sel?.id === 'descarga'} onClick={() => drill('descarga', 'Tiempo de descarga', dur((c) => c.r.descarga))} />
        <Kpi icono="combustible" label="Diésel consumido (medido)" valor={k.litros.suma != null ? `${num(k.litros.suma, 0)} L` : '—'} base={`total · ${k.litros.n} de ${k.litros.de} viajes`} nota="no incluye litros sólo cargados ni estimados" sel={sel?.id === 'litros'} onClick={() => drill('litros', 'Litros consumidos medidos', (c) => (c.r.combustible.litrosConsumidos != null ? `${num(c.r.combustible.litrosConsumidos)} L` : null))} />
        <Kpi icono="indicadores" label="Rendimiento" valor={k.rend.valor != null ? `${num(k.rend.valor, 2)} km/L` : '—'} base={`ponderado (Σ km ÷ Σ L) · ${k.rend.n} de ${k.rend.de} viajes medidos`} sel={sel?.id === 'rend'} onClick={() => drill('rend', 'Rendimiento medido', (c) => (c.r.combustible.rendimiento != null ? `${num(c.r.combustible.rendimiento, 2)} km/L` : null))} />
        <Kpi icono="carga" label="Litros por tonelada" valor={k.lt.v != null ? `${num(k.lt.v, 2)} L/t` : '—'} base={`ponderado · ${k.lt.n} viajes con litros y toneladas medidos`} sel={sel?.id === 'lt'} onClick={() => drill('lt', 'Litros por tonelada', (c) => (c.r.combustible.litrosPorTon != null ? `${num(c.r.combustible.litrosPorTon, 2)} L/t` : null))} />
        <Kpi icono="diesel" label="Costo de combustible" valor={k.costo.suma != null ? mxn(k.costo.suma) : '—'} base={`total consumido · ${k.costo.n} de ${k.costo.de} viajes`} sel={sel?.id === 'costo'} onClick={() => drill('costo', 'Costo del combustible consumido', (c) => (c.r.combustible.costoConsumido != null ? mxn(c.r.combustible.costoConsumido) : null))} />
        <Kpi icono="factura" label="Costo de combustible por tonelada" valor={k.costoTon.v != null ? mxn(k.costoTon.v) : '—'} base={`ponderado · ${k.costoTon.n} viajes con costo y toneladas`} sel={sel?.id === 'costoTon'} onClick={() => drill('costoTon', 'Costo por tonelada', (c) => (c.r.combustible.costoPorTon != null ? mxn(c.r.combustible.costoPorTon) : null))} />
        <Kpi icono="descarga" label="Toneladas entregadas" valor={k.ton.suma != null ? `${num(k.ton.suma, 1)} t` : '—'} base={`total · ${k.ton.n} de ${k.ton.de} viajes`} sel={sel?.id === 'ton'} onClick={() => drill('ton', 'Toneladas entregadas', (c) => (c.r.toneladas.entregadas != null ? `${num(c.r.toneladas.entregadas, 2)} t` : null))} />
        <Kpi icono="alerta" label="Incidencias" valor={String(k.inc)} base={`en ${calcs.length} viajes · ${k.par} paradas necesarias u operativas aparte`} sel={sel?.id === 'inc'} onClick={() => drill('inc', 'Viajes con incidencias', (c) => (c.r.eventos.incidencias ? `${c.r.eventos.incidencias}` : null))} />
        <Kpi icono="mantenimiento" label="Costo de mantenimiento" valor={k.mant.suma != null ? mxn(k.mant.suma) : '—'} base={`total · ${k.mant.n} de ${k.mant.de} viajes con dato`} sel={sel?.id === 'mant'} onClick={() => drill('mant', 'Costo de mantenimiento', (c) => (c.r.mantenimiento.costo ? mxn(c.r.mantenimiento.costo) : null))} />
      </section>
      {sel && <OrigenViajes titulo={sel.titulo} items={sel.items} onCerrar={() => setSel(null)} />}

      <section className="tarjeta">
        <header className="tarjeta__cab"><h2><Icono n="combustible" size={18} />Combustible por unidad</h2><span className="tarjeta__ayuda">Rendimiento sólo con consumo medido · orden alfabético</span></header>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>Unidad</th><th className="num">Viajes</th><th className="num">Con consumo medido</th><th className="num">Km registrados</th><th className="num">Litros consumidos (medidos)</th><th className="num">Litros cargados</th><th className="num">Rendimiento</th><th className="num">Costo por km</th></tr></thead>
            <tbody>
              {porUnidad.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td><td className="num">{u.viajes}</td><td className="num">{u.medidos}</td>
                  <td className="num">{num(u.km, 0)}</td><td className="num">{num(u.litros, 0)}</td><td className="num muted">{num(u.cargados, 0)}</td>
                  <td className="num">{u.rend != null ? `${num(u.rend, 2)} km/L` : <span className="pend">Datos insuficientes</span>}</td>
                  <td className="num">{mxn(u.costoKm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta">
        <header className="tarjeta__cab"><h2><Icono n="capas" size={18} />Unidades por grupo comparable</h2><span className="tarjeta__ayuda">Misma ruta y misma configuración. Orden alfabético; no es un ranking.</span></header>
        {grupos.map((g) => {
          const unidades = new Map<string, ViajeCalc[]>();
          for (const c of g.viajes) unidades.set(c.viaje.config.unidadId, [...(unidades.get(c.viaje.config.unidadId) ?? []), c]);
          const ruta = cat.rutas.find((r) => r.id === g.rutaId)?.nombre ?? 'Sin ruta';
          const cfg = cat.configuraciones.find((x) => x.id === g.configuracionId)?.nombre ?? 'Sin configuración';
          return (
            <div key={g.clave} className="grupo-comp">
              <h3>{ruta} · {cfg} <span className="muted">({g.viajes.length} viaje{g.viajes.length === 1 ? '' : 's'})</span></h3>
              {g.viajes.length < 3 && <p className="nota">Muestra pequeña: interpreta las diferencias con cautela.</p>}
              <div className="tabla-envoltura">
                <table className="tabla tabla--compacta">
                  <thead><tr><th>Unidad</th><th className="num">Viajes</th><th className="num">Ciclo (mediana)</th><th className="num">Planta (mediana)</th><th className="num">Espera (mediana)</th><th className="num">Granja (mediana)</th><th className="num">Rendimiento medido</th></tr></thead>
                  <tbody>
                    {[...unidades.entries()].sort((a, b) => (cat.unidades.find((u) => u.id === a[0])?.numero ?? '').localeCompare(cat.unidades.find((u) => u.id === b[0])?.numero ?? '')).map(([uid, cs]) => {
                      const m = (f: (c: ViajeCalc) => number | null) => estad(cs.map(f));
                      const cel = (e: Estad) => (e.n ? <>{fmtDur(e.mediana, { corto: true })}{e.n < e.de && <small className="muted"> ({e.n}/{e.de})</small>}</> : <span className="pend">—</span>);
                      const rp = rendimientoPonderado(cs);
                      return (
                        <tr key={uid}>
                          <td>{cat.unidades.find((u) => u.id === uid)?.numero ?? 'Sin unidad'}</td><td className="num">{cs.length}</td>
                          <td className="num">{cel(m((c) => c.r.total))}</td><td className="num">{cel(m((c) => c.r.etapas.planta))}</td>
                          <td className="num">{cel(m((c) => c.r.espera))}</td><td className="num">{cel(m((c) => c.r.etapas.granja))}</td>
                          <td className="num">{rp.valor != null ? `${num(rp.valor, 2)} km/L (${rp.n})` : <span className="pend">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
