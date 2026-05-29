import { useEffect, useState } from "react";
import {
  Alert,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import toast from "react-hot-toast";
import inventoryService from "services/inventory/inventory-service";
import ordersService from "services/orders/orders-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { formatInventoryQuantity, getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatNumber = (value, unit) => formatInventoryQuantity(value, unit);
const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const formatDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  return String(value).slice(0, 10);
};

const InventoryPurchaseOrdersPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [newOrder, setNewOrder] = useState({
    supplierId: "",
    expectedDate: "",
    notes: "",
  });
  const [newOrderItems, setNewOrderItems] = useState([{ rawMaterialId: "", quantity: "", unitCost: "" }]);
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryService.getBaseData({
          onlyActive: 1,
          page: 1,
          pageSize: 40,
          branchId: selectedBranch || undefined,
        });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudieron cargar ordenes de compra");
          return;
        }

        const branchRows = normalizeRows(response.data?.branches);
        const supplierRows = normalizeRows(response.data?.suppliers);
        setBranches(branchRows);
        setSuppliers(supplierRows);
        setMaterials(normalizeRows(response.data?.raw_materials));
        setSelectedBranch((current) => current || (response.data?.selected_branch_id ? String(response.data.selected_branch_id) : ""));
        setNewOrder((current) => ({
          ...current,
          supplierId: current.supplierId || (supplierRows[0]?.id ? String(supplierRows[0].id) : ""),
        }));
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar ordenes de compra"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedBranch]);

  useEffect(() => {
    const run = async () => {
      if (!selectedBranch) {
        setPendingOrders([]);
        return;
      }

      setOrdersLoading(true);
      try {
        const response = await ordersService.getPendingPurchaseOrders({
          branchId: selectedBranch,
          search: orderSearch || undefined,
          page: 1,
          pageSize: 50,
        });

        if (response?.code !== 1) {
          setPendingOrders([]);
          setError(response?.message || "No se pudieron cargar ordenes pendientes");
          return;
        }

        const rows = normalizeRows(response.data);
        setPendingOrders(rows);
        setPurchaseOrderId((current) => (rows.some((order) => String(order.id) === String(current)) ? current : ""));
      } catch (requestError) {
        setPendingOrders([]);
        setError(getErrorMessage(requestError, "Error de red al cargar ordenes pendientes"));
      } finally {
        setOrdersLoading(false);
      }
    };

    run();
  }, [orderSearch, selectedBranch]);

  const selectedOrder = pendingOrders.find((order) => String(order.id) === String(purchaseOrderId));

  const onReceivePurchaseOrder = async () => {
    if (saving) {
      return;
    }

    setError(null);
    const parsedId = Number(purchaseOrderId);
    if (!parsedId || parsedId <= 0) {
      setError("Ingresa un numero de orden de compra valido");
      return;
    }

    setSaving(true);
    try {
      const result = await ordersService.receivePurchaseOrder(parsedId);
      if (result?.code !== 1) {
        setError(result?.message || "No se pudo recepcionar la orden de compra");
        return;
      }

      toast.success(result?.message || `Orden de compra ${parsedId} recepcionada`);
      setPurchaseOrderId("");
      const response = await ordersService.getPendingPurchaseOrders({
        branchId: selectedBranch,
        search: orderSearch || undefined,
        page: 1,
        pageSize: 50,
      });
      if (response?.code === 1) {
        setPendingOrders(normalizeRows(response.data));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al recepcionar orden de compra"));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateNewOrderItem = (index, key, value) => {
    setNewOrderItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const onAddNewOrderItem = () => {
    setNewOrderItems((current) => [...current, { rawMaterialId: "", quantity: "", unitCost: "" }]);
  };

  const onRemoveNewOrderItem = (index) => {
    setNewOrderItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const onCreatePurchaseOrder = async () => {
    if (creating) {
      return;
    }

    setError(null);
    const items = newOrderItems
      .map((item) => ({
        raw_material_id: Number(item.rawMaterialId || 0),
        quantity: Number(item.quantity || 0),
        unit_cost: Number(item.unitCost || 0),
        tax_percent: 0,
      }))
      .filter((item) => item.raw_material_id > 0 || item.quantity > 0 || item.unit_cost > 0);

    if (!selectedBranch) {
      setError("Selecciona una sucursal");
      return;
    }

    if (!newOrder.supplierId) {
      setError("Selecciona un proveedor");
      return;
    }

    if (!items.length || items.some((item) => !item.raw_material_id || item.quantity <= 0 || item.unit_cost < 0)) {
      setError("Agrega materias primas con cantidad mayor a 0 y costo valido");
      return;
    }

    setCreating(true);
    try {
      const result = await ordersService.createPurchaseOrder({
        p_branch_id: Number(selectedBranch),
        p_supplier_id: Number(newOrder.supplierId),
        p_expected_date: newOrder.expectedDate || null,
        p_notes: newOrder.notes || null,
        p_items_json: items,
      });

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo crear la orden de compra");
        return;
      }

      toast.success(result?.message || "Orden de compra creada");
      setPurchaseOrderId(result.data?.purchase_order_id ? String(result.data.purchase_order_id) : "");
      setNewOrder((current) => ({ ...current, expectedDate: "", notes: "" }));
      setNewOrderItems([{ rawMaterialId: "", quantity: "", unitCost: "" }]);
      setCreateDialogOpen(false);
      const response = await ordersService.getPendingPurchaseOrders({ branchId: selectedBranch, page: 1, pageSize: 50 });
      if (response?.code === 1) {
        setPendingOrders(normalizeRows(response.data));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al crear orden de compra"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <FlowPageLayout title="Inventario - Compras y recepciones" subtitle="Entradas de materia prima al inventario">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
            <Stack spacing={2} sx={{ height: "100%" }}>
              <Stack spacing={0.5}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Entrada rapida
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Para stock inicial, compras pequenas o ingresos que no tienen orden de compra.
                </Typography>
              </Stack>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: "action.hover" }}>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontWeight: 800 }}>Cuándo usarla</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cuando necesitas sumar inventario de inmediato sin crear una OC previa.
                  </Typography>
                </Stack>
              </Paper>
              <Stack sx={{ mt: "auto", alignItems: "flex-start" }}>
                <AppButton component={Link} href="/inventory/movements" color="secondary">
                  Ir a movimientos
                </AppButton>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, height: "100%" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" }, mb: 2 }}
            >
              <Stack spacing={0.5}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Recepcionar orden existente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona una OC pendiente y confirma la entrada de sus materias primas.
                </Typography>
              </Stack>
              <AppButton variant="outlined" color="secondary" onClick={() => setCreateDialogOpen(true)} disabled={loading}>
                Nueva orden de compra
              </AppButton>
            </Stack>

            <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Sucursal"
                  value={selectedBranch}
                  onChange={(event) => setSelectedBranch(event.target.value)}
                >
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={String(branch.id)}>
                      {getDisplayName(branch)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Buscar orden o proveedor"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  helperText={ordersLoading ? "Cargando ordenes..." : " "}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {ordersLoading ? <Alert severity="info">Cargando ordenes pendientes...</Alert> : null}
            {!ordersLoading && pendingOrders.length === 0 ? (
              <Alert severity="info">No hay ordenes pendientes para la sucursal seleccionada.</Alert>
            ) : null}

            <Stack spacing={1.5}>
              {pendingOrders.map((order) => {
                const isSelected = String(order.id) === String(purchaseOrderId);

                return (
                  <Paper
                    key={order.id}
                    variant="outlined"
                    onClick={() => setPurchaseOrderId(String(order.id))}
                    sx={{
                      borderRadius: 2,
                      p: 2,
                      cursor: "pointer",
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "action.selected" : "background.paper",
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" } }}
                      >
                        <Stack spacing={0.25}>
                          <Typography sx={{ fontWeight: 900 }}>OC #{order.id}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {order.supplier_name || "Proveedor sin nombre"}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                          <Chip size="small" label={order.status || "pendiente"} color="warning" variant="outlined" />
                          <Chip size="small" label={`${order.items_count || 0} items`} />
                        </Stack>
                      </Stack>

                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Fecha esperada</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{formatDate(order.expected_date)}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{formatCurrency(order.grand_total)}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Materias</Typography>
                          <Typography sx={{ fontWeight: 700 }} noWrap title={order.material_names || ""}>
                            {order.material_names || "Sin detalle"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>

            {selectedOrder ? (
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mt: 2, borderColor: "primary.main" }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontWeight: 900 }}>Lista para recepcionar: OC #{selectedOrder.id}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedOrder.material_names || "Sin detalle de materias"} · {formatCurrency(selectedOrder.grand_total)}
                    </Typography>
                  </Stack>
                  <AppButton color="secondary" onClick={onReceivePurchaseOrder} disabled={saving || loading}>
                    {saving ? "Procesando..." : "Recepcionar orden"}
                  </AppButton>
                </Stack>
              </Paper>
            ) : null}
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Materias para compra
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stock actual de insumos para la sucursal seleccionada.
            </Typography>
          </Stack>
          <Chip label={`${materials.length} materias`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando materias primas...</Alert> : null}
        {!loading && materials.length === 0 ? <Alert severity="info">No hay materias primas para mostrar.</Alert> : null}

        <Grid container spacing={2}>
          {materials.map((material) => {
            const unit = material.unit || "unit";
            const isLow = Number(material.quantity_on_hand || 0) < Number(material.min_stock || 0);

            return (
              <Grid item xs={12} md={6} xl={4} key={material.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    height: "100%",
                    borderColor: isLow ? "warning.main" : "divider",
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800 }} noWrap>
                          {getDisplayName(material)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Unidad base: {unit}
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        label={isLow ? "Comprar" : "Stock ok"}
                        color={isLow ? "warning" : "success"}
                        variant={isLow ? "filled" : "outlined"}
                      />
                    </Stack>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Disponible
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>
                          {formatNumber(material.quantity_on_hand, unit)} {unit}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Minimo
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {formatNumber(material.min_stock, unit)} {unit}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => !creating && setCreateDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Nueva orden de compra</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Crea una orden pendiente y luego recepcionala desde el selector de ordenes existentes.
            </Typography>
            <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Proveedor"
                  value={newOrder.supplierId}
                  onChange={(event) => setNewOrder((current) => ({ ...current, supplierId: event.target.value }))}
                  disabled={creating || suppliers.length === 0}
                >
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={String(supplier.id)}>
                      {getDisplayName(supplier)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha esperada"
                  value={newOrder.expectedDate}
                  onChange={(event) => setNewOrder((current) => ({ ...current, expectedDate: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  disabled={creating}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Notas"
                  value={newOrder.notes}
                  onChange={(event) => setNewOrder((current) => ({ ...current, notes: event.target.value }))}
                  disabled={creating}
                />
              </Grid>
            </Grid>

            <Stack spacing={1.5}>
              {newOrderItems.map((item, index) => {
                const material = materials.find((row) => String(row.id) === String(item.rawMaterialId));
                const unit = material?.unit || "unit";

                return (
                  <Paper key={`po-item-${index}`} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                    <Grid container spacing={2} sx={{ alignItems: "center" }}>
                      <Grid item xs={12} md={5}>
                        <TextField
                          select
                          fullWidth
                          label="Materia prima"
                          value={item.rawMaterialId}
                          onChange={(event) => onUpdateNewOrderItem(index, "rawMaterialId", event.target.value)}
                          disabled={creating}
                        >
                          <MenuItem value="">Seleccionar materia</MenuItem>
                          {materials.map((materialOption) => (
                            <MenuItem key={materialOption.id} value={String(materialOption.id)}>
                              {getDisplayName(materialOption)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          label={`Cantidad (${unit})`}
                          value={item.quantity}
                          onChange={(event) => onUpdateNewOrderItem(index, "quantity", event.target.value)}
                          inputProps={{ min: 0, step: 0.001 }}
                          disabled={creating}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Costo unitario"
                          value={item.unitCost}
                          onChange={(event) => onUpdateNewOrderItem(index, "unitCost", event.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          disabled={creating}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary">
                          Total: {formatCurrency(Number(item.quantity || 0) * Number(item.unitCost || 0))}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <AppButton
                          variant="outlined"
                          color="secondary"
                          onClick={() => onRemoveNewOrderItem(index)}
                          disabled={creating || newOrderItems.length === 1}
                        >
                          Quitar
                        </AppButton>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Stack>
            <AppButton variant="outlined" color="secondary" onClick={onAddNewOrderItem} disabled={creating}>
              Agregar materia
            </AppButton>
          </Stack>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" color="secondary" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancelar
          </AppButton>
          <AppButton color="secondary" onClick={onCreatePurchaseOrder} disabled={creating || loading}>
            {creating ? "Creando..." : "Crear orden"}
          </AppButton>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default InventoryPurchaseOrdersPage;
