import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Divider, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import ColombianCurrencyField, { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import CaptureModeSwitch from "components/atoms/CaptureModeSwitch";
import OrderLineTypeSelect from "components/atoms/OrderLineTypeSelect";
import ordersService from "services/orders/orders-service";
import { isIntegerUnit, normalizeRows } from "views/modules/flow-utils";

const editableStatuses = ["draft", "confirmed"];
const emptyNewLine = {
  productId: "",
  lineType: "sale",
  captureMode: "amount",
  value: "",
};

const toDraft = (item) => ({
  lineType: item.line_type || "sale",
  originalLineType: item.line_type || "sale",
  captureMode: item.capture_mode || "quantity",
  value:
    item.capture_mode === "amount"
      ? String(Number(item.requested_amount || 0))
      : String(Number(item.quantity || 0)),
});

const lineTypeLabels = {
  sale: "Venta",
  bonus: "Vendaje",
  gift: "Obsequio",
  exchange: "Cambio",
};

const OrderDetailEditor = ({ order, items, loading, onRefresh }) => {
  const [drafts, setDrafts] = useState({});
  const [products, setProducts] = useState([]);
  const [newLine, setNewLine] = useState(emptyNewLine);
  const [savingKey, setSavingKey] = useState("");
  const canEdit = editableStatuses.includes(order?.status);

  useEffect(() => {
    setDrafts(
      items.reduce((acc, item) => {
        acc[item.id] = toDraft(item);
        return acc;
      }, {})
    );
  }, [items]);

  useEffect(() => {
    if (!canEdit) return;
    ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 200 }).then((response) => {
      if (response?.code === 1) {
        setProducts(normalizeRows(response.data?.products));
      }
    });
  }, [canEdit]);

  const selectedNewProduct = useMemo(
    () => products.find((product) => String(product.id) === String(newLine.productId)),
    [newLine.productId, products]
  );

  const saveExisting = async (item, remove = false) => {
    const draft = drafts[item.id] || toDraft(item);
    setSavingKey(`item-${item.id}`);
    try {
      const result = await ordersService.upsertItem(order.id, {
        p_product_id: Number(item.product_id),
        p_line_type: draft.lineType,
        p_previous_line_type: draft.originalLineType,
        p_capture_mode: draft.captureMode,
        p_requested_amount: draft.captureMode === "amount" ? Number(draft.value || 0) : null,
        p_quantity: draft.captureMode === "quantity" ? Number(draft.value || 0) : Number(item.quantity || 0),
        p_remove: remove,
      });
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo actualizar el producto");
        return;
      }
      toast.success(remove ? "Producto retirado" : "Producto actualizado");
      await onRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al actualizar el producto");
    } finally {
      setSavingKey("");
    }
  };

  const addLine = async () => {
    if (!selectedNewProduct || Number(newLine.value || 0) <= 0) {
      toast.error("Selecciona un producto e ingresa un valor o cantidad");
      return;
    }
    setSavingKey("new");
    try {
      const result = await ordersService.upsertItem(order.id, {
        p_product_id: Number(selectedNewProduct.id),
        p_line_type: newLine.lineType,
        p_capture_mode: newLine.captureMode,
        p_requested_amount: newLine.captureMode === "amount" ? Number(newLine.value) : null,
        p_quantity: newLine.captureMode === "quantity" ? Number(newLine.value) : null,
      });
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo agregar el producto");
        return;
      }
      toast.success("Producto agregado");
      setNewLine(emptyNewLine);
      await onRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error al agregar el producto");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Productos solicitados
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Detalle del valor o cantidad solicitada, unidades calculadas y valor comercial.
        </Typography>
      </Stack>

      {loading ? <Alert severity="info">Cargando productos...</Alert> : null}
      {!loading && items.length === 0 ? <Alert severity="info">No hay productos en este pedido.</Alert> : null}

      <Grid container spacing={2}>
        {items.map((item) => {
          const draft = drafts[item.id] || toDraft(item);
          return (
            <Grid item xs={12} md={6} key={item.id}>
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, height: "100%" }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>{item.product_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.product_sku || "Sin SKU"} | ${formatCurrencyValue(item.unit_price, 0)} por {item.product_unit}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <OrderLineTypeSelect
                      value={draft.lineType}
                      disabled={!canEdit}
                      onChange={(lineType) =>
                        setDrafts((current) => ({ ...current, [item.id]: { ...draft, lineType } }))
                      }
                    />
                    <CaptureModeSwitch
                      mode={draft.captureMode}
                      disabled={!canEdit}
                      onChange={(captureMode) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, captureMode, value: "" },
                        }))
                      }
                    />
                  </Stack>

                  {draft.captureMode === "amount" ? (
                    <ColombianCurrencyField
                      size="small"
                      label="Valor solicitado"
                      name={`detail-${item.id}`}
                      value={draft.value}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, value: event.target.value },
                        }))
                      }
                    />
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      label="Cantidad solicitada"
                      value={draft.value}
                      disabled={!canEdit}
                      inputProps={{
                        min: 0,
                        step: isIntegerUnit(item.product_unit) ? 1 : 0.001,
                        inputMode: "decimal",
                      }}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: { ...draft, value: event.target.value },
                        }))
                      }
                    />
                  )}

                  <Divider />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Tipo</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{lineTypeLabels[item.line_type]}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Unidades calculadas</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{Number(item.quantity || 0)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Solicitado originalmente</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {item.capture_mode === "amount"
                          ? `$${formatCurrencyValue(item.requested_amount, 0)}`
                          : `${Number(item.quantity || 0)} ${item.product_unit}`}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        {item.line_type === "sale" ? "Total cobrado" : "Valor comercial"}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        ${formatCurrencyValue(item.line_type === "sale" ? item.line_total : item.commercial_value, 0)}
                      </Typography>
                    </Grid>
                  </Grid>

                  {canEdit ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        disabled={Boolean(savingKey)}
                        onClick={() => saveExisting(item)}
                      >
                        {savingKey === `item-${item.id}` ? "Guardando..." : "Guardar cambios"}
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        disabled={Boolean(savingKey)}
                        onClick={() => saveExisting(item, true)}
                      >
                        Retirar
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {canEdit ? (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 900 }}>Agregar producto</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField
                  select
                  fullWidth
                  label="Producto"
                  value={newLine.productId}
                  onChange={(event) => setNewLine((current) => ({ ...current, productId: event.target.value }))}
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={String(product.id)}>
                      {product.name} | ${formatCurrencyValue(product.base_price, 0)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <OrderLineTypeSelect
                  value={newLine.lineType}
                  onChange={(lineType) => setNewLine((current) => ({ ...current, lineType }))}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CaptureModeSwitch
                  mode={newLine.captureMode}
                  onChange={(captureMode) => setNewLine((current) => ({ ...current, captureMode, value: "" }))}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                {newLine.captureMode === "amount" ? (
                  <ColombianCurrencyField
                    label="Valor solicitado"
                    name="new-line-value"
                    value={newLine.value}
                    onChange={(event) => setNewLine((current) => ({ ...current, value: event.target.value }))}
                  />
                ) : (
                  <TextField
                    fullWidth
                    type="number"
                    label="Cantidad"
                    value={newLine.value}
                    inputProps={{ min: 0, step: selectedNewProduct && isIntegerUnit(selectedNewProduct.unit) ? 1 : 0.001 }}
                    onChange={(event) => setNewLine((current) => ({ ...current, value: event.target.value }))}
                  />
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  disabled={Boolean(savingKey)}
                  onClick={addLine}
                  sx={{ minHeight: 48 }}
                >
                  {savingKey === "new" ? "Agregando..." : "Agregar al pedido"}
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </Box>
      ) : (
        <Alert severity="warning">
          Edicion bloqueada: el pedido ya fue enviado al flujo de produccion o despacho.
        </Alert>
      )}
    </Stack>
  );
};

export default OrderDetailEditor;
