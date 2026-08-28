import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import ordersService from "services/orders/orders-service";
import authService from "services/auth/auth-service";
import { isSalesOnlyUser } from "configs/access";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker, BalanceMonthPicker, BalanceWeekPicker } from "@core/components/ui/BalancePeriodPickers";
import { getIsoWeekInputValue, getPeriodRange, toDateInputValue, toMonthInputValue } from "@core/components/ui/balance-date-utils";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const periodOptions = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "fortnight", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "semester", label: "Semestral" },
];

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

const MetricCard = ({ label, value, helper, color = "primary" }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 4,
      p: 2,
      height: "100%",
      position: "relative",
      overflow: "hidden",
      "&:before": {
        content: '""',
        position: "absolute",
        inset: "0 auto 0 0",
        width: 5,
        bgcolor: `${color}.main`,
      },
    }}
  >
    <Stack spacing={0.75} sx={{ pl: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 950, color: "text.primary", letterSpacing: 0 }}>
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

const BalancePanel = ({ title, emptyText, items }) => (
  <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.5 }, height: "100%" }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {title}
      </Typography>
      <Chip label={`${items.length} registros`} size="small" variant="outlined" />
    </Stack>
    <Stack spacing={1}>
      {items.length === 0 ? <Alert severity="info">{emptyText}</Alert> : null}
      {items.map((item, index) => (
        <Paper
          key={item.name}
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 1.5,
            bgcolor: index === 0 ? "rgba(221, 93, 38, 0.05)" : "background.default",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900 }} noWrap>
                {item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.orders} pedido{item.orders === 1 ? "" : "s"}
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 950, fontSize: 18 }}>{formatMoney(item.amount)}</Typography>
          </Stack>
        </Paper>
      ))}
    </Stack>
  </Paper>
);

const MobileSummaryRow = ({ label, value, color = "text.primary" }) => (
  <Stack
    direction="row"
    sx={{
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 48,
      py: 1,
      borderTop: 1,
      borderColor: "divider",
    }}
  >
    <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{label}</Typography>
    <Typography sx={{ fontSize: 20, fontWeight: 950, color }}>{value}</Typography>
  </Stack>
);

const OrdersDayPage = () => {
  const currentUser = authService.getCurrentUser() || {};
  const salesOnly = isSalesOnlyUser(currentUser);
  const [period, setPeriod] = useState("daily");
  const [dayValue, setDayValue] = useState(toDateInputValue());
  const [weekValue, setWeekValue] = useState(getIsoWeekInputValue());
  const [monthValue, setMonthValue] = useState(toMonthInputValue());
  const [fortnightMonth, setFortnightMonth] = useState(toMonthInputValue());
  const [fortnightHalf, setFortnightHalf] = useState("1");
  const [semesterYear, setSemesterYear] = useState(String(new Date().getFullYear()));
  const [semesterHalf, setSemesterHalf] = useState(new Date().getMonth() < 6 ? "1" : "2");
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [periodEarnings, setPeriodEarnings] = useState(0);

  const dateRange = useMemo(
    () =>
      getPeriodRange(period, {
        day: dayValue,
        week: weekValue,
        month: monthValue,
        fortnightMonth,
        fortnightHalf,
        semesterYear,
        semesterHalf,
      }),
    [dayValue, fortnightHalf, fortnightMonth, monthValue, period, semesterHalf, semesterYear, weekValue]
  );
  const selectedPeriodLabel = periodOptions.find((option) => option.value === period)?.label || "Periodo";

  useEffect(() => {
    const run = async () => {
      setError(null);

      try {
        const [ordersResponse, commissionsResponse] = await Promise.all([
          ordersService.getOrders({
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
            page: 1,
            pageSize: 500,
          }),
          salesOnly
            ? ordersService.getSalesCommissions({ dateFrom: dateRange.from, dateTo: dateRange.to })
            : Promise.resolve(null),
        ]);

        if (ordersResponse?.code !== 1) {
          setError(ordersResponse?.message || "No se pudieron cargar pedidos del periodo");
          return;
        }

        if (salesOnly && commissionsResponse?.code !== 1) {
          setError(commissionsResponse?.message || "No se pudieron cargar tus ganancias del periodo");
          return;
        }

        setOrders(normalizeRows(ordersResponse.data?.items));
        setPeriodEarnings(salesOnly ? Number(commissionsResponse?.data?.summary?.commission_amount || 0) : 0);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar pedidos"));
      }
    };

    run();
  }, [dateRange, salesOnly]);

  const periodOrders = useMemo(
    () => orders.filter((order) => formatDate(order.order_date) >= dateRange.from && formatDate(order.order_date) <= dateRange.to),
    [orders, dateRange.from, dateRange.to]
  );
  const draftOrders = periodOrders.filter((order) => order.status === "draft").length;
  const confirmedOrders = periodOrders.filter((order) => order.status === "confirmed").length;
  const productionOrders = periodOrders.filter((order) => order.status === "in_production" || order.status === "ready").length;
  const dispatchedOrders = periodOrders.filter((order) => ["dispatched", "delivered"].includes(order.status)).length;
  const cancelledOrders = periodOrders.filter((order) => order.status === "cancelled").length;
  const activeOrders = periodOrders.length - cancelledOrders;
  const periodAmount = periodOrders.reduce((acc, order) => acc + Number(order.amount_to_collect ?? order.grand_total ?? 0), 0);
  const averageTicket = activeOrders > 0 ? periodAmount / activeOrders : 0;
  const completedFlow = activeOrders > 0 ? Math.round((dispatchedOrders / activeOrders) * 100) : 0;

  const customerBalances = useMemo(() => {
    const totals = new Map();
    periodOrders.forEach((order) => {
      const key = order.customer_name || "Cliente sin nombre";
      const current = totals.get(key) || { name: key, orders: 0, amount: 0 };
      current.orders += 1;
      current.amount += Number(order.amount_to_collect ?? order.grand_total ?? 0);
      totals.set(key, current);
    });
    return Array.from(totals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodOrders]);

  const sellerBalances = useMemo(() => {
    const totals = new Map();
    periodOrders.forEach((order) => {
      const key = order.sales_agent_name || "Sin vendedor";
      const current = totals.get(key) || { name: key, orders: 0, amount: 0 };
      current.orders += 1;
      current.amount += Number(order.amount_to_collect ?? order.grand_total ?? 0);
      totals.set(key, current);
    });
    return Array.from(totals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodOrders]);

  return (
    <FlowPageLayout
      title="Resumen de pedidos"
      subtitle="Consulta tus ventas, ganancias y pedidos del periodo."
      hideBreadcrumbsOnMobile
      compactHeaderOnMobile
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 2.5 },
          mb: 2.5,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", lg: "center" } }}>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Balance {selectedPeriodLabel.toLowerCase()}
            </Typography>
            <Typography color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              Del {dateRange.from} al {dateRange.to}. Venta, pedidos activos y avance de inventario.
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: "center",
              display: { xs: "grid", sm: "flex" },
              gridTemplateColumns: { xs: "minmax(108px, 0.8fr) minmax(0, 1.65fr)", sm: "none" },
              flexWrap: { sm: "wrap" },
              width: { xs: "100%", sm: "auto" },
              "& .MuiInputBase-root": { minHeight: { xs: 52, sm: "auto" }, fontSize: { xs: 17, sm: "inherit" } },
              "& .MuiButton-root": { minHeight: { xs: 52, sm: 40 }, fontSize: { xs: 16, sm: "inherit" } },
              "& > .MuiFormControl-root": { minWidth: 0, width: "100%" },
            }}
          >
            <TextField select size="small" label="Periodo" value={period} onChange={(event) => setPeriod(event.target.value)} sx={{ minWidth: { sm: 160 } }}>
              {periodOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {period === "daily" ? (
              <BalanceDatePicker label="Dia" value={dayValue} onChange={setDayValue} />
            ) : null}
            {period === "weekly" ? (
              <BalanceWeekPicker label="Semana" value={weekValue} onChange={setWeekValue} />
            ) : null}
            {period === "fortnight" ? (
              <>
                <BalanceMonthPicker label="Mes" value={fortnightMonth} onChange={setFortnightMonth} />
                <TextField select size="small" label="Quincena" value={fortnightHalf} onChange={(event) => setFortnightHalf(event.target.value)} sx={{ minWidth: { sm: 138 } }}>
                  <MenuItem value="1">1 al 15</MenuItem>
                  <MenuItem value="2">16 al cierre</MenuItem>
                </TextField>
              </>
            ) : null}
            {period === "monthly" ? (
              <BalanceMonthPicker label="Mes" value={monthValue} onChange={setMonthValue} />
            ) : null}
            {period === "semester" ? (
              <>
                <TextField size="small" label="Anio" type="number" value={semesterYear} onChange={(event) => setSemesterYear(event.target.value)} inputProps={{ min: 2020, max: 2100 }} sx={{ maxWidth: { sm: 112 } }} />
                <TextField select size="small" label="Semestre" value={semesterHalf} onChange={(event) => setSemesterHalf(event.target.value)} sx={{ minWidth: { sm: 138 } }}>
                  <MenuItem value="1">Enero - Junio</MenuItem>
                  <MenuItem value="2">Julio - Diciembre</MenuItem>
                </TextField>
              </>
            ) : null}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, auto)" }, gap: 1, width: { xs: "100%", sm: "auto" }, gridColumn: { xs: "1 / -1", sm: "auto" } }}>
              <AppButton color="secondary" component={Link} href="/orders/count" sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                Crear pedido
              </AppButton>
              <Button color="secondary" variant="outlined" component={Link} href="/orders/history">
                Gestion diaria
              </Button>
              <Button color="secondary" variant="outlined" component={Link} href="/orders/historical">
                Historico
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ display: { xs: "block", sm: "none" }, borderRadius: 4, p: 2, mb: 2 }}>
        <Typography color="text.secondary" sx={{ fontSize: 16, fontWeight: 700 }}>
          {salesOnly ? (period === "daily" ? "Ganancia del día" : "Ganancia del periodo") : "Valor del periodo"}
        </Typography>
        <Typography sx={{ mt: 0.25, mb: 1.25, fontSize: 34, lineHeight: 1.15, fontWeight: 950, color: "secondary.main" }}>
          {formatMoney(salesOnly ? periodEarnings : periodAmount)}
        </Typography>
        <MobileSummaryRow label="Pedidos" value={periodOrders.length} />
        <MobileSummaryRow label="Venta promedio" value={formatMoney(averageTicket)} />
        <MobileSummaryRow label="Despachados" value={dispatchedOrders} color="success.main" />
      </Paper>

      <Grid container spacing={1.5} sx={{ display: { xs: "none", sm: "flex" }, mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label={salesOnly ? (period === "daily" ? "Ganancia del día" : "Ganancia del periodo") : "Valor del periodo"}
            value={formatMoney(salesOnly ? periodEarnings : periodAmount)}
            helper={salesOnly ? "Comisión de pedidos entregados" : `${activeOrders} pedidos activos`}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard label="Pedidos" value={periodOrders.length} helper={`${draftOrders} borrador, ${confirmedOrders} confirmados`} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard label="Venta promedio" value={formatMoney(averageTicket)} helper="Sobre pedidos no cancelados" color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard label="Despachados" value={dispatchedOrders} helper={`${completedFlow}% del flujo del periodo`} color="success" />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.5 }, mb: 2.5 }}>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Avance del periodo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
                Relacion entre pedidos despachados y pedidos activos del rango seleccionado.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", "& .MuiChip-root": { height: { xs: 36, sm: 32 }, fontSize: { xs: 14, sm: "inherit" } } }}>
              <Chip label={`${productionOrders} en produccion/listos`} color="warning" variant="outlined" />
              <Chip label={`${cancelledOrders} cancelados`} color={cancelledOrders ? "error" : "default"} variant="outlined" />
              <Chip label={`${completedFlow}% despachado`} color={completedFlow >= 100 ? "success" : "info"} />
            </Stack>
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

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={6} sx={{ display: salesOnly ? { xs: "none", md: "block" } : "block" }}>
          <BalancePanel title="Clientes con mayor venta" emptyText="Sin clientes en este periodo." items={customerBalances} />
        </Grid>
        <Grid item xs={12} md={6}>
          <BalancePanel title="Vendedores con mayor venta" emptyText="Sin vendedores en este periodo." items={sellerBalances} />
        </Grid>
      </Grid>

    </FlowPageLayout>
  );
};

export default OrdersDayPage;
