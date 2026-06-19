import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";
import OrderDetailEditor from "components/organisms/orders/OrderDetailEditor";
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

const SummaryCard = ({ label, value, helper, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Chip label={helper} color={color} variant="outlined" sx={{ alignSelf: "flex-start" }} />
    </Stack>
  </Paper>
);

const StatusChip = ({ status, sx }) => (
  <Chip
    size="small"
    label={statusLabels[status] || status || "-"}
    color={statusColors[status] || "default"}
    variant={status === "draft" ? "outlined" : "filled"}
    sx={{ minWidth: 96, maxWidth: "100%", ...sx }}
  />
);

const isReadyToDispatch = (order) =>
  ["confirmed", "ready"].includes(order?.status);

const getOrderNextStep = (order) => {
  if (!order) {
    return { label: "Selecciona un pedido", description: "Abre un pedido para revisar su estado.", severity: "info" };
  }

  if (order.status === "draft") {
    return { label: "Confirmar pedido", description: "Valida los productos antes de habilitar el despacho desde inventario.", severity: "warning", action: "confirm" };
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
      description: "El pedido no debe seguir a produccion ni despacho. Si habia una orden de produccion pendiente, revisala manualmente.",
      actionHref: "/production/orders",
      actionLabel: "Revisar produccion",
    };
  }

  return {
    severity: "info",
    title: "Estado operativo",
    description: "Revisa el estado del pedido antes de producir, despachar o ajustar inventario.",
  };
};

const OrdersHistoryPage = () => {
  const router = useRouter();
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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (router.isReady && router.query.search) {
      setSearch(String(router.query.search));
    }
  }, [router.isReady, router.query.search]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await ordersService.getOrders({ page: 1, pageSize: 40, search });
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
  }, [search, refreshKey]);

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.id) === String(orderId)) || null,
    [orderId, orders]
  );
  const canConfirm = selectedOrder?.status === "draft";
  const canDispatch =
    selectedOrder?.status === "confirmed" ||
    isReadyToDispatch(selectedOrder);
  const canDeliver = selectedOrder?.status === "dispatched";
  const canCancel = selectedOrder?.status === "draft" || selectedOrder?.status === "confirmed";
  const draftOrders = orders.filter((order) => order.status === "draft").length;
  const dispatchedOrders = orders.filter((order) => order.status === "dispatched").length;
  const cancelledOrders = orders.filter((order) => order.status === "cancelled").length;
  const totalAmount = orders.reduce((acc, order) => acc + Number(order.grand_total || 0), 0);

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

  const runCardAction = async (event, order, nextStep) => {
    event.stopPropagation();
    setOrderId(String(order.id));

    if (nextStep.action === "confirm") {
      await runOrderAction("confirm", order.id);
      return;
    }

    if (nextStep.action === "dispatch") {
      await runOrderAction("dispatch", order.id);
      return;
    }

    if (nextStep.action === "deliver") {
      await runOrderAction("deliver", order.id);
      return;
    }

    await openOrderDetail(order);
  };

  return (
    <FlowPageLayout title="Pedidos - Historico" subtitle="Consulta y acciones de pedidos recientes">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Buscar pedido, cliente o vendedor" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <SummaryCard label="Pedidos recientes" value={orders.length} helper={`${draftOrders} borrador`} color={draftOrders ? "warning" : "success"} />
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

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ flexWrap: "wrap" }}>
            <OrderMetric label="Pedido" value={selectedOrder ? `#${selectedOrder.id}` : "Selecciona un pedido"} />
            <OrderMetric label="Cliente" value={selectedOrder?.customer_name} />
            <OrderMetric label="Fecha" value={formatDate(selectedOrder?.order_date)} />
            <OrderMetric label="Vendedor" value={selectedOrder?.sales_agent_name || "Sin vendedor"} />
            <OrderMetric label="Total" value={formatMoney(selectedOrder?.grand_total)} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Estado
              </Typography>
              <Box sx={{ mt: 0.25 }}>
                <StatusChip status={selectedOrder?.status} />
              </Box>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <AppButton color="secondary" onClick={() => runOrderAction("confirm")} disabled={actionLoading || !canConfirm}>Confirmar</AppButton>
            <AppButton color="secondary" variant="outlined" onClick={() => runOrderAction("dispatch")} disabled={actionLoading || !canDispatch}>Despachar</AppButton>
            <AppButton color="secondary" onClick={() => runOrderAction("deliver")} disabled={actionLoading || !canDeliver}>Confirmar entrega</AppButton>
            <AppButton color="error" variant="outlined" onClick={() => setCancelDialogOpen(true)} disabled={actionLoading || !canCancel}>Cancelar</AppButton>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Pedidos recientes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selecciona un pedido para confirmarlo, despacharlo, confirmar su entrega, cancelarlo o ver sus items.
            </Typography>
          </Stack>
          <Chip label={`${orders.length} pedidos`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando pedidos...</Alert> : null}
        {!loading && orders.length === 0 ? <Alert severity="info">No hay pedidos recientes.</Alert> : null}

        <Grid container spacing={2}>
          {orders.map((order) => {
            const isSelected = String(order.id) === String(orderId);
            const nextStep = getOrderNextStep(order);
            const progress =
              order.status === "cancelled"
                ? 0
                : order.status === "delivered"
                ? 100
                : order.status === "dispatched"
                ? 90
                : order.status === "ready"
                ? 85
                : order.status === "in_production"
                ? Number(order.production_pending_items || 0) === 0
                  ? 85
                  : 70
                : order.status === "confirmed"
                ? 60
                : 25;

            return (
              <Grid item xs={12} md={6} xl={4} key={order.id}>
                <Paper
                  variant="outlined"
                  onClick={() => setOrderId(String(order.id))}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    height: "100%",
                    cursor: "pointer",
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "action.selected" : "background.paper",
                  }}
                >
                  <Stack spacing={2} sx={{ height: "100%" }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                          Pedido #{order.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {order.customer_name || "Cliente"} - {formatDate(order.order_date)}
                        </Typography>
                      </Stack>
                      <StatusChip status={order.status} />
                    </Stack>

                    <Box>
                      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
                        <Typography variant="body2" color="text.secondary">
                          Flujo del pedido
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        color={order.status === "cancelled" ? "error" : "primary"}
                        sx={{
                          height: 8,
                          borderRadius: 999,
                          bgcolor: "action.hover",
                          "& .MuiLinearProgress-bar": { borderRadius: 999 },
                        }}
                      />
                    </Box>

                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <OrderMetric label="Vendedor" value={order.sales_agent_name || "Sin vendedor"} />
                      </Grid>
                      <Grid item xs={4}>
                        <OrderMetric label="Entrega" value={formatDate(order.delivery_date)} />
                      </Grid>
                      <Grid item xs={4}>
                        <OrderMetric label="Total" value={formatMoney(order.grand_total)} />
                      </Grid>
                    </Grid>

                    <Box sx={{ flex: 1 }} />

                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                      <AppButton
                        size="small"
                        color="secondary"
                        variant={["detail", "view-production"].includes(nextStep.action) ? "outlined" : "contained"}
                        onClick={(event) => runCardAction(event, order, nextStep)}
                        disabled={actionLoading}
                      >
                        {nextStep.label}
                      </AppButton>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          openOrderDetail(order);
                        }}
                      >
                        Detalle
                      </Button>
                      {isSelected ? <Chip size="small" color="primary" label="Seleccionado" variant="outlined" /> : null}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Dialog open={cancelDialogOpen} onClose={() => !actionLoading && setCancelDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cancelar pedido {selectedOrder ? `#${selectedOrder.id}` : ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              Solo se pueden cancelar pedidos en borrador o confirmados. Si ya fue despachado, debe manejarse como ajuste o devolucion.
            </Alert>
            <TextField
              fullWidth
              label="Motivo de cancelacion"
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
            {actionLoading ? "Cancelando..." : "Confirmar cancelacion"}
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
          {detailOrder ? `Detalle pedido #${detailOrder.id}` : "Detalle pedido"}
        </DialogTitle>
        <DialogContent dividers>
          {detailOrder ? (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <OrderMetric label="Cliente" value={detailOrder.customer_name} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <OrderMetric label="Sucursal" value={detailOrder.branch_name} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <OrderMetric label="Vendedor" value={detailOrder.sales_agent_name || "Sin vendedor"} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <OrderMetric label="Fecha pedido" value={formatDate(detailOrder.order_date)} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <OrderMetric label="Fecha entrega" value={formatDate(detailOrder.delivery_date)} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Estado
                    </Typography>
                    <Box sx={{ mt: 0.25 }}>
                      <StatusChip status={detailOrder.status} />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <OrderMetric label="Total" value={formatMoney(detailOrder.grand_total)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <OrderMetric
                    label="Ultima impresion"
                    value={detailOrder.last_printed_at
                      ? `${detailOrder.last_printed_by_name || "Usuario"} - ${new Date(detailOrder.last_printed_at).toLocaleString("es-CO")}`
                      : "Sin impresiones confirmadas"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <OrderPrintManager
                    order={detailOrder}
                    onConfirmed={async () => {
                      setRefreshKey((value) => value + 1);
                      setDetailOrder((current) => current
                        ? {
                            ...current,
                            print_count: Number(current.print_count || 0) + 1,
                            last_printed_at: new Date().toISOString(),
                          }
                        : current);
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <OrderMetric label="Notas" value={detailOrder.notes || "Sin notas"} />
                </Grid>
              </Grid>

              <OrderTrace order={detailOrder} />

              {(() => {
                const insight = getOperationalInsight(detailOrder, detailItems);
                const readyToDispatch = isReadyToDispatch(detailOrder);

                return (
                  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: "background.default" }}>
                    <Stack spacing={2}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "flex-start" } }}>
                        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>
                              Impacto operativo
                            </Typography>
                            <Chip
                              size="small"
                              label={["dispatched", "delivered"].includes(detailOrder.status) ? "Inventario afectado" : "Inventario sin salida"}
                              color={["dispatched", "delivered"].includes(detailOrder.status) ? "success" : "default"}
                              variant="outlined"
                            />
                            {readyToDispatch ? <Chip size="small" color="success" label="Listo para despachar" /> : null}
                          </Stack>
                          <Alert severity={insight.severity}>
                            <Typography sx={{ fontWeight: 800 }}>{insight.title}</Typography>
                            <Typography variant="body2">{insight.description}</Typography>
                          </Alert>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1} sx={{ minWidth: { md: 190 } }}>
                          {insight.actionHref ? (
                            <Button component={Link} href={insight.actionHref} variant="outlined" color="secondary">
                              {insight.actionLabel}
                            </Button>
                          ) : null}
                          {readyToDispatch ? (
                            <AppButton color="secondary" onClick={() => runOrderAction("dispatch")} disabled={actionLoading}>
                              {actionLoading ? "Despachando..." : "Despachar pedido"}
                            </AppButton>
                          ) : null}
                          {detailOrder.status === "dispatched" ? (
                            <AppButton color="secondary" onClick={() => runOrderAction("deliver")} disabled={actionLoading}>
                              {actionLoading ? "Confirmando..." : "Confirmar entrega"}
                            </AppButton>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })()}

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
