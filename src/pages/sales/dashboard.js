import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentsIcon from "@mui/icons-material/Payments";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AppButton from "@core/components/ui/AppButton";
import ordersService from "services/orders/orders-service";
import authService from "services/auth/auth-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => currencyFormatter.format(Number(value || 0));

const getUserLabel = (user) => user?.full_name || user?.name || user?.username || "Vendedor";

const SalesMetric = ({ title, value, helper, icon, color = "secondary" }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 4,
      p: { xs: 2, sm: 2.25 },
      height: "100%",
      bgcolor: "background.paper",
    }}
  >
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Avatar sx={{ bgcolor: `${color}.main`, color: `${color}.contrastText`, width: 46, height: 46 }}>
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.05 }}>
          {value}
        </Typography>
        {helper ? (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  </Paper>
);

const SalesAction = ({ title, description, href, label, icon, primary = false }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 4,
      p: { xs: 2, sm: 2.5 },
      height: "100%",
      borderColor: primary ? "secondary.main" : "divider",
      bgcolor: primary ? "rgba(221, 93, 38, 0.05)" : "background.paper",
    }}
  >
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Avatar sx={{ bgcolor: primary ? "secondary.main" : "action.hover", color: primary ? "common.white" : "text.primary" }}>
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.15 }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ flexGrow: 1 }} />
      <AppButton component={Link} href={href} color="secondary" variant={primary ? "contained" : "outlined"} fullWidth>
        {label}
      </AppButton>
    </Stack>
  </Paper>
);

const SalesDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [baseData, setBaseData] = useState({ customers: [], products: [] });
  const currentUser = useMemo(() => authService.getCurrentUser(), []);
  const today = useMemo(() => toDateInputValue(), []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const [ordersResponse, baseResponse] = await Promise.all([
          ordersService.getOrders({ dateFrom: today, dateTo: today, page: 1, pageSize: 80 }),
          ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 120 }),
        ]);

        if (ordersResponse?.code !== 1) {
          setError(ordersResponse?.message || "No se pudieron cargar pedidos de hoy");
          return;
        }

        setOrders(normalizeRows(ordersResponse.data?.items));
        setBaseData({
          customers: normalizeRows(baseResponse?.data?.customers),
          products: normalizeRows(baseResponse?.data?.products),
        });
      } catch (requestError) {
        setError(requestError?.response?.data?.message || requestError?.message || "Error de red al cargar el dashboard");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [today]);

  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  const draftOrders = orders.filter((order) => order.status === "draft").length;
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length;
  const salesAmount = activeOrders.reduce((total, order) => total + Number(order.grand_total || 0), 0);
  const progress = activeOrders.length > 0 ? Math.round((deliveredOrders / activeOrders.length) * 100) : 0;

  return (
    <FlowPageLayout
      title="Dashboard de ventas"
      subtitle="Tus accesos principales para trabajar el dia sin perderte."
      breadcrumbs={[]}
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 3 },
          mb: 2.5,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 950 }}>
              Hola, {getUserLabel(currentUser)}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Hoy es {today}. Desde aqui puedes capturar pedidos, revisar el resumen y reportar cambios.
            </Typography>
          </Box>
          <Chip icon={<CalendarTodayIcon />} label="Jornada de ventas" variant="outlined" sx={{ alignSelf: { xs: "flex-start", md: "center" } }} />
        </Stack>
      </Paper>

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <SalesMetric title="Pedidos de hoy" value={loading ? "..." : orders.length} helper={`${draftOrders} en borrador`} icon={<ShoppingCartIcon />} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SalesMetric title="Entregados" value={loading ? "..." : deliveredOrders} helper={`${progress}% completado`} icon={<CheckCircleIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SalesMetric title="Clientes asignados" value={loading ? "..." : baseData.customers.length} helper="Cartera disponible" icon={<StorefrontIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SalesMetric title="Venta activa" value={loading ? "..." : formatMoney(salesAmount)} helper={`${baseData.products.length} productos visibles`} icon={<PaymentsIcon />} color="warning" />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.5 }, mb: 2.5 }}>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 950 }}>
                Avance de entregas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Relacion entre pedidos activos y pedidos entregados de hoy.
              </Typography>
            </Box>
            <Chip label={`${progress}% entregado`} color={progress >= 100 && activeOrders.length > 0 ? "success" : "default"} />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 999,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { borderRadius: 999 },
            }}
          />
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <SalesAction
            title="Ventas"
            description="Registra una venta nueva para tus clientes asignados."
            href="/orders/count"
            label="Ir a ventas"
            icon={<ShoppingCartIcon />}
            primary
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SalesAction
            title="Ver resumen"
            description="Consulta los pedidos del dia, estado y avance."
            href="/orders/day"
            label="Abrir resumen"
            icon={<LocalShippingIcon />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SalesAction
            title="Cambios y devoluciones"
            description="Reporta productos devueltos dentro de la politica permitida."
            href="/orders/returns"
            label="Reportar cambio"
            icon={<AssignmentReturnIcon />}
          />
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default SalesDashboardPage;
