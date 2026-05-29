import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Grid, InputAdornment, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatMoney = (value) => currencyFormatter.format(Number(value || 0));

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const OrdersCountPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({});
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordersResponse, inventoryResponse] = await Promise.all([
          ordersService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 }),
          inventoryService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 }),
        ]);

        if (ordersResponse?.code !== 1) {
          setError(ordersResponse?.message || "No se pudo cargar conteo de pedidos");
          return;
        }

        if (inventoryResponse?.code !== 1) {
          setError(inventoryResponse?.message || "No se pudo cargar sucursales para pedido");
          return;
        }

        const productRows = normalizeRows(ordersResponse.data?.products);
        const customerRows = normalizeRows(ordersResponse.data?.customers);
        const routeRows = normalizeRows(ordersResponse.data?.routes);
        const branchRows = normalizeRows(inventoryResponse.data?.branches);

        setProducts(productRows);
        setCustomers(customerRows);
        setRoutes(routeRows);
        setBranches(branchRows);
        setSelectedBranch(branchRows[0]?.id ? String(branchRows[0].id) : "");
        setSelectedCustomer(customerRows[0]?.id ? String(customerRows[0].id) : "");
        setSelectedRoute(routeRows[0]?.id ? String(routeRows[0].id) : "");
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar conteo de pedidos"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const totalUnits = Object.values(counts).reduce((acc, value) => acc + Number(value || 0), 0);

  const onCreateOrder = async () => {
    if (saving) {
      return;
    }

    setError(null);
    setFieldErrors({});
    const items = products
      .map((product) => ({
        productId: Number(product.id),
        quantity: Number(counts[product.id] || 0),
      }))
      .filter((item) => item.productId > 0 && item.quantity > 0);

    const nextErrors = {};
    if (!selectedBranch) {
      nextErrors.selectedBranch = "Selecciona una sucursal";
    }
    if (!selectedCustomer) {
      nextErrors.selectedCustomer = "Selecciona un cliente";
    }
    if (routes.length > 0 && !selectedRoute) {
      nextErrors.selectedRoute = "Selecciona un repartidor";
    }

    if (!orderDate) {
      nextErrors.orderDate = "La fecha del pedido es obligatoria";
    }

    if (!deliveryDate) {
      nextErrors.deliveryDate = "La fecha de entrega es obligatoria";
    }

    if (orderDate && deliveryDate && new Date(deliveryDate) < new Date(orderDate)) {
      nextErrors.deliveryDate = "La entrega no puede ser menor a la fecha del pedido";
    }

    if (notes.length > 250) {
      nextErrors.notes = "Maximo 250 caracteres";
    }

    const invalidCount = products.some((product) => {
      const raw = counts[product.id];
      if (raw === "" || raw === undefined || raw === null) {
        return false;
      }

      const value = Number(raw);
      return Number.isNaN(value) || value < 0;
    });

    if (invalidCount) {
      nextErrors.counts = "No se permiten cantidades negativas";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Corrige los campos marcados antes de guardar");
      return;
    }

    if (items.length === 0) {
      setError("Ingresa al menos una unidad para guardar el pedido");
      return;
    }

    setSaving(true);
    try {
      const orderResult = await ordersService.createOrder({
        p_branch_id: Number(selectedBranch),
        p_customer_id: Number(selectedCustomer),
        p_route_id: routes.length > 0 && selectedRoute ? Number(selectedRoute) : null,
        p_order_date: orderDate,
        p_delivery_date: deliveryDate,
        p_notes: notes || null,
      });

      if (orderResult?.code !== 1) {
        setError(orderResult?.message || "No se pudo crear el pedido");
        return;
      }

      const orderId = Number(orderResult?.data?.order_id || orderResult?.data?.id || orderResult?.data?.orderId || 0);
      if (!orderId) {
        toast.success(orderResult?.message || "Pedido creado");
        setCounts({});
        setNotes("");
        return;
      }

      const itemResults = await Promise.all(
        items.map((item) =>
          ordersService.upsertItem(orderId, {
            p_product_id: item.productId,
            p_quantity: item.quantity,
          })
        )
      );

      const failedItem = itemResults.find((result) => result?.code !== 1);
      if (failedItem) {
        setError(failedItem?.message || "El pedido se creo pero fallo la carga de items");
        return;
      }

      toast.success(`Pedido ${orderId} guardado con ${items.length} items`);
      setCounts({});
      setNotes("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al guardar pedido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Pedidos - Conteo" subtitle="Conteo rapido de unidades por producto">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Datos del pedido
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona cliente, ruta y fechas antes de capturar productos.
                </Typography>
              </Box>
              <Chip label={`${totalUnits} unidades`} color={totalUnits > 0 ? "secondary" : "default"} variant={totalUnits > 0 ? "filled" : "outlined"} />
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={String(branch.id)}>
                      {getDisplayName(branch)}
                    </MenuItem>
                  ))}
                </TextField>
                {fieldErrors.selectedBranch ? <Typography variant="caption" color="error">{fieldErrors.selectedBranch}</Typography> : null}
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Cliente" value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={String(customer.id)}>
                      {getDisplayName(customer)}
                    </MenuItem>
                  ))}
                </TextField>
                {fieldErrors.selectedCustomer ? <Typography variant="caption" color="error">{fieldErrors.selectedCustomer}</Typography> : null}
              </Grid>
              <Grid item xs={12} md={4}>
                {routes.length > 0 ? (
                  <>
                    <TextField
                      select
                      fullWidth
                      label="Ruta"
                      value={selectedRoute}
                      onChange={(event) => {
                        setFieldErrors((prev) => ({ ...prev, selectedRoute: null }));
                        setSelectedRoute(event.target.value);
                      }}
                    >
                      {routes.map((route) => (
                        <MenuItem key={route.id} value={String(route.id)}>
                          {getDisplayName(route)}
                        </MenuItem>
                      ))}
                    </TextField>
                    {fieldErrors.selectedRoute ? <Typography variant="caption" color="error">{fieldErrors.selectedRoute}</Typography> : null}
                  </>
                ) : (
                  <TextField fullWidth disabled label="Ruta" value="No disponible" helperText="No hay rutas activas" />
                )}
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha pedido"
                  value={orderDate}
                  onChange={(event) => {
                    setFieldErrors((prev) => ({ ...prev, orderDate: null }));
                    setOrderDate(event.target.value);
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(fieldErrors.orderDate)}
                  helperText={fieldErrors.orderDate || " "}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha entrega"
                  value={deliveryDate}
                  onChange={(event) => {
                    setFieldErrors((prev) => ({ ...prev, deliveryDate: null }));
                    setDeliveryDate(event.target.value);
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(fieldErrors.deliveryDate)}
                  helperText={fieldErrors.deliveryDate || " "}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Notas"
                  value={notes}
                  onChange={(event) => {
                    setFieldErrors((prev) => ({ ...prev, notes: null }));
                    setNotes(event.target.value);
                  }}
                  error={Boolean(fieldErrors.notes)}
                  helperText={fieldErrors.notes || " "}
                />
              </Grid>
            </Grid>
          </Box>

          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, minWidth: { lg: 260 }, bgcolor: "background.default" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Resumen
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {totalUnits}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  unidades seleccionadas
                </Typography>
              </Box>
              <AppButton color="secondary" onClick={onCreateOrder} disabled={saving || loading || totalUnits <= 0}>
                {saving ? "Guardando..." : "Guardar pedido"}
              </AppButton>
              <Typography variant="caption" color="text.secondary">
                El pedido quedara en borrador para revisar, editar o confirmar.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Productos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Captura solo los productos que el cliente pidio.
            </Typography>
          </Box>
          <Chip label={`${products.length} disponibles`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando productos...</Alert> : null}
        {!loading && products.length === 0 ? <Alert severity="info">No hay productos disponibles.</Alert> : null}
        {fieldErrors.counts ? <Alert severity="error" sx={{ mb: 2 }}>{fieldErrors.counts}</Alert> : null}

        <Grid container spacing={2}>
          {products.map((product) => {
            const quantity = Number(counts[product.id] || 0);
            const hasQuantity = quantity > 0;

            return (
              <Grid item xs={12} sm={6} lg={4} xl={3} key={product.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    height: "100%",
                    borderColor: hasQuantity ? "secondary.main" : "divider",
                    bgcolor: hasQuantity ? "action.selected" : "background.paper",
                  }}
                >
                  <Stack spacing={2} sx={{ height: "100%" }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>
                          {getDisplayName(product)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatMoney(product.base_price)} por {product.unit || "unidad"}
                        </Typography>
                      </Box>
                      {hasQuantity ? <Chip size="small" color="secondary" label="En pedido" /> : null}
                    </Stack>

                    <Box sx={{ flex: 1 }} />

                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => setCounts((prev) => ({ ...prev, [product.id]: Math.max(Number(prev[product.id] || 0) - 1, 0) }))}
                        sx={{ minWidth: 44, height: 44 }}
                      >
                        -
                      </Button>
                      <TextField
                        type="number"
                        label="Unidades"
                        value={counts[product.id] || ""}
                        onChange={(event) => setCounts((prev) => ({ ...prev, [product.id]: event.target.value }))}
                        inputProps={{ min: 0, step: 1 }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">{product.unit || "uds"}</InputAdornment>,
                        }}
                        error={Boolean(fieldErrors.counts)}
                        fullWidth
                      />
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => setCounts((prev) => ({ ...prev, [product.id]: Number(prev[product.id] || 0) + 1 }))}
                        sx={{ minWidth: 44, height: 44 }}
                      >
                        +
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </FlowPageLayout>
  );
};

export default OrdersCountPage;
