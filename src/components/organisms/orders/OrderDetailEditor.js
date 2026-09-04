import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Grid,
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
import toast from "react-hot-toast";
import ColombianCurrencyField, { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import CaptureModeSwitch from "components/atoms/CaptureModeSwitch";
import OrderLineTypeSelect from "components/atoms/OrderLineTypeSelect";
import ordersService from "services/orders/orders-service";
import getInvalidUnitSaleAmount from "utils/order-sale-validation";
import { isIntegerUnit, normalizeRows } from "views/modules/flow-utils";

const editableStatuses = ["draft", "confirmed", "ready", "dispatched", "delivered"];
const emptyNewLine = {
  productId: "",
  lineType: "sale",
  captureMode: "amount",
  value: "",
};

const toDraft = (item) => ({
  lineType: Number(item.includes_bonus || 0) === 1 && item.line_type === "sale"
    ? "sale"
    : item.display_line_type || item.line_type || "sale",
  originalLineType: item.line_type || "sale",
  captureMode: item.capture_mode || "quantity",
  value:
    item.capture_mode === "amount"
      ? String(Number(item.requested_amount || 0))
      : String(Number(item.quantity || 0)),
});

const lineTypeLabels = {
  sale: "Venta",
  sale_bonus: "Venta + vendaje",
  bonus: "Solo vendaje",
  gift: "Obsequio",
  exchange: "Cambio",
};

const getLineTypesForProduct = (product) => Number(product?.includes_bonus || 0) === 1
  ? [
      { value: "sale", label: "Venta con vendaje incluido" },
      { value: "bonus", label: "Solo vendaje" },
      { value: "gift", label: "Obsequio" },
      { value: "exchange", label: "Cambio" },
    ]
  : undefined;

const mergeSaleBonusItems = (items = []) => {
  const bonusByGroup = new Map();
  const legacyBonusByProduct = new Map();
  items.forEach((item) => {
    if (item.line_type !== "bonus") return;
    const groupKey = String(item.line_group_key || "");
    if (groupKey && !groupKey.startsWith("legacy-")) bonusByGroup.set(groupKey, item);
    else legacyBonusByProduct.set(String(item.product_id), item);
  });

  return items.reduce((rows, item) => {
    if (item.line_type === "bonus" && items.some(
      (candidate) => candidate.line_type === "sale" && (
        String(candidate.line_group_key || "") === String(item.line_group_key || "") ||
        (String(item.line_group_key || "").startsWith("legacy-") && String(candidate.product_id) === String(item.product_id))
      )
    )) return rows;

    const groupKey = String(item.line_group_key || "");
    const bonusItem = item.line_type === "sale"
      ? (groupKey && !groupKey.startsWith("legacy-")
          ? bonusByGroup.get(groupKey)
          : legacyBonusByProduct.get(String(item.product_id)))
      : null;
    rows.push(bonusItem ? {
      ...item,
      display_line_type: "sale_bonus",
      display_quantity: Number(item.quantity || 0) + Number(bonusItem.quantity || 0),
      bonus_item: bonusItem,
    } : item);
    return rows;
  }, []);
};

const OrderDetailEditor = ({ order, items, loading, onRefresh }) => {
  const [drafts, setDrafts] = useState({});
  const [products, setProducts] = useState([]);
  const [salesSettings, setSalesSettings] = useState({ bonus_percent: 20, bonus_minimum_amount: 2000, bonus_max_company_loss_amount: 1500 });
  const [newLine, setNewLine] = useState(emptyNewLine);
  const [pendingRemovals, setPendingRemovals] = useState([]);
  const [savingKey, setSavingKey] = useState("");
  const canEdit = editableStatuses.includes(order?.status);
  const displayItems = useMemo(() => mergeSaleBonusItems(items), [items]);

  useEffect(() => {
    setDrafts(
      displayItems.reduce((acc, item) => {
        acc[item.id] = toDraft(item);
        return acc;
      }, {})
    );
    setPendingRemovals([]);
  }, [displayItems]);

  useEffect(() => {
    if (!canEdit) return;
    ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 200 }).then((response) => {
      if (response?.code === 1) {
        setProducts(normalizeRows(response.data?.products));
        setSalesSettings((current) => ({ ...current, ...(response.data?.sales_settings || {}) }));
      }
    });
  }, [canEdit]);

  const selectedNewProduct = useMemo(
    () => products.find((product) => String(product.id) === String(newLine.productId)),
    [newLine.productId, products]
  );

  const changedItems = useMemo(() => displayItems.filter((item) => {
    if (pendingRemovals.includes(item.id)) return false;
    const draft = drafts[item.id] || toDraft(item);
    const original = toDraft(item);
    return draft.lineType !== original.lineType ||
      draft.captureMode !== original.captureMode ||
      Number(draft.value || 0) !== Number(original.value || 0);
  }), [displayItems, drafts, pendingRemovals]);

  const hasPendingNewLine = Boolean(selectedNewProduct && Number(newLine.value || 0) > 0);
  const pendingCount = changedItems.length + pendingRemovals.length + (hasPendingNewLine ? 1 : 0);

  const saveExisting = async (item, remove = false) => {
    const draft = drafts[item.id] || toDraft(item);
    const requestedLineType = draft.lineType;
    const amountError = !remove ? getInvalidUnitSaleAmount(
      { ...item, unit: item.product_unit, base_price: item.unit_price },
      { ...draft, orderMode: requestedLineType },
      { bonusPercent: salesSettings.bonus_percent }
    ) : null;
    if (amountError) {
      toast.error(amountError.message);
      return;
    }
    setSavingKey(`item-${item.id}`);
    try {
      if ((remove || requestedLineType !== "sale_bonus") && item.bonus_item) {
        const bonusRemoval = await ordersService.upsertItem(order.id, {
          p_order_item_id: Number(item.bonus_item.id),
          p_line_group_key: item.line_group_key,
          p_product_id: Number(item.bonus_item.product_id),
          p_line_type: "bonus",
          p_previous_line_type: "bonus",
          p_capture_mode: "quantity",
          p_quantity: 0,
          p_remove: true,
        });
        if (bonusRemoval?.code !== 1) {
          toast.error(bonusRemoval?.message || "No se pudo retirar el vendaje asociado");
          return;
        }
      }
      const result = await ordersService.upsertItem(order.id, {
        p_order_item_id: Number(item.id),
        p_line_group_key: item.line_group_key,
        p_product_id: Number(item.product_id),
        p_line_type: requestedLineType === "sale_bonus" ? "sale" : requestedLineType,
        p_ui_line_type: requestedLineType,
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
      if (!remove && requestedLineType === "sale_bonus") {
        const product = products.find((candidate) => String(candidate.id) === String(item.product_id));
        const price = Number(product?.base_price || item.unit_price || 0);
        const taxPercent = Number(product?.tax_percent || product?.rate_percent || item.tax_percent || 0);
        const rawQuantity = draft.captureMode === "quantity" ? Number(draft.value) : Number(draft.value) / price;
        const saleQuantity = isIntegerUnit(product?.unit || item.product_unit)
          ? Math.floor(rawQuantity)
          : Math.floor(rawQuantity * 1000) / 1000;
        const bonusUnitValue = price * (1 + taxPercent / 100);
        const saleCommercialValue = draft.captureMode === "amount"
          ? Number(draft.value || 0)
          : saleQuantity * bonusUnitValue;
        const bonusAllowance = saleCommercialValue * (Number(salesSettings.bonus_percent || 0) / 100);
        const rawBonusQuantity = bonusUnitValue > 0
          ? bonusAllowance / bonusUnitValue
          : 0;
        const bonusQuantity = isIntegerUnit(product?.unit || item.product_unit)
          ? (Math.ceil(rawBonusQuantity) * bonusUnitValue - bonusAllowance <= Number(salesSettings.bonus_max_company_loss_amount || 0)
              ? Math.ceil(rawBonusQuantity)
              : Math.floor(rawBonusQuantity))
          : Math.floor(rawBonusQuantity * 1000) / 1000;
        if (bonusQuantity > 0) {
          const bonusResult = await ordersService.upsertItem(order.id, {
            p_order_item_id: Number(item.bonus_item?.id || 0) || null,
            p_line_group_key: item.line_group_key,
            p_product_id: Number(item.product_id),
            p_line_type: "bonus",
            p_capture_mode: "quantity",
            p_quantity: bonusQuantity,
          });
          if (bonusResult?.code !== 1) {
            toast.error(bonusResult?.message || "La venta se actualizó, pero no se pudo aplicar el vendaje automático");
            await onRefresh();
            return;
          }
        }
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
    const amountError = getInvalidUnitSaleAmount(
      selectedNewProduct,
      { ...newLine, orderMode: newLine.lineType },
      { bonusPercent: salesSettings.bonus_percent }
    );
    if (amountError) {
      toast.error(amountError.message);
      return;
    }
    setSavingKey("new");
    try {
      const requestedLineType = newLine.lineType;
      const newLineGroupKey = `edit-${order.id}-${Date.now()}`;
      const result = await ordersService.upsertItem(order.id, {
        p_line_group_key: newLineGroupKey,
        p_product_id: Number(selectedNewProduct.id),
        p_line_type: requestedLineType === "sale_bonus" ? "sale" : requestedLineType,
        p_ui_line_type: requestedLineType,
        p_capture_mode: newLine.captureMode,
        p_requested_amount: newLine.captureMode === "amount" ? Number(newLine.value) : null,
        p_quantity: newLine.captureMode === "quantity" ? Number(newLine.value) : null,
      });
      if (result?.code !== 1) {
        toast.error(result?.message || "No se pudo agregar el producto");
        return;
      }
      if (requestedLineType === "sale_bonus") {
        const price = Number(selectedNewProduct.base_price || 0);
        const taxPercent = Number(selectedNewProduct.tax_percent || selectedNewProduct.rate_percent || 0);
        const rawSaleQuantity = newLine.captureMode === "quantity"
          ? Number(newLine.value)
          : Number(newLine.value) / price;
        const saleQuantity = isIntegerUnit(selectedNewProduct.unit)
          ? Math.floor(rawSaleQuantity)
          : Math.floor(rawSaleQuantity * 1000) / 1000;
        const saleCommercialValue = newLine.captureMode === "amount"
          ? Number(newLine.value || 0)
          : saleQuantity * price * (1 + taxPercent / 100);
        const projectedSaleTotal = Number(order?.grand_total || 0) + saleCommercialValue;
        const minimum = Number(salesSettings.bonus_minimum_amount || 0);
        const bonusUnitValue = price * (1 + taxPercent / 100);
        const bonusAllowance = saleCommercialValue * (Number(salesSettings.bonus_percent || 0) / 100);
        const rawBonusQuantity = projectedSaleTotal >= minimum && bonusUnitValue > 0
          ? bonusAllowance / bonusUnitValue
          : 0;
        const bonusQuantity = isIntegerUnit(selectedNewProduct.unit)
          ? (Math.ceil(rawBonusQuantity) * bonusUnitValue - bonusAllowance <= Number(salesSettings.bonus_max_company_loss_amount || 0)
              ? Math.ceil(rawBonusQuantity)
              : Math.floor(rawBonusQuantity))
          : Math.floor(rawBonusQuantity * 1000) / 1000;

        if (bonusQuantity > 0) {
          const bonusResult = await ordersService.upsertItem(order.id, {
            p_line_group_key: newLineGroupKey,
            p_product_id: Number(selectedNewProduct.id),
            p_line_type: "bonus",
            p_capture_mode: "quantity",
            p_quantity: bonusQuantity,
          });
          if (bonusResult?.code !== 1) {
            toast.error(bonusResult?.message || "La venta se agregó, pero no se pudo aplicar el vendaje automático");
            await onRefresh();
            return;
          }
        }
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

  const saveAllChanges = async () => {
    if (newLine.productId && !hasPendingNewLine) {
      toast.error("Ingresa el valor o la cantidad del producto nuevo");
      return;
    }
    setSavingKey("all");
    try {
      for (const item of displayItems.filter((candidate) => pendingRemovals.includes(candidate.id))) {
        await saveExisting(item, true);
      }
      for (const item of changedItems) await saveExisting(item);
      if (hasPendingNewLine) await addLine();
      setPendingRemovals([]);
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
      {!loading && displayItems.length === 0 ? <Alert severity="info">No hay productos en este pedido.</Alert> : null}

      {!canEdit && displayItems.length > 0 ? (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
          <Table sx={{ minWidth: 920 }} aria-label="Productos solicitados del pedido">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Solicitado</TableCell>
                <TableCell align="center">Unidades</TableCell>
                <TableCell align="right">Precio unitario</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                      {item.product_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.product_sku || "Sin SKU"} | {item.product_unit || "und"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 800 }}>
                      {lineTypeLabels[item.display_line_type || item.line_type] || item.line_type || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 800 }}>
                      {item.capture_mode === "amount"
                        ? `$${formatCurrencyValue(item.requested_amount, 0)}`
                        : `${Number(item.quantity || 0)} ${item.product_unit || ""}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.capture_mode === "amount" ? "Por valor" : "Por cantidad"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography sx={{ fontWeight: 900, fontSize: 20 }}>
                      {Number(item.display_quantity ?? item.quantity ?? 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 800 }}>
                      ${formatCurrencyValue(item.unit_price, 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 900 }}>
                      ${formatCurrencyValue(item.line_type === "sale" ? item.line_total : item.commercial_value, 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.line_type === "sale" ? "Cobrado" : "Comercial"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      {canEdit && displayItems.length > 0 ? (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <Table sx={{ width: "100%", tableLayout: "fixed" }} aria-label="Productos editables del pedido">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: { xs: "27%", md: "25%" }, px: { xs: 1, md: 2 } }}>Producto</TableCell>
                <TableCell sx={{ width: { xs: "33%", md: "31%" }, px: { xs: 0.5, md: 2 } }}>Configuración</TableCell>
                <TableCell sx={{ width: { xs: "28%", md: "29%" }, px: { xs: 0.5, md: 2 } }}>Valor</TableCell>
                <TableCell align="center" sx={{ width: { xs: "12%", md: "15%" }, px: { xs: 0.25, md: 2 } }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayItems.map((item) => {
                const draft = drafts[item.id] || toDraft(item);
                const amountError = getInvalidUnitSaleAmount(
                  { ...item, unit: item.product_unit, base_price: item.unit_price },
                  { ...draft, orderMode: draft.lineType }
                );

                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={pendingRemovals.includes(item.id) ? { bgcolor: "error.lighter", opacity: 0.7 } : undefined}
                  >
                    <TableCell sx={{ px: { xs: 1, md: 2 }, py: 1.5, verticalAlign: "top" }}>
                      <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere", fontSize: { xs: 13, md: 16 } }}>
                        {item.product_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                        ${formatCurrencyValue(item.unit_price, 0)} / {item.product_unit || "und"}
                      </Typography>
                      <Typography sx={{ mt: 0.5, fontWeight: 900, fontSize: { xs: 16, md: 20 } }}>
                        {Number(item.display_quantity ?? item.quantity ?? 0)} {item.product_unit || "und"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ px: { xs: 0.5, md: 2 }, py: 1.5, verticalAlign: "top" }}>
                      <Stack spacing={1}>
                        <OrderLineTypeSelect
                          value={draft.lineType}
                          options={getLineTypesForProduct(item)}
                          disabled={pendingRemovals.includes(item.id)}
                          onChange={(lineType) =>
                            setDrafts((current) => ({ ...current, [item.id]: { ...draft, lineType } }))
                          }
                        />
                        <CaptureModeSwitch
                          mode={draft.captureMode}
                          disabled={pendingRemovals.includes(item.id)}
                          onChange={(captureMode) =>
                            setDrafts((current) => ({ ...current, [item.id]: { ...draft, captureMode, value: "" } }))
                          }
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ px: { xs: 0.5, md: 2 }, py: 1.5, verticalAlign: "top" }}>
                      {draft.captureMode === "amount" ? (
                        <ColombianCurrencyField
                          size="small"
                          label="Valor solicitado"
                          name={`detail-${item.id}`}
                          value={draft.value}
                          disabled={pendingRemovals.includes(item.id)}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: { ...draft, value: event.target.value },
                            }))
                          }
                          error={amountError?.message}
                          helperText={amountError?.message}
                        />
                      ) : (
                        <TextField
                          size="small"
                          type="number"
                          label="Cantidad"
                          value={draft.value}
                          disabled={pendingRemovals.includes(item.id)}
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
                      <Typography sx={{ mt: 0.75, fontWeight: 900, fontSize: { xs: 14, md: 18 } }}>
                        ${formatCurrencyValue(item.line_type === "sale" ? item.line_total : item.commercial_value, 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ px: { xs: 0.25, md: 2 }, py: 1.5, verticalAlign: "top" }}>
                      <Button
                        size="small"
                        color={pendingRemovals.includes(item.id) ? "inherit" : "error"}
                        disabled={Boolean(savingKey)}
                        onClick={() => setPendingRemovals((current) => current.includes(item.id)
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id])}
                        sx={{ minWidth: 0, px: { xs: 0.5, md: 1.5 }, fontSize: { xs: 10, md: 13 } }}
                      >
                        {pendingRemovals.includes(item.id) ? "Deshacer" : "Retirar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      {canEdit ? (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 900 }}>Agregar producto</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Autocomplete
                  fullWidth
                  options={products}
                  value={selectedNewProduct || null}
                  getOptionLabel={(product) => `${product?.name || "Producto"} | $${formatCurrencyValue(product?.base_price, 0)}`}
                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                  onChange={(_event, product) => setNewLine((current) => ({
                    ...current,
                    productId: product?.id ? String(product.id) : "",
                    lineType: "sale",
                  }))}
                  noOptionsText="No se encontraron productos"
                  renderOption={(props, product) => (
                    <Box component="li" {...props} sx={{ display: "block", py: 1.25 }}>
                      <Typography sx={{ fontWeight: 900 }}>{product.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {product.category_name || "Sin categoría"} · ${formatCurrencyValue(product.base_price, 0)}
                      </Typography>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Buscar y seleccionar producto" placeholder="Escribe el nombre o precio" />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <OrderLineTypeSelect
                  value={newLine.lineType}
                  options={getLineTypesForProduct(selectedNewProduct)}
                  onChange={(lineType) => setNewLine((current) => ({ ...current, lineType }))}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CaptureModeSwitch
                  mode={newLine.captureMode}
                  onChange={(captureMode) => setNewLine((current) => ({ ...current, captureMode, value: "" }))}
                />
              </Grid>
              <Grid item xs={12}>
                {newLine.captureMode === "amount" ? (
                  <ColombianCurrencyField
                    label="Valor solicitado"
                    name="new-line-value"
                    value={newLine.value}
                    onChange={(event) => setNewLine((current) => ({ ...current, value: event.target.value }))}
                    error={getInvalidUnitSaleAmount(selectedNewProduct, { ...newLine, orderMode: newLine.lineType })?.message}
                    helperText={getInvalidUnitSaleAmount(selectedNewProduct, { ...newLine, orderMode: newLine.lineType })?.message}
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
              {hasPendingNewLine ? (
                <Grid item xs={12}>
                  <Alert severity="info">Este producto se agregará al usar el botón Guardar cambios.</Alert>
                </Grid>
              ) : null}
            </Grid>
          </Stack>
        </Box>
      ) : (
        <Alert severity="warning">
          Edicion bloqueada: el pedido esta cancelado o no permite cambios.
        </Alert>
      )}

      {canEdit ? (
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            bgcolor: "background.paper",
            borderTop: 1,
            borderColor: "divider",
            mx: -2,
            mb: -2,
            px: 2,
            py: 1.5,
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Typography sx={{ fontWeight: 800 }} color={pendingCount ? "secondary.main" : "text.secondary"}>
              {pendingCount ? `${pendingCount} cambio(s) pendiente(s)` : "No hay cambios pendientes"}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              disabled={!pendingCount || Boolean(savingKey) || Boolean(
                getInvalidUnitSaleAmount(selectedNewProduct, { ...newLine, orderMode: newLine.lineType })
              )}
              onClick={saveAllChanges}
              sx={{ minWidth: { sm: 220 }, minHeight: 48 }}
            >
              {savingKey ? "Guardando..." : "Guardar cambios"}
            </Button>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
};

export default OrderDetailEditor;
