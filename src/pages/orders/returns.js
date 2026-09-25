import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import FlowPageLayout from "views/modules/FlowPageLayout";
import ordersService from "services/orders/orders-service";
import authService from "services/auth/auth-service";
import { isAdministrativeUser } from "configs/access";
import { normalizeRows } from "views/modules/flow-utils";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";

const reasonOptions = [
  { value: "expired", label: "Vencido" },
  { value: "mold", label: "Moho" },
  { value: "wet", label: "Mojado" },
  { value: "malformed", label: "Mal moldeado" },
  { value: "other", label: "Otro" },
];

const statusConfig = {
  pending_authorization: { label: "Pendiente de autorizacion", color: "warning" },
  completed: { label: "Autorizada con saldo", color: "success" },
  rejected: { label: "Rechazada", color: "error" },
  annulled: { label: "Anulada", color: "default" },
};

const commissionTreatmentLabels = {
  no_effect: "No afecta comisión",
  reduce: "Reduce comisión",
  replace_base: "Reemplaza la base comercial",
};

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 3 });

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const getDailyOrderNumbers = (orders) => {
  const dayMap = new Map();

  orders.forEach((order) => {
    const day = formatDate(order.order_date || order.actual_delivered_at || order.reported_at);
    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    dayMap.get(day).push(order);
  });

  return Array.from(dayMap.values()).reduce((acc, dayOrders) => {
    [...dayOrders]
      .sort((a, b) => Number(a.id || a.order_id || 0) - Number(b.id || b.order_id || 0))
      .forEach((order, index) => {
        acc[String(order.id || order.order_id)] = index + 1;
      });
    return acc;
  }, {});
};

const isReturnReportOpen = (order) => {
  const deadline = new Date(order?.report_deadline_at || "");
  return Number.isFinite(deadline.getTime()) && deadline.getTime() >= Date.now();
};

const createRequestKey = () =>
  globalThis.crypto?.randomUUID?.() || `sales-return-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const allocateReceivedQuantity = (item, requestedQuantity) => {
  const sources = Array.isArray(item?.source_items) && item.source_items.length
    ? item.source_items
    : [{ order_item_id: item?.order_item_id, returnable_quantity: item?.returnable_quantity }];
  let pending = Number(requestedQuantity || 0);
  return sources.reduce((allocations, source) => {
    if (pending <= 0) return allocations;
    const quantity = Math.min(Number(source.returnable_quantity || 0), pending);
    if (quantity > 0) allocations.push({ order_item_id: Number(source.order_item_id), quantity });
    pending -= quantity;
    return allocations;
  }, []);
};

const createInitialForm = () => ({
  requestKey: createRequestKey(),
  operationType: "return",
  customerId: "",
  orderId: "",
  orderItemId: "",
  replacementProductId: "",
  replacementQuantity: "",
  quantity: "",
  reason: "expired",
  notes: "",
});

const SalesReturnsPage = () => {
  const currentUser = authService.getCurrentUser() || {};
  const canAuthorizeReturns = isAdministrativeUser(currentUser);
  const [options, setOptions] = useState({ customers: [], orders: [], items: [], products: [] });
  const [returns, setReturns] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [allowedDate, setAllowedDate] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [annulmentReasons, setAnnulmentReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [trackingTab, setTrackingTab] = useState("pending");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [trackingDate, setTrackingDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [optionsResponse, returnsResponse] = await Promise.all([
        ordersService.getSalesReturnOptions(),
        ordersService.getSalesReturns(),
      ]);
      if (optionsResponse?.code === 1) {
        setOptions({
          customers: normalizeRows(optionsResponse.data?.customers),
          orders: normalizeRows(optionsResponse.data?.orders),
          items: normalizeRows(optionsResponse.data?.items),
          products: normalizeRows(optionsResponse.data?.products),
        });
      } else {
        toast.error(optionsResponse?.message || "No se pudieron cargar las opciones");
      }
      if (returnsResponse?.code === 1) {
        setReturns(normalizeRows(returnsResponse.data?.items));
      } else {
        toast.error(returnsResponse?.message || "No se pudieron cargar las devoluciones");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al cargar devoluciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openReturnOrders = useMemo(
    () => options.orders.filter((order) => isReturnReportOpen(order)),
    [options.orders]
  );
  const selectedOrder = useMemo(
    () => openReturnOrders.find((order) => String(order.id) === String(form.orderId)),
    [form.orderId, openReturnOrders]
  );
  const selectedCustomer = useMemo(
    () => options.customers.find((customer) => String(customer.id) === String(form.customerId)),
    [form.customerId, options.customers]
  );
  const allowedDates = useMemo(
    () =>
      Array.from(
        new Set(
          openReturnOrders
            .filter((order) => form.customerId && String(order.customer_id) === String(form.customerId))
            .map((order) => formatDate(order.order_date || order.actual_delivered_at))
            .filter(Boolean)
        )
      ).sort((a, b) => b.localeCompare(a)),
    [form.customerId, openReturnOrders]
  );
  const dateFilteredOrders = useMemo(
    () =>
      openReturnOrders.filter((order) =>
        (!form.customerId || String(order.customer_id) === String(form.customerId))
        && (!allowedDate || formatDate(order.order_date || order.actual_delivered_at) === allowedDate)),
    [allowedDate, form.customerId, openReturnOrders]
  );
  const orderItems = useMemo(
    () => options.items.filter((item) => String(item.order_id) === String(form.orderId)),
    [form.orderId, options.items]
  );
  const selectedItem = useMemo(
    () => orderItems.find((item) => String(item.order_item_id) === String(form.orderItemId)),
    [form.orderItemId, orderItems]
  );
  const dailyOrderNumberById = useMemo(() => getDailyOrderNumbers(openReturnOrders), [openReturnOrders]);
  const returnDailyOrderNumberById = useMemo(() => getDailyOrderNumbers(returns), [returns]);
  const visibleReturns = useMemo(() => {
    const search = trackingSearch.trim().toLocaleLowerCase("es");
    return returns.filter((salesReturn) => {
      const matchesTab = trackingTab === "pending"
        ? salesReturn.status === "pending_authorization"
        : salesReturn.status !== "pending_authorization";
      const matchesDate = !trackingDate || formatDate(salesReturn.reported_at) === trackingDate;
      const searchable = `${salesReturn.customer_name || ""} ${salesReturn.sales_agent_name || ""} ${(salesReturn.items || []).map((item) => `${item.returned_product_name || ""} ${item.replacement_product_name || ""}`).join(" ")}`.toLocaleLowerCase("es");
      return matchesTab && matchesDate && (!search || searchable.includes(search));
    });
  }, [returns, trackingDate, trackingSearch, trackingTab]);

  useEffect(() => {
    if (!allowedDates.length) {
      if (allowedDate) {
        setAllowedDate("");
      }
      setForm((current) =>
        current.orderId || current.orderItemId
          ? { ...current, orderId: "", orderItemId: "" }
          : current
      );
      return;
    }

    if (!allowedDate || !allowedDates.includes(allowedDate)) {
      setAllowedDate(allowedDates[0]);
      setForm((current) =>
        current.orderId || current.orderItemId
          ? { ...current, orderId: "", orderItemId: "" }
          : current
      );
    }
  }, [allowedDate, allowedDates]);

  const createReturn = async () => {
    const requestedQuantity = Number(form.quantity || 0);
    if (
      !selectedOrder ||
      !selectedItem ||
      !selectedCustomer ||
      (form.operationType === "exchange" && (!form.replacementProductId || Number(form.replacementQuantity || 0) <= 0)) ||
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity <= 0 ||
      requestedQuantity > Number(selectedItem?.returnable_quantity || 0)
    ) {
      toast.error("Completa el pedido y registra una cantidad entera que no supere lo disponible");
      return;
    }
    setSaving(true);
    try {
      const receivedAllocations = allocateReceivedQuantity(selectedItem, requestedQuantity);
      const result = await ordersService.createSalesReturn({
        p_order_id: Number(selectedOrder.id),
        p_request_key: form.requestKey,
        p_customer_id: Number(selectedCustomer.id),
        p_operation_type: form.operationType,
        p_notes: form.notes.trim() || null,
        p_items: receivedAllocations.map((allocation, index) =>
          ({
            ...allocation,
            replacement_product_id: form.operationType === "exchange" && index === 0 ? Number(form.replacementProductId) : null,
            replacement_quantity: form.operationType === "exchange" && index === 0 ? Number(form.replacementQuantity) : null,
            reason: form.reason,
            notes: form.notes.trim() || null,
          })
        ),
      });
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo registrar la devolucion");
        return;
      }
      toast.success(result.message);
      setForm(createInitialForm());
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al registrar la devolucion");
    } finally {
      setSaving(false);
    }
  };

  const authorizeReturn = async (salesReturnId) => {
    setProcessingId(salesReturnId);
    try {
      const result = await ordersService.authorizeSalesReturn(salesReturnId);
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo autorizar");
        return;
      }
      toast.success(result.message);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al autorizar");
    } finally {
      setProcessingId(null);
    }
  };

  const rejectReturn = async (salesReturnId) => {
    const reason = String(rejectionReasons[salesReturnId] || "").trim();
    if (reason.length < 5) {
      toast.error("Escribe un motivo de rechazo de al menos 5 caracteres");
      return;
    }
    setProcessingId(salesReturnId);
    try {
      const result = await ordersService.rejectSalesReturn(salesReturnId, reason);
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo rechazar");
        return;
      }
      toast.success(result.message);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al rechazar");
    } finally {
      setProcessingId(null);
    }
  };

  const annulExchange = async (salesReturnId) => {
    const reason = String(annulmentReasons[salesReturnId] || "").trim();
    if (reason.length < 5) {
      toast.error("Escribe un motivo de anulación de al menos 5 caracteres");
      return;
    }
    setProcessingId(salesReturnId);
    try {
      const result = await ordersService.annulSalesExchange(salesReturnId, reason);
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo anular el cambio");
        return;
      }
      toast.success(result.message);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al anular el cambio");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <FlowPageLayout
      title="Cambios y devoluciones"
      subtitle="Reporta productos y gestiona la autorizacion del vendedor"
    >
      <Stack spacing={3}>
        <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
          <Button href="/orders/returns-report" variant="outlined" color="secondary">
            Abrir reporte
          </Button>
        </Stack>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>Política de cambios y devoluciones</Typography>
            <Button size="small" color="secondary" onClick={() => setShowPolicy((current) => !current)}>
              {showPolicy ? "Ocultar política" : "Ver política"}
            </Button>
          </Stack>
          <Collapse in={showPolicy}>
            <Alert severity="info" sx={{ mt: 1.5 }}>
              El producto vence 15 días después de la entrega y puede reportarse hasta 2 días después del vencimiento. El producto devuelto no vuelve al inventario vendible.
            </Alert>
          </Collapse>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Nueva operación
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selecciona el cliente y el pedido original. El producto recibido queda informativo y el reemplazo se identifica por separado.
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Tipo de operación"
                  value={form.operationType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      operationType: event.target.value,
                      replacementProductId: "",
                      replacementQuantity: "",
                    }))
                  }
                >
                  <MenuItem value="return">Devolución</MenuItem>
                  <MenuItem value="exchange">Cambio</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={5}>
                <Autocomplete
                  fullWidth
                  options={options.customers}
                  value={selectedCustomer || null}
                  getOptionLabel={(customer) => customer ? `${customer.name}${customer.document_number ? ` - ${customer.document_number}` : ""}` : ""}
                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                  onChange={(_, customer) => {
                    setAllowedDate("");
                    setForm((current) => ({ ...current, customerId: customer?.id ? String(customer.id) : "", orderId: "", orderItemId: "" }));
                  }}
                  renderInput={(params) => <TextField {...params} label="Cliente activo" placeholder="Buscar cliente" />}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Fecha vigente"
                  disabled={!selectedCustomer}
                  value={allowedDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setAllowedDate(nextDate);
                    setForm((current) => ({
                      ...current,
                      orderId:
                        nextDate &&
                        current.orderId &&
                        formatDate(selectedOrder?.order_date || selectedOrder?.actual_delivered_at) !== nextDate
                          ? ""
                          : current.orderId,
                      orderItemId: "",
                    }));
                  }}
                  helperText="Solo fechas abiertas por politica"
                >
                  {allowedDates.map((date) => (
                    <MenuItem key={date} value={date}>
                      {date}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  fullWidth
                  options={dateFilteredOrders}
                  value={selectedOrder || null}
                  disabled={!selectedCustomer || !allowedDate}
                  getOptionLabel={(order) =>
                    order
                      ? `${formatDate(order.order_date || order.actual_delivered_at)} - Pedido #${dailyOrderNumberById[String(order.id)] || "-"} - ${order.customer_name}`
                      : ""
                  }
                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                  onChange={(_, order) =>
                    setForm((current) => ({
                      ...current,
                      orderId: order?.id ? String(order.id) : "",
                      orderItemId: "",
                    }))
                  }
                  renderInput={(params) => (
                    <TextField {...params} required label="Pedido original" placeholder="Busca el pedido del cliente seleccionado" />
                  )}
                  renderOption={(props, order) => (
                    <Box component="li" {...props}>
                      <Stack spacing={0.25}>
                        <Typography sx={{ fontWeight: 900 }}>
                          Pedido #{dailyOrderNumberById[String(order.id)] || "-"} - {order.customer_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Fecha {formatDate(order.order_date || order.actual_delivered_at)} | Vendedor {order.sales_agent_name}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={5} sx={{ display: selectedOrder ? "block" : "none" }}>
                <TextField
                  select
                  fullWidth
                  label="Producto recibido (informativo)"
                  value={form.orderItemId}
                  disabled={!form.orderId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, orderItemId: event.target.value }))
                  }
                >
                  {orderItems.map((item) => (
                    <MenuItem key={item.order_item_id} value={String(item.order_item_id)}>
                      {item.product_name}{item.commercial_label ? ` · ${item.commercial_label}` : ""} - disponible {formatNumber(item.returnable_quantity)}{item.commercial_detail ? ` (${item.commercial_detail})` : ""}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3} sx={{ display: selectedItem ? "block" : "none" }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  helperText={selectedItem ? `Máximo disponible: ${formatNumber(selectedItem.returnable_quantity)}` : ""}
                  value={form.quantity}
                  inputProps={{
                    min: 0,
                    max: selectedItem?.returnable_quantity || undefined,
                    step: 1,
                  }}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} sx={{ display: selectedItem ? "block" : "none" }}>
                <TextField
                  select
                  fullWidth
                  label="Motivo"
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reason: event.target.value }))
                  }
                >
                  {reasonOptions.map((reason) => (
                    <MenuItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {form.operationType === "exchange" && selectedItem ? (
                <>
                  <Grid item xs={12} md={8}>
                    <Autocomplete
                      fullWidth
                      options={options.products}
                      value={options.products.find((product) => String(product.id) === String(form.replacementProductId)) || null}
                      getOptionLabel={(product) => product ? `${product.name}${product.sku ? ` - ${product.sku}` : ""}` : ""}
                      isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                      onChange={(_, product) => setForm((current) => ({ ...current, replacementProductId: product?.id ? String(product.id) : "" }))}
                      renderInput={(params) => <TextField {...params} required label="Producto entregado como reemplazo" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Cantidad de reemplazo"
                      value={form.replacementQuantity}
                      inputProps={{ min: 1, step: 1 }}
                      onChange={(event) => setForm((current) => ({ ...current, replacementQuantity: event.target.value }))}
                    />
                  </Grid>
                </>
              ) : null}
              <Grid item xs={12} md={4} sx={{ display: selectedItem ? "block" : "none", ml: { md: "auto" }, order: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  disabled={saving || loading || Number(form.quantity || 0) <= 0 || (form.operationType === "exchange" && (!form.replacementProductId || Number(form.replacementQuantity || 0) <= 0))}
                  onClick={createReturn}
                  sx={{ minHeight: 56 }}
                >
                  {saving ? "Registrando..." : `Registrar ${form.operationType === "exchange" ? "cambio" : "devolución"}`}
                </Button>
              </Grid>
              <Grid item xs={12} sx={{ display: selectedItem ? "block" : "none", order: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Detalle del problema (opcional)"
                  value={form.notes}
                  inputProps={{ maxLength: 255 }}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </Grid>
            </Grid>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Seguimiento de solicitudes</Typography>
              <Typography variant="body2" color="text.secondary">Consulta las solicitudes pendientes y las que ya fueron procesadas.</Typography>
            </Box>
            <Tabs value={trackingTab} onChange={(_, value) => setTrackingTab(value)} variant="fullWidth" textColor="secondary" indicatorColor="secondary">
              <Tab value="pending" label={`Pendientes (${returns.filter((item) => item.status === "pending_authorization").length})`} />
              <Tab value="history" label={`Historial (${returns.filter((item) => item.status !== "pending_authorization").length})`} />
            </Tabs>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={8}>
                <TextField fullWidth size="small" label="Buscar solicitud" placeholder="Cliente, vendedor o producto" value={trackingSearch} onChange={(event) => setTrackingSearch(event.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <BalanceDatePicker label="Fecha del reporte" value={trackingDate} onChange={setTrackingDate} />
              </Grid>
            </Grid>
          {loading ? <Alert severity="info">Cargando solicitudes...</Alert> : null}
          {!loading && visibleReturns.length === 0 ? (
            <Alert severity="info">No hay solicitudes que coincidan con los filtros.</Alert>
          ) : null}
          <Grid container spacing={2}>
            {visibleReturns.map((salesReturn) => {
              const status = statusConfig[salesReturn.status] || {
                label: salesReturn.status,
                color: "default",
              };
              const returnDailyNumber = returnDailyOrderNumberById[String(salesReturn.order_id)] || "-";
              const canAuthorize =
                salesReturn.status === "pending_authorization" &&
                canAuthorizeReturns;
              return (
                <Grid item xs={12} lg={6} key={salesReturn.id}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                    <Stack spacing={1.5}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 900 }}>
                            Pedido #{returnDailyNumber} - Solicitud #{salesReturn.id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {salesReturn.customer_name} | Vendedor: {salesReturn.sales_agent_name}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Chip label={salesReturn.operation_type === "exchange" ? "Cambio" : "Devolución"} variant="outlined" size="small" />
                          <Chip label={status.label} color={status.color} size="small" />
                        </Stack>
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Reportado {formatDateTime(salesReturn.reported_at)} | Limite{" "}
                        {formatDateTime(salesReturn.report_deadline_at)}
                      </Typography>
                      <Divider />

                      {(salesReturn.items || []).map((item) => (
                        <Box key={item.id}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            Recibido (informativo): {item.returned_product_name} x {formatNumber(item.quantity)}
                          </Typography>
                          {salesReturn.operation_type === "exchange" && item.replacement_product_name ? (
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              Reemplazo: {item.replacement_product_name} x {formatNumber(item.replacement_quantity)} · Precio congelado {money.format(Number(item.replacement_unit_price || 0))}
                            </Typography>
                          ) : null}
                          <Typography variant="body2" color="text.secondary">
                            Saldo a favor: {money.format(Number(item.credit_amount || item.returned_commercial_value || 0))} | Motivo:{" "}
                            {reasonOptions.find((reason) => reason.value === item.reason)?.label ||
                              item.reason}
                          </Typography>
                        </Box>
                      ))}

                      <Alert severity={salesReturn.operation_type === "exchange" ? "info" : "warning"}>
                        Comisión: {commissionTreatmentLabels[salesReturn.commission_treatment] || (salesReturn.operation_type === "exchange" ? "No afecta comisión" : "Reduce comisión")}
                        {salesReturn.commission_treatment && salesReturn.status === "completed"
                          ? ` · Antes ${money.format(Number(salesReturn.original_commission_amount || 0))} · Después ${money.format(Number(salesReturn.adjusted_commission_amount || 0))}`
                          : ""}
                      </Alert>

                      {salesReturn.rejection_reason ? (
                        <Alert severity="error">{salesReturn.rejection_reason}</Alert>
                      ) : null}
                      {salesReturn.annulment_reason ? (
                        <Alert severity="warning">Anulación: {salesReturn.annulment_reason}</Alert>
                      ) : null}

                      {canAuthorize ? (
                        <Stack spacing={1}>
                          <Button
                            variant="contained"
                            color="secondary"
                            disabled={processingId === salesReturn.id}
                            onClick={() => authorizeReturn(salesReturn.id)}
                          >
                            {processingId === salesReturn.id
                              ? "Procesando..."
                              : "Autorizar y generar saldo"}
                          </Button>
                          <TextField
                            size="small"
                            label="Motivo si se rechaza"
                            value={rejectionReasons[salesReturn.id] || ""}
                            onChange={(event) =>
                              setRejectionReasons((current) => ({
                                ...current,
                                [salesReturn.id]: event.target.value,
                              }))
                            }
                          />
                          <Button
                            variant="outlined"
                            color="error"
                            disabled={processingId === salesReturn.id}
                            onClick={() => rejectReturn(salesReturn.id)}
                          >
                            Rechazar solicitud
                          </Button>
                        </Stack>
                      ) : salesReturn.status === "pending_authorization" ? (
                        <Alert severity="info">
                          Esta solicitud debe autorizarla un usuario con rol administrativo.
                        </Alert>
                      ) : null}
                      {canAuthorizeReturns && salesReturn.operation_type === "exchange" && salesReturn.status === "completed" ? (
                        <Stack spacing={1}>
                          <TextField
                            size="small"
                            label="Motivo obligatorio de anulación"
                            value={annulmentReasons[salesReturn.id] || ""}
                            onChange={(event) => setAnnulmentReasons((current) => ({ ...current, [salesReturn.id]: event.target.value }))}
                          />
                          <Button
                            variant="outlined"
                            color="error"
                            disabled={processingId === salesReturn.id}
                            onClick={() => annulExchange(salesReturn.id)}
                          >
                            Anular cambio y compensar inventario
                          </Button>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          </Stack>
        </Paper>
      </Stack>
    </FlowPageLayout>
  );
};

export default SalesReturnsPage;


