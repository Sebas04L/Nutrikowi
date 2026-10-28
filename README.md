# NUTRIKOWI · Centro de control logístico (versión 2)

Herramienta web para registrar y analizar el ciclo completo de un tráiler: llegada a la planta de
Pueblo Mayo, lavado, mantenimiento y diésel opcionales, autorización, pesajes, carga, factura,
trayecto, operación en granja, descarga y regreso a planta.

Funciona en computadora, tablet y celular. **No usa servidores, bases de datos externas ni
servicios de pago**: los datos se guardan en el navegador (localStorage) y se respaldan en JSON.

---

## 1. Instalación y ejecución

Requisitos: **Node.js 18.18 o superior** (recomendado 20 o 22) y un navegador actualizado.

```bash
npm install        # sólo la primera vez
npm run dev        # abre http://localhost:5180
```

> El puerto es fijo (5180). Los datos del navegador están ligados a la dirección exacta; si la
> aplicación se abriera en otro puerto verías un espacio vacío (tus datos no se pierden, siguen
> en la otra dirección). **Si ya usabas la versión 1, ábrela en la misma dirección de siempre:
> tus registros se migran automáticamente.**

Otros comandos:

```bash
npm run build      # genera dist/ para publicarlo en un servidor estático interno
npm run preview    # sirve dist/ en http://localhost:5181
npm test           # pruebas de cálculos, migración, calculadoras y velocidad
npm run typecheck  # verificación de TypeScript
```

Junto al proyecto se entrega `NUTRIKOWI-centro-control.html`: la misma aplicación compilada en un
único archivo que se abre con doble clic. Guarda sus datos de forma independiente de `localhost:5180`.

---

## 2. Qué hay de nuevo en la versión 2

| Área | Cambios |
|---|---|
| Identidad visual | Centro de control en verde profundo, marfil y grafito; tipografía Inter incluida localmente (sin internet); ilustraciones SVG originales: full con dos tolvas, tolva rectangular, tolva cilíndrica, planta con silos y torre, granja porcina con silo de alimento, carretera. |
| Mapa del proceso | Recorrido ilustrado y cerrado: **Planta → carretera de ida → Granja → carretera de regreso → Planta**. Estaciones con estado (pendiente, en proceso, completada, no aplica), duración, espera, incidencias y paradas; decisiones en rombo con ramales opcionales; camión animado del tipo de la unidad en la actividad en curso; señales con los límites de velocidad y tramo de terracería proporcional. En celular, recorrido vertical. |
| Calculadoras | 8 herramientas: rendimiento, litros por viaje, litros por tonelada, costo de combustible, comparador, mantenimiento, ralentí y descarga. Fórmula visible, validación, copiar y **enviar el resultado a un viaje**. |
| Incidencias y paradas | Registro por viaje con tipo, horario, odómetro, lugar, motivo, motor, consumo (medido, estimado, sin consumo), desperfecto y efecto en la entrega. Las paradas **necesarias u operativas** se separan de las incidencias. |
| Velocidad | Velocidad promedio por trayecto y por tramo (carretera / terracería), velocidad máxima de telemetría (sólo si existe) y límites configurables con avisos para revisar el dato. |
| Análisis | Pestañas *Indicadores*, *Análisis del proceso* (mapa de calor, distribución, operativo vs. espera, variabilidad, rutas, incidencias, rendimiento, costos, faltantes; cada gráfico muestra los viajes que lo originan), *Comparador de viajes* y *Investigar y mejorar*. |
| Calidad de datos | Cada viaje es *incompleto*, *listo para revisión* o *validado*. Datos medidos y estimados se distinguen en todo el sistema. Vista de revisión en *Viajes*. |

---

## 3. Navegación

1. **Mapa del proceso** — centro de control del viaje y recorrido ilustrado. Desde aquí se abren
   los paneles de actividad, configuración, combustible, incidencias y revisión.
2. **Viajes** — historial, búsqueda, plantillas, eliminación, selección para comparar y la
   pestaña **Revisión de datos**.
3. **Calculadoras** — cálculos rápidos sin registrar un viaje.
4. **Incidencias** — registro por viaje, análisis de velocidad y resumen general.
5. **Análisis** — indicadores, análisis del proceso, comparador e hipótesis de mejora.
6. **Catálogos** — granjas, rutas, unidades, choferes, configuraciones, listas, tipos de
   incidencias y paradas (con su clase), tiempos de referencia y límites de velocidad.
7. **Respaldo** — CSV (viajes, incidencias y paradas, tramos), respaldo y restauración JSON.

---

## 4. Migración de datos de la versión 1

Al abrir la versión 2 con datos de la versión 1:

1. Se guarda una **copia exacta** de los datos originales en el navegador
   (`nutrikowi.cicloLogistico.respaldo-v1`). Se puede descargar desde *Respaldo*.
2. Las incidencias que estaban dentro de cada actividad pasan al registro **Incidencias y
   paradas**, vinculadas a la misma actividad, con la misma duración y descripción.
3. Los tipos de incidencia de la v1 se conservan en el nuevo catálogo (con una clase sugerida
   editable) y se agregan las nuevas categorías.
4. Tiempos, cantidades, catálogos, clasificaciones e hipótesis no cambian.
5. Los respaldos JSON de la v1 se pueden seguir importando; se convierten igual.

La clave de almacenamiento no cambia. Antes de actualizar se recomienda, de todas formas,
descargar un respaldo JSON desde la versión 1.

---

## 5. Reglas de cálculo

| Concepto | Regla |
|---|---|
| Campos vacíos | Se muestran como **pendientes**; nunca se convierten en cero. |
| Datos estimados | Los campos de kilómetros, litros, toneladas y pesos, y las duraciones capturadas, pueden marcarse *Medido / Estimado*. Un resultado que usa un dato estimado se presenta como estimación y no se mezcla con los medidos. |
| Duración | Fin − inicio (cruza la medianoche usando el día de cada hora); si no hay horarios, la duración capturada. |
| Actividades simultáneas | Duración del nodo y reparto del ciclo con la **unión** de intervalos; se reporta el solape. |
| Reparto del tiempo real | Cada minuto una sola vez: incidencia > espera > parada > operación > traslado; el resto es "sin registrar". |
| Paradas e incidencias | Clase del tipo de evento: *necesaria* y *operativa* = parada (no improductiva); *demora*, *falla* y *otra* = incidencia. Demoras y fallas vinculadas a una actividad la marcan como posible retraso. |
| Toneladas netas | (peso bruto cargado − tara) ÷ 1000; sin tara se usa el peso vacío del primer pesaje (se indica). |
| Consumo del ciclo | 1) total medido; 2) ida + regreso (+ toma de fuerza); 3) nivel inicial + cargados − nivel final. Los litros cargados nunca se usan como consumo. |
| Rendimiento · L/100 km · L/t | km ÷ litros de traslado · litros ÷ km × 100 · litros ÷ toneladas entregadas (sólo con datos medidos; si no, como estimación). |
| Costos | Costo consumido = litros × precio (de la carga o de referencia); por km y por tonelada entregada. |
| Velocidad | Promedio = km ÷ horas. Máxima = telemetría capturada. Si superan el límite configurado (80 km/h carretera, 35 km/h terracería por omisión) se muestra un aviso para revisar el dato. |
| Integridad | *Incompleto*: faltan horarios, km, litros, toneladas, datos de carga/descarga, costos o decisiones, o hay datos por corregir. *Listo*: todo lo requerido existe. *Validado*: acción explícita; cualquier edición posterior retira la validación. |
| Comparaciones | Se advierte cuando cambian ruta, granja, unidad, configuración, alimento o carga (>10 %). Nunca se declara automáticamente qué viaje o unidad es mejor. |

---

## 6. Datos reales y de demostración

El selector **Datos reales / Demostración** cambia de espacio. La demostración contiene datos
**ficticios** (folios `DEMO-…`) que nunca se mezclan con los reales ni aparecen en sus
indicadores o exportaciones. Los catálogos reales inician vacíos, salvo las tres configuraciones
de tráiler indicadas y los límites de velocidad, todos editables.

## 7. Respaldos — importante

El almacenamiento del navegador **no equivale a una base de datos centralizada**: se pierde si se
borran los datos de navegación, si se usa otro navegador o equipo, o en ventanas privadas.
Descarga un respaldo JSON al terminar cada jornada.

---

## 8. Estructura del código

```
src/
  types.ts                    Modelo de datos (versión 2)
  lib/proceso.ts              Los 17 pasos: campos, segmentos de tiempo y nodos
  lib/escena.ts               Coordenadas del recorrido ilustrado (planta, carreteras, granja)
  lib/calculos.ts             Cálculos por viaje (tiempos, solapes, combustible, costos, eventos, velocidad)
  lib/calidad.ts              Integridad de los datos y campos estimables
  lib/eventos.ts              Clases de incidencias y paradas, consumo asociado
  lib/velocidad.ts            Velocidad promedio por tramo y límites
  lib/calculadoras.ts         Funciones puras de las 8 calculadoras
  lib/analisis.ts             Filtros, agregados, composición por etapa y métricas del comparador
  lib/almacen.ts              Guardado local, migración v1 → v2 y respaldos JSON
  lib/exportar.ts             CSV de viajes, incidencias y paradas, y tramos
  lib/demo.ts, datosBase.ts   Datos de demostración (ficticios) y catálogos iniciales
  lib/*.test.ts               Pruebas
  state/Contexto.tsx          Estado global y persistencia
  components/Ilustraciones.tsx  Camiones, planta, granja y recorrido (SVG originales)
  components/MapaRecorrido.tsx  Mapa ilustrado (escritorio) y recorrido vertical (celular)
  components/Panel*.tsx       Paneles de actividad, configuración, combustible, incidencias y revisión
  components/EditorEventos.tsx  Registro de incidencias y paradas
  views/                      Pantallas; views/analisis/ contiene las pestañas de análisis
  assets/fuentes/             Inter (licencia OFL incluida)
  styles.css                  Identidad visual
```

Para modificar el proceso (agregar un campo o un paso) edita `src/lib/proceso.ts`; para mover una
estación en el mapa, `src/lib/escena.ts`.

---

## Versión publicada

La aplicación compilada está en `docs/` y se publica con GitHub Pages en
**https://sebas04l.github.io/nutrikowi/**. Los datos de los viajes no se suben a GitHub: cada
navegador guarda los suyos (descarga respaldos JSON desde *Respaldo*).
