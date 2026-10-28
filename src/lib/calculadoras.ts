// Calculadoras rápidas (funciones puras, sin interfaz).
// Reglas: un dato faltante no se interpreta como cero; los negativos y los ceros
// en divisores se rechazan; las estimaciones se identifican como tales.

export type N = number | null;

export interface Resultado<K extends string = string> {
  valores: Record<K, N>;
  faltan: string[];
  errores: string[];
  avisos: string[];
}

function base<K extends string>(claves: K[]): Resultado<K> {
  return { valores: Object.fromEntries(claves.map((k) => [k, null])) as Record<K, N>, faltan: [], errores: [], avisos: [] };
}

/** Valida un dato: obligatorio, no negativo y, si `positivo`, mayor que cero. */
function revisar(r: Resultado, nombre: string, x: N, opts: { obligatorio?: boolean; positivo?: boolean } = {}): boolean {
  const { obligatorio = true, positivo = false } = opts;
  if (x == null || !isFinite(x)) {
    if (obligatorio) r.faltan.push(nombre);
    return false;
  }
  if (x < 0) {
    r.errores.push(`${nombre}: no puede ser negativo.`);
    return false;
  }
  if (positivo && x === 0) {
    r.errores.push(`${nombre}: debe ser mayor que cero.`);
    return false;
  }
  return true;
}

const listo = (r: Resultado) => r.errores.length === 0 && r.faltan.length === 0;

// A. Rendimiento de combustible
export function calcRendimiento(km: N, litros: N) {
  const r = base(['kmL', 'l100']);
  const okK = revisar(r, 'Kilómetros recorridos', km, { positivo: true });
  const okL = revisar(r, 'Litros consumidos', litros, { positivo: true });
  if (okK && okL) {
    r.valores.kmL = km! / litros!;
    r.valores.l100 = (litros! / km!) * 100;
  }
  return r;
}

// B. Litros consumidos por viaje
export function calcLitrosViaje(km: N, rendimiento: N, rendimientoMedido: boolean) {
  const r = base(['litros']);
  const okK = revisar(r, 'Kilómetros recorridos', km);
  const okR = revisar(r, 'Rendimiento', rendimiento, { positivo: true });
  if (okK && okR) {
    r.valores.litros = km! / rendimiento!;
    r.avisos.push(
      rendimientoMedido
        ? 'Resultado calculado con un rendimiento medido; sigue siendo una estimación del consumo de este viaje.'
        : 'Estimación: el rendimiento no se midió directamente.',
    );
  }
  return r;
}

// C. Litros por tonelada
export function calcLitrosPorTon(litros: N, ton: N, baseTon: 'cargadas' | 'entregadas') {
  const r = base(['lt']);
  const okL = revisar(r, 'Litros consumidos', litros);
  const okT = revisar(r, `Toneladas ${baseTon}`, ton, { positivo: true });
  if (okL && okT) r.valores.lt = litros! / ton!;
  if (baseTon === 'cargadas') r.avisos.push('Calculado sobre toneladas cargadas; puede diferir de lo efectivamente entregado.');
  return r;
}

// D. Costo de combustible
export function calcCostoCombustible(litros: N, precio: N, tipo: 'consumidos' | 'cargados', km: N, ton: N) {
  const r = base(['costo', 'costoKm', 'costoTon']);
  const okL = revisar(r, `Litros ${tipo}`, litros);
  const okP = revisar(r, 'Precio por litro', precio, { positivo: true });
  const okK = revisar(r, 'Kilómetros', km, { obligatorio: false, positivo: true });
  const okT = revisar(r, 'Toneladas', ton, { obligatorio: false, positivo: true });
  if (okL && okP) {
    r.valores.costo = litros! * precio!;
    if (tipo === 'cargados') {
      r.avisos.push('Es el costo del combustible CARGADO (abastecimiento). Una recarga puede cubrir varios viajes: no equivale al costo del combustible consumido.');
      if (km != null || ton != null) r.avisos.push('El costo por kilómetro y por tonelada sólo se calcula con litros consumidos.');
    } else {
      if (okK) r.valores.costoKm = r.valores.costo / km!;
      if (okT) r.valores.costoTon = r.valores.costo / ton!;
    }
  }
  return r;
}

// E. Comparador de rendimiento
export interface DatosComparacion {
  km: N;
  litros: N;
  ton: N;
  precio: N;
}

export function calcComparador(a: DatosComparacion, b: DatosComparacion, comparables: boolean) {
  const r = base(['rendA', 'rendB', 'difRend', 'difPct', 'ltA', 'ltB', 'difLt', 'costoA', 'costoB', 'difCosto', 'costoKmA', 'costoKmB', 'costoTonA', 'costoTonB']);
  const lado = (d: DatosComparacion, n: 'A' | 'B') => {
    const okK = revisar(r, `Kilómetros (${n})`, d.km, { positivo: true });
    const okL = revisar(r, `Litros consumidos (${n})`, d.litros, { positivo: true });
    const okT = revisar(r, `Toneladas (${n})`, d.ton, { obligatorio: false, positivo: true });
    const okP = revisar(r, `Precio por litro (${n})`, d.precio, { obligatorio: false, positivo: true });
    const rend = okK && okL ? d.km! / d.litros! : null;
    const lt = okL && okT ? d.litros! / d.ton! : null;
    const costo = okL && okP ? d.litros! * d.precio! : null;
    return { rend, lt, costo, costoKm: costo != null && okK ? costo / d.km! : null, costoTon: costo != null && okT ? costo / d.ton! : null };
  };
  const A = lado(a, 'A');
  const B = lado(b, 'B');
  Object.assign(r.valores, {
    rendA: A.rend, rendB: B.rend, ltA: A.lt, ltB: B.lt, costoA: A.costo, costoB: B.costo,
    costoKmA: A.costoKm, costoKmB: B.costoKm, costoTonA: A.costoTon, costoTonB: B.costoTon,
  });
  if (A.rend != null && B.rend != null) {
    r.valores.difRend = B.rend - A.rend;
    r.valores.difPct = ((B.rend - A.rend) / A.rend) * 100;
  }
  if (A.lt != null && B.lt != null) r.valores.difLt = B.lt - A.lt;
  if (A.costo != null && B.costo != null) r.valores.difCosto = B.costo - A.costo;
  if (!comparables)
    r.avisos.push('Las rutas, cargas o condiciones de operación no se confirmaron como comparables: las diferencias no permiten concluir qué unidad es mejor.');
  if (r.valores.costoA != null && r.valores.costoB == null || r.valores.costoA == null && r.valores.costoB != null)
    r.avisos.push('Para comparar costos se necesita el precio por litro de ambos.');
  return r;
}

// F. Costo por mantenimiento
export interface DatosMantenimiento {
  manoObra: N;
  refacciones: N;
  aceites: N;
  servicios: N;
  otros: N;
  km: N;
}

export const ETIQUETAS_MANT: Record<keyof Omit<DatosMantenimiento, 'km'>, string> = {
  manoObra: 'Mano de obra',
  refacciones: 'Refacciones',
  aceites: 'Aceites y lubricantes',
  servicios: 'Servicios externos',
  otros: 'Otros costos',
};

export function calcMantenimiento(d: DatosMantenimiento) {
  const r = base(['total', 'costoKm']);
  const claves = Object.keys(ETIQUETAS_MANT) as (keyof typeof ETIQUETAS_MANT)[];
  let total = 0;
  let con = 0;
  const vacios: string[] = [];
  for (const k of claves) {
    const x = d[k];
    if (x == null) {
      vacios.push(ETIQUETAS_MANT[k]);
      continue;
    }
    if (revisar(r, ETIQUETAS_MANT[k], x)) {
      total += x;
      con++;
    }
  }
  if (con === 0 && r.errores.length === 0) r.faltan.push('Al menos un concepto de costo');
  if (r.errores.length === 0 && con > 0) {
    r.valores.total = total;
    if (vacios.length) r.avisos.push(`Total parcial: no se capturó ${vacios.join(', ')}. Si no aplica, captura 0.`);
    if (revisar(r, 'Kilómetros desde el último mantenimiento', d.km, { obligatorio: false, positivo: true })) r.valores.costoKm = total / d.km!;
    else if (d.km == null) r.avisos.push('Sin kilómetros desde el último mantenimiento no se calcula el costo por kilómetro.');
    if (r.valores.costoKm != null) r.avisos.push('Verifica que los kilómetros correspondan al mismo periodo que los costos capturados.');
  }
  return r;
}

// G. Tiempo de ralentí
export function calcRalenti(min: N, lph: N, precio: N, frecuencia: 'unica' | 'diaria', diasMes: N, lphMedido: boolean) {
  const r = base(['litros', 'costo', 'costoDia', 'costoMes', 'litrosMes']);
  const okM = revisar(r, 'Tiempo en ralentí', min);
  const okC = revisar(r, 'Consumo del motor en ralentí', lph);
  const okP = revisar(r, 'Precio por litro', precio, { obligatorio: false, positivo: true });
  if (okM && okC) {
    r.valores.litros = (min! / 60) * lph!;
    if (okP) r.valores.costo = r.valores.litros * precio!;
    else if (precio == null) r.avisos.push('Agrega el precio por litro para estimar el costo.');
    if (frecuencia === 'diaria') {
      r.valores.costoDia = r.valores.costo;
      if (revisar(r, 'Días de operación al mes', diasMes, { obligatorio: false, positivo: true })) {
        r.valores.litrosMes = r.valores.litros * diasMes!;
        if (r.valores.costo != null) r.valores.costoMes = r.valores.costo * diasMes!;
      } else if (diasMes == null) r.avisos.push('Indica los días de operación al mes para el acumulado mensual.');
    }
    if (!lphMedido) r.avisos.push('El consumo por hora es un dato estimado: los resultados son estimaciones.');
  }
  return r;
}

// H. Consumo durante la descarga
export function calcDescarga(min: N, tdf: 'Diésel' | 'Eléctrica' | '', litrosMedidos: N, lph: N, precio: N, ton: N) {
  const r = base(['litros', 'costo', 'costoTon', 'lt']);
  const okM = revisar(r, 'Duración de la descarga', min, { obligatorio: litrosMedidos == null });
  const okT = revisar(r, 'Toneladas descargadas', ton, { obligatorio: false, positivo: true });
  const okP = revisar(r, 'Precio por litro', precio, { obligatorio: false, positivo: true });
  if (!tdf) r.faltan.push('Tipo de toma de fuerza');
  let fuente: 'medido' | 'estimado' | null = null;
  if (litrosMedidos != null) {
    if (revisar(r, 'Litros medidos durante la descarga', litrosMedidos)) {
      r.valores.litros = litrosMedidos;
      fuente = 'medido';
    }
  } else if (lph != null) {
    if (revisar(r, 'Consumo por hora de la toma de fuerza', lph) && okM) {
      r.valores.litros = (min! / 60) * lph;
      fuente = 'estimado';
    }
  } else if (tdf === 'Diésel') {
    r.faltan.push('Litros medidos o consumo por hora de la toma de fuerza');
  }
  if (tdf === 'Eléctrica' && litrosMedidos == null && lph == null)
    r.avisos.push('Toma de fuerza eléctrica: no se registra consumo de diésel de la toma de fuerza. Si el motor permaneció encendido, captura su consumo medido o estimado.');
  if (tdf === 'Eléctrica')
    r.avisos.push('No se asume que el sistema eléctrico produzca ahorros: su costo (energía, equipo, mantenimiento) debe evaluarse por separado.');
  if (r.valores.litros != null) {
    if (okP) r.valores.costo = r.valores.litros * precio!;
    if (okT) r.valores.lt = r.valores.litros / ton!;
    if (r.valores.costo != null && okT) r.valores.costoTon = r.valores.costo / ton!;
    if (fuente === 'estimado') r.avisos.push('Litros estimados con consumo por hora × duración.');
  }
  return r;
}

export { listo };
