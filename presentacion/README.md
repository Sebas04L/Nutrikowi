# Presentación ejecutiva para Dirección · Nutrikowi

Propuesta de reestructuración del taller, internalización del mantenimiento preventivo, control de llantas y fortalecimiento administrativo de Logística. Corte de información: noviembre de 2026.

- `index.html`: presentación web interactiva (Reveal.js 5.1, 1920 × 1080, 16:9)
- `Nutrikowi_Presentacion_Direccion_Nov2026.pdf`: versión para compartir o archivar (25 páginas)

## Cómo presentarla

Abra `index.html` en Chrome, Edge o Firefox. No necesita internet: todas las librerías y fuentes están en `vendor/`.

Si el navegador bloquea fuentes o imágenes al abrir el archivo directamente, sírvala en local desde esta carpeta:

```bash
npx -y http-server -p 8080 .
```

Después abra http://localhost:8080.

| Tecla | Acción |
|---|---|
| → / espacio | Avanzar (revela cada elemento en orden) |
| ← | Retroceder |
| `S` | Vista del presentador con notas y temporizador |
| `F` | Pantalla completa |
| `Esc` / `O` | Vista general de todas las diapositivas |
| Clic en una captura | Ampliarla (Esc para cerrar) |

Las notas del presentador traen cálculos de respaldo y aclaraciones para preguntas.

## Exportar de nuevo el PDF

Con el servidor local en marcha:

```bash
node exportar-pdf.cjs http://localhost:8080/index.html
```

Requiere Playwright. Como alternativa, abra `http://localhost:8080/?print-pdf` en Chrome, imprima a PDF con orientación horizontal, márgenes en "Ninguno" y la opción de gráficos de fondo activada.

## Estructura

```
css/deck.css     Identidad visual: colores, tipografía y composición por diapositiva
js/charts.js     Gráficas y diagramas SVG generados a partir de las cifras del brief
js/deck.js       Riel narrativo, navegación, animaciones (GSAP) y visor de capturas
assets/          Logotipo, fotografías del taller (hoy y propuesta conceptual) y capturas del prototipo
vendor/          Reveal.js, GSAP y la fuente Archivo (licencias incluidas)
```

Cada cifra está escrita en su estado final en el HTML o en `js/charts.js`. Las animaciones solo hacen la entrada; por eso el PDF y el modo de movimiento reducido muestran todo completo. Para cambiar una cifra, edítela en esos dos archivos y vuelva a exportar el PDF.

## Criterios financieros aplicados

- El preventivo CAPASA (enero–octubre 2026) no se mezcla con el mantenimiento total de la empresa.
- Los materiales ($112,351.64 al mes) se muestran fuera del comparativo: no son ahorro.
- La diferencia de $121,851.55 al mes es bruta y potencial. Las horas extra se muestran solo como sensibilidad y no se suman.
- La cuenta contable de llantas y las solicitudes de compra no se suman.
- El IVA se presenta como referencia aparte.
