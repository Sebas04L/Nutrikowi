// Exportación a CSV (compatible con Excel: UTF-8 con BOM, separador coma).
// Los datos estimados se identifican en columnas propias; los vacíos se exportan vacíos (no como cero).

import type { Catalogos, Modo, Viaje } from '../types';
import { calcularViaje } from './calculos';
import { calidadViaje, ETIQUETA_CALIDAD } from './calidad';
import { claseDe, duracionEvento, esIncidencia, estadoConsumo, ETIQUETA_CLASE, ETIQUETA_CONSUMO, fechaEvento, kmEvento } from './eventos';
import { calcularTramo, ETIQUETA_SENTIDO, ETIQUETA_TRAMO } from './velocidad';
import { CAMPOS_LISTA_ORDEN, NODOS, SEGMENTOS_LISTA } from './proceso';
import { nombres } from './nombres';

function celda(x: unknown): string {
  if (x === null || x === undefined) return '';
  let s = typeof x === 'number' ? (isFinite(x) ? String(Math.round(x * 100) / 100) : '') : typeof x === 'boolean' ? (x ? 'Sí' : 'No') : String(x);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

const fila = (xs: unknown[]) => xs.map(celda).join(',');
const origen = (modo: Modo) => (modo === 'demo' ? 'DEMOSTRACIÓN (ficticio)' : 'Real');
const hora = (x: string | null | undefined) => (x ? x.replace('T', ' ') : '');

export function csvViajes(viajes: Viaje[], cat: Catalogos, modo: Modo): string {
  const enc: string[] = [
    'ID interno', 'Origen de los datos', 'Folio', 'Fecha', 'Granja', 'Ruta', 'Unidad', 'Chofer', 'Tipo de unidad', 'Configuración',
    'Tipo de tolva', 'Capacidad nominal (t)', 'Tipo de alimento', 'Toneladas programadas', 'Km estimados', 'Observaciones del viaje',
    'Integridad', 'Validado el', 'Validado por', 'Datos faltantes', 'Datos estimados',
  ];
  const campos = CAMPOS_LISTA_ORDEN;
  for (const c of campos) enc.push(`${c.label}${c.unidad ? ` (${c.unidad})` : c.tipo === 'duracion' ? ' (min)' : ''} [${c.id}]`);
  for (const s of SEGMENTOS_LISTA) enc.push(`Duración calculada · ${s.label} (min)`);
  enc.push(
    'Ciclo total (min)', 'Planta (min)', 'Trayecto ida (min)', 'Granja (min)', 'Trayecto regreso (min)', 'Traslado total (min)', 'Descarga (min)',
    'Imputado operación (min)', 'Imputado espera (min)', 'Imputado traslado (min)', 'Imputado paradas (min)', 'Imputado incidencia (min)',
    'Real sin duplicar · operación (min)', 'Real sin duplicar · espera (min)', 'Real sin duplicar · traslado (min)', 'Real sin duplicar · paradas (min)', 'Real sin duplicar · incidencia (min)', 'Real · sin registrar (min)',
    'Solape entre actividades (min)', 'Toneladas netas calculadas', 'Km recorridos', 'Km estimados (marcados)', 'Litros consumidos medidos', 'Litros estimados', 'Fuente del consumo', 'Calidad del dato de consumo',
    'Rendimiento medido (km/L)', 'Rendimiento estimado (km/L)', 'L/100 km (medido)', 'Litros por tonelada (medido)', 'Costo de diésel consumido (MXN)', 'Costo diésel estimado (MXN)', 'Costo diésel por km', 'Costo diésel por tonelada',
    'Costo de carga de diésel (MXN)', 'Costo de mantenimiento (MXN)', 'Incidencias', 'Paradas necesarias u operativas', 'Minutos de incidencia', 'Minutos de paradas', 'Eventos que afectaron la entrega',
    'Vel. promedio ida (km/h)', 'Vel. promedio regreso (km/h)', 'Avance (actividades completas)', 'Datos completos (%)',
  );
  const lineas = [fila(enc)];
  for (const vj of viajes) {
    const r = calcularViaje(vj, cat);
    const q = calidadViaje(vj, r);
    const n = nombres(vj, cat);
    const f: unknown[] = [
      vj.id, origen(modo), vj.config.folio, vj.config.fecha, n.granja, n.ruta, n.unidad, n.chofer,
      vj.config.tipoUnidad, n.configuracion, vj.config.tipoTolva, vj.config.capacidadNominal, vj.config.tipoAlimento,
      vj.config.toneladasProgramadas, vj.config.kmEstimados, vj.config.observaciones,
      ETIQUETA_CALIDAD[q.estado], vj.revision.validado ? vj.revision.validado.slice(0, 16).replace('T', ' ') : '', vj.revision.responsable, q.faltantes,
      Object.keys(vj.estimados).join(' | '),
    ];
    for (const c of campos) {
      const x = vj.v[c.id];
      f.push(c.tipo === 'hora' && typeof x === 'string' ? hora(x) : x);
    }
    for (const s of SEGMENTOS_LISTA) f.push(r.segmentos[s.id].min);
    const c = r.combustible;
    f.push(
      r.total, r.etapas.planta, r.etapas.ida, r.etapas.granja, r.etapas.regreso, r.traslado, r.descarga,
      r.imputado.operativo, r.imputado.espera, r.imputado.traslado, r.imputado.parada, r.imputado.incidencia,
      r.real?.operativo, r.real?.espera, r.real?.traslado, r.real?.parada, r.real?.incidencia, r.real?.sinRegistro,
      r.solape, r.toneladas.netas, c.km, c.kmEstimado, c.litrosConsumidos, c.litrosEstimados, c.fuenteConsumo, c.calidad,
      c.rendimiento, c.rendimientoEstimado, c.lt100km, c.litrosPorTon, c.costoConsumido, c.costoEstimado, c.costoPorKm, c.costoPorTon,
      c.costoCarga, r.mantenimiento.costo, r.eventos.incidencias, r.eventos.paradas, r.eventos.minIncidencia, r.eventos.minParada, r.eventos.afectaronEntrega,
      r.velocidad.ida, r.velocidad.regreso, `${r.avance.completos}/${r.avance.aplicables}`, Math.round(r.completitud.pct * 100),
    );
    lineas.push(fila(f));
  }
  return '﻿' + lineas.join('\r\n');
}

export function csvEventos(viajes: Viaje[], cat: Catalogos, modo: Modo): string {
  const lineas = [fila([
    'Origen', 'Folio', 'Fecha del viaje', 'Unidad', 'Ruta', 'Tipo de evento', 'Clase', 'Incidencia o parada', 'Paso', 'Actividad', 'Fecha del evento',
    'Inicio', 'Fin', 'Duración (min)', 'Odómetro inicio (km)', 'Odómetro fin (km)', 'Km durante el evento', 'Lugar', 'Motivo', 'Observaciones',
    'Motor', 'Información de consumo', 'Litros', 'Desperfecto mecánico', 'Afectó la entrega',
  ])];
  for (const vj of viajes) {
    const n = nombres(vj, cat);
    for (const e of vj.eventos) {
      const clase = claseDe(e.tipo, cat);
      lineas.push(fila([
        origen(modo), vj.config.folio, vj.config.fecha, n.unidad, n.ruta, e.tipo, ETIQUETA_CLASE[clase], esIncidencia(clase) ? 'Incidencia' : 'Parada',
        e.nodo ? NODOS[e.nodo]?.paso ?? '' : '', e.nodo ? NODOS[e.nodo]?.titulo ?? e.nodo : '', fechaEvento(e),
        hora(e.inicio), hora(e.fin), duracionEvento(e), e.odoInicio, e.odoFin, kmEvento(e), e.lugar, e.motivo, e.observaciones,
        e.motor ?? '', ETIQUETA_CONSUMO[estadoConsumo(e)], e.litros, e.desperfecto, e.afectoEntrega,
      ]));
    }
  }
  return '﻿' + lineas.join('\r\n');
}

export function csvTramos(viajes: Viaje[], cat: Catalogos, modo: Modo): string {
  const lineas = [fila(['Origen', 'Folio', 'Fecha', 'Unidad', 'Ruta', 'Sentido', 'Tipo de tramo', 'Km', 'Inicio', 'Fin', 'Duración (min)', 'Velocidad promedio calculada (km/h)', 'Velocidad máxima registrada (km/h)', 'Límite configurado (km/h)', 'Supera el límite', 'Observaciones'])];
  for (const vj of viajes) {
    const n = nombres(vj, cat);
    for (const t of vj.tramos) {
      const rt = calcularTramo(t, cat.limitesVelocidad);
      lineas.push(fila([
        origen(modo), vj.config.folio, vj.config.fecha, n.unidad, n.ruta, ETIQUETA_SENTIDO[t.sentido], ETIQUETA_TRAMO[t.tipo], t.km, hora(t.inicio), hora(t.fin), rt.min,
        rt.vProm, t.velMax, rt.limite, rt.excedeProm || rt.excedeMax, t.observaciones,
      ]));
    }
  }
  return '﻿' + lineas.join('\r\n');
}
