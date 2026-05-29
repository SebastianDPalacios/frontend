import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getTotal, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currencyFormatter.format(Number(value || 0));

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 10);
};

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const statusLabels = {
  draft: "Borrador",
  confirmed: "Confirmado",
  in_production: "Produccion",
  ready: "Listo",
  dispatched: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusColors = {
  draft: "default",
  confirmed: "info",
  in_production: "info",
  ready: "warning",
  dispatched: "success",
  delivered: "success",
  cancelled: "error",
};

const MetricCard = ({ label, value, helper, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, color: `${color}.main` }}>
        {value}
      </Typography>
      {helper ? (
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      ) : null}
    </Stack>
  </Paper>
);

const ActionCard = ({ title, description, href, primary = false }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Button component={Link} href={href} variant={primary ? "contained" : "outlined"} color="secondary" sx={{ alignSelf: "flex-start" }}>
        Abrir
      </Button>
    </Stack>
  </Paper>
);

const StatusChip = ({ status }) => (
  <Chip
    size="small"
    label={statusLabels[status] || status || "-"}
    color={statusColors[status] || "default"}
    variant={status === "draft" ? "outlined" : "filled"}
    sx={{ minWidth: 104 }}
  />
);

const isReadyToDispatch = (order) =>
  order?.status === "ready" ||
  (order?.status === "in_production" &&
    order?.production_order_id &&
    order?.production_status === "completed" &&
    Number(order?.production_pending_items || 0) === 0);

const getTraceSteps = (order) => {
  if (order?.status === "cancelled") {
    return [
      { label: "Pedido", helper: "Creado", state: "done" },
      { label: "Cancelado", helper: "Flujo detenido", state: "error" },
    ];
  }

  const isConfirmed = ["confirmed", "in_production", "ready", "dispatched", "delivered"].includes(order?.status);
  const hasProduction = Boolean(order?.production_order_id);
  const productionDone =
    hasProduction &&
    order?.production_status === "completed" &&
    Number(order?.production_pending_items || 0) === 0;
  const isReady = order?.status === "ready" || ["dispatched", "delivered"].includes(order?.status) || isReadyToDispatch(order);
  const isDispatched = ["dispatched", "delivered"].includes(order?.status);

  return [
    { label: "Pedido", helper: "Creado", state: "done" },
    { label: "Confirmado", helper: isConfirmed ? "Validado" : "Pendiente", state: isConfirmed ? "done" : order?.status === "draft" ? "active" : "pending" },
    { label: "Produccion", helper: hasProduction ? `Orden #${order.production_order_id}` : "Sin orden", state: productionDone ? "done" : hasProduction ? "active" : "pending" },
    { label: "Listo", helper: isReady ? "Para despacho" : "Pendiente", state: isReady ? "done" : "pending" },
    { label: "Despachado", helper: isDispatched ? "Inventario afectado" : "Pendiente", state: isDispatched ? "done" : "pending" },
  ];
};

const traceStyles = {
  done: { border: "success.main", dot: "success.main", color: "common.white", line: "success.main" },
  active: { border: "secondary.main", dot: "secondary.main", color: "common.white", line: "divider" },
  pending: { border: "divider", dot: "action.hover", color: "text.secondary", line: "divider" },
  error: { border: "error.main", dot: "error.main", color: "common.white", line: "divider" },
};

const OrderTrace = ({ order }) => {
  const steps = getTraceSteps(order);

  return (
    <Box sx={{ overflowX: "auto", pb: 0.25 }}>
      <Stack direction="row" spacing={0.75} sx={{ minWidth: steps.length > 2 ? 420 : 180, alignItems: "center" }}>
        {steps.map((step, index) => {
          const styles = traceStyles[step.state] || traceStyles.pending;

          return (
            <Stack key={`${order.id}-${step.label}`} direction="row" spacing={0.75} sx={{ flex: 1, minWidth: 70, alignItems: "center" }}>
              <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0, alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      bgcolor: styles.dot,
                      color: styles.color,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>
                    {step.label}
                  </Typography>
                </Stack>
              {index < steps.length - 1 ? <Box sx={{ width: 14, height: 2, bgcolor: styles.line, flexShrink: 0 }} /> : null}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
};

const OrdersDayPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    customers: 0,
    routes: 0,
    products: 0,
  });
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const [baseResponse, ordersResponse] = await Promise.all([
          ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 50 }),
          ordersService.getOrders({ page: 1, pageSize: 80 }),
        ]);

        if (baseResponse?.code !== 1) {
          setError(baseResponse?.message || "No se pudo cargar base de pedidos");
          return;
        }

        if (ordersResponse?.code !== 1) {
          setError(ordersResponse?.message || "No se pudieron cargar pedidos recientes");
          return;
        }

        setSummary({
          customers: getTotal(baseResponse.data?.customers),
          routes: getTotal(baseResponse.data?.routes),
          products: getTotal(baseResponse.data?.products),
        });
        setOrders(normalizeRows(ordersResponse.data?.items));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar pedidos"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const today = getTodayInputValue();
  const todayOrders = useMemo(() => orders.filter((order) => formatDate(order.order_date) === today), [orders, today]);
  const draftOrders = todayOrders.filter((order) => order.status === "draft").length;
  const confirmedOrders = todayOrders.filter((order) => order.status === "confirmed").length;
  const productionOrders = todayOrders.filter((order) => order.status === "in_production" || order.status === "ready").length;
  const dispatchedOrders = todayOrders.filter((order) => ["dispatched", "delivered"].includes(order.status)).length;
  const dayAmount = todayOrders.reduce((acc, order) => acc + Number(order.grand_total || 0), 0);
  const completedFlow = todayOrders.length > 0 ? Math.round((dispatchedOrders / todayOrders.length) * 100) : 0;

  return (
    <FlowPageLayout title="Pedidos - Dia" subtitle="Resumen operativo para captura y seguimiento diario">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Jornada de pedidos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hoy {today}: captura pedidos, revisa pendientes y continua el flujo hasta despacho.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AppButton color="secondary" component={Link} href="/orders/count">
              Crear pedido
            </AppButton>
            <Button color="secondary" variant="outlined" component={Link} href="/orders/history">
              Historico
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <MetricCard label="Pedidos de hoy" value={todayOrders.length} helper={`${draftOrders} borrador · ${confirmedOrders} confirmados`} color="info" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="En produccion/listos" value={productionOrders} helper="Pendientes de producir o despachar" color="warning" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Despachados" value={dispatchedOrders} helper={`${completedFlow}% del flujo de hoy`} color="success" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Valor del dia" value={formatMoney(dayAmount)} helper="Segun pedidos fechados hoy" color="secondary" />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
        <Stack spacing={1.25}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Avance del dia
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Relacion entre pedidos despachados y pedidos capturados hoy.
              </Typography>
            </Box>
            <Chip label={`${completedFlow}%`} color={completedFlow >= 100 ? "success" : "info"} />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={completedFlow}
            sx={{
              height: 10,
              borderRadius: 999,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { borderRadius: 999 },
            }}
          />
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <ActionCard title="Crear pedido" description="Selecciona cliente, ruta y productos para registrar un pedido nuevo." href="/orders/count" primary />
        </Grid>
        <Grid item xs={12} md={4}>
          <ActionCard title="Gestion de pedidos" description="Confirma, crea produccion, despacha o cancela pedidos recientes." href="/orders/history" />
        </Grid>
        <Grid item xs={12} md={4}>
          <ActionCard title="Clientes y rutas" description="Mantén actualizada la base comercial antes de capturar pedidos." href="/catalogo/clientes" />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Pedidos capturados hoy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ultimos movimientos de la jornada.
            </Typography>
          </Box>
          <Chip label={`${summary.customers} clientes · ${summary.routes} rutas · ${summary.products} productos`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando resumen del dia...</Alert> : null}
        {!loading && todayOrders.length === 0 ? <Alert severity="info">Todavia no hay pedidos registrados para hoy.</Alert> : null}

        <Grid container spacing={2}>
          {todayOrders.slice(0, 6).map((order) => (
            <Grid item xs={12} md={6} xl={4} key={order.id}>
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        Pedido #{order.id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {order.customer_name || "Cliente"} · {order.route_name || "Sin ruta"}
                      </Typography>
                    </Box>
                    <StatusChip status={order.status} />
                  </Stack>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Entrega
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {formatDate(order.delivery_date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Total
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {formatMoney(order.grand_total)}
                      </Typography>
                    </Grid>
                  </Grid>
                  <OrderTrace order={order} />
                  <Button component={Link} href={`/orders/history?search=${encodeURIComponent(order.id)}`} color="secondary" variant="outlined" sx={{ alignSelf: "flex-start" }}>
                    Ver flujo
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </FlowPageLayout>
  );
};

export default OrdersDayPage;
