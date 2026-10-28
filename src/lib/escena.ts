// Disposición del recorrido ilustrado (coordenadas de diseño, independientes de la pantalla).
// El ciclo se dibuja como un circuito cerrado:
//   Planta (fila superior: pasos 4–8, de izquierda a derecha)
//   → carretera de ida (paso 9) → Granja (fila superior: 10–13; fila inferior: 14–16)
//   → carretera de regreso (paso 17) → Planta (fila inferior: llegada y pasos 1–3) → paso 4…
// Las decisiones abren ramales por debajo de la línea principal.

export const ESCENA = { W: 1440, H: 652 };

export const FILA = { arriba: 262, abajo: 440, rama: 548 };

export const ZONAS = {
  planta: { x: 14, y: 14, w: 702, h: 624 },
  ruta: { x0: 716, x1: 1000 },
  granja: { x: 1000, y: 14, w: 426, h: 624 },
};

export type Direccion = 'der' | 'izq';

export interface PosNodo {
  x: number;
  y: number;
  dir: Direccion;
  forma: 'estacion' | 'rombo' | 'pildora';
}

export const POS: Record<string, PosNodo> = {
  // Planta · fila inferior (de derecha a izquierda): recepción, lavado y servicio
  cierre: { x: 716, y: FILA.abajo, dir: 'izq', forma: 'estacion' },
  llegada: { x: 636, y: FILA.abajo, dir: 'izq', forma: 'estacion' },
  lavado_dec: { x: 566, y: FILA.abajo, dir: 'izq', forma: 'rombo' },
  lavado_espera: { x: 512, y: FILA.rama, dir: 'izq', forma: 'estacion' },
  lavado: { x: 400, y: FILA.abajo, dir: 'izq', forma: 'estacion' },
  mant_dec: { x: 346, y: FILA.abajo, dir: 'izq', forma: 'rombo' },
  mant: { x: 294, y: FILA.rama, dir: 'izq', forma: 'estacion' },
  diesel_dec: { x: 206, y: FILA.abajo, dir: 'izq', forma: 'rombo' },
  diesel: { x: 154, y: FILA.rama, dir: 'izq', forma: 'estacion' },
  // Planta · fila superior: báscula, carga y despacho
  autorizacion: { x: 106, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  pesaje1: { x: 218, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  carga: { x: 330, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  pesaje2: { x: 442, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  factura: { x: 554, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  salida_planta: { x: 664, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  // Carreteras
  ida: { x: 858, y: FILA.arriba, dir: 'der', forma: 'pildora' },
  regreso: { x: 858, y: FILA.abajo, dir: 'izq', forma: 'pildora' },
  // Granja
  granja_llegada: { x: 1062, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  lavado_granja: { x: 1160, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  bio: { x: 1258, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  hoja: { x: 1356, y: FILA.arriba, dir: 'der', forma: 'estacion' },
  descarga: { x: 1340, y: FILA.abajo, dir: 'izq', forma: 'estacion' },
  pesaje_bio_final: { x: 1218, y: FILA.abajo, dir: 'izq', forma: 'estacion' },
  salida_granja: { x: 1092, y: FILA.abajo, dir: 'izq', forma: 'estacion' },
};

/** Puntos de unión de los ramales opcionales. */
export const UNIONES: Record<string, { x: number; y: number }> = {
  '@jA': { x: 458, y: FILA.abajo },
  '@jB': { x: 242, y: FILA.abajo },
  '@jC': { x: 102, y: FILA.abajo },
};

export interface TramoEscena {
  de: string;
  a: string;
  via?: [number, number][];
  /** Ramal Sí/No de una decisión: se atenúa el que no aplica. */
  rama?: { campo: string; valor: boolean };
  tipo?: 'carretera' | 'ciclo';
  etiqueta?: string;
}

const R = FILA.rama;
const A = FILA.abajo;
const S = FILA.arriba;

export const TRAMOS: TramoEscena[] = [
  { de: 'llegada', a: 'lavado_dec' },
  { de: 'lavado_dec', a: '@jA', rama: { campo: 'lavado.hayFila', valor: false }, etiqueta: 'No' },
  { de: 'lavado_dec', a: 'lavado_espera', via: [[566, R]], rama: { campo: 'lavado.hayFila', valor: true }, etiqueta: 'Sí' },
  { de: 'lavado_espera', a: '@jA', via: [[458, R]], rama: { campo: 'lavado.hayFila', valor: true } },
  { de: '@jA', a: 'lavado' },
  { de: 'lavado', a: 'mant_dec' },
  { de: 'mant_dec', a: '@jB', rama: { campo: 'mant.aplica', valor: false }, etiqueta: 'No' },
  { de: 'mant_dec', a: 'mant', via: [[346, R]], rama: { campo: 'mant.aplica', valor: true }, etiqueta: 'Sí' },
  { de: 'mant', a: '@jB', via: [[242, R]], rama: { campo: 'mant.aplica', valor: true } },
  { de: '@jB', a: 'diesel_dec' },
  { de: 'diesel_dec', a: '@jC', rama: { campo: 'diesel.aplica', valor: false }, etiqueta: 'No' },
  { de: 'diesel_dec', a: 'diesel', via: [[206, R]], rama: { campo: 'diesel.aplica', valor: true }, etiqueta: 'Sí' },
  { de: 'diesel', a: '@jC', via: [[102, R]], rama: { campo: 'diesel.aplica', valor: true } },
  { de: '@jC', a: 'autorizacion', via: [[52, A], [52, S]] },
  { de: 'autorizacion', a: 'pesaje1' },
  { de: 'pesaje1', a: 'carga' },
  { de: 'carga', a: 'pesaje2' },
  { de: 'pesaje2', a: 'factura' },
  { de: 'factura', a: 'salida_planta' },
  { de: 'salida_planta', a: 'ida', tipo: 'carretera' },
  { de: 'ida', a: 'granja_llegada', tipo: 'carretera' },
  { de: 'granja_llegada', a: 'lavado_granja' },
  { de: 'lavado_granja', a: 'bio' },
  { de: 'bio', a: 'hoja' },
  { de: 'hoja', a: 'descarga', via: [[1404, S], [1404, A]] },
  { de: 'descarga', a: 'pesaje_bio_final' },
  { de: 'pesaje_bio_final', a: 'salida_granja' },
  { de: 'salida_granja', a: 'regreso', tipo: 'carretera' },
  { de: 'regreso', a: 'cierre', tipo: 'carretera' },
  { de: 'cierre', a: 'llegada', tipo: 'ciclo' },
];

export function punto(id: string): { x: number; y: number } {
  return POS[id] ?? UNIONES[id];
}

/** Puntos de un tramo (origen, intermedios, destino). */
export function puntosTramo(t: TramoEscena): [number, number][] {
  const a = punto(t.de);
  const b = punto(t.a);
  return [[a.x, a.y], ...(t.via ?? []), [b.x, b.y]];
}

/** Trazo con esquinas redondeadas. */
export function rutaSuave(pts: [number, number][], radio = 18): string {
  const p = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 0.5);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0);
    const d2 = Math.hypot(x2 - x1, y2 - y1);
    const r = Math.min(radio, d1 / 2, d2 / 2);
    d += ` L${x1 - ((x1 - x0) / d1) * r},${y1 - ((y1 - y0) / d1) * r} Q${x1},${y1} ${x1 + ((x2 - x1) / d2) * r},${y1 + ((y2 - y1) / d2) * r}`;
  }
  const u = p[p.length - 1];
  return `${d} L${u[0]},${u[1]}`;
}

/** Puntos medios de los segmentos largos, con su ángulo, para dibujar flechas de sentido. */
export function chevrones(pts: [number, number][], minLargo = 70): { x: number; y: number; ang: number }[] {
  const out: { x: number; y: number; ang: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const l = Math.hypot(x1 - x0, y1 - y0);
    if (l < minLargo) continue;
    out.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, ang: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI });
  }
  return out;
}
