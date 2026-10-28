import logo from './assets/logo-nutrikowi.png';
import { useMemo } from 'react';
import { Proveedor, useApp, type Vista } from './state/Contexto';
import { VistaMapa } from './views/VistaMapa';
import { VistaViajes } from './views/VistaViajes';
import { VistaCalculadoras } from './views/VistaCalculadoras';
import { VistaIncidencias } from './views/VistaIncidencias';
import { VistaAnalisis } from './views/VistaAnalisis';
import { VistaCatalogos } from './views/VistaCatalogos';
import { VistaRespaldo } from './views/VistaRespaldo';
import { Icono } from './components/Iconos';
import { calcularTodos } from './lib/analisis';

const NAV: { v: Vista; t: string; i: string }[] = [
  { v: 'mapa', t: 'Mapa del proceso', i: 'mapa' },
  { v: 'viajes', t: 'Viajes', i: 'lista' },
  { v: 'calculadoras', t: 'Calculadoras', i: 'calculadora' },
  { v: 'incidencias', t: 'Incidencias', i: 'alerta' },
  { v: 'analisis', t: 'Análisis', i: 'indicadores' },
  { v: 'catalogos', t: 'Catálogos', i: 'catalogos' },
  { v: 'respaldo', t: 'Respaldo', i: 'respaldo' },
];

function Marco() {
  const { vista, irA, modo, setModo, toasts, guardadoEn, errorGuardado, avisoCarga, almacen, migrado, descartarMigrado, ws } = useApp();
  // Viajes que aún requieren información (indicador discreto en la navegación)
  const pendientes = useMemo(() => calcularTodos(ws.viajes, ws.catalogos).filter((c) => c.q.estado === 'incompleto').length, [ws]);
  return (
    <div className={`app app--${modo}`}>
      <header className="cabecera">
        <div className="cabecera__marca">
          <img className="logo" src={logo} alt="NUTRIKOWI" width={199} height={30} />
          <div>
            <div className="marca__nombre">NUTRIKOWI</div>
            <div className="marca__sub">Centro de control logístico · Pueblo Mayo</div>
          </div>
        </div>
        <nav className="nav" aria-label="Secciones">
          {NAV.map((n) => (
            <a key={n.v} href={`#${n.v}`} className={vista === n.v ? 'activo' : ''} aria-current={vista === n.v ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); irA(n.v); }}>
              <Icono n={n.i} size={16} />
              <span>{n.t}</span>
              {n.v === 'viajes' && pendientes > 0 && <span className="nav__badge" title={`${pendientes} viaje(s) con datos incompletos`}>{pendientes}</span>}
            </a>
          ))}
        </nav>
        <div className="cabecera__modo">
          <div className="modo" role="radiogroup" aria-label="Espacio de datos">
            <button role="radio" aria-checked={modo === 'real'} className={modo === 'real' ? 'activo' : ''} onClick={() => setModo('real')}>
              Datos reales <small>{almacen.real.viajes.length}</small>
            </button>
            <button role="radio" aria-checked={modo === 'demo'} className={modo === 'demo' ? 'activo activo--demo' : ''} onClick={() => setModo('demo')}>
              Demostración
            </button>
          </div>
          <span className={`guardado ${errorGuardado ? 'guardado--error' : ''}`} title={errorGuardado ?? (guardadoEn ? `Guardado en este navegador a las ${new Date(guardadoEn).toLocaleTimeString('es-MX')}` : 'Los datos se guardan en este navegador')}>
            <Icono n={errorGuardado ? 'alerta' : 'disco'} size={14} />
            <span className="guardado__txt">{errorGuardado ? 'Error al guardar' : guardadoEn ? `Guardado ${new Date(guardadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Guardado local'}</span>
          </span>
        </div>
      </header>
      {modo === 'demo' && (
        <div className="banda-demo" role="status">
          <Icono n="matraz" size={16} />
          <span><b>Modo demostración.</b> Todos los datos de este espacio son ficticios y están separados de los registros reales.</span>
          <button className="enlace-btn" onClick={() => setModo('real')}>Volver a datos reales</button>
        </div>
      )}
      {migrado && (
        <div className="banda-info" role="status">
          <Icono n="check" size={16} />
          <span>Tus registros se actualizaron al formato de la versión 2. Las incidencias anteriores ahora están en <b>Incidencias y paradas</b>. Se guardó una copia intacta de los datos originales (ver Respaldo).</span>
          <button className="enlace-btn" onClick={descartarMigrado}>Entendido</button>
        </div>
      )}
      {(avisoCarga || errorGuardado) && <div className="banda-error" role="alert"><Icono n="alerta" size={16} />{errorGuardado ?? avisoCarga}</div>}
      <main className="principal">
        {vista === 'mapa' && <VistaMapa />}
        {vista === 'viajes' && <VistaViajes />}
        {vista === 'calculadoras' && <VistaCalculadoras />}
        {vista === 'incidencias' && <VistaIncidencias />}
        {vista === 'analisis' && <VistaAnalisis />}
        {vista === 'catalogos' && <VistaCatalogos />}
        {vista === 'respaldo' && <VistaRespaldo />}
      </main>
      <footer className="pie">
        Registros guardados sólo en este navegador. Descarga respaldos con frecuencia desde <button className="enlace-btn" onClick={() => irA('respaldo')}>Respaldo</button>.
      </footer>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tono}`}><Icono n={t.tono === 'ok' ? 'check' : 'alerta'} size={16} />{t.texto}</div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Proveedor>
      <Marco />
    </Proveedor>
  );
}
