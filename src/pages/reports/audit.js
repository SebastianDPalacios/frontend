import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import reportsService from "services/reports/reports-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const actionLabels = {
  "order.create": "Pedido creado",
  "order.item_upsert": "Item de pedido actualizado",
  "order.confirm": "Pedido confirmado",
  "order.cancel": "Pedido cancelado",
  "order.dispatch": "Pedido despachado",
  "order.create_production": "Produccion creada desde pedido",
  order_create: "Pedido creado",
  order_item_upsert: "Item de pedido actualizado",
  order_confirm: "Pedido confirmado",
  order_cancel: "Pedido cancelado",
  order_dispatch: "Pedido despachado",
  order_create_production: "Produccion creada desde pedido",
  "production.order_create": "Orden de produccion creada",
  "production.order_close": "Orden de produccion cerrada",
  "production.order_cancel": "Orden de produccion cancelada",
  "production.item_result": "Resultado de produccion",
  production_order_create: "Orden de produccion creada",
  production_order_close: "Orden de produccion cerrada",
  production_order_cancel: "Orden de produccion cancelada",
  production_item_result: "Resultado de produccion",
  production_order_adjust_item: "Plan de produccion ajustado",
  production_order_cancel_item: "Producto retirado de produccion",
  "inventory.product_movement": "Movimiento de producto",
  "inventory.raw_material_movement": "Movimiento de materia prima",
  inventory_movement_apply: "Movimiento de inventario",
  inventory_purchase_order_create: "Orden de compra creada",
  inventory_purchase_order_receive: "Orden de compra recibida",
  "customer.create": "Cliente creado",
  "customer.update": "Cliente actualizado",
  "customer.status": "Estado de cliente",
  customer_create: "Cliente creado",
  customer_update: "Cliente actualizado",
  customer_status: "Estado de cliente",
  "route.create": "Ruta creada",
  "route.update": "Ruta actualizada",
  "route.assign_driver": "Repartidor asignado",
  route_create: "Ruta creada",
  route_update: "Ruta actualizada",
  route_assign_driver: "Repartidor asignado",
  "user.create": "Usuario creado",
  "user.status": "Estado de usuario",
  "user.roles": "Roles de usuario",
  user_create: "Usuario creado",
  user_status: "Estado de usuario",
  user_roles: "Roles de usuario",
  user_force_password_reset: "Cambio de clave solicitado",
  "role.create": "Rol creado",
  "role.update": "Rol actualizado",
  "role.permissions": "Permisos de rol",
  role_create: "Rol creado",
  role_update: "Rol actualizado",
  role_permissions: "Permisos de rol",
  auth_login_success: "Inicio de sesion correcto",
  auth_login_fail: "Inicio de sesion fallido",
  auth_logout: "Cierre de sesion",
  auth_logout_all: "Sesiones cerradas",
};

const entityLabels = {
  orders: "Pedidos",
  order_items: "Items de pedido",
  production_orders: "Produccion",
  production_order_items: "Items de produccion",
  inventory_movements: "Inventario",
  customers: "Clientes",
  delivery_routes: "Rutas",
  users: "Usuarios",
  roles: "Roles",
  permissions: "Permisos",
  products: "Productos",
  raw_materials: "Materias primas",
};

const metadataLabels = {
  branch_id: "Sucursal",
  customer_id: "Cliente",
  delivery_route_id: "Ruta",
  driver_id: "Repartidor",
  from_route_id: "Ruta anterior",
  item_id: "Item",
  item_type: "Tipo de item",
  movement_type: "Tipo de movimiento",
  order_id: "Pedido",
  permission_id: "Permiso",
  product_id: "Producto",
  production_order_id: "Orden de produccion",
  qty: "Cantidad",
  quantity: "Cantidad",
  raw_material_id: "Materia prima",
  recipe_id: "Receta",
  role_id: "Rol",
  status: "Estado",
  to_route_id: "Nueva ruta",
  user_id: "Usuario",
};

const valueLabels = {
  item_type: {
    product: "Producto",
    raw_material: "Materia prima",
  },
  movement_type: {
    in: "Entrada",
    out: "Salida",
    entry: "Entrada",
    exit: "Salida",
    adjustment_in: "Entrada por ajuste",
    adjustment_out: "Salida por ajuste",
    purchase_receive: "Recepcion de compra",
    production_in: "Entrada por produccion",
    production_out: "Salida por receta",
  },
  status: {
    active: "Activo",
    inactive: "Inactivo",
    draft: "Borrador",
    confirmed: "Confirmado",
    production: "Produccion",
    dispatched: "Despachado",
    cancelled: "Cancelado",
    planned: "Planificada",
    in_progress: "En proceso",
    completed: "Completada",
  },
};

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatAction = (action) => {
  if (actionLabels[action]) {
    return actionLabels[action];
  }

  return String(action || "-")
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};
const formatEntity = (entity) => entityLabels[entity] || entity || "-";

const parseMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }

  let parsed = metadata;
  if (typeof metadata === "string") {
    try {
      parsed = JSON.parse(metadata);
    } catch (error) {
      return metadata.length > 80 ? `${metadata.slice(0, 80)}...` : metadata;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return parsed;

  return Object.entries(parsed)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
};

const formatMetadataValue = (key, value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const mappedValue = valueLabels[key]?.[String(value)];
  if (mappedValue) {
    return mappedValue;
  }

  if (["qty", "quantity", "unit_cost", "total_cost", "planned_qty", "produced_qty"].includes(key)) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numberFormatter.format(numericValue) : String(value);
  }

  if (key.endsWith("_id") || key === "id") {
    return `#${value}`;
  }

  return String(value);
};

const getMetadataSummary = (item) => {
  const parsed = parseMetadata(item?.metadata_json);

  if (!parsed) {
    return null;
  }

  if (typeof parsed === "string") {
    return parsed;
  }

  const priorityKeys = [
    "movement_type",
    "item_type",
    "qty",
    "quantity",
    "product_id",
    "raw_material_id",
    "item_id",
    "branch_id",
    "order_id",
    "production_order_id",
    "customer_id",
    "delivery_route_id",
    "driver_id",
    "status",
  ];
  const orderedKeys = [
    ...priorityKeys.filter((key) => Object.prototype.hasOwnProperty.call(parsed, key)),
    ...Object.keys(parsed).filter((key) => !priorityKeys.includes(key)),
  ];

  return orderedKeys
    .slice(0, 5)
    .map((key) => {
      const label = metadataLabels[key] || formatAction(key);
      return `${label}: ${formatMetadataValue(key, parsed[key])}`;
    })
    .join(" · ");
};

const AuditPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [entityName, setEntityName] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await reportsService.getAuditLogs({
          page: 1,
          pageSize: 80,
          search: search.trim() || undefined,
          entityName: entityName || undefined,
        });

        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar auditoria");
          return;
        }

        setItems(normalizeRows(response.data?.items));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar auditoria"));
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 250);
    return () => clearTimeout(timer);
  }, [search, entityName]);

  const entityOptions = useMemo(() => {
    const unique = new Set(items.map((item) => item.entity_name).filter(Boolean));
    return Array.from(unique).sort();
  }, [items]);

  const criticalEvents = items.filter((item) =>
    ["cancel", "dispatch", "status", "roles", "permissions", "logout", "reset"].some((keyword) =>
      String(item.action || "").includes(keyword)
    )
  ).length;

  return (
    <FlowPageLayout title="Auditoria" subtitle="Consulta de acciones criticas y trazabilidad administrativa">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando eventos de auditoria...</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Eventos recientes
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {items.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Eventos sensibles
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {criticalEvents}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Modulos con actividad
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {entityOptions.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Buscar actor, accion o entidad"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Entidad"
            value={entityName}
            onChange={(event) => setEntityName(event.target.value)}
            sx={{ minWidth: { md: 260 } }}
          >
            <MenuItem value="">Todas</MenuItem>
            {entityOptions.map((entity) => (
              <MenuItem key={entity} value={entity}>
                {formatEntity(entity)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Actor</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Accion</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Entidad</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Referencia</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Detalle</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const metadata = getMetadataSummary(item);

                return (
                  <TableRow key={item.id} hover>
                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography sx={{ fontWeight: 800 }}>{item.actor_name || "Sistema"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.username || "sin usuario"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={formatAction(item.action)} size="small" color="info" variant="outlined" />
                    </TableCell>
                    <TableCell>{formatEntity(item.entity_name)}</TableCell>
                    <TableCell>{item.entity_id || "-"}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {metadata || item.ip_address || "Sin detalle adicional"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Alert severity="info">No hay eventos para los filtros actuales.</Alert>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </FlowPageLayout>
  );
};

export default AuditPage;
