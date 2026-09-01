import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
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
import SellerPosOrderForm from "components/organisms/orders/SellerPosOrderForm";
import { isAdministrativeUser, isSalesOnlyUser } from "configs/access";
import authService from "services/auth/auth-service";
import ordersService from "services/orders/orders-service";
import getInvalidUnitSaleAmount from "utils/order-sale-validation";
import { getDisplayName, isIntegerUnit, normalizeRows } from "views/modules/flow-utils";

const today = toDateInputValue();

const orderModes = [
  { value: "sale_bonus", label: "Venta + vendaje" },
  { value: "sale", label: "Venta" },
  { value: "bonus", label: "Solo vendaje" },
  { value: "gift", label: "Obsequio" },
  { value: "exchange", label: "Cambio" },
];

const preferredCategoryOrder = [
  "Pan de sal",
  "Pan de dulce",
  "Pasteleria",
  "Pasteleria",
  "Integral",
  "Tostados",
];

const isPastryProduct = (product) => {
  return String(product?.category_name || "").toLowerCase().includes("pasteler");
};

const getOrderModesForProduct = (product) => {
  if (Number(product?.includes_bonus || 0) === 1) {
    return [
      { value: "sale", label: "Venta con vendaje incluido" },
      { value: "bonus", label: "Solo vendaje" },
      { value: "gift", label: "Obsequio" },
      { value: "exchange", label: "Cambio" },
    ];
  }
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
    return { quantity: 0, commercialValue: 0, requestedValue: 0 };
  }

  const subtotal = quantity * price;
  const commercialValue = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
  const requestedValue = entry?.captureMode === "amount" ? Number(entry.value || 0) : commercialValue;
  return { quantity, commercialValue, requestedValue };
};

const calculateAutomaticBonus = (product, allowance, maxCompanyLoss = 0) => {
  const commercialUnitPrice = getCommercialUnitPrice(product);
  if (commercialUnitPrice <= 0 || allowance <= 0) {
    return { quantity: 0, commercialValue: 0 };
  }

  const raw = allowance / commercialUnitPrice;
  const quantity = isIntegerUnit(product.unit)
    ? (Math.ceil(raw) * commercialUnitPrice - allowance <= Number(maxCompanyLoss || 0)
        ? Math.ceil(raw)
        : Math.floor(raw))
    : Math.floor(raw * 1000) / 1000;

  if (quantity <= 0) {
    return { quantity: 0, commercialValue: 0 };
  }

  return {
    quantity,
    commercialValue: Math.round(quantity * commercialUnitPrice * 100) / 100,
  };
};

const getDisplayedEntryValue = (entry, calculation) => (
  entry?.orderMode === "sale_bonus"
    ? calculation.requestedValue
    : calculation.commercialValue
);

const createSelectedLine = (product) => ({
  id: `${product.id}-${Date.now()}`,
  productId: Number(product.id),
  orderMode: "sale",
  captureMode: "amount",
  value: "",
});

const AtomicOrderForm = () => {
  const currentUser = authService.getCurrentUser();
  const compactViewport = useMediaQuery("(max-width:1024px)", { noSsr: true });
  const sellerPosMode = compactViewport
    && (isSalesOnlyUser(currentUser) || isAdministrativeUser(currentUser));
  const showCreditDetails = isAdministrativeUser(currentUser);
  const canAssignSeller = isAdministrativeUser(currentUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({
    bonus_percent: 20,
    bonus_minimum_amount: 2000,
    bonus_max_company_loss_amount: 1500,
  });
  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [orderDate, setOrderDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedLines, setSelectedLines] = useState([]);
  const [customerCredit, setCustomerCredit] = useState({ balance_amount: 0, ledger: [] });

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
        const nextSellers = normalizeRows(orderData.data?.sellers);
        const nextProducts = normalizeRows(orderData.data?.products);
        const nextBranches = normalizeRows(orderData.data?.branches);
        setCustomers(nextCustomers);
        setSellers(nextSellers);
        setProducts(nextProducts);
        setBranches(nextBranches);
        setSettings(
          orderData.data?.sales_settings || {
            bonus_percent: 20,
            bonus_minimum_amount: 2000,
            bonus_max_company_loss_amount: 1500,
          }
        );
        if (!canAssignSeller) {
          setCustomerId(nextCustomers[0]?.id ? String(nextCustomers[0].id) : "");
        }
        setBranchId(nextBranches[0]?.id ? String(nextBranches[0].id) : "");
      } catch (requestError) {
        setError(requestError?.response?.data?.message || requestError?.message || "Error al cargar el formulario");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canAssignSeller]);

  useEffect(() => {
    if (!canAssignSeller || !sellerId) return undefined;
    let active = true;
    setCustomersLoading(true);
    setCustomerId("");
    ordersService.getBaseData({
      onlyActive: 1,
      page: 1,
      pageSize: 200,
      salesAgentUserId: sellerId,
    }).then((response) => {
      if (!active) return;
      if (response?.code !== 1) {
        setCustomers([]);
        setError(response?.message || "No se pudieron consultar los clientes del vendedor");
        return;
      }
      setCustomers(normalizeRows(response.data?.customers));
    }).catch((requestError) => {
      if (!active) return;
      setCustomers([]);
      setError(requestError?.response?.data?.message || requestError?.message || "Error al consultar clientes");
    }).finally(() => {
      if (active) setCustomersLoading(false);
    });
    return () => { active = false; };
  }, [canAssignSeller, sellerId]);

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
    return products.filter((product) => {
      return !selectedCategoryId || String(product.category_id || "") === String(selectedCategoryId);
    });
  }, [products, selectedCategoryId]);

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
        ? total + row.calculation.requestedValue
        : total;
    }, 0);
    const minimum = Number(settings.bonus_minimum_amount || 0);
    const percent = Number(settings.bonus_percent || 0);
    const bonusEnabled = bonusEligibleSaleTotal >= minimum;
    const regulatedSaleTotal = preparedRows.reduce((total, row) => (
      row.entry.orderMode === "sale_bonus" && !isPastryProduct(row.product)
        ? total + row.calculation.requestedValue
        : total
    ), 0);
    const hasRegulatedBonus = regulatedSaleTotal > 0;
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
        uiLineType: orderMode,
        captureMode: entry.captureMode,
        requestedAmount: entry.captureMode === "amount" ? Number(entry.value) : null,
        quantity: calculation.quantity,
        commercialValue: calculation.commercialValue,
        transactionValue: ["sale", "exchange"].includes(primaryType)
          ? calculation.requestedValue
          : calculation.commercialValue,
        automatic: false,
      });

      if (orderMode === "sale_bonus" && bonusEnabled && !isPastryProduct(product)) {
        const automaticBonus = calculateAutomaticBonus(
          product,
          calculation.requestedValue * (percent / 100),
          settings.bonus_max_company_loss_amount
        );
        if (automaticBonus.quantity > 0) {
          lines.push({
            key: `${entry.id}-bonus`,
            product,
            lineType: "bonus",
            uiLineType: "sale_bonus",
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
        if (line.lineType === "sale") acc.saleTotal += line.transactionValue;
        if (line.lineType === "bonus") acc.bonusTotal += line.commercialValue;
        if (line.lineType === "gift") acc.giftTotal += line.commercialValue;
        if (line.lineType === "exchange") acc.exchangeTotal += line.transactionValue;
        return acc;
      },
      { saleTotal: 0, bonusTotal: 0, giftTotal: 0, exchangeTotal: 0 }
    );
    summary.regulatedBonusTotal = lines.reduce((total, line) => (
      line.lineType === "bonus" && line.uiLineType === "sale_bonus"
        ? total + Number(line.commercialValue || 0)
        : total
    ), 0);
    summary.hasRegulatedBonus = hasRegulatedBonus;
    summary.bonusGenerated = bonusEnabled && hasRegulatedBonus
      ? regulatedSaleTotal * (percent / 100)
      : 0;
    summary.allowedBonus = bonusEnabled && hasRegulatedBonus
      ? summary.bonusGenerated
        + Number(settings.bonus_max_company_loss_amount || 0)
      : 0;
    summary.bonusCompanyDifference = Math.max(summary.regulatedBonusTotal - summary.bonusGenerated, 0);
    summary.bonusExceeded = summary.regulatedBonusTotal > summary.allowedBonus + 0.01;
    const invalidUnitSales = preparedRows
      .map((row) => getInvalidUnitSaleAmount(row.product, row.entry))
      .filter(Boolean);

    return { rows: preparedRows, lines, summary, bonusEnabled, invalidUnitSales };
  }, [productsById, selectedLines, settings]);

  const availableCustomers = useMemo(() => (
    canAssignSeller
      ? customers.filter((customer) => String(customer.sales_agent_user_id) === String(sellerId))
      : customers
  ), [canAssignSeller, customers, sellerId]);
  const selectedSeller = sellers.find((seller) => String(seller.id) === String(sellerId)) || null;
  const selectedCustomer = availableCustomers.find(
    (customer) => String(customer.id) === String(customerId)
  ) || null;
  const creditAvailable = Number(customerCredit?.balance_amount || 0);
  const creditRedeemedAmount = Math.min(creditAvailable, Number(preparedOrder.summary.exchangeTotal || 0));

  useEffect(() => {
    let active = true;
    const loadCredit = async () => {
      if (!customerId) {
        setCustomerCredit({ balance_amount: 0, ledger: [] });
        return;
      }
      try {
        const response = await ordersService.getCustomerCredit(customerId);
        if (active && response?.code === 1) {
          setCustomerCredit(response.data || { balance_amount: 0, ledger: [] });
          return;
        }
        if (active) {
          setCustomerCredit({ balance_amount: 0, ledger: [] });
        }
      } catch (_error) {
        if (active) {
          setCustomerCredit({ balance_amount: 0, ledger: [] });
        }
      }
    };
    loadCredit();
    return () => {
      active = false;
    };
  }, [customerId]);

  const addProduct = () => {
    if (!selectedProduct?.id) {
      return;
    }
    setSelectedLines((current) => [...current, createSelectedLine(selectedProduct)]);
    setSelectedProduct(null);
  };

  const addConfiguredProduct = (product, configuration) => {
    setSelectedLines((current) => [
      ...current,
      { ...createSelectedLine(product), ...configuration },
    ]);
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
    if (saving) return;
    setError("");
    if (canAssignSeller && !sellerId) {
      setError("Selecciona el vendedor al que se asignara el pedido");
      return;
    }
    if (!branchId || !customerId) {
      setError("Selecciona sucursal y cliente");
      return;
    }
    if (!preparedOrder.lines.some((line) => ["sale", "gift", "exchange"].includes(line.lineType))) {
      setError("Agrega al menos un producto de venta, obsequio o cambio");
      return;
    }
    if (preparedOrder.rows.some((row) => row.calculation.quantity <= 0)) {
      setError("Completa el valor o la cantidad de todos los productos agregados");
      return;
    }
    const invalidUnitSale = preparedOrder.invalidUnitSales[0];
    if (invalidUnitSale) {
      setError(`En ${invalidUnitSale.product.name}, ${invalidUnitSale.message.toLowerCase()}`);
      return;
    }
    if (preparedOrder.summary.bonusExceeded) {
      setError("El vendaje seleccionado supera el limite disponible");
      return;
    }
    save();
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await ordersService.createOrder({
        p_branch_id: Number(branchId),
        p_customer_id: Number(customerId),
        ...(canAssignSeller ? { p_sales_agent_user_id: Number(sellerId) } : {}),
        p_order_date: orderDate,
        p_delivery_date: deliveryDate,
        p_notes: notes || null,
        p_credit_redeemed_amount: creditRedeemedAmount,
        p_items_json: preparedOrder.lines.map((line) => ({
          product_id: Number(line.product.id),
          line_type: line.lineType,
          ui_line_type: line.uiLineType,
          capture_mode: line.captureMode,
          requested_amount: line.requestedAmount,
          quantity: line.quantity,
        })),
      });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo guardar el pedido");
        return;
      }
      toast.success(`Pedido #${response.data.order_id} guardado`);
      setSelectedLines([]);
      setNotes("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Error al guardar el pedido");
    } finally {
      setSaving(false);
    }
  };

  if (sellerPosMode) {
    return (
      <SellerPosOrderForm
        loading={loading}
        saving={saving}
        error={error}
        customers={availableCustomers}
        customersLoading={customersLoading}
        canAssignSeller={canAssignSeller}
        sellers={sellers}
        sellerId={sellerId}
        setSellerId={setSellerId}
        products={products}
        productCategories={productCategories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        customerId={customerId}
        setCustomerId={setCustomerId}
        notes={notes}
        setNotes={setNotes}
        selectedLines={selectedLines}
        preparedOrder={preparedOrder}
        settings={settings}
        creditAvailable={creditAvailable}
        creditRedeemedAmount={creditRedeemedAmount}
        getModes={getOrderModesForProduct}
        addConfiguredProduct={addConfiguredProduct}
        removeLine={removeLine}
        onReview={validateBeforeConfirmation}
      />
    );
  }

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && customers.length === 0 ? (
        <Alert severity="warning">No tienes clientes asignados. Solicita al administrador que realice la asignacion.</Alert>
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
            {canAssignSeller ? (
              <Autocomplete
                options={sellers}
                value={selectedSeller}
                getOptionLabel={(option) => getDisplayName(option)}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                onChange={(_event, seller) => {
                  setSellerId(seller?.id ? String(seller.id) : "");
                  setCustomerId("");
                }}
                renderInput={(params) => <TextField {...params} label="Vendedor" />}
              />
            ) : (
              <Autocomplete
                options={availableCustomers}
                value={selectedCustomer}
                getOptionLabel={(option) => getDisplayName(option)}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                onChange={(_event, customer) => setCustomerId(customer?.id ? String(customer.id) : "")}
                renderInput={(params) => <TextField {...params} label="Cliente asignado" />}
              />
            )}
          </Grid>
          {canAssignSeller ? (
            <Grid item xs={12} sm={6} lg={3}>
              <Autocomplete
                options={availableCustomers}
                value={selectedCustomer}
                disabled={!sellerId}
                loading={customersLoading}
                getOptionLabel={(option) => getDisplayName(option)}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                onChange={(_event, customer) => setCustomerId(customer?.id ? String(customer.id) : "")}
                noOptionsText={sellerId ? "Este vendedor no tiene clientes asignados" : "Selecciona primero un vendedor"}
                renderInput={(params) => <TextField {...params} label="Cliente del vendedor" />}
              />
            </Grid>
          ) : null}
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
                Busca un producto, agregalo y configura como se entregara.
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
                Aun no has agregado productos al pedido.
              </Alert>
            ) : null}

            <Stack divider={<Divider flexItem />}>
              {preparedOrder.rows.map(({ entry, product, calculation }, index) => {
                const rowOrderModes = getOrderModesForProduct(product);
                const orderModeValue = rowOrderModes.some((mode) => mode.value === entry.orderMode)
                  ? entry.orderMode
                  : rowOrderModes[0]?.value || "sale";
                const automaticBonus = orderModeValue === "sale_bonus" && preparedOrder.bonusEnabled && !isPastryProduct(product)
                  ? calculateAutomaticBonus(
                      product,
                      calculation.requestedValue * (Number(settings.bonus_percent || 0) / 100),
                      settings.bonus_max_company_loss_amount
                    )
                  : { quantity: 0, commercialValue: 0 };
                const invalidUnitSale = getInvalidUnitSaleAmount(product, { ...entry, orderMode: orderModeValue });

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
                            error={invalidUnitSale?.message}
                            helperText={invalidUnitSale?.message}
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
                        <Chip size="small" variant="outlined" label={`Valor ${formatCurrencyValue(getDisplayedEntryValue(entry, calculation), 0)}`} />
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
            <OrderDraftSummary
              summary={preparedOrder.summary}
              settings={settings}
              creditAvailable={creditAvailable}
              creditRedeemed={creditRedeemedAmount}
              showCreditDetails={showCreditDetails}
            />
            <AppButton
              fullWidth
              color="secondary"
              disabled={saving || loading || customers.length === 0 || selectedLines.length === 0 || preparedOrder.invalidUnitSales.length > 0}
              onClick={validateBeforeConfirmation}
              sx={{ mt: 2.5, minHeight: 48 }}
            >
              {saving ? "Guardando..." : "Guardar pedido"}
            </AppButton>
          </Paper>
        </Grid>
      </Grid>

    </Stack>
  );
};

export default AtomicOrderForm;







