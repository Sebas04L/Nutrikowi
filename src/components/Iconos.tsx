// Iconografía lineal propia (sin dependencias externas). Trazo 1.6, 24×24.

import type { CSSProperties } from 'react';

const P: Record<string, string> = {
  // Proceso
  llegada: 'M2 16V7.5h11V16M13 10.5h4l3.5 3.2V16M2 16h1.5m5 0h6.5m5 0H22M7.5 18.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM17.5 18.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM16 4.5l2.5 0M17.25 3.25v2.5',
  decision: 'M12 3l9 9-9 9-9-9 9-9zM10 9.5a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9V13M12 15.6v.1',
  espera: 'M7 3h10M7 21h10M8 3v3.5a4 4 0 0 0 1.6 3.2L12 12l2.4-2.3A4 4 0 0 0 16 6.5V3M8 21v-3.5a4 4 0 0 1 1.6-3.2L12 12l2.4 2.3a4 4 0 0 1 1.6 3.2V21',
  lavado: 'M3 13h13v5H3zM16 15h3l2 2v1h-5M5.5 20.2a1.2 1.2 0 1 0 0-2.4M13.5 20.2a1.2 1.2 0 1 0 0-2.4M7 4.5c0 1.2-1 1.6-1 2.6a1 1 0 0 0 2 0c0-1-1-1.4-1-2.6zM12 3c0 1.4-1.2 1.9-1.2 3.1a1.2 1.2 0 0 0 2.4 0C13.2 4.9 12 4.4 12 3zM17 5c0 1.2-1 1.6-1 2.6a1 1 0 0 0 2 0c0-1-1-1.4-1-2.6z',
  mantenimiento: 'M14.7 6.3a4 4 0 0 0-5.2 5.2L3.6 17.4a1.5 1.5 0 0 0 2.1 2.1l5.9-5.9a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.4-.4-2.1 2.8-2z',
  diesel: 'M4 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 20h12M4 10h10M14 8h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8.5L18 5.5',
  autorizacion: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2.5 21v-1.5A5.5 5.5 0 0 1 8 14h2a5.5 5.5 0 0 1 3.4 1.2M15.5 18l2 2 4-4.5',
  bascula: 'M12 3v3M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7zM12 6v14M8 21h8',
  carga: 'M4 9l2 11h12l2-11H4zM9 9V5a3 3 0 0 1 6 0v4M12 12v5M9.5 14.5L12 17l2.5-2.5',
  factura: 'M6 3h9l4 4v14l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L7 21l-1-.6V3zM15 3v4h4M9 11h7M9 14.5h7M9 8h3',
  salida: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M3 12h12M10 7l5 5-5 5',
  ruta: 'M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16',
  granja: 'M3 21V10l9-6 9 6v11M3 21h18M9 21v-6h6v6M8.5 11.5h7',
  bioseguridad: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3zM9 12l2.2 2.2L15.5 10',
  hoja: 'M9 4h6v3H9zM15 5h2.5A1.5 1.5 0 0 1 19 6.5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-13A1.5 1.5 0 0 1 6.5 5H9M8.5 12h7M8.5 15.5h5',
  descarga: 'M4 4h16l-2 9H6L4 4zM12 13v7M9 17.5l3 3 3-3',
  regreso: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  ciclo: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4',
  // Interfaz
  mapa: 'M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4zM9 4v13.5M15 6.5V20',
  lista: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  indicadores: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  analisis: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3M8 11h6M11 8v6',
  catalogos: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H10l2 2h6.5A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13zM8 12h8M8 15.5h5',
  respaldo: 'M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  subir: 'M12 21V9M7 14l5-5 5 5M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2',
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6L6 18',
  izq: 'M15 18l-6-6 6-6',
  der: 'M9 18l6-6-6-6',
  abajo: 'M6 9l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alerta: 'M12 9v4.5M12 17h.01M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.1',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.2 2',
  copiar: 'M9 9h10.5A1.5 1.5 0 0 1 21 10.5v9A1.5 1.5 0 0 1 19.5 21h-9A1.5 1.5 0 0 1 9 19.5V9zM5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5',
  basura: 'M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6',
  editar: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  ajustes: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  comparar: 'M8 3v18M16 3v18M3 8h5M16 16h5M3 16h5M16 8h5',
  bandera: 'M5 21V4M5 4h11l-2 4 2 4H5',
  hipotesis: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z',
  combustible: 'M12 3c3 4 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 3-7 6-11zM9.5 15a2.5 2.5 0 0 0 2.5 2.5',
  filtro: 'M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  ojo: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  disco: 'M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 3v5h8V3M7 21v-7h10v7',
  matraz: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10',
  calculadora: 'M6 3h12a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 6 3zM8 7h8v3H8zM8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01',
  velocimetro: 'M4.5 17a8.5 8.5 0 1 1 15 0M12 13l4-5M12 13a1.2 1.2 0 1 0 0 .01M7 13h-.5M17.5 13H17M12 6.5V7',
  enviar: 'M4 12h12M12 6l6 6-6 6M20 5v14',
  motor: 'M5 9h3l1.5-2H14l1.5 2H18v3h2v-2M5 9v8h3l2 2h5l1.5-3H18v-4M2 11v4M5 13H2',
  capas: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  validar: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3zM9 12l2.2 2.2L15.5 10',
};

export type NombreIcono = keyof typeof P;

export function Icono({ n, size = 18, style, className }: { n: string; size?: number; style?: CSSProperties; className?: string }) {
  const d = P[n] ?? P.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
