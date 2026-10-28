// Módulo de combustible y costos de un viaje.

import type { Viaje } from '../types';
import { useApp } from '../state/Contexto';
import { calcularViaje, sino, unidadDe, type ResultadoViaje } from '../lib/calculos';
import { rendimientoPonderado } from '../lib/analisis';
import { fmtDur } from '../lib/tiempo';
import { Cajon, mxn } from './PanelNodo';
import { CampoViaje, useEdicionViaje } from './Editores';
import { Aviso, Metrica, Pastilla, Seccion } from './ui';
import { CampoHora } from './CampoHora';
import { Campo } from './ui';
import { horaPrevia } from './Editores';

const n1 = (x: number | null, dec = 1) => (x == null ? null : x.toLocaleString('es-MX', { maximumFractionDigits: dec, minimumFractionDigits: dec }));

export function PanelCombustible({ viaje, r }: { viaje: Viaje; r: ResultadoViaje }) {
  const { setPanel, cat, ws } = useApp();
  const { fijar, estimar } = useEdicionViaje(viaje);
  const c = r.combustible;
  const unidad = unidadDe(viaje, cat);
  const dieselAplica = sino(viaje.v['diesel.aplica']);
  const otrosUnidad = ws.viajes.filter((x) => x.config.unidadId && x.config.unidadId === viaje.config.unidadId).map((x) => ({ viaje: x, r: x.id === viaje.id ? r : calcularViaje(x, cat) }));
  const rp = rendimientoPonderado(otrosUnidad);
  const calidad = { medido: { t: 'Consumo medido', tono: 'verde' as const }, estimado: { t: 'Sólo estimación', tono: 'ambar' as const }, insuficiente: { t: 'Datos insuficientes', tono: 'gris' as const } }[c.calidad];
  const fuente = { total: 'consumo total del ciclo', tramos: 'suma de tramos (ida + regreso' + (c.incluyeTdf ? ' + toma de fuerza)' : ')'), niveles: 'balance de niveles de tanque' };
  const fuenteEst = { captura: 'ESTIMADO (captura manual)', rendimiento_ref: 'ESTIMADO con rendimiento de referencia', datos_estimados: 'ESTIMADO: incluye datos marcados como estimados' };

  return (
    <Cajon icono="combustible" sub={`Viaje ${viaje.config.folio}${unidad ? ` · Unidad ${unidad.numero}` : ''}`} titulo="Combustible y costos" onCerrar={() => setPanel(null)}
      cabExtra={<div className="cajon__estado"><Pastilla tono={calidad.tono}>{calidad.t}</Pastilla>{c.fuenteConsumo && <Pastilla>{fuente[c.fuenteConsumo]}</Pastilla>}</div>}>
      <Aviso>Los litros <strong>cargados</strong> no son los litros <strong>consumidos</strong>: una recarga puede cubrir varios viajes. El rendimiento sólo se calcula con consumo medido.</Aviso>

      <Seccion titulo="Resultados" icono="indicadores">
        <div className="rejilla-metricas">
          <Metrica label="Kilómetros recorridos" valor={c.km != null ? `${n1(c.km)} km` : 'Pendiente'} sub={c.kmFaltante ?? 'ida + regreso'} tono={c.km == null ? 'pendiente' : undefined} />
          <Metrica label="Litros consumidos" valor={c.litrosConsumidos != null ? `${n1(c.litrosConsumidos)} L` : c.litrosEstimados != null ? `≈ ${n1(c.litrosEstimados)} L` : 'Sin dato'}
            sub={c.litrosConsumidos != null ? 'medido' : c.litrosEstimados != null && c.fuenteEstimado ? fuenteEst[c.fuenteEstimado] : 'no hay medición confiable'}
            tono={c.litrosConsumidos == null ? (c.litrosEstimados != null ? 'ambar' : 'pendiente') : undefined} />
          <Metrica label="Rendimiento" valor={c.rendimiento != null ? `${n1(c.rendimiento, 2)} km/L` : c.rendimientoEstimado != null ? `≈ ${n1(c.rendimientoEstimado, 2)} km/L` : 'Sin dato'}
            sub={c.rendimiento != null ? 'km ÷ litros de traslado' : c.rendimientoEstimado != null ? 'ESTIMADO, no es consumo real' : 'requiere km y litros medidos'}
            tono={c.rendimiento == null ? (c.rendimientoEstimado != null ? 'ambar' : 'pendiente') : undefined} />
          <Metrica label="Consumo por distancia" valor={c.lt100km != null ? `${n1(c.lt100km)} L/100 km` : c.est.lt100km != null ? `≈ ${n1(c.est.lt100km)} L/100 km` : 'Sin dato'} sub={c.lt100km == null && c.est.lt100km != null ? 'ESTIMADO' : undefined} tono={c.lt100km == null ? (c.est.lt100km != null ? 'ambar' : 'pendiente') : undefined} />
          <Metrica label="Litros por tonelada" valor={c.litrosPorTon != null ? `${n1(c.litrosPorTon, 2)} L/t` : c.est.litrosPorTon != null ? `≈ ${n1(c.est.litrosPorTon, 2)} L/t` : 'Sin dato'} sub={c.litrosPorTon != null ? 'litros consumidos ÷ toneladas entregadas' : c.est.litrosPorTon != null ? 'ESTIMADO' : undefined} tono={c.litrosPorTon == null ? (c.est.litrosPorTon != null ? 'ambar' : 'pendiente') : undefined} />
          <Metrica label="Costo del combustible consumido" valor={c.costoConsumido != null ? mxn(c.costoConsumido) : c.costoEstimado != null ? `≈ ${mxn(c.costoEstimado)}` : 'Sin dato'}
            sub={c.precioValuacion != null ? `a ${mxn(c.precioValuacion)}/L (${c.fuentePrecio === 'carga' ? 'precio de la carga' : 'precio de referencia'})` : 'falta precio por litro'}
            tono={c.costoConsumido == null ? (c.costoEstimado != null ? 'ambar' : 'pendiente') : undefined} />
          <Metrica label="Costo por kilómetro" valor={c.costoPorKm != null ? mxn(c.costoPorKm) : c.est.costoPorKm != null ? `≈ ${mxn(c.est.costoPorKm)}` : 'Sin dato'} sub={c.costoPorKm == null && c.est.costoPorKm != null ? 'ESTIMADO' : undefined} tono={c.costoPorKm == null ? (c.est.costoPorKm != null ? 'ambar' : 'pendiente') : undefined} />
          <Metrica label="Costo por tonelada entregada" valor={c.costoPorTon != null ? mxn(c.costoPorTon) : c.est.costoPorTon != null ? `≈ ${mxn(c.est.costoPorTon)}` : 'Sin dato'} sub={r.toneladas.entregadas != null ? `${n1(r.toneladas.entregadas, 2)} t entregadas${c.costoPorTon == null && c.est.costoPorTon != null ? ' · ESTIMADO' : ''}` : 'faltan toneladas descargadas'} tono={c.costoPorTon == null ? (c.est.costoPorTon != null ? 'ambar' : 'pendiente') : undefined} />
          <Metrica label="Costo del abastecimiento" valor={dieselAplica === false ? 'Sin carga en planta' : c.costoCarga != null ? mxn(c.costoCarga) : 'Sin dato'} sub="litros cargados × precio (no es consumo)" tono={c.costoCarga == null || dieselAplica === false ? 'pendiente' : undefined} />
        </div>
        {c.notas.map((t) => <Aviso key={t} tono="ambar">{t}</Aviso>)}
        {rp.n > 0 && unidad && (
          <p className="nota">Unidad {unidad.numero}: rendimiento medido ponderado <strong>{n1(rp.valor, 2)} km/L</strong> en {rp.n} de {rp.de} viajes registrados de esta unidad.</p>
        )}
      </Seccion>

      <Seccion titulo="Carga de diésel en planta" icono="diesel">
        <div className="rejilla-campos">
          <CampoViaje id="diesel.aplica" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          {dieselAplica && (
            <>
              <CampoViaje id="diesel.litros" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
              <CampoViaje id="diesel.precio" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
              <Campo label="Fecha y hora de la carga" ancho="completo">
                <CampoHora value={typeof viaje.v['diesel.inicio'] === 'string' ? (viaje.v['diesel.inicio'] as string) : null} onChange={(x) => fijar('diesel.inicio', x)}
                  fechaBase={viaje.config.fecha} referencia={horaPrevia(viaje.v, 'diesel.inicio')} />
              </Campo>
            </>
          )}
        </div>
        {r.segmentos.diesel.min != null && <p className="nota">Duración del abastecimiento: {fmtDur(r.segmentos.diesel.min)}.</p>}
      </Seccion>

      <Seccion titulo="Distancia" icono="ruta">
        <div className="rejilla-campos">
          <CampoViaje id="ida.km" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="reg.km" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
        </div>
        {viaje.config.kmEstimados != null && <p className="nota">Km estimados de ida en la configuración: {viaje.config.kmEstimados} km.</p>}
      </Seccion>

      <Seccion titulo="Consumo medido" icono="combustible">
        <p className="nota">Captura sólo mediciones confiables. Si se conoce el consumo total del ciclo, tiene prioridad sobre la suma de tramos y sobre el balance de niveles.</p>
        <div className="rejilla-campos">
          <CampoViaje id="comb.metodo" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="comb.consumoTotal" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="ida.litros" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="reg.litros" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="comb.nivelInicial" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="comb.nivelFinal" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
        </div>
        {unidad?.capacidadTanque != null && <p className="nota">Capacidad del tanque de la unidad: {unidad.capacidadTanque} L.</p>}
      </Seccion>

      <Seccion titulo="Toma de fuerza durante la descarga" icono="descarga">
        <div className="rejilla-campos">
          <CampoViaje id="desc.ptoTipo" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="desc.ptoLitros" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
        </div>
        {!viaje.v['desc.ptoTipo'] && unidad?.tomaFuerza && <p className="nota">Según el catálogo, la unidad {unidad.numero} tiene toma de fuerza {unidad.tomaFuerza.toLowerCase()}.</p>}
        {c.tdfSinMedir && <Aviso tono="ambar">La toma de fuerza es accionada con diésel y su consumo no se midió por separado.</Aviso>}
      </Seccion>

      <Seccion titulo="Estimación y valuación" icono="analisis">
        <div className="rejilla-campos">
          <CampoViaje id="comb.consumoEstimado" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="comb.precioRef" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} />
          <CampoViaje id="comb.obs" viaje={viaje} fijar={fijar} estimar={estimar} cat={cat} ancho="completo" />
        </div>
        <p className="nota">
          {unidad?.rendimientoRef != null
            ? `Rendimiento de referencia de la unidad (catálogo): ${unidad.rendimientoRef} km/L. Se usa sólo para estimaciones identificadas como tales.`
            : 'La unidad no tiene rendimiento de referencia en el catálogo; sin medición no se estima automáticamente.'}
        </p>
      </Seccion>
    </Cajon>
  );
}
