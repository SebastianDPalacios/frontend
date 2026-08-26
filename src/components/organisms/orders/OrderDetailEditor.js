import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
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
import { isIntegerUnit, normalizeRows } from "views/modules/flow-utils";

const editableStatuses = ["draft", "confirmed", "ready", "dispatched", "delivered"];
const emptyNewLine = {
  productId: "",
  lineType: "sale",
  captureMode: "amount",
  value: "",
};

const toDraft = (item) => ({
  lineType: item.display_line_type || item.line_type || "sale",
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

const mergeSaleBonusItems = (items = []) => {
  const bonusByProduct = new Map();
  items.forEach((item) => {
    if (item.line_type === "bonus") bonusByProduct.set(String(item.product_id), item);
  });

  return items.reduce((rows, item) => {
    if (item.line_type === "bonus" && items.some(
      (candidate) => candidate.line_type === "sale" && String(candidate.product_id) === String(item.product_id)
    )) return rows;

    const bonusItem = item.line_type === "sale" ? bonusByProduct.get(String(item.product_id)) : null;
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

  const saveExisting = async (item, remove = false) => {
    const draft = drafts[item.id] || toDraft(item);
    const requestedLineType = draft.lineType;
    setSavingKey(`item-${item.id}`);
    try {
      if ((remove || requestedLineType !== "sale_bonus") && item.bonus_item) {
        const bonusRemoval = await ordersService.upsertItem(order.id, {
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
    setSavingKey("new");
    try {
      const requestedLineType = newLine.lineType;
      const result = await ordersService.upsertItem(order.id, {
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
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
          <Table sx={{ minWidth: 1180 }} aria-label="Productos editables del pedido">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Captura</TableCell>
                <TableCell>Valor o cantidad</TableCell>
                <TableCell align="center">Unidades</TableCell>
                <TableCell>Solicitado</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayItems.map((item) => {
                const draft = drafts[item.id] || toDraft(item);

                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                        {item.product_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.product_sku || "Sin SKU"} | ${formatCurrencyValue(item.unit_price, 0)} por {item.product_unit}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <OrderLineTypeSelect
                        value={draft.lineType}
                        disabled={!canEdit}
                        onChange={(lineType) =>
                          setDrafts((current) => ({ ...current, [item.id]: { ...draft, lineType } }))
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        Actual: {lineTypeLabels[item.display_line_type || item.line_type] || item.line_type || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
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
                    </TableCell>
                    <TableCell sx={{ minWidth: 190 }}>
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
                          label="Cantidad"
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
                    </TableCell>
                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 900, fontSize: 22 }}>
                        {Number(item.display_quantity ?? item.quantity ?? 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.product_unit || "und"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {item.capture_mode === "amount"
                          ? `$${formatCurrencyValue(item.requested_amount, 0)}`
                          : `${Number(item.quantity || 0)} ${item.product_unit}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.capture_mode === "amount" ? "Por valor" : "Por cantidad"}
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
                    <TableCell align="right" sx={{ minWidth: 240 }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                        <Button
                          variant="contained"
                          color="secondary"
                          disabled={Boolean(savingKey)}
                          onClick={() => saveExisting(item)}
                        >
                          {savingKey === `item-${item.id}` ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          disabled={Boolean(savingKey)}
                          onClick={() => saveExisting(item, true)}
                        >
                          Retirar
                        </Button>
                      </Stack>
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
          Edicion bloqueada: el pedido esta cancelado o no permite cambios.
        </Alert>
      )}
    </Stack>
  );
};

export default OrderDetailEditor;
