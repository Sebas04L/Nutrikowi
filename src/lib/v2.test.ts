import { describe, expect, it } from 'vitest';
import { calcularViaje } from './calculos';
import { calidadViaje } from './calidad';
import { catalogosIniciales, eventoVacio, nuevoViaje, tramoVacio } from './datosBase';
import { espacioDemo } from './demo';
import { leerRespaldo, normalizarAlmacen } from './almacen';
import { calcularTramo } from './velocidad';
import { estadoConsumo } from './eventos';
import {
  calcComparador, calcCostoCombustible, calcDescarga, calcLitrosPorTon, calcLitrosViaje, calcMantenimiento, calcRalenti, calcRendimiento,
} from './calculadoras';
import { composicionEtapas, diferenciasContexto } from './analisis';

// Almacenamiento tal como lo guardaba la versión 1 (estructura real capturada de la v1).
const V1 = {
  version: 1,
  modo: 'real',
  real: {
    catalogos: {
      granjas: [{ id: 'g1', nombre: 'Granja Real Uno', ubicacion: '', procedimientoBio: '', notas: '', activo: true }],
      rutas: [], unidades: [{ id: 'u1', numero: 'T-07', tipoUnidad: 'Tractocamión', configuracionId: 'cfg-tracto-cil-28', capacidadTanque: null, rendimientoRef: null, tomaFuerza: '', notas: '', activo: true }],
      choferes: [], configuraciones: [], tiposAlimento: ['Pellet', 'Harina'], tiposMantenimiento: ['Preventivo'], procedimientosBio: ['Baño'], metodosMedicion: ['Otro'],
      tiposIncidencia: ['Retraso', 'Desperfecto mecánico', 'Documental', 'Báscula personalizada'],
      tiemposReferencia: { lavado: 50 },
    },
    viajes: [{
      id: 'v1', creado: '2026-10-27T10:00:00.000Z', actualizado: '2026-10-27T10:00:00.000Z',
      config: { fecha: '2026-10-27', folio: 'V-20261027-01', granjaId: 'g1', unidadId: 'u1' },
      v: { 'llegada.hora': '2026-10-27T06:00', 'prelavado.inicio': '2026-10-27T06:05', 'prelavado.fin': '2026-10-27T06:20' },
      incidencias: { llegada: [{ id: 'i1', tipo: 'Retraso', descripcion: 'Faltó la remisión firmada', inicio: null, fin: null, duracionMin: 15 }] },
      clasif: { llegada: { estado: 'investigar', nota: 'x' } }, plantillaDe: null, cicloAnterior: null,
    }],
    hipotesis: [],
  },
  demo: { catalogos: {}, viajes: [], hipotesis: [] },
};

describe('migración v1 → v2', () => {
  it('convierte incidencias por actividad en eventos sin perder datos', () => {
    const a = normalizarAlmacen(JSON.parse(JSON.stringify(V1)));
    expect(a.version).toBe(2);
    const v = a.real.viajes[0];
    expect(v.eventos.length).toBe(1);
    expect(v.eventos[0].id).toBe('i1');
    expect(v.eventos[0].nodo).toBe('llegada');
    expect(v.eventos[0].tipo).toBe('Retraso');
    expect(v.eventos[0].observaciones).toBe('Faltó la remisión firmada');
    expect(v.eventos[0].duracionMin).toBe(15);
    expect(v.clasif.llegada.estado).toBe('investigar');
    expect(v.v['prelavado.fin']).toBe('2026-10-27T06:20');
    expect(v.revision.validado).toBeNull();
    expect(v.estimados).toEqual({});
    expect(v.tramos).toEqual([]);
  });
  it('conserva los tipos de incidencia de la v1 en el nuevo catálogo', () => {
    const cat = normalizarAlmacen(JSON.parse(JSON.stringify(V1))).real.catalogos;
    const nombres = cat.tiposEvento.map((t) => t.nombre);
    expect(nombres.includes('Retraso')).toBe(true);
    expect(nombres.includes('Báscula personalizada')).toBe(true);
    expect(nombres.includes('Descanso del chofer')).toBe(true);
    expect(cat.tiposEvento.find((t) => t.nombre === 'Desperfecto mecánico')!.clase).toBe('falla');
    expect(cat.tiemposReferencia.lavado).toBe(50);
    expect(cat.limitesVelocidad).toEqual({ carretera: 80, terraceria: 35 });
  });
  it('el evento migrado sigue contando como incidencia y marca posible retraso', () => {
    const a = normalizarAlmacen(JSON.parse(JSON.stringify(V1)));
    const r = calcularViaje(a.real.viajes[0], a.real.catalogos);
    expect(r.eventos.incidencias).toBe(1);
    expect(r.eventos.minIncidencia).toBe(15);
    expect(r.nodos.llegada.posibleRetraso).toBe(true);
  });
  it('importa respaldos JSON de la v1', () => {
    const txt = JSON.stringify({ app: 'nutrikowi-ciclo-logistico', version: 1, exportado: '2026-10-27T12:00:00Z', datos: V1 });
    const l = leerRespaldo(txt);
    expect(l.versionOrigen).toBe(1);
    expect(l.viajesReales).toBe(1);
    expect(l.almacen.real.viajes[0].eventos.length).toBe(1);
  });
  it('acepta la copia cruda del almacenamiento v1', () => {
    const l = leerRespaldo(JSON.stringify(V1));
    expect(l.almacen.real.viajes.length).toBe(1);
  });
});

describe('incidencias y paradas', () => {
  const cat = catalogosIniciales();
  it('las paradas necesarias no cuentan como incidencias', () => {
    const v = nuevoViaje([]);
    v.v['llegada.hora'] = '2026-10-27T06:00';
    v.v['reg.llegada'] = '2026-10-27T16:00';
    v.eventos = [
      { ...eventoVacio('Descanso del chofer', 'regreso'), inicio: '2026-10-27T14:00', fin: '2026-10-27T14:30' },
      { ...eventoVacio('Tráfico', 'ida'), inicio: '2026-10-27T10:00', fin: '2026-10-27T10:20', afectoEntrega: true },
    ];
    const r = calcularViaje(v, cat);
    expect(r.eventos.paradas).toBe(1);
    expect(r.eventos.incidencias).toBe(1);
    expect(r.eventos.minParada).toBe(30);
    expect(r.eventos.minIncidencia).toBe(20);
    expect(r.eventos.afectaronEntrega).toBe(1);
    expect(r.real?.parada).toBe(30);
    expect(r.real?.incidencia).toBe(20);
    expect(r.nodos.ida.posibleRetraso).toBe(true);
    expect(r.nodos.regreso.posibleRetraso).toBe(false);
  });
  it('distingue el estado de la información de consumo', () => {
    expect(estadoConsumo({ ...eventoVacio(), motor: 'apagado' })).toBe('motor_apagado');
    expect(estadoConsumo({ ...eventoVacio(), motor: 'encendido' })).toBe('encendido_sin_dato');
    expect(estadoConsumo({ ...eventoVacio(), motor: 'encendido', consumo: 'medido', litros: 2 })).toBe('medido');
    expect(estadoConsumo({ ...eventoVacio(), consumo: 'estimado', litros: 1 })).toBe('estimado');
    expect(estadoConsumo(eventoVacio())).toBe('sin_informacion');
  });
});

describe('datos estimados', () => {
  const cat = catalogosIniciales();
  it('no presenta como medido un consumo con datos estimados', () => {
    const v = nuevoViaje([]);
    Object.assign(v.v, { 'ida.km': 60, 'reg.km': 60, 'ida.litros': 30, 'reg.litros': 20, 'comb.precioRef': 25 });
    v.estimados = { 'ida.litros': true };
    const c = calcularViaje(v, cat).combustible;
    expect(c.calidad).toBe('estimado');
    expect(c.litrosConsumidos).toBeNull();
    expect(c.rendimiento).toBeNull();
    expect(c.litrosEstimados).toBe(50);
    expect(c.rendimientoEstimado).toBe(2.4);
    expect(c.costoConsumido).toBeNull();
    expect(c.costoEstimado).toBe(1250);
  });
  it('kilómetros estimados vuelven estimado el rendimiento', () => {
    const v = nuevoViaje([]);
    Object.assign(v.v, { 'ida.km': 60, 'reg.km': 60, 'ida.litros': 30, 'reg.litros': 20 });
    v.estimados = { 'reg.km': true };
    const c = calcularViaje(v, cat).combustible;
    expect(c.litrosConsumidos).toBe(50);
    expect(c.rendimiento).toBeNull();
    expect(c.rendimientoEstimado).toBe(2.4);
  });
});

describe('calidad de los datos', () => {
  it('un viaje vacío está incompleto y uno completo queda listo para revisión', () => {
    const cat = catalogosIniciales();
    const v = nuevoViaje([]);
    expect(calidadViaje(v, calcularViaje(v, cat)).estado).toBe('incompleto');
    const d = espacioDemo();
    const estados = d.viajes.map((x) => calidadViaje(x, calcularViaje(x, d.catalogos)).estado);
    expect(estados.includes('validado')).toBe(true);
    expect(estados.includes('incompleto')).toBe(true);
  });
  it('un dato estimado se reporta como estimado, no como faltante', () => {
    const cat = catalogosIniciales();
    const v = nuevoViaje([]);
    v.v['desc.ton'] = 50;
    v.estimados = { 'desc.ton': true };
    const g = calidadViaje(v, calcularViaje(v, cat)).grupos.find((x) => x.id === 'toneladas')!;
    expect(g.faltan.length).toBe(0);
    expect(g.estimados.length).toBe(1);
  });
});

describe('velocidad', () => {
  const lim = { carretera: 80, terraceria: 35 };
  it('calcula la velocidad promedio con distancia y tiempo', () => {
    const t = { ...tramoVacio('ida', 'carretera'), km: 60, inicio: '2026-10-27T08:00', fin: '2026-10-27T09:00' };
    const r = calcularTramo(t, lim);
    expect(r.vProm).toBe(60);
    expect(r.excedeProm).toBe(false);
    expect(r.velMax).toBeNull();
  });
  it('avisa si el promedio o la máxima superan el límite configurado', () => {
    const t = { ...tramoVacio('ida', 'terraceria'), km: 10, duracionMin: 12, velMax: 40 };
    const r = calcularTramo(t, lim);
    expect(r.vProm).toBe(50);
    expect(r.excedeProm).toBe(true);
    expect(r.excedeMax).toBe(true);
  });
  it('no calcula velocidad sin datos suficientes', () => {
    const r = calcularTramo({ ...tramoVacio(), km: 10 }, lim);
    expect(r.vProm).toBeNull();
    expect(r.faltan.length).toBe(1);
  });
});

describe('calculadoras', () => {
  it('A · rendimiento', () => {
    const r = calcRendimiento(120, 50);
    expect(r.valores.kmL).toBe(2.4);
    expect(r.valores.l100).toBeCloseTo(41.67, 1);
    expect(calcRendimiento(120, 0).errores.length).toBe(1);
    expect(calcRendimiento(-5, 10).errores.length).toBe(1);
    expect(calcRendimiento(null, 10).faltan.length).toBe(1);
    expect(calcRendimiento(null, 10).valores.kmL).toBeNull();
  });
  it('B · litros por viaje', () => {
    const r = calcLitrosViaje(130, 2.6, false);
    expect(r.valores.litros).toBe(50);
    expect(r.avisos[0]).toContain('Estimación');
  });
  it('C · litros por tonelada', () => {
    expect(calcLitrosPorTon(50, 25, 'entregadas').valores.lt).toBe(2);
    expect(calcLitrosPorTon(50, 0, 'entregadas').errores.length).toBe(1);
    expect(calcLitrosPorTon(50, 25, 'cargadas').avisos.length).toBe(1);
  });
  it('D · costo distingue cargado de consumido', () => {
    const c = calcCostoCombustible(100, 25, 'consumidos', 200, 50);
    expect(c.valores.costo).toBe(2500);
    expect(c.valores.costoKm).toBe(12.5);
    expect(c.valores.costoTon).toBe(50);
    const g = calcCostoCombustible(100, 25, 'cargados', 200, 50);
    expect(g.valores.costo).toBe(2500);
    expect(g.valores.costoKm).toBeNull();
    expect(g.avisos.length).toBe(2);
  });
  it('E · comparador sin declarar ganador si no son comparables', () => {
    const r = calcComparador({ km: 100, litros: 50, ton: 25, precio: 25 }, { km: 100, litros: 40, ton: 25, precio: 25 }, false);
    expect(r.valores.rendA).toBe(2);
    expect(r.valores.rendB).toBe(2.5);
    expect(r.valores.difRend).toBe(0.5);
    expect(r.valores.difPct).toBe(25);
    expect(r.valores.difLt).toBeCloseTo(-0.4, 5);
    expect(r.valores.difCosto).toBe(-250);
    expect(r.avisos.length).toBe(1);
  });
  it('F · mantenimiento con datos parciales y costo por km', () => {
    const r = calcMantenimiento({ manoObra: 1000, refacciones: 2000, aceites: null, servicios: 0, otros: null, km: 15000 });
    expect(r.valores.total).toBe(3000);
    expect(r.valores.costoKm).toBe(0.2);
    expect(r.avisos.some((a) => a.includes('parcial'))).toBe(true);
    expect(calcMantenimiento({ manoObra: null, refacciones: null, aceites: null, servicios: null, otros: null, km: null }).valores.total).toBeNull();
  });
  it('G · ralentí sin consumo predeterminado', () => {
    expect(calcRalenti(90, null, 25, 'diaria', 22, false).valores.litros).toBeNull();
    const r = calcRalenti(90, 2, 25, 'diaria', 22, true);
    expect(r.valores.litros).toBe(3);
    expect(r.valores.costo).toBe(75);
    expect(r.valores.costoMes).toBe(1650);
  });
  it('H · descarga: medido tiene prioridad y eléctrica no asume ahorros', () => {
    const r = calcDescarga(60, 'Diésel', null, 6, 25, 30);
    expect(r.valores.litros).toBe(6);
    expect(r.valores.costo).toBe(150);
    expect(r.valores.costoTon).toBe(5);
    expect(calcDescarga(60, 'Diésel', 4, 6, 25, 30).valores.litros).toBe(4);
    const e = calcDescarga(60, 'Eléctrica', null, null, 25, 30);
    expect(e.valores.litros).toBeNull();
    expect(e.avisos.some((a) => a.includes('ahorros'))).toBe(true);
  });
});

describe('comparador de viajes', () => {
  it('compone el ciclo por etapa y detecta contexto distinto', () => {
    const d = espacioDemo();
    const r = calcularViaje(d.viajes[0], d.catalogos);
    const partes = composicionEtapas(r);
    expect(partes.length).toBe(6);
    const suma = partes.reduce((t, p) => t + (p.min ?? 0), 0);
    expect(Math.abs(suma - r.total!)).toBeLessThan(1);
    expect(diferenciasContexto([d.viajes[0], d.viajes[2]]).includes('Rutas distintas')).toBe(true);
  });
});
