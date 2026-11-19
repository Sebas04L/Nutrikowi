// Recorrido 3D del almacén del taller con 5S aplicadas.
// Distribución tomada de las fotos: estantería doble en la pared izquierda, estante blanco en el fondo,
// banco metálico con termo en la esquina del fondo derecha, pizarrón en la pared derecha,
// tablero de herramientas junto a la entrada. Unidades en metros. window.render(t) dibuja el segundo t.
import * as THREE from "./three.module.js";
await document.fonts.load("700 40px Archivo");

const NAR = 0xEE7A17, TINTA = 0x24211F;
const DUR = 45;

// ---------- utilidades ----------
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const win = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;

function lienzo(w, h, dibujar) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); dibujar(g, w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  tx.userData = { c, g }; return tx;
}
const F = (px, w = 700, s = 112) => `${w} ${px}px Archivo`;

// ---------- renderer y escena ----------
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1920, 1080, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3e9d8);
scene.fog = new THREE.Fog(0xf3e9d8, 14, 30);
const camera = new THREE.PerspectiveCamera(58, 1920 / 1080, 0.05, 60);

scene.add(new THREE.HemisphereLight(0xfff4e2, 0x6f6252, 0.9));
const sol = new THREE.DirectionalLight(0xffe2b8, 1.6);
sol.position.set(-4, 7, 1.5); sol.target.position.set(3, 0, 2.2);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
sol.shadow.bias = -0.0008; scene.add(sol, sol.target);
[[1.8, 2.8, 1.4], [4.2, 2.8, 1.4], [3.0, 2.8, 3.4], [5.4, 2.7, 3.0]].forEach(([x, y, z]) => {
  const l = new THREE.PointLight(0xfff1dc, 7, 7, 1.6); l.position.set(x, y, z); scene.add(l);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  lamp.position.set(x, 2.96, z); scene.add(lamp);
});

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...o });
function caja(w, h, d, mat, x, y, z, padre = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; padre.add(m); return m;
}

// ---------- cuarto ----------
const RX = 6.0, RZ = 4.4, RY = 3.0;
const lamina = lienzo(1024, 512, (g, w, h) => {
  g.fillStyle = "#d9caa6"; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) {
    const gr = g.createLinearGradient(x, 0, x + 32, 0);
    gr.addColorStop(0, "#c9b78f"); gr.addColorStop(.35, "#eadbb8"); gr.addColorStop(.7, "#d3c39e"); gr.addColorStop(1, "#bfae86");
    g.fillStyle = gr; g.fillRect(x, 0, 32, h);
  }
  g.globalAlpha = .12; for (let i = 0; i < 40; i++) { g.fillStyle = "#7a6440"; g.fillRect(rnd() * w, h * .55 + rnd() * h * .45, rnd() * 160, 4 + rnd() * 10); }
});
lamina.wrapS = lamina.wrapT = THREE.RepeatWrapping;
function pared(ancho, alto, x, y, z, ry) {
  const t = lamina.clone(); t.needsUpdate = true; t.repeat.set(ancho / 1.6, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), M(0xffffff, { map: t, roughness: .55, metalness: .25, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m;
}
pared(RX, RY, RX / 2, RY / 2, 0, 0);                  // izquierda (z=0)
pared(RX, RY, RX / 2, RY / 2, RZ, Math.PI);           // derecha (z=RZ)
pared(RZ, RY, RX, RY / 2, RZ / 2, -Math.PI / 2);      // fondo (x=RX)
pared(1.4, RY, 0, RY / 2, 0.7, Math.PI / 2);          // frente, a la izquierda de la entrada
pared(1.2, RY, 0, RY / 2, RZ - 0.6, Math.PI / 2);     // frente, a la derecha
pared(1.8, 0.7, 0, RY - 0.35, 2.3, Math.PI / 2);      // dintel de la entrada
// estructura (postes y vigas color crema, como en las fotos)
const crema = M(0xe6dcc4, { roughness: .6 });
[0.02, 2.0, 4.0, 5.98].forEach((x) => { caja(0.1, RY, 0.1, crema, x, RY / 2, 0.06); caja(0.1, RY, 0.1, crema, x, RY / 2, RZ - 0.06); });
[1.0, 3.0, 5.0].forEach((x) => caja(0.08, 0.14, RZ, crema, x, RY - 0.07, RZ / 2));
caja(RX, 0.08, 0.08, crema, RX / 2, 1.25, 0.05); caja(RX, 0.08, 0.08, crema, RX / 2, 1.25, RZ - 0.05);
const techo = new THREE.Mesh(new THREE.PlaneGeometry(RX, RZ), M(0x8f8676, { side: THREE.DoubleSide }));
techo.rotation.x = Math.PI / 2; techo.position.set(RX / 2, RY, RZ / 2); scene.add(techo);
// exterior luminoso tras la entrada
const fuera = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshBasicMaterial({ color: 0xfbf3e4 }));
fuera.rotation.y = Math.PI / 2; fuera.position.set(-12, 4, 2.2); scene.add(fuera);
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M(0xcfc0a4));
suelo.rotation.x = -Math.PI / 2; suelo.position.set(-10, -0.001, 2); suelo.receiveShadow = true; scene.add(suelo);

// piso de concreto + capa de polvo animable
const concreto = lienzo(1024, 1024, (g, w, h) => {
  g.fillStyle = "#c8c3b9"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 170 + rnd() * 50; g.fillStyle = `rgba(${v},${v - 4},${v - 10},.35)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  g.strokeStyle = "rgba(120,112,100,.35)"; g.lineWidth = 3; [w / 2].forEach((p) => { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); });
});
const piso = new THREE.Mesh(new THREE.PlaneGeometry(RX, RZ), M(0xffffff, { map: concreto, roughness: .9 }));
piso.rotation.x = -Math.PI / 2; piso.position.set(RX / 2, 0, RZ / 2); piso.receiveShadow = true; scene.add(piso);
const polvoTx = lienzo(1024, 1024, (g, w, h) => {
  g.fillStyle = "rgba(150,120,80,.55)"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(110,85,55,${rr(.05, .25)})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rr(20, 120), rr(10, 60), rnd() * 3, 0, 7); g.fill(); }
});
const polvo = new THREE.Mesh(new THREE.PlaneGeometry(RX, RZ), new THREE.MeshStandardMaterial({ map: polvoTx, transparent: true, roughness: 1, depthWrite: false }));
polvo.rotation.x = -Math.PI / 2; polvo.position.set(RX / 2, 0.003, RZ / 2); polvo.receiveShadow = true; scene.add(polvo);

// ---------- estanterías (posiciones de las fotos) ----------
const mueble = M(0xeee6d6, { roughness: .55 }), tabla = M(0xc9b080, { roughness: .8 });
const estantes = [];
function estante(nombre, cx, cz, ancho, fondo, alto, niveles, ry, familia) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; scene.add(g);
  const ys = []; for (let i = 0; i < niveles; i++) ys.push(0.12 + i * (alto - 0.2) / (niveles - 1));
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => caja(0.045, alto, 0.045, mueble, sx * (ancho / 2 - 0.02), alto / 2, sz * (fondo / 2 - 0.02), g)));
  ys.forEach((y) => { caja(ancho, 0.025, fondo, tabla, 0, y, 0, g); caja(ancho, 0.05, 0.03, mueble, 0, y, fondo / 2 - 0.015, g); });
  const e = { nombre, g, ancho, fondo, ys, familia }; estantes.push(e); return e;
}
// pared izquierda: dos módulos (frente hacia +z)
const A1 = estante("A1", 1.8, 0.3, 1.8, 0.5, 2.05, 5, 0, "filtros");
const A2 = estante("A2", 3.65, 0.3, 1.8, 0.5, 2.05, 5, 0, "refacciones");
// fondo: estante blanco (frente hacia -x)
const B = estante("B", RX - 0.28, 2.2, 1.8, 0.45, 1.85, 5, -Math.PI / 2, "consumibles");

// ---------- objetos: posición final (orden) y posición inicial (desorden) ----------
const items = [];
const local = new THREE.Vector3();
function aMundo(e, x, y, z) { local.set(x, y, z); return e.g.localToWorld(local.clone()); }
const colores = { filtro: [0xf2f2ee, 0x2f5c9e, 0xe8e2d0, 0xd2462f], spray: [0xc0392b, 0x2a6fb5, 0xf1c40f, 0xe8e8e8], amarilla: 0xf2c200, carton: 0xc29a66, bote: [0xf7f4ee, 0xEE7A17, 0x2f5c9e] };

function etiquetaTx(txt) {
  return lienzo(256, 96, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#EE7A17"; g.fillRect(0, 0, 18, h);
    g.fillStyle = "#24211F"; g.font = F(46, 700); g.textBaseline = "middle"; g.fillText(txt, 32, h / 2 + 2); });
}
const etiquetas = []; // aparecen en Ordenar

function poner(e, nivel, tipo, xl, idx) {
  const y0 = e.ys[nivel] + 0.0125; let mesh, h;
  if (tipo === "filtro") {
    const r = rr(.055, .09); h = rr(.16, .28);
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), M(colores.filtro[idx % 4], { roughness: .45 }));
  } else if (tipo === "filtroG") {
    const r = .13; h = .32; mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), M(0xf4f1ea, { roughness: .5 }));
  } else if (tipo === "spray") {
    const r = .032; h = .2; mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), M(colores.spray[idx % 4], { roughness: .35, metalness: .3 }));
  } else if (tipo === "bote") {
    h = .28; mesh = new THREE.Mesh(new THREE.BoxGeometry(.16, h, .12), M(colores.bote[idx % 3], { roughness: .5 }));
  } else if (tipo === "contenedor") {
    h = .17; mesh = new THREE.Mesh(new THREE.BoxGeometry(.24, h, .34), M(0x3b3d40, { roughness: .7 }));
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(.16, .06), new THREE.MeshBasicMaterial({ map: etiquetaTx(`${e.nombre}-${nivel + 1}`), toneMapped: false }));
    lab.position.set(0, .01, .171); mesh.add(lab);
  } else if (tipo === "amarilla") {
    h = .14; mesh = new THREE.Mesh(new THREE.BoxGeometry(.42, h, .3), M(colores.amarilla, { roughness: .55 }));
  } else if (tipo === "carton") {
    h = rr(.16, .26); mesh = new THREE.Mesh(new THREE.BoxGeometry(rr(.22, .34), h, rr(.24, .32)), M(colores.carton));
  } else if (tipo === "caja_roja") {
    h = .2; mesh = new THREE.Mesh(new THREE.BoxGeometry(.5, h, .22), M(0xb8282a, { roughness: .4, metalness: .4 }));
  }
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  const destino = aMundo(e, xl, y0 + h / 2, 0.02);
  const rotFinal = e.g.rotation.y;
  let inicio, rotIni;
  if (rnd() < 0.42) { // en el piso
    inicio = new THREE.Vector3(rr(1.1, 4.9), h / 2, rr(1.0, 3.2)); rotIni = new THREE.Euler(0, rr(-3, 3), rnd() < .3 ? Math.PI / 2 : 0);
    if (tipo === "filtro" || tipo === "spray" || tipo === "filtroG") { rotIni.x = rnd() < .5 ? Math.PI / 2 : 0; if (rotIni.x) inicio.y = .07; }
  } else { // revuelto en el estante
    inicio = aMundo(e, clamp(xl + rr(-.25, .25), -e.ancho / 2 + .15, e.ancho / 2 - .15), y0 + h / 2, rr(-.12, .1));
    rotIni = new THREE.Euler(0, rotFinal + rr(-.9, .9), 0);
  }
  items.push({ mesh, destino, rotFinal, inicio, rotIni, retardo: rnd() });
}

function llenar(e, plan) {
  plan.forEach((fila, nivel) => {
    let x = -e.ancho / 2 + 0.12, i = 0;
    const paso = { filtro: .2, filtroG: .3, spray: .085, bote: .2, contenedor: .29, amarilla: .46, carton: .36, caja_roja: .56 };
    while (x < e.ancho / 2 - 0.12) {
      const tipo = fila[i % fila.length];
      if (x + paso[tipo] > e.ancho / 2 - 0.05) break;
      poner(e, nivel, tipo, x + paso[tipo] / 2 - 0.02, i); x += paso[tipo]; i++;
    }
  });
}
llenar(A1, [["filtroG"], ["filtro"], ["filtro", "filtro", "spray"], ["contenedor"], ["carton"]]);
llenar(A2, [["amarilla"], ["contenedor"], ["contenedor", "contenedor", "amarilla"], ["contenedor"], ["carton"]]);
llenar(B, [["carton"], ["bote", "bote", "spray", "spray"], ["contenedor"], ["caja_roja", "contenedor"], ["carton"]]);

// rótulos de familia (como en la propuesta) y códigos de nivel
function rotulo(txt, ancho = 1.1) {
  const tx = lienzo(640, 150, (g, w, h) => {
    g.fillStyle = "#EE7A17"; g.beginPath(); g.roundRect(0, 0, 150, h, [18, 0, 0, 18]); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.roundRect(150, 0, w - 150, h, [0, 18, 18, 0]); g.fill();
    g.fillStyle = "#EE7A17"; g.font = F(30, 760); g.fillText("NUTRIKOWI", 190, 50);
    g.fillStyle = "#24211F"; g.font = F(64, 780); g.fillText(txt, 188, 118);
    g.strokeStyle = "#fff"; g.lineWidth = 10; g.beginPath(); g.arc(75, 75, 34, 0, 7); g.stroke();
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * 150 / 640), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  return m;
}
function colgar(e, txt) {
  const r = rotulo(txt); const p = aMundo(e, 0, e.ys[e.ys.length - 1] + .38, e.fondo / 2 + .01);
  r.position.copy(p); r.rotation.y = e.g.rotation.y; scene.add(r); etiquetas.push({ m: r, t0: 16.6 + etiquetas.length * .35, escala: true });
  e.ys.forEach((y, n) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(.2, .065), new THREE.MeshBasicMaterial({ map: etiquetaTx(`${e.nombre}-${n + 1}`), toneMapped: false }));
    l.position.copy(aMundo(e, -e.ancho / 2 + .2, y - .005, e.fondo / 2 + .002)); l.rotation.y = e.g.rotation.y; scene.add(l);
    etiquetas.push({ m: l, t0: 17.4 + n * .12 + etiquetas.length * .02, escala: true });
  });
}
colgar(A1, "FILTROS"); colgar(A2, "REFACCIONES"); colgar(B, "CONSUMIBLES");

// ---------- banco de trabajo, termo, silla ----------
const metal = M(0xa7aaac, { metalness: .6, roughness: .35 });
const banco = new THREE.Group(); banco.position.set(RX - .42, 0, RZ - .78); scene.add(banco);
caja(.7, .04, 1.3, metal, 0, .9, 0, banco);
[[-.32, -.6], [-.32, .6], [.32, -.6], [.32, .6]].forEach(([x, z]) => caja(.04, .9, .04, metal, x, .45, z, banco));
caja(.6, .55, .5, M(0x8d9194, { metalness: .5, roughness: .4 }), 0, .55, .35, banco);
[.42, .62].forEach((y) => caja(.02, .03, .2, M(0x4a4d50), -.31, y, .35, banco));
const termo = new THREE.Group(); termo.position.set(RX - .42, .92, RZ - .3); scene.add(termo);
{ const c = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .42, 28), M(0xf2c200, { roughness: .45 })); c.position.y = .21; c.castShadow = true; termo.add(c);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .07, 28), M(0xc8262c, { roughness: .4 })); tapa.position.y = .45; termo.add(tapa); }
const laptop = new THREE.Group(); laptop.position.set(RX - .45, .925, RZ - 1.15); laptop.rotation.y = -Math.PI / 2; scene.add(laptop);
caja(.34, .015, .24, M(0x3a3d41, { metalness: .5 }), 0, 0, 0, laptop);
{ const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(.33, .21), new THREE.MeshBasicMaterial({ map: lienzo(330, 210, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#EE7A17"; g.fillRect(0, 0, w, 36); g.fillStyle = "#24211F"; g.font = F(22, 700); g.fillText("Inventario del taller", 14, 70); for (let i = 0; i < 5; i++) { g.fillStyle = "#e5ddd4"; g.fillRect(14, 90 + i * 22, w - 28, 14); } }), toneMapped: false }));
  pantalla.position.set(0, .11, -.12); pantalla.rotation.x = -.25; laptop.add(pantalla); }
// tiradero sobre el banco (se retira en Limpiar)
const tiradero = [];
for (let i = 0; i < 16; i++) {
  const m = caja(rr(.05, .16), rr(.03, .1), rr(.05, .16), M([0x5a5a5a, 0x2f5c9e, 0xc0392b, 0xc29a66, 0x9a9a9a][i % 5]), RX - .42 + rr(-.28, .28), .95, RZ - .78 + rr(-.55, .2));
  m.rotation.y = rr(0, 3); tiradero.push(m);
}
for (let i = 0; i < 18; i++) { // basura en el piso
  const m = caja(rr(.06, .2), .02, rr(.04, .16), M([0xe9e4dc, 0x6b5a45, 0x9c9488][i % 3]), rr(1.0, 5.0), .01, rr(.9, 3.6)); m.rotation.y = rr(0, 3); tiradero.push(m);
}
const silla = new THREE.Group(); silla.position.set(4.7, 0, 2.9); silla.rotation.y = -2.2; scene.add(silla);
{ const tela = M(0xb8aa92, { roughness: .95 }), neg = M(0x2a2a2a, { metalness: .5 });
  caja(.46, .07, .44, tela, 0, .46, 0, silla); caja(.46, .42, .06, tela, 0, .75, -.22, silla);
  [[-.2, -.2], [-.2, .2], [.2, -.2], [.2, .2]].forEach(([x, z]) => caja(.03, .46, .03, neg, x, .23, z, silla)); }

// ---------- tambos y garrafones: del desorden a la zona marcada ----------
const tambos = [];
const zonaT = { x0: 4.15, x1: 5.15, z0: 3.45, z1: 4.32 };
const colT = [0x2e8b57, 0x1f5fb3, 0xf2c200, 0xc8262c, 0x2e8b57, 0x1f5fb3];
for (let i = 0; i < 6; i++) {
  const g = new THREE.Group(); scene.add(g);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.15, .14, .38, 24), M(colT[i], { roughness: .45 })); c.position.y = .19; c.castShadow = true; g.add(c);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(.152, .152, .03, 24), M(0xeeeeee)); tapa.position.y = .38; g.add(tapa);
  const col = i % 3, fila = Math.floor(i / 3);
  tambos.push({ g, ini: new THREE.Vector3(rr(1.6, 3.6), 0, rr(2.3, 3.6)), fin: new THREE.Vector3(zonaT.x0 + .2 + col * .33, 0, zonaT.z0 + .2 + fila * .38) });
}
for (let i = 0; i < 3; i++) { // garrafones de agua
  const g = new THREE.Group(); scene.add(g);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .42, 24), new THREE.MeshPhysicalMaterial({ color: 0x6fa8dc, transmission: .2, roughness: .2, transparent: true, opacity: .85 }));
  c.position.y = .21; g.add(c);
  tambos.push({ g, ini: new THREE.Vector3(rr(2.2, 3.8), 0, rr(2.0, 3.2)), fin: new THREE.Vector3(zonaT.x0 + 1.1 + .0, 0, zonaT.z0 + .15 + i * .3) });
}

// ---------- tarjeta roja: objetos que salen ----------
const zonaR = { x0: .35, x1: 1.15, z0: 3.55, z1: 4.3 };
const rojos = [];
for (let i = 0; i < 6; i++) {
  const m = caja(rr(.25, .4), rr(.12, .25), rr(.2, .3), M([0x8a7458, 0x6b6b6b, 0xa8875a][i % 3]), 0, 0, 0);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(.12, .16), new THREE.MeshBasicMaterial({ color: 0xd62828, side: THREE.DoubleSide }));
  tag.position.set(0, m.geometry.parameters.height / 2 + .09, 0); tag.scale.setScalar(0.001); m.add(tag);
  rojos.push({ m, tag, ini: new THREE.Vector3(rr(1.4, 4.4), m.geometry.parameters.height / 2, rr(1.2, 3.3)), fin: new THREE.Vector3(zonaR.x0 + .22 + (i % 3) * .26, m.geometry.parameters.height / 2 + Math.floor(i / 3) * 0.0, zonaR.z0 + .2 + Math.floor(i / 3) * .36), ry: rr(0, 3) });
}
const letreroRojo = new THREE.Mesh(new THREE.PlaneGeometry(.8, .32), new THREE.MeshBasicMaterial({ map: lienzo(500, 200, (g, w, h) => { g.fillStyle = "#d62828"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = F(56, 780); g.fillText("TARJETA", 30, 88); g.fillText("ROJA", 30, 160); }), toneMapped: false, transparent: true }));
letreroRojo.position.set(.75, .9, RZ - .01); letreroRojo.rotation.y = Math.PI; scene.add(letreroRojo);

// ---------- cinta de piso (Estandarizar) ----------
const cintas = [];
function cinta(x0, z0, x1, z1, color = 0xf2c200, t0 = 26.5) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, .07), new THREE.MeshStandardMaterial({ color, roughness: .6 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
  m.position.set(x0, .006, z0); m.geometry.translate(len / 2, 0, 0); m.scale.x = .001; scene.add(m);
  cintas.push({ m, t0 }); return m;
}
cinta(.95, .78, 4.6, .78); cinta(5.32, 1.2, 5.32, 3.2, 0xf2c200, 27.0);
[[zonaT.x0, zonaT.z0, zonaT.x1 + .25, zonaT.z0], [zonaT.x1 + .25, zonaT.z0, zonaT.x1 + .25, zonaT.z1], [zonaT.x0, zonaT.z0, zonaT.x0, zonaT.z1]].forEach((s, i) => cinta(...s, NAR, 27.4 + i * .25));
[[zonaR.x0, zonaR.z0, zonaR.x1, zonaR.z0], [zonaR.x1, zonaR.z0, zonaR.x1, zonaR.z1]].forEach((s, i) => cinta(...s, 0xd62828, 28.2 + i * .25));

// ---------- pizarrón: notas sueltas -> tablero 5S con checklist ----------
const pizTx = lienzo(1024, 640, () => {});
function pintarPizarron(p5s, checks) {
  const { g, c } = pizTx.userData; const w = c.width, h = c.height;
  g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h);
  g.globalAlpha = 1 - p5s; g.strokeStyle = "#3a4a8a"; g.lineWidth = 4;
  for (let i = 0; i < 9; i++) { g.beginPath(); let x = 60 + (i % 2) * 420, y = 70 + i * 60; g.moveTo(x, y); for (let k = 0; k < 14; k++) g.lineTo(x + k * 22, y + Math.sin(k * 1.7 + i) * 9); g.stroke(); }
  g.globalAlpha = p5s;
  g.fillStyle = "#EE7A17"; g.fillRect(0, 0, w, 120); g.fillStyle = "#fff"; g.font = F(64, 780); g.fillText("TABLERO 5S · ALMACÉN", 40, 84);
  const filas = ["Nada en el piso", "Cada cosa en su ubicación", "Banco despejado", "Faltantes anotados", "Auditoría semanal"];
  filas.forEach((f, i) => {
    const y = 190 + i * 88; g.strokeStyle = "#EE7A17"; g.lineWidth = 7; g.strokeRect(50, y - 46, 56, 56);
    if (checks > i) { g.strokeStyle = "#2F7D57"; g.lineWidth = 12; g.beginPath(); g.moveTo(60, y - 20); g.lineTo(76, y - 2); g.lineTo(102, y - 40); g.stroke(); }
    g.fillStyle = "#24211F"; g.font = F(46, 560); g.fillText(f, 140, y);
  });
  g.globalAlpha = 1; pizTx.needsUpdate = true;
}
const pizarron = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: pizTx, roughness: .35, emissive: 0xffffff, emissiveMap: pizTx, emissiveIntensity: .15 }));
pizarron.position.set(3.35, 1.75, RZ - .03); pizarron.rotation.y = Math.PI; scene.add(pizarron);
caja(1.66, 1.06, .02, M(0x9ea3a7, { metalness: .6 }), 3.35, 1.75, RZ - .012);

// ---------- tablero de herramientas con siluetas (Disciplina) ----------
const herrTx = lienzo(900, 560, () => {});
function pintarHerramientas(sil) {
  const { g, c } = herrTx.userData; const w = c.width, h = c.height;
  g.fillStyle = "#c79b62"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(120,80,40,.25)"; g.beginPath(); g.moveTo(0, i * 14 + rnd() * 6); g.lineTo(w, i * 14 + rnd() * 6); g.stroke(); }
  for (let i = 0; i < 12; i++) {
    const x = 80 + i * 64, L = 150 + (i % 4) * 40, y = 120;
    if (sil > 0) { g.globalAlpha = sil; g.strokeStyle = "#EE7A17"; g.lineWidth = 12; g.lineJoin = "round"; g.strokeRect(x - 16, y - 16, 32, L + 32); g.globalAlpha = 1; }
    g.fillStyle = "#9aa0a6"; g.fillRect(x - 7, y, 14, L); g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill();
  }
  if (sil > 0) { g.globalAlpha = sil; g.fillStyle = "#24211F"; g.font = F(40, 720); g.fillText("Cada herramienta tiene su silueta", 70, h - 50); g.globalAlpha = 1; }
  herrTx.needsUpdate = true;
}
const tablero = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .93), new THREE.MeshStandardMaterial({ map: herrTx, roughness: .8 }));
tablero.position.set(1.35, 1.55, RZ - .02); tablero.rotation.y = Math.PI; scene.add(tablero);
// ventilador de pedestal (como en la foto)
if (false) { const v = new THREE.Group(); v.position.set(.35, 0, .55); scene.add(v);
  caja(.04, 1.3, .04, M(0x2a2a2a), 0, .65, 0, v);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(.28, .015, 8, 40), M(0xbfc3c6, { metalness: .8, roughness: .3 })); aro.position.y = 1.4; aro.rotation.y = .9; v.add(aro);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .02, 24), M(0x2a2a2a)); base.position.y = .01; v.add(base); }

// ---------- estación de limpieza (Limpiar) ----------
const estacion = [];
{ const base = new THREE.Group(); base.position.set(.12, 0, 1.0); base.rotation.y = Math.PI / 2; scene.add(base);
  const tablaL = new THREE.Mesh(new THREE.PlaneGeometry(.9, .7), new THREE.MeshBasicMaterial({ map: lienzo(450, 350, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#EE7A17"; g.fillRect(0, 0, w, 70); g.fillStyle = "#fff"; g.font = F(40, 780); g.fillText("LIMPIEZA", 24, 50); g.fillStyle = "#24211F"; g.font = F(30, 560); ["Barrer piso · fin de turno", "Banco despejado", "Revisar fugas"].forEach((l, i) => g.fillText("• " + l, 24, 130 + i * 62)); }), toneMapped: false }));
  tablaL.position.set(0, 1.55, .01); base.add(tablaL); estacion.push(tablaL);
  const escoba = new THREE.Group(); escoba.position.set(-.3, 0, .1); base.add(escoba);
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 1.2, 8), M(0xEE7A17)); palo.position.y = .7; escoba.add(palo);
  const cepillo = new THREE.Mesh(new THREE.BoxGeometry(.32, .08, .06), M(0xf2c200)); cepillo.position.y = .08; escoba.add(cepillo); estacion.push(escoba);
  [[.1, 0x2e8b57, "Trapos"], [.42, 0x24211F, "Basura"]].forEach(([x, c, txt]) => {
    const b = new THREE.Group(); b.position.set(x, 0, .22); base.add(b);
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(.15, .13, .5, 20), M(c, { roughness: .5 })); cuerpo.position.y = .25; cuerpo.castShadow = true; b.add(cuerpo);
    const et = new THREE.Mesh(new THREE.PlaneGeometry(.22, .08), new THREE.MeshBasicMaterial({ map: etiquetaTx(txt), toneMapped: false })); et.position.set(0, .32, .152); b.add(et);
    estacion.push(b);
  });
}

// ---------- cámara: recorrido ----------
const K = [ // t, posición, objetivo
  [0, [-3.4, 1.75, 2.3], [3.5, 1.2, 2.3]],
  [3.8, [-0.6, 1.7, 2.35], [3.5, 1.1, 2.0]],
  [5.5, [2.7, 1.65, 1.3], [.8, .55, 3.9]],
  [10.5, [2.3, 1.6, 1.5], [.7, .5, 3.95]],
  [12.0, [2.0, 1.55, 3.4], [1.8, 1.0, .1]],
  [20.0, [4.2, 1.55, 3.0], [3.8, 1.0, .1]],
  [21.5, [2.7, 1.35, 2.6], [.1, .6, 1.0]],
  [23.6, [2.5, 1.35, 2.7], [.1, .55, 1.0]],
  [25.0, [3.9, 1.45, 2.2], [RX, .85, 3.5]],
  [26.0, [4.1, 1.45, 2.3], [RX, .8, 3.4]],
  [27.5, [2.0, 1.8, 1.6], [4.6, .3, 3.8]],
  [31.5, [2.5, 1.65, 1.8], [3.4, 1.6, RZ]],
  [33.5, [2.6, 1.6, 2.4], [1.35, 1.5, RZ]],
  [36.5, [2.2, 1.6, 2.5], [1.5, 1.5, RZ]],
  [38.0, [2.4, 1.6, 2.5], [3.35, 1.7, RZ]],
  [40.0, [.6, 2.5, .7], [4.6, .9, 3.0]],
  [45.0, [.3, 2.35, 1.2], [4.8, .8, 2.4]],
];
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), mira = new THREE.Vector3();
function camara(t) {
  let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const [t0, p0, o0] = K[i], [t1, p1, o1] = K[i + 1];
  const k = ease((t - t0) / (t1 - t0));
  camera.position.set(...p0.map((v, j) => lerp(v, p1[j], k)));
  mira.set(...o0.map((v, j) => lerp(v, o1[j], k)));
  camera.lookAt(mira);
}

// ---------- textos ----------
const PASOS = [
  [4.2, 11.2, "Paso 1 de 5", "Clasificar", "Se separa lo que no se usa: tarjeta roja y zona de retiro junto a la entrada."],
  [11.2, 20.6, "Paso 2 de 5", "Ordenar", "Cada cosa vuelve a su estante de siempre, con rótulo y código por nivel."],
  [20.6, 26.6, "Paso 3 de 5", "Limpiar", "Piso y banco despejados; estación de limpieza con rutina por turno."],
  [26.6, 33.2, "Paso 4 de 5", "Estandarizar", "Pasillos y zonas marcadas en el piso; el pizarrón pasa a tablero 5S."],
  [33.2, 39.6, "Paso 5 de 5", "Disciplina", "Siluetas en el tablero de herramientas y auditoría semanal con checklist."],
];
const NOMBRES = ["Clasificar", "Ordenar", "Limpiar", "Estandarizar", "Disciplina"];
const riel = document.getElementById("riel"); riel.innerHTML = NOMBRES.map((n) => `<div><i></i>${n}</div>`).join("");
const panel = document.getElementById("panel"), titulo = document.getElementById("titulo"), fin = document.getElementById("fin"), marca = document.getElementById("marca");

// ---------- animación ----------
const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
let ultimoPiz = "", ultimoHerr = -1;
window.render = (t) => {
  // Clasificar: tarjeta roja y retiro
  rojos.forEach((r, i) => {
    r.tag.scale.setScalar(Math.max(.001, win(t, 5.2 + i * .2, 5.6 + i * .2)));
    const k = win(t, 6.6 + i * .45, 8.0 + i * .45);
    r.m.position.lerpVectors(r.ini, r.fin, k); r.m.position.y += Math.sin(k * Math.PI) * .35; r.m.rotation.y = lerp(r.ry, 0, k);
  });
  // Ordenar: cada objeto vuela a su lugar
  items.forEach((it) => {
    const a = 11.8 + it.retardo * 5.2, k = win(t, a, a + 1.25);
    it.mesh.position.lerpVectors(it.inicio, it.destino, k); it.mesh.position.y += Math.sin(k * Math.PI) * .45;
    qa.setFromEuler(it.rotIni); qb.setFromEuler(new THREE.Euler(0, it.rotFinal, 0)); q.slerpQuaternions(qa, qb, k); it.mesh.quaternion.copy(q);
  });
  etiquetas.forEach((e) => { const s = win(t, e.t0, e.t0 + .45); e.m.scale.setScalar(Math.max(.001, s * (1 + .12 * Math.sin(s * Math.PI)))); });
  // Limpiar
  polvo.material.opacity = 1 - win(t, 21.2, 24.6);
  tiradero.forEach((m, i) => { const s = 1 - win(t, 21.0 + (i % 12) * .22, 21.6 + (i % 12) * .22); m.scale.setScalar(Math.max(.001, s)); m.visible = s > .002; });
  estacion.forEach((e, i) => { const s = win(t, 21.6 + i * .25, 22.1 + i * .25); e.scale.setScalar(Math.max(.001, s * (1 + .12 * Math.sin(s * Math.PI)))); });
  // Estandarizar
  cintas.forEach((c) => { c.m.scale.x = Math.max(.001, win(t, c.t0, c.t0 + 1.1)); });
  tambos.forEach((b, i) => { const k = win(t, 28.0 + i * .25, 29.4 + i * .25); b.g.position.lerpVectors(b.ini, b.fin, k); });
  const p5s = win(t, 30.4, 31.6), checks = Math.floor(clamp((t - 37.4) / .45, 0, 5));
  const clave = p5s.toFixed(2) + "|" + checks;
  if (clave !== ultimoPiz) { pintarPizarron(p5s, checks); ultimoPiz = clave; }
  const sil = Math.round(win(t, 34.2, 35.6) * 20) / 20;
  if (sil !== ultimoHerr) { pintarHerramientas(sil); ultimoHerr = sil; }

  camara(t);
  renderer.render(scene, camera);

  // capas HTML
  titulo.style.opacity = 1 - win(t, 2.6, 3.6);
  const paso = PASOS.find((p) => t >= p[0] && t < p[1]);
  if (paso) {
    const a = Math.min(win(t, paso[0], paso[0] + .5), 1 - win(t, paso[1] - .4, paso[1]));
    panel.style.opacity = a; panel.style.transform = `translateY(${(1 - a) * 20}px)`;
    panel.querySelector(".paso").textContent = paso[2]; panel.querySelector("h2").textContent = paso[3]; panel.querySelector("p").textContent = paso[4];
    const idx = PASOS.indexOf(paso);
    [...riel.children].forEach((d, i) => { d.className = (i <= idx ? "on" : "") + (i === idx ? " actual" : ""); });
  } else panel.style.opacity = 0;
  riel.style.opacity = t > 4 && t < 40 ? 1 : 0;
  marca.style.opacity = t > 3.4 ? 1 : 0;
  fin.style.opacity = win(t, 40.6, 41.6);
};
window.DUR = DUR;
document.fonts.load("700 40px Archivo").then(() => { pintarPizarron(0, 0); pintarHerramientas(0); window.listo = true; window.render(0); });
