import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  FormControlLabel,
  Menu,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import authService from "services/auth/auth-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import OrderDetailEditor from "components/organisms/orders/OrderDetailEditor";
import OrderCustomerEditor from "components/organisms/orders/OrderCustomerEditor";
import OrderPrintManager from "components/organisms/orders/OrderPrintManager";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  return String(value).slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return formatDate(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  return parsed.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPrintLabel = (order) => {
  const count = Number(order?.print_count || 0);
  if (count <= 0) return "No impreso";
  return count === 1 ? "1 vez" : `${count} veces`;
};

const getTodayDate = () => toDateInputValue();
const getCurrentMonth = () => getTodayDate().slice(0, 7);
const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue || "").split("-").map(Number);
  if (!year || !month) return { dateFrom: "", dateTo: "" };
  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${year}-${String(month).padStart(2, "0")}-01`,
    dateTo: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

const formatMoney = (value) => currencyFormatter.format(Number(value || 0));
const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const getFriendlyOrderError = (message) => {
  const text = String(message || "");

  if (text.includes("el pedido no tiene items")) {
    return "Este pedido no tiene productos. Agrega al menos un producto antes de confirmar.";
  }

  if (text.includes("insufficient stock for product_id")) {
    return "No hay stock suficiente para despachar este pedido. Revisa inventario antes de continuar.";
  }

  if (text.includes("Incorrect date value")) {
    return "La fecha de planificacion no tiene un formato valido. Intenta nuevamente.";
  }

  if (text.startsWith("ERROR_SQL")) {
    return text.replace(/^ERROR_SQL\s+\d+\s+\d+:\s*/i, "") || "No se pudo completar la accion del pedido.";
  }

  return message || "No se pudo completar la accion del pedido.";
};

const statusLabels = {
  draft: "Borrador",
  confirmed: "Confirmado",
  in_production: "Produccion",
  planned: "Planificada",
  completed: "Completada",
  ready: "Listo",
  dispatched: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusColors = {
  draft: "default",
  confirmed: "info",
  in_production: "info",
  planned: "info",
  completed: "success",
  ready: "warning",
  dispatched: "success",
  delivered: "success",
  cancelled: "error",
};

const OrderMetric = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>
      {value || "-"}
    </Typography>
  </Box>
);

const CustomerDeliveryCard = ({ order }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: { xs: 2, md: 2.5 },
      bgcolor: "background.default",
      borderColor: "secondary.light",
    }}
  >
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Cliente
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
            {order.customer_name || "Sin cliente"}
          </Typography>
        </Box>
        <Box sx={{ minWidth: { md: 180 } }}>
          <Typography variant="caption" color="text.secondary">
            Telefono
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {order.customer_phone || "Sin telefono"}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <OrderMetric label="Direccion" value={order.customer_address || "Sin direccion"} />
        </Grid>
        <Grid item xs={12} md={5}>
          <OrderMetric label="Barrio / zona" value={order.customer_neighborhood || "Sin barrio/zona"} />
        </Grid>
      </Grid>
    </Stack>
  </Paper>
);

const SummaryCard = ({ label, value, helper, color = "primary" }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      p: 2.25,
      height: "100%",
      position: "relative",
      overflow: "hidden",
      borderColor: color === "default" ? "divider" : `${color}.light`,
      bgcolor: "background.paper",
      "&:before": {
        content: '""',
        position: "absolute",
        inset: "0 auto 0 0",
        width: 6,
        bgcolor: color === "default" ? "divider" : `${color}.main`,
      },
    }}
  >
    <Stack spacing={1.25} sx={{ pl: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1 }}>
        {value}
      </Typography>
      <Chip label={helper} color={color} variant="outlined" sx={{ alignSelf: "flex-start" }} />
    </Stack>
  </Paper>
);

const StatusChip = ({ status, sx, onClick, interactive = false }) => (
  <Chip
    size="small"
    label={statusLabels[status] || status || "-"}
    color={statusColors[status] || "default"}
    variant={status === "draft" ? "outlined" : "filled"}
    onClick={onClick}
    clickable={interactive}
    sx={{
      minWidth: 96,
      maxWidth: "100%",
      ...(interactive ? { fontWeight: 800, cursor: "pointer" } : {}),
      ...sx,
    }}
  />
);

const isReadyToDispatch = (order) =>
  ["confirmed", "ready"].includes(order?.status);

const getOrderNextStep = (order) => {
  if (!order) {
    return { label: "Selecciona un pedido", description: "Abre un pedido para revisar su estado.", severity: "info" };
  }

  if (order.status === "draft") {
    return { label: "Confirmar", description: "Descuenta inventario y registra la comision.", severity: "warning", action: "confirm" };
  }

  if (order.status === "confirmed") {
    return { label: "Despachar pedido", description: "Descuenta los productos disponibles del inventario.", severity: "success", action: "dispatch" };
  }

  if (order.status === "in_production") {
    return { label: "Detalle", description: "Estado historico de un flujo anterior vinculado a produccion.", severity: "info", action: "detail" };
  }

  if (order.status === "ready") {
    return { label: "Despachar pedido", description: "El pedido esta listo para descontar inventario.", severity: "success", action: "dispatch" };
  }

  if (order.status === "dispatched") {
    return { label: "Confirmar entrega", description: "Confirma que el cliente recibio el pedido para generar la comision.", severity: "warning", action: "deliver" };
  }

  if (order.status === "delivered") {
    return { label: "Pedido entregado", description: "La venta ya puede incluirse en la liquidacion diaria.", severity: "success", action: "detail" };
  }

  if (order.status === "cancelled") {
    return { label: "Pedido cancelado", description: "No requiere acciones operativas.", severity: "error", action: "detail" };
  }

  return { label: "Revisar pedido", description: "Abre el detalle para validar el siguiente paso.", severity: "info", action: "detail" };
};

const getOrderProgress = (order) => {
  if (order?.status === "cancelled") {
    return 0;
  }

  if (order?.status === "delivered") {
    return 100;
  }

  if (order?.status === "dispatched") {
    return 90;
  }

  if (order?.status === "ready") {
    return 85;
  }

  if (order?.status === "in_production") {
    return Number(order.production_pending_items || 0) === 0 ? 85 : 70;
  }

  if (order?.status === "confirmed") {
    return 60;
  }

  return 25;
};

const buildOrderDayGroups = (orders) => {
  const dayMap = new Map();

  orders.forEach((order) => {
    const day = formatDate(order.order_date);
    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    dayMap.get(day).push(order);
  });

  return Array.from(dayMap.entries()).map(([day, dayOrders]) => {
    const orderedForNumber = [...dayOrders].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    const numberById = orderedForNumber.reduce((acc, order, index) => {
      acc[String(order.id)] = index + 1;
      return acc;
    }, {});

    return {
      day,
      orders: dayOrders,
      numberById,
    };
  });
};

const normalizeSearchText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isPlainNumberSearch = (value) => /^\d+$/.test(String(value || "").trim());

const orderMatchesSearch = (order, searchValue, dailyNumberById) => {
  const normalizedSearch = normalizeSearchText(searchValue);

  if (!normalizedSearch) {
    return true;
  }

  const dailyNumber = String(dailyNumberById[String(order.id)] || "");

  if (isPlainNumberSearch(normalizedSearch) && dailyNumber === normalizedSearch) {
    return true;
  }

  const searchableText = [
    `pedido ${dailyNumber}`,
    `pedido #${dailyNumber}`,
    `pedido del dia ${dailyNumber}`,
    `pedido del dia #${dailyNumber}`,
    order.customer_name,
    order.customer_phone,
    order.customer_address,
    order.customer_neighborhood,
    order.sales_agent_name,
    statusLabels[order.status],
    formatDate(order.order_date),
    formatDate(order.delivery_date),
    formatMoney(order.amount_to_collect ?? order.grand_total),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
};

const getOrderTraceSteps = (order) => {
  if (order?.status === "cancelled") {
    return [
      { label: "Pedido", helper: "Creado", state: "done" },
      { label: "Cancelado", helper: "Flujo detenido", state: "error" },
    ];
  }

  const isConfirmed = ["confirmed", "ready", "dispatched", "delivered"].includes(order?.status);
  const isDispatched = order?.status === "dispatched" || order?.status === "delivered";
  const isDelivered = order?.status === "delivered";

  return [
    { label: "Pedido", helper: "Creado", state: "done" },
    {
      label: "Confirmado",
      helper: isConfirmed ? "Validado" : "Pendiente",
      state: isConfirmed ? "done" : order?.status === "draft" ? "active" : "pending",
    },
    {
      label: "Inventario",
      helper: isDispatched ? "Descontado" : isConfirmed ? "Por validar" : "Pendiente",
      state: isDispatched ? "done" : isConfirmed ? "active" : "pending",
    },
    {
      label: "Despachado",
      helper: isDispatched ? "Inventario afectado" : "Pendiente",
      state: isDispatched ? "done" : "pending",
    },
    {
      label: "Entregado",
      helper: isDelivered ? "Comision generada" : "Pendiente",
      state: isDelivered ? "done" : isDispatched ? "active" : "pending",
    },
  ];
};

const traceStateStyles = {
  done: { dotBg: "success.main", dotColor: "common.white", border: "success.main", label: "text.primary" },
  active: { dotBg: "primary.main", dotColor: "common.white", border: "primary.main", label: "text.primary" },
  pending: { dotBg: "action.hover", dotColor: "text.secondary", border: "divider", label: "text.secondary" },
  error: { dotBg: "error.main", dotColor: "common.white", border: "error.main", label: "text.primary" },
};

const OrderTrace = ({ order }) => {
  const steps = getOrderTraceSteps(order);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Trazabilidad
        </Typography>
        <Box sx={{ overflowX: "auto", pb: 0.5 }}>
          <Stack direction="row" spacing={1} sx={{ minWidth: steps.length > 2 ? 680 : 260, alignItems: "stretch" }}>
            {steps.map((step, index) => {
              const styles = traceStateStyles[step.state] || traceStateStyles.pending;

              return (
                <Stack key={step.label} direction="row" spacing={1} sx={{ flex: 1, minWidth: 120, alignItems: "center" }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      p: 1.25,
                      flex: 1,
                      minHeight: 86,
                      borderColor: styles.border,
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          bgcolor: styles.dotBg,
                          color: styles.dotColor,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 13,
                          fontWeight: 900,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: styles.label }}>
                        {step.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.helper}
                      </Typography>
                    </Stack>
                  </Paper>
                  {index < steps.length - 1 ? (
                    <Box sx={{ width: 18, height: 2, bgcolor: step.state === "done" ? "success.main" : "divider", flexShrink: 0 }} />
                  ) : null}
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

const getOperationalInsight = (order, items) => {
  const itemsCount = items.length;

  if (!order) {
    return {
      severity: "info",
      title: "Selecciona un pedido",
      description: "Abre el detalle para revisar si el pedido esta listo para despacho desde inventario.",
    };
  }

  if (order.status === "draft") {
    return {
      severity: itemsCount > 0 ? "info" : "warning",
      title: "Pedido editable",
      description: itemsCount > 0
        ? "El pedido sigue en borrador. Puedes editar items antes de confirmarlo."
        : "Agrega productos antes de confirmar el pedido.",
    };
  }

  if (order.status === "confirmed") {
    return {
      severity: "success",
      title: "Listo para validar inventario",
      description: "El pedido se despacha con producto disponible en stock. Al despachar se validan y descuentan las existencias.",
    };
  }

  if (order.status === "in_production" || order.status === "ready") {
    return {
      severity: order.status === "ready" ? "success" : "info",
      title: order.status === "ready" ? "Listo para despacho" : "Flujo historico",
      description: order.status === "ready"
        ? "El pedido puede descontarse del inventario."
        : "Este pedido conserva un estado anterior vinculado a produccion.",
    };
  }

  if (order.status === "dispatched") {
    return {
      severity: "warning",
      title: "Pendiente de confirmar entrega",
      description: "El inventario ya fue descontado, pero la venta solo aparece en la liquidacion cuando confirmas que el cliente recibio el pedido.",
      actionHref: "/inventory/movements",
      actionLabel: "Ver movimientos",
    };
  }

  if (order.status === "delivered") {
    return {
      severity: "success",
      title: "Pedido entregado",
      description: "La entrega fue confirmada y la comision ya fue generada para la liquidacion diaria.",
      actionHref: "/inventory/movements",
      actionLabel: "Ver movimientos",
    };
  }

  if (order.status === "cancelled") {
    return {
      severity: "error",
      title: "Pedido cancelado",
      description: "El pedido fue retirado del flujo comercial. Si había sido despachado, sus productos fueron reintegrados al inventario.",
      actionHref: "/inventory/movements",
      actionLabel: "Ver movimientos",
    };
  }

  return {
    severity: "info",
    title: "Estado operativo",
    description: "Revisa el estado del pedido antes de producir, despachar o ajustar inventario.",
  };
};

export const OrdersHistoryPage = ({ mode = "today" }) => {
  const router = useRouter();
  const isTodayMode = mode === "today";
  const currentUser = authService.getCurrentUser() || {};
  const roleCodes = Array.isArray(currentUser.roles)
    ? currentUser.roles.map((role) => String(typeof role === "string" ? role : role?.code || "").toUpperCase())
    : [];
  const isAdministrator = roleCodes.some((role) => ["ADMIN", "SUPER_ADMIN", "ADMINISTRATIVO", "ADMINISTRATIVE"].includes(role));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [deliveryDateDraft, setDeliveryDateDraft] = useState("");
  const [deliveryDateSaving, setDeliveryDateSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateMode, setDateMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, order: null });
  const todayDate = useMemo(() => getTodayDate(), []);

  useEffect(() => {
    if (router.isReady && router.query.search) {
      setSearch(String(router.query.search));
    }
  }, [router.isReady, router.query.search]);
  useEffect(() => {
    if (!detailOrder) {
      setDeliveryDateDraft("");
      return;
    }

    const currentDeliveryDate = formatDate(detailOrder.delivery_date);
    setDeliveryDateDraft(currentDeliveryDate === "Sin fecha" ? "" : currentDeliveryDate);
  }, [detailOrder]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const monthRange = getMonthRange(selectedMonth);
        const dateFrom = isTodayMode
          ? todayDate
          : dateMode === "month" ? monthRange.dateFrom : customDateFrom;
        const dateTo = isTodayMode
          ? todayDate
          : dateMode === "month" ? monthRange.dateTo : customDateTo;
        const response = await ordersService.getOrders({
          page: 1,
          pageSize: isTodayMode ? 200 : 500,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudo cargar historico de pedidos");
          return;
        }

        const orderRows = normalizeRows(response.data?.items);
        setOrders(orderRows);
        setOrderId((currentOrderId) => {
          if (orderRows.some((order) => String(order.id) === String(currentOrderId))) {
            return currentOrderId;
          }

          return orderRows[0]?.id ? String(orderRows[0].id) : "";
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar historico de pedidos"));
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 250);
    return () => clearTimeout(timer);
  }, [customDateFrom, customDateTo, dateMode, isTodayMode, refreshKey, selectedMonth, todayDate]);

  const dateScopedOrders = useMemo(
    () => showCancelled ? orders : orders.filter((order) => order.status !== "cancelled"),
    [orders, showCancelled]
  );
  const orderDayGroups = useMemo(() => buildOrderDayGroups(dateScopedOrders), [dateScopedOrders]);
  const dailyOrderNumberById = useMemo(
    () =>
      orderDayGroups.reduce((acc, group) => {
        Object.assign(acc, group.numberById);
        return acc;
      }, {}),
    [orderDayGroups]
  );
  const filteredOrders = useMemo(
    () => dateScopedOrders.filter((order) => orderMatchesSearch(order, search, dailyOrderNumberById)),
    [dateScopedOrders, dailyOrderNumberById, search]
  );
  const filteredOrderDayGroups = useMemo(() => buildOrderDayGroups(filteredOrders), [filteredOrders]);
  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => String(order.id) === String(orderId)) || null,
    [filteredOrders, orderId]
  );

  useEffect(() => {
    if (filteredOrders.some((order) => String(order.id) === String(orderId))) {
      return;
    }

    setOrderId(filteredOrders[0]?.id ? String(filteredOrders[0].id) : "");
  }, [filteredOrders, orderId]);

  const canCancel = isAdministrator && ["draft", "confirmed", "dispatched", "delivered"].includes(selectedOrder?.status);
  const draftOrders = filteredOrders.filter((order) => order.status === "draft").length;
  const dispatchedOrders = filteredOrders.filter((order) => order.status === "dispatched").length;
  const cancelledOrders = filteredOrders.filter((order) => order.status === "cancelled").length;
  const totalAmount = filteredOrders.reduce((acc, order) => acc + Number(order.amount_to_collect ?? order.grand_total ?? 0), 0);
  const selectedDailyNumber = selectedOrder ? dailyOrderNumberById[String(selectedOrder.id)] : null;

  const openOrderDetail = async (order) => {
    setOrderId(String(order.id));
    setDetailOrder(order);
    setDetailItems([]);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await ordersService.getOrderItems(Number(order.id));
      if (response?.code !== 1) {
        setError(response?.message || "No se pudieron cargar los detalles del pedido");
        return;
      }

      const itemRows = normalizeRows(response.data?.items);
      setDetailItems(itemRows);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar detalles del pedido"));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshOrderDetail = async (order = detailOrder) => {
    if (!order) {
      return;
    }

    setDetailLoading(true);
    try {
      const response = await ordersService.getOrderItems(Number(order.id));
      if (response?.code !== 1) {
        setError(response?.message || "No se pudieron cargar los detalles del pedido");
        toast.error(response?.message || "No se pudieron cargar los detalles del pedido");
        return;
      }

      const itemRows = normalizeRows(response.data?.items);
      setDetailItems(itemRows);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Error de red al cargar detalles del pedido");
      setError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  };


  const saveDeliveryDate = async () => {
    if (!detailOrder || deliveryDateSaving) {
      return;
    }

    const nextDate = String(deliveryDateDraft || "").slice(0, 10);
    const orderDate = formatDate(detailOrder.order_date);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      toast.error("Selecciona una fecha de entrega valida");
      return;
    }

    if (orderDate !== "Sin fecha" && nextDate < orderDate) {
      toast.error("La fecha de entrega no puede ser menor a la fecha del pedido");
      return;
    }

    setDeliveryDateSaving(true);
    setError(null);

    try {
      const response = await ordersService.updateDeliveryDate(detailOrder.id, { delivery_date: nextDate });
      if (response?.code !== 1) {
        const message = getFriendlyOrderError(response?.message || "No se pudo actualizar la fecha de entrega");
        setError(message);
        toast.error(message);
        return;
      }

      const updatedFields = {
        delivery_date: nextDate,
        ...(detailOrder.status === "delivered"
          ? { actual_delivered_at: response.data?.actual_delivered_at || nextDate }
          : {}),
      };

      setDetailOrder((current) => (current ? { ...current, ...updatedFields } : current));
      setOrders((current) => current.map((order) => (
        String(order.id) === String(detailOrder.id) ? { ...order, ...updatedFields } : order
      )));
      setRefreshKey((value) => value + 1);
      toast.success(response?.message || "Fecha de entrega actualizada");
    } catch (requestError) {
      const message = getFriendlyOrderError(getErrorMessage(requestError, "Error de red al actualizar fecha de entrega"));
      setError(message);
      toast.error(message);
    } finally {
      setDeliveryDateSaving(false);
    }
  };

  const runOrderAction = async (action, targetOrderId = orderId) => {
    if (actionLoading) {
      return;
    }

    setError(null);
    setFieldErrors({});
    const parsedOrderId = Number(targetOrderId);

    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      setFieldErrors({ orderId: "Selecciona un pedido" });
      setError("Corrige los campos marcados");
      return;
    }

    if (action === "cancel" && cancelReason.trim().length < 5) {
      setFieldErrors({ cancelReason: "Para cancelar indica un motivo de al menos 5 caracteres" });
      setError("Corrige los campos marcados");
      return;
    }

    setActionLoading(true);
    try {
      let result = null;

      if (action === "confirm") {
        result = await ordersService.confirmOrder(parsedOrderId);
      }

      if (action === "dispatch") {
        result = await ordersService.dispatchOrder(parsedOrderId);
      }

      if (action === "deliver") {
        result = await ordersService.deliverOrder(parsedOrderId);
      }

      if (action === "cancel") {
        result = await ordersService.cancelOrder(parsedOrderId, { p_reason: cancelReason.trim() || null });
      }

      if (result?.code !== 1) {
        const message = getFriendlyOrderError(result?.message || "No se pudo ejecutar la accion de pedido");
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(result?.message || "Accion aplicada correctamente");
      if (action === "cancel") {
        setCancelDialogOpen(false);
        setCancelReason("");
      }
      if (["dispatch", "deliver"].includes(action) && detailOpen) {
        setDetailOpen(false);
      }
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      const message = getFriendlyOrderError(getErrorMessage(requestError, "Error de red al ejecutar accion de pedido"));
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const closeActionMenu = () => setActionMenu({ anchorEl: null, order: null });

  const openRowDelete = () => {
    const order = actionMenu.order;
    closeActionMenu();
    if (!order) return;
    setOrderId(String(order.id));
    setCancelReason("");
    setFieldErrors({});
    setCancelDialogOpen(true);
  };

  const runRowNextStep = async () => {
    const order = actionMenu.order;
    const nextStep = getOrderNextStep(order);
    closeActionMenu();
    if (!order) return;

    if (["confirm", "dispatch", "deliver"].includes(nextStep.action)) {
      await runOrderAction(nextStep.action, order.id);
      return;
    }

    await openOrderDetail(order);
  };

  const handlePrintConfirmed = (orderId) => {
    const printedAt = new Date().toISOString();
    setOrders((current) => current.map((order) => (
      String(order.id) === String(orderId)
        ? {
            ...order,
            print_count: Number(order.print_count || 0) + 1,
            last_printed_at: printedAt,
          }
        : order
    )));
    setRefreshKey((value) => value + 1);
  };

  return (
    <FlowPageLayout
      title={isTodayMode ? "Pedidos - Gestion diaria" : "Pedidos - Historial"}
      subtitle={isTodayMode ? "Gestiona solo los pedidos del dia actual" : "Consulta pedidos por fecha, cliente o vendedor"}
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 2.5 },
          mb: 2,
          bgcolor: "background.paper",
        }}
      >
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid item xs={12} md={isTodayMode ? 7 : 4}>
            <TextField
              fullWidth
              label="Buscar pedido, cliente o vendedor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Grid>
          {!isTodayMode ? (
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                label="Consultar por"
                value={dateMode}
                onChange={(event) => setDateMode(event.target.value)}
              >
                <MenuItem value="month">Mes</MenuItem>
                <MenuItem value="range">Rango personalizado</MenuItem>
              </TextField>
            </Grid>
          ) : null}
          {!isTodayMode && dateMode === "month" ? (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="month"
                label="Mes"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          ) : null}
          {!isTodayMode && dateMode === "range" ? (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Desde"
                  value={customDateFrom}
                  onChange={(event) => setCustomDateFrom(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Hasta"
                  value={customDateTo}
                  onChange={(event) => setCustomDateTo(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          ) : null}
          {!isTodayMode ? (
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={<Checkbox checked={showCancelled} onChange={(event) => setShowCancelled(event.target.checked)} />}
                label="Mostrar eliminados"
              />
            </Grid>
          ) : null}
          <Grid item xs={12} md={isTodayMode ? 5 : 12}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: "flex-start", md: "flex-end" }, flexWrap: "wrap" }}>
              <Chip color="secondary" label={isTodayMode ? todayDate : dateMode === "month" ? selectedMonth : `${customDateFrom || "Inicio"} a ${customDateTo || "Hoy"}`} />
              <Chip variant="outlined" label={`${filteredOrders.length} pedido(s)`} />
              <Chip variant="outlined" color={draftOrders ? "warning" : "success"} label={`${draftOrders} borrador`} />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <SummaryCard label={isTodayMode ? "Pedidos de hoy" : "Pedidos visibles"} value={filteredOrders.length} helper={`${draftOrders} borrador`} color={draftOrders ? "warning" : "success"} />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard label="Despachados" value={dispatchedOrders} helper="Ya impactaron inventario" color="success" />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard label="Cancelados" value={cancelledOrders} helper="Sin entrega activa" color={cancelledOrders ? "error" : "default"} />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard label="Valor listado" value={formatMoney(totalAmount)} helper="Segun busqueda actual" color="info" />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 4, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {isTodayMode ? `Listado de pedidos de hoy (${todayDate})` : "Listado de pedidos"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isTodayMode
                ? "Consulta, imprime, edita o avanza cada pedido desde su fila."
                : "Filtra por fecha, cliente o vendedor y administra cada pedido desde su fila."}
            </Typography>
          </Stack>
          <Chip label={`${filteredOrders.length} pedidos`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando pedidos...</Alert> : null}
        {!loading && filteredOrders.length === 0 ? (
          <Alert severity="info">
            {isTodayMode ? "No hay pedidos para el dia actual." : "No hay pedidos para el filtro seleccionado."}
          </Alert>
        ) : null}

        <TableContainer
          sx={{
            display: { xs: "none", md: "block" },
            overflowX: "auto",
            border: 1,
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <Table
            sx={{
              minWidth: 1060,
              "& thead th": {
                bgcolor: "background.default",
                fontWeight: 900,
                color: "text.secondary",
                borderBottom: "1px solid",
                borderColor: "divider",
              },
            }}
            aria-label="Pedidos recientes"
          >
            <TableHead>
              <TableRow>
                <TableCell>N.º pedido</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Vendedor</TableCell>
                <TableCell>Fecha y hora</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Impreso</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrderDayGroups.map((group) => (
                <Fragment key={group.day}>
                  {group.orders.map((order) => {
                    const dailyNumber = dailyOrderNumberById[String(order.id)];

                    return (
                      <TableRow
                        hover
                        key={order.id}
                        sx={{
                          bgcolor: "background.paper",
                          "& td": { py: 1.5, verticalAlign: "middle" },
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 900 }}>#{order.id}</Typography>
                          <Typography variant="caption" color="text.secondary">Del día #{dailyNumber}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 190 }}>
                          <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                            {order.customer_name || "Cliente"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pedido: {formatDate(order.order_date)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                            {order.sales_agent_name || "Sin vendedor"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <Typography sx={{ fontWeight: 800 }}>{formatDateTime(order.created_at || order.order_date)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 900, fontSize: 17 }}>{formatMoney(order.amount_to_collect ?? order.grand_total)}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            status={order.status}
                            interactive
                            onClick={(event) => {
                              event.stopPropagation();
                              setOrderId(String(order.id));
                              setActionMenu({ anchorEl: event.currentTarget, order });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{getPrintLabel(order)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center", flexWrap: "nowrap" }}>
                            <OrderPrintManager
                              order={order}
                              compact
                              triggerLabel="Imprimir"
                              onConfirmed={() => handlePrintConfirmed(order.id)}
                            />
                            <AppButton
                              size="small"
                              color="secondary"
                              variant="outlined"
                              onClick={(event) => {
                                event.stopPropagation();
                                openOrderDetail(order);
                              }}
                            >
                              {["draft", "confirmed", "ready", "dispatched", "delivered"].includes(order.status) ? "Editar" : "Ver detalle"}
                            </AppButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
          {filteredOrders.map((order) => {
            const dailyNumber = dailyOrderNumberById[String(order.id)];

            return (
              <Paper key={order.id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>Pedido #{dailyNumber}</Typography>
                      <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{order.customer_name || "Cliente"}</Typography>
                    </Box>
                    <StatusChip
                      status={order.status}
                      interactive
                      onClick={(event) => {
                        setOrderId(String(order.id));
                        setActionMenu({ anchorEl: event.currentTarget, order });
                      }}
                    />
                  </Stack>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}><OrderMetric label="Vendedor" value={order.sales_agent_name || "Sin vendedor"} /></Grid>
                    <Grid item xs={6}><OrderMetric label="Fecha y hora" value={formatDateTime(order.created_at || order.order_date)} /></Grid>
                    <Grid item xs={6}><OrderMetric label="Total" value={formatMoney(order.amount_to_collect ?? order.grand_total)} /></Grid>
                    <Grid item xs={6}><OrderMetric label="Impreso" value={getPrintLabel(order)} /></Grid>
                  </Grid>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    <OrderPrintManager
                      order={order}
                      compact
                      triggerLabel="Imprimir"
                      onConfirmed={() => handlePrintConfirmed(order.id)}
                    />
                    <AppButton size="small" color="secondary" variant="outlined" onClick={() => openOrderDetail(order)}>
                      {["draft", "confirmed", "ready", "dispatched", "delivered"].includes(order.status) ? "Editar" : "Ver detalle"}
                    </AppButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>

      <Menu
        anchorEl={actionMenu.anchorEl}
        open={Boolean(actionMenu.anchorEl)}
        onClose={closeActionMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled sx={{ opacity: "1 !important", fontWeight: 900 }}>
          Estado actual: {statusLabels[actionMenu.order?.status] || "-"}
        </MenuItem>
        {!["detail", "view-production"].includes(getOrderNextStep(actionMenu.order).action) ? (
          <MenuItem onClick={runRowNextStep} disabled={actionLoading}>
            {getOrderNextStep(actionMenu.order).label}
          </MenuItem>
        ) : null}
        {isAdministrator && ["draft", "confirmed", "dispatched", "delivered"].includes(actionMenu.order?.status) ? (
          <MenuItem onClick={openRowDelete} sx={{ color: "error.main" }}>Eliminar pedido</MenuItem>
        ) : null}
      </Menu>

      <Dialog open={cancelDialogOpen} onClose={() => !actionLoading && setCancelDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Eliminar pedido {selectedOrder ? `del dia #${selectedDailyNumber || "-"}` : ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              El pedido quedará eliminado de la vista habitual, pero se conservará en auditoría. Si ya afectó el inventario, sus unidades se devolverán automáticamente y la comisión quedará cancelada.
            </Alert>
            <TextField
              fullWidth
              label="Motivo de eliminacion"
              value={cancelReason}
              onChange={(event) => {
                setFieldErrors((prev) => ({ ...prev, cancelReason: null }));
                setCancelReason(event.target.value);
              }}
              error={Boolean(fieldErrors.cancelReason)}
              helperText={fieldErrors.cancelReason || "Minimo 5 caracteres"}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" color="secondary" onClick={() => setCancelDialogOpen(false)} disabled={actionLoading}>
            Volver
          </AppButton>
          <AppButton color="error" onClick={() => runOrderAction("cancel")} disabled={actionLoading || !canCancel}>
            {actionLoading ? "Eliminando..." : "Confirmar eliminacion"}
          </AppButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            m: { xs: 1, sm: 2 },
            width: { xs: "calc(100% - 16px)", sm: "calc(100% - 32px)" },
            maxHeight: { xs: "calc(100% - 16px)", sm: "calc(100% - 32px)" },
          },
        }}
      >
        <DialogTitle>
          {detailOrder
            ? `${["draft", "confirmed", "ready", "dispatched", "delivered"].includes(detailOrder.status) ? "Editar" : "Detalle"} pedido #${detailOrder.id}`
            : "Detalle pedido"}
        </DialogTitle>
        <DialogContent dividers>
          {detailOrder ? (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 2.5 }, bgcolor: "background.default" }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: 0, flex: 1, alignItems: { sm: "flex-start" } }}>
                      <OrderCustomerEditor
                        order={detailOrder}
                        onSaved={async (customer) => {
                          const updatedCustomer = {
                            customer_id: customer.id,
                            customer_name: customer.name,
                            customer_identification: customer.tax_id,
                            customer_phone: customer.phone,
                            customer_address: customer.address,
                            customer_neighborhood: customer.neighborhood,
                          };
                          setDetailOrder((current) => current ? { ...current, ...updatedCustomer } : current);
                          setOrders((current) => current.map((item) => (
                            String(item.id) === String(detailOrder.id) ? { ...item, ...updatedCustomer } : item
                          )));
                          setRefreshKey((value) => value + 1);
                        }}
                      />
                      <StatusChip status={detailOrder.status} />
                    </Stack>
                    <Box sx={{ minWidth: { md: 170 } }}>
                      <Typography variant="caption" color="text.secondary">Total a cobrar</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        {formatMoney(detailOrder.amount_to_collect ?? detailOrder.grand_total)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Grid container spacing={2} sx={{ alignItems: "center" }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <OrderMetric label="Fecha pedido" value={formatDate(detailOrder.order_date)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Fecha de entrega"
                        type="date"
                        value={deliveryDateDraft}
                        onChange={(event) => setDeliveryDateDraft(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: formatDate(detailOrder.order_date) }}
                        disabled={deliveryDateSaving || detailOrder.status === "cancelled"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <AppButton
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={saveDeliveryDate}
                        disabled={deliveryDateSaving || detailOrder.status === "cancelled" || !deliveryDateDraft || deliveryDateDraft === formatDate(detailOrder.delivery_date)}
                      >
                        {deliveryDateSaving ? "Guardando..." : "Guardar fecha"}
                      </AppButton>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <OrderMetric label="Vendedor" value={detailOrder.sales_agent_name || "Sin vendedor"} />
                    </Grid>
                  </Grid>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                      {detailOrder.notes ? `Notas: ${detailOrder.notes}` : "Sin notas"}
                    </Typography>
                    <OrderPrintManager
                      order={detailOrder}
                      onConfirmed={async () => {
                        setRefreshKey((value) => value + 1);
                        setDetailOrder((current) => current
                          ? { ...current, print_count: Number(current.print_count || 0) + 1, last_printed_at: new Date().toISOString() }
                          : current);
                      }}
                    />
                  </Stack>
                </Stack>
              </Paper>

              <OrderDetailEditor
                order={detailOrder}
                items={detailItems}
                loading={detailLoading}
                onRefresh={async () => {
                  await refreshOrderDetail(detailOrder);
                  setRefreshKey((value) => value + 1);
                }}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setDetailOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default OrdersHistoryPage;

