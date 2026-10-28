import { describe, expect, it } from 'vitest';
import { calcularViaje } from './calculos';
import { catalogosIniciales, nuevoViaje } from './datosBase';
import { espacioDemo } from './demo';
import { asignarTiempo, minutosUnion, parseDT, parseDur } from './tiempo';
import { leerRespaldo, crearRespaldo, almacenInicial } from './almacen';
import { csvViajes } from './exportar';

const T = (s: string) => parseDT(`2026-10-27T${s}`)!;

describe('tiempo', () => {
  it('interpreta duraciones capturadas', () => {
    expect(parseDur('90')).toBe(90);
    expect(parseDur('1:30')).toBe(90);
    expect(parseDur('1h30')).toBe(90);
    expect(parseDur('1 h 30 min')).toBe(90);
    expect(parseDur('45m')).toBe(45);
    expect(parseDur('2h')).toBe(120);
    expect(parseDur('abc')).toBeNull();
    expect(parseDur('')).toBeNull();
  });
  it('une intervalos solapados sin duplicar', () => {
    expect(minutosUnion([{ a: T('08:00'), b: T('08:30') }, { a: T('08:10'), b: T('08:20') }])).toBe(30);
    expect(minutosUnion([{ a: T('08:00'), b: T('08:30') }, { a: T('08:20'), b: T('09:00') }])).toBe(60);
    expect(minutosUnion([{ a: T('08:00'), b: T('08:10') }, { a: T('08:20'), b: T('08:30') }])).toBe(20);
  });
  it('asigna el tiempo real por prioridad y deja huecos sin registrar', () => {
    const r = asignarTiempo(
      [
        { a: T('08:00'), b: T('08:30'), cat: 'operativo' },
        { a: T('08:20'), b: T('08:40'), cat: 'espera' },
      ],
      T('08:00'), T('09:00'),
    );
    expect(r.operativo).toBe(20);
    expect(r.espera).toBe(20);
    expect(r.sinRegistro).toBe(20);
  });
});

describe('cálculo de viaje', () => {
  const cat = catalogosIniciales();

  it('no interpreta campos vacíos como cero', () => {
    const v = nuevoViaje([]);
    const r = calcularViaje(v, cat);
    expect(r.total).toBeNull();
    expect(r.segmentos.lavado.min).toBeNull();
    expect(r.espera).toBeNull();
    expect(r.combustible.rendimiento).toBeNull();
    expect(r.combustible.calidad).toBe('insuficiente');
    expect(r.nodos.llegada.estado).toBe('pendiente');
  });

  it('calcula duraciones cruzando la medianoche', () => {
    const v = nuevoViaje([]);
    v.v['salida.hora'] = '2026-10-27T23:30';
    v.v['granja.llegada'] = '2026-10-28T01:00';
    const r = calcularViaje(v, cat);
    expect(r.segmentos.ida.min).toBe(90);
  });

  it('usa la duración capturada si faltan horarios y marca error si fin < inicio', () => {
    const v = nuevoViaje([]);
    v.v['lavado.dur'] = 45;
    v.v['p1.inicio'] = '2026-10-27T10:00';
    v.v['p1.fin'] = '2026-10-27T09:50';
    const r = calcularViaje(v, cat);
    expect(r.segmentos.lavado.min).toBe(45);
    expect(r.segmentos.lavado.fuente).toBe('captura');
    expect(r.segmentos.pesaje1.min).toBeNull();
    expect(r.nodos.pesaje1.estado).toBe('error');
  });

  it('no duplica el prelavado y la revisión documental simultáneos', () => {
    const v = nuevoViaje([]);
    Object.assign(v.v, {
      'llegada.hora': '2026-10-27T08:00',
      'prelavado.inicio': '2026-10-27T08:00', 'prelavado.fin': '2026-10-27T08:20',
      'docs.inicio': '2026-10-27T08:05', 'docs.fin': '2026-10-27T08:15',
    });
    const r = calcularViaje(v, cat);
    expect(r.nodos.llegada.min).toBe(20);
    expect(r.imputado.operativo).toBe(30);
    expect(r.solape).toBe(10);
    expect(r.nodos.llegada.estado).toBe('completo');
  });

  it('las actividades opcionales no bloquean el flujo', () => {
    const v = nuevoViaje([]);
    v.v['mant.aplica'] = false;
    v.v['diesel.aplica'] = false;
    v.v['lavado.hayFila'] = false;
    const r = calcularViaje(v, cat);
    expect(r.nodos.mant.estado).toBe('no_aplica');
    expect(r.nodos.diesel.estado).toBe('no_aplica');
    expect(r.nodos.lavado_espera.estado).toBe('no_aplica');
    expect(r.mantenimiento.costo).toBe(0);
    expect(r.nodos.mant_dec.estado).toBe('completo');
  });

  it('calcula toneladas netas con tara o peso vacío', () => {
    const v = nuevoViaje([]);
    v.v['p1.pesoVacio'] = 20000;
    v.v['p2.pesoBruto'] = 72500;
    let r = calcularViaje(v, cat);
    expect(r.toneladas.netas).toBe(52.5);
    expect(r.toneladas.fuenteTara).toBe('peso_vacio');
    v.v['p2.tara'] = 20500;
    r = calcularViaje(v, cat);
    expect(r.toneladas.netas).toBe(52);
  });

  it('no usa los litros cargados como consumo real', () => {
    const v = nuevoViaje([]);
    Object.assign(v.v, { 'diesel.aplica': true, 'diesel.litros': 400, 'diesel.precio': 25, 'ida.km': 60, 'reg.km': 60 });
    const r = calcularViaje(v, cat);
    expect(r.combustible.costoCarga).toBe(10000);
    expect(r.combustible.litrosConsumidos).toBeNull();
    expect(r.combustible.rendimiento).toBeNull();
    expect(r.combustible.calidad).toBe('insuficiente');
  });

  it('calcula rendimiento y costos con consumo medido por tramos', () => {
    const v = nuevoViaje([]);
    Object.assign(v.v, {
      'diesel.aplica': true, 'diesel.litros': 300, 'diesel.precio': 25,
      'ida.km': 60, 'reg.km': 60, 'ida.litros': 30, 'reg.litros': 20, 'desc.ptoTipo': 'Diésel', 'desc.ptoLitros': 10, 'desc.ton': 50,
    });
    const c = calcularViaje(v, cat).combustible;
    expect(c.calidad).toBe('medido');
    expect(c.litrosTraslado).toBe(50);
    expect(c.litrosConsumidos).toBe(60);
    expect(c.rendimiento).toBe(2.4);
    expect(c.lt100km).toBeCloseTo(41.67, 1);
    expect(c.costoConsumido).toBe(1500);
    expect(c.costoPorKm).toBe(12.5);
    expect(c.costoPorTon).toBe(30);
  });

  it('marca como estimado el consumo calculado con rendimiento de referencia', () => {
    const c2 = catalogosIniciales();
    c2.unidades.push({ id: 'u1', numero: 'U1', tipoUnidad: 'Full', configuracionId: '', capacidadTanque: null, rendimientoRef: 2, tomaFuerza: '', notas: '', activo: true });
    const v = nuevoViaje([], { unidadId: 'u1' });
    Object.assign(v.v, { 'ida.km': 50, 'reg.km': 50 });
    const c = calcularViaje(v, c2).combustible;
    expect(c.calidad).toBe('estimado');
    expect(c.litrosEstimados).toBe(50);
    expect(c.rendimiento).toBeNull();
  });

  it('calcula tiempos por etapa y total del ciclo', () => {
    const v = nuevoViaje([]);
    Object.assign(v.v, {
      'llegada.hora': '2026-10-27T06:00', 'salida.hora': '2026-10-27T10:00', 'granja.llegada': '2026-10-27T11:30',
      'salidaG.hora': '2026-10-27T14:00', 'reg.llegada': '2026-10-27T15:15',
    });
    const r = calcularViaje(v, cat);
    expect(r.etapas).toEqual({ planta: 240, ida: 90, granja: 150, regreso: 75 });
    expect(r.total).toBe(555);
    expect(r.real?.traslado).toBe(165);
    expect(r.real?.sinRegistro).toBe(390);
  });

  it('genera datos demo coherentes', () => {
    const d = espacioDemo();
    expect(d.viajes.length).toBeGreaterThan(10);
    for (const vj of d.viajes) {
      const r = calcularViaje(vj, d.catalogos);
      expect(r.alertas.filter((a) => /anterior/.test(a.texto)).length).toBe(0);
      for (const s of Object.values(r.segmentos)) expect(s.error).toBeNull();
    }
  });
});

describe('respaldos', () => {
  it('exporta e importa sin perder registros', () => {
    const a = almacenInicial();
    a.real.viajes.push(nuevoViaje([]));
    const leido = leerRespaldo(crearRespaldo(a));
    expect(leido.viajesReales).toBe(1);
    expect(leido.almacen.real.viajes[0].id).toBe(a.real.viajes[0].id);
    expect(() => leerRespaldo('{"x":1}')).toThrow();
  });
  it('genera CSV con encabezados y una fila por viaje', () => {
    const d = espacioDemo();
    const csv = csvViajes(d.viajes, d.catalogos, 'demo');
    expect(csv.split('\r\n').length).toBe(d.viajes.length + 1);
    expect(csv).toContain('DEMOSTRACIÓN');
  });
});
