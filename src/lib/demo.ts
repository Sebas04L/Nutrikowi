// Datos de demostración. TODO lo que se genera aquí es FICTICIO y vive en un
// espacio de trabajo separado de los registros reales.

import type { Catalogos, EspacioTrabajo, Evento, Tramo, Viaje } from '../types';
import { catalogosIniciales, configViajeVacia, eventoVacio, revisionVacia, tramoVacio } from './datosBase';
import { uid } from './ids';
import { calcularViaje } from './calculos';
import { calidadViaje } from './calidad';
import { hoyStr, sumarDias, toDT, parseDT } from './tiempo';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function catalogosDemo(): Catalogos {
  const c = catalogosIniciales();
  c.granjas = [
    { id: 'dg1', nombre: 'Granja Demo El Álamo', ubicacion: 'Ubicación ficticia', procedimientoBio: 'Colocación de equipo de bioseguridad', notas: 'Dato de demostración', activo: true },
    { id: 'dg2', nombre: 'Granja Demo Los Sauces', ubicacion: 'Ubicación ficticia', procedimientoBio: 'Baño', notas: 'Dato de demostración', activo: true },
    { id: 'dg3', nombre: 'Granja Demo La Loma', ubicacion: 'Ubicación ficticia', procedimientoBio: 'Colocación de equipo de bioseguridad', notas: 'Dato de demostración', activo: true },
  ];
  c.rutas = [
    { id: 'dr1', nombre: 'Ruta demo 1 · El Álamo', granjaId: 'dg1', km: 64, kmTerraceria: 6, notas: 'Dato de demostración', activo: true },
    { id: 'dr2', nombre: 'Ruta demo 2 · Los Sauces', granjaId: 'dg2', km: 112, kmTerraceria: 14, notas: 'Dato de demostración', activo: true },
    { id: 'dr3', nombre: 'Ruta demo 3 · La Loma', granjaId: 'dg3', km: 38, kmTerraceria: 9, notas: 'Dato de demostración', activo: true },
  ];
  c.unidades = [
    { id: 'du1', numero: 'DEMO-01', tipoUnidad: 'Full', configuracionId: 'cfg-full-2x28', capacidadTanque: 700, rendimientoRef: 2.3, tomaFuerza: 'Diésel', notas: 'Dato de demostración', activo: true },
    { id: 'du2', numero: 'DEMO-02', tipoUnidad: 'Full', configuracionId: 'cfg-full-2x28', capacidadTanque: 700, rendimientoRef: null, tomaFuerza: 'Diésel', notas: 'Dato de demostración', activo: true },
    { id: 'du3', numero: 'DEMO-03', tipoUnidad: 'Tractocamión', configuracionId: 'cfg-tracto-38', capacidadTanque: 500, rendimientoRef: 2.7, tomaFuerza: 'Eléctrica', notas: 'Dato de demostración', activo: true },
    { id: 'du4', numero: 'DEMO-04', tipoUnidad: 'Tractocamión', configuracionId: 'cfg-tracto-cil-28', capacidadTanque: 500, rendimientoRef: null, tomaFuerza: 'Diésel', notas: 'Dato de demostración', activo: true },
  ];
  c.choferes = [
    { id: 'dc1', nombre: 'Chofer demo A', notas: 'Dato de demostración', activo: true },
    { id: 'dc2', nombre: 'Chofer demo B', notas: 'Dato de demostración', activo: true },
    { id: 'dc3', nombre: 'Chofer demo C', notas: 'Dato de demostración', activo: true },
    { id: 'dc4', nombre: 'Chofer demo D', notas: 'Dato de demostración', activo: true },
  ];
  c.tiemposReferencia = { lavado: 50, carga: 60, esperaAut: 25, descarga: 70 };
  return c;
}

interface Plan {
  unidad: string;
  chofer: string;
  ruta: string;
  hastaNodo?: 'carga' | 'descarga';
}

export function espacioDemo(): EspacioTrabajo {
  const cat = catalogosDemo();
  const r = rng(20261027);
  const rnd = (a: number, b: number) => a + (b - a) * r();
  const ri = (a: number, b: number) => Math.round(rnd(a, b));
  const hoy = hoyStr();

  const planes: Plan[] = [
    { unidad: 'du1', chofer: 'dc1', ruta: 'dr1' }, { unidad: 'du2', chofer: 'dc2', ruta: 'dr1' }, { unidad: 'du3', chofer: 'dc3', ruta: 'dr2' },
    { unidad: 'du4', chofer: 'dc4', ruta: 'dr3' }, { unidad: 'du1', chofer: 'dc1', ruta: 'dr2' }, { unidad: 'du2', chofer: 'dc2', ruta: 'dr1' },
    { unidad: 'du3', chofer: 'dc3', ruta: 'dr2' }, { unidad: 'du4', chofer: 'dc4', ruta: 'dr3' }, { unidad: 'du1', chofer: 'dc1', ruta: 'dr1' },
    { unidad: 'du2', chofer: 'dc2', ruta: 'dr1' }, { unidad: 'du3', chofer: 'dc3', ruta: 'dr2' }, { unidad: 'du4', chofer: 'dc4', ruta: 'dr3' },
    { unidad: 'du1', chofer: 'dc1', ruta: 'dr1', hastaNodo: 'descarga' }, { unidad: 'du2', chofer: 'dc2', ruta: 'dr3', hastaNodo: 'carga' },
  ];

  const viajes: Viaje[] = [];
  const ultimaLlegada: Record<string, number> = {};
  const inicioBase = parseDT(`${sumarDias(hoy, -9)}T06:10`)!;

  planes.forEach((p, idx) => {
    const unidad = cat.unidades.find((u) => u.id === p.unidad)!;
    const cfg = cat.configuraciones.find((c) => c.id === unidad.configuracionId)!;
    const ruta = cat.rutas.find((x) => x.id === p.ruta)!;
    const granja = cat.granjas.find((g) => g.id === ruta.granjaId)!;
    const v: Viaje['v'] = {};
    const inc: Evento[] = [];
    const tramos: Tramo[] = [];
    const estimados: Viaje['estimados'] = {};
    const clasif: Viaje['clasif'] = {};
    const M = 60000;
    let t = ultimaLlegada[p.unidad] != null ? ultimaLlegada[p.unidad] + ri(5, 40) * M : inicioBase + ri(0, 180) * M + idx * 30 * M;
    const set = (k: string, ms: number) => (v[k] = toDT(ms));
    const addInc = (nodo: string | null, i: Partial<Evento>) => inc.push({ ...eventoVacio(i.tipo ?? 'Otro', nodo), ...i });

    // Etapa A
    set('llegada.hora', t);
    const pre0 = t + ri(2, 6) * M;
    set('prelavado.inicio', pre0);
    set('prelavado.fin', pre0 + ri(14, 24) * M);
    const doc0 = pre0 + ri(3, 8) * M; // ocurre en paralelo con el prelavado
    set('docs.inicio', doc0);
    set('docs.fin', doc0 + ri(8, 18) * M);
    if (idx === 2) {
      v['llegada.pendientes'] = 'Faltaba firma en la remisión (dato ficticio).';
      addInc('llegada', { tipo: 'Espera en planta', motivo: 'Remisión sin firma', observaciones: 'Se esperó al supervisor (ficticio).', duracionMin: 12, motor: 'apagado', lugar: 'Planta' });
    }
    t = Math.max(parseDT(v['prelavado.fin'])!, parseDT(v['docs.fin'])!);
    const fila = r() < 0.45;
    v['lavado.hayFila'] = fila;
    v['lavado.posicion'] = r() < 0.5 ? 'Posición 1' : 'Posición 2';
    if (fila) {
      set('lavado.entradaFila', t + ri(1, 4) * M);
      t = parseDT(v['lavado.entradaFila'])! + ri(12, 55) * M;
    } else t += ri(1, 5) * M;
    set('lavado.inicio', t);
    t += ri(36, 58) * M;
    set('lavado.fin', t);
    const mant = r() < 0.25;
    v['mant.aplica'] = mant;
    if (mant) {
      t += ri(3, 10) * M;
      set('mant.inicio', t);
      t += ri(30, 95) * M;
      set('mant.fin', t);
      v['mant.tipo'] = r() < 0.5 ? 'Preventivo' : 'Llantas';
      v['mant.costoMO'] = ri(4, 12) * 100;
      v['mant.costoMat'] = ri(3, 30) * 100;
      v['mant.obs'] = 'Registro ficticio de demostración.';
    }
    const diesel = r() < 0.55;
    v['diesel.aplica'] = diesel;
    if (diesel) {
      t += ri(3, 10) * M;
      set('diesel.inicio', t);
      t += ri(12, 22) * M;
      set('diesel.fin', t);
      v['diesel.litros'] = ri(26, 46) * 10;
      v['diesel.precio'] = 25.9;
    }
    t += ri(1, 4) * M;
    set('aut.inicio', t);
    t += ri(6, 42) * M;
    set('aut.fin', t);
    set('aut.hora', t);
    t += ri(1, 3) * M;
    set('p1.inicio', t);
    t += ri(5, 9) * M;
    set('p1.fin', t);
    const pesoVacio = (cfg.tipoUnidad === 'Full' ? ri(195, 215) : ri(140, 160)) * 100;
    v['p1.pesoVacio'] = pesoVacio;
    set('carga.listo', t - ri(0, 25) * M);
    set('carga.autorizacion', t + ri(1, 6) * M);
    t = parseDT(v['carga.autorizacion'])! + ri(2, 10) * M;
    set('carga.inicio', t);
    t += ri(38, 72) * M;
    set('carga.fin', t);
    const cap = cfg.capacidadNominal ?? 28;
    const ton = Math.round(rnd(cap * 0.88, cap * 0.97) * 100) / 100;
    v['carga.ton'] = ton;
    v['carga.tipoAlimento'] = r() < 0.65 ? 'Pellet' : 'Harina';
    v['carga.compartimentos'] = (cfg.compartimentosPorTolva ?? 4) * (cfg.numTolvas ?? 1);
    if (p.hastaNodo === 'carga') {
      viajes.push(armar(p, cfg, ruta, granja.nombre, v, inc, clasif, cap, idx, tramos, estimados));
      return;
    }
    t += ri(2, 6) * M;
    set('p2.inicio', t);
    t += ri(5, 8) * M;
    set('p2.fin', t);
    v['p2.pesoBruto'] = pesoVacio + Math.round(ton * 1000) + ri(-60, 60);
    if (r() < 0.6) v['p2.tara'] = pesoVacio;
    t += ri(1, 4) * M;
    set('fact.inicio', t);
    t += ri(10, 26) * M;
    set('fact.fin', t);
    t += ri(2, 8) * M;
    set('salida.hora', t);

    // Etapa B
    const kmIda = Math.round((ruta.km! + rnd(-1.5, 1.5)) * 10) / 10;
    v['ida.km'] = kmIda;
    let durIda = (kmIda / rnd(44, 58)) * 60;
    if (r() < 0.2) {
      const extra = ri(20, 45);
      durIda += extra;
      addInc('ida', { tipo: 'Camino complicado', motivo: 'Tramo de terracería en mal estado', observaciones: 'Dato ficticio.', duracionMin: extra, motor: 'encendido', consumo: null, afectoEntrega: true, lugar: 'Acceso a granja' });
      clasif['ida'] = { estado: 'excepcion', nota: 'Condición del camino (ficticio).' };
    }
    // Tramos de velocidad (ficticios) en algunos viajes: carretera + acceso de terracería
    if (idx % 3 === 0 && ruta.kmTerraceria) {
      const salida = t;
      const minTerr = Math.round((ruta.kmTerraceria / rnd(20, 30)) * 60);
      const minCarr = Math.round(durIda) - minTerr;
      tramos.push({ ...tramoVacio('ida', 'carretera'), km: Math.round((kmIda - ruta.kmTerraceria) * 10) / 10, inicio: toDT(salida), fin: toDT(salida + minCarr * M), velMax: idx === 6 ? 86 : ri(68, 79), observaciones: 'Dato ficticio.' });
      tramos.push({ ...tramoVacio('ida', 'terraceria'), km: ruta.kmTerraceria, inicio: toDT(salida + minCarr * M), fin: toDT(salida + Math.round(durIda) * M), velMax: ri(26, 34), observaciones: 'Dato ficticio.' });
    }
    if (idx === 4) addInc('ida', { tipo: 'Parada operativa', motivo: 'Revisión de lonas y flejes', inicio: toDT(t + 30 * M), fin: toDT(t + 38 * M), motor: 'encendido', consumo: 'estimado', litros: 0.6, lugar: 'Km 40 (ficticio)', odoInicio: 120540, odoFin: 120540 });
    t += Math.round(durIda) * M;
    set('granja.llegada', t);
    t += ri(2, 6) * M;
    set('pg1.inicio', t);
    t += ri(5, 10) * M;
    set('pg1.fin', t);
    t += ri(2, 6) * M;
    set('lavg.inicio', t);
    t += ri(20, 36) * M;
    set('lavg.fin', t);
    v['bio.proc'] = granja.procedimientoBio;
    t += ri(2, 6) * M;
    set('bio.inicio', t);
    t += (granja.procedimientoBio === 'Baño' ? ri(25, 40) : ri(12, 20)) * M;
    set('bio.fin', t);
    t += ri(2, 5) * M;
    set('hoja.entrega', t);
    t += ri(5, 12) * M;
    set('hoja.fin', t);
    const espDesc = r() < 0.35;
    v['desc.huboEspera'] = espDesc;
    if (espDesc) {
      set('desc.esperaInicio', t);
      t += ri(10, 45) * M;
      set('desc.esperaFin', t);
    } else t += ri(1, 4) * M;
    set('desc.inicio', t);
    t += ri(42, 85) * M;
    set('desc.fin', t);
    v['desc.ton'] = Math.round((ton - rnd(0, 0.15)) * 100) / 100;
    v['desc.compartimentos'] = v['carga.compartimentos'];
    v['desc.apoyo'] = r() < 0.4;
    v['desc.ptoTipo'] = unidad.tomaFuerza;
    if (unidad.tomaFuerza === 'Diésel' && r() < 0.5) v['desc.ptoLitros'] = ri(6, 14);
    if (idx === 6) {
      addInc('descarga', { tipo: 'Falla mecánica', motivo: 'Compuerta de tolva atorada', observaciones: 'Dato ficticio.', duracionMin: 25, motor: 'encendido', desperfecto: true, afectoEntrega: true, lugar: 'Granja' });
      clasif['descarga'] = { estado: 'investigar', nota: 'Revisar mantenimiento de compuertas (ficticio).' };
    }
    if (p.hastaNodo === 'descarga') {
      viajes.push(armar(p, cfg, ruta, granja.nombre, v, inc, clasif, cap, idx, tramos, estimados));
      return;
    }
    t += ri(2, 6) * M;
    set('pg2.inicio', t);
    t += ri(5, 8) * M;
    set('pg2.fin', t);
    set('biof.inicio', t + ri(1, 3) * M);
    t = parseDT(v['biof.inicio'])! + ri(8, 18) * M;
    set('biof.fin', t);
    set('biof.entrega', t);
    t += ri(2, 6) * M;
    set('salidaG.hora', t);

    // Etapa C
    const kmReg = Math.round((ruta.km! + rnd(-1.5, 1.5)) * 10) / 10;
    v['reg.km'] = kmReg;
    const durReg = Math.round((kmReg / rnd(48, 62)) * 60);
    if (ruta.km! > 100) addInc('regreso', { tipo: 'Descanso del chofer', motivo: 'Descanso programado', inicio: toDT(t + 40 * M), fin: toDT(t + 55 * M), motor: 'apagado', consumo: 'sin_consumo', lugar: 'Parador (ficticio)' });
    t += (durReg + (ruta.km! > 100 ? 15 : 0)) * M;
    set('reg.llegada', t);
    ultimaLlegada[p.unidad] = t;

    // Combustible (mezcla deliberada de casos medidos, estimados e insuficientes)
    const rend = cfg.tipoUnidad === 'Full' ? rnd(2.0, 2.6) : rnd(2.5, 3.1);
    const caso = idx % 5;
    if (caso <= 2) {
      v['ida.litros'] = Math.round((kmIda / (rend * 0.95)) * 10) / 10; // cargado: rinde menos
      v['reg.litros'] = Math.round((kmReg / (rend * 1.1)) * 10) / 10;
      v['comb.metodo'] = 'Telemetría / computadora de motor';
    } else if (caso === 3) {
      v['comb.consumoTotal'] = Math.round(((kmIda + kmReg) / rend + (Number(v['desc.ptoLitros']) || 0)) * 10) / 10;
      v['comb.metodo'] = 'Llenado a tanque lleno';
    }
    if (!diesel) v['comb.precioRef'] = 25.9;
    if (idx === 9 && v['ida.litros'] != null) {
      estimados['ida.litros'] = true;
      estimados['reg.litros'] = true;
    }
    viajes.push(armar(p, cfg, ruta, granja.nombre, v, inc, clasif, cap, idx, tramos, estimados));
  });

  const hipotesis = [
    { id: uid(), fecha: sumarDias(hoy, -2), actividad: 'autorizacion', texto: 'La espera de autorización podría concentrarse en el cambio de turno (hipótesis ficticia).', evidencia: 'Comparar horas de llegada vs. espera en viajes demo.', estado: 'abierta' as const },
    { id: uid(), fecha: sumarDias(hoy, -1), actividad: 'lavado_espera', texto: 'Las filas de lavado coinciden con llegadas agrupadas (hipótesis ficticia).', evidencia: '', estado: 'en_analisis' as const },
  ];
  // Algunos viajes completos se marcan como validados (validación ficticia).
  let validados = 0;
  for (const vj of viajes) {
    if (validados >= 4) break;
    if (calidadViaje(vj, calcularViaje(vj, cat)).estado === 'listo') {
      vj.revision = { ...vj.revision, validado: new Date().toISOString(), responsable: 'Supervisor demo', nota: 'Validación ficticia de demostración.' };
      validados++;
    }
  }
  return { catalogos: cat, viajes, hipotesis };

  function armar(
    p: Plan, cfg: Catalogos['configuraciones'][number], ruta: Catalogos['rutas'][number], _g: string,
    v: Viaje['v'], inc: Evento[], clasif: Viaje['clasif'], cap: number, idx: number, tramos: Tramo[], estimados: Viaje['estimados'],
  ): Viaje {
    const llegada = String(v['llegada.hora']);
    const fecha = llegada.slice(0, 10);
    const c = configViajeVacia(fecha);
    Object.assign(c, {
      folio: `DEMO-${String(idx + 1).padStart(3, '0')}`,
      granjaId: ruta.granjaId, rutaId: ruta.id, unidadId: p.unidad, choferId: p.chofer,
      tipoUnidad: cfg.tipoUnidad, configuracionId: cfg.id, tipoTolva: cfg.tipoTolva, numTolvas: cfg.numTolvas,
      compartimentosPorTolva: cfg.compartimentosPorTolva, capacidadNominal: cap,
      tipoAlimento: String(v['carga.tipoAlimento'] ?? 'Pellet'), toneladasProgramadas: Math.round(cap * 0.95),
      kmEstimados: ruta.km, observaciones: 'Viaje FICTICIO de demostración.',
    });
    const ahora = new Date().toISOString();
    const revision = revisionVacia();
    return { id: uid(), creado: ahora, actualizado: ahora, config: c, v, estimados, eventos: inc, tramos, clasif, revision, plantillaDe: null, cicloAnterior: null };
  }
}
