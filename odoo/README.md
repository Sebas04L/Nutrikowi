# Base de datos Odoo · Nutrikowi Alimentos, S.A. de C.V.

Implementación en **Odoo 18 Community** del Proyecto Final de *Manufactura Integrada por
Computadora*: el ERP de nivel 4 (ISA-95) y la capa de lotes/trazabilidad de nivel 3 que propone el documento.

| Archivo | Para qué |
|---|---|
| `respaldo/nutrikowi_odoo18.zip` | Respaldo completo (base + filestore), listo para restaurar. |
| `cargar_nutrikowi.py` | Script XML-RPC que crea todo sobre cualquier Odoo 17/18 (local, Odoo.sh u Odoo Online con acceso API). Es idempotente. |

## Opción A · Restaurar el respaldo (Odoo 18)

1. Abre `http://TU-ODOO/web/database/manager`.
2. **Restore Database** → elige `nutrikowi_odoo18.zip`, nombre `nutrikowi`, marca *This database was copied*.
3. Entra con usuario **admin** / contraseña **admin** (cámbiala después).

## Opción B · Crear la base con el script

```bash
python3 cargar_nutrikowi.py --url http://localhost:8069 --db nutrikowi --user admin --password admin
```

La base debe existir (vacía, sin datos de demostración). El script instala las apps, configura la empresa
y carga todo (≈ 4 min). `--sin-operacion` omite las compras, producción y ventas de ejemplo.

## Qué contiene (relación con el PDF)

| Sección del proyecto | Dónde está en Odoo |
|---|---|
| 1. Contexto: empresa, productos | Empresa en Navojoa (MXN, contabilidad MX, es_MX). 17 materias primas, 4 empaques, 9 dietas a granel y 6 presentaciones en saco por etapa (lechones, iniciación, engorda por fases, reproductores, microconcentrados) con lote y caducidad; servicio de asesoría. |
| 1. Procesos productivos | Recepción en 3 pasos (*Recepción y báscula → Laboratorio – cuarentena → Existencias*), silos/bodegas/tanque/tolvas con reglas de almacenaje, 7 centros de trabajo y fórmulas por tonelada con ruta dosificación → molienda → mezclado → peletizado → enfriado (→ desmoronado / envasado). |
| 2. Mapa de procesos | **CIM Nutrikowi › Mapa de procesos**: 16 procesos agrupados en estratégicos, operativos y de apoyo, con propósito, responsable y departamento. |
| 3. Entradas y salidas / diagrama de flujos | Entradas y salidas en cada proceso; **Flujos de información** con los 13 flujos (de → a) y cómo se integran. |
| 4. Inventario de tecnología | **Inventario de tecnología (hardware)**: 28 equipos agrupados por proceso, con control/interfaz y preventivo programado (app Mantenimiento). **Sistemas y compatibilidad**: los 8 sistemas evaluados. Flotilla con 5 camiones. |
| 5. Integración de procesos | Datos generados, frecuencia y **llave de integración** en cada proceso; **Software de bajo costo propuesto**; el número de lote une compra, análisis, orden de producción, entrega, factura y desempeño en granja. |
| Anexo A (qué analizar en un CIM) | **Análisis CIM (Anexo A)**: procesos, información, recursos y organización, con la evidencia en esta base. |
| Anexo B (organigrama) | Empleados: 11 departamentos y 20 puestos (los nombres de las personas quedan «por asignar»). |

### Operación de ejemplo (trazabilidad de punta a punta)

- 5 compras recibidas con lote de MP y **análisis de laboratorio** (más un camión de maíz **rechazado** por humedad y aflatoxinas) y 1 solicitud de cotización pendiente.
- 15 órdenes de producción terminadas (lote `PT-…` con caducidad y análisis de PT) y 1 programada.
- 5 ventas a Porcicowi, Genetikowi y un cliente externo, entregadas y facturadas (IVA 0 % para alimento animal) y 1 pedido pendiente.
- Registros de **desempeño en granja** (GDP, conversión, mortalidad) ligados al lote: el flujo 13 que regresa a formulación.

Ruta sugerida para la presentación: *Inventario › Productos › Lotes › PT-E1-261124-01 › Trazabilidad*.

> Los proveedores, el cliente externo, las placas y los precios son **de ejemplo**; las fórmulas son
> representativas y las marcas de equipos son referencias. Todo debe validarse con la planta, igual que
> indica la nota metodológica del proyecto.
