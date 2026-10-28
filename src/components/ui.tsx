// Componentes de interfaz reutilizables.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icono } from './Iconos';
import { durATexto, fmtDur, parseDur } from '../lib/tiempo';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';

export function Boton({
  children, onClick, variante = 'secundario', icono, tam = 'md', disabled, title, type = 'button', className = '', ...rest
}: {
  children?: ReactNode; onClick?: () => void; variante?: Variante; icono?: string; tam?: 'sm' | 'md';
  disabled?: boolean; title?: string; type?: 'button' | 'submit'; className?: string; 'aria-label'?: string;
}) {
  return (
    <button type={type} className={`btn btn--${variante} btn--${tam} ${className}`} onClick={onClick} disabled={disabled} title={title} {...rest}>
      {icono && <Icono n={icono} size={tam === 'sm' ? 15 : 17} />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function Campo({ label, ayuda, error, children, ancho, htmlFor, extra }: {
  label: ReactNode; ayuda?: ReactNode; error?: string | null; children: ReactNode; ancho?: 'completo'; htmlFor?: string; extra?: ReactNode;
}) {
  return (
    <div className={`campo ${ancho === 'completo' ? 'campo--completo' : ''} ${error ? 'campo--error' : ''}`}>
      <div className="campo__cab">
        <label className="campo__label" htmlFor={htmlFor}>{label}</label>
        {extra}
      </div>
      {children}
      {error ? <div className="campo__error">{error}</div> : ayuda ? <div className="campo__ayuda">{ayuda}</div> : null}
    </div>
  );
}

export function EntradaTexto({ value, onChange, placeholder, id, multilinea }: {
  value: string; onChange: (v: string) => void; placeholder?: string; id?: string; multilinea?: boolean;
}) {
  return multilinea ? (
    <textarea id={id} className="input input--area" value={value} placeholder={placeholder} rows={2} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input id={id} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

/** Número con validación. Vacío ⇒ null (nunca 0). Acepta coma decimal. */
export function EntradaNumero({ value, onChange, unidad, id, min = 0, placeholder }: {
  value: number | null; onChange: (v: number | null) => void; unidad?: string; id?: string; min?: number; placeholder?: string;
}) {
  const [txt, setTxt] = useState(value == null ? '' : String(value));
  const [err, setErr] = useState<string | null>(null);
  const ultimo = useRef(value);
  useEffect(() => {
    if (value !== ultimo.current) {
      ultimo.current = value;
      setTxt(value == null ? '' : String(value));
      setErr(null);
    }
  }, [value]);
  const cambiar = (s: string) => {
    setTxt(s);
    const t = s.trim().replace(',', '.');
    if (t === '') {
      setErr(null);
      ultimo.current = null;
      onChange(null);
      return;
    }
    const n = Number(t);
    if (!isFinite(n)) return setErr('Número no válido');
    if (n < min) return setErr(`Debe ser mayor o igual a ${min}`);
    setErr(null);
    ultimo.current = n;
    onChange(n);
  };
  return (
    <div className={`input-grupo ${err ? 'input-grupo--error' : ''}`}>
      <input id={id} className="input input--num" inputMode="decimal" value={txt} placeholder={placeholder ?? '—'} onChange={(e) => cambiar(e.target.value)} />
      {unidad && <span className="input-grupo__sufijo">{unidad}</span>}
      {err && <span className="input-grupo__err" role="alert">{err}</span>}
    </div>
  );
}

export function EntradaDuracion({ value, onChange, id }: { value: number | null; onChange: (v: number | null) => void; id?: string }) {
  const [txt, setTxt] = useState(durATexto(value));
  const [err, setErr] = useState(false);
  const foco = useRef(false);
  useEffect(() => {
    if (!foco.current) setTxt(durATexto(value));
  }, [value]);
  const confirmar = () => {
    foco.current = false;
    if (!txt.trim()) {
      setErr(false);
      onChange(null);
      return;
    }
    const m = parseDur(txt);
    if (m == null) return setErr(true);
    setErr(false);
    onChange(m);
    setTxt(durATexto(m));
  };
  return (
    <div className={`input-grupo ${err ? 'input-grupo--error' : ''}`}>
      <input
        id={id} className="input input--num" value={txt} placeholder="h:mm"
        onFocus={() => (foco.current = true)} onChange={(e) => setTxt(e.target.value)} onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span className="input-grupo__sufijo">{value != null && !err ? fmtDur(value) : 'h:mm'}</span>
      {err && <span className="input-grupo__err" role="alert">Usa 1:30, 90 o 1h30</span>}
    </div>
  );
}

export function Selector<T extends string>({ value, onChange, opciones, vacio = 'Seleccionar…', id, disabled }: {
  value: T | ''; onChange: (v: T | '') => void; opciones: { valor: T; texto: string }[]; vacio?: string | null; id?: string; disabled?: boolean;
}) {
  const existe = value === '' || opciones.some((o) => o.valor === value);
  return (
    <select id={id} className="input input--select" value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled}>
      {vacio !== null && <option value="">{vacio}</option>}
      {!existe && <option value={value}>{value} (no está en catálogo)</option>}
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>{o.texto}</option>
      ))}
    </select>
  );
}

export function SiNo({ value, onChange, etiquetas = ['Sí', 'No'] }: { value: boolean | null; onChange: (v: boolean | null) => void; etiquetas?: [string, string] }) {
  return (
    <div className="segmentado" role="radiogroup">
      <button type="button" role="radio" aria-checked={value === true} className={value === true ? 'activo' : ''} onClick={() => onChange(value === true ? null : true)}>
        {etiquetas[0]}
      </button>
      <button type="button" role="radio" aria-checked={value === false} className={value === false ? 'activo' : ''} onClick={() => onChange(value === false ? null : false)}>
        {etiquetas[1]}
      </button>
    </div>
  );
}

export function Segmentado<T extends string>({ value, onChange, opciones }: { value: T | null; onChange: (v: T) => void; opciones: { valor: T; texto: string }[] }) {
  return (
    <div className="segmentado" role="radiogroup">
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={value === o.valor} className={value === o.valor ? 'activo' : ''} onClick={() => onChange(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function Pastilla({ children, tono = 'neutro', icono, title }: { children: ReactNode; tono?: 'neutro' | 'verde' | 'ambar' | 'rojo' | 'azul' | 'teal' | 'gris' | 'plum'; icono?: string; title?: string }) {
  return (
    <span className={`pastilla pastilla--${tono}`} title={title}>
      {icono && <Icono n={icono} size={13} />}
      {children}
    </span>
  );
}

export function Aviso({ tono = 'info', children, icono }: { tono?: 'info' | 'ambar' | 'rojo' | 'verde'; children: ReactNode; icono?: string }) {
  return (
    <div className={`aviso aviso--${tono}`}>
      <Icono n={icono ?? (tono === 'info' ? 'info' : tono === 'verde' ? 'check' : 'alerta')} size={16} />
      <div>{children}</div>
    </div>
  );
}

export function Metrica({ label, valor, sub, tono, grande }: { label: ReactNode; valor: ReactNode; sub?: ReactNode; tono?: 'pendiente' | 'ambar' | 'rojo' | 'verde'; grande?: boolean }) {
  return (
    <div className={`metrica ${tono ? `metrica--${tono}` : ''} ${grande ? 'metrica--grande' : ''}`}>
      <div className="metrica__label">{label}</div>
      <div className="metrica__valor">{valor}</div>
      {sub && <div className="metrica__sub">{sub}</div>}
    </div>
  );
}

export function Seccion({ titulo, icono, children, extra, id }: { titulo: ReactNode; icono?: string; children: ReactNode; extra?: ReactNode; id?: string }) {
  return (
    <section className="seccion" id={id}>
      <header className="seccion__cab">
        <h3>
          {icono && <Icono n={icono} size={16} />}
          {titulo}
        </h3>
        {extra}
      </header>
      {children}
    </section>
  );
}

export function Modal({ abierto, titulo, children, onCerrar, acciones, ancho = 480 }: {
  abierto: boolean; titulo: ReactNode; children: ReactNode; onCerrar: () => void; acciones?: ReactNode; ancho?: number;
}) {
  const idT = useId();
  useEffect(() => {
    if (!abierto) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={idT} style={{ maxWidth: ancho }}>
        <header className="modal__cab">
          <h2 id={idT}>{titulo}</h2>
          <button className="icono-btn" onClick={onCerrar} aria-label="Cerrar"><Icono n="cerrar" /></button>
        </header>
        <div className="modal__cuerpo">{children}</div>
        {acciones && <footer className="modal__pie">{acciones}</footer>}
      </div>
    </div>
  );
}

export interface ConfirmacionPendiente {
  titulo: string;
  mensaje: ReactNode;
  confirmar: string;
  peligro?: boolean;
  accion: () => void;
}

export function Confirmacion({ c, onCerrar }: { c: ConfirmacionPendiente | null; onCerrar: () => void }) {
  return (
    <Modal
      abierto={!!c}
      titulo={c?.titulo ?? ''}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
          <Boton variante={c?.peligro ? 'peligro' : 'primario'} onClick={() => { c?.accion(); onCerrar(); }}>{c?.confirmar}</Boton>
        </>
      }
    >
      <div className="texto-modal">{c?.mensaje}</div>
    </Modal>
  );
}

export function Vacio({ icono = 'info', titulo, children, accion }: { icono?: string; titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="vacio__icono"><Icono n={icono} size={26} /></div>
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
      {accion}
    </div>
  );
}

export function BarraProporcion({ partes, alto = 10 }: { partes: { valor: number; clase: string; titulo: string }[]; alto?: number }) {
  const total = partes.reduce((t, p) => t + Math.max(0, p.valor), 0);
  if (!total) return <div className="barra-prop barra-prop--vacia" style={{ height: alto }} />;
  return (
    <div className="barra-prop" style={{ height: alto }}>
      {partes.filter((p) => p.valor > 0).map((p) => (
        <div key={p.clase} className={`barra-prop__p ${p.clase}`} style={{ width: `${(p.valor / total) * 100}%` }} title={p.titulo} />
      ))}
    </div>
  );
}
