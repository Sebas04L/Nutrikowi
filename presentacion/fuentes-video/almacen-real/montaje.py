"""Montaje del video fotorrealista 5S del almacén (clips de Higgsfield + títulos Nutrikowi).
Uso: python3 montaje.py <dir_trabajo> <salida.mp4>"""
import sys, subprocess, os
from PIL import Image, ImageDraw, ImageFont

D, OUT = sys.argv[1], sys.argv[2]
W, H = 1920, 1080
NAR = (238, 122, 23); TINTA = (36, 33, 31); BL = (255, 255, 255); ACERO = (106, 97, 90)
FONT = os.path.join(D, "..", "alm", "archivo.ttf")

def f(px, w=600, wd=100):
    ft = ImageFont.truetype(FONT, px); ft.set_variation_by_axes([w, wd]); return ft

LOGO = Image.open(os.path.join(D, "..", "anim", "logo.png")).convert("RGBA")
LOGOB = Image.open(os.path.join(D, "..", "anim", "logo-blanco.png")).convert("RGBA")
PASOS = ["Clasificar", "Ordenar", "Limpiar", "Estandarizar", "Disciplina"]

CLIPS = [  # archivo, pasos activos, título, texto
    ("v_entrada.mp4", [0], "Clasificar", ["Lo que no se usa sale del almacén;", "el piso queda libre y el pasillo marcado."]),
    ("v_estantes.mp4", [1], "Ordenar", ["Cada familia en sus estantes de siempre,", "en contenedores con ubicación etiquetada."]),
    ("v_fondo.mp4", [2], "Limpiar", ["Banco despejado y piso barrido;", "limpiar también es inspeccionar."]),
    ("v_pizarron.mp4", [3, 4], "Estandarizar y sostener", ["Zonas marcadas, checklist 5S en el pizarrón", "y auditoría semanal del supervisor."]),
]

def capa(activos, titulo, lineas, paso_txt):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # marca superior izquierda
    t = "Propuesta conceptual · imagen generada a partir de fotos reales"
    tw = d.textlength(t, font=f(24, 650)) + 40
    d.rounded_rectangle((56, 44, 56 + tw, 92), radius=24, fill=BL + (235,), outline=(176, 84, 10, 255), width=3)
    d.text((76, 54), t, font=f(24, 650), fill=(176, 84, 10))
    # riel 5S
    x0 = W - 56 - 5 * 150 - 4 * 10; y = 44
    d.rounded_rectangle((x0 - 20, y - 14, W - 36, y + 62), radius=16, fill=BL + (235,))
    for i, n in enumerate(PASOS):
        xi = x0 + i * 160; on = i <= max(activos)
        d.rounded_rectangle((xi, y, xi + 150, y + 8), radius=4, fill=(NAR if on else (220, 212, 204)) + (255,))
        d.text((xi, y + 18), n, font=f(22, 680 if i in activos else 500), fill=TINTA if on else ACERO)
    # panel inferior
    ft_t, ft_s = f(66, 760, 118), f(30, 450)
    ancho = max(d.textlength(titulo, font=ft_t), *(d.textlength(l, font=ft_s) for l in lineas)) + 100
    alto = 70 + 80 + 42 * len(lineas) + 28; x, yb = 56, H - 56 - alto
    d.rounded_rectangle((x, yb, x + ancho, yb + alto), radius=18, fill=BL + (246,))
    d.rectangle((x, yb, x + 12, yb + alto), fill=NAR + (255,))
    d.text((x + 48, yb + 30), paso_txt, font=f(26, 650), fill=(176, 84, 10))
    d.text((x + 46, yb + 64), titulo, font=ft_t, fill=TINTA)
    for i, l in enumerate(lineas): d.text((x + 48, yb + 150 + 42 * i), l, font=ft_s, fill=ACERO)
    lg = LOGO.copy(); lg.thumbnail((220, 38)); im.alpha_composite(lg, (int(x + ancho - 40 - lg.width), int(yb + 34)))
    return im

def tarjeta(nombre, fondo, logo, l1, l2, l3):
    im = Image.new("RGB", (W, H), fondo); d = ImageDraw.Draw(im)
    lg = logo.copy(); lg.thumbnail((480, 84)); im.paste(lg, (128, 300), lg)
    d.text((128, 440), l1, font=f(96, 780, 120), fill=TINTA)
    d.text((128, 556), l2, font=f(96, 780, 120), fill=BL if fondo == NAR else NAR)
    d.text((132, 740), l3, font=f(36, 500), fill=TINTA)
    im.save(os.path.join(D, nombre))

def run(args): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)

partes = []
tarjeta("t_ini.png", NAR, LOGOB, "Así quedaría el almacén", "con las 5S aplicadas", "Del estado actual al almacén ordenado, sobre las mismas tomas reales.")
run(["-loop", "1", "-t", "3.5", "-i", os.path.join(D, "t_ini.png"), "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-crf", "20", os.path.join(D, "p0.mp4")])
partes.append("p0.mp4")
for k, (arch, act, tit, lin) in enumerate(CLIPS):
    paso = "Paso " + " y ".join(str(a + 1) for a in act) + " de 5"
    capa(act, tit, lin, paso).save(os.path.join(D, f"c{k}.png"))
    # 4:3 2K -> 16:9: recorta la franja central-inferior (conserva piso y estantes)
    vf = ("[0:v]scale=1920:1440,crop=1920:1080:0:240,fps=24,setsar=1[v];"
          "[1:v]format=rgba,fade=in:st=0.6:d=0.6:alpha=1,fade=out:st=9.0:d=0.6:alpha=1[o];"
          "[v][o]overlay=0:0:format=auto,format=yuv420p")
    run(["-i", os.path.join(D, arch), "-loop", "1", "-t", "10", "-i", os.path.join(D, f"c{k}.png"),
         "-filter_complex", vf, "-t", "10", "-an", "-c:v", "libx264", "-crf", "20", os.path.join(D, f"p{k+1}.mp4")])
    partes.append(f"p{k+1}.mp4")
# cierre: las cuatro vistas finales en mosaico
finales = ["entrada_es.png", "estantes2k.png", "fondo_es.png", "pizarron_es.png"]
mos = Image.new("RGB", (W, H), BL)
for i, fn in enumerate(finales):
    im = Image.open(os.path.join(D, fn)).convert("RGB").resize((952, 536)) if False else Image.open(os.path.join(D, fn)).convert("RGB")
    im = im.resize((952, 714)).crop((0, 89, 952, 625))
    mos.paste(im, ((i % 2) * 968, (i // 2) * 544))
d = ImageDraw.Draw(mos, "RGBA")
d.rounded_rectangle((500, 400, 1420, 680), radius=22, fill=BL + (246,))
d.rectangle((500, 400, 512, 680), fill=NAR)
d.text((552, 432), "Mismo almacén, con 5S", font=f(58, 760, 118), fill=TINTA)
d.text((554, 520), "Estantes, banco y pizarrón en su lugar.", font=f(30, 450), fill=ACERO)
lg = LOGO.copy(); lg.thumbnail((240, 42)); mos.paste(lg, (554, 590), lg)
mos.save(os.path.join(D, "t_fin.png"))
run(["-loop", "1", "-t", "4.5", "-i", os.path.join(D, "t_fin.png"), "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-crf", "20", os.path.join(D, "p9.mp4")])
partes.append("p9.mp4")
# unión con fundidos cortos
dur = [3.5, 10, 10, 10, 10, 4.5]; xf = 0.5
ins = sum([["-i", os.path.join(D, p)] for p in partes], [])
fc, prev, off = "", "[0:v]", 0.0
for i in range(1, len(partes)):
    off += dur[i - 1] - xf
    lab = f"[x{i}]" if i < len(partes) - 1 else "[out]"
    fc += f"{prev}[{i}:v]xfade=transition=fade:duration={xf}:offset={off:.2f}{lab};"; prev = lab
run([*ins, "-filter_complex", fc.rstrip(";"), "-map", "[out]", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT])
print("listo", OUT)
