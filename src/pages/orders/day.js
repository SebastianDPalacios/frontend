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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getTotal, normalizeRows } from "views/modules/flow-utils";
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

const StatusChip = ({ status }) => (
  <Chip
    size="small"
    label={statusLabels[status] || status || "-"}
    color={statusColors[status] || "default"}
    variant={status === "draft" ? "outlined" : "filled"}
    sx={{ minWidth: 104 }}
  />
);

const getTraceSteps = (order) => {
  if (order?.status === "cancelled") {
    return [
      { label: "Pedido", state: "done" },
      { label: "Cancelado", state: "error" },
    ];
  }

  const isConfirmed = ["confirmed", "ready", "dispatched", "delivered"].includes(order?.status);
  const isDispatched = ["dispatched", "delivered"].includes(order?.status);
  const isDelivered = order?.status === "delivered";

  return [
    { label: "Pedido", state: "done" },
    { label: "Confirmado", state: isConfirmed ? "done" : order?.status === "draft" ? "active" : "pending" },
    { label: "Inventario", state: isDispatched ? "done" : isConfirmed ? "active" : "pending" },
    { label: "Despachado", state: isDispatched ? "done" : "pending" },
    { label: "Entregado", state: isDelivered ? "done" : isDispatched ? "active" : "pending" },
  ];
};

const buildDailyOrderNumberMap = (orders) => {
  const dayMap = new Map();

  orders.forEach((order) => {
    const day = formatDate(order.order_date);
    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    dayMap.get(day).push(order);
  });

  return Array.from(dayMap.values()).reduce((acc, dayOrders) => {
    [...dayOrders]
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
      .forEach((order, index) => {
        acc[String(order.id)] = index + 1;
      });
    return acc;
  }, {});
};

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

const OrdersPeriodTable = ({ orders }) => {
  const dailyOrderNumberById = buildDailyOrderNumberMap(orders);

  return (
    <TableContainer>
      <Table sx={{ minWidth: 860 }}>
      <TableHead>
        <TableRow>
          <TableCell>Pedido</TableCell>
          <TableCell>Cliente</TableCell>
          <TableCell>Flujo</TableCell>
          <TableCell>Estado</TableCell>
          <TableCell>Vendedor</TableCell>
          <TableCell>Entrega</TableCell>
          <TableCell align="right">Total</TableCell>
          <TableCell align="right">Accion</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {orders.slice(0, 12).map((order) => {
          const isDone = ["dispatched", "delivered"].includes(order.status);
          const progress = getTraceSteps(order).filter((step) => step.state === "done").length * 20;
          const dailyNumber = dailyOrderNumberById[String(order.id)] || "";

          return (
            <TableRow key={order.id} hover>
              <TableCell>
                <Typography sx={{ fontWeight: 900 }}>Pedido #{dailyNumber}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(order.order_date)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontWeight: 800 }}>{order.customer_name || "Cliente"}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                <Stack spacing={0.5}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      Avance
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 900 }}>
                      {Math.min(progress, 100)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(progress, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: "action.hover",
                      "& .MuiLinearProgress-bar": { borderRadius: 999, bgcolor: isDone ? "success.main" : "secondary.main" },
                    }}
                  />
                </Stack>
              </TableCell>
              <TableCell>
                <StatusChip status={order.status} />
              </TableCell>
              <TableCell>{order.sales_agent_name || "Sin vendedor"}</TableCell>
              <TableCell>{formatDate(order.delivery_date)}</TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: 900 }}>{formatMoney(order.amount_to_collect ?? order.grand_total)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Button component={Link} href={`/orders/history?search=${encodeURIComponent(dailyNumber)}`} color="secondary" variant="outlined">
                  Ver detalle
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      </Table>
    </TableContainer>
  );
};

const OrdersDayPage = () => {
  const [period, setPeriod] = useState("daily");
  const [dayValue, setDayValue] = useState(toDateInputValue());
  const [weekValue, setWeekValue] = useState(getIsoWeekInputValue());
  const [monthValue, setMonthValue] = useState(toMonthInputValue());
  const [fortnightMonth, setFortnightMonth] = useState(toMonthInputValue());
  const [fortnightHalf, setFortnightHalf] = useState("1");
  const [semesterYear, setSemesterYear] = useState(String(new Date().getFullYear()));
  const [semesterHalf, setSemesterHalf] = useState(new Date().getMonth() < 6 ? "1" : "2");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    customers: 0,
    products: 0,
  });
  const [orders, setOrders] = useState([]);

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
      setLoading(true);
      setError(null);

      try {
        const [baseResponse, ordersResponse] = await Promise.all([
          ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 50 }),
          ordersService.getOrders({
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
            page: 1,
            pageSize: 500,
          }),
        ]);

        if (baseResponse?.code !== 1) {
          setError(baseResponse?.message || "No se pudo cargar base de pedidos");
          return;
        }

        if (ordersResponse?.code !== 1) {
          setError(ordersResponse?.message || "No se pudieron cargar pedidos del periodo");
          return;
        }

        setSummary({
          customers: getTotal(baseResponse.data?.customers),
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
  }, [dateRange]);

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
    <FlowPageLayout title="Resumen de pedidos" subtitle="Consulta el balance operativo por dia, semana, quincena, mes o semestre">
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
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Balance {selectedPeriodLabel.toLowerCase()}
            </Typography>
            <Typography color="text.secondary">
              Del {dateRange.from} al {dateRange.to}. Venta, pedidos activos y avance de inventario.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
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
            <AppButton color="secondary" component={Link} href="/orders/count">
              Crear pedido
            </AppButton>
            <Button color="secondary" variant="outlined" component={Link} href="/orders/history">
              Gestion diaria
            </Button>
            <Button color="secondary" variant="outlined" component={Link} href="/orders/historical">
              Historico
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard label="Valor del periodo" value={formatMoney(periodAmount)} helper={`${activeOrders} pedidos activos`} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard label="Pedidos" value={periodOrders.length} helper={`${draftOrders} borrador, ${confirmedOrders} confirmados`} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard label="Ticket promedio" value={formatMoney(averageTicket)} helper="Sobre pedidos no cancelados" color="primary" />
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
              <Typography variant="body2" color="text.secondary">
                Relacion entre pedidos despachados y pedidos activos del rango seleccionado.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
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
        <Grid item xs={12} md={6}>
          <BalancePanel title="Clientes con mayor venta" emptyText="Sin clientes en este periodo." items={customerBalances} />
        </Grid>
        <Grid item xs={12} md={6}>
          <BalancePanel title="Vendedores con mayor venta" emptyText="Sin vendedores en este periodo." items={sellerBalances} />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Pedidos del periodo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ultimos movimientos entre {dateRange.from} y {dateRange.to}.
            </Typography>
          </Box>
          <Chip label={`${summary.customers} clientes - ${summary.products} productos`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando balance de pedidos...</Alert> : null}
        {!loading && periodOrders.length === 0 ? <Alert severity="info">No hay pedidos registrados en este periodo.</Alert> : null}

        {!loading && periodOrders.length > 0 ? <OrdersPeriodTable orders={periodOrders} /> : null}
      </Paper>
    </FlowPageLayout>
  );
};

export default OrdersDayPage;
