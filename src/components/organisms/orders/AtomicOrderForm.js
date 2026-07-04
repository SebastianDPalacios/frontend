import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import ColombianCurrencyField, { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";
import CaptureModeSwitch from "components/atoms/CaptureModeSwitch";
import OrderDraftSummary from "components/molecules/OrderDraftSummary";
import ordersService from "services/orders/orders-service";
import { getDisplayName, isIntegerUnit, normalizeRows } from "views/modules/flow-utils";

const today = toDateInputValue();

const orderModes = [
  { value: "sale", label: "Venta" },
  { value: "sale_bonus", label: "Venta + vendaje" },
  { value: "bonus", label: "Solo vendaje" },
  { value: "gift", label: "Obsequio" },
  { value: "exchange", label: "Cambio" },
];

const lineLabels = {
  sale: "Venta",
  bonus: "Vendaje",
  gift: "Obsequio",
  exchange: "Cambio",
};

const preferredCategoryOrder = [
  "Pan de sal",
  "Pan de dulce",
  "Pasteleria",
  "Pastelería",
  "Integral",
  "Tostados",
];

const isPastryProduct = (product) => {
  return String(product?.category_name || "").toLowerCase().includes("pasteler");
};

const getOrderModesForProduct = (product) => {
  if (!isPastryProduct(product)) {
    return orderModes;
  }
  return orderModes.filter((mode) => !["sale_bonus", "bonus"].includes(mode.value));
};

const getCommercialUnitPrice = (product) => {
  const price = Number(product?.base_price || 0);
  const taxPercent = Number(product?.tax_percent || product?.rate_percent || 0);
  return price * (1 + taxPercent / 100);
};

const calculateEntry = (product, entry) => {
  const price = Number(product?.base_price || 0);
  const taxPercent = Number(product?.tax_percent || product?.rate_percent || 0);
  let quantity = Number(entry?.value || 0);

  if (entry?.captureMode === "amount" && price > 0) {
    const raw = quantity / price;
    quantity = isIntegerUnit(product.unit) ? Math.floor(raw) : Math.floor(raw * 1000) / 1000;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { quantity: 0, commercialValue: 0 };
  }

  const subtotal = quantity * price;
  const commercialValue = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
  return { quantity, commercialValue };
};

const calculateAutomaticBonus = (product, allowance) => {
  const commercialUnitPrice = getCommercialUnitPrice(product);
  if (commercialUnitPrice <= 0 || allowance <= 0) {
    return { quantity: 0, commercialValue: 0 };
  }

  const raw = allowance / commercialUnitPrice;
  const quantity = isIntegerUnit(product.unit)
    ? Math.floor(raw)
    : Math.floor(raw * 1000) / 1000;

  if (quantity <= 0) {
    return { quantity: 0, commercialValue: 0 };
  }

  return {
    quantity,
    commercialValue: Math.round(quantity * commercialUnitPrice * 100) / 100,
  };
};

const createSelectedLine = (productId) => ({
  id: `${productId}-${Date.now()}`,
  productId: Number(productId),
  orderMode: "sale",
  captureMode: "amount",
  value: "",
});

const AtomicOrderForm = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({
    bonus_percent: 20,
    bonus_minimum_amount: 2000,
  });
  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [orderDate, setOrderDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedLines, setSelectedLines] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const orderData = await ordersService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 200,
        });
        if (orderData?.code !== 1) {
          setError(orderData?.message || "No se pudieron cargar los datos");
          return;
        }

        const nextCustomers = normalizeRows(orderData.data?.customers);
        const nextProducts = normalizeRows(orderData.data?.products);
        const nextBranches = normalizeRows(orderData.data?.branches);
        setCustomers(nextCustomers);
        setProducts(nextProducts);
        setBranches(nextBranches);
        setSettings(
          orderData.data?.sales_settings || {
            bonus_percent: 20,
            bonus_minimum_amount: 2000,
          }
        );
        setCustomerId(nextCustomers[0]?.id ? String(nextCustomers[0].id) : "");
        setBranchId(nextBranches[0]?.id ? String(nextBranches[0].id) : "");
      } catch (requestError) {
        setError(requestError?.response?.data?.message || requestError?.message || "Error al cargar el formulario");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const productsById = useMemo(
    () => new Map(products.map((product) => [Number(product.id), product])),
    [products]
  );

  const productCategories = useMemo(() => {
    const categoriesById = new Map();
    products.forEach((product) => {
      const id = Number(product.category_id || 0);
      const name = String(product.category_name || "").trim();
      if (id > 0 && name && !categoriesById.has(id)) {
        categoriesById.set(id, { id, name });
      }
    });

    return Array.from(categoriesById.values()).sort((a, b) => {
      const aIndex = preferredCategoryOrder.findIndex(
        (name) => name.toLowerCase() === a.name.toLowerCase()
      );
      const bIndex = preferredCategoryOrder.findIndex(
        (name) => name.toLowerCase() === b.name.toLowerCase()
      );
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      }
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const availableProducts = useMemo(() => {
    const selectedIds = new Set(selectedLines.map((line) => Number(line.productId)));
    return products.filter((product) => {
      const belongsToCategory = !selectedCategoryId
        || String(product.category_id || "") === String(selectedCategoryId);
      return !selectedIds.has(Number(product.id)) && belongsToCategory;
    });
  }, [products, selectedCategoryId, selectedLines]);

  const preparedOrder = useMemo(() => {
    const preparedRows = selectedLines.map((entry) => {
      const product = productsById.get(Number(entry.productId));
      return {
        entry,
        product,
        calculation: calculateEntry(product, entry),
      };
    });

    const bonusEligibleSaleTotal = preparedRows.reduce((total, row) => {
      return ["sale", "sale_bonus"].includes(row.entry.orderMode) && !isPastryProduct(row.product)
        ? total + row.calculation.commercialValue
        : total;
    }, 0);
    const minimum = Number(settings.bonus_minimum_amount || 0);
    const percent = Number(settings.bonus_percent || 0);
    const bonusEnabled = bonusEligibleSaleTotal >= minimum;
    const lines = [];

    preparedRows.forEach((row) => {
      const { entry, product, calculation } = row;
      if (!product || calculation.quantity <= 0) {
        return;
      }

      const orderMode = isPastryProduct(product) && ["sale_bonus", "bonus"].includes(entry.orderMode)
        ? "sale"
        : entry.orderMode;
      const primaryType = orderMode === "sale_bonus" ? "sale" : orderMode;
      lines.push({
        key: `${entry.id}-${primaryType}`,
        product,
        lineType: primaryType,
        captureMode: entry.captureMode,
        requestedAmount: entry.captureMode === "amount" ? Number(entry.value) : null,
        quantity: calculation.quantity,
        commercialValue: calculation.commercialValue,
        automatic: false,
      });

      if (orderMode === "sale_bonus" && bonusEnabled && !isPastryProduct(product)) {
        const automaticBonus = calculateAutomaticBonus(
          product,
          calculation.commercialValue * (percent / 100)
        );
        if (automaticBonus.quantity > 0) {
          lines.push({
            key: `${entry.id}-bonus`,
            product,
            lineType: "bonus",
            captureMode: "quantity",
            requestedAmount: null,
            quantity: automaticBonus.quantity,
            commercialValue: automaticBonus.commercialValue,
            automatic: true,
          });
        }
      }
    });

    const summary = lines.reduce(
      (acc, line) => {
        if (line.lineType === "sale") acc.saleTotal += line.commercialValue;
        if (line.lineType === "bonus") acc.bonusTotal += line.commercialValue;
        if (line.lineType === "gift") acc.giftTotal += line.commercialValue;
        if (line.lineType === "exchange") acc.exchangeTotal += line.commercialValue;
        return acc;
      },
      { saleTotal: 0, bonusTotal: 0, giftTotal: 0, exchangeTotal: 0 }
    );
    summary.allowedBonus = bonusEnabled ? bonusEligibleSaleTotal * (percent / 100) : 0;
    summary.bonusExceeded = summary.bonusTotal > summary.allowedBonus + 0.01;

    return { rows: preparedRows, lines, summary, bonusEnabled };
  }, [productsById, selectedLines, settings]);

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));

  const addProduct = () => {
    if (!selectedProduct?.id) {
      return;
    }
    setSelectedLines((current) => [...current, createSelectedLine(selectedProduct.id)]);
    setSelectedProduct(null);
  };

  const updateLine = (lineId, changes) => {
    setSelectedLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...changes } : line))
    );
  };

  const removeLine = (lineId) => {
    setSelectedLines((current) => current.filter((line) => line.id !== lineId));
  };

  const validateBeforeConfirmation = () => {
    setError("");
    if (!branchId || !customerId) {
      setError("Selecciona sucursal y cliente");
      return;
    }
    if (!preparedOrder.lines.some((line) => line.lineType === "sale")) {
      setError("Agrega al menos un producto de venta");
      return;
    }
    if (preparedOrder.rows.some((row) => row.calculation.quantity <= 0)) {
      setError("Completa el valor o la cantidad de todos los productos agregados");
      return;
    }
    if (preparedOrder.summary.bonusExceeded) {
      setError("El vendaje seleccionado supera el límite disponible");
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await ordersService.createOrder({
        p_branch_id: Number(branchId),
        p_customer_id: Number(customerId),
        p_order_date: orderDate,
        p_delivery_date: deliveryDate,
        p_notes: notes || null,
        p_items_json: preparedOrder.lines.map((line) => ({
          product_id: Number(line.product.id),
          line_type: line.lineType,
          capture_mode: line.captureMode,
          requested_amount: line.requestedAmount,
          quantity: line.quantity,
        })),
      });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo guardar el pedido");
        setConfirmOpen(false);
        return;
      }
      toast.success(`Pedido #${response.data.order_id} guardado`);
      setConfirmOpen(false);
      setSelectedLines([]);
      setNotes("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Error al guardar el pedido");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && customers.length === 0 ? (
        <Alert severity="warning">No tienes clientes asignados. Solicita al administrador que realice la asignación.</Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
          Datos del pedido
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} lg={3}>
            <TextField select fullWidth label="Sucursal" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((branch) => <MenuItem key={branch.id} value={String(branch.id)}>{getDisplayName(branch)}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <TextField select fullWidth label="Cliente asignado" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              {customers.map((customer) => <MenuItem key={customer.id} value={String(customer.id)}>{getDisplayName(customer)}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <BalanceDatePicker fullWidth label="Fecha pedido" value={orderDate} minDate={today} onChange={setOrderDate} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <BalanceDatePicker fullWidth label="Fecha entrega" value={deliveryDate} minDate={orderDate || today} onChange={setDeliveryDate} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} inputProps={{ maxLength: 255 }} />
          </Grid>
        </Grid>
      </Paper>

      <Grid
        container
        columnSpacing={{ xs: 0, lg: 2.5 }}
        rowSpacing={2.5}
        sx={{ alignItems: "flex-start", minWidth: 0, width: "100%", ml: 0 }}
      >
        <Grid item xs={12} lg={8} sx={{ minWidth: 0 }}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Productos del pedido
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Busca un producto, agrégalo y configura cómo se entregará.
              </Typography>
              {productCategories.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label="Categoria"
                    value={selectedCategoryId}
                    onChange={(event) => {
                      setSelectedCategoryId(event.target.value);
                      setSelectedProduct(null);
                    }}
                    helperText="Filtra los productos finales por categoria"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {productCategories.map((category) => (
                      <MenuItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              ) : null}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Autocomplete
                  fullWidth
                  options={availableProducts}
                  value={selectedProduct}
                  onChange={(_, value) => setSelectedProduct(value)}
                  getOptionLabel={(option) => option.name || "Producto"}
                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                  noOptionsText="No hay productos disponibles"
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: "block", py: 1.25 }}>
                      <Typography sx={{ fontWeight: 900 }}>{option.name || "Producto"}</Typography>
                      {option.category_name ? (
                        <Typography variant="body2" color="text.secondary">
                          {option.category_name}
                        </Typography>
                      ) : null}
                    </Box>
                  )}
                  renderInput={(params) => <TextField {...params} label="Seleccionar producto final" />}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AddRoundedIcon />}
                  onClick={addProduct}
                  disabled={!selectedProduct}
                  sx={{ minWidth: { sm: 130 }, flexShrink: 0 }}
                >
                  Agregar
                </Button>
              </Stack>
            </Box>

            <Divider />
            {loading ? <Alert severity="info" sx={{ m: 2 }}>Cargando productos...</Alert> : null}
            {!loading && selectedLines.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>
                Aún no has agregado productos al pedido.
              </Alert>
            ) : null}

            <Stack divider={<Divider flexItem />}>
              {preparedOrder.rows.map(({ entry, product, calculation }, index) => {
                const rowOrderModes = getOrderModesForProduct(product);
                const orderModeValue = rowOrderModes.some((mode) => mode.value === entry.orderMode)
                  ? entry.orderMode
                  : "sale";
                const automaticBonus = orderModeValue === "sale_bonus" && preparedOrder.bonusEnabled && !isPastryProduct(product)
                  ? calculateAutomaticBonus(
                      product,
                      calculation.commercialValue * (Number(settings.bonus_percent || 0) / 100)
                    )
                  : { quantity: 0, commercialValue: 0 };

                return (
                  <Box key={entry.id} sx={{ p: { xs: 2, md: 2.5 }, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                          {index + 1}. {product?.name || "Producto"}
                        </Typography>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
                          {product?.category_name ? (
                            <Chip size="small" variant="outlined" label={product.category_name} />
                          ) : null}
                          <Typography variant="body2" color="text.secondary">
                            ${formatCurrencyValue(product?.base_price, 0)} por {product?.unit || "unidad"}
                          </Typography>
                        </Stack>
                      </Box>
                      <IconButton color="error" aria-label={`Retirar ${product?.name || "producto"}`} onClick={() => removeLine(entry.id)}>
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>

                    <Grid
                      container
                      columnSpacing={{ xs: 0, md: 1.5 }}
                      rowSpacing={1.5}
                      sx={{ alignItems: "center", width: "100%", ml: 0 }}
                    >
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          fullWidth
                          label="Tipo"
                          value={orderModeValue}
                          onChange={(event) => updateLine(entry.id, { orderMode: event.target.value })}
                        >
                          {rowOrderModes.map((mode) => (
                            <MenuItem key={mode.value} value={mode.value}>{mode.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <CaptureModeSwitch
                          mode={entry.captureMode}
                          onChange={(captureMode) => updateLine(entry.id, { captureMode, value: "" })}
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        {entry.captureMode === "amount" ? (
                          <ColombianCurrencyField
                            label="Valor solicitado"
                            name={`amount-${entry.id}`}
                            value={entry.value}
                            onChange={(event) => updateLine(entry.id, { value: event.target.value })}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            type="number"
                            label="Cantidad"
                            value={entry.value}
                            onChange={(event) => updateLine(entry.id, { value: event.target.value })}
                            inputProps={{ min: 0, step: isIntegerUnit(product?.unit) ? 1 : 0.001, inputMode: "decimal" }}
                          />
                        )}
                      </Grid>
                    </Grid>

                    {calculation.quantity > 0 ? (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5, alignItems: { sm: "center" }, flexWrap: "wrap" }}>
                        <Chip size="small" variant="outlined" label={`${calculation.quantity} unidades`} />
                        <Chip size="small" variant="outlined" label={`Valor ${formatCurrencyValue(calculation.commercialValue, 0)}`} />
                        {orderModeValue === "sale_bonus" && !isPastryProduct(product) ? (
                          preparedOrder.bonusEnabled && automaticBonus.quantity > 0 ? (
                            <Chip
                              size="small"
                              color="success"
                              label={`+ ${automaticBonus.quantity} de vendaje`}
                            />
                          ) : (
                            <Chip
                              size="small"
                              color="warning"
                              variant="outlined"
                              label={`Vendaje desde $${formatCurrencyValue(settings.bonus_minimum_amount, 0)}`}
                            />
                          )
                        ) : null}
                      </Stack>
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4} sx={{ minWidth: 0 }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              position: { lg: "sticky" },
              top: { lg: 88 },
            }}
          >
            <OrderDraftSummary summary={preparedOrder.summary} settings={settings} />
            <AppButton
              fullWidth
              color="secondary"
              disabled={loading || customers.length === 0 || selectedLines.length === 0}
              onClick={validateBeforeConfirmation}
              sx={{ mt: 2.5, minHeight: 48 }}
            >
              Revisar pedido
            </AppButton>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirmar lo que vamos a vender</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>{selectedCustomer?.name || "Cliente"}</Typography>
              <Typography variant="body2" color="text.secondary">
                Entrega: {deliveryDate}
              </Typography>
            </Box>

            <Stack divider={<Divider flexItem />}>
              {preparedOrder.lines.map((line) => (
                <Stack key={line.key} direction="row" spacing={2} sx={{ py: 1.25, justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 800 }}>{line.product.name}</Typography>
                      <Chip
                        size="small"
                        color={line.lineType === "bonus" ? "success" : "default"}
                        label={line.automatic ? "Vendaje automático" : lineLabels[line.lineType]}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {line.quantity} unidades
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                    {line.lineType === "sale"
                      ? `$${formatCurrencyValue(line.commercialValue, 0)}`
                      : "Sin cobro"}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <OrderDraftSummary summary={preparedOrder.summary} settings={settings} />
            </Paper>

            <Alert severity="info">
              Al confirmar se creará el pedido en estado borrador. Podrás editarlo antes de enviarlo a despacho.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button color="secondary" variant="outlined" onClick={() => setConfirmOpen(false)} disabled={saving}>
            Volver
          </Button>
          <AppButton color="secondary" loading={saving} onClick={save}>
            Confirmar y guardar
          </AppButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default AtomicOrderForm;
