// Ilustraciones SVG originales y ligeras, con un estilo común (trazo grafito,
// rellenos marfil y naranja de la marca). No dependen de imágenes externas.

import type { CSSProperties } from 'react';
import type { Catalogos, ConfigViaje } from '../types';

const T = {
  trazo: '#3a312b',
  tinta: '#2a2420',
  relleno: '#f3e9dc',
  relleno2: '#e9dac7',
  relleno3: '#dcc7ae',
  cuerpo: '#d96d12',
  cuerpoLuz: '#f2903e',
  cabina: '#2b302e',
  cabinaLuz: '#444b48',
  vidrio: '#dfe6e8',
  llanta: '#222725',
  rin: '#a3a89f',
  chasis: '#3b4240',
  suelo: '#d6ccb6',
  cerdo: '#a49a86',
  arbol: '#cfe0c9',
};

export type TipoCamion = 'full' | 'tolva' | 'cilindrica' | 'generico';

/** Determina el tipo de ilustración a partir de la configuración del viaje. */
export function tipoCamionDe(config: Pick<ConfigViaje, 'configuracionId' | 'tipoTolva' | 'numTolvas' | 'tipoUnidad'>, cat?: Catalogos): TipoCamion {
  const cfg = cat?.configuraciones.find((c) => c.id === config.configuracionId);
  const tolva = `${config.tipoTolva} ${cfg?.tipoTolva ?? ''} ${cfg?.nombre ?? ''}`.toLowerCase();
  const tipo = `${config.tipoUnidad} ${cfg?.tipoUnidad ?? ''}`.toLowerCase();
  if (/cil[ií]ndric/.test(tolva)) return 'cilindrica';
  if ((config.numTolvas ?? cfg?.numTolvas ?? 0) >= 2 || /full/.test(tipo)) return 'full';
  if (/tolva|tracto/.test(tolva + tipo)) return 'tolva';
  return 'generico';
}

function Rueda({ x, y = 55, r = 7 }: { x: number; y?: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={T.llanta} />
      <circle cx={x} cy={y} r={r * 0.42} fill={T.rin} />
    </g>
  );
}

function Tracto({ x }: { x: number }) {
  // Tractocamión convencional (cofre largo) mirando a la derecha. Ancho ≈ 50.
  return (
    <g>
      <rect x={x - 6} y={44} width={58} height={4.5} rx={1.5} fill={T.chasis} />
      <path d={`M${x} 47 V22 Q${x} 17 ${x + 5} 17 H${x + 24} Q${x + 28} 17 ${x + 30} 21 L${x + 34} 30 H${x + 41} Q${x + 47.5} 30 ${x + 48} 37 V47 Z`} fill={T.cabina} />
      <path d={`M${x + 1.5} 24 H${x + 30.5}`} stroke={T.cuerpoLuz} strokeWidth={2.2} />
      <path d={`M${x + 13} 21 H${x + 24} Q${x + 26} 21 ${x + 27} 23 L${x + 30.5} 30 H${x + 13} Z`} fill={T.vidrio} />
      <rect x={x + 6} y={5} width={2.6} height={14} rx={1.2} fill={T.cabinaLuz} />
      <rect x={x + 44} y={33} width={4.5} height={4} rx={1} fill="#f1d38c" />
      <path d={`M${x + 34} 33 V44 M${x + 37.5} 33 V44 M${x + 41} 33 V44`} stroke={T.cabinaLuz} strokeWidth={1} />
      <Rueda x={x - 2} />
      <Rueda x={x + 12} />
      <Rueda x={x + 40} />
    </g>
  );
}

function Escotillas({ x0, x1, n, y }: { x0: number; x1: number; n: number; y: number }) {
  const ancho = (x1 - x0) / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x0 + i * ancho + ancho * 0.22} y={y - 3.2} width={ancho * 0.56} height={3.2} rx={1.2} fill={T.tinta} />
      ))}
    </g>
  );
}

function TolvaRect({ x0, x1, conos, escotillas }: { x0: number; x1: number; conos: number; escotillas: number }) {
  const w = x1 - x0;
  const margen = 9;
  const anchoCono = (w - margen * 2) / conos;
  return (
    <g>
      <rect x={x0} y={12} width={w} height={21} rx={3} fill={T.cuerpo} />
      <rect x={x0} y={14.5} width={w} height={3} fill={T.cuerpoLuz} opacity={0.55} />
      {Array.from({ length: Math.floor(w / 11) }, (_, i) => (
        <path key={i} d={`M${x0 + 6 + i * 11} 19 V31`} stroke="#ffffff" strokeOpacity={0.1} strokeWidth={1.2} />
      ))}
      {Array.from({ length: conos }, (_, i) => {
        const a = x0 + margen + i * anchoCono + 2;
        const b = a + anchoCono - 4;
        return <path key={i} d={`M${a} 33 H${b} L${b - anchoCono * 0.22} 43 H${a + anchoCono * 0.22} Z`} fill={T.cuerpo} />;
      })}
      <Escotillas x0={x0 + 4} x1={x1 - 4} n={escotillas} y={12} />
    </g>
  );
}

function TolvaCil({ x0, x1, escotillas }: { x0: number; x1: number; escotillas: number }) {
  const w = x1 - x0;
  return (
    <g>
      {Array.from({ length: 4 }, (_, i) => {
        const a = x0 + 16 + i * ((w - 32) / 4);
        return <path key={i} d={`M${a} 34 H${a + 14} L${a + 11} 43 H${a + 3} Z`} fill={T.cuerpo} />;
      })}
      <rect x={x0} y={10} width={w} height={27} rx={13.5} fill={T.cuerpo} />
      <rect x={x0 + 6} y={14} width={w - 12} height={3.5} rx={1.75} fill={T.cuerpoLuz} opacity={0.6} />
      <path d={`M${x0 + 8} 30 H${x1 - 8}`} stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1.4} />
      <Escotillas x0={x0 + 10} x1={x1 - 10} n={escotillas} y={10} />
    </g>
  );
}

/** Ilustración lateral de la unidad: full con dos tolvas, tolva individual o tolva cilíndrica. */
export function Camion({ tipo, compartimentos, ancho, style, className, titulo, x, y }: {
  tipo: TipoCamion; compartimentos?: number | null; ancho?: number; style?: CSSProperties; className?: string; titulo?: string; x?: number; y?: number;
}) {
  const comp = compartimentos && compartimentos > 0 && compartimentos <= 12 ? compartimentos : null;
  const vb = tipo === 'full' ? 252 : 204;
  return (
    <svg viewBox={`0 0 ${vb} 64`} x={x} y={y} width={ancho} height={ancho != null ? (ancho * 64) / vb : undefined} style={style} className={className} role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <ellipse cx={vb / 2} cy={62} rx={vb / 2 - 6} ry={2.2} fill="#000" opacity={0.08} />
      {tipo === 'full' && (
        <g>
          <TolvaRect x0={4} x1={82} conos={2} escotillas={comp ?? 4} />
          <rect x={6} y={44} width={76} height={4} rx={1.5} fill={T.chasis} />
          <Rueda x={14} />
          <Rueda x={28} />
          <Rueda x={66} />
          <path d="M80 47 H96" stroke={T.chasis} strokeWidth={2.4} />
          <TolvaRect x0={94} x1={190} conos={2} escotillas={comp ?? 4} />
          <rect x={96} y={44} width={90} height={4} rx={1.5} fill={T.chasis} />
          <Rueda x={106} />
          <Rueda x={120} />
          <Tracto x={196} />
        </g>
      )}
      {tipo === 'tolva' && (
        <g>
          <TolvaRect x0={5} x1={146} conos={3} escotillas={comp ?? 3} />
          <rect x={8} y={44} width={140} height={4} rx={1.5} fill={T.chasis} />
          <path d="M126 46 V55" stroke={T.chasis} strokeWidth={2} />
          <Rueda x={20} />
          <Rueda x={35} />
          <Tracto x={150} />
        </g>
      )}
      {tipo === 'cilindrica' && (
        <g>
          <TolvaCil x0={5} x1={146} escotillas={comp ?? 8} />
          <rect x={8} y={44} width={140} height={4} rx={1.5} fill={T.chasis} />
          <path d="M126 46 V55" stroke={T.chasis} strokeWidth={2} />
          <Rueda x={20} />
          <Rueda x={35} />
          <Tracto x={150} />
        </g>
      )}
      {tipo === 'generico' && (
        <g>
          <rect x={5} y={12} width={141} height={31} rx={4} fill={T.relleno3} stroke={T.trazo} strokeWidth={1.4} strokeDasharray="4 3" />
          <rect x={8} y={44} width={140} height={4} rx={1.5} fill={T.chasis} />
          <Rueda x={20} />
          <Rueda x={35} />
          <Tracto x={150} />
        </g>
      )}
    </svg>
  );
}

/** Planta de alimentos balanceados: nave, torre de molienda, batería de silos y báscula. */
export function PlantaIlustracion({ ancho, className, x, y }: { ancho?: number; className?: string; x?: number; y?: number }) {
  const s = { stroke: T.trazo, strokeWidth: 1.3, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 360 160" x={x} y={y} width={ancho} height={ancho != null ? (ancho * 160) / 360 : undefined} className={`ilus ${className ?? ''}`} aria-hidden="true">
      <path d="M2 152 H358" stroke={T.suelo} strokeWidth={2} />
      {/* Nave de producto terminado con techo dentado */}
      <path d="M8 152 V102 L30 92 V102 L52 92 V102 L74 92 V102 L96 92 V102 L118 92 V102 L140 92 V152 Z" fill={T.relleno} {...s} />
      <rect x={18} y={122} width={22} height={30} fill={T.relleno2} {...s} />
      <rect x={52} y={122} width={22} height={30} fill={T.relleno2} {...s} />
      <rect x={84} y={110} width={52} height={11} rx={2} fill={T.tinta} />
      <text x={110} y={118} textAnchor="middle" fontSize={6.4} fontWeight={700} fill="#e6f1ea" letterSpacing={0.6} fontFamily="Inter NK, Inter, sans-serif">NUTRIKOWI</text>
      {/* Torre de molienda y mezclado */}
      <path d="M140 152 V30 L152 22 H186 L194 30 V152 Z" fill={T.relleno2} {...s} />
      <path d="M140 30 H194" {...s} />
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <rect x={149} y={42 + i * 20} width={8} height={9} rx={1} fill={T.trazo} opacity={0.45} />
          <rect x={163} y={42 + i * 20} width={8} height={9} rx={1} fill={T.trazo} opacity={0.45} />
          <rect x={177} y={42 + i * 20} width={8} height={9} rx={1} fill={T.trazo} opacity={0.45} />
        </g>
      ))}
      <rect x={152} y={132} width={30} height={20} fill={T.relleno3} {...s} />
      {/* Galería superior y silos */}
      <path d="M194 38 H344 V45 H194 Z" fill={T.relleno} {...s} />
      {[204, 238, 272, 306].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 152 V62 L${x + 15} 48 L${x + 30} 62 V152 Z`} fill={i % 2 ? T.relleno : T.relleno2} {...s} />
          <path d={`M${x} 82 H${x + 30} M${x} 102 H${x + 30} M${x} 122 H${x + 30}`} stroke={T.trazo} strokeOpacity={0.35} strokeWidth={1} />
          <path d={`M${x + 15} 48 V45`} {...s} />
        </g>
      ))}
      {/* Transportador inclinado */}
      <path d="M118 92 L150 34" stroke={T.trazo} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      {/* Báscula de piso */}
      <rect x={300} y={150} width={56} height={4} rx={1} fill={T.trazo} opacity={0.5} />
    </svg>
  );
}

function Cerdo({ x, y, escala = 1, espejo = false }: { x: number; y: number; escala?: number; espejo?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${espejo ? -escala : escala} ${escala})`} fill={T.cerdo}>
      <path d="M3 8 C3 4 7 2 12 2 H18 C22 2 25 5 25 8 C25 10 24 11 23 11.5 L23 15 H21 L20.5 12 H9.5 L9 15 H7 L6.5 11.6 C5 11 4 10.5 3.5 10 L1.5 10.2 C0.6 10.2 0.4 8.8 1.3 8.5 Z" />
      <path d="M6 4 L7.6 0.8 L9.2 3.4 Z" />
      <path d="M25 6.5 q2.5 -1.2 2 1.2 q-0.4 1.4 -1.6 0.6" fill="none" stroke={T.cerdo} strokeWidth={1} />
    </g>
  );
}

/** Granja porcina: naves de engorda, silo de alimento (comedero a granel) y siluetas discretas de cerdos. */
export function GranjaIlustracion({ ancho, className, x, y }: { ancho?: number; className?: string; x?: number; y?: number }) {
  const s = { stroke: T.trazo, strokeWidth: 1.3, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 360 160" x={x} y={y} width={ancho} height={ancho != null ? (ancho * 160) / 360 : undefined} className={`ilus ${className ?? ''}`} aria-hidden="true">
      <path d="M2 152 H358" stroke={T.suelo} strokeWidth={2} />
      {/* Árboles */}
      <circle cx={330} cy={102} r={18} fill={T.arbol} />
      <circle cx={312} cy={110} r={12} fill={T.arbol} />
      <path d="M330 118 V152 M312 120 V152" stroke="#9db59f" strokeWidth={2.5} />
      {/* Nave posterior */}
      <path d="M70 108 L82 84 H244 L256 108 Z" fill={T.relleno2} {...s} />
      <rect x={74} y={108} width={178} height={18} fill={T.relleno} {...s} />
      {/* Nave frontal */}
      <path d="M14 116 L28 92 H210 L224 116 Z" fill={T.relleno3} {...s} />
      <rect x={18} y={116} width={202} height={36} fill={T.relleno} {...s} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={28 + i * 21} y={124} width={13} height={7} rx={1} fill={T.trazo} opacity={0.4} />
      ))}
      <path d="M18 138 H220" stroke={T.trazo} strokeOpacity={0.35} strokeWidth={1} />
      {/* Silo de alimento a granel */}
      <path d="M244 48 L256 38 L268 48 Z" fill={T.relleno2} {...s} />
      <rect x={244} y={48} width={24} height={58} fill={T.relleno} {...s} />
      <path d="M244 106 L256 120 L268 106 Z" fill={T.relleno2} {...s} />
      <path d="M246 106 L242 152 M266 106 L270 152 M256 120 V136" {...s} />
      <path d="M244 66 H268 M244 86 H268" stroke={T.trazo} strokeOpacity={0.35} strokeWidth={1} />
      {/* Cerca y cerdos */}
      <path d="M232 144 H322 M236 138 V152 M254 138 V152 M272 138 V152 M290 138 V152 M308 138 V152 M322 138 V152" stroke="#b7ab90" strokeWidth={1.4} />
      <Cerdo x={258} y={134} escala={0.84} />
      <Cerdo x={316} y={137} escala={0.7} espejo />
    </svg>
  );
}

/** Recorrido planta → carretera → granja, para estados vacíos y encabezados. */
export function RecorridoIlustracion({ ancho, tipo = 'full' }: { ancho?: number; tipo?: TipoCamion }) {
  return (
    <svg viewBox="0 0 820 200" width={ancho} style={{ maxWidth: '100%', height: 'auto' }} aria-hidden="true">
      <PlantaIlustracion x={0} y={18} ancho={320} />
      <GranjaIlustracion x={500} y={18} ancho={320} />
      <rect x={292} y={170} width={236} height={22} rx={5} fill="#ddd5c3" />
      <path d="M298 181 H522" stroke="#fffdf8" strokeWidth={2} strokeDasharray="10 9" />
      <Camion tipo={tipo} x={330} y={144} ancho={160} />
    </svg>
  );
}
