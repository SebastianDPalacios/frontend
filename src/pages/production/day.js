import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import productionService from "services/production/production-service";
import AppCard from "@core/components/ui/AppCard";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
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

      <Box sx={{ mt: 3 }}>
        <FlowTableCard
          title="Ordenes planificadas para hoy"
          loading={loading}
          error={null}
          emptyMessage="No hay ordenes planificadas para hoy."
          columns={[
            { key: "id", label: "Orden", render: (row) => `#${row.id}` },
            { key: "branch_name", label: "Sucursal" },
            { key: "status", label: "Estado", render: (row) => <StatusChip status={row.status} /> },
            { key: "items_count", label: "Items", render: (row) => formatNumber(row.items_count) },
            { key: "planned_qty", label: "Planificado", render: (row) => formatNumber(row.planned_qty) },
            { key: "produced_qty", label: "Producido", render: (row) => formatNumber(row.produced_qty) },
            { key: "pending_items", label: "Pendientes", render: (row) => formatNumber(row.pending_items) },
          ]}
          rows={ordersToday}
        />
      </Box>
    </FlowPageLayout>
  );
};

export default ProductionDayPage;
