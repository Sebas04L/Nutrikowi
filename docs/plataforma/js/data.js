/* ==========================================================================
   Datos de demostración (ficticios). Generados de forma determinista para
   que la demostración sea coherente en cada carga.
   Ningún dato representa registros reales de Nutrikowi.
   ========================================================================== */
(function () {
  const NK = (window.NK = window.NK || {});

  // Generador pseudoaleatorio con semilla (mulberry32)
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  NK.rng = rng;

  const DAY = 86400000;
  const today = new Date(); today.setHours(9, 0, 0, 0);
  NK.TODAY = today;
  const dAgo = (n) => new Date(today.getTime() - n * DAY).toISOString();
  const dIn = (n) => new Date(today.getTime() + n * DAY).toISOString();
  NK.dAgo = dAgo; NK.dIn = dIn;

  // ------------------------------------------------------------------
  // Catálogos
  // ------------------------------------------------------------------
  const TECHS = [
    { id: 'RM', name: 'Raúl Medina', role: 'Mecánico diésel A', shift: 'Matutino' },
    { id: 'JC', name: 'Jorge Castañeda', role: 'Mecánico diésel A', shift: 'Matutino' },
    { id: 'LO', name: 'Luis Ortega', role: 'Eléctrico automotriz', shift: 'Matutino' },
    { id: 'MS', name: 'Martín Salas', role: 'Mecánico de frenos y suspensión', shift: 'Vespertino' },
    { id: 'HR', name: 'Héctor Ríos', role: 'Llantero / ayudante general', shift: 'Vespertino' },
  ];

  const MODELS = {
    tracto: [
      { marca: 'Kenworth', modelo: 'T680', years: [2019, 2023] },
      { marca: 'Freightliner', modelo: 'Cascadia 126', years: [2018, 2022] },
      { marca: 'International', modelo: 'LT625', years: [2020, 2022] },
      { marca: 'Volvo', modelo: 'VNL 760', years: [2021, 2021] },
    ],
    torton: [
      { marca: 'International', modelo: 'MV607', years: [2018, 2022] },
      { marca: 'Freightliner', modelo: 'M2 106', years: [2018, 2021] },
      { marca: 'Hino', modelo: 'GH 1828', years: [2019, 2022] },
    ],
    tolva: [
      { marca: 'Fruehauf', modelo: 'Tolva granelera 2 ejes', years: [2017, 2022] },
      { marca: 'Great Dane', modelo: 'Tolva granelera 2 ejes', years: [2018, 2021] },
    ],
  };
  const TYPE_LABEL = { tracto: 'Tractocamión', torton: 'Camión torton', tolva: 'Remolque tolva' };
  NK.TYPE_LABEL = TYPE_LABEL;

  const OUT_OF_SERVICE = { 'T-107': 'Falla mayor de motor: pérdida de compresión', 'TO-206': 'Daño en cabina y chasis por golpe', 'TV-308': 'Chasis fisurado, en evaluación' };
  const IN_SHOP = ['T-104', 'T-109', 'T-112', 'TO-203', 'TV-305', 'TV-310'];

  const r = rng(20261);
  const pick = (arr, rr = r) => arr[Math.floor(rr() * arr.length)];
  const between = (a, b, rr = r) => a + (b - a) * rr();
  const int = (a, b, rr = r) => Math.round(between(a, b, rr));

  // ------------------------------------------------------------------
  // Unidades
  // ------------------------------------------------------------------
  const units = [];
  function addUnits(type, prefix, start, count) {
    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${start + i}`;
      const m = MODELS[type][i % MODELS[type].length];
      // Unidades 2018–2019 fijas: base del análisis de frenos en la demostración
      const FIXED_YEAR = { 'T-102': 2018, 'T-106': 2019, 'T-109': 2019, 'T-110': 2018, 'T-113': 2019 };
      const year = FIXED_YEAR[id] || int(m.years[0], m.years[1]);
      const age = 2026 - year;
      const kmBase = { tracto: 118000, torton: 54000, tolva: 82000 }[type];
      const km = Math.round((kmBase * (age + 0.5) * between(0.85, 1.12)) / 10) * 10;
      const interval = { tracto: 20000, torton: 10000, tolva: 25000 }[type];
      const daily = { tracto: 410, torton: 240, tolva: 360 }[type];
      // Kilómetros desde el último servicio: algunos vencidos a propósito
      let since = Math.round(between(0.08, 0.98) * interval / 10) * 10;
      if (['T-102', 'TO-204', 'TV-303'].includes(id)) since = interval + int(400, 1600);
      if (['T-110', 'T-113', 'TO-201', 'TV-306', 'T-105'].includes(id)) since = interval - int(300, 1500);
      const lastSvcKm = km - since;
      const lastSvcDays = Math.max(3, Math.round(since / daily));
      let status = 'disponible';
      if (IN_SHOP.includes(id)) status = 'mantenimiento';
      if (OUT_OF_SERVICE[id]) status = 'fuera';
      const kmpl = type === 'tracto' ? between(2.25, 2.85) : type === 'torton' ? between(3.4, 4.1) : null;
      units.push({
        id, type, marca: m.marca, modelo: m.modelo, year,
        placas: `${pick(['LF', 'LG', 'LH', 'KZ'])}-${int(10, 99)}-${int(100, 999)}`,
        vin: `3${pick(['AK', 'FU', 'HS', 'V4'])}${Math.floor(r() * 1e14).toString(36).toUpperCase().slice(0, 9)}${int(10000, 99999)}`.slice(0, 17),
        km, status, interval, daily,
        lastSvc: { date: dAgo(lastSvcDays), km: lastSvcKm, type: type === 'tolva' ? 'Preventivo tolva' : pick(['Preventivo A', 'Preventivo B']) },
        nextSvcKm: lastSvcKm + interval,
        kmpl: kmpl ? Math.round(kmpl * 100) / 100 : null,
        operador: type === 'tolva' ? null : pick(['A. Hernández', 'J. Guzmán', 'R. Flores', 'M. Delgado', 'C. Vázquez', 'E. Ramírez', 'S. Morales', 'F. Aguilar', 'P. Castillo', 'O. Navarro']),
        ruta: type === 'tolva' ? 'Enganche variable' : pick(['Planta → Granjas zona norte', 'Planta → Granjas zona sur', 'Planta → Granjas zona oriente', 'Reparto local']),
        outReason: OUT_OF_SERVICE[id] || null,
        motor: type === 'tolva' ? '—' : pick(type === 'tracto' ? ['Cummins X15', 'Detroit DD15', 'PACCAR MX-13', 'Volvo D13'] : ['Cummins B6.7', 'Cummins L9', 'Hino J08E']),
        capacidad: type === 'tolva' ? '32 t / 40 m³' : type === 'torton' ? '14 t / 18 m³' : '—',
      });
    }
  }
  addUnits('tracto', 'T', 101, 14);
  addUnits('torton', 'TO', 201, 9);
  addUnits('tolva', 'TV', 301, 12);
  // Volvo VNL único → asegurar año 2021
  units.forEach((u) => { if (u.marca === 'Volvo') u.year = 2021; });

  // ------------------------------------------------------------------
  // Inventario del taller
  // ------------------------------------------------------------------
  const inventory = [
    // code, desc, cat, unidad, exist, reserv, min, loc, cost
    ['LUB-001', 'Aceite de motor 15W-40 CK-4', 'Lubricantes', 'cubeta 19 L', 34, 6, 16, 'A-01-1', 1890],
    ['LUB-002', 'Aceite de motor 15W-40 CK-4 (tambo)', 'Lubricantes', 'tambo 208 L', 3, 1, 2, 'A-01-0', 19850],
    ['LUB-003', 'Anticongelante / refrigerante ELC 50/50', 'Lubricantes', 'garrafa 3.78 L', 9, 4, 16, 'A-02-1', 265],
    ['LUB-004', 'Aceite de transmisión SAE 50 sintético', 'Lubricantes', 'cubeta 19 L', 7, 2, 4, 'A-01-2', 3420],
    ['LUB-005', 'Aceite para diferencial 80W-90', 'Lubricantes', 'cubeta 19 L', 6, 1, 4, 'A-01-2', 2150],
    ['LUB-006', 'Grasa multipropósito EP-2', 'Lubricantes', 'cubeta 16 kg', 2, 1, 4, 'A-02-0', 1680],
    ['FIL-001', 'Filtro de aceite LF9009', 'Filtros', 'pieza', 22, 4, 12, 'B-01-1', 545],
    ['FIL-002', 'Filtro de combustible FS1040', 'Filtros', 'pieza', 5, 3, 12, 'B-01-2', 610],
    ['FIL-003', 'Filtro separador de agua FS19932', 'Filtros', 'pieza', 14, 2, 10, 'B-01-2', 890],
    ['FIL-004', 'Filtro de aire primario AF25557', 'Filtros', 'pieza', 8, 2, 6, 'B-02-1', 1340],
    ['FIL-005', 'Filtro de refrigerante WF2075', 'Filtros', 'pieza', 9, 0, 6, 'B-01-3', 410],
    ['FIL-006', 'Cartucho secador de aire', 'Filtros', 'pieza', 3, 1, 4, 'B-02-2', 1760],
    ['REF-001', 'Balata eje de tracción 4707Q', 'Refacciones', 'juego', 4, 4, 8, 'C-01-1', 2380],
    ['REF-002', 'Tambor de freno 16.5 × 7', 'Refacciones', 'pieza', 6, 2, 4, 'C-01-0', 3950],
    ['REF-003', 'Matraca de ajuste automática', 'Refacciones', 'pieza', 7, 2, 6, 'C-01-2', 1290],
    ['REF-004', 'Cámara de freno 30/30', 'Refacciones', 'pieza', 5, 1, 4, 'C-02-1', 1870],
    ['REF-005', 'Bolsa de aire de suspensión trasera', 'Refacciones', 'pieza', 0, 0, 4, 'C-02-0', 2640],
    ['REF-006', 'Amortiguador delantero', 'Refacciones', 'pieza', 6, 2, 4, 'C-02-2', 1490],
    ['REF-007', 'Banda poly-V motor', 'Refacciones', 'pieza', 9, 1, 6, 'C-03-1', 720],
    ['REF-008', 'Válvula relevadora de aire', 'Refacciones', 'pieza', 2, 1, 2, 'C-03-2', 1180],
    ['REF-009', 'Kit de embrague 15.5"', 'Refacciones', 'kit', 1, 1, 1, 'C-04-0', 28400],
    ['CON-001', 'Líquido limpiador de frenos', 'Consumibles', 'lata', 26, 0, 12, 'D-01-1', 98],
    ['CON-002', 'Trapo industrial', 'Consumibles', 'kg', 18, 0, 20, 'D-01-0', 48],
    ['CON-003', 'Cinta de aislar', 'Consumibles', 'pieza', 30, 0, 15, 'D-01-2', 32],
    ['CON-004', 'Guantes de nitrilo (caja 100)', 'Consumibles', 'caja', 6, 0, 4, 'D-01-2', 215],
    ['MAT-001', 'Manguera de aire 1/2" (rollo)', 'Materiales de mantenimiento', 'metro', 42, 6, 20, 'E-01-1', 46],
    ['MAT-002', 'Conector gladhand con empaque', 'Materiales de mantenimiento', 'pieza', 10, 2, 6, 'E-01-2', 168],
    ['MAT-003', 'Abrazadera sin fin 2"', 'Materiales de mantenimiento', 'pieza', 64, 8, 30, 'E-02-1', 18],
    ['MAT-004', 'Foco LED de plafón ámbar', 'Materiales de mantenimiento', 'pieza', 11, 3, 10, 'E-02-2', 145],
    ['MAT-005', 'Arnés eléctrico de remolque 7 vías', 'Materiales de mantenimiento', 'pieza', 2, 1, 2, 'E-03-1', 1320],
  ].map(([code, desc, cat, unit, exist, reserved, min, loc, cost]) => ({ code, desc, cat, unit, exist, reserved, min, loc, cost }));

  // ------------------------------------------------------------------
  // Órdenes de trabajo
  // ------------------------------------------------------------------
  const yymm = String(today.getFullYear()).slice(2) + String(today.getMonth() + 1).padStart(2, '0');
  const OT = (n) => `OT-${yymm}-${String(n).padStart(3, '0')}`;
  const orders = [
    { n: 41, unit: 'T-104', type: 'Preventivo', title: 'Servicio preventivo B', desc: 'Cambio de aceite de motor y filtros (aceite, combustible y separador). Revisión de bandas, mangueras y niveles.', tech: 'RM', prio: 'media', status: 'proceso', inDays: 1, hours: 3.5, est: 6, mats: [['LUB-001', 2], ['FIL-001', 1], ['FIL-002', 1], ['FIL-003', 1]] },
    { n: 42, unit: 'T-109', type: 'Correctivo', title: 'Balatas y matracas eje de tracción', desc: 'Desgaste irregular de balatas en ambos ejes de tracción. Reemplazo de balatas y matracas de ajuste.', tech: 'MS', prio: 'alta', status: 'espera', inDays: 3, hours: 4, est: 9, mats: [['REF-001', 2], ['REF-003', 2]], waitFor: 'Balatas eje de tracción (faltan 2 juegos)' },
    { n: 43, unit: 'TO-203', type: 'Correctivo', title: 'Fuga de aire en sistema de frenos', desc: 'Pérdida de presión con motor apagado. Revisar válvula relevadora y conexiones del eje trasero.', tech: 'MS', prio: 'alta', status: 'proceso', inDays: 1, hours: 2, est: 4, mats: [['REF-008', 1], ['MAT-001', 4]] },
    { n: 44, unit: 'TV-305', type: 'Preventivo', title: 'Preventivo de tolva', desc: 'Engrasado de compuertas y mecanismo de descarga, revisión de frenos, luces y conexión de aire.', tech: 'HR', prio: 'baja', status: 'proceso', inDays: 0, hours: 1.5, est: 3, mats: [['LUB-006', 1], ['MAT-004', 2]] },
    { n: 45, unit: 'T-112', type: 'Correctivo', title: 'Fuga en radiador', desc: 'Pérdida de refrigerante y temperatura alta en pendientes. Desmontar radiador y enviar a reparación.', tech: 'JC', prio: 'alta', status: 'espera', inDays: 2, hours: 3, est: 7, mats: [['LUB-003', 8], ['FIL-005', 1]], waitFor: 'Refrigerante ELC (existencia insuficiente)' },
    { n: 46, unit: 'TV-310', type: 'Correctivo', title: 'Falla eléctrica en luces de remolque', desc: 'Luces traseras intermitentes. Revisar conector de 7 vías y arnés principal.', tech: 'LO', prio: 'media', status: 'proceso', inDays: 1, hours: 2.5, est: 4, mats: [['MAT-005', 1], ['MAT-004', 1]] },
    { n: 47, unit: 'T-107', type: 'Correctivo', title: 'Diagnóstico de motor', desc: 'Pérdida de potencia y humo blanco. Prueba de compresión indica falla en cilindro 4. En espera de cotización de reparación mayor.', tech: 'JC', prio: 'urgente', status: 'espera', inDays: 9, hours: 11, est: 24, mats: [], waitFor: 'Autorización de reparación mayor (Compras / Dirección)' },
    { n: 48, unit: 'TO-206', type: 'Correctivo', title: 'Valoración de daños por golpe', desc: 'Daño en cabina y larguero delantero. Documentar daños para aseguradora.', tech: 'RM', prio: 'media', status: 'pendiente', inDays: 6, hours: 0, est: 5, mats: [] },
    { n: 49, unit: 'T-102', type: 'Preventivo', title: 'Servicio preventivo A (vencido)', desc: 'Servicio vencido por kilometraje. Cambio de aceite, filtro de aceite y revisión general.', tech: 'RM', prio: 'alta', status: 'pendiente', inDays: 0, hours: 0, est: 4, mats: [['LUB-001', 2], ['FIL-001', 1]] },
    { n: 50, unit: 'TO-204', type: 'Preventivo', title: 'Servicio preventivo A (vencido)', desc: 'Cambio de aceite y filtros; revisión de frenos y suspensión.', tech: 'JC', prio: 'alta', status: 'pendiente', inDays: 0, hours: 0, est: 3, mats: [['LUB-001', 1], ['FIL-001', 1], ['FIL-002', 1]] },
    { n: 51, unit: 'TV-303', type: 'Preventivo', title: 'Preventivo de tolva (vencido)', desc: 'Engrasado general, ajuste de frenos y revisión de compuertas.', tech: 'HR', prio: 'media', status: 'pendiente', inDays: 1, hours: 0, est: 3, mats: [['LUB-006', 1]] },
    { n: 52, unit: 'T-113', type: 'Llantas', title: 'Rotación y alineación', desc: 'Desgaste irregular en llantas de dirección. Alineación, balanceo y rotación de llantas de tracción.', tech: 'HR', prio: 'baja', status: 'pendiente', inDays: 0, hours: 0, est: 3, mats: [] },
    { n: 37, unit: 'T-101', type: 'Preventivo', title: 'Servicio preventivo B', desc: 'Cambio de aceite y filtros; revisión de bandas y mangueras.', tech: 'RM', prio: 'media', status: 'terminado', inDays: 4, doneDays: 3, hours: 5.5, est: 6, mats: [['LUB-001', 2], ['FIL-001', 1], ['FIL-002', 1], ['FIL-003', 1]] },
    { n: 38, unit: 'TO-208', type: 'Correctivo', title: 'Cambio de amortiguadores delanteros', desc: 'Amortiguadores con fuga de aceite.', tech: 'MS', prio: 'media', status: 'terminado', inDays: 5, doneDays: 4, hours: 2.5, est: 3, mats: [['REF-006', 2]] },
    { n: 39, unit: 'TV-302', type: 'Correctivo', title: 'Reemplazo de cámara de freno', desc: 'Cámara de freno con fuga en eje 2 lado derecho.', tech: 'MS', prio: 'alta', status: 'terminado', inDays: 3, doneDays: 2, hours: 1.5, est: 2, mats: [['REF-004', 1]] },
    { n: 40, unit: 'T-106', type: 'Correctivo', title: 'Banda de motor y tensor', desc: 'Ruido en banda; reemplazo de banda poly-V y revisión de tensor.', tech: 'JC', prio: 'baja', status: 'terminado', inDays: 2, doneDays: 1, hours: 1.2, est: 1.5, mats: [['REF-007', 1]] },
  ].map((o) => ({
    folio: OT(o.n), unit: o.unit, type: o.type, title: o.title, desc: o.desc, tech: o.tech, prio: o.prio, status: o.status,
    inDate: dAgo(o.inDays), doneDate: o.doneDays != null ? dAgo(o.doneDays) : null,
    hours: o.hours, est: o.est, waitFor: o.waitFor || null,
    mats: o.mats.map(([code, qty]) => ({ code, qty })),
    log: [{ at: dAgo(o.inDays), text: 'Orden creada por D. Treviño' }].concat(o.status !== 'pendiente' ? [{ at: dAgo(Math.max(0, o.inDays - 0.3)), text: `Trabajo iniciado por ${TECHS.find((t) => t.id === o.tech).name}` }] : []).concat(o.status === 'espera' ? [{ at: dAgo(Math.max(0, o.inDays - 1)), text: 'En espera de material' }] : []).concat(o.status === 'terminado' ? [{ at: dAgo(o.doneDays), text: 'Trabajo terminado y unidad liberada' }] : []),
  }));

  // Historial de servicios (12 meses) para fichas, historial y reportes
  const svcCatalog = {
    tracto: [['Preventivo A', 'Preventivo', 6200, 3], ['Preventivo B', 'Preventivo', 9800, 5], ['Frenos: balatas y tambores', 'Correctivo', 14800, 6], ['Sistema eléctrico', 'Correctivo', 3900, 2.5], ['Suspensión: bolsas de aire', 'Correctivo', 8600, 3], ['Enfriamiento: mangueras', 'Correctivo', 4700, 2], ['Embrague', 'Correctivo', 36500, 9], ['Alineación y rotación', 'Llantas', 2400, 2]],
    torton: [['Preventivo A', 'Preventivo', 4300, 2.5], ['Preventivo B', 'Preventivo', 6900, 4], ['Frenos', 'Correctivo', 9200, 4], ['Sistema eléctrico', 'Correctivo', 2800, 2], ['Amortiguadores', 'Correctivo', 4100, 2.5], ['Alineación y rotación', 'Llantas', 1900, 1.5]],
    tolva: [['Preventivo de tolva', 'Preventivo', 2600, 2.5], ['Frenos de remolque', 'Correctivo', 7400, 3.5], ['Compuertas de descarga', 'Correctivo', 5200, 4], ['Luces y arnés', 'Correctivo', 2300, 2], ['Rotación de llantas', 'Llantas', 900, 1]],
  };
  const history = [];
  const hr = rng(777);
  let hn = 1;
  units.forEach((u) => {
    const n = u.type === 'tolva' ? int(4, 7, hr) : int(6, 10, hr);
    for (let i = 0; i < n; i++) {
      const days = int(8, 360, hr);
      const older = u.year <= 2019 && u.type === 'tracto';
      const recent = days < 95;
      let c = pick(svcCatalog[u.type], hr);
      // Historia: correctivos de frenos al alza en tractos 2018–2019 en los últimos 3 meses
      if (older && recent && hr() < 0.55) c = svcCatalog.tracto[2];
      const cost = Math.round(c[2] * between(0.85, 1.25, hr) / 10) * 10;
      history.push({ id: `S-${String(hn++).padStart(4, '0')}`, unit: u.id, date: dAgo(days), service: c[0], kind: c[1], cost, hours: Math.round(c[3] * between(0.8, 1.3, hr) * 10) / 10, tech: pick(TECHS, hr).id, km: Math.max(1000, u.km - Math.round(days * u.daily * between(0.85, 1.05, hr))) });
    }
  });
  history.sort((a, b) => b.date.localeCompare(a.date));

  // ------------------------------------------------------------------
  // Solicitudes de materiales
  // ------------------------------------------------------------------
  const SOL = (n) => `SM-${yymm}-${String(n).padStart(3, '0')}`;
  const reqStatusFlow = ['borrador', 'enviada', 'revision', 'autorizada', 'compra', 'recibida'];
  const requests = [
    { n: 18, item: 'REF-001', qty: 6, ref: 'OT-' + yymm + '-042 · T-109', prio: 'alta', status: 'enviada', days: 1, why: 'Orden detenida por falta de balatas; existencia de 4 juegos ya reservados. Se requieren para T-109 y reposición de stock mínimo.' },
    { n: 17, item: 'LUB-003', qty: 24, ref: 'OT-' + yymm + '-045 · T-112', prio: 'alta', status: 'revision', days: 2, why: 'Existencia por debajo del mínimo. Reparación de radiador de T-112 requiere 8 garrafas.' },
    { n: 16, item: 'REF-005', qty: 6, ref: 'Stock de taller', prio: 'media', status: 'autorizada', days: 4, why: 'Artículo agotado. Se cambiaron 4 bolsas el mes pasado y hay 2 unidades con desgaste visible.' },
    { n: 15, item: 'FIL-002', qty: 20, ref: 'Programa preventivo', prio: 'media', status: 'compra', days: 6, why: 'Reposición para servicios preventivos programados en las próximas 3 semanas (11 unidades).' },
    { n: 14, item: 'LUB-006', qty: 4, ref: 'Stock de taller', prio: 'baja', status: 'compra', days: 7, why: 'Grasa por debajo del mínimo; consumo alto por preventivos de tolvas.' },
    { n: 13, item: 'FIL-006', qty: 4, ref: 'Stock de taller', prio: 'baja', status: 'recibida', days: 12, why: 'Reposición de cartuchos secadores de aire.' },
    { n: 12, item: 'REF-009', qty: 1, ref: 'T-110', prio: 'media', status: 'rechazada', days: 14, why: 'Kit de embrague de respaldo para T-110.', reject: 'Compras: ya existe 1 kit en almacén reservado; se solicitará cuando se confirme el cambio.' },
    { n: 11, item: 'MAT-004', qty: 20, ref: 'Stock de taller', prio: 'baja', status: 'recibida', days: 18, why: 'Reposición de focos de plafón para revisiones de luces.' },
    { n: 19, item: 'CON-002', qty: 25, ref: 'Stock de taller', prio: 'baja', status: 'borrador', days: 0, why: 'Trapo industrial por debajo del mínimo.' },
  ].map((q) => {
    const inv = inventory.find((i) => i.code === q.item);
    const idx = q.status === 'rechazada' ? 2 : reqStatusFlow.indexOf(q.status);
    const hist = [];
    const steps = ['Creada como borrador', 'Enviada a Compras', 'Compras inició la revisión', 'Autorizada por Compras', 'Compras generó la orden de compra', 'Material recibido en almacén'];
    for (let i = 0; i <= idx; i++) hist.push({ status: reqStatusFlow[i], at: dAgo(q.days - i * 0.6 > 0 ? q.days - i * 0.6 : 0), text: steps[i], by: i <= 1 ? 'D. Treviño' : 'Compras' });
    if (q.status === 'rechazada') hist.push({ status: 'rechazada', at: dAgo(q.days - 1.5), text: q.reject, by: 'Compras' });
    return { folio: SOL(q.n), by: 'Daniel Treviño', role: 'Supervisor de Taller', date: dAgo(q.days), item: q.item, desc: inv ? inv.desc : q.item, unitLabel: inv ? inv.unit : 'pieza', qty: q.qty, ref: q.ref, prio: q.prio, status: q.status, why: q.why, hist, estCost: inv ? inv.cost * q.qty : 0 };
  });

  // ------------------------------------------------------------------
  // Llantas
  // ------------------------------------------------------------------
  const TIRE_MODELS = [
    { marca: 'Michelin', modelo: 'X Multi D', pos: 'traccion', cost: 11800, life: 180000 },
    { marca: 'Michelin', modelo: 'X Multi Z', pos: 'direccion', cost: 12400, life: 160000 },
    { marca: 'Bridgestone', modelo: 'M729', pos: 'traccion', cost: 10900, life: 170000 },
    { marca: 'Bridgestone', modelo: 'R268', pos: 'direccion', cost: 10600, life: 150000 },
    { marca: 'Continental', modelo: 'HDR2', pos: 'traccion', cost: 10400, life: 165000 },
    { marca: 'Goodyear', modelo: 'G622 RSD', pos: 'direccion', cost: 9900, life: 140000 },
    { marca: 'Firestone', modelo: 'FS591', pos: 'remolque', cost: 8200, life: 150000 },
    { marca: 'Continental', modelo: 'HTR2', pos: 'remolque', cost: 8700, life: 160000 },
  ];
  const LAYOUTS = {
    tracto: [
      { axle: 1, kind: 'direccion', pos: ['1-I', '1-D'] },
      { axle: 2, kind: 'traccion', pos: ['2-IE', '2-II', '2-DI', '2-DE'] },
      { axle: 3, kind: 'traccion', pos: ['3-IE', '3-II', '3-DI', '3-DE'] },
    ],
    torton: [
      { axle: 1, kind: 'direccion', pos: ['1-I', '1-D'] },
      { axle: 2, kind: 'traccion', pos: ['2-IE', '2-II', '2-DI', '2-DE'] },
    ],
    tolva: [
      { axle: 1, kind: 'remolque', pos: ['1-IE', '1-II', '1-DI', '1-DE'] },
      { axle: 2, kind: 'remolque', pos: ['2-IE', '2-II', '2-DI', '2-DE'] },
    ],
  };
  NK.TIRE_LAYOUTS = LAYOUTS;
  const POS_NAME = (p) => {
    const [ax, s] = p.split('-');
    const side = { I: 'izquierda', D: 'derecha', IE: 'izq. exterior', II: 'izq. interior', DI: 'der. interior', DE: 'der. exterior' }[s];
    return `Eje ${ax} · ${side}`;
  };
  NK.POS_NAME = POS_NAME;
  const tires = [];
  const tr = rng(4242);
  let tn = 1;
  const NEW_DEPTH = { direccion: 16, traccion: 22, remolque: 14 };
  const MIN_DEPTH = { direccion: 4, traccion: 3, remolque: 3 };
  NK.NEW_DEPTH = NEW_DEPTH; NK.MIN_DEPTH = MIN_DEPTH;
  units.forEach((u) => {
    LAYOUTS[u.type].forEach((ax) => {
      ax.pos.forEach((p) => {
        const options = TIRE_MODELS.filter((m) => m.pos === ax.kind);
        const m = pick(options, tr);
        const ran = Math.round(between(0.06, 0.92, tr) * m.life / 100) * 100;
        let ranKm = ran;
        if (u.id === 'T-113' && ax.kind === 'direccion') ranKm = Math.round(m.life * 0.99);
        if (['T-102', 'TV-304', 'TO-207'].includes(u.id) && tr() < 0.45) ranKm = Math.round(m.life * between(0.9, 1.02, tr));
        const wear = ranKm / m.life;
        const nd = NEW_DEPTH[ax.kind];
        const depth = Math.max(1.5, Math.round((nd - (nd - MIN_DEPTH[ax.kind]) * wear * between(0.92, 1.08, tr)) * 10) / 10);
        const kmInstall = Math.max(0, u.km - ranKm);
        const days = Math.round(ranKm / u.daily);
        const serial = `${m.marca.slice(0, 2).toUpperCase()}${int(1000000, 9999999, tr)}`;
        const hist = [{ type: 'instalacion', date: dAgo(days), km: kmInstall, text: `Instalada nueva en ${POS_NAME(p)}` }];
        if (days > 120) hist.push({ type: 'rotacion', date: dAgo(Math.round(days * 0.55)), km: kmInstall + Math.round(ranKm * 0.45), text: 'Rotación programada' });
        if (tr() < 0.18) hist.push({ type: 'reparacion', date: dAgo(Math.round(days * 0.3)), km: kmInstall + Math.round(ranKm * 0.7), text: pick(['Reparación de ponchadura con parche radial', 'Reparación de clavo en hombro', 'Cambio de válvula'], tr) });
        hist.push({ type: 'medicion', date: dAgo(int(2, 25, tr)), km: u.km - int(500, 4000, tr), text: `Medición de profundidad: ${depth} mm` });
        hist.sort((a, b) => a.date.localeCompare(b.date));
        tires.push({ id: `LL-${String(tn++).padStart(4, '0')}`, serial, unit: u.id, pos: p, kind: ax.kind, marca: m.marca, modelo: m.modelo, medida: u.type === 'torton' ? '11R22.5' : '295/80R22.5', installDate: dAgo(days), kmInstall, kmNow: u.km, depth, life: m.life, cost: m.cost, hist, pressure: int(100, 110, tr) });
      });
    });
  });

  const retired = [];
  const rr = rng(99);
  const reasons = ['Desgaste normal (límite legal)', 'Corte en costado', 'Desgaste irregular por alineación', 'Ponchadura no reparable', 'Separación de banda', 'Desgaste normal (límite legal)', 'Desgaste normal (límite legal)'];
  for (let i = 0; i < 16; i++) {
    const u = pick(units.filter((x) => x.status !== 'fuera'), rr);
    const m = pick(TIRE_MODELS, rr);
    const reason = pick(reasons, rr);
    const factor = reason.startsWith('Desgaste normal') ? between(0.9, 1.08, rr) : between(0.35, 0.75, rr);
    const kmRan = Math.round(m.life * factor / 100) * 100;
    retired.push({ id: `LL-R${String(i + 1).padStart(3, '0')}`, serial: `${m.marca.slice(0, 2).toUpperCase()}${int(1000000, 9999999, rr)}`, unit: u.id, pos: pick(LAYOUTS[u.type].flatMap((a) => a.pos), rr), marca: m.marca, modelo: m.modelo, medida: u.type === 'torton' ? '11R22.5' : '295/80R22.5', retDate: dAgo(int(4, 360, rr)), kmRan, reason, cost: m.cost, depth: reason.startsWith('Desgaste normal') ? 3 : Math.round(between(5, 11, rr) * 10) / 10 });
  }
  retired.sort((a, b) => b.retDate.localeCompare(a.retDate));

  // ------------------------------------------------------------------
  // Series mensuales (12 meses)
  // ------------------------------------------------------------------
  const MONTHS = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); MONTHS.push(d); }
  NK.MONTHS = MONTHS;
  const sr = rng(1313);
  const trend = (i) => (i >= 9 ? 1 + (i - 8) * 0.09 : 1); // repunte últimos 3 meses
  const series = {
    preventivo: MONTHS.map(() => Math.round(between(142000, 176000, sr) / 100) * 100),
    correctivo: MONTHS.map((_, i) => Math.round(between(118000, 150000, sr) * trend(i) / 100) * 100),
    llantas: MONTHS.map((_, i) => Math.round(between(84000, 148000, sr) * (i === 10 ? 1.25 : 1) / 100) * 100),
    combustibleL: MONTHS.map(() => Math.round(between(60500, 66800, sr))),
    precioDiesel: MONTHS.map((_, i) => Math.round((24.6 + i * 0.07 + between(-0.15, 0.15, sr)) * 100) / 100),
    km: MONTHS.map(() => Math.round(between(176000, 193000, sr))),
    disponibilidad: MONTHS.map((_, i) => Math.round((between(89, 93.5, sr) - (i >= 9 ? (i - 8) * 2.1 : 0)) * 10) / 10),
    horasExtra: MONTHS.map((_, i) => Math.round(between(38, 62, sr) + (i >= 9 ? (i - 8) * 14 : 0))),
    mttoPrev: MONTHS.map(() => int(24, 33, sr)),
    mttoCorr: MONTHS.map((_, i) => Math.round(int(14, 20, sr) * trend(i))),
    solicitudes: MONTHS.map(() => int(9, 17, sr)),
    solicitudesRech: MONTHS.map(() => int(0, 3, sr)),
  };
  series.combustible = series.combustibleL.map((l, i) => Math.round(l * series.precioDiesel[i]));
  series.kmpl = series.km.map((k, i) => Math.round((k / series.combustibleL[i]) * 100) / 100);
  NK.series = series;

  // Presupuesto anual por categoría (mensual = /12)
  NK.budget = [
    { cat: 'Mantenimiento preventivo', annual: 1980000 },
    { cat: 'Mantenimiento correctivo', annual: 1740000 },
    { cat: 'Llantas', annual: 1500000 },
    { cat: 'Combustible', annual: 19200000 },
    { cat: 'Documentación y seguros', annual: 1260000 },
    { cat: 'Horas extra de taller', annual: 420000 },
  ];

  // ------------------------------------------------------------------
  // Documentación
  // ------------------------------------------------------------------
  const docs = [];
  const dr = rng(55);
  units.forEach((u) => {
    const base = [
      ['Tarjeta de circulación', 'Vehicular', int(40, 600, dr)],
      ['Póliza de seguro', 'Seguros', int(-3, 330, dr)],
      ['Verificación físico-mecánica', 'SCT', int(-10, 180, dr)],
    ];
    if (u.type !== 'tolva') base.push(['Verificación de emisiones', 'Ambiental', int(-5, 170, dr)]);
    base.forEach(([name, cat, days]) => docs.push({ unit: u.id, name, cat, expires: dIn(days), file: `${u.id}_${name.split(' ')[0].toLowerCase()}.pdf` }));
  });
  // Forzar algunos casos visibles
  docs.find((d) => d.unit === 'T-103' && d.name === 'Póliza de seguro').expires = dIn(6);
  docs.find((d) => d.unit === 'TO-205' && d.name === 'Verificación físico-mecánica').expires = dIn(-4);
  docs.find((d) => d.unit === 'T-111' && d.name === 'Verificación de emisiones').expires = dIn(12);

  const adminDocs = [
    { name: 'Permiso SCT de autotransporte federal de carga', owner: 'Logística', expires: dIn(210), cat: 'Permisos' },
    { name: 'Póliza de flotilla — renovación anual', owner: 'Administración', expires: dIn(38), cat: 'Seguros' },
    { name: 'Contrato de servicio de rastreo satelital', owner: 'Logística', expires: dIn(74), cat: 'Contratos' },
    { name: 'Contrato de suministro de diésel', owner: 'Compras', expires: dIn(18), cat: 'Contratos' },
    { name: 'Programa anual de mantenimiento 2026', owner: 'Taller', expires: dIn(42), cat: 'Programas' },
    { name: 'Dictamen de seguridad del taller (Protección Civil)', owner: 'Seguridad', expires: dIn(-9), cat: 'Cumplimiento' },
  ];

  // ------------------------------------------------------------------
  // Incidencias por unidad
  // ------------------------------------------------------------------
  const incidents = [
    { unit: 'T-107', date: dAgo(9), type: 'Falla mecánica', text: 'Pérdida de potencia en carretera; unidad remolcada a planta.', sev: 'alta' },
    { unit: 'TO-206', date: dAgo(6), type: 'Siniestro', text: 'Golpe en maniobra dentro de granja. Sin lesionados. Reporte a aseguradora.', sev: 'alta' },
    { unit: 'TV-308', date: dAgo(15), type: 'Daño estructural', text: 'Fisura detectada en larguero durante inspección.', sev: 'alta' },
    { unit: 'T-109', date: dAgo(4), type: 'Frenos', text: 'Operador reporta frenado irregular con carga.', sev: 'media' },
    { unit: 'T-112', date: dAgo(3), type: 'Temperatura', text: 'Alerta de temperatura alta en pendiente.', sev: 'media' },
    { unit: 'T-113', date: dAgo(11), type: 'Llantas', text: 'Desgaste irregular en llantas de dirección.', sev: 'baja' },
    { unit: 'TV-310', date: dAgo(2), type: 'Eléctrico', text: 'Luces traseras intermitentes durante ruta.', sev: 'baja' },
    { unit: 'T-101', date: dAgo(60), type: 'Llantas', text: 'Ponchadura en eje 2; reparada en ruta.', sev: 'baja' },
    { unit: 'TO-203', date: dAgo(2), type: 'Frenos', text: 'Pérdida de presión de aire con motor apagado.', sev: 'media' },
  ];

  // ------------------------------------------------------------------
  // Pendientes y compromisos administrativos
  // ------------------------------------------------------------------
  const pendientes = [
    { id: 'p1', text: 'Conciliar facturas de diésel de octubre', meta: 'Vence en 2 días · Administración', done: false },
    { id: 'p2', text: 'Enviar reporte mensual de costos a Dirección', meta: 'Vence el día 25', done: false },
    { id: 'p3', text: 'Renovar póliza de flotilla (cotizaciones)', meta: 'Vence en 38 días · 2 de 3 cotizaciones', done: false },
    { id: 'p4', text: 'Programar verificación físico-mecánica de TO-205', meta: 'Documento vencido', done: false },
    { id: 'p5', text: 'Actualizar expediente de siniestro TO-206', meta: 'Aseguradora solicita fotografías', done: false },
    { id: 'p6', text: 'Revisar consumo de combustible de T-111', meta: 'Rendimiento 9 % debajo del promedio', done: true },
    { id: 'p7', text: 'Capturar horas extra de la quincena', meta: 'Completado', done: true },
  ];
  const compromisos = [
    { id: 'c1', text: 'Reducir unidades con preventivo vencido a cero', owner: 'Taller · D. Treviño', due: dIn(14), progress: 40, status: 'en riesgo' },
    { id: 'c2', text: 'Implementar solicitudes de material directas a Compras', owner: 'Taller y Compras', due: dIn(30), progress: 70, status: 'en tiempo' },
    { id: 'c3', text: 'Inventario cíclico mensual del almacén de taller', owner: 'Almacén · H. Ríos', due: dIn(9), progress: 55, status: 'en tiempo' },
    { id: 'c4', text: 'Estandarizar marca de llantas de tracción', owner: 'Logística', due: dIn(60), progress: 20, status: 'en tiempo' },
    { id: 'c5', text: 'Reparación o baja de T-107', owner: 'Dirección · Logística', due: dIn(7), progress: 15, status: 'atrasado' },
  ];

  const expenses = [
    { date: dAgo(1), concept: 'Compra de filtros de combustible (20 pzas.)', cat: 'Mantenimiento preventivo', unit: '—', amount: 12200, status: 'Por pagar' },
    { date: dAgo(2), concept: 'Reparación de radiador (taller externo)', cat: 'Mantenimiento correctivo', unit: 'T-112', amount: 8900, status: 'Cotizado' },
    { date: dAgo(3), concept: 'Carga de diésel — semana 46', cat: 'Combustible', unit: 'Flotilla', amount: 372400, status: 'Pagado' },
    { date: dAgo(5), concept: '4 llantas de tracción Michelin X Multi D', cat: 'Llantas', unit: 'T-106', amount: 47200, status: 'Pagado' },
    { date: dAgo(6), concept: 'Grúa: traslado de T-107 a planta', cat: 'Mantenimiento correctivo', unit: 'T-107', amount: 14500, status: 'Pagado' },
    { date: dAgo(8), concept: 'Deducible de seguro — TO-206', cat: 'Documentación y seguros', unit: 'TO-206', amount: 25000, status: 'En trámite' },
    { date: dAgo(9), concept: 'Balatas y tambores (lote)', cat: 'Mantenimiento correctivo', unit: '—', amount: 31400, status: 'Pagado' },
    { date: dAgo(10), concept: 'Horas extra de taller — quincena 1', cat: 'Horas extra de taller', unit: '—', amount: 18600, status: 'Pagado' },
  ];

  // ------------------------------------------------------------------
  // Actividad reciente y notificaciones iniciales
  // ------------------------------------------------------------------
  const activity = [
    { at: dAgo(0.05), icon: 'wrench', tone: 'info', text: '<b>Raúl Medina</b> inició el servicio preventivo B de <b>T-104</b>' },
    { at: dAgo(0.12), icon: 'send', tone: 'brand', text: '<b>D. Treviño</b> envió a Compras la solicitud <b>SM-' + yymm + '-018</b> (balatas)' },
    { at: dAgo(0.3), icon: 'package-minus', tone: 'warn', text: 'Salida de almacén: 2 cubetas de aceite 15W-40 para <b>OT-' + yymm + '-041</b>' },
    { at: dAgo(0.8), icon: 'circle-check', tone: 'ok', text: '<b>T-106</b> salió de taller: cambio de banda terminado' },
    { at: dAgo(1.1), icon: 'triangle-alert', tone: 'danger', text: '<b>T-112</b> ingresó a taller por alerta de temperatura' },
    { at: dAgo(1.6), icon: 'badge-check', tone: 'ok', text: 'Compras autorizó la solicitud <b>SM-' + yymm + '-016</b> (bolsas de aire)' },
    { at: dAgo(2.2), icon: 'circle-dot', tone: 'info', text: 'Rotación de llantas registrada en <b>TV-302</b>' },
  ];
  const notifications = [
    { id: 'n1', at: dAgo(0.1), icon: 'badge-check', title: 'Solicitud en revisión', text: 'Compras está revisando SM-' + yymm + '-017 (refrigerante).', unread: true },
    { id: 'n2', at: dAgo(0.4), icon: 'package-x', title: 'Artículo agotado', text: 'Bolsa de aire de suspensión trasera (REF-005) sin existencia.', unread: true },
    { id: 'n3', at: dAgo(0.9), icon: 'calendar-clock', title: '3 servicios vencidos', text: 'T-102, TO-204 y TV-303 superaron su kilometraje de servicio.', unread: true },
    { id: 'n4', at: dAgo(2), icon: 'file-warning', title: 'Documento por vencer', text: 'La póliza de seguro de T-103 vence en 6 días.', unread: false },
  ];

  NK.TECHS = TECHS;
  NK.REQ_FLOW = reqStatusFlow;

  NK.seedState = function () {
    return JSON.parse(JSON.stringify({
      v: 3,
      units, inventory, orders, history, requests, tires, retired, docs, adminDocs, incidents,
      pendientes, compromisos, expenses, activity, notifications,
      movements: [
        { at: dAgo(0.3), code: 'LUB-001', type: 'salida', qty: 2, ref: 'OT-' + yymm + '-041 · T-104', by: 'R. Medina' },
        { at: dAgo(0.3), code: 'FIL-001', type: 'salida', qty: 1, ref: 'OT-' + yymm + '-041 · T-104', by: 'R. Medina' },
        { at: dAgo(1.2), code: 'REF-007', type: 'salida', qty: 1, ref: 'OT-' + yymm + '-040 · T-106', by: 'J. Castañeda' },
        { at: dAgo(2.1), code: 'REF-004', type: 'salida', qty: 1, ref: 'OT-' + yymm + '-039 · TV-302', by: 'M. Salas' },
        { at: dAgo(3), code: 'FIL-006', type: 'entrada', qty: 4, ref: 'SM-' + yymm + '-013 · Compras', by: 'Almacén' },
        { at: dAgo(4.2), code: 'REF-006', type: 'salida', qty: 2, ref: 'OT-' + yymm + '-038 · TO-208', by: 'M. Salas' },
        { at: dAgo(6), code: 'MAT-004', type: 'entrada', qty: 20, ref: 'SM-' + yymm + '-011 · Compras', by: 'Almacén' },
        { at: dAgo(7), code: 'LUB-001', type: 'entrada', qty: 12, ref: 'Compra semanal de lubricantes', by: 'Almacén' },
      ],
      seq: { ot: 53, sm: 20 },
    }));
  };
})();
