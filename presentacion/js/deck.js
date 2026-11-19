/* Nutrikowi · Navegación, riel narrativo y animaciones
   Principio: el HTML ya contiene el estado final. GSAP solo anima la llegada,
   así el PDF, la impresión y el modo de movimiento reducido son siempre completos. */
(function () {
  "use strict";

  var CAPITULOS = ["Contexto", "Dimensión", "Problema", "Impacto", "Solución", "Valor", "Decisión"];
  var IMPRESION = /print-pdf/i.test(window.location.search);
  var REDUCIDO = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ANIMA = !IMPRESION && !REDUCIDO && typeof gsap !== "undefined";

  var secciones = Array.prototype.slice.call(document.querySelectorAll(".reveal .slides > section"));
  var total = secciones.length;

  /* ---------- Riel narrativo: se inyecta en cada diapositiva ---------- */
  var porCap = {};
  secciones.forEach(function (s) {
    if (s.dataset.cap === undefined) return;
    var c = +s.dataset.cap;
    (porCap[c] = porCap[c] || []).push(s);
  });

  function fraccion(s) {
    var lista = porCap[+s.dataset.cap];
    return (lista.indexOf(s) + 1) / lista.length;
  }

  secciones.forEach(function (s, i) {
    if (s.dataset.cap === undefined) return;
    var actual = +s.dataset.cap;
    var riel = document.createElement("nav");
    riel.className = "riel";
    riel.setAttribute("aria-label", "Avance de la presentación");
    CAPITULOS.forEach(function (nombre, c) {
      var d = document.createElement("div");
      d.className = "cap" + (c < actual ? " hecho" : c === actual ? " actual" : "");
      if (c === actual) d.setAttribute("aria-current", "step");
      var r = document.createElement("span");
      r.className = "relleno";
      var ancho = c < actual ? 1 : c === actual ? fraccion(s) : 0;
      r.style.width = "calc((100% - 10px) * " + ancho + ")";
      r.dataset.ancho = ancho;
      d.appendChild(r);
      d.appendChild(document.createTextNode(nombre));
      riel.appendChild(d);
    });
    var folio = document.createElement("div");
    folio.className = "folio";
    folio.textContent = String(i + 1).padStart(2, "0") + " / " + total;
    riel.appendChild(folio);
    s.insertBefore(riel, s.firstChild);
  });

  /* ---------- Reveal ---------- */
  Reveal.initialize({
    width: 1920, height: 1080, margin: 0, minScale: 0.1, maxScale: 3,
    center: false, hash: true, history: false,
    controls: true, controlsTutorial: false, controlsLayout: "bottom-right",
    progress: false, slideNumber: false,
    transition: REDUCIDO ? "none" : "fade", transitionSpeed: "default", backgroundTransition: "fade",
    navigationMode: "linear",
    pdfSeparateFragments: false, pdfMaxPagesPerSlide: 1,
    plugins: [RevealNotes]
  });

  if (IMPRESION) return;

  /* ---------- Utilidades de animación ---------- */
  function contar(el) {
    var to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
    var pre = el.dataset.pre || "", suf = el.dataset.suf || "";
    var fmt = function (v) { return pre + v.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
    var o = { v: 0 };
    gsap.killTweensOf(o);
    gsap.to(o, { v: to, duration: to > 1000 ? 1.6 : 1.1, ease: "power3.out", onUpdate: function () { el.textContent = fmt(o.v); }, onComplete: function () { el.textContent = fmt(to); } });
  }

  function animarGrupo(raiz) {
    if (!ANIMA || !raiz) return;
    raiz.querySelectorAll(".cuenta").forEach(contar);
    var crece = raiz.querySelectorAll(".crece");
    if (crece.length) gsap.fromTo(crece, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: .8, ease: "power3.out", stagger: .07 });
    var cae = raiz.querySelectorAll(".cae");
    if (cae.length) gsap.fromTo(cae, { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: .7, ease: "power3.out", delay: .1 });
    var crX = raiz.querySelectorAll(".crece-x");
    if (crX.length) gsap.fromTo(crX, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .8, ease: "power3.out", stagger: .12 });
    raiz.querySelectorAll(".traza").forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 0;
      if (!len) return;
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: .9, ease: "power2.inOut", onComplete: function () { p.style.strokeDasharray = "none"; } });
    });
    var reglas = raiz.querySelectorAll(".regla, .base, .barra > span, .barra-fase, .fase .barra, .linea-t");
    if (reglas.length) gsap.fromTo(reglas, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .9, ease: "power3.out", stagger: .08 });
  }

  /* Elementos que no son fragmentos: animan al entrar a la diapositiva */
  function fueraDeFragmentos(slide, selector) {
    return Array.prototype.filter.call(slide.querySelectorAll(selector), function (n) { return !n.closest(".fragment"); });
  }

  var anterior = null;

  function entrar(slide, previa) {
    if (!ANIMA || !slide) return;

    // Riel: el capítulo actual crece desde donde estaba
    var relleno = slide.querySelector(".riel .cap.actual .relleno");
    if (relleno) {
      var desde = 0;
      if (previa && previa.dataset.cap === slide.dataset.cap) desde = fraccion(previa);
      else if (previa && previa.dataset.cap !== undefined && +previa.dataset.cap > +slide.dataset.cap) desde = 1;
      var hasta = +relleno.dataset.ancho;
      gsap.fromTo(relleno, { width: "calc((100% - 10px) * " + desde + ")" }, { width: "calc((100% - 10px) * " + hasta + ")", duration: .9, ease: "power2.out" });
    }

    // Titular
    var t = slide.querySelector(".titular");
    if (t) gsap.fromTo(t, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .7, ease: "power3.out" });

    // Portada: secuencia única
    if (slide.classList.contains("portada")) {
      var tl = gsap.timeline();
      tl.fromTo(slide.querySelector(".logo"), { opacity: 0 }, { opacity: 1, duration: .6 })
        .fromTo(slide.querySelector("h1"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .8, ease: "power3.out" }, "-=.2")
        .fromTo(slide.querySelector(".regla"), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, "-=.4")
        .fromTo(slide.querySelectorAll("[data-anim='sub']"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, stagger: .12 }, "-=.5");
      return;
    }

    // Contenido fuera de fragmentos
    var cont = document.createDocumentFragment ? slide : slide;
    fueraDeFragmentos(slide, ".cuenta").forEach(contar);
    var reglas = fueraDeFragmentos(slide, ".regla, .progreso-flujo");
    if (reglas.length) gsap.fromTo(reglas, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 1.2, ease: "power3.inOut", delay: .25 });
    var barras = fueraDeFragmentos(slide, ".crece");
    if (barras.length) gsap.fromTo(barras, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: .8, ease: "power3.out", stagger: .06, delay: .2 });
    var trazas = fueraDeFragmentos(slide, ".traza");
    trazas.forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 0;
      if (len) gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: .9, delay: .3, ease: "power2.inOut", onComplete: function () { p.style.strokeDasharray = "none"; } });
    });
    var pasos = slide.querySelectorAll(".orden .paso");
    if (pasos.length) gsap.fromTo(pasos, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .1, delay: .2, ease: "power2.out" });
    var captura = fueraDeFragmentos(slide, ".captura");
    if (captura.length) gsap.fromTo(captura, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .7, delay: .2, ease: "power3.out" });

    // Fragmentos ya visibles al llegar (p. ej. navegación hacia atrás)
    slide.querySelectorAll(".fragment.visible").forEach(animarGrupo);
  }

  Reveal.on("ready", function (e) { entrar(e.currentSlide, null); anterior = e.currentSlide; });
  Reveal.on("slidechanged", function (e) { entrar(e.currentSlide, e.previousSlide); anterior = e.currentSlide; });
  Reveal.on("fragmentshown", function (e) { (e.fragments || [e.fragment]).forEach(animarGrupo); });

  /* ---------- Visor de capturas ---------- */
  var visor = document.querySelector(".visor"), visorImg = visor.querySelector("img");
  function abrir(fig) {
    var img = fig.querySelector("img");
    visorImg.src = img.src; visorImg.alt = img.alt;
    visor.classList.add("abierto");
    Reveal.configure({ keyboard: false });
  }
  function cerrar() { visor.classList.remove("abierto"); Reveal.configure({ keyboard: true }); }
  document.querySelectorAll(".captura").forEach(function (fig) {
    fig.addEventListener("click", function (ev) { ev.stopPropagation(); abrir(fig); });
    fig.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); abrir(fig); } });
  });
  visor.addEventListener("click", cerrar);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && visor.classList.contains("abierto")) cerrar(); }, true);
})();
