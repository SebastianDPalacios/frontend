import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid,
  MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import reportsService from "services/reports/reports-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const actionLabels = {
  "system.post": "Creó información", "system.put": "Actualizó información",
  "system.patch": "Cambió información", "system.delete": "Eliminó información", "system.export": "Exportó información",
  auth_login_success: "Inició sesión", auth_login_fail: "Intentó iniciar sesión", auth_logout: "Cerró sesión",
  "order.create": "Creó un pedido", "order.confirm": "Confirmó un pedido", "order.cancel": "Canceló un pedido",
  "order.dispatch": "Despachó un pedido", "order.deliver": "Entregó un pedido",
  "order.create.atomic": "Creó un pedido",
  "order.item.upsert": "Actualizó un producto del pedido",
  "customer.create": "Creó un cliente", "customer.update": "Actualizó un cliente",
  "production_plan.create": "Creó un plan de producción", "production_plan.update": "Actualizó un plan de producción",
  "production_plan.product.start": "Inició un producto", "production_plan.product.finish": "Finalizó un producto",
  "production_plan.product.progress": "Guardó avance de producción", "production_plan.product.correction": "Corrigió una producción",
};

const normalizedActionLabels = {
  "order.create.atomic": "Creó un pedido",
  "order.item.upsert": "Actualizó un producto del pedido",
  "auth.login.success": "Inicio de sesión exitoso",
  "auth.login.fail": "Inicio de sesión fallido",
  "auth.logout": "Cierre de sesión",
  "auth.logout.all": "Cierre de todas las sesiones",
  "user.create": "Creó un usuario",
  "user.update": "Actualizó un usuario",
  "user.status": "Cambió el estado de un usuario",
  "user.roles": "Cambió los roles de un usuario",
  "user.force.password.reset": "Solicitó cambio de contraseña",
  "role.create": "Creó un rol",
  "role.update": "Actualizó un rol",
  "role.permissions": "Cambió permisos de un rol",
  "production.plan.create": "Creó un plan de producción",
  "production.plan.update": "Actualizó un plan de producción",
  "production.plan.product.start": "Inició la elaboración de un producto",
  "production.plan.product.progress": "Guardó un avance de producción",
  "production.plan.product.finish": "Finalizó la elaboración de un producto",
  "production.plan.product.skip": "Marcó un producto como no elaborado",
  "production.plan.product.correction": "Corrigió una producción terminada",
  "recipe.create": "Creó una receta",
  "recipe.update": "Actualizó una receta",
  "recipe.delete": "Eliminó una receta",
  "recipe.publish": "Publicó una receta",
  "inventory.movement.apply": "Registró un movimiento de inventario",
  "inventory.purchase.order.create": "Creó una orden de compra",
  "inventory.purchase.order.receive": "Recibió una orden de compra",
};

const actionWordLabels = {
  auth: "seguridad", login: "inicio de sesión", logout: "cierre de sesión", success: "exitoso", fail: "fallido",
  create: "creación", update: "actualización", delete: "eliminación", status: "cambio de estado",
  confirm: "confirmación", cancel: "cancelación", dispatch: "despacho", deliver: "entrega",
  start: "inicio", finish: "finalización", progress: "avance", correction: "corrección", skip: "no elaborado",
  order: "pedido", orders: "pedidos", item: "producto", product: "producto", production: "producción",
  plan: "plan", recipe: "receta", inventory: "inventario", movement: "movimiento", purchase: "compra",
  customer: "cliente", user: "usuario", role: "rol", permissions: "permisos", settings: "configuración",
  post: "creó información", put: "actualizó información", patch: "cambió información", export: "exportó información",
};

const entityLabels = {
  auth: "Seguridad", "admin-auth": "Usuarios", users: "Usuarios", rbac: "Roles y permisos",
  catalog: "Catálogo", commercial: "Clientes", orders: "Pedidos", production: "Producción",
  inventory: "Inventario", recipes: "Recetas", settings: "Configuración", reports: "Reportes",
  user_sessions: "Sesiones", production_plans: "Planes de producción", production_plan_outputs: "Productos planificados",
  orders: "Pedidos", order_items: "Productos del pedido", customers: "Clientes", products: "Productos",
  raw_materials: "Materias primas", inventory_movements: "Movimientos de inventario",
  production_orders: "Órdenes de producción", production_order_items: "Productos de producción",
  delivery_routes: "Rutas de entrega", roles: "Roles", permissions: "Permisos", employees: "Empleados",
};

const metadataLabels = {
  method: "Operación", route: "Ruta interna", parameters: "Referencia", changes: "Datos enviados",
  result_message: "Resultado", before: "Antes", after: "Después", reason: "Motivo",
  product_id: "Producto", order_id: "Pedido", customer_id: "Cliente", quantity: "Cantidad",
  produced_quantity: "Cantidad producida", actual_arrobas: "Arrobas utilizadas", status: "Estado",
  planned_date: "Fecha planificada", baker_employee_id: "Panadero", recipes: "Cantidad de recetas",
  products: "Cantidad de productos", arrobas: "Arrobas", old_status: "Estado anterior",
  new_status: "Estado nuevo", ip_address: "Dirección IP", actor_user_id: "Usuario responsable",
  bonus_total: "Vendaje total", grand_total: "Total a cobrar", items_count: "Cantidad de productos",
  sale_total: "Venta total", gift_total: "Obsequios", exchange_total: "Cambios",
  requested_amount: "Valor solicitado", charged_amount: "Valor cobrado", total_amount: "Valor total",
  unit_price: "Precio por unidad", base_price: "Precio base", commission_amount: "Comisión",
  employee_id: "Empleado", seller_id: "Vendedor", session_id: "Sesión", production_plan_id: "Plan de producción",
  production_plan_output_id: "Producto planificado", recipe_id: "Receta", branch_id: "Sucursal",
  notes: "Observaciones", item_count: "Cantidad de productos", bonus_percent: "Porcentaje de vendaje",
  customer: "Cliente", product: "Producto", order: "Pedido", employee: "Empleado", seller: "Vendedor",
  detail: "Detalle adicional", atomic: "Operación completa",
};

const moneyKeys = new Set([
  "bonus_total", "grand_total", "sale_total", "gift_total", "exchange_total", "requested_amount",
  "charged_amount", "total_amount", "unit_price", "base_price", "commission_amount", "amount", "value",
]);
const idKeys = new Set([
  "customer_id", "product_id", "order_id", "employee_id", "seller_id", "session_id", "production_plan_id",
  "production_plan_output_id", "recipe_id", "branch_id", "actor_user_id", "customer", "product", "order",
  "employee", "seller",
]);
const countKeys = new Set(["items_count", "item_count", "products", "recipes"]);
const currencyFormatter = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const formatDateTime = (value) => value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
const normalizeCode = (value) => String(value || "").toLowerCase().replace(/[._-]+/g, ".");
const humanize = (value) => String(value || "-").replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatAction = (value) => {
  const normalized = normalizeCode(value);
  if (actionLabels[value]) return actionLabels[value];
  if (normalizedActionLabels[normalized]) return normalizedActionLabels[normalized];
  const translated = normalized.split(".").filter(Boolean).map((word) => actionWordLabels[word] || word).join(" ");
  return translated ? translated.charAt(0).toUpperCase() + translated.slice(1) : "Acción no especificada";
};
const formatEntity = (value) => {
  if (entityLabels[value]) return entityLabels[value];
  const translated = normalizeCode(value).split(".").filter(Boolean).map((word) => actionWordLabels[word] || word).join(" ");
  return translated ? translated.charAt(0).toUpperCase() + translated.slice(1) : "Módulo general";
};
const formatMetadataLabel = (key) => metadataLabels[key]
  || normalizeCode(key).split(".").filter(Boolean).map((word) => actionWordLabels[word] || word).join(" ").replace(/^./, (letter) => letter.toUpperCase());
const parseMetadata = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch (error) { return { detail: value }; }
};
const formatScalarValue = (key, value) => {
  if (value === null || value === undefined || value === "") return "Sin dato";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  const numeric = Number(value);
  if (moneyKeys.has(key) && Number.isFinite(numeric)) return currencyFormatter.format(numeric);
  if (idKeys.has(key)) return `#${value}`;
  if (countKeys.has(key) && Number.isFinite(numeric)) return `${numberFormatter.format(numeric)} registro(s)`;
  if (key.includes("percent") && Number.isFinite(numeric)) return `${numberFormatter.format(numeric)} %`;
  return String(value);
};
const isTechnicalMetadata = (key) => ["method", "route", "parameters"].includes(key);
const formatValue = (key, value, depth = 0) => {
  if (!value || typeof value !== "object") return formatScalarValue(key, value);
  if (depth > 2) return "Información adicional registrada";
  const entries = Array.isArray(value) ? value.map((item, index) => [`Elemento ${index + 1}`, item]) : Object.entries(value);
  if (!entries.length) return "Sin información";
  return entries.map(([childKey, childValue]) => {
    const label = Array.isArray(value) ? childKey : formatMetadataLabel(childKey);
    return `${label}: ${formatValue(childKey, childValue, depth + 1)}`;
  }).join("\n");
};

const AuditPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [options, setOptions] = useState({ entities: [], actions: [], actors: [] });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: "", entityName: "", action: "", actorUserId: "", dateFrom: "", dateTo: "" });

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await reportsService.getAuditLogs({ ...filters, page, pageSize: 25 });
        if (response?.code !== 1) throw new Error(response?.message || "No se pudo cargar la auditoría");
        setItems(normalizeRows(response.data?.items));
        setOptions(response.data?.filters || { entities: [], actions: [], actors: [] });
        setTotal(Number(response.data?.total || 0));
        setTotalPages(Number(response.data?.totalPages || 1));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar la auditoría"));
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, page]);

  const changeFilter = (field, value) => { setPage(1); setFilters((current) => ({ ...current, [field]: value })); };
  const metadata = parseMetadata(selected?.metadata_json);
  const metadataEntries = Object.entries(metadata);
  const primaryMetadata = metadataEntries.filter(([key]) => !isTechnicalMetadata(key));
  const technicalMetadata = metadataEntries.filter(([key]) => isTechnicalMetadata(key));

  return (
    <FlowPageLayout title="Auditoría" subtitle="Aquí puedes saber quién hizo cada cambio, cuándo lo hizo y qué información fue afectada.">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography color="text.secondary">Cambios encontrados</Typography><Typography variant="h4" sx={{ fontWeight: 900 }}>{total}</Typography></Paper></Grid>
        <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography color="text.secondary">Página actual</Typography><Typography variant="h4" sx={{ fontWeight: 900 }}>{page} de {totalPages}</Typography></Paper></Grid>
        <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography color="text.secondary">Registros visibles</Typography><Typography variant="h4" sx={{ fontWeight: 900 }}>{items.length}</Typography></Paper></Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 3 }}>
        <Typography sx={{ mb: 2, fontWeight: 900 }}>Buscar cambios</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField fullWidth label="Buscar usuario, acción o referencia" value={filters.search} onChange={(e) => changeFilter("search", e.target.value)} /></Grid>
          <Grid item xs={12} sm={6} md={2}><TextField select fullWidth label="Módulo" value={filters.entityName} onChange={(e) => changeFilter("entityName", e.target.value)}><MenuItem value="">Todos</MenuItem>{normalizeRows(options.entities).map((item) => <MenuItem key={item.value} value={item.value}>{formatEntity(item.value)}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6} md={2}><TextField select fullWidth label="Acción" value={filters.action} onChange={(e) => changeFilter("action", e.target.value)}><MenuItem value="">Todas</MenuItem>{normalizeRows(options.actions).map((item) => <MenuItem key={item.value} value={item.value}>{formatAction(item.value)}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6} md={2}><TextField select fullWidth label="Usuario" value={filters.actorUserId} onChange={(e) => changeFilter("actorUserId", e.target.value)}><MenuItem value="">Todos</MenuItem>{normalizeRows(options.actors).map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} md={1}><TextField fullWidth type="date" label="Desde" InputLabelProps={{ shrink: true }} value={filters.dateFrom} onChange={(e) => changeFilter("dateFrom", e.target.value)} /></Grid>
          <Grid item xs={6} md={1}><TextField fullWidth type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.dateTo} onChange={(e) => changeFilter("dateTo", e.target.value)} /></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ overflowX: "auto" }}><Table sx={{ minWidth: 850 }}>
          <TableHead><TableRow><TableCell sx={{ fontWeight: 900 }}>Cuándo</TableCell><TableCell sx={{ fontWeight: 900 }}>Quién</TableCell><TableCell sx={{ fontWeight: 900 }}>Qué hizo</TableCell><TableCell sx={{ fontWeight: 900 }}>Dónde</TableCell><TableCell sx={{ fontWeight: 900 }}>Registro</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {items.map((item) => <TableRow key={item.id} hover>
              <TableCell>{formatDateTime(item.created_at)}</TableCell>
              <TableCell><Typography sx={{ fontWeight: 800 }}>{item.actor_name || "Sistema"}</Typography><Typography variant="caption" color="text.secondary">{item.username || "Proceso automático"}</Typography></TableCell>
              <TableCell><Typography sx={{ fontWeight: 700 }}>{formatAction(item.action)}</Typography></TableCell>
              <TableCell><Chip label={formatEntity(item.entity_name)} size="small" variant="outlined" /></TableCell>
              <TableCell>{item.entity_id ? `#${item.entity_id}` : "General"}</TableCell>
              <TableCell align="right"><Button color="secondary" onClick={() => setSelected(item)}>Ver detalle</Button></TableCell>
            </TableRow>)}
            {!loading && !items.length ? <TableRow><TableCell colSpan={6}><Alert severity="info">No encontramos cambios con estos filtros.</Alert></TableCell></TableRow> : null}
          </TableBody>
        </Table></Box>
        <Stack direction="row" spacing={2} sx={{ p: 2, justifyContent: "center", alignItems: "center" }}>
          <Button color="secondary" variant="outlined" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
          <Typography sx={{ fontWeight: 800 }}>Página {page} de {totalPages}</Typography>
          <Button color="secondary" variant="outlined" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Siguiente</Button>
        </Stack>
      </Paper>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Detalle del cambio</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info"><strong>{selected?.actor_name || "Sistema"}</strong> {formatAction(selected?.action).toLowerCase()} en <strong>{formatEntity(selected?.entity_name)}</strong>{selected?.entity_id ? `, registro #${selected.entity_id}` : ""}.</Alert>
            <Grid container spacing={2}><Grid item xs={12} sm={6}><Typography color="text.secondary">Fecha y hora</Typography><Typography sx={{ fontWeight: 800 }}>{formatDateTime(selected?.created_at)}</Typography></Grid><Grid item xs={12} sm={6}><Typography color="text.secondary">Dirección IP</Typography><Typography sx={{ fontWeight: 800 }}>{selected?.ip_address || "No disponible"}</Typography></Grid></Grid>
            {primaryMetadata.length ? <Box>
              <Typography sx={{ mb: 1.5, fontWeight: 900 }}>Información registrada</Typography>
              <Grid container spacing={1.5}>
                {primaryMetadata.map(([key, value]) => <Grid item xs={12} sm={6} key={key}>
                  <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: "100%" }}>
                    <Typography variant="body2" color="text.secondary">{formatMetadataLabel(key)}</Typography>
                    <Typography component="pre" sx={{ m: 0, mt: 0.5, fontFamily: "inherit", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontWeight: 800 }}>{formatValue(key, value)}</Typography>
                  </Paper>
                </Grid>)}
              </Grid>
            </Box> : null}
            {technicalMetadata.length ? <Box sx={{ pt: 0.5 }}>
              <Typography sx={{ mb: 1, fontWeight: 800 }}>Información técnica</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "grey.50" }}>
                {technicalMetadata.map(([key, value]) => <Typography key={key} variant="body2" sx={{ overflowWrap: "anywhere" }}>
                  <strong>{formatMetadataLabel(key)}:</strong> {formatValue(key, value)}
                </Typography>)}
              </Paper>
            </Box> : null}
            {!Object.keys(metadata).length ? <Typography color="text.secondary">Este evento no contiene información adicional.</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions><Button color="secondary" onClick={() => setSelected(null)}>Cerrar</Button></DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default AuditPage;
