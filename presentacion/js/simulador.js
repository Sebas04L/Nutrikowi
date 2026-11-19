/* Simulador de internalización: aritmética de sensibilidad con los promedios del brief.
   Diferencia = servicios CAPASA × % absorbido − mecánicos × costo empresa − horas extra (si persisten). */
(function () {
  "use strict";
  var SERV = 150452.81, MEC = 28601.26, HE = 8944.98;
  var raiz = document.querySelector(".simulador");
  if (!raiz) return;
  var p = raiz.querySelector("#sim-p"), pOut = raiz.querySelector("#sim-p-out");
  var estado = { n: 1, h: 0 };

  function dinero(v) {
    var s = Math.abs(v).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (v < 0 ? "− $" : "$") + s;
  }
  function pct(v) { return Math.round(v * 1000) / 10 + "%"; }

  function calcular() {
    var frac = +p.value / 100;
    var abs = SERV * frac, per = MEC * estado.n, he = estado.h ? HE : 0;
    var dif = abs - per - he;
    var eq = (per + he) / SERV;
    pOut.textContent = p.value + "%";
    p.style.setProperty("--p", p.value + "%");
    p.setAttribute("aria-valuetext", p.value + " por ciento");
    var out = raiz.querySelector("#sim-out");
    out.textContent = dinero(dif);
    out.classList.toggle("negativo", dif < 0);
    if (window.syncRotulo) window.syncRotulo(out); else out.dataset.t = out.textContent;
    raiz.querySelector("#sim-anual").textContent = dinero(dif * 12);
    raiz.querySelector("#sim-b1").style.width = (frac * 100) + "%";
    raiz.querySelector("#sim-b2").style.width = (per / SERV * 100) + "%";
    raiz.querySelector("#sim-b3").style.width = (he / SERV * 100) + "%";
    raiz.querySelector("#sim-v1").textContent = dinero(abs);
    raiz.querySelector("#sim-v2").textContent = dinero(-per);
    raiz.querySelector("#sim-v3").textContent = he ? dinero(-he) : "$0.00";
    raiz.querySelector("#sim-eq-txt").textContent = pct(eq);
    raiz.querySelector("#sim-eq-marca").style.left = (eq * 100) + "%";
  }

  p.addEventListener("input", calcular);
  raiz.querySelectorAll(".segmentado").forEach(function (grupo) {
    grupo.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      grupo.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
      if (b.dataset.n) estado.n = +b.dataset.n;
      if (b.dataset.h) estado.h = +b.dataset.h;
      calcular();
    });
  });
  // Evita que Reveal cambie de diapositiva al usar flechas sobre los controles
  raiz.addEventListener("keydown", function (e) { if (e.target.matches("input, button")) e.stopPropagation(); });
  calcular();
})();
