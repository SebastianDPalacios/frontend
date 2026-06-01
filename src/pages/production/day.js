import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import productionService from "services/production/production-service";
import AppCard from "@core/components/ui/AppCard";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getTotal, normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});

const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};

const statusLabels = {
  draft: "Borrador",
  planned: "Planificada",
  in_progress: "En proceso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusColors = {
  draft: "default",
  planned: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

const StatusChip = ({ status }) => (
  <Chip
    size="small"
    label={statusLabels[status] || status || "-"}
    color={statusColors[status] || "default"}
    variant={status === "draft" ? "outlined" : "filled"}
    sx={{ minWidth: 104 }}
  />
);

const MetricCard = ({ label, value, helper, color = "primary" }) => (
  <AppCard>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" sx={{ mt: 1, fontWeight: 800, color: `${color}.main` }}>
      {value}
    </Typography>
    {helper ? (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {helper}
      </Typography>
    ) : null}
  </AppCard>
);

const getProgressPercent = (producedQty, plannedQty) => {
  const planned = Number(plannedQty || 0);
  if (planned <= 0) {
    return 0;
  }

  return Math.min(Math.round((Number(producedQty || 0) / planned) * 100), 100);
};

const OrderStat = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 900 }}>
      {value}
    </Typography>
  </Box>
);

const ProductionOrderCard = ({ order }) => {
  const progress = getProgressPercent(order.produced_qty, order.planned_qty);
  const pendingItems = Number(order.pending_items || 0);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: 2,
        height: "100%",
        borderColor: pendingItems > 0 ? "warning.main" : "success.main",
        bgcolor: "background.paper",
        transition: "box-shadow 160ms ease, transform 160ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
              Orden #{order.id}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
              {order.branch_name || "Sucursal"} - {formatDate(order.planned_date)}
            </Typography>
          </Box>
          <StatusChip status={order.status} />
        </Stack>

        <Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary">
              Avance
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {progress}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 9,
              borderRadius: 999,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { borderRadius: 999 },
            }}
          />
        </Box>

        <Grid container spacing={1}>
          <Grid item xs={3}>
            <OrderStat label="Items" value={formatNumber(order.items_count)} />
          </Grid>
          <Grid item xs={3}>
            <OrderStat label="Plan" value={formatNumber(order.planned_qty)} />
          </Grid>
          <Grid item xs={3}>
            <OrderStat label="Hecho" value={formatNumber(order.produced_qty)} />
          </Grid>
          <Grid item xs={3}>
            <OrderStat label="Pend." value={formatNumber(order.pending_items)} />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: "auto" }}>
          <Chip
            size="small"
            color={pendingItems > 0 ? "warning" : "success"}
            label={pendingItems > 0 ? `${pendingItems} pendientes` : "Sin pendientes"}
            variant={pendingItems > 0 ? "outlined" : "filled"}
          />
          {progress >= 100 ? <Chip size="small" color="success" label="Produccion completa" variant="outlined" /> : null}
        </Stack>
      </Stack>
    </Paper>
  );
};

const ProductionDayPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    products: 0,
    rawMaterials: 0,
    ordersToday: 0,
    pendingOrders: 0,
    completedOrders: 0,
    plannedQty: 0,
    producedQty: 0,
  });
  const [ordersToday, setOrdersToday] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const today = getTodayInputValue();
        const [baseResponse, ordersResponse] = await Promise.all([
          productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 50 }),
          productionService.getOrders({ page: 1, pageSize: 80 }),
        ]);

        if (baseResponse?.code !== 1) {
          setError(baseResponse?.message || "No se pudo cargar base de produccion");
          return;
        }

        if (ordersResponse?.code !== 1) {
          setError(ordersResponse?.message || "No se pudieron cargar ordenes de produccion");
          return;
        }

        const orders = normalizeRows(ordersResponse.data?.items);
        const todayOrders = orders.filter((order) => formatDate(order.planned_date) === today);
        const activeTodayOrders = todayOrders.filter((order) => !["completed", "cancelled"].includes(order.status));
        const completedTodayOrders = todayOrders.filter((order) => order.status === "completed");
        const plannedQty = todayOrders.reduce((acc, order) => acc + Number(order.planned_qty || 0), 0);
        const producedQty = todayOrders.reduce((acc, order) => acc + Number(order.produced_qty || 0), 0);

        setSummary({
          products: getTotal(baseResponse.data?.products),
          rawMaterials: getTotal(baseResponse.data?.raw_materials),
          ordersToday: todayOrders.length,
          pendingOrders: activeTodayOrders.length,
          completedOrders: completedTodayOrders.length,
          plannedQty,
          producedQty,
        });
        setOrdersToday(todayOrders);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar produccion"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const progress = summary.plannedQty > 0 ? Math.min((summary.producedQty / summary.plannedQty) * 100, 100) : 0;

  return (
    <FlowPageLayout title="Produccion - Dia" subtitle="Resumen operativo de hoy">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Produccion de hoy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Seguimiento de ordenes planificadas para {getTodayInputValue()}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" color="secondary" component={Link} href="/production/register">
              Registrar produccion
            </Button>
            <Button variant="outlined" color="secondary" component={Link} href="/production/orders">
              Gestionar ordenes
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <MetricCard label="Ordenes hoy" value={summary.ordersToday} helper={`${summary.pendingOrders} pendientes`} color="info" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Completadas" value={summary.completedOrders} helper="Ordenes cerradas del dia" color="success" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Productos activos" value={summary.products} helper="Disponibles para planificar" color="secondary" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Materias primas" value={summary.rawMaterials} helper="Insumos de receta" color="warning" />
        </Grid>
      </Grid>

      <AppCard>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Avance del dia
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatNumber(summary.producedQty)} producido de {formatNumber(summary.plannedQty)} planificado
              </Typography>
            </Box>
            <Chip label={`${formatNumber(progress)}%`} color={progress >= 100 ? "success" : "info"} />
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 2 }} />
        </Stack>
      </AppCard>

      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Ordenes planificadas para hoy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avance individual por orden, cantidades y pendientes.
            </Typography>
          </Box>
          <Chip label={`${ordersToday.length} ordenes`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando ordenes planificadas...</Alert> : null}
        {!loading && ordersToday.length === 0 ? <Alert severity="info">No hay ordenes planificadas para hoy.</Alert> : null}

        <Grid container spacing={2}>
          {ordersToday.map((order) => (
            <Grid item xs={12} md={6} xl={4} key={order.id}>
              <ProductionOrderCard order={order} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </FlowPageLayout>
  );
};

export default ProductionDayPage;
