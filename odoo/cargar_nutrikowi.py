#!/usr/bin/env python3
"""
Carga la base de datos de Nutrikowi Alimentos, S.A. de C.V. en Odoo (Community 17/18)
a partir del Proyecto Final de Manufactura Integrada por Computadora (CIM).

Qué crea:
  * Empresa, idioma es_MX, moneda MXN y localización contable de México.
  * Apps: Inventario, Fabricación (MRP), Compras, Ventas, Facturación, Mantenimiento,
    Empleados, Flotilla y caducidades.
  * Organigrama (Anexo B): departamentos, puestos y empleados por rol.
  * Planta: almacén Navojoa con recepción en 3 pasos (recepción → laboratorio → almacén),
    silos, bodega de macros, almacén de micros, tanque de aceite, tolvas y bodega de PT.
  * Productos: materias primas, empaque y alimento terminado (granel y saco) con lotes.
  * Fórmulas (listas de materiales por tonelada) y ruta de producción por centros de trabajo:
    dosificación → molienda → mezclado → peletizado → enfriado → desmoronado → envasado.
  * Proveedores, granjas cliente (Porcicowi, Genetikowi) y listas de precios de compra.
  * Inventario de tecnología como equipos de mantenimiento, con su preventivo.
  * Flotilla de distribución.
  * App «CIM Nutrikowi» con el análisis del PDF: mapa de procesos, entradas/salidas y datos
    por proceso, 13 flujos de información, sistemas y compatibilidad, análisis CIM (Anexo A),
    análisis de laboratorio y desempeño en granja.
  * Operación de ejemplo con trazabilidad por lote: compras recibidas, análisis, órdenes de
    producción terminadas, ventas entregadas y facturadas.

Uso:
    python3 cargar_nutrikowi.py --url http://localhost:8069 --db nutrikowi \
        --user admin --password admin

El script es idempotente para los datos maestros (usa identificadores externos
«nutrikowi_cim.*»); la operación de ejemplo sólo se carga si aún no existe.
"""
import argparse
import sys
import xmlrpc.client

MOD = "nutrikowi_cim"  # módulo de los identificadores externos


# ---------------------------------------------------------------------------
# Cliente XML-RPC
# ---------------------------------------------------------------------------
class Odoo:
    def __init__(self, url, db, user, password):
        self.url, self.db, self.password = url.rstrip("/"), db, password
        common = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/common", allow_none=True)
        self.version = common.version()["server_version_info"][0]
        self.uid = common.authenticate(db, user, password, {})
        if not self.uid:
            sys.exit("No se pudo iniciar sesión: revisa base de datos, usuario y contraseña.")
        self.models = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/object", allow_none=True)
        self.ctx = {"lang": "es_MX", "tz": "America/Hermosillo"}

    def call(self, model, method, *args, **kw):
        ctx = dict(self.ctx, **kw.pop("context", {}))
        kw["context"] = ctx
        return self.models.execute_kw(self.db, self.uid, self.password, model, method, list(args), kw)

    def action(self, model, method, *args, **kw):
        """Llama un botón cuyo resultado puede traer valores None (no serializables)."""
        try:
            return self.call(model, method, *args, **kw)
        except xmlrpc.client.Fault as e:
            if "cannot marshal None" in e.faultString:
                return None
            raise

    def search(self, model, domain, **kw):
        return self.call(model, "search", domain, **kw)

    def read(self, model, ids, fields):
        return self.call(model, "read", ids, fields)

    def first(self, model, domain):
        ids = self.search(model, domain, limit=1)
        return ids[0] if ids else False

    def create(self, model, vals, **kw):
        return self.call(model, "create", vals, **kw)

    def write(self, model, ids, vals, **kw):
        ids = ids if isinstance(ids, list) else [ids]
        return self.call(model, "write", ids, vals, **kw)

    # ---- identificadores externos -------------------------------------------------
    def ref(self, xmlid, required=True):
        mod, name = xmlid.split(".", 1) if "." in xmlid else (MOD, xmlid)
        rec = self.call("ir.model.data", "search_read", [("module", "=", mod), ("name", "=", name)],
                        fields=["res_id", "model"], limit=1)
        if rec:
            return rec[0]["res_id"]
        if required:
            raise KeyError(xmlid)
        return False

    def ensure(self, xmlid, model, vals, match=None):
        """Crea o actualiza un registro identificado por xmlid (nutrikowi_cim.xxx).

        match: dominio opcional para adoptar un registro ya existente (p. ej. el almacén
        principal) la primera vez.
        """
        res_id = self.ref(xmlid, required=False)
        if res_id and not self.search(model, [("id", "=", res_id)], context={"active_test": False}):
            self.call("ir.model.data", "unlink",
                      self.search("ir.model.data", [("module", "=", MOD), ("name", "=", xmlid)]))
            res_id = False
        if res_id:
            self.write(model, res_id, vals)
            return res_id
        if match:
            res_id = self.first(model, match)
        if res_id:
            self.write(model, res_id, vals)
        else:
            res_id = self.create(model, vals)
        self.create("ir.model.data", {"module": MOD, "name": xmlid, "model": model,
                                      "res_id": res_id, "noupdate": True})
        return res_id


def log(msg):
    print(f"• {msg}", flush=True)


# ---------------------------------------------------------------------------
# 1. Empresa, idioma y aplicaciones
# ---------------------------------------------------------------------------
def configurar_empresa(o):
    log("Empresa, idioma y moneda")
    if not o.search("res.lang", [("code", "=", "es_MX")]):
        wiz = o.create("base.language.install", {"lang_ids": [(6, 0, o.search("res.lang", [("code", "=", "es_MX"), ("active", "=", False)]))]})
        o.call("base.language.install", "lang_install", [wiz])
    mx = o.first("res.country", [("code", "=", "MX")])
    son = o.first("res.country.state", [("country_id", "=", mx), ("code", "=", "SON")])
    mxn = o.search("res.currency", [("name", "=", "MXN")], context={"active_test": False})
    o.write("res.currency", mxn, {"active": True})
    company = o.ref("base.main_company")
    o.write("res.company", company, {
        "name": "Nutrikowi Alimentos, S.A. de C.V.",
        "street": "Carretera Internacional km 585 norte",
        "street2": "Ejido Pueblo Mayo",
        "city": "Navojoa",
        "state_id": son,
        "country_id": mx,
        "currency_id": mxn[0],
        "website": "https://www.kowi.com.mx/index.php/nutrikowi/",
        "report_header": "Una empresa de porcicultores para porcicultores",
    })
    o.write("res.users", o.uid, {"lang": "es_MX", "tz": "America/Hermosillo"})


APPS = ["contacts", "stock", "mrp", "purchase", "sale_management", "account", "l10n_mx",
        "product_expiry", "maintenance", "hr", "fleet", "purchase_mrp", "sale_mrp", "mrp_account"]


def instalar_apps(o):
    pendientes = o.search("ir.module.module", [("name", "in", APPS), ("state", "!=", "installed")])
    if pendientes:
        log(f"Instalando {len(pendientes)} aplicaciones (tarda unos minutos)…")
        o.call("ir.module.module", "button_immediate_install", pendientes)
    else:
        log("Aplicaciones ya instaladas")


def activar_opciones(o):
    log("Opciones: lotes, ubicaciones, rutas, órdenes de trabajo, unidades de medida")
    campos = o.call("res.config.settings", "fields_get", attributes=["type"])
    deseadas = {
        "group_stock_production_lot": True,
        "group_stock_multi_locations": True,
        "group_stock_adv_location": True,
        "group_mrp_routings": True,
        "group_uom": True,
        "group_lot_on_delivery_slip": True,
        "group_expiry_date_on_delivery_slip": True,
        "group_stock_lot_print_gs1": False,
    }
    vals = {k: v for k, v in deseadas.items() if k in campos}
    wiz = o.create("res.config.settings", vals)
    o.call("res.config.settings", "execute", [wiz])


# ---------------------------------------------------------------------------
# 2. Organización (Anexo B)
# ---------------------------------------------------------------------------
DEPARTAMENTOS = [
    # xmlid, nombre, padre
    ("dep_gerencia", "Gerencia de planta Nutrikowi", None),
    ("dep_nutricion", "Nutrición y formulación", "dep_gerencia"),
    ("dep_calidad", "Aseguramiento de calidad e inocuidad", "dep_gerencia"),
    ("dep_produccion", "Producción", "dep_gerencia"),
    ("dep_mantenimiento", "Mantenimiento", "dep_gerencia"),
    ("dep_almacen", "Compras, almacén e inventarios", "dep_gerencia"),
    ("dep_ventas", "Ventas, logística y servicio técnico", "dep_gerencia"),
    ("dep_corporativo", "Servicios compartidos del corporativo Grupo Kowi", None),
    ("dep_ti", "Tecnologías de información", "dep_corporativo"),
    ("dep_finanzas", "Finanzas y contabilidad", "dep_corporativo"),
    ("dep_rrhh", "Recursos humanos", "dep_corporativo"),
]

# Empleados por rol (los nombres reales deben capturarse con RR. HH.)
PUESTOS = [
    # xmlid, puesto, departamento, es jefe
    ("gerente_planta", "Gerente de planta", "dep_gerencia", True),
    ("gerente_nutricion", "Gerente de nutrición", "dep_nutricion", True),
    ("nutriologo", "Nutriólogo formulador", "dep_nutricion", False),
    ("jefe_calidad", "Jefe de aseguramiento de calidad", "dep_calidad", True),
    ("analista_lab", "Analista de laboratorio", "dep_calidad", False),
    ("jefe_produccion", "Jefe de producción", "dep_produccion", True),
    ("operador_dosificacion", "Operador de dosificación (SCADA)", "dep_produccion", False),
    ("operador_peletizado", "Operador de peletizado", "dep_produccion", False),
    ("operador_envasado", "Operador de envasado", "dep_produccion", False),
    ("jefe_mantenimiento", "Jefe de mantenimiento", "dep_mantenimiento", True),
    ("tecnico_mantenimiento", "Técnico electromecánico", "dep_mantenimiento", False),
    ("jefe_almacen", "Jefe de compras y almacén", "dep_almacen", True),
    ("basculista", "Basculista", "dep_almacen", False),
    ("almacenista_pt", "Almacenista de producto terminado", "dep_almacen", False),
    ("jefe_ventas", "Jefe de ventas y logística", "dep_ventas", True),
    ("asesor_tecnico", "Asesor técnico de granjas", "dep_ventas", False),
    ("chofer", "Chofer de camión granelero", "dep_ventas", False),
    ("analista_ti", "Analista de TI", "dep_ti", True),
    ("contador", "Contador de costos", "dep_finanzas", True),
    ("rrhh", "Generalista de recursos humanos", "dep_rrhh", True),
]


def cargar_organizacion(o):
    log("Organigrama: departamentos, puestos y empleados por rol")
    for xid, nombre, padre in DEPARTAMENTOS:
        o.ensure(xid, "hr.department", {"name": nombre, "parent_id": o.ref(padre) if padre else False})
    for xid, puesto, dep, jefe in PUESTOS:
        job = o.ensure(f"job_{xid}", "hr.job", {"name": puesto, "department_id": o.ref(dep)})
        emp = o.ensure(f"emp_{xid}", "hr.employee", {
            "name": f"{puesto} (por asignar)",
            "job_id": job,
            "job_title": puesto,
            "department_id": o.ref(dep),
            "work_location_name": "Planta Navojoa" if "dep_corporativo" not in dep else "Corporativo Kowi",
        } if "work_location_name" in EMP_FIELDS(o) else {
            "name": f"{puesto} (por asignar)", "job_id": job, "job_title": puesto,
            "department_id": o.ref(dep)})
        if jefe:
            o.write("hr.department", o.ref(dep), {"manager_id": emp})
    # Jerarquía: jefes reportan al gerente de planta
    gerente = o.ref("emp_gerente_planta")
    for xid, _p, dep, jefe in PUESTOS:
        emp = o.ref(f"emp_{xid}")
        if xid == "gerente_planta":
            continue
        if jefe:
            parent = gerente if dep not in ("dep_ti", "dep_finanzas", "dep_rrhh") else False
        else:
            parent = o.ref(f"emp_{next(x for x, _, d, j in PUESTOS if d == dep and j)}")
        o.write("hr.employee", emp, {"parent_id": parent})


_EMP = {}


def EMP_FIELDS(o):
    if not _EMP:
        _EMP.update(o.call("hr.employee", "fields_get", attributes=["type"]))
    return _EMP


# ---------------------------------------------------------------------------
# 3. Contactos
# ---------------------------------------------------------------------------
PROVEEDORES = [
    ("prov_granos", "Granos del Valle del Mayo (proveedor de ejemplo)", "Navojoa", "Sorgo, maíz, trigo y salvado"),
    ("prov_oleaginosas", "Oleaginosas del Noroeste (proveedor de ejemplo)", "Hermosillo", "Pasta de soya y aceite de soya"),
    ("prov_minerales", "Minerales y Fosfatos del Pacífico (proveedor de ejemplo)", "Guadalajara", "Fosfatos, carbonato y sal"),
    ("prov_premezclas", "Premezclas y Aditivos Pecuarios (proveedor de ejemplo)", "Querétaro", "Vitaminas, minerales traza, aminoácidos, lácteos, harina de pescado y secuestrantes"),
    ("prov_empaques", "Empaques Industriales de Sonora (proveedor de ejemplo)", "Ciudad Obregón", "Sacos de polipropileno, hilo y etiquetas"),
]

CLIENTES = [
    # xmlid, nombre, padre, tipo, nota
    ("cli_porcicowi", "Porcicowi", None, "contact", "Granjas Sitio I: reproductores, maternidad y lechones hasta el destete (Grupo Kowi)"),
    ("cli_porcicowi_s1", "Porcicowi · Granja Sitio I – Maternidad", "cli_porcicowi", "delivery", "Gestación, lactancia y preiniciador"),
    ("cli_genetikowi", "Genetikowi", None, "contact", "Granjas Sitio II y III: engorda de ~7 kg a ~120 kg (Grupo Kowi)"),
    ("cli_genetikowi_s2", "Genetikowi · Granja Sitio II – Destete", "cli_genetikowi", "delivery", "Lechón fase 2 e iniciación"),
    ("cli_genetikowi_s3a", "Genetikowi · Granja Sitio III – Engorda 1", "cli_genetikowi", "delivery", "Engorda por fases a granel"),
    ("cli_genetikowi_s3b", "Genetikowi · Granja Sitio III – Engorda 2", "cli_genetikowi", "delivery", "Engorda por fases a granel"),
    ("cli_externo", "Porcicultor externo del noroeste (cliente de ejemplo)", None, "contact", "Compra microconcentrados para elaborar su alimento"),
]


def cargar_contactos(o):
    log("Proveedores y granjas cliente")
    mx = o.first("res.country", [("code", "=", "MX")])
    son = o.first("res.country.state", [("country_id", "=", mx), ("code", "=", "SON")])
    for xid, nombre, ciudad, giro in PROVEEDORES:
        o.ensure(xid, "res.partner", {"name": nombre, "is_company": True, "city": ciudad,
                                      "country_id": mx, "supplier_rank": 1,
                                      "comment": f"<p>Suministra: {giro}</p>"})
    for xid, nombre, padre, tipo, nota in CLIENTES:
        vals = {"name": nombre, "country_id": mx, "state_id": son, "city": "Navojoa",
                "customer_rank": 1, "comment": f"<p>{nota}</p>"}
        if padre:
            vals.update({"parent_id": o.ref(padre), "type": tipo, "name": nombre.split(" · ", 1)[1]})
        else:
            vals["is_company"] = True
        o.ensure(xid, "res.partner", vals)


# ---------------------------------------------------------------------------
# 4. Almacén y ubicaciones
# ---------------------------------------------------------------------------
UBICACIONES = [
    ("loc_silo1", "Silo 1 · Sorgo"),
    ("loc_silo2", "Silo 2 · Sorgo"),
    ("loc_silo3", "Silo 3 · Maíz"),
    ("loc_silo4", "Silo 4 · Trigo y salvado"),
    ("loc_macros", "Bodega de macro-ingredientes"),
    ("loc_aceite", "Tanque de aceite"),
    ("loc_micros", "Almacén controlado de micro-ingredientes"),
    ("loc_empaque", "Bodega de empaque"),
    ("loc_granel", "Tolvas de producto terminado a granel"),
    ("loc_pt", "Bodega de producto terminado (sacos)"),
]


def cargar_almacen(o):
    log("Almacén Planta Navojoa: recepción en 3 pasos y ubicaciones")
    company = o.ref("base.main_company")
    wh = o.ensure("wh_navojoa", "stock.warehouse", {
        "name": "Planta Navojoa", "code": "NKW",
        "reception_steps": "three_steps", "delivery_steps": "ship_only",
    }, match=[("company_id", "=", company)])
    w = o.read("stock.warehouse", [wh], ["lot_stock_id", "wh_qc_stock_loc_id", "wh_input_stock_loc_id"])[0]
    stock = w["lot_stock_id"][0]
    o.write("stock.location", w["wh_input_stock_loc_id"][0], {"name": "Recepción y báscula"})
    o.write("stock.location", w["wh_qc_stock_loc_id"][0], {"name": "Laboratorio – cuarentena"})
    for xid, nombre in UBICACIONES:
        o.ensure(xid, "stock.location", {"name": nombre, "location_id": stock, "usage": "internal"})
    # Folios con el código del almacén (NKW/MO/00001, NKW/IN/00001, …)
    for seq in o.read("ir.sequence", o.search("ir.sequence", [("prefix", "=like", "WH/%")]), ["prefix"]):
        o.write("ir.sequence", seq["id"], {"prefix": seq["prefix"].replace("WH/", "NKW/", 1)})
    return wh


# ---------------------------------------------------------------------------
# 5. Productos
# ---------------------------------------------------------------------------
CATEGORIAS = [
    ("cat_mp", "Materias primas", None),
    ("cat_granos", "Granos y subproductos", "cat_mp"),
    ("cat_proteicos", "Pastas proteicas e ingredientes de origen animal", "cat_mp"),
    ("cat_aceites", "Aceites y grasas", "cat_mp"),
    ("cat_minerales", "Minerales", "cat_mp"),
    ("cat_micros", "Vitaminas, premezclas, aminoácidos y aditivos", "cat_mp"),
    ("cat_empaque", "Empaque", None),
    ("cat_pt", "Alimento terminado", None),
    ("cat_pt_lechon", "Dietas para lechones", "cat_pt"),
    ("cat_pt_iniciacion", "Dietas de iniciación", "cat_pt"),
    ("cat_pt_engorda", "Dietas de engorda por fases", "cat_pt"),
    ("cat_pt_reproductores", "Dietas para reproductores (pie de cría)", "cat_pt"),
    ("cat_pt_micro", "Microconcentrados y fórmulas", "cat_pt"),
    ("cat_servicios", "Servicios", None),
]

# xmlid, código, nombre, categoría, costo MXN/kg, proveedor, ubicación de almacenaje
MATERIAS_PRIMAS = [
    ("mp_sorgo", "MP-SOR", "Sorgo grano", "cat_granos", 5.20, "prov_granos", "loc_silo1"),
    ("mp_maiz", "MP-MAI", "Maíz amarillo", "cat_granos", 6.10, "prov_granos", "loc_silo3"),
    ("mp_trigo", "MP-TRI", "Trigo grano", "cat_granos", 6.50, "prov_granos", "loc_silo4"),
    ("mp_salvado", "MP-SAL", "Salvado de trigo", "cat_granos", 4.50, "prov_granos", "loc_silo4"),
    ("mp_soya", "MP-PSY", "Pasta de soya 46 %", "cat_proteicos", 9.80, "prov_oleaginosas", "loc_macros"),
    ("mp_suero", "MP-SUE", "Suero de leche en polvo", "cat_proteicos", 28.00, "prov_premezclas", "loc_micros"),
    ("mp_pescado", "MP-HPE", "Harina de pescado 65 %", "cat_proteicos", 32.00, "prov_premezclas", "loc_macros"),
    ("mp_aceite", "MP-ACE", "Aceite crudo de soya", "cat_aceites", 30.00, "prov_oleaginosas", "loc_aceite"),
    ("mp_fosfato", "MP-FOS", "Fosfato monodicálcico 21 %", "cat_minerales", 22.00, "prov_minerales", "loc_macros"),
    ("mp_carbonato", "MP-CAR", "Carbonato de calcio", "cat_minerales", 1.80, "prov_minerales", "loc_macros"),
    ("mp_sal", "MP-NACL", "Sal (cloruro de sodio)", "cat_minerales", 3.50, "prov_minerales", "loc_macros"),
    ("mp_premvit", "MP-PVI", "Premezcla vitamínica cerdos", "cat_micros", 120.00, "prov_premezclas", "loc_micros"),
    ("mp_premmin", "MP-PMI", "Premezcla de minerales traza", "cat_micros", 60.00, "prov_premezclas", "loc_micros"),
    ("mp_lisina", "MP-LIS", "L-Lisina HCl 78 %", "cat_micros", 40.00, "prov_premezclas", "loc_micros"),
    ("mp_metionina", "MP-MET", "DL-Metionina 99 %", "cat_micros", 75.00, "prov_premezclas", "loc_micros"),
    ("mp_treonina", "MP-TRE", "L-Treonina 98.5 %", "cat_micros", 48.00, "prov_premezclas", "loc_micros"),
    ("mp_secuestrante", "MP-SEC", "Secuestrante de micotoxinas", "cat_micros", 55.00, "prov_premezclas", "loc_micros"),
]

# xmlid, código, nombre, costo MXN/unidad, uom ('unit' o 'kg')
EMPAQUES = [
    ("emp_saco25", "EMP-S25", "Saco de polipropileno 25 kg", 7.50, "unit"),
    ("emp_saco40", "EMP-S40", "Saco de polipropileno 40 kg", 8.50, "unit"),
    ("emp_hilo", "EMP-HIL", "Hilo para cosedora", 120.00, "kg"),
    ("emp_etiqueta", "EMP-ETQ", "Etiqueta de lote con código QR", 0.35, "unit"),
]

# Alimento a granel (kg): xmlid, código, nombre, categoría, precio MXN/kg, presentación, vida útil (días)
GRANEL = [
    ("pt_l1", "NK-L1", "Lechón fase 1 – preiniciador (migaja)", "cat_pt_lechon", 22.00, "migaja", 60),
    ("pt_l2", "NK-L2", "Lechón fase 2 (pellet)", "cat_pt_lechon", 16.00, "pellet", 60),
    ("pt_i1", "NK-I1", "Iniciación (pellet)", "cat_pt_iniciacion", 11.50, "pellet", 75),
    ("pt_e1", "NK-E1", "Engorda fase 1 – crecimiento (pellet)", "cat_pt_engorda", 9.60, "pellet", 90),
    ("pt_e2", "NK-E2", "Engorda fase 2 – desarrollo (pellet)", "cat_pt_engorda", 9.10, "pellet", 90),
    ("pt_e3", "NK-E3", "Engorda fase 3 – finalización (pellet)", "cat_pt_engorda", 8.70, "pellet", 90),
    ("pt_ges", "NK-GES", "Gestación cerdas (pellet)", "cat_pt_reproductores", 8.50, "pellet", 90),
    ("pt_lac", "NK-LAC", "Lactancia cerdas (pellet)", "cat_pt_reproductores", 9.80, "pellet", 90),
    ("pt_mc4", "NK-MC4", "Microconcentrado engorda 4 % (harina)", "cat_pt_micro", 38.00, "harina", 120),
]

# Alimento ensacado: xmlid, código, granel, kg por saco, saco, precio MXN/saco
SACOS = [
    ("pt_l1_s25", "NK-L1-S25", "pt_l1", 25, "emp_saco25", 560.00),
    ("pt_l2_s40", "NK-L2-S40", "pt_l2", 40, "emp_saco40", 650.00),
    ("pt_i1_s40", "NK-I1-S40", "pt_i1", 40, "emp_saco40", 470.00),
    ("pt_ges_s40", "NK-GES-S40", "pt_ges", 40, "emp_saco40", 350.00),
    ("pt_lac_s40", "NK-LAC-S40", "pt_lac", 40, "emp_saco40", 400.00),
    ("pt_mc4_s25", "NK-MC4-S25", "pt_mc4", 25, "emp_saco25", 960.00),
]


def tipo_almacenable(o):
    campos = o.call("product.template", "fields_get", attributes=["type"])
    if "is_storable" in campos:          # Odoo 18+
        return {"type": "consu", "is_storable": True}
    return {"detailed_type": "product"}  # Odoo 17


def impuesto(o, tipo, porcentaje):
    company = o.ref("base.main_company")
    ids = o.search("account.tax", [("type_tax_use", "=", tipo), ("amount", "=", porcentaje),
                                   ("amount_type", "=", "percent"), ("company_id", "=", company)],
                   order="sequence, id")
    for t in o.read("account.tax", ids, ["name"]):
        if "IVA" in t["name"] and "RET" not in t["name"].upper():
            return [(6, 0, [t["id"]])]
    return [(6, 0, ids[:1])] if ids else [(6, 0, [])]


def cargar_productos(o):
    log("Categorías y productos (materias primas, empaque y alimento terminado)")
    for xid, nombre, padre in CATEGORIAS:
        vals = {"name": nombre, "parent_id": o.ref(padre) if padre else False}
        if xid.startswith("cat_pt") or xid.startswith("cat_mp") or xid in ("cat_granos", "cat_proteicos", "cat_aceites", "cat_minerales", "cat_micros", "cat_empaque"):
            vals["property_cost_method"] = "average"
        o.ensure(xid, "product.category", vals)

    alm = tipo_almacenable(o)
    kg = o.ref("uom.product_uom_kgm")
    ton = o.ref("uom.product_uom_ton")
    unit = o.ref("uom.product_uom_unit")
    iva0_v, iva0_c = impuesto(o, "sale", 0.0), impuesto(o, "purchase", 0.0)
    iva16_c = impuesto(o, "purchase", 16.0)
    ruta_mfg = o.ref("mrp.route_warehouse0_manufacture")
    ruta_buy = o.ref("purchase_stock.route_warehouse0_buy")
    pt_fields = o.call("product.template", "fields_get", attributes=["type"])

    def product(xid, vals):
        tmpl = o.ensure(f"{xid}_tmpl", "product.template", vals)
        prod = o.search("product.product", [("product_tmpl_id", "=", tmpl)])[0]
        if not o.ref(xid, required=False):
            o.create("ir.model.data", {"module": MOD, "name": xid, "model": "product.product",
                                       "res_id": prod, "noupdate": True})
        return prod

    for xid, cod, nombre, cat, costo, prov, _loc in MATERIAS_PRIMAS:
        exento = cat in ("cat_granos", "cat_proteicos")
        product(xid, dict(alm, name=nombre, default_code=cod, categ_id=o.ref(cat), uom_id=kg,
                          uom_po_id=ton if cat == "cat_granos" else kg, standard_price=costo,
                          tracking="lot", sale_ok=False, purchase_ok=True,
                          route_ids=[(6, 0, [ruta_buy])],
                          supplier_taxes_id=iva0_c if exento else iva16_c, taxes_id=[(6, 0, [])],
                          description_purchase="Entregar con certificado de análisis. Sujeto a muestreo de humedad, proteína y micotoxinas."))
    for xid, cod, nombre, costo, um in EMPAQUES:
        u = unit if um == "unit" else kg
        product(xid, dict(alm, name=nombre, default_code=cod, categ_id=o.ref("cat_empaque"), uom_id=u,
                          uom_po_id=u, standard_price=costo, sale_ok=False, purchase_ok=True,
                          route_ids=[(6, 0, [ruta_buy])], supplier_taxes_id=iva16_c, taxes_id=[(6, 0, [])]))
    for xid, cod, nombre, cat, precio, pres, vida in GRANEL:
        vals = dict(alm, name=nombre, default_code=cod, categ_id=o.ref(cat), uom_id=kg, uom_po_id=kg,
                    list_price=precio, tracking="lot", sale_ok=True, purchase_ok=False,
                    route_ids=[(6, 0, [ruta_mfg])], taxes_id=iva0_v, supplier_taxes_id=[(6, 0, [])],
                    description_sale=f"Alimento balanceado para cerdos en {pres}. Precio por kg; IVA tasa 0 %.",
                    description_pickingout="Entregar a granel. Anotar lote en la remisión.")
        if "use_expiration_date" in pt_fields:
            vals.update(use_expiration_date=True, expiration_time=vida, use_time=vida - 10,
                        removal_time=vida - 5, alert_time=vida - 15)
        product(xid, vals)
    for xid, cod, granel, kgs, _saco, precio in SACOS:
        g = next(x for x in GRANEL if x[0] == granel)
        vals = dict(alm, name=f"{g[2]} – saco {kgs} kg", default_code=cod, categ_id=o.ref(g[3]),
                    uom_id=unit, uom_po_id=unit, list_price=precio, tracking="lot", sale_ok=True,
                    purchase_ok=False, route_ids=[(6, 0, [ruta_mfg])], taxes_id=iva0_v,
                    supplier_taxes_id=[(6, 0, [])], weight=kgs + 0.15,
                    description_sale=f"Saco de {kgs} kg. IVA tasa 0 %.")
        if "use_expiration_date" in pt_fields:
            vals.update(use_expiration_date=True, expiration_time=g[6], use_time=g[6] - 10,
                        removal_time=g[6] - 5, alert_time=g[6] - 15)
        product(xid, vals)
    product("srv_asesoria", {"name": "Asesoría nutricional y técnica en granja", "type": "service",
                             "default_code": "SRV-ASE", "categ_id": o.ref("cat_servicios"),
                             "list_price": 1500.0, "uom_id": unit, "uom_po_id": unit,
                             "sale_ok": True, "purchase_ok": False, "taxes_id": impuesto(o, "sale", 16.0)})

    log("Listas de precios de proveedores")
    for xid, cod, nombre, cat, costo, prov, _loc in MATERIAS_PRIMAS:
        o.ensure(f"si_{xid}", "product.supplierinfo", {
            "partner_id": o.ref(prov), "product_tmpl_id": o.ref(f"{xid}_tmpl"),
            "price": costo * 1000 if cat == "cat_granos" else costo,
            "product_uom" if "product_uom" in SUPINFO(o) else "product_uom_id": ton if cat == "cat_granos" else kg,
            "min_qty": 0, "delay": 3 if cat == "cat_granos" else 10})
    for xid, cod, nombre, costo, um in EMPAQUES:
        o.ensure(f"si_{xid}", "product.supplierinfo", {
            "partner_id": o.ref("prov_empaques"), "product_tmpl_id": o.ref(f"{xid}_tmpl"),
            "price": costo, "min_qty": 0, "delay": 7})


_SI = {}


def SUPINFO(o):
    if not _SI:
        _SI.update(o.call("product.supplierinfo", "fields_get", attributes=["type"]))
    return _SI


def cargar_reglas_almacenaje(o, wh):
    log("Reglas de almacenaje (silos, bodegas y tolvas) y reabastecimiento")
    stock = o.read("stock.warehouse", [wh], ["lot_stock_id"])[0]["lot_stock_id"][0]
    for xid, cod, nombre, cat, costo, prov, loc in MATERIAS_PRIMAS:
        o.ensure(f"put_{xid}", "stock.putaway.rule", {
            "product_id": o.ref(xid), "location_in_id": stock, "location_out_id": o.ref(loc)})
    for xid, *_ in EMPAQUES:
        o.ensure(f"put_{xid}", "stock.putaway.rule", {
            "product_id": o.ref(xid), "location_in_id": stock, "location_out_id": o.ref("loc_empaque")})
    for xid, *_ in GRANEL:
        o.ensure(f"put_{xid}", "stock.putaway.rule", {
            "product_id": o.ref(xid), "location_in_id": stock, "location_out_id": o.ref("loc_granel")})
    for xid, *_ in SACOS:
        o.ensure(f"put_{xid}", "stock.putaway.rule", {
            "product_id": o.ref(xid), "location_in_id": stock, "location_out_id": o.ref("loc_pt")})
    # Puntos de reorden de materias primas (kg)
    minimos = {"mp_sorgo": (40000, 120000), "mp_maiz": (15000, 50000), "mp_soya": (12000, 40000),
               "mp_aceite": (1500, 5000), "mp_fosfato": (800, 3000), "mp_premvit": (100, 400),
               "mp_lisina": (200, 800), "emp_saco40": (500, 3000), "emp_saco25": (300, 1500)}
    for xid, (mn, mx) in minimos.items():
        o.ensure(f"op_{xid}", "stock.warehouse.orderpoint", {
            "product_id": o.ref(xid), "warehouse_id": wh, "location_id": stock,
            "product_min_qty": mn, "product_max_qty": mx, "trigger": "manual"})


# ---------------------------------------------------------------------------
# 6. Centros de trabajo y fórmulas (listas de materiales)
# ---------------------------------------------------------------------------
CENTROS = [
    # xmlid, código, nombre, costo/h, OEE objetivo, nota
    ("wc_dosificacion", "DOS", "Dosificación – tolvas báscula", 450, 90, "Tolvas báscula con celdas de carga. PLC + HMI/SCADA de dosificación."),
    ("wc_molienda", "MOL", "Molino de martillos", 650, 85, "Reducción de tamaño de partícula."),
    ("wc_mezclado", "MEZ", "Mezcladora horizontal", 500, 90, "Mezcla con adición de líquidos (aceite) y micro-ingredientes."),
    ("wc_peletizado", "PEL", "Acondicionador y peletizadora", 1200, 80, "Acondicionado con vapor de caldera y peletizado."),
    ("wc_enfriado", "ENF", "Enfriador de contraflujo", 300, 90, "Enfriado y secado del pellet."),
    ("wc_desmoronado", "DES", "Desmoronador (migaja)", 250, 90, "Migaja para lechones."),
    ("wc_ensacado", "ENS", "Ensacadora con báscula y cosedora", 400, 85, "Envasado en sacos de 25 y 40 kg con etiqueta de lote."),
]

# Fórmula por 1,000 kg (1 bache = 1 t). Ingrediente: kg
FORMULAS = {
    "pt_l1": {"mp_maiz": 380, "mp_trigo": 75, "mp_soya": 200, "mp_suero": 200, "mp_pescado": 60,
              "mp_aceite": 40, "mp_fosfato": 15, "mp_carbonato": 8, "mp_sal": 4, "mp_premvit": 2.5,
              "mp_premmin": 2.5, "mp_lisina": 6, "mp_metionina": 3, "mp_treonina": 2, "mp_secuestrante": 2},
    "pt_l2": {"mp_maiz": 300, "mp_sorgo": 230, "mp_trigo": 6.5, "mp_soya": 260, "mp_suero": 100,
              "mp_pescado": 30, "mp_aceite": 30, "mp_fosfato": 14, "mp_carbonato": 9, "mp_sal": 4,
              "mp_premvit": 2.5, "mp_premmin": 2.5, "mp_lisina": 5.5, "mp_metionina": 2.5,
              "mp_treonina": 1.5, "mp_secuestrante": 2},
    "pt_i1": {"mp_sorgo": 420, "mp_maiz": 200, "mp_trigo": 26.5, "mp_soya": 290, "mp_aceite": 25,
              "mp_fosfato": 13, "mp_carbonato": 9, "mp_sal": 4, "mp_premvit": 2, "mp_premmin": 2,
              "mp_lisina": 4, "mp_metionina": 1.5, "mp_treonina": 1, "mp_secuestrante": 2},
    "pt_e1": {"mp_sorgo": 600, "mp_maiz": 100, "mp_trigo": 7, "mp_soya": 240, "mp_aceite": 20,
              "mp_fosfato": 11, "mp_carbonato": 10, "mp_sal": 4, "mp_premvit": 1.5, "mp_premmin": 1.5,
              "mp_lisina": 3.5, "mp_treonina": 0.5, "mp_secuestrante": 1},
    "pt_e2": {"mp_sorgo": 680, "mp_maiz": 79.5, "mp_soya": 195, "mp_aceite": 15, "mp_fosfato": 9,
              "mp_carbonato": 10, "mp_sal": 4, "mp_premvit": 1.5, "mp_premmin": 1.5, "mp_lisina": 3,
              "mp_treonina": 0.5, "mp_secuestrante": 1},
    "pt_e3": {"mp_sorgo": 740, "mp_maiz": 58, "mp_soya": 160, "mp_aceite": 15, "mp_fosfato": 8,
              "mp_carbonato": 9, "mp_sal": 4, "mp_premvit": 1, "mp_premmin": 1, "mp_lisina": 2.5,
              "mp_treonina": 0.5, "mp_secuestrante": 1},
    "pt_ges": {"mp_sorgo": 640, "mp_salvado": 150, "mp_soya": 160, "mp_aceite": 10, "mp_fosfato": 15,
               "mp_carbonato": 13, "mp_sal": 5, "mp_premvit": 2.5, "mp_premmin": 2.5, "mp_lisina": 1,
               "mp_secuestrante": 1},
    "pt_lac": {"mp_sorgo": 520, "mp_maiz": 120, "mp_salvado": 15, "mp_soya": 260, "mp_aceite": 40,
               "mp_fosfato": 16, "mp_carbonato": 12, "mp_sal": 5, "mp_premvit": 2.5, "mp_premmin": 2.5,
               "mp_lisina": 3, "mp_metionina": 1, "mp_treonina": 1, "mp_secuestrante": 2},
    "pt_mc4": {"mp_fosfato": 280, "mp_carbonato": 250, "mp_sal": 100, "mp_premvit": 40, "mp_premmin": 40,
               "mp_lisina": 90, "mp_metionina": 20, "mp_treonina": 20, "mp_secuestrante": 25,
               "mp_salvado": 135},
}

# Ruta por tipo de presentación: (centro, operación, minutos por bache de 1 t)
RUTAS = {
    "pellet": [("wc_dosificacion", "Dosificación y pesaje", 8), ("wc_molienda", "Molienda", 12),
               ("wc_mezclado", "Mezclado y adición de líquidos", 6),
               ("wc_peletizado", "Acondicionamiento y peletizado", 15), ("wc_enfriado", "Enfriado", 10)],
    "migaja": [("wc_dosificacion", "Dosificación y pesaje", 8), ("wc_molienda", "Molienda fina", 15),
               ("wc_mezclado", "Mezclado y adición de líquidos", 8),
               ("wc_peletizado", "Acondicionamiento y peletizado", 18), ("wc_enfriado", "Enfriado", 10),
               ("wc_desmoronado", "Desmoronado", 8)],
    "harina": [("wc_dosificacion", "Dosificación y pesaje de micros", 10),
               ("wc_mezclado", "Mezclado", 8)],
}


def cargar_fabricacion(o):
    log("Centros de trabajo")
    for xid, cod, nombre, costo, oee, nota in CENTROS:
        o.ensure(xid, "mrp.workcenter", {"name": nombre, "code": cod, "costs_hour": costo,
                                         "oee_target": oee, "time_efficiency": 100,
                                         "note": f"<p>{nota}</p>"})
    log("Fórmulas (listas de materiales por tonelada) y rutas de producción")
    kg, unit = o.ref("uom.product_uom_kgm"), o.ref("uom.product_uom_unit")
    for xid, cod, nombre, cat, precio, pres, vida in GRANEL:
        formula = FORMULAS[xid]
        assert abs(sum(formula.values()) - 1000) < 0.01, (xid, sum(formula.values()))
        bom = o.ensure(f"bom_{xid}", "mrp.bom", {
            "product_tmpl_id": o.ref(f"{xid}_tmpl"), "product_qty": 1000, "product_uom_id": kg,
            "type": "normal", "code": f"FORM-{cod}-v1", "ready_to_produce": "asap",
            "consumption": "warning"})
        o.call("mrp.bom.line", "unlink", o.search("mrp.bom.line", [("bom_id", "=", bom)]))
        o.call("mrp.routing.workcenter", "unlink",
               o.search("mrp.routing.workcenter", [("bom_id", "=", bom)], context={"active_test": False}))
        lines = [(0, 0, {"product_id": o.ref(mp), "product_qty": q, "product_uom_id": kg})
                 for mp, q in sorted(formula.items(), key=lambda x: -x[1])]
        ops = [(0, 0, {"name": n, "workcenter_id": o.ref(wc), "time_mode": "manual",
                       "time_cycle_manual": t, "sequence": 10 * (i + 1)})
               for i, (wc, n, t) in enumerate(RUTAS[pres])]
        o.write("mrp.bom", bom, {"bom_line_ids": lines, "operation_ids": ops})
    for xid, cod, granel, kgs, saco, precio in SACOS:
        bom = o.ensure(f"bom_{xid}", "mrp.bom", {
            "product_tmpl_id": o.ref(f"{xid}_tmpl"), "product_qty": 1, "product_uom_id": unit,
            "type": "normal", "code": f"ENV-{cod}", "consumption": "warning"})
        o.call("mrp.bom.line", "unlink", o.search("mrp.bom.line", [("bom_id", "=", bom)]))
        o.call("mrp.routing.workcenter", "unlink",
               o.search("mrp.routing.workcenter", [("bom_id", "=", bom)], context={"active_test": False}))
        o.write("mrp.bom", bom, {
            "bom_line_ids": [(0, 0, {"product_id": o.ref(granel), "product_qty": kgs, "product_uom_id": kg}),
                             (0, 0, {"product_id": o.ref(saco), "product_qty": 1, "product_uom_id": unit}),
                             (0, 0, {"product_id": o.ref("emp_etiqueta"), "product_qty": 1, "product_uom_id": unit}),
                             (0, 0, {"product_id": o.ref("emp_hilo"), "product_qty": 0.004, "product_uom_id": kg})],
            "operation_ids": [(0, 0, {"name": "Envasado, cosido y etiquetado", "workcenter_id": o.ref("wc_ensacado"),
                                      "time_mode": "manual", "time_cycle_manual": 0.2})]})


# ---------------------------------------------------------------------------
# 7. Inventario de tecnología (mantenimiento) y flotilla
# ---------------------------------------------------------------------------
EQ_CATEGORIAS = [
    ("eqc_basculas", "Básculas y pesaje"), ("eqc_laboratorio", "Laboratorio"),
    ("eqc_almacenamiento", "Almacenamiento y transporte de grano"), ("eqc_proceso", "Equipo de proceso"),
    ("eqc_envasado", "Envasado"), ("eqc_control", "Control y automatización (PLC/SCADA)"),
    ("eqc_ti", "Cómputo e infraestructura de TI"), ("eqc_servicios", "Servicios auxiliares"),
]
EQ_EQUIPOS = [
    ("mt_mecanico", "Mantenimiento mecánico"),
    ("mt_electrico", "Mantenimiento eléctrico e instrumentación"),
    ("mt_ti", "TI corporativo Kowi"),
]
# xmlid, nombre, categoría, equipo de mtto, proceso (código), ubicación, modelo/marca de referencia,
# interfaz / software, periodicidad preventiva (meses, 0 = sin preventivo)
EQUIPOS = [
    ("eq_bascula_camionera", "Báscula camionera 80 t con indicador digital", "eqc_basculas", "mt_electrico", "OP1", "Recepción y báscula", "Báscula de fosa 3 × 18 m", "Indicador con salida RS-232/Ethernet; software de báscula (tickets y CSV)", 6),
    ("eq_pc_bascula", "PC de báscula e impresora de tickets", "eqc_ti", "mt_ti", "OP1", "Caseta de báscula", "PC de escritorio Windows", "Software de báscula; captura manual al ERP", 12),
    ("eq_nir", "Analizador NIR", "eqc_laboratorio", "mt_electrico", "OP2", "Laboratorio", "Tipo FOSS o Perten", "Software propietario; exporta CSV/XML", 6),
    ("eq_humedad", "Determinador de humedad", "eqc_laboratorio", "mt_electrico", "OP2", "Laboratorio", "Termobalanza", "Lectura local; hoja de cálculo", 6),
    ("eq_micotoxinas", "Lector de micotoxinas (tiras reactivas)", "eqc_laboratorio", "mt_electrico", "OP2", "Laboratorio", "Lector de flujo lateral", "Lectura local; hoja de cálculo", 12),
    ("eq_pc_lab", "PC de laboratorio", "eqc_ti", "mt_ti", "OP2", "Laboratorio", "PC de escritorio Windows", "Software del NIR; Excel", 12),
    ("eq_silos", "Silos de grano (4) con sensores de nivel y termometría", "eqc_almacenamiento", "mt_mecanico", "AP2", "Patio de silos", "Silos metálicos", "Tablero de control / PLC", 3),
    ("eq_elevadores", "Transportadores y elevadores de cangilón", "eqc_almacenamiento", "mt_mecanico", "AP2", "Patio de silos", "Elevador de cangilones", "Tablero de control / PLC", 1),
    ("eq_pc_nutricion", "PC/laptop del nutriólogo", "eqc_ti", "mt_ti", "OP3", "Oficina de nutrición", "Laptop", "Software de formulación de mínimo costo (tipo Brill o Format); Excel/CSV", 12),
    ("eq_tolvas_bascula", "Tolvas báscula con celdas de carga", "eqc_proceso", "mt_electrico", "OP4", "Torre de dosificación", "Celdas de carga", "PLC + HMI/SCADA de dosificación", 3),
    ("eq_molino", "Molino de martillos", "eqc_proceso", "mt_mecanico", "OP4", "Molienda", "Molino de martillos 75 HP", "PLC (Ethernet/IP o Profinet)", 1),
    ("eq_mezcladora", "Mezcladora horizontal de listones 2 t", "eqc_proceso", "mt_mecanico", "OP4", "Mezclado", "Mezcladora de listones", "PLC (Ethernet/IP o Profinet)", 1),
    ("eq_liquidos", "Sistema de adición de líquidos (aceite)", "eqc_proceso", "mt_mecanico", "OP4", "Mezclado", "Bomba dosificadora con flujómetro", "PLC", 3),
    ("eq_peletizadora", "Acondicionador y peletizadora", "eqc_proceso", "mt_mecanico", "OP4", "Peletizado", "Peletizadora 150 HP", "PLC; amperaje y temperatura en SCADA", 1),
    ("eq_enfriador", "Enfriador de contraflujo", "eqc_proceso", "mt_mecanico", "OP4", "Peletizado", "Enfriador de contraflujo", "PLC", 3),
    ("eq_desmoronador", "Desmoronador de rodillos", "eqc_proceso", "mt_mecanico", "OP4", "Peletizado", "Desmoronador", "PLC", 3),
    ("eq_caldera", "Caldera de vapor", "eqc_servicios", "mt_mecanico", "OP4", "Cuarto de calderas", "Caldera pirotubular", "Tablero local", 1),
    ("eq_plc", "PLC de proceso", "eqc_control", "mt_electrico", "OP4", "Cuarto de control", "Allen-Bradley o Siemens", "Ethernet/IP o Profinet; OPC UA", 6),
    ("eq_scada", "PC industrial HMI/SCADA de dosificación", "eqc_control", "mt_electrico", "OP4", "Cuarto de control", "PC industrial", "SCADA con base SQL local; OPC", 6),
    ("eq_ensacadora", "Ensacadora con báscula y cosedora", "eqc_envasado", "mt_mecanico", "OP5", "Envasado", "Ensacadora de boca abierta", "Controlador propio; algunos modelos con Ethernet", 1),
    ("eq_tolvas_granel", "Tolvas de producto terminado a granel", "eqc_envasado", "mt_mecanico", "OP5", "Carga a granel", "Tolvas metálicas", "Tablero local", 6),
    ("eq_impresora_etiquetas", "Impresora de etiquetas", "eqc_envasado", "mt_ti", "OP5", "Envasado", "Impresora térmica", "Etiquetas manuales o impresas", 12),
    ("eq_moviles", "Teléfonos móviles de choferes y asesores", "eqc_ti", "mt_ti", "OP6", "Distribución", "Smartphones", "WhatsApp/llamadas; plataforma GPS del proveedor", 0),
    ("eq_pcs_admin", "PCs y laptops administrativas e impresoras multifuncionales", "eqc_ti", "mt_ti", "AP5", "Oficinas", "PCs Windows", "ERP corporativo de Grupo Kowi; Excel; portal del PAC para CFDI", 12),
    ("eq_pc_mtto", "PC de mantenimiento y herramientas de diagnóstico", "eqc_ti", "mt_ti", "AP1", "Taller de mantenimiento", "PC de escritorio", "Bitácoras en papel o Excel", 12),
    ("eq_servidor", "Servidor local / enlace al centro de datos corporativo", "eqc_ti", "mt_ti", "AP4", "Site de TI", "Servidor Windows", "Windows Server / Microsoft 365", 6),
    ("eq_red", "Switches, Wi-Fi y firewall de planta", "eqc_ti", "mt_ti", "AP4", "Site de TI", "Red LAN/Wi-Fi", "Red de planta", 6),
    ("eq_nas", "Respaldo NAS", "eqc_ti", "mt_ti", "AP4", "Site de TI", "NAS", "Respaldos locales (se recomienda copia fuera de sitio)", 3),
]

VEHICULOS = [
    # xmlid, marca, modelo, placa (ficticia), tipo
    ("veh_granelero1", "Kenworth", "T680 granelero", "NK-GR-01", "Granelero 30 t"),
    ("veh_granelero2", "Kenworth", "T680 granelero", "NK-GR-02", "Granelero 30 t"),
    ("veh_granelero3", "International", "LT granelero", "NK-GR-03", "Granelero 30 t"),
    ("veh_seca1", "Freightliner", "M2 106 caja seca", "NK-CS-01", "Carga seca (sacos)"),
    ("veh_seca2", "Isuzu", "ELF 600 caja seca", "NK-CS-02", "Carga seca (sacos)"),
]


def cargar_tecnologia(o):
    log("Inventario de tecnología como equipos de mantenimiento")
    for xid, nombre in EQ_CATEGORIAS:
        o.ensure(xid, "maintenance.equipment.category", {"name": nombre})
    for xid, nombre in EQ_EQUIPOS:
        o.ensure(xid, "maintenance.team", {"name": nombre})
    for (xid, nombre, cat, team, proc, ubic, modelo, interfaz, meses) in EQUIPOS:
        o.ensure(xid, "maintenance.equipment", {
            "name": nombre, "category_id": o.ref(cat), "maintenance_team_id": o.ref(team),
            "location": ubic, "model": modelo, "x_proceso_id": o.ref(f"proc_{proc}"),
            "x_interfaz": interfaz,
            "note": f"<p><b>Control / interfaz:</b> {interfaz}</p><p>Marca o modelo de referencia; confirmar con mantenimiento y TI de la planta.</p>"})
        if meses:
            o.ensure(f"prev_{xid}", "maintenance.request", {
                "name": f"Preventivo – {nombre}", "equipment_id": o.ref(xid),
                "maintenance_type": "preventive", "maintenance_team_id": o.ref(team),
                "recurring_maintenance": True, "repeat_interval": meses, "repeat_unit": "month",
                "repeat_type": "forever", "schedule_date": "2026-12-01 14:00:00", "duration": 2.0})
    o.ensure("corr_peletizadora", "maintenance.request", {
        "name": "Vibración y amperaje alto en peletizadora (dado desgastado)",
        "equipment_id": o.ref("eq_peletizadora"), "maintenance_type": "corrective",
        "maintenance_team_id": o.ref("mt_mecanico"), "priority": "2",
        "description": "<p>Reportado por operador de peletizado. Amperaje 15 % arriba del nominal. Revisar dado y rodillos.</p>",
        "schedule_date": "2026-11-25 15:00:00", "duration": 4.0})

    log("Flotilla de distribución")
    for xid, marca, modelo, placa, tipo in VEHICULOS:
        brand = o.ensure(f"brand_{marca.lower()}", "fleet.vehicle.model.brand", {"name": marca})
        model = o.ensure(f"model_{marca.lower()}_{modelo.split()[0].lower()}", "fleet.vehicle.model",
                         {"name": modelo, "brand_id": brand, "vehicle_type": "car"})
        o.ensure(xid, "fleet.vehicle", {"model_id": model, "license_plate": placa,
                                        "description": f"{tipo}. GPS de la plataforma del proveedor.",
                                        "fuel_type": "diesel"})


# ---------------------------------------------------------------------------
# 8. App «CIM Nutrikowi»: modelos personalizados con el análisis del PDF
# ---------------------------------------------------------------------------
SEL_TIPO_PROC = "[('estrategico','Estratégico'),('operativo','Operativo'),('apoyo','Apoyo')]"
SEL_COMPAT = "[('baja','Baja'),('baja_media','Baja–media'),('media','Media'),('media_alta','Media–alta'),('alta','Alta')]"
SEL_CONECTA = "[('si','Sí'),('parcial','Parcial'),('no','No'),('na','No aplica (es el ERP)')]"
SEL_ASPECTO = "[('procesos','Procesos'),('informacion','Información'),('recursos','Recursos'),('organizacion','Organización')]"
SEL_DICTAMEN = "[('aceptado','Aceptado'),('rechazado','Rechazado'),('retenido','Retenido')]"
SEL_TIPO_MUESTRA = "[('mp','Materia prima'),('pt','Producto terminado')]"

MODELOS = {
    "x_nk_proceso": ("Proceso (mapa de procesos)", [
        ("x_name", "char", "Proceso", {"required": True}),
        ("x_codigo", "char", "Código", {}),
        ("x_sequence", "integer", "Secuencia", {}),
        ("x_tipo", "selection", "Tipo", {"selection": SEL_TIPO_PROC}),
        ("x_proposito", "text", "Propósito", {}),
        ("x_responsable", "char", "Responsable típico", {}),
        ("x_departamento_id", "many2one", "Departamento", {"relation": "hr.department"}),
        ("x_entradas", "text", "Entradas de información", {}),
        ("x_salidas", "text", "Salidas de información", {}),
        ("x_datos", "text", "Datos clave que genera", {}),
        ("x_frecuencia", "char", "Frecuencia", {}),
        ("x_llave", "char", "Llave de integración", {}),
        ("x_odoo", "text", "Dónde vive en Odoo", {}),
    ]),
    "x_nk_flujo": ("Flujo de información", [
        ("x_name", "char", "Flujo", {"required": True}),
        ("x_numero", "integer", "#", {}),
        ("x_origen_id", "many2one", "De", {"relation": "x_nk_proceso"}),
        ("x_destino_id", "many2one", "A", {"relation": "x_nk_proceso"}),
        ("x_informacion", "text", "Información que fluye", {}),
        ("x_integracion", "text", "Integración propuesta", {}),
    ]),
    "x_nk_sistema": ("Sistema (software) y compatibilidad", [
        ("x_name", "char", "Sistema", {"required": True}),
        ("x_proceso_id", "many2one", "Proceso", {"relation": "x_nk_proceso"}),
        ("x_formato", "char", "Formato de datos / protocolo", {}),
        ("x_conecta_erp", "selection", "¿Se conecta hoy con el ERP?", {"selection": SEL_CONECTA}),
        ("x_compatibilidad", "selection", "Compatibilidad", {"selection": SEL_COMPAT}),
        ("x_nivel", "char", "Nivel ISA-95", {}),
        ("x_observacion", "text", "Observación", {}),
        ("x_propuesta", "text", "Integración / herramienta propuesta", {}),
    ]),
    "x_nk_herramienta": ("Software de bajo costo propuesto", [
        ("x_name", "char", "Herramienta", {"required": True}),
        ("x_necesidad", "char", "Necesidad", {}),
        ("x_licencia", "char", "Tipo de licencia", {}),
        ("x_uso", "text", "Uso en Nutrikowi", {}),
        ("x_url", "char", "Sitio", {}),
    ]),
    "x_nk_cim": ("Análisis CIM por aspecto (Anexo A)", [
        ("x_name", "char", "Contenido", {"required": True}),
        ("x_sequence", "integer", "Secuencia", {}),
        ("x_aspecto", "selection", "Aspecto", {"selection": SEL_ASPECTO}),
        ("x_situacion", "text", "Situación en Nutrikowi", {}),
        ("x_evidencia", "text", "Evidencia en esta base de datos", {}),
    ]),
    "x_nk_analisis": ("Análisis de laboratorio", [
        ("x_name", "char", "Folio", {"required": True}),
        ("x_tipo", "selection", "Muestra", {"selection": SEL_TIPO_MUESTRA}),
        ("x_fecha", "datetime", "Fecha de análisis", {}),
        ("x_producto_id", "many2one", "Producto", {"relation": "product.product"}),
        ("x_lote_id", "many2one", "Lote", {"relation": "stock.lot"}),
        ("x_proveedor_id", "many2one", "Proveedor / cliente", {"relation": "res.partner"}),
        ("x_ticket_bascula", "char", "Ticket de báscula", {}),
        ("x_peso_neto_kg", "float", "Peso neto (kg)", {}),
        ("x_humedad", "float", "Humedad (%)", {}),
        ("x_proteina", "float", "Proteína (%)", {}),
        ("x_grasa", "float", "Grasa (%)", {}),
        ("x_fibra", "float", "Fibra (%)", {}),
        ("x_aflatoxinas", "float", "Aflatoxinas (ppb)", {}),
        ("x_durabilidad", "float", "Durabilidad del pellet PDI (%)", {}),
        ("x_equipo", "char", "Equipo / método", {}),
        ("x_dictamen", "selection", "Dictamen", {"selection": SEL_DICTAMEN}),
        ("x_notas", "text", "Notas", {}),
    ]),
    "x_nk_desempeno": ("Desempeño en granja", [
        ("x_name", "char", "Registro", {"required": True}),
        ("x_semana", "date", "Semana", {}),
        ("x_granja_id", "many2one", "Granja", {"relation": "res.partner"}),
        ("x_producto_id", "many2one", "Dieta", {"relation": "product.product"}),
        ("x_lote_id", "many2one", "Lote de PT", {"relation": "stock.lot"}),
        ("x_cerdos", "integer", "Cerdos en la caseta", {}),
        ("x_consumo_kg", "float", "Alimento consumido (kg)", {}),
        ("x_gdp", "float", "Ganancia diaria de peso (g/día)", {}),
        ("x_conversion", "float", "Conversión alimenticia (kg/kg)", {}),
        ("x_mortalidad", "float", "Mortalidad (%)", {}),
        ("x_ajuste", "text", "Ajuste sugerido a la fórmula", {}),
    ]),
}

VISTAS = {
    "x_nk_proceso": (["x_codigo", "x_name", "x_tipo", "x_responsable", "x_departamento_id", "x_frecuencia", "x_llave"],
                     [("Proceso", ["x_name", "x_codigo", "x_tipo", "x_sequence", "x_responsable", "x_departamento_id"]),
                      ("Propósito", ["x_proposito"]),
                      ("Entradas y salidas de información", ["x_entradas", "x_salidas"]),
                      ("Integración de procesos", ["x_datos", "x_frecuencia", "x_llave", "x_odoo"])],
                     "x_tipo"),
    "x_nk_flujo": (["x_numero", "x_origen_id", "x_destino_id", "x_informacion", "x_integracion"],
                   [("Flujo", ["x_name", "x_numero", "x_origen_id", "x_destino_id"]),
                    ("Detalle", ["x_informacion", "x_integracion"])], None),
    "x_nk_sistema": (["x_name", "x_proceso_id", "x_formato", "x_conecta_erp", "x_compatibilidad", "x_nivel"],
                     [("Sistema", ["x_name", "x_proceso_id", "x_formato", "x_conecta_erp", "x_compatibilidad", "x_nivel"]),
                      ("Evaluación", ["x_observacion", "x_propuesta"])], "x_compatibilidad"),
    "x_nk_herramienta": (["x_necesidad", "x_name", "x_licencia", "x_uso"],
                         [("Herramienta", ["x_name", "x_necesidad", "x_licencia", "x_url"]), ("Uso", ["x_uso"])], None),
    "x_nk_cim": (["x_aspecto", "x_name", "x_situacion"],
                 [("Aspecto", ["x_aspecto", "x_name", "x_sequence"]), ("Análisis", ["x_situacion", "x_evidencia"])],
                 "x_aspecto"),
    "x_nk_analisis": (["x_name", "x_fecha", "x_tipo", "x_producto_id", "x_lote_id", "x_humedad", "x_proteina", "x_aflatoxinas", "x_dictamen"],
                      [("Muestra", ["x_name", "x_tipo", "x_fecha", "x_producto_id", "x_lote_id", "x_proveedor_id", "x_ticket_bascula", "x_peso_neto_kg"]),
                       ("Resultados", ["x_humedad", "x_proteina", "x_grasa", "x_fibra", "x_aflatoxinas", "x_durabilidad", "x_equipo", "x_dictamen"]),
                       ("Notas", ["x_notas"])], None),
    "x_nk_desempeno": (["x_semana", "x_granja_id", "x_producto_id", "x_lote_id", "x_cerdos", "x_gdp", "x_conversion", "x_mortalidad"],
                       [("Registro", ["x_name", "x_semana", "x_granja_id", "x_producto_id", "x_lote_id"]),
                        ("Indicadores", ["x_cerdos", "x_consumo_kg", "x_gdp", "x_conversion", "x_mortalidad"]),
                        ("Retroalimentación a formulación", ["x_ajuste"])], None),
}


def cargar_modelos_cim(o):
    log("App «CIM Nutrikowi»: modelos, vistas, permisos y menús")
    grupo_user = o.ref("base.group_user")
    for model, (desc, campos) in MODELOS.items():
        mid = o.first("ir.model", [("model", "=", model)])
        if not mid:
            mid = o.create("ir.model", {"name": desc, "model": model, "state": "manual",
                                        "field_id": [(0, 0, {"name": "x_name", "field_description": "Nombre",
                                                             "ttype": "char", "state": "manual", "required": True})]})
        for name, ttype, label, extra in campos:
            fid = o.first("ir.model.fields", [("model", "=", model), ("name", "=", name)])
            vals = dict({"field_description": label}, **{k: v for k, v in extra.items() if k != "relation"})
            if fid:
                o.write("ir.model.fields", fid, {"field_description": label})
            else:
                vals.update({"model_id": mid, "name": name, "ttype": ttype, "state": "manual"})
                if "relation" in extra:
                    vals["relation"] = extra["relation"]
                o.create("ir.model.fields", vals)
        if not o.search("ir.model.access", [("model_id", "=", mid), ("group_id", "=", grupo_user)]):
            o.create("ir.model.access", {"name": f"{model} usuarios", "model_id": mid, "group_id": grupo_user,
                                         "perm_read": True, "perm_write": True, "perm_create": True, "perm_unlink": True})
    # Campos extra en equipos de mantenimiento
    meq = o.first("ir.model", [("model", "=", "maintenance.equipment")])
    for name, ttype, label, rel in [("x_proceso_id", "many2one", "Proceso CIM", "x_nk_proceso"),
                                    ("x_interfaz", "char", "Control / interfaz", None)]:
        if not o.first("ir.model.fields", [("model", "=", "maintenance.equipment"), ("name", "=", name)]):
            vals = {"model_id": meq, "name": name, "ttype": ttype, "field_description": label, "state": "manual"}
            if rel:
                vals["relation"] = rel
            o.create("ir.model.fields", vals)
    o.ensure("view_equipment_cim", "ir.ui.view", {
        "name": "maintenance.equipment.form.cim", "model": "maintenance.equipment", "type": "form",
        "inherit_id": o.ref("maintenance.hr_equipment_view_form"),
        "arch": "<data><xpath expr=\"//field[@name='category_id']\" position=\"after\">"
                "<field name=\"x_proceso_id\"/><field name=\"x_interfaz\"/></xpath></data>"})
    o.ensure("view_equipment_cim_list", "ir.ui.view", {
        "name": "maintenance.equipment.list.cim", "model": "maintenance.equipment", "type": "list" if o.version >= 18 else "tree",
        "inherit_id": o.ref("maintenance.hr_equipment_view_tree"),
        "arch": "<data><xpath expr=\"//field[@name='category_id']\" position=\"after\">"
                "<field name=\"x_proceso_id\" optional=\"show\"/><field name=\"x_interfaz\" optional=\"show\"/></xpath></data>"})

    list_tag = "list" if o.version >= 18 else "tree"
    for model, (cols, grupos, group_by) in VISTAS.items():
        short = model.replace("x_nk_", "")
        o.ensure(f"view_{short}_list", "ir.ui.view", {
            "name": f"{model}.list", "model": model, "type": list_tag,
            "arch": f"<{list_tag}>" + "".join(f'<field name="{c}"/>' for c in cols) + f"</{list_tag}>"})
        body = ""
        for titulo, campos in grupos:
            textos = [c for c in campos if c in ("x_proposito", "x_entradas", "x_salidas", "x_datos", "x_odoo",
                                                 "x_informacion", "x_integracion", "x_observacion", "x_propuesta",
                                                 "x_uso", "x_situacion", "x_evidencia", "x_notas", "x_ajuste")]
            if textos and len(textos) == len(campos):
                body += f'<separator string="{titulo}"/><group>' + "".join(f'<field name="{c}"/>' for c in campos) + "</group>"
            else:
                body += f'<group string="{titulo}">' + "".join(f'<field name="{c}"/>' for c in campos) + "</group>"
        o.ensure(f"view_{short}_form", "ir.ui.view", {
            "name": f"{model}.form", "model": model, "type": "form",
            "arch": f'<form><sheet><div class="oe_title"><h1><field name="x_name"/></h1></div>{body}</sheet></form>'})
        search = "<search>" + "".join(f'<field name="{c}"/>' for c in cols if not c.startswith("x_sequence"))
        if group_by:
            etiqueta = {"x_tipo": "Tipo", "x_aspecto": "Aspecto", "x_compatibilidad": "Compatibilidad"}[group_by]
            search += f'<group expand="0" string="Agrupar por"><filter name="g_{group_by}" string="{etiqueta}" context="{{\'group_by\': \'{group_by}\'}}"/></group>'
        search += "</search>"
        o.ensure(f"view_{short}_search", "ir.ui.view", {"name": f"{model}.search", "model": model, "type": "search", "arch": search})

    root = o.ensure("menu_cim_root", "ir.ui.menu", {"name": "CIM Nutrikowi", "sequence": 5,
                                                    "web_icon": "mrp,static/description/icon.png"})
    menus = [
        ("x_nk_proceso", "Mapa de procesos", 10, "{'search_default_g_x_tipo': 1}"),
        ("x_nk_flujo", "Flujos de información", 20, "{}"),
        ("x_nk_sistema", "Sistemas y compatibilidad", 30, "{}"),
        ("x_nk_herramienta", "Software de bajo costo propuesto", 40, "{}"),
        ("x_nk_cim", "Análisis CIM (Anexo A)", 50, "{'search_default_g_x_aspecto': 1}"),
        ("x_nk_analisis", "Análisis de laboratorio", 60, "{}"),
        ("x_nk_desempeno", "Desempeño en granja", 70, "{}"),
    ]
    for model, nombre, seq, ctx in menus:
        short = model.replace("x_nk_", "")
        act = o.ensure(f"action_{short}", "ir.actions.act_window", {
            "name": nombre, "res_model": model, "view_mode": f"{list_tag},form", "context": ctx,
            "search_view_id": o.ref(f"view_{short}_search")})
        o.ensure(f"menu_{short}", "ir.ui.menu", {"name": nombre, "parent_id": root, "sequence": seq,
                                                 "action": f"ir.actions.act_window,{act}"})
    act = o.ensure("action_equipos_cim", "ir.actions.act_window", {
        "name": "Inventario de tecnología (hardware)", "res_model": "maintenance.equipment",
        "view_mode": "list,form" if o.version >= 18 else "tree,form",
        "context": "{'group_by': 'x_proceso_id'}"})
    o.ensure("menu_equipos_cim", "ir.ui.menu", {"name": "Inventario de tecnología (hardware)", "parent_id": root,
                                                "sequence": 35, "action": f"ir.actions.act_window,{act}"})


# ---------------------------------------------------------------------------
# 9. Datos del análisis (secciones II.2 a II.5 y Anexo A)
# ---------------------------------------------------------------------------
PROCESOS = [
    # código, nombre, tipo, propósito, responsable, departamento, entradas, salidas, datos, frecuencia, llave, odoo
    ("ES1", "Dirección general y planeación", "estrategico",
     "Definir objetivos, presupuesto y volúmenes de producción alineados con las granjas del grupo.",
     "Dirección / Gerencia de planta", "dep_gerencia", "Pronóstico de demanda; indicadores de costo, calidad y producción.",
     "Objetivos, presupuesto y volúmenes de producción.", "Presupuesto y metas por dieta.", "Anual / mensual", "Periodo",
     "Tableros de Fabricación, Inventario y Contabilidad."),
    ("ES2", "Nutrición y diseño de dietas", "estrategico",
     "Definir el programa de tres etapas (pie de cría, iniciación y engorda) y los requerimientos nutricionales por fase.",
     "Gerencia de nutrición", "dep_nutricion", "Requerimientos por etapa; desempeño en granja.",
     "Programa nutricional; especificación de cada dieta.", "Requerimientos por fase.", "Por cambio de programa", "Código de dieta",
     "Productos de la categoría «Alimento terminado»."),
    ("ES3", "Calidad e inocuidad (BPM, HACCP)", "estrategico",
     "Establecer el sistema de Buenas Prácticas de Manufactura y HACCP y vigilar el cumplimiento normativo (SENASICA/SADER).",
     "Aseguramiento de calidad", "dep_calidad", "Certificados de MP; muestras de PT; registros BPM/HACCP.",
     "Liberación o retención de lotes; trazabilidad; reportes de auditoría.", "Dictámenes y registros BPM/HACCP.", "Por lote", "Lote de MP / lote de PT",
     "CIM Nutrikowi › Análisis de laboratorio; Inventario › Lotes (trazabilidad)."),
    ("ES4", "Planeación comercial y ventas", "estrategico",
     "Pronosticar la demanda de clientes internos y externos.",
     "Ventas", "dep_ventas", "Pedidos de granjas Porcicowi/Genetikowi y clientes externos; inventario de cerdos por etapa; historial de ventas.",
     "Pronóstico de demanda por dieta; pedidos confirmados; lista de precios.", "Pedidos y pronóstico por dieta.", "Semanal", "Cliente + dieta",
     "Ventas › Pedidos; tarifas de venta."),
    ("OP0", "Planeación de producción", "operativo",
     "Convertir pedidos y pronóstico en el programa de producción y las requisiciones de insumos.",
     "Jefe de producción", "dep_produccion", "Pronóstico y pedidos; existencias de MP y PT; capacidad de molino y peletizadora.",
     "Programa de producción (dieta, toneladas, fecha); requisiciones de insumos.", "Programa por dieta y fecha.", "Diaria", "Orden de producción",
     "Fabricación › Planificación; Inventario › Reabastecimiento."),
    ("OP1", "Compras y recepción", "operativo",
     "Adquirir granos e insumos, pesarlos y descargarlos.",
     "Compras / Báscula", "dep_almacen", "Requisiciones; precios de mercado de granos; catálogo de proveedores; ticket de báscula.",
     "Órdenes de compra; programa de arribos; precios actualizados para formulación.",
     "Proveedor, orden de compra, ingrediente, peso bruto/tara/neto, fecha y hora.", "Por camión", "Número de ticket y lote de MP",
     "Compras › Órdenes; Inventario › Recepción (paso 1 de 3)."),
    ("OP2", "Control de calidad de materias primas", "operativo",
     "Aceptar o rechazar lotes con base en análisis de humedad, proteína, micotoxinas e impurezas.",
     "Laboratorio", "dep_calidad", "Órdenes de compra; ticket de báscula; muestras de MP.",
     "Certificado de análisis; entrada a almacén o rechazo; lote de MP asignado.",
     "Humedad, proteína, grasa, fibra, micotoxinas; dictamen aceptado/rechazado.", "Por lote de MP y de PT", "Lote de MP / lote de PT",
     "Ubicación «Laboratorio – cuarentena» (paso 2 de 3) y CIM Nutrikowi › Análisis de laboratorio."),
    ("OP3", "Formulación", "operativo",
     "Generar la fórmula de mínimo costo de cada dieta.",
     "Nutriólogo", "dep_nutricion", "Requerimientos nutricionales por etapa; análisis de MP; precios de ingredientes; desempeño en granja.",
     "Fórmula liberada (ingredientes y kg por bache); costo por tonelada; especificación de producto.",
     "Versión de fórmula, ingredientes y kg por bache, aporte nutricional, costo por tonelada.", "Cada cambio de precio o de análisis", "Código de dieta + versión",
     "Fabricación › Listas de materiales (FORM-…-v1, por 1,000 kg)."),
    ("OP4", "Producción por lotes", "operativo",
     "Dosificar, moler, mezclar, peletizar y enfriar.",
     "Jefe de producción", "dep_produccion", "Programa de producción; fórmula liberada; parámetros de proceso.",
     "Orden y número de lote; pesos reales por ingrediente; temperaturas y tiempos de peletizado; consumos; mermas.",
     "Orden de producción, pesos teóricos vs. reales, tiempos de mezcla, temperatura de acondicionado, amperaje de peletizadora, paros.",
     "Por bache (minutos)", "Número de lote de PT",
     "Fabricación › Órdenes de producción y órdenes de trabajo por centro."),
    ("OP5", "Envasado y almacén de producto terminado", "operativo",
     "Ensacar o cargar a granel, etiquetar y resguardar.",
     "Almacén PT", "dep_almacen", "Lote terminado; etiquetas; órdenes de embarque.",
     "Sacos/toneladas por lote; existencias de PT; ubicación en almacén.",
     "Sacos o toneladas por lote, fecha de caducidad, ubicación.", "Por lote", "Lote de PT",
     "Listas de materiales de envasado (ENV-…) y ubicaciones de PT."),
    ("OP6", "Distribución y asesoría técnica", "operativo",
     "Entregar en granja y dar seguimiento al desempeño animal.",
     "Logística / Servicio técnico", "dep_ventas", "Pedidos; existencias PT; rutas y unidades.",
     "Remisión/carta porte; evidencia de entrega; reportes de desempeño en granja (conversión alimenticia, ganancia diaria de peso).",
     "Cliente/granja, remisión, unidad, ruta, hora de entrega; conversión alimenticia, GDP y mortalidad por granja.",
     "Por viaje / semanal", "Remisión + lote(s) de PT; granja + dieta + lote de PT",
     "Inventario › Entregas; Flotilla; CIM Nutrikowi › Desempeño en granja."),
    ("AP1", "Mantenimiento", "apoyo",
     "Mantener molinos, peletizadoras, calderas y básculas.",
     "Mantenimiento", "dep_mantenimiento", "Horas de operación; fallas reportadas; plan preventivo.",
     "Órdenes de trabajo; disponibilidad de equipos; consumo de refacciones.",
     "Órdenes de trabajo, horas de operación, fallas, refacciones.", "Por evento", "Código de equipo",
     "Mantenimiento › Equipos y solicitudes (preventivo y correctivo)."),
    ("AP2", "Almacén e inventarios", "apoyo",
     "Controlar existencias de insumos, refacciones y producto.",
     "Almacén", "dep_almacen", "Entradas de MP; consumos de producción; entradas y salidas de PT.",
     "Existencias en línea; puntos de reorden; valor del inventario.",
     "Existencias y movimientos de MP, PT y refacciones.", "En línea", "Código de artículo + lote",
     "Inventario › Existencias, lotes, reglas de reabastecimiento y almacenaje."),
    ("AP3", "Recursos humanos y capacitación", "apoyo",
     "Contratar, pagar y capacitar al personal en BPM y seguridad.",
     "RR. HH.", "dep_rrhh", "Plantilla y necesidades de capacitación.", "Personal capacitado; expedientes.",
     "Plantilla por puesto.", "Mensual", "Número de empleado", "Empleados › Departamentos y puestos."),
    ("AP4", "Tecnologías de información", "apoyo",
     "Mantener equipos, red y sistemas.",
     "TI (corporativo Kowi)", "dep_ti", "Solicitudes de soporte; inventario de equipos.", "Equipos y sistemas disponibles; respaldos.",
     "Inventario de hardware y software.", "Por evento", "Código de equipo",
     "Mantenimiento › Equipos (categoría Cómputo e infraestructura de TI)."),
    ("AP5", "Finanzas y contabilidad", "apoyo",
     "Costeo, facturación, cuentas por pagar y cobrar.",
     "Finanzas", "dep_finanzas", "Facturas de proveedores; remisiones; costos de producción e inventario.",
     "Factura electrónica (CFDI); cuentas por pagar/cobrar; costo real por tonelada; estados financieros.",
     "Facturas, costos reales, cuentas por pagar/cobrar.", "Diaria", "Folio CFDI, orden de compra, remisión",
     "Facturación › Clientes y proveedores; costo de órdenes de producción."),
]

FLUJOS = [
    (1, "ES4", "OP0", "Pedidos y pronóstico de demanda por dieta", "Pedido de venta confirmado genera la demanda en Fabricación."),
    (2, "OP0", "OP4", "Programa de producción (dieta, toneladas, fecha)", "Órdenes de producción con fecha y cantidad."),
    (3, "OP4", "OP5", "Lote terminado, cantidad y número de lote", "Al cerrar la orden se crea el lote de PT con caducidad."),
    (4, "OP5", "OP6", "Existencias disponibles y orden de embarque", "Entrega (remisión) reserva lotes FEFO."),
    (5, "OP0", "OP1", "Requisición de insumos", "Reglas de reabastecimiento generan solicitudes de cotización."),
    (6, "OP1", "OP2", "Orden de compra y programa de arribos", "Recepción en 3 pasos: báscula → laboratorio → almacén."),
    (7, "OP2", "OP3", "Análisis nutricional real de las MP y precios", "Análisis por lote; costo promedio actualizado en el producto. Propuesta: Node-RED importa el CSV del NIR."),
    (8, "OP3", "OP4", "Fórmula liberada (kg por ingrediente por bache)", "Lista de materiales versionada. Propuesta: exportar al SCADA sin transcripción manual."),
    (9, "OP4", "AP2", "Consumos reales de MP por lote", "Consumo por lote al cerrar la orden. Propuesta: pesos reales del SCADA vía OPC UA."),
    (10, "OP5", "AP2", "Entradas y salidas de producto terminado", "Movimientos de inventario por lote."),
    (11, "AP2", "AP5", "Valor del inventario y costo real", "Valoración de inventario por costo promedio."),
    (12, "OP6", "AP5", "Remisiones para facturar (CFDI)", "Facturas a partir de lo entregado."),
    (13, "OP6", "OP3", "Desempeño del alimento en granja para ajustar fórmulas", "Registro de desempeño en granja ligado al lote de PT."),
]

SISTEMAS = [
    ("Software de báscula", "OP1", "Tickets impresos; exportación CSV; puerto serie", "no", "media", "Nivel 1–2",
     "El indicador puede enviar el peso por red si se configura.", "Node-RED lee el indicador por red y registra el ticket en la recepción."),
    ("Software del NIR", "OP2", "CSV/XML propietario", "no", "media", "Nivel 1–2",
     "Exporta resultados; se puede automatizar la carga.", "Node-RED vigila la carpeta de exportación y crea el análisis de laboratorio."),
    ("Software de formulación", "OP3", "Excel/CSV; algunos tienen API", "parcial", "media_alta", "Nivel 3",
     "La fórmula se transcribe al SCADA: riesgo de error de captura.", "Exportar la fórmula liberada a la lista de materiales y de ahí al SCADA."),
    ("PLC + SCADA de dosificación", "OP4", "Ethernet/IP o Profinet; base SQL local; OPC", "no", "alta", "Nivel 1–2",
     "Los PLC modernos soportan OPC UA, estándar abierto de integración.", "Node-RED por OPC UA guarda cada bache en PostgreSQL y cierra la orden en el ERP."),
    ("Controlador de ensacadora", "OP5", "Pantalla local; algunos modelos con Ethernet", "no", "baja_media", "Nivel 1",
     "Datos de sacos por lote se anotan a mano.", "Contador de sacos por red o captura móvil con QR del lote."),
    ("GPS de flotilla", "OP6", "Portal web; API del proveedor", "no", "media", "Nivel 4",
     "Puede alimentar evidencia de entrega.", "Integrar evidencia de entrega con la remisión."),
    ("ERP corporativo", "AP5", "Base de datos relacional; API", "na", "alta", "Nivel 4",
     "Es el destino natural de inventarios, costos y facturación.", "Odoo Community (esta base) si el corporativo no cubre la planta; API REST / XML-RPC."),
    ("Excel / bitácoras", "AP1", "Archivos sueltos o papel", "no", "baja", "—",
     "Islas de información sin control de versiones.", "Sustituir por Mantenimiento de Odoo y formularios móviles."),
]

HERRAMIENTAS = [
    ("Node-RED", "Middleware de integración", "Código abierto, gratuito", "Conectar PLC/SCADA (OPC UA), báscula, NIR y ERP.", "https://nodered.org"),
    ("PostgreSQL", "Base de datos de lotes y trazabilidad", "Código abierto, gratuito", "Historial de baches, fórmulas, análisis y lotes (es también la base de Odoo).", "https://www.postgresql.org"),
    ("Odoo Community", "ERP (si el corporativo no cubre la planta)", "Código abierto, gratuito", "Inventarios, compras, ventas, fabricación (MRP), mantenimiento y facturación.", "https://www.odoo.com"),
    ("Metabase o Grafana", "Tableros e indicadores", "Versiones abiertas gratuitas", "KPIs de producción, calidad y costos (costo/t, OEE, merma, inventario).", "https://www.metabase.com"),
    ("KoboToolbox o AppSheet / Power Apps", "Formularios móviles", "Gratuito o incluido en licencias existentes", "Captura de ensacado, servicio técnico y calidad.", "https://www.kobotoolbox.org"),
    ("MaintainX (plan gratuito) u openMAINT", "Mantenimiento (CMMS)", "Plan gratuito / código abierto", "Órdenes de trabajo y preventivos con QR por equipo (en esta base: app Mantenimiento de Odoo).", ""),
    ("Impresora térmica + gLabels o plantilla del ERP", "Etiquetado de lotes", "Gratuito", "Etiqueta con código de barras/QR por saco y lote.", ""),
    ("Lectores de código de barras, tabletas industriales, PC pequeña (gateway)", "Hardware complementario", "Inversión baja", "Captura en piso y enlace OPC UA.", ""),
]

ANEXO_A = [
    ("procesos", "Procesos de la compañía", "16 procesos: 4 estratégicos, 6 operativos (incluida la planeación de producción) y 5 de apoyo (sección II.2).", "CIM Nutrikowi › Mapa de procesos."),
    ("procesos", "Jerarquía de los procesos", "Estratégicos → operativos → apoyo; dentro de producción: dosificación → molienda → mezclado → peletizado → enfriado.", "Rutas de las listas de materiales (operaciones por centro de trabajo)."),
    ("procesos", "Grupos funcionales", "Compras/recepción, calidad, nutrición, producción, almacén, logística, mantenimiento, administración.", "Empleados › Departamentos."),
    ("procesos", "Secuencia de funciones", "Pedido → programa → compra → recepción y análisis → fórmula → lote → envasado → entrega → retroalimentación de granja.", "Operación de ejemplo: PO → recepción 3 pasos → MO → venta → entrega → factura."),
    ("informacion", "Tipo de información", "Comercial (pedidos), técnica (fórmulas, análisis), de proceso (pesos, temperaturas), administrativa (costos, facturas).", "Ventas, Listas de materiales, Análisis de laboratorio, Facturación."),
    ("informacion", "Relaciones", "El lote de PT relaciona MP, fórmula, proceso, cliente y costo.", "Inventario › Lotes › Trazabilidad."),
    ("informacion", "Flujo de información", "13 flujos principales (sección II.3); el ciclo se cierra con el desempeño en granja.", "CIM Nutrikowi › Flujos de información."),
    ("informacion", "Estructuración", "Hoy dispersa en papel, Excel y sistemas aislados; propuesta: base de datos de lotes + ERP en niveles ISA-95.", "Esta base de datos (nivel 4) + modelos CIM (nivel 3)."),
    ("recursos", "Recursos tecnológicos – capacidades", "PLC/SCADA, NIR, básculas y ERP con capacidad de integración (OPC UA, API).", "CIM Nutrikowi › Sistemas y compatibilidad."),
    ("recursos", "Recursos tecnológicos – infraestructura", "Red LAN/Wi-Fi de planta, servidor o enlace corporativo, respaldos; se requiere un gateway para Node-RED y respaldo fuera de sitio.", "Mantenimiento › Equipos (TI)."),
    ("recursos", "Recursos humanos – habilidades", "Operación de equipos de proceso, análisis de laboratorio, formulación de mínimo costo, uso de ERP.", "Empleados › Puestos."),
    ("recursos", "Recursos humanos – experiencias", "Más de 25 años fabricando alimento porcino (desde 2000) y conocimiento directo de las granjas del grupo.", "—"),
    ("recursos", "Recursos humanos – conocimientos", "Nutrición porcina, BPM/HACCP, normatividad SENASICA; por reforzar: análisis de datos e integración de sistemas.", "—"),
    ("organizacion", "Enfoque de producto o proceso", "Enfoque de proceso: planta con flujo por lotes y distribución por etapas de proceso, con familias de producto por etapa nutricional.", "Centros de trabajo y categorías de producto por etapa."),
    ("organizacion", "Estructura organizacional", "Funcional: gerencia de planta con jefaturas de producción, calidad, nutrición, mantenimiento, almacén y logística; servicios compartidos con el corporativo (TI, finanzas, RR. HH.).", "Empleados › Organigrama."),
    ("organizacion", "Enfoque de control", "Control centralizado por lote y fórmula; la propuesta CIM lo vuelve en tiempo real y basado en datos (tableros e indicadores).", "Lotes, órdenes de producción y reportes."),
]


def cargar_analisis(o):
    log("Mapa de procesos, flujos, sistemas, herramientas y Anexo A")
    for i, (cod, nombre, tipo, prop, resp, dep, ent, sal, datos, frec, llave, odoo) in enumerate(PROCESOS):
        o.ensure(f"proc_{cod}", "x_nk_proceso", {
            "x_name": nombre, "x_codigo": cod, "x_sequence": i + 1, "x_tipo": tipo, "x_proposito": prop,
            "x_responsable": resp, "x_departamento_id": o.ref(dep), "x_entradas": ent, "x_salidas": sal,
            "x_datos": datos, "x_frecuencia": frec, "x_llave": llave, "x_odoo": odoo})
    for n, de, a, info, integ in FLUJOS:
        nde = next(p[1] for p in PROCESOS if p[0] == de)
        na = next(p[1] for p in PROCESOS if p[0] == a)
        o.ensure(f"flujo_{n}", "x_nk_flujo", {"x_name": f"{n}. {nde} → {na}", "x_numero": n,
                                              "x_origen_id": o.ref(f"proc_{de}"), "x_destino_id": o.ref(f"proc_{a}"),
                                              "x_informacion": info, "x_integracion": integ})
    for i, (nombre, proc, fmt, con, comp, nivel, obs, prop) in enumerate(SISTEMAS):
        o.ensure(f"sis_{i + 1}", "x_nk_sistema", {"x_name": nombre, "x_proceso_id": o.ref(f"proc_{proc}"),
                                                  "x_formato": fmt, "x_conecta_erp": con, "x_compatibilidad": comp,
                                                  "x_nivel": nivel, "x_observacion": obs, "x_propuesta": prop})
    for i, (nombre, nec, lic, uso, url) in enumerate(HERRAMIENTAS):
        o.ensure(f"herr_{i + 1}", "x_nk_herramienta", {"x_name": nombre, "x_necesidad": nec, "x_licencia": lic,
                                                       "x_uso": uso, "x_url": url})
    for i, (asp, cont, sit, evid) in enumerate(ANEXO_A):
        o.ensure(f"cim_{i + 1}", "x_nk_cim", {"x_name": cont, "x_sequence": i + 1, "x_aspecto": asp,
                                              "x_situacion": sit, "x_evidencia": evid})


# ---------------------------------------------------------------------------
# 10. Operación de ejemplo con trazabilidad por lote
# ---------------------------------------------------------------------------
COMPRAS = [
    # xmlid, proveedor, [(producto, cantidad, uom 'kg'|'t'|'unit')], fecha
    ("po_granos", "prov_granos", [("mp_sorgo", 60, "t"), ("mp_maiz", 25, "t"), ("mp_trigo", 5, "t"), ("mp_salvado", 5, "t")]),
    ("po_oleaginosas", "prov_oleaginosas", [("mp_soya", 20000, "kg"), ("mp_aceite", 3000, "kg")]),
    ("po_minerales", "prov_minerales", [("mp_fosfato", 2000, "kg"), ("mp_carbonato", 2000, "kg"), ("mp_sal", 1000, "kg")]),
    ("po_premezclas", "prov_premezclas", [("mp_suero", 2000, "kg"), ("mp_pescado", 1000, "kg"), ("mp_premvit", 300, "kg"),
                                          ("mp_premmin", 300, "kg"), ("mp_lisina", 500, "kg"), ("mp_metionina", 150, "kg"),
                                          ("mp_treonina", 150, "kg"), ("mp_secuestrante", 200, "kg")]),
    ("po_empaques", "prov_empaques", [("emp_saco25", 1000, "unit"), ("emp_saco40", 2000, "unit"), ("emp_hilo", 20, "kg"),
                                      ("emp_etiqueta", 5000, "unit")]),
]

# Resultados de laboratorio por materia prima: humedad, proteína, grasa, fibra, aflatoxinas ppb
LAB_MP = {
    "mp_sorgo": (12.8, 9.4, 3.0, 2.4, 6), "mp_maiz": (13.1, 8.1, 3.8, 2.2, 8), "mp_trigo": (11.9, 12.6, 1.8, 2.6, 3),
    "mp_salvado": (11.5, 15.2, 4.0, 10.1, 4), "mp_soya": (11.8, 46.3, 1.5, 3.4, 0), "mp_pescado": (8.5, 65.4, 9.0, 0.8, 0),
    "mp_suero": (3.5, 12.0, 0.8, 0.0, 0),
}

PRODUCCION = [
    # xmlid, producto, cantidad (kg o sacos)
    ("mo_e1", "pt_e1", 10000), ("mo_e2", "pt_e2", 10000), ("mo_e3", "pt_e3", 10000),
    ("mo_l1", "pt_l1", 2000), ("mo_l2", "pt_l2", 3000), ("mo_i1", "pt_i1", 4000),
    ("mo_ges", "pt_ges", 5000), ("mo_lac", "pt_lac", 3000), ("mo_mc4", "pt_mc4", 1000),
    ("mo_l1_s25", "pt_l1_s25", 60), ("mo_l2_s40", "pt_l2_s40", 50), ("mo_i1_s40", "pt_i1_s40", 75),
    ("mo_ges_s40", "pt_ges_s40", 100), ("mo_lac_s40", "pt_lac_s40", 50), ("mo_mc4_s25", "pt_mc4_s25", 30),
]

VENTAS = [
    # xmlid, cliente, entrega, [(producto, cantidad, uom)]
    ("so_porcicowi", "cli_porcicowi", "cli_porcicowi_s1", [("pt_ges_s40", 80, "unit"), ("pt_lac_s40", 40, "unit"), ("pt_l1_s25", 50, "unit")]),
    ("so_genetikowi_s2", "cli_genetikowi", "cli_genetikowi_s2", [("pt_l2_s40", 40, "unit"), ("pt_i1_s40", 60, "unit")]),
    ("so_genetikowi_s3a", "cli_genetikowi", "cli_genetikowi_s3a", [("pt_e1", 8, "t"), ("pt_e2", 4, "t")]),
    ("so_genetikowi_s3b", "cli_genetikowi", "cli_genetikowi_s3b", [("pt_e2", 4, "t"), ("pt_e3", 6, "t")]),
    ("so_externo", "cli_externo", None, [("pt_mc4_s25", 20, "unit"), ("srv_asesoria", 1, "unit")]),
]


def uom(o, clave):
    return {"kg": o.ref("uom.product_uom_kgm"), "t": o.ref("uom.product_uom_ton"),
            "unit": o.ref("uom.product_uom_unit")}[clave]


def validar_picking(o, picking, lotes=None):
    """Marca como hecho un traslado. lotes: {product_id: nombre_de_lote} para recepciones."""
    o.call("stock.picking", "action_assign", [picking])
    moves = o.read("stock.move", o.search("stock.move", [("picking_id", "=", picking)]),
                   ["product_id", "product_uom_qty", "product_uom", "location_id", "location_dest_id",
                    "move_line_ids", "quantity"])
    for m in moves:
        pid = m["product_id"][0]
        if lotes and pid in lotes:
            o.call("stock.move.line", "unlink", m["move_line_ids"])
            o.create("stock.move.line", {"move_id": m["id"], "picking_id": picking, "product_id": pid,
                                         "product_uom_id": m["product_uom"][0], "quantity": m["product_uom_qty"],
                                         "location_id": m["location_id"][0],
                                         "location_dest_id": m["location_dest_id"][0], "lot_name": lotes[pid]})
        o.write("stock.move", m["id"], {"picked": True})
    res = o.call("stock.picking", "button_validate", [picking])
    if isinstance(res, dict) and res.get("res_model") == "stock.backorder.confirmation":
        ctx = res.get("context", {})
        wiz = o.create("stock.backorder.confirmation", {"pick_ids": [(6, 0, [picking])]}, context=ctx)
        o.call("stock.backorder.confirmation", "process_cancel_backorder", [wiz], context=ctx)
    state = o.read("stock.picking", [picking], ["state", "name"])[0]
    if state["state"] != "done":
        raise RuntimeError(f"No se pudo validar {state['name']}: {res}")
    return state["name"]


def siguiente_picking(o, origin_moves):
    """Traslados internos encadenados (recepción → laboratorio → almacén)."""
    dest = o.search("stock.move", [("move_orig_ids", "in", origin_moves)])
    pickings = sorted({m["picking_id"][0] for m in o.read("stock.move", dest, ["picking_id"]) if m["picking_id"]})
    return pickings, dest


def cargar_operacion(o):
    if o.ref("po_granos", required=False):
        log("Operación de ejemplo ya cargada (se omite)")
        return
    log("Compras confirmadas y recibidas en 3 pasos con lote y análisis de laboratorio")
    hoy = "261124"
    for n, (xid, prov, lineas) in enumerate(COMPRAS, 1):
        po = o.create("purchase.order", {"partner_id": o.ref(prov), "order_line": [
            (0, 0, {"product_id": o.ref(p), "product_qty": q, "product_uom": uom(o, u)}) for p, q, u in lineas]})
        o.create("ir.model.data", {"module": MOD, "name": xid, "model": "purchase.order", "res_id": po, "noupdate": True})
        o.call("purchase.order", "button_confirm", [po])
        picking = o.read("purchase.order", [po], ["picking_ids", "name"])[0]
        lotes = {}
        for p, q, u in lineas:
            cod = next((m[1] for m in MATERIAS_PRIMAS if m[0] == p), None) or next(e[1] for e in EMPAQUES if e[0] == p)
            lotes[o.ref(p)] = f"{cod}-{hoy}-{n:02d}"
        rec = picking["picking_ids"][0]
        moves = o.search("stock.move", [("picking_id", "=", rec)])
        validar_picking(o, rec, lotes)
        # Análisis de laboratorio de cada lote de MP (ubicación de cuarentena)
        for i, (p, q, u) in enumerate(lineas, 1):
            if not p.startswith("mp_"):
                continue
            pid = o.ref(p)
            lot = o.first("stock.lot", [("product_id", "=", pid), ("name", "=", lotes[pid])])
            hum, prot, gra, fib, afla = LAB_MP.get(p, (0, 0, 0, 0, 0))
            o.create("x_nk_analisis", {
                "x_name": f"LAB-MP-{hoy}-{n:02d}{i:02d}", "x_tipo": "mp", "x_fecha": "2026-11-24 15:00:00",
                "x_producto_id": pid, "x_lote_id": lot, "x_proveedor_id": o.ref(prov),
                "x_ticket_bascula": f"TB-{hoy}-{n:02d}{i:02d}" if u == "t" else False,
                "x_peso_neto_kg": q * 1000 if u == "t" else q,
                "x_humedad": hum, "x_proteina": prot, "x_grasa": gra, "x_fibra": fib, "x_aflatoxinas": afla,
                "x_equipo": "NIR + lector de micotoxinas" if p in LAB_MP else "Certificado de análisis del proveedor",
                "x_dictamen": "aceptado",
                "x_notas": "Dentro de especificación. Liberado a almacén."})
        for _ in range(2):  # recepción → laboratorio → almacén
            pickings, moves = siguiente_picking(o, moves)
            for pk in pickings:
                validar_picking(o, pk)
    o.create("x_nk_analisis", {
        "x_name": f"LAB-MP-{hoy}-RECH", "x_tipo": "mp", "x_fecha": "2026-11-24 16:30:00",
        "x_producto_id": o.ref("mp_maiz"), "x_proveedor_id": o.ref("prov_granos"),
        "x_ticket_bascula": f"TB-{hoy}-0999", "x_peso_neto_kg": 30500, "x_humedad": 15.9, "x_proteina": 7.6,
        "x_aflatoxinas": 38, "x_equipo": "NIR + lector de micotoxinas", "x_dictamen": "rechazado",
        "x_notas": "Camión rechazado: humedad > 14 % y aflatoxinas > 20 ppb. No se descarga ni se asigna lote."})
    # Solicitud de cotización en borrador (requisición pendiente)
    rfq = o.create("purchase.order", {"partner_id": o.ref("prov_granos"), "order_line": [
        (0, 0, {"product_id": o.ref("mp_sorgo"), "product_qty": 90, "product_uom": uom(o, "t")})]})
    o.create("ir.model.data", {"module": MOD, "name": "po_requisicion_sorgo", "model": "purchase.order", "res_id": rfq, "noupdate": True})

    log("Órdenes de producción terminadas (lote de PT por orden)")
    for n, (xid, prod, qty) in enumerate(PRODUCCION, 1):
        pid = o.ref(prod)
        info = o.read("product.product", [pid], ["default_code", "uom_id"])[0]
        mo = o.create("mrp.production", {"product_id": pid, "bom_id": o.ref(f"bom_{prod}"),
                                         "product_qty": qty, "product_uom_id": info["uom_id"][0]})
        o.create("ir.model.data", {"module": MOD, "name": xid, "model": "mrp.production", "res_id": mo, "noupdate": True})
        o.call("mrp.production", "action_confirm", [mo])
        lot = o.create("stock.lot", {"name": f"PT-{info['default_code'].replace('NK-', '')}-{hoy}-{n:02d}",
                                     "product_id": pid})
        o.write("mrp.production", mo, {"lot_producing_id": lot, "qty_producing": qty})
        o.call("mrp.production", "action_assign", [mo])
        raw = o.search("stock.move", [("raw_material_production_id", "=", mo)])
        for m in o.read("stock.move", raw, ["product_uom_qty", "quantity"]):
            if abs((m["quantity"] or 0) - m["product_uom_qty"]) > 1e-6:
                raise RuntimeError(f"Sin existencia suficiente para {xid}")
        o.write("stock.move", raw, {"picked": True})
        res = o.call("mrp.production", "button_mark_done", [mo])
        if isinstance(res, dict) and res.get("res_model"):
            raise RuntimeError(f"La orden {xid} pidió un asistente: {res.get('res_model')}")
        if prod in [g[0] for g in GRANEL]:
            o.create("x_nk_analisis", {
                "x_name": f"LAB-PT-{hoy}-{n:02d}", "x_tipo": "pt", "x_fecha": "2026-11-24 20:00:00",
                "x_producto_id": pid, "x_lote_id": lot, "x_peso_neto_kg": qty,
                "x_humedad": 11.8, "x_proteina": {"pt_l1": 20.5, "pt_l2": 20.1, "pt_i1": 19.0, "pt_e1": 17.3,
                                                  "pt_e2": 15.8, "pt_e3": 14.6, "pt_ges": 13.9, "pt_lac": 17.6,
                                                  "pt_mc4": 0.0}[prod],
                "x_durabilidad": 0 if prod == "pt_mc4" else 94.5, "x_aflatoxinas": 5,
                "x_equipo": "NIR + prueba de durabilidad (PDI)", "x_dictamen": "aceptado",
                "x_notas": "Lote liberado por aseguramiento de calidad."})
    mo = o.create("mrp.production", {"product_id": o.ref("pt_e3"), "bom_id": o.ref("bom_pt_e3"), "product_qty": 20000,
                                     "product_uom_id": o.ref("uom.product_uom_kgm"),
                                     "date_start": "2026-11-25 14:00:00"})
    o.call("mrp.production", "action_confirm", [mo])
    o.create("ir.model.data", {"module": MOD, "name": "mo_programada_e3", "model": "mrp.production", "res_id": mo, "noupdate": True})

    log("Ventas a granjas: confirmadas, entregadas (FEFO por lote) y facturadas")
    for xid, cli, entrega, lineas in VENTAS:
        vals = {"partner_id": o.ref(cli), "order_line": [
            (0, 0, {"product_id": o.ref(p), "product_uom_qty": q, "product_uom": uom(o, u)}) for p, q, u in lineas]}
        if entrega:
            vals["partner_shipping_id"] = o.ref(entrega)
        so = o.create("sale.order", vals)
        o.create("ir.model.data", {"module": MOD, "name": xid, "model": "sale.order", "res_id": so, "noupdate": True})
        o.call("sale.order", "action_confirm", [so])
        for pk in o.read("sale.order", [so], ["picking_ids"])[0]["picking_ids"]:
            validar_picking(o, pk)
        wiz = o.create("sale.advance.payment.inv", {"advance_payment_method": "delivered",
                                                    "sale_order_ids": [(6, 0, [so])]},
                       context={"active_model": "sale.order", "active_ids": [so], "active_id": so})
        o.action("sale.advance.payment.inv", "create_invoices", [wiz],
               context={"active_model": "sale.order", "active_ids": [so], "active_id": so})
        inv = o.read("sale.order", [so], ["invoice_ids"])[0]["invoice_ids"]
        o.call("account.move", "action_post", inv)
    so = o.create("sale.order", {"partner_id": o.ref("cli_genetikowi"), "partner_shipping_id": o.ref("cli_genetikowi_s3a"),
                                 "commitment_date": "2026-11-27 14:00:00",
                                 "order_line": [(0, 0, {"product_id": o.ref("pt_e3"), "product_uom_qty": 20,
                                                        "product_uom": uom(o, "t")})]})
    o.call("sale.order", "action_confirm", [so])
    o.create("ir.model.data", {"module": MOD, "name": "so_pendiente_e3", "model": "sale.order", "res_id": so, "noupdate": True})

    log("Desempeño en granja (retroalimentación a formulación, flujo 13)")
    registros = [
        ("cli_genetikowi_s3a", "pt_e1", 1200, 8000, 820, 2.32, 0.6, "Sin ajuste."),
        ("cli_genetikowi_s3a", "pt_e2", 1180, 4000, 905, 2.61, 0.4, "Sin ajuste."),
        ("cli_genetikowi_s3b", "pt_e2", 1150, 4000, 870, 2.74, 0.9, "Conversión 5 % arriba de la meta: revisar humedad del sorgo del lote y durabilidad del pellet."),
        ("cli_genetikowi_s3b", "pt_e3", 1140, 6000, 960, 2.95, 0.5, "Sin ajuste."),
        ("cli_genetikowi_s2", "pt_l2_s40", 2400, 1600, 410, 1.45, 1.8, "Mortalidad en meta (< 2 %)."),
        ("cli_genetikowi_s2", "pt_i1_s40", 2350, 2400, 560, 1.62, 1.1, "Sin ajuste."),
    ]
    for i, (granja, prod, cerdos, kg, gdp, ca, mort, ajuste) in enumerate(registros, 1):
        pid = o.ref(prod)
        lot = o.first("stock.lot", [("product_id", "=", pid)])
        o.create("x_nk_desempeno", {"x_name": f"DG-2026-48-{i:02d}", "x_semana": "2026-11-23", "x_granja_id": o.ref(granja),
                                    "x_producto_id": pid, "x_lote_id": lot, "x_cerdos": cerdos, "x_consumo_kg": kg,
                                    "x_gdp": gdp, "x_conversion": ca, "x_mortalidad": mort, "x_ajuste": ajuste})


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default="http://localhost:8069")
    ap.add_argument("--db", default="nutrikowi")
    ap.add_argument("--user", default="admin")
    ap.add_argument("--password", default="admin")
    ap.add_argument("--sin-operacion", action="store_true", help="No cargar compras, producción y ventas de ejemplo")
    a = ap.parse_args()
    o = Odoo(a.url, a.db, a.user, a.password)
    log(f"Conectado a Odoo {o.version} · base «{a.db}»")
    if o.version < 17:
        sys.exit("Se requiere Odoo 17 o posterior.")
    configurar_empresa(o)
    instalar_apps(o)
    o = Odoo(a.url, a.db, a.user, a.password)  # recargar tras instalar
    activar_opciones(o)
    cargar_organizacion(o)
    cargar_contactos(o)
    wh = cargar_almacen(o)
    cargar_productos(o)
    cargar_reglas_almacenaje(o, wh)
    cargar_fabricacion(o)
    cargar_modelos_cim(o)
    cargar_analisis(o)
    cargar_tecnologia(o)
    if not a.sin_operacion:
        cargar_operacion(o)
    log("Listo. Abre Odoo y entra a «CIM Nutrikowi», Fabricación, Inventario y Mantenimiento.")


if __name__ == "__main__":
    main()
