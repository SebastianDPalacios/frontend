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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const formatDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  return String(value).slice(0, 10);
};

const formatMoney = (value) => currencyFormatter.format(Number(value || 0));
const formatNumber = (value) => numberFormatter.format(Number(value || 0));

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

const getProductionProgress = (order) => {
  const planned = Number(order?.production_planned_qty || 0);
  if (planned <= 0) {
    return 0;
  }

  return Math.min(Math.round((Number(order?.production_produced_qty || 0) / planned) * 100), 100);
};

const isReadyToDispatch = (order) =>
  order?.status === "ready" ||
  (order?.status === "in_production" &&
    order?.production_order_id &&
    order?.production_status === "completed" &&
    Number(order?.production_pending_items || 0) === 0);

const getOrderNextStep = (order) => {
  if (!order) {
    return { label: "Selecciona un pedido", description: "Abre un pedido para revisar su estado.", severity: "info" };
  }

  if (order.status === "draft") {
    return { label: "Confirmar pedido", description: "Valida los productos y confirma para pasar a produccion.", severity: "warning", action: "confirm" };
  }

  if (order.status === "confirmed") {
    return { label: "Crear produccion", description: "Planifica la orden de produccion desde este pedido.", severity: "info", action: "production" };
  }

  if (order.status === "in_production") {
    if (isReadyToDispatch(order)) {
      return { label: "Despachar pedido", description: "La produccion esta completa y el pedido puede salir.", severity: "success", action: "dispatch" };
    }

    return { label: "Ver produccion", description: "Revisa avances y pendientes de la orden vinculada.", severity: "info", action: "view-production" };
  }

  if (order.status === "ready") {
    return { label: "Despachar pedido", description: "El pedido esta listo para descontar inventario.", severity: "success", action: "dispatch" };
  }

  if (order.status === "dispatched" || order.status === "delivered") {
    return { label: "Pedido despachado", description: "Ya impacto inventario. Solo queda consulta o trazabilidad.", severity: "success", action: "detail" };
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

  const isConfirmed = ["confirmed", "in_production", "ready", "dispatched", "delivered"].includes(order?.status);
  const hasProduction = Boolean(order?.production_order_id);
  const productionDone =
    hasProduction &&
    order?.production_status === "completed" &&
    Number(order?.production_pending_items || 0) === 0;
  const isReady = order?.status === "ready" || order?.status === "dispatched" || order?.status === "delivered" || isReadyToDispatch(order);
  const isDispatched = order?.status === "dispatched" || order?.status === "delivered";

  return [
    { label: "Pedido", helper: "Creado", state: "done" },
    {
      label: "Confirmado",
      helper: isConfirmed ? "Validado" : "Pendiente",
      state: isConfirmed ? "done" : order?.status === "draft" ? "active" : "pending",
    },
    {
      label: "Produccion",
      helper: hasProduction ? `Orden #${order.production_order_id}` : "Sin orden",
      state: productionDone ? "done" : hasProduction ? "active" : "pending",
    },
    {
      label: "Listo",
      helper: isReady ? "Para despacho" : "Pendiente",
      state: isReady ? "done" : "pending",
    },
    {
      label: "Despachado",
      helper: isDispatched ? "Inventario afectado" : "Pendiente",
      state: isDispatched ? "done" : "pending",
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
  const productionOrderId = order?.production_order_id;

  if (!order) {
    return {
      severity: "info",
      title: "Selecciona un pedido",
      description: "Abre el detalle para revisar si el pedido esta listo para produccion o inventario.",
    };
  }

  if (productionOrderId) {
    const producedQty = Number(order.production_produced_qty || 0);
    const plannedQty = Number(order.production_planned_qty || 0);
    const pendingItems = Number(order.production_pending_items || 0);

    return {
      severity: pendingItems > 0 ? "info" : "success",
      title: `Produccion vinculada #${productionOrderId}`,
      description: pendingItems > 0
        ? `La orden esta vinculada al pedido. Avance: ${producedQty} de ${plannedQty}. Pendientes: ${pendingItems}.`
        : `La produccion vinculada ya no tiene pendientes. Producido: ${producedQty} de ${plannedQty}.`,
      actionHref: `/production/orders?search=${productionOrderId}`,
      actionLabel: "Ver produccion",
    };
  }

  if (order.status === "draft") {
    return {
      severity: itemsCount > 0 ? "info" : "warning",
      title: "Aun no impacta produccion",
      description: itemsCount > 0
        ? "El pedido sigue en borrador. Puedes editar items antes de confirmarlo."
        : "Agrega productos antes de confirmar el pedido.",
    };
  }

  if (order.status === "confirmed") {
    return {
      severity: "info",
      title: "Listo para planificar produccion",
      description: "El pedido esta confirmado. Actualmente la orden de produccion se crea manualmente desde Produccion.",
      actionHref: "/production/orders",
      actionLabel: "Ir a produccion",
    };
  }

  if (order.status === "in_production" || order.status === "ready") {
    return {
      severity: "warning",
      title: "Revisar avance de produccion",
      description: "El pedido esta en produccion, pero no se encontro una orden vinculada. Valida si fue creada antes de ejecutar la migracion de vinculo.",
      actionHref: "/production/orders",
      actionLabel: "Ver produccion",
    };
  }

  if (order.status === "dispatched" || order.status === "delivered") {
    return {
      severity: "success",
      title: "Ya impacto inventario",
      description: "Este pedido ya fue despachado. Cualquier cambio debe manejarse como ajuste, devolucion o nuevo movimiento.",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailQuantities, setDetailQuantities] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);
  const [orderId, setOrderId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [creatingProduction, setCreatingProduction] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  const canCancel = selectedOrder?.status === "draft" || selectedOrder?.status === "confirmed";
  const canCreateProduction = detailOrder?.status === "confirmed" && detailItems.length > 0;
  const canEditDetail = detailOrder?.status === "draft";
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
      setDetailQuantities(
        itemRows.reduce((acc, item) => {
          acc[item.id] = String(Number(item.quantity || 0));
          return acc;
        }, {})
      );
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
      setDetailQuantities(
        itemRows.reduce((acc, item) => {
          acc[item.id] = String(Number(item.quantity || 0));
          return acc;
        }, {})
      );
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Error de red al cargar detalles del pedido");
      setError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetailItem = async (item, overrideQuantity = null) => {
    if (savingItemId || !detailOrder) {
      return;
    }

    const quantity = overrideQuantity === null ? Number(detailQuantities[item.id] || 0) : Number(overrideQuantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error("La cantidad no puede ser negativa");
      return;
    }

    setSavingItemId(item.id);
    setError(null);
    try {
      const result = await ordersService.upsertItem(Number(detailOrder.id), {
        p_product_id: Number(item.product_id),
        p_quantity: quantity,
      });

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo actualizar el item");
        toast.error(result?.message || "No se pudo actualizar el item");
        return;
      }

      toast.success(result?.message || "Item actualizado");
      await refreshOrderDetail(detailOrder);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Error de red al actualizar item");
      setError(message);
      toast.error(message);
    } finally {
      setSavingItemId(null);
    }
  };

  const createProductionForOrder = async (order) => {
    if (creatingProduction || !order) {
      return;
    }

    setCreatingProduction(true);
    setError(null);
    try {
      const result = await ordersService.createProduction(Number(order.id), {
        p_planned_date: formatDate(order.delivery_date || order.order_date),
      });

      if (result?.code !== 1) {
        const message = getFriendlyOrderError(result?.message || "No se pudo crear la orden de produccion");
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(result?.message || "Orden de produccion creada");
      setDetailOpen(false);
      setRefreshKey((value) => value + 1);
      window.location.href = `/production/orders?search=${encodeURIComponent(result?.data?.production_order_id || order.id)}`;
    } catch (requestError) {
      const message = getFriendlyOrderError(getErrorMessage(requestError, "Error de red al crear produccion"));
      setError(message);
      toast.error(message);
    } finally {
      setCreatingProduction(false);
    }
  };

  const createProductionForDetailOrder = async () => createProductionForOrder(detailOrder);

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

    if (nextStep.action === "production") {
      await createProductionForOrder(order);
      return;
    }

    if (nextStep.action === "view-production" && order.production_order_id) {
      window.location.href = `/production/orders?search=${encodeURIComponent(order.production_order_id)}`;
      return;
    }

    await openOrderDetail(order);
  };

  return (
    <FlowPageLayout title="Pedidos - Historico" subtitle="Consulta y acciones de pedidos recientes">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Buscar pedido, cliente o ruta" value={search} onChange={(event) => setSearch(event.target.value)} />
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
            <OrderMetric label="Ruta" value={selectedOrder?.route_name || "Sin ruta"} />
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
              Selecciona un pedido para confirmarlo, despacharlo, cancelarlo o ver sus items.
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
                : ["dispatched", "delivered"].includes(order.status)
                ? 100
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
                        <OrderMetric label="Ruta" value={order.route_name || "Sin ruta"} />
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
                        disabled={actionLoading || creatingProduction}
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

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
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
                  <OrderMetric label="Ruta" value={detailOrder.route_name || "Sin ruta"} />
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
                <Grid item xs={12}>
                  <OrderMetric label="Notas" value={detailOrder.notes || "Sin notas"} />
                </Grid>
              </Grid>

              <OrderTrace order={detailOrder} />

              {(() => {
                const insight = getOperationalInsight(detailOrder, detailItems);
                const hasProduction = Boolean(detailOrder.production_order_id);
                const productionProgress = getProductionProgress(detailOrder);
                const pendingItems = Number(detailOrder.production_pending_items || 0);
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
                              label={hasProduction ? `Produccion #${detailOrder.production_order_id}` : "Produccion manual"}
                              color={hasProduction ? "info" : "default"}
                              variant="outlined"
                            />
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
                          {canCreateProduction ? (
                            <AppButton color="secondary" onClick={createProductionForDetailOrder} disabled={creatingProduction}>
                              {creatingProduction ? "Creando..." : "Crear orden de produccion"}
                            </AppButton>
                          ) : null}
                          {readyToDispatch ? (
                            <AppButton color="secondary" onClick={() => runOrderAction("dispatch")} disabled={actionLoading}>
                              {actionLoading ? "Despachando..." : "Despachar pedido"}
                            </AppButton>
                          ) : null}
                        </Stack>
                      </Stack>

                      {hasProduction ? (
                        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: "background.paper", overflow: "hidden" }}>
                          <Grid container spacing={2} sx={{ alignItems: "center" }}>
                            <Grid item xs={12} lg={4}>
                              <Stack spacing={0.75}>
                                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Avance de produccion
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                    {productionProgress}%
                                  </Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={productionProgress}
                                  sx={{
                                    height: 9,
                                    borderRadius: 999,
                                    bgcolor: "action.hover",
                                    "& .MuiLinearProgress-bar": { borderRadius: 999 },
                                  }}
                                />
                              </Stack>
                            </Grid>
                            <Grid item xs={6} sm={3} lg={2}>
                              <OrderMetric label="Planificado" value={formatNumber(detailOrder.production_planned_qty)} />
                            </Grid>
                            <Grid item xs={6} sm={3} lg={2}>
                              <OrderMetric label="Producido" value={formatNumber(detailOrder.production_produced_qty)} />
                            </Grid>
                            <Grid item xs={6} sm={3} lg={2}>
                              <OrderMetric label="Pendientes" value={formatNumber(pendingItems)} />
                            </Grid>
                            <Grid item xs={6} sm={3} lg={2}>
                              <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", lg: "flex-end" }, minWidth: 0 }}>
                                <StatusChip status={detailOrder.production_status} sx={{ minWidth: 0 }} />
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      ) : null}
                    </Stack>
                  </Paper>
                );
              })()}

              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Cantidad</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Precio</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Impuesto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Accion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell sx={{ width: 180 }}>
                          {canEditDetail ? (
                            <TextField
                              size="small"
                              type="number"
                              value={detailQuantities[item.id] ?? ""}
                              onChange={(event) => {
                                setDetailQuantities((current) => ({ ...current, [item.id]: event.target.value }));
                              }}
                              inputProps={{ min: 0, step: 0.001 }}
                              fullWidth
                            />
                          ) : (
                            Number(item.quantity || 0)
                          )}
                        </TableCell>
                        <TableCell>{formatMoney(item.unit_price)}</TableCell>
                        <TableCell>{Number(item.tax_percent || 0)}%</TableCell>
                        <TableCell>{formatMoney(item.line_total)}</TableCell>
                        <TableCell sx={{ width: 180 }}>
                          {canEditDetail ? (
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant="contained"
                                color="secondary"
                                onClick={() => saveDetailItem(item)}
                                disabled={savingItemId === item.id}
                              >
                                {savingItemId === item.id ? "..." : "Guardar"}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  setDetailQuantities((current) => ({ ...current, [item.id]: "0" }));
                                  saveDetailItem(item, 0);
                                }}
                                disabled={savingItemId === item.id}
                              >
                                Quitar
                              </Button>
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Bloqueado
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!detailLoading && detailItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>No hay items para este pedido</TableCell>
                      </TableRow>
                    ) : null}
                    {detailLoading ? (
                      <TableRow>
                        <TableCell colSpan={6}>Cargando items...</TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Box>

              {canEditDetail ? (
                <Alert severity="info">
                  Puedes ajustar cantidades porque el pedido esta en borrador. Usa cantidad 0 para quitar un producto.
                </Alert>
              ) : (
                <Alert severity="warning">
                  Este pedido ya no permite editar items porque no esta en borrador.
                </Alert>
              )}
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
