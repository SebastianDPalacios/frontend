import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, MenuItem, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";
import inventoryService from "services/inventory/inventory-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import FlowTableCard from "views/modules/FlowTableCard";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

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
        setError("Error de red al cargar conteo de pedidos");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const flowLinks = useMemo(
    () => [
      { label: "Dia", href: "/orders/day" },
      { label: "Historico", href: "/orders/history" },
      { label: "Conteo", href: "/orders/count", active: true },
    ],
    []
  );

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
      setError("Error de red al guardar pedido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Pedidos - Conteo" subtitle="Conteo rapido de unidades por producto" links={flowLinks}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <TextField select fullWidth label="Sucursal" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={String(branch.id)}>
                {getDisplayName(branch)}
              </MenuItem>
            ))}
          </TextField>
          {fieldErrors.selectedBranch ? <Typography variant="caption" color="error">{fieldErrors.selectedBranch}</Typography> : null}
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField select fullWidth label="Cliente" value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={String(customer.id)}>
                {getDisplayName(customer)}
              </MenuItem>
            ))}
          </TextField>
          {fieldErrors.selectedCustomer ? <Typography variant="caption" color="error">{fieldErrors.selectedCustomer}</Typography> : null}
        </Grid>
        <Grid item xs={12} md={3}>
          {routes.length > 0 ? (
            <>
              <TextField
                select
                fullWidth
                label="Repartidor"
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
            <TextField
              fullWidth
              disabled
              label="Repartidor"
              value="No disponible en esta version"
              helperText="Backend reporta rutas deshabilitadas"
            />
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          <Alert severity="info">Total unidades: {totalUnits}</Alert>
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

      <FlowTableCard
        title="Conteo de productos"
        loading={loading}
        error={error}
        columns={[
          { key: "name", label: "Producto", render: (row) => getDisplayName(row) },
          {
            key: "count",
            label: "Unidades",
            render: (row) => (
              <TextField
                type="number"
                size="small"
                value={counts[row.id] || ""}
                onChange={(event) => setCounts((prev) => ({ ...prev, [row.id]: event.target.value }))}
                inputProps={{ min: 0 }}
                error={Boolean(fieldErrors.counts)}
              />
            ),
          },
        ]}
        rows={products}
      />
      {fieldErrors.counts ? <Typography variant="caption" color="error" sx={{ mt: 1 }}>{fieldErrors.counts}</Typography> : null}

      <Grid container sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <AppButton color="secondary" onClick={onCreateOrder} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar pedido"}
          </AppButton>
        </Grid>
      </Grid>
    </FlowPageLayout>
  );
};

export default OrdersCountPage;
