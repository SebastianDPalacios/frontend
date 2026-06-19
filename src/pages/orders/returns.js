import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import FlowPageLayout from "views/modules/FlowPageLayout";
import ordersService from "services/orders/orders-service";
import authService from "services/auth/auth-service";
import { normalizeRows } from "views/modules/flow-utils";

const reasonOptions = [
  { value: "expired", label: "Vencido" },
  { value: "mold", label: "Moho" },
  { value: "wet", label: "Mojado" },
  { value: "malformed", label: "Mal moldeado" },
  { value: "other", label: "Otro" },
];

const statusConfig = {
  pending_authorization: { label: "Pendiente de autorizacion", color: "warning" },
  completed: { label: "Autorizada y entregada", color: "success" },
  rejected: { label: "Rechazada", color: "error" },
};

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 3 });

const initialForm = {
  orderId: "",
  orderItemId: "",
  replacementProductId: "",
  quantity: "",
  reason: "expired",
  notes: "",
};

const SalesReturnsPage = () => {
  const currentUser = authService.getCurrentUser() || {};
  const currentUserId = Number(currentUser.id || currentUser.user_id || currentUser.userId || 0);
  const [options, setOptions] = useState({ orders: [], items: [], products: [] });
  const [returns, setReturns] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [optionsResponse, returnsResponse] = await Promise.all([
        ordersService.getSalesReturnOptions(),
        ordersService.getSalesReturns(),
      ]);
      if (optionsResponse?.code === 1) {
        setOptions({
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

  const selectedOrder = useMemo(
    () => options.orders.find((order) => String(order.id) === String(form.orderId)),
    [form.orderId, options.orders]
  );
  const orderItems = useMemo(
    () => options.items.filter((item) => String(item.order_id) === String(form.orderId)),
    [form.orderId, options.items]
  );
  const selectedItem = useMemo(
    () => orderItems.find((item) => String(item.order_item_id) === String(form.orderItemId)),
    [form.orderItemId, orderItems]
  );

  const createReturn = async () => {
    if (
      !selectedOrder ||
      !selectedItem ||
      !form.replacementProductId ||
      Number(form.quantity || 0) <= 0
    ) {
      toast.error("Completa pedido, producto devuelto, reemplazo y cantidad");
      return;
    }
    setSaving(true);
    try {
      const result = await ordersService.createSalesReturn({
        p_order_id: Number(selectedOrder.id),
        p_notes: form.notes.trim() || null,
        p_items: [
          {
            order_item_id: Number(selectedItem.order_item_id),
            replacement_product_id: Number(form.replacementProductId),
            quantity: Number(form.quantity),
            reason: form.reason,
            notes: form.notes.trim() || null,
          },
        ],
      });
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo registrar la devolucion");
        return;
      }
      toast.success(result.message);
      setForm(initialForm);
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

  return (
    <FlowPageLayout
      title="Cambios y devoluciones"
      subtitle="Reporta productos y gestiona la autorizacion del vendedor"
    >
      <Stack spacing={3}>
        <Alert severity="info">
          El producto vence 15 dias despues de la entrega y puede reportarse hasta 2 dias despues
          del vencimiento. El producto devuelto no vuelve al inventario vendible.
        </Alert>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Registrar solicitud
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Pedido entregado"
                  value={form.orderId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      orderId: event.target.value,
                      orderItemId: "",
                    }))
                  }
                >
                  {options.orders.map((order) => (
                    <MenuItem key={order.id} value={String(order.id)}>
                      #{order.id} | {order.customer_name} | {order.sales_agent_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Producto devuelto"
                  value={form.orderItemId}
                  disabled={!form.orderId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, orderItemId: event.target.value }))
                  }
                >
                  {orderItems.map((item) => (
                    <MenuItem key={item.order_item_id} value={String(item.order_item_id)}>
                      {item.product_name} | Disponible: {formatNumber(item.returnable_quantity)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Producto de reemplazo"
                  value={form.replacementProductId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      replacementProductId: event.target.value,
                    }))
                  }
                >
                  {options.products.map((product) => (
                    <MenuItem key={product.id} value={String(product.id)}>
                      {product.name} | ${Number(product.base_price || 0).toLocaleString("es-CO")}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  value={form.quantity}
                  inputProps={{
                    min: 0,
                    max: selectedItem?.returnable_quantity || undefined,
                    step: 0.001,
                  }}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  disabled={saving || loading}
                  onClick={createReturn}
                  sx={{ minHeight: 56 }}
                >
                  {saving ? "Registrando..." : "Enviar a autorizacion"}
                </Button>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Detalle del problema"
                  value={form.notes}
                  inputProps={{ maxLength: 255 }}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </Grid>
            </Grid>

            {selectedOrder ? (
              <Alert severity="success">
                Entregado: {formatDateTime(selectedOrder.actual_delivered_at)} | Vence:{" "}
                {formatDateTime(selectedOrder.product_expires_at)} | Reporte maximo:{" "}
                {formatDateTime(selectedOrder.report_deadline_at)}
              </Alert>
            ) : null}
          </Stack>
        </Paper>

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Solicitudes registradas
          </Typography>
          {loading ? <Alert severity="info">Cargando solicitudes...</Alert> : null}
          {!loading && returns.length === 0 ? (
            <Alert severity="info">No hay cambios o devoluciones registrados.</Alert>
          ) : null}
          <Grid container spacing={2}>
            {returns.map((salesReturn) => {
              const status = statusConfig[salesReturn.status] || {
                label: salesReturn.status,
                color: "default",
              };
              const canAuthorize =
                salesReturn.status === "pending_authorization" &&
                Number(salesReturn.sales_agent_user_id) === currentUserId;
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
                            Devolucion #{salesReturn.id} | Pedido #{salesReturn.order_id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {salesReturn.customer_name} | Vendedor: {salesReturn.sales_agent_name}
                          </Typography>
                        </Box>
                        <Chip label={status.label} color={status.color} size="small" />
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Reportado {formatDateTime(salesReturn.reported_at)} | Limite{" "}
                        {formatDateTime(salesReturn.report_deadline_at)}
                      </Typography>
                      <Divider />

                      {(salesReturn.items || []).map((item) => (
                        <Box key={item.id}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {item.returned_product_name} x {formatNumber(item.quantity)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Reemplazo: {item.replacement_product_name} | Motivo:{" "}
                            {reasonOptions.find((reason) => reason.value === item.reason)?.label ||
                              item.reason}
                          </Typography>
                        </Box>
                      ))}

                      {salesReturn.rejection_reason ? (
                        <Alert severity="error">{salesReturn.rejection_reason}</Alert>
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
                              : "Autorizar cambio y entregar reemplazo"}
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
                      ) : null}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Stack>
    </FlowPageLayout>
  );
};

export default SalesReturnsPage;
