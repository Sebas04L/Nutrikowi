"""Video 5S del almacén del taller Nutrikowi.
Se dibuja sobre las fotografías reales (sin mover estantes, escritorio ni pizarrón)
y termina con la imagen conceptual. Salida: frames RGB por stdout para ffmpeg."""
import sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = sys.argv[1]
W, H, FPS = 1920, 1080, 30
NAR = (238, 122, 23); TINTA = (36, 33, 31); BLANCO = (255, 255, 255); ACERO = (106, 97, 90)

def fuente(px, peso=600, ancho=100):
    f = ImageFont.truetype(D + "/archivo.ttf", px)
    f.set_variation_by_axes([peso, ancho])
    return f

F_TIT = fuente(70, 760, 118); F_SUB = fuente(31, 450); F_PASO = fuente(26, 650)
F_TAG = fuente(26, 640); F_GRANDE = fuente(96, 780, 120); F_MED = fuente(38, 520)
LOGO = Image.open(D + "/logo.png").convert("RGBA")

def foto(nombre, y0=120):
    im = Image.open(D + "/" + nombre).convert("RGB")
    if im.size == (1280, 960):
        im = im.crop((0, y0, 1280, y0 + 720))
    else:
        im = im.resize((1280, round(im.height * 1280 / im.width)))
        y = (im.height - 720) // 2; im = im.crop((0, y, 1280, y + 720))
    return im

def ease(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)

def ventana(t, z0, z1, cx, cy):
    z = z0 + (z1 - z0) * ease(t)
    w, h = 1280 / z, 720 / z
    x0 = min(max(cx - w / 2, 0), 1280 - w); y0 = min(max(cy - h / 2, 0), 720 - h)
    return x0, y0, w, h

def a_frame(pt, v):
    x0, y0, w, h = v
    return ((pt[0] - x0) * W / w, (pt[1] - y0) * H / h)

def fondo(im, v, oscuro=0.0, huecos=()):
    x0, y0, w, h = v
    fr = im.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + w, y0 + h)).convert("RGBA")
    if oscuro > 0:
        capa = Image.new("RGBA", (W, H), (20, 18, 16, int(160 * oscuro)))
        m = ImageDraw.Draw(capa)
        for r in huecos:
            a = a_frame(r[:2], v); b = a_frame(r[2:], v)
            m.rounded_rectangle((a[0], a[1], b[0], b[1]), radius=14, fill=(0, 0, 0, 0))
        fr = Image.alpha_composite(fr, capa)
    return fr

def capa_alpha(img, a):
    if a >= 1: return img
    r, g, b, al = img.split(); al = al.point(lambda p: int(p * a)); img.putalpha(al); return img

def marco(fr, rect, v, a, texto, lado="arriba"):
    if a <= 0: return fr
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    p = a_frame(rect[:2], v); q = a_frame(rect[2:], v)
    d.rounded_rectangle((p[0], p[1], q[0], q[1]), radius=14, outline=NAR + (255,), width=6)
    tw = d.textlength(texto, font=F_TAG) + 36; th = 50
    if lado == "arriba": tx, ty = p[0], p[1] - th - 10
    elif lado == "abajo": tx, ty = p[0], q[1] + 10
    else: tx, ty = p[0] + 12, p[1] + 12
    tx = min(max(tx, 20), W - tw - 20); ty = min(max(ty, 20), H - th - 20)
    d.rounded_rectangle((tx, ty, tx + tw, ty + th), radius=25, fill=NAR + (255,))
    d.text((tx + 18, ty + 10), texto, font=F_TAG, fill=TINTA)
    return Image.alpha_composite(fr, capa_alpha(capa, a))

def placa(fr, pt, v, a, texto):
    """Etiqueta de ubicación pegada al canto del estante (blanca con borde naranja)."""
    if a <= 0: return fr
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    x, y = a_frame(pt, v); tw = d.textlength(texto, font=F_TAG) + 30
    d.rounded_rectangle((x - tw / 2, y - 24, x + tw / 2, y + 24), radius=8, fill=BLANCO + (245,), outline=NAR + (255,), width=4)
    d.rectangle((x - tw / 2, y - 24, x - tw / 2 + 12, y + 24), fill=NAR + (255,))
    d.text((x - tw / 2 + 22, y - 15), texto, font=F_TAG, fill=TINTA)
    return Image.alpha_composite(fr, capa_alpha(capa, a))

def poligono(fr, pts, v, a, texto=None):
    if a <= 0: return fr
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    P = [a_frame(p, v) for p in pts]
    d.polygon(P, fill=NAR + (55,))
    for i in range(len(P)):  # cinta de piso discontinua
        (x1, y1), (x2, y2) = P[i], P[(i + 1) % len(P)]
        n = int(math.hypot(x2 - x1, y2 - y1) // 34)
        for k in range(0, n, 2):
            a0, a1 = k / n, min((k + 1) / n, 1)
            d.line((x1 + (x2 - x1) * a0, y1 + (y2 - y1) * a0, x1 + (x2 - x1) * a1, y1 + (y2 - y1) * a1), fill=NAR + (255,), width=9)
    fr = Image.alpha_composite(fr, capa_alpha(capa, a))
    if texto:
        cx = sum(p[0] for p in pts) / len(pts); cy = min(p[1] for p in pts)
        fr = marco(fr, (cx - 1, cy, cx, cy), v, a, texto, "arriba")
    return fr

def panel(fr, a, paso, titulo, sub, pos="izq"):
    if a <= 0: return fr
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    lineas = sub if isinstance(sub, list) else [sub]
    ancho = max(d.textlength(titulo, font=F_TIT), *(d.textlength(l, font=F_SUB) for l in lineas)) + 96
    alto = 74 + 86 + 44 * len(lineas) + 30
    x, y = 64, H - 64 - alto
    if pos == "der": x = W - 64 - ancho
    if pos == "sup": y = 64
    dy = (1 - ease(a)) * 24
    d.rounded_rectangle((x, y + dy, x + ancho, y + alto + dy), radius=18, fill=BLANCO + (248,))
    d.rectangle((x, y + dy, x + 12, y + alto + dy), fill=NAR + (255,))
    d.text((x + 48, y + 34 + dy), paso, font=F_PASO, fill=(176, 84, 10))
    d.text((x + 46, y + 70 + dy), titulo, font=F_TIT, fill=TINTA)
    for i, l in enumerate(lineas):
        d.text((x + 48, y + 160 + 44 * i + dy), l, font=F_SUB, fill=ACERO)
    lg = LOGO.copy(); lg.thumbnail((230, 40))
    capa.alpha_composite(lg, (int(x + ancho - 46 - lg.width), int(y + 40 + dy)))
    return Image.alpha_composite(fr, capa_alpha(capa, a))

def riel(fr, activo):
    """Avance de las 5S arriba a la derecha."""
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    nombres = ["Clasificar", "Ordenar", "Limpiar", "Estandarizar", "Disciplina"]
    x = W - 64 - 5 * 150 - 4 * 10; y = 52
    d.rounded_rectangle((x - 20, y - 18, W - 44, y + 62), radius=16, fill=BLANCO + (235,))
    for i, n in enumerate(nombres):
        xi = x + i * 160
        col = NAR if i <= activo else (220, 212, 204)
        d.rounded_rectangle((xi, y, xi + 150, y + 8), radius=4, fill=col + (255,))
        d.text((xi, y + 18), n, font=fuente(22, 650 if i == activo else 500), fill=TINTA if i <= activo else ACERO)
    return Image.alpha_composite(fr, capa)

def etiqueta_real(fr, texto):
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    tw = d.textlength(texto, font=F_TAG) + 40
    d.rounded_rectangle((64, 52, 64 + tw, 104), radius=26, fill=TINTA + (235,))
    d.text((84, 62), texto, font=F_TAG, fill=BLANCO)
    return Image.alpha_composite(fr, capa)

def tarjeta(fr, a, x, y, titulo, filas):
    if a <= 0: return fr
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    w, h = 560, 96 + 52 * len(filas)
    dy = (1 - ease(a)) * 20
    d.rounded_rectangle((x, y + dy, x + w, y + h + dy), radius=16, fill=BLANCO + (250,), outline=NAR + (255,), width=4)
    d.text((x + 30, y + 26 + dy), titulo, font=fuente(32, 720, 110), fill=TINTA)
    for i, f in enumerate(filas):
        yy = y + 92 + 52 * i + dy
        d.rounded_rectangle((x + 30, yy, x + 58, yy + 28), radius=6, outline=NAR + (255,), width=4)
        if a > 0.6 + i * 0.05: d.line((x + 36, yy + 14, x + 43, yy + 22, x + 54, yy + 6), fill=NAR + (255,), width=5)
        d.text((x + 74, yy - 2), f, font=F_SUB, fill=TINTA)
    return Image.alpha_composite(fr, capa_alpha(capa, a))

def tramo(t, a, b): return ease((t - a) / max(b - a, 1e-6))

# ---------------- Escenas ----------------
F1, F2, F3, F4 = foto("f1.jpg"), foto("f2.jpg"), foto("f3.jpg"), foto("f4.jpg")
PROP = Image.open(D + "/propuesta.webp").convert("RGB").resize((1280, 960)).crop((0, 120, 1280, 840))

def titulo(t):
    fr = Image.new("RGBA", (W, H), NAR + (255,)); d = ImageDraw.Draw(fr)
    a = tramo(t, 0, .35)
    lg = Image.open(D + "/logo-blanco.png").convert("RGBA"); lg.thumbnail((520, 90))
    fr.alpha_composite(capa_alpha(lg, a), (128, 230))
    d.text((128, 400 + (1 - a) * 20), "Almacén del taller", font=F_GRANDE, fill=TINTA)
    d.text((128, 520 + (1 - a) * 20), "Las 5S aplicadas paso a paso", font=F_GRANDE, fill=BLANCO)
    b = tramo(t, .4, .7)
    d.text((132, 700), "Sobre fotografías reales: los estantes, el escritorio y el pizarrón se quedan donde están.", font=F_MED, fill=TINTA + (int(255 * b),))
    return fr

def hoy(t):
    v = ventana(t, 1.0, 1.08, 640, 360)
    fr = fondo(F2, v)
    fr = etiqueta_real(fr, "Hoy · fotografía real")
    return panel(fr, tramo(t, .1, .3), "Punto de partida", "Así está hoy",
                 ["Dos estanterías, escritorio, pizarrón y tablero de herramientas.", "Se conservan en su lugar; cambia cómo se usan."])

def clasificar(t):
    v = ventana(t, 1.0, 1.05, 640, 420)
    huecos = [(470, 425, 1075, 720), (0, 520, 330, 720)]
    fr = fondo(F3, v, tramo(t, .1, .3), huecos)
    fr = marco(fr, huecos[0], v, tramo(t, .2, .4), "Tambos y garrafones en el piso", "arriba")
    fr = marco(fr, huecos[1], v, tramo(t, .4, .6), "Refacciones en el piso", "arriba")
    fr = riel(fr, 0)
    return panel(fr, tramo(t, .05, .25), "Paso 1 de 5", "Clasificar",
                 ["Separar lo que se usa de lo que no.", "Tarjeta roja a lo obsoleto; lo útil pasa a un lugar asignado."], "sup")

def ordenar(t):
    v = ventana(t, 1.0, 1.06, 560, 380)
    fr = fondo(F4, v)
    labels = [((330, 288), "A-1 Filtros"), ((330, 418), "A-2 Consumibles"), ((420, 532), "A-3 Refacciones"),
              ((810, 278), "B-1 Herramientas"), ((800, 352), "B-2 Eléctrico")]
    for i, (p, s) in enumerate(labels):
        fr = placa(fr, p, v, tramo(t, .15 + i * .09, .3 + i * .09), s)
    fr = marco(fr, (525, 570, 690, 720), v, tramo(t, .62, .78), "Cajas: a su ubicación etiquetada", "arriba")
    fr = riel(fr, 1)
    return panel(fr, tramo(t, .05, .25), "Paso 2 de 5", "Ordenar",
                 ["Un lugar para cada cosa, en los mismos estantes.", "Ubicación por familia: lo de mayor uso a la altura de la mano."], "sup")

def limpiar(t):
    v = ventana(t, 1.0, 1.06, 560, 450)
    huecos = [(330, 330, 700, 560), (0, 380, 330, 700)]
    fr = fondo(F1, v, tramo(t, .1, .3), huecos)
    fr = marco(fr, huecos[0], v, tramo(t, .2, .4), "Banco despejado al cierre de turno", "arriba")
    fr = marco(fr, huecos[1], v, tramo(t, .4, .6), "Estante sin polvo ni piezas sueltas", "dentro")
    fr = riel(fr, 2)
    return panel(fr, tramo(t, .05, .25), "Paso 3 de 5", "Limpiar",
                 ["Limpieza como inspección: al limpiar se detectan fugas y faltantes.", "Rutina corta por turno con responsable."], "der")

def estandarizar(t):
    v = ventana(t, 1.0, 1.05, 700, 380)
    fr = fondo(F3, v)
    fr = poligono(fr, [(470, 470), (990, 455), (1075, 720), (460, 720)], v, tramo(t, .15, .35), None)
    fr = marco(fr, (470, 470, 471, 471), v, tramo(t, .15, .35), "Zona marcada para tambos", "dentro")
    fr = marco(fr, (962, 85, 1280, 372), v, tramo(t, .4, .55), "El pizarrón existente: tablero 5S", "abajo")
    fr = tarjeta(fr, tramo(t, .5, .7), 1290, 150, "Checklist por turno", ["Nada en el piso", "Cada cosa en su ubicación", "Banco despejado", "Faltantes anotados"])
    fr = riel(fr, 3)
    return panel(fr, tramo(t, .05, .25), "Paso 4 de 5", "Estandarizar",
                 ["Mismas reglas para todos los turnos:", "zonas marcadas, foto patrón y checklist visible."])

def disciplina(t):
    v = ventana(t, 1.0, 1.06, 420, 300)
    huecos = [(150, 115, 445, 268)]
    fr = fondo(F2, v, tramo(t, .1, .3) * .7, huecos)
    fr = marco(fr, huecos[0], v, tramo(t, .2, .4), "Tablero de herramientas existente", "abajo")
    fr = tarjeta(fr, tramo(t, .4, .6), 1290, 300, "Auditoría semanal", ["Responsable: supervisor", "Recorrido con checklist", "Hallazgos con fecha", "Revisión mensual"])
    fr = riel(fr, 4)
    return panel(fr, tramo(t, .05, .25), "Paso 5 de 5", "Disciplina",
                 ["Sostener el orden con auditoría y seguimiento,", "no con una limpieza única."])

def resultado(t):
    v = ventana(t, 1.0, 1.07, 640, 360)
    base = fondo(F2, ventana(1, 1.0, 1.06, 640, 360))
    prop = fondo(PROP, v)
    fr = Image.blend(base, prop, tramo(t, 0, .25))
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    tw = d.textlength("Propuesta conceptual", font=F_TAG) + 40
    d.rounded_rectangle((64, 52, 64 + tw, 104), radius=26, fill=BLANCO + (240,), outline=(176, 84, 10, 255), width=3)
    d.text((84, 62), "Propuesta conceptual", font=F_TAG, fill=(176, 84, 10))
    fr = Image.alpha_composite(fr, capa)
    return panel(fr, tramo(t, .2, .4), "Resultado esperado", "Mismo almacén, con 5S",
                 ["Estantes y escritorio en su lugar; material por familias y ubicaciones etiquetadas.", "Imagen ilustrativa, no evidencia de obra."])

ESCENAS = [(titulo, 3.5), (hoy, 4.5), (clasificar, 6.5), (ordenar, 7.0), (limpiar, 6.0),
           (estandarizar, 7.0), (disciplina, 6.0), (resultado, 6.5)]
FUNDIDO = 12  # frames de transición entre escenas

out = sys.stdout.buffer
previo = None
for k, (fn, dur) in enumerate(ESCENAS):
    n = int(dur * FPS)
    for i in range(n):
        fr = fn(i / (n - 1)).convert("RGB")
        if previo is not None and i < FUNDIDO:
            fr = Image.blend(previo, fr, (i + 1) / FUNDIDO)
        out.write(fr.tobytes())
    previo = fr
