/* Nutrikowi · Gráficas y diagramas SVG
   Todas las cifras provienen del expediente maestro (noviembre 2026).
   Cada gráfica se dibuja en su estado final; deck.js solo anima la entrada,
   de modo que el PDF y el modo de movimiento reducido muestran todo completo. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var C = {
    asfalto: "#24211F", acero: "#6A615A", aceroClaro: "#B4AAA1", niebla: "#DDD5CD",
    linea: "#E7E1DB", naranja: "#EE7A17", naranjaTinta: "#B0540A", velo: "#FDEBDA", papel: "#FFFFFF"
  };

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function frag(parent, idx) {
    return el("g", { "class": "fragment solo-opacidad", "data-fragment-index": idx }, parent);
  }
  function lines(parent, x, y, arr, attrs, lh) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs), parent);
    arr.forEach(function (s, i) { el("tspan", { x: x, dy: i === 0 ? 0 : (lh || 26) }, t, s); });
    return t;
  }
  function money(v, dec) {
    return "$" + v.toLocaleString("es-MX", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
  }
  function arrowDefs(svg, id, color) {
    var defs = el("defs", {}, svg);
    var m = el("marker", { id: id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: color }, m);
    return defs;
  }

  var charts = {};

  /* ---------- 3 · Gasto logístico mensual (una serie) + costo por tonelada como fila de texto ---------- */
  charts.logistica = function (svg) {
    var meses = [
      ["Feb", 8101479.05, 353], ["Mar", 9019711.02, 381], ["Abr", 9843315.94, 415], ["May", 9070506.83, 393],
      ["Jun", null, null], ["Jul", 9658052.63, 412.93], ["Ago", null, null], ["Sep", 9032108.88, 398]
    ];
    var L = 96, R = 1150, T = 40, B = 410, max = 10e6;
    var y = function (v) { return B - (v / max) * (B - T); };
    [0, 5e6, 10e6].forEach(function (g) {
      el("line", { x1: L, x2: R, y1: y(g), y2: y(g), "class": "eje" }, svg);
      el("text", { x: L - 16, y: y(g) + 8, "text-anchor": "end", "class": "eje-t" }, svg, g === 0 ? "$0" : "$" + g / 1e6 + " M");
    });
    var paso = (R - L) / meses.length, w = 66;
    var g0 = frag(svg, 0);
    meses.forEach(function (m, i) {
      var cx = L + paso * i + paso / 2;
      el("text", { x: cx, y: B + 40, "text-anchor": "middle", "class": "cat-t" }, svg, m[0]);
      if (m[1] === null) {
        el("text", { x: cx, y: B - 16, "text-anchor": "middle", "class": "sd-t" }, svg, "sin dato");
        el("text", { x: cx, y: B + 92, "text-anchor": "middle", "class": "sd-t" }, svg, "—");
        return;
      }
      var r = el("rect", { x: cx - w / 2, y: y(m[1]), width: w, height: B - y(m[1]), rx: 4, fill: C.asfalto, "class": "crece" }, g0);
      el("title", {}, r, m[0] + " 2026: " + money(m[1], 2) + " · " + money(m[2], m[2] % 1 ? 2 : 0) + " por tonelada");
      el("text", { x: cx, y: y(m[1]) - 14, "text-anchor": "middle", "class": "val-t" }, g0, "$" + (m[1] / 1e6).toFixed(2) + " M");
      el("text", { x: cx, y: B + 92, "text-anchor": "middle", "class": "cat-t", "font-weight": 600 }, g0, "$" + Math.round(m[2]));
    });
    el("text", { x: L - 16, y: B + 92, "text-anchor": "end", "class": "eje-t" }, svg, "por t");
    el("line", { x1: L, x2: R, y1: B + 58, y2: B + 58, stroke: C.linea, "stroke-width": 1 }, svg);
  };

  /* ---------- 7 · Solicitudes de compra de llantas (énfasis en el máximo) ---------- */
  charts.llantas = function (svg) {
    var d = [["Ene", 162611.88], ["Feb", 261388.26], ["Mar", 134896], ["Abr", 256520], ["May", 148540],
             ["Jun", 211160], ["Jul", 172000], ["Ago", 249040], ["Sep", 204780], ["Oct", 177086.16]];
    var L = 120, R = 1170, T = 40, B = 490, max = 300000;
    var y = function (v) { return B - (v / max) * (B - T); };
    [0, 100000, 200000, 300000].forEach(function (g) {
      el("line", { x1: L, x2: R, y1: y(g), y2: y(g), "class": "eje" }, svg);
      el("text", { x: L - 16, y: y(g) + 8, "text-anchor": "end", "class": "eje-t" }, svg, g === 0 ? "$0" : "$" + g / 1000 + " mil");
    });
    var paso = (R - L) / d.length, w = 60;
    var g0 = frag(svg, 0);
    d.forEach(function (m, i) {
      var cx = L + paso * i + paso / 2, alto = m[0] === "Feb";
      var r = el("rect", { x: cx - w / 2, y: y(m[1]), width: w, height: B - y(m[1]), rx: 4, fill: alto ? C.naranja : C.asfalto, "class": "crece" }, g0);
      el("title", {}, r, m[0] + " 2026: " + money(m[1], 2) + " aprobados");
      el("text", { x: cx, y: B + 40, "text-anchor": "middle", "class": "cat-t" }, svg, m[0]);
    });
    // selective labels: máximo + promedio
    var cxF = L + paso * 1 + paso / 2;
    el("text", { x: cxF, y: y(261388.26) - 16, "text-anchor": "middle", "class": "val-t" }, g0, "$261.4 mil");
    var prom = 197802.23;
    el("line", { x1: L, x2: R, y1: y(prom), y2: y(prom), stroke: C.acero, "stroke-width": 2 }, g0);
    var cxM = L + paso * 2 + paso / 2;
    lines(g0, cxM, y(prom) - 40, ["promedio", "$197.8 mil"], { "text-anchor": "middle", "class": "eje-t", fill: C.acero }, 26);
  };

  /* ---------- 9 · Cobertura de turnos ---------- */
  charts.turnos = function (svg) {
    var x = function (h) { return 230 + (h - 6) * 51; };   // 6:00 → 230 ; 24:00 → 1148
    var top = 70, fila = 82;
    for (var h = 6; h <= 24; h += 2) {
      el("line", { x1: x(h), x2: x(h), y1: top - 20, y2: top + fila * 5 - 10, stroke: C.linea, "stroke-width": 1 }, svg);
      el("text", { x: x(h), y: top - 32, "text-anchor": "middle", "class": "eje-t" }, svg, h + ":00");
    }
    var banda = frag(svg, 1);
    el("rect", { x: x(10), y: top - 18, width: x(18) - x(10), height: fila * 3 + 6, fill: C.velo, rx: 6 }, banda);
    el("text", { x: (x(10) + x(18)) / 2, y: top + fila * 3 + 26, "text-anchor": "middle", "class": "eje-t", fill: C.naranjaTinta, "font-weight": 600 }, banda, "Traslape 10:00–18:00");
    // pone la banda detrás de las barras
    svg.insertBefore(banda, svg.firstChild);

    var filas = [
      { n: "Mecánico 1", a: 7, b: 15, c: C.asfalto, idx: 0, t: "07:00–15:00" },
      { n: "Mecánico 2", a: 15, b: 23, c: C.asfalto, idx: 0, t: "15:00–23:00" },
      { n: "Mecánico adicional", a: 10, b: 18, c: C.naranja, idx: 1, t: "10:00–18:00 · propuesto" }
    ];
    filas.forEach(function (f, i) {
      var g = frag(svg, f.idx), cy = top + fila * i + 30;
      el("text", { x: 0, y: cy + 8, "class": "cat-t", "font-weight": 600 }, g, f.n);
      el("rect", { x: x(f.a), y: cy - 16, width: x(f.b) - x(f.a), height: 32, rx: 6, fill: f.c, "class": "crece-x" }, g);
      el("text", { x: x(f.a) + 14, y: cy + 8, fill: "#fff", "font-size": 21, "font-weight": 600 }, g, f.t);
    });
    var g2 = frag(svg, 2);
    var cy3 = top + fila * 3 + 66;
    el("text", { x: 0, y: cy3, "class": "cat-t", "font-weight": 600 }, g2, "Llantero");
    el("text", { x: x(6), y: cy3, "class": "eje-t" }, g2, "Un turno; presión, desgaste, rotaciones y reparaciones");
    el("text", { x: 0, y: cy3 + 56, "class": "cat-t", "font-weight": 600 }, g2, "Supervisor");
    el("text", { x: x(6), y: cy3 + 56, "class": "eje-t" }, g2, "Base física en el taller: programa, asigna, valida y libera");
    el("text", { x: 0, y: cy3 + 112, "class": "cat-t", "font-weight": 600 }, g2, "23:00–07:00");
    el("text", { x: x(6), y: cy3 + 112, "class": "eje-t" }, g2, "Sin cobertura: un rescate a Caborca regresó cerca de las 5:00");
  };

  /* ---------- 11 · Carriles Taller / Compras / Almacén ---------- */
  charts.carriles = function (svg) {
    arrowDefs(svg, "flecha-acero", C.acero);
    arrowDefs(svg, "flecha-naranja", C.naranja);
    var carriles = [["Taller", "supervisor"], ["Compras", ""], ["Almacén", "receptor"]];
    var y0 = 20, alto = 190, W = 1240;
    carriles.forEach(function (c, i) {
      var y = y0 + alto * i;
      el("rect", { x: 0, y: y, width: W, height: alto - 8, rx: 8, fill: i % 2 ? "#ECEEEC" : "#E6E9E8" }, svg);
      lines(svg, 24, y + alto / 2 - (c[1] ? 6 : -8), c[1] ? [c[0], c[1]] : [c[0]], { "class": "cat-t", "font-size": 26, "font-weight": 650 }, 30);
    });
    var cx = [292, 470, 648, 826, 1004, 1158], nw = 166, nh = 112;
    var nodos = [
      { c: 0, l: 0, t: ["Detecta y", "revisa stock"], idx: null },
      { c: 1, l: 0, t: ["Solicita", "con folio"], idx: null },
      { c: 2, l: 1, t: ["Valida parte", "y proveedor"], idx: 0 },
      { c: 3, l: 1, t: ["Cotiza, negocia", "y compra"], idx: 0 },
      { c: 4, l: 2, t: ["Registra", "recepción"], idx: 1 },
      { c: 5, l: 0, t: ["Consume", "contra la OT"], idx: 1 }
    ];
    var cy = function (l) { return y0 + alto * l + (alto - 8) / 2; };
    function nodo(n, parent) {
      var x = cx[n.c] - nw / 2, y = cy(n.l) - nh / 2;
      el("rect", { x: x, y: y, width: nw, height: nh, rx: 10, fill: "#fff", stroke: n.c === 5 ? C.naranja : C.asfalto, "stroke-width": 2.5 }, parent);
      lines(parent, cx[n.c], cy(n.l) - 5, n.t, { "text-anchor": "middle", "font-size": 23, fill: C.asfalto, "font-weight": 600 }, 28);
    }
    function conecta(a, b, parent, color) {
      var ax = cx[a.c] + nw / 2, ay = cy(a.l), bx = cx[b.c] - nw / 2, by = cy(b.l);
      var d = ay === by ? "M" + ax + "," + ay + " H" + (bx - 4)
        : "M" + ax + "," + ay + " H" + ((ax + bx) / 2) + " V" + by + " H" + (bx - 4);
      el("path", { d: d, fill: "none", stroke: color || C.acero, "stroke-width": 2.5, "marker-end": "url(#" + (color ? "flecha-naranja" : "flecha-acero") + ")", "class": "traza" }, parent);
    }
    var base = el("g", {}, svg), f0 = frag(svg, 0), f1 = frag(svg, 1);
    nodo(nodos[0], base); nodo(nodos[1], base); conecta(nodos[0], nodos[1], base);
    conecta(nodos[1], nodos[2], f0, C.naranja);
    el("text", { x: (cx[1] + cx[2]) / 2 + 12, y: cy(0) + 76, "font-size": 23, fill: C.naranjaTinta, "font-weight": 650 }, f0, "Directo, sin intermediario");
    nodo(nodos[2], f0); nodo(nodos[3], f0); conecta(nodos[2], nodos[3], f0);
    el("text", { x: cx[3], y: cy(1) + nh / 2 + 32, "text-anchor": "middle", "font-size": 22, fill: C.acero }, f0, "Conserva la autorización");
    conecta(nodos[3], nodos[4], f1); nodo(nodos[4], f1);
    // recepción → consumo (sube al carril del taller)
    var ax = cx[4] + nw / 2, ay = cy(2), bx = cx[5], by = cy(0) + nh / 2;
    el("path", { d: "M" + ax + "," + ay + " H" + bx + " V" + (by + 4), fill: "none", stroke: C.acero, "stroke-width": 2.5, "marker-end": "url(#flecha-acero)", "class": "traza" }, f1);
    nodo(nodos[5], f1);
  };

  /* ---------- 12 · Ciclo de vida de una llanta ---------- */
  charts.ciclo = function (svg) {
    var cx = 380, cy = 360;
    // Llanta: banda de rodamiento con taco, flanco y rin
    var llanta = el("g", { "class": "llanta-gira" }, svg);
    el("circle", { cx: cx, cy: cy, r: 210, fill: C.asfalto }, llanta);
    for (var k = 0; k < 40; k++) {
      var a = k * 9;
      el("rect", { x: cx - 9, y: cy - 214, width: 18, height: 30, rx: 3, fill: C.papel, transform: "rotate(" + a + " " + cx + " " + cy + ")" }, llanta);
    }
    el("circle", { cx: cx, cy: cy, r: 168, fill: "#3A3532" }, llanta);
    el("circle", { cx: cx, cy: cy, r: 112, fill: C.niebla }, llanta);
    el("circle", { cx: cx, cy: cy, r: 112, fill: "none", stroke: C.naranja, "stroke-width": 8 }, llanta);
    for (var b = 0; b < 10; b++) {
      var ab = b * 36 * Math.PI / 180;
      el("circle", { cx: cx + 72 * Math.cos(ab), cy: cy + 72 * Math.sin(ab), r: 9, fill: C.asfalto }, llanta);
    }
    el("circle", { cx: cx, cy: cy, r: 34, fill: C.asfalto }, llanta);

    var etapas = [
      ["Instalación", "unidad, posición, km"],
      ["Inspección", "presión y dibujo"],
      ["Rotación", "o reparación"],
      ["Retiro", "km y causa"],
      ["Costo por km", "compra ÷ vida útil"]
    ];
    var R = 252;
    etapas.forEach(function (e, i) {
      var a = (-90 + i * 72) * Math.PI / 180;
      var px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
      var g = frag(svg, i);
      el("circle", { cx: px, cy: py, r: i === 4 ? 24 : 18, fill: i === 4 ? C.naranja : "#fff", stroke: i === 4 ? "#fff" : C.naranja, "stroke-width": 6 }, g);
      el("text", { x: px, y: py + 8, "text-anchor": "middle", "font-size": 20, "font-weight": 800, fill: i === 4 ? "#fff" : C.naranjaTinta }, g, String(i + 1));
      var cos = Math.cos(a), sin = Math.sin(a);
      var anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
      var lx = px + cos * 40, ly = py + sin * 40 + (sin < -0.5 ? -30 : 8);
      var t = lines(g, lx, ly, e, { "text-anchor": anchor, "font-size": 31, fill: C.asfalto }, 34);
      t.firstChild.setAttribute("font-weight", 720);
      t.lastChild.setAttribute("fill", C.acero); t.lastChild.setAttribute("font-size", 25);
    });
  };

  /* ---------- 13 · Hub del Encargado Administrativo ---------- */
  charts.hub = function (svg) {
    var cx = 310, cy = 320, r = 205;
    var nodos = [["Dirección", "reportes"], ["Taller", "mantenimiento"], ["Compras", "solicitudes"],
                 ["Almacén", "existencias"], ["Despacho", "viajes y diésel"]];
    var g = frag(svg, 0);
    nodos.forEach(function (n, i) {
      var a = (-90 + i * 72) * Math.PI / 180, px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      el("line", { x1: cx, y1: cy, x2: px, y2: py, stroke: i === 0 ? C.naranja : C.aceroClaro, "stroke-width": i === 0 ? 4 : 2.5, "class": "traza" }, g);
      el("circle", { cx: px, cy: py, r: 12, fill: i === 0 ? C.naranja : C.asfalto, stroke: C.papel, "stroke-width": 5 }, g);
      var cos = Math.cos(a), sin = Math.sin(a);
      var anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
      var t = lines(g, px + cos * 26, py + (sin < -0.5 ? -48 : sin > 0.5 ? 44 : 2), n, { "text-anchor": anchor, "font-size": 27, fill: C.asfalto }, 30);
      t.firstChild.setAttribute("font-weight", 680);
      t.lastChild.setAttribute("fill", C.acero); t.lastChild.setAttribute("font-size", 23);
    });
    el("circle", { cx: cx, cy: cy, r: 104, fill: C.asfalto }, svg);
    lines(svg, cx, cy - 22, ["Encargado", "Administrativo", "de Logística"], { "text-anchor": "middle", "font-size": 23, fill: "#fff", "font-weight": 650 }, 28);
  };

  /* ---------- 16 · Cascada de internalización (mensual) ---------- */
  charts.cascada = function (svg) {
    var L = 120, R = 1230, T = 60, B = 500, max = 170000;
    var y = function (v) { return B - (v / max) * (B - T); };
    [0, 50000, 100000, 150000].forEach(function (g) {
      el("line", { x1: L, x2: R, y1: y(g), y2: y(g), "class": "eje" }, svg);
      el("text", { x: L - 16, y: y(g) + 8, "text-anchor": "end", "class": "eje-t" }, svg, g === 0 ? "$0" : "$" + g / 1000 + " mil");
    });
    var defs = el("defs", {}, svg);
    var pat = el("pattern", { id: "trama", width: 12, height: 12, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 12, height: 12, fill: "#fff" }, pat);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 12, stroke: C.aceroClaro, "stroke-width": 4 }, pat);

    var w = 132;
    var pasos = [
      { x: 230, de: 0, a: 150452.81, f: C.asfalto, v: "$150,452.81", l: ["Servicios", "CAPASA"], idx: 0 },
      { x: 410, de: 121851.55, a: 150452.81, f: C.acero, v: "− $28,601.26", l: ["Mecánico", "adicional"], idx: 1 },
      { x: 590, de: 0, a: 121851.55, f: C.naranja, v: "$121,851.55", l: ["Diferencia", "bruta"], idx: 2, fuerte: true },
      { x: 770, de: 112906.57, a: 121851.55, f: "url(#trama)", s: C.acero, v: "− $8,944.98", l: ["Horas extra", "si persistieran"], idx: 3 },
      { x: 950, de: 0, a: 112906.57, f: C.velo, s: C.naranja, v: "$112,906.57", l: ["Diferencia con", "horas extra"], idx: 4 }
    ];
    pasos.forEach(function (p, i) {
      var g = frag(svg, p.idx);
      var r = el("rect", { x: p.x - w / 2, y: y(p.a), width: w, height: y(p.de) - y(p.a), rx: 4, fill: p.f,
        stroke: p.s || "none", "stroke-width": p.s ? 3 : 0, "class": p.de === 0 ? "crece" : "cae" }, g);
      el("title", {}, r, p.l.join(" ") + ": " + p.v + " al mes");
      el("text", { x: p.x, y: y(p.a) - 16, "text-anchor": "middle", "class": "val-t", "font-size": p.fuerte ? 28 : 24, "font-weight": p.fuerte ? 700 : 600, fill: p.fuerte ? C.naranjaTinta : C.asfalto }, g, p.v);
      lines(g, p.x, B + 38, p.l, { "text-anchor": "middle", "class": "cat-t", "font-size": 23 }, 28);
      if (i > 0) {
        var prev = pasos[i - 1];
        var nivel = (p.de === 0) ? p.a : p.a;  // une el borde superior del paso anterior con el actual
        el("line", { x1: prev.x + w / 2, x2: p.x - w / 2, y1: y(nivel), y2: y(nivel), stroke: C.aceroClaro, "stroke-width": 2 }, g);
      }
    });
    // Materiales: fuera del comparativo
    var gm = frag(svg, 0);
    el("line", { x1: 1062, x2: 1062, y1: T - 10, y2: B + 70, stroke: C.linea, "stroke-width": 2 }, gm);
    var mx = 1150, mv = 112351.64;
    el("rect", { x: mx - w / 2, y: y(mv), width: w, height: B - y(mv), rx: 4, fill: C.niebla, "class": "crece" }, gm);
    el("text", { x: mx, y: y(mv) - 16, "text-anchor": "middle", "class": "val-t" }, gm, "$112,351.64");
    lines(gm, mx, B + 38, ["Materiales", "permanecen"], { "text-anchor": "middle", "class": "cat-t", "font-size": 23 }, 28);
    lines(gm, mx, T + 6, ["Fuera del", "cálculo"], { "text-anchor": "middle", "class": "eje-t", "font-size": 21 }, 25);
    el("text", { x: L, y: B + 128, "class": "eje-t" }, svg, "Promedio mensual, enero–octubre 2026, sin IVA");
  };

  /* ---------- 4 · Rejilla de unidades ---------- */
  function camion(naranja) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 120 52"); s.setAttribute("class", "camion"); s.setAttribute("aria-hidden", "true");
    var f = naranja ? C.naranja : "none", st = naranja ? C.naranja : C.aceroClaro;
    var dash = naranja ? undefined : "5 4";
    el("rect", { x: 2, y: 6, width: 78, height: 30, rx: 4, fill: f, stroke: st, "stroke-width": 3, "stroke-dasharray": dash }, s);
    el("path", { d: "M84 14 h18 l12 12 v10 h-30 z", fill: naranja ? C.asfalto : "none", stroke: naranja ? C.asfalto : C.aceroClaro, "stroke-width": 3, "stroke-linejoin": "round", "stroke-dasharray": dash }, s);
    [16, 34, 94, 108].forEach(function (x) { el("circle", { cx: x, cy: 42, r: 7, fill: naranja ? C.asfalto : "none", stroke: naranja ? "#fff" : C.aceroClaro, "stroke-width": 2.5 }, s); });
    return s;
  }
  function unidades(box) {
    var total = +box.dataset.unidades, cub = +box.dataset.cubiertas;
    for (var i = 0; i < total; i++) box.appendChild(camion(i < cub));
  }

  document.querySelectorAll("svg[data-chart]").forEach(function (svg) {
    var fn = charts[svg.dataset.chart];
    if (fn) fn(svg);
  });
  document.querySelectorAll("[data-unidades]").forEach(unidades);
})();
