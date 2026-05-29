import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import productionService from "services/production/production-service";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";
import AppButton from "@core/components/ui/AppButton";

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  return String(value).slice(0, 10);
};

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const roundQuantity = (value) => Number(Number(value || 0).toFixed(3));
const getPendingQuantity = (item) => roundQuantity(Math.max(Number(item.planned_qty || 0) - Number(item.produced_qty || 0), 0));

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const statusLabels = {
  draft: "Borrador",
  planned: "Planificada",
  in_progress: "En proceso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusColors = {
  draft: "default",
  planned: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

const StatusChip = ({ status }) => (
  <Chip
    size="small"
    label={statusLabels[status] || status || "-"}
    color={statusColors[status] || "default"}
    variant={status === "draft" ? "outlined" : "filled"}
    sx={{ minWidth: 104 }}
  />
);

const itemStatusLabels = {
  pending: "Pendiente",
  in_progress: "En proceso",
  done: "Terminado",
  cancelled: "Cancelado",
};

const itemStatusColors = {
  pending: "default",
  in_progress: "warning",
  done: "success",
  cancelled: "error",
};

const ItemStatusChip = ({ status }) => (
  <Chip
    size="small"
    label={itemStatusLabels[status] || status || "-"}
    color={itemStatusColors[status] || "default"}
    variant={status === "pending" ? "outlined" : "filled"}
    sx={{ minWidth: 104 }}
  />
);

const isClosedOrder = (order) => ["completed", "cancelled"].includes(order?.status);

const getProgressPercent = (producedQty, plannedQty) => {
  const planned = Number(plannedQty || 0);
  if (planned <= 0) {
    return 0;
  }

  return Math.min(Math.round((Number(producedQty || 0) / planned) * 100), 100);
};

const getItemEffectiveStatus = (item) => {
  if (item.status === "cancelled") {
    return "cancelled";
  }

  const plannedQty = Number(item.planned_qty || 0);
  const producedQty = Number(item.produced_qty || 0);

  if (plannedQty > 0 && producedQty >= plannedQty) {
    return "done";
  }

  if (producedQty > 0) {
    return "in_progress";
  }

  return "pending";
};

const OrderMetric = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>
      {value || "-"}
    </Typography>
  </Box>
);

const DashboardMetric = ({ label, value, helper, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Chip label={helper} color={color} variant="outlined" sx={{ alignSelf: "flex-start" }} />
    </Stack>
  </Paper>
);

const ProductionOrdersPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [newOrder, setNewOrder] = useState({
    branchId: "",
    plannedDate: getTodayInputValue(),
    notes: "",
  });
  const [newItem, setNewItem] = useState({
    productId: "",
    recipeId: "",
    plannedQty: "",
  });
  const [resultQuantities, setResultQuantities] = useState({});
  const [plannedAdjustments, setPlannedAdjustments] = useState({});
  const [resultSavingItemId, setResultSavingItemId] = useState(null);
  const [adjustingItemId, setAdjustingItemId] = useState(null);
  const [cancellingItemId, setCancellingItemId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [closing, setClosing] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (router.isReady && router.query.search && !search) {
      setSearch(String(router.query.search));
    }
  }, [router.isReady, router.query.search, search]);

  useEffect(() => {
    const run = async () => {
      try {
        const [branchesResponse, productionResponse, recipesResponse] = await Promise.all([
          catalogService.getBranches({ onlyActive: 1 }),
          productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 }),
          recipesService.getList({ onlyActive: 1 }),
        ]);

        if (branchesResponse?.code !== 1) {
          setError(branchesResponse?.message || "No se pudieron cargar sucursales");
          return;
        }

        if (productionResponse?.code !== 1) {
          setError(productionResponse?.message || "No se pudieron cargar productos");
          return;
        }

        if (recipesResponse?.code !== 1) {
          setError(recipesResponse?.message || "No se pudieron cargar recetas");
          return;
        }

        const branchRows = normalizeRows(branchesResponse.data);
        const productRows = normalizeRows(productionResponse.data?.products);
        const materialRows = normalizeRows(productionResponse.data?.raw_materials);
        const recipeRows = Array.isArray(recipesResponse?.data) ? recipesResponse.data : [];

        setBranches(branchRows);
        setProducts(productRows);
        setRawMaterials(materialRows);
        setRecipes(recipeRows);
        setNewOrder((current) => ({
          ...current,
          branchId: current.branchId || (branchRows[0]?.id ? String(branchRows[0].id) : ""),
        }));
        setNewItem((current) => {
          const firstAvailableProduct = productRows.find((product) =>
            recipeRows.some((recipe) => Number(recipe.product_id) === Number(product.id))
          );
          const productId = current.productId || (firstAvailableProduct?.id ? String(firstAvailableProduct.id) : "");
          const defaultRecipe = recipeRows.find((recipe) => Number(recipe.product_id) === Number(productId));

          return {
            ...current,
            productId,
            recipeId: current.recipeId || (defaultRecipe?.id ? String(defaultRecipe.id) : ""),
          };
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar catalogos de produccion"));
      }
    };

    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productionService.getOrders({ page: 1, pageSize: 40, search });
        if (response?.code !== 1) {
          setError(response?.message || "No se pudieron cargar ordenes de produccion");
          return;
        }

        const orderRows = normalizeRows(response.data?.items);
        setOrders(orderRows);
        setSelectedOrderId((currentId) => {
          if (orderRows.some((order) => String(order.id) === String(currentId))) {
            return currentId;
          }

          return orderRows[0]?.id ? String(orderRows[0].id) : "";
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar ordenes de produccion"));
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 250);
    return () => clearTimeout(timer);
  }, [search, refreshKey]);

  useEffect(() => {
    const run = async () => {
      const parsedOrderId = Number(selectedOrderId);
      setOrderItems([]);

      if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
        return;
      }

      setItemsLoading(true);
      try {
        const response = await productionService.getOrderItems(parsedOrderId);
        if (response?.code !== 1) {
          setError(response?.message || "No se pudieron cargar items de la orden");
          return;
        }

        const itemRows = normalizeRows(response.data?.items);
        setOrderItems(itemRows);
        setPlannedAdjustments((current) => {
          const next = {};
          itemRows.forEach((item) => {
            next[item.id] = current[item.id] ?? String(Number(item.planned_qty || 0));
          });
          return next;
        });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar items de la orden"));
      } finally {
        setItemsLoading(false);
      }
    };

    run();
  }, [selectedOrderId, refreshKey]);

  useEffect(() => {
    setResultQuantities((current) => {
      const next = { ...current };

      orderItems.forEach((item) => {
        const pendingQty = getPendingQuantity(item);
        const currentQty = Number(next[item.id] || 0);

        if (pendingQty <= 0) {
          next[item.id] = "";
          return;
        }

        if (!next[item.id] || currentQty > pendingQty) {
          next[item.id] = String(pendingQty);
        }
      });

      return next;
    });
  }, [orderItems]);

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.id) === String(selectedOrderId)) || null,
    [orders, selectedOrderId]
  );
  const canClose = selectedOrder && !isClosedOrder(selectedOrder);
  const canAddItems = selectedOrder && !isClosedOrder(selectedOrder);
  const canCancelOrder = selectedOrder && !isClosedOrder(selectedOrder) && Number(selectedOrder.produced_qty || 0) <= 0;
  const availableProducts = useMemo(
    () => products.filter((product) => recipes.some((recipe) => Number(recipe.product_id) === Number(product.id))),
    [products, recipes]
  );
  const activeOrders = orders.filter((order) => !isClosedOrder(order)).length;
  const completedOrders = orders.filter((order) => order.status === "completed").length;
  const totalPlannedQty = orders.reduce((acc, order) => acc + Number(order.planned_qty || 0), 0);
  const totalProducedQty = orders.reduce((acc, order) => acc + Number(order.produced_qty || 0), 0);
  const selectedOrderProgress = selectedOrder ? getProgressPercent(selectedOrder.produced_qty, selectedOrder.planned_qty) : 0;

  const getFriendlyProductionError = (message) => {
    const text = String(message || "");

    if (text.includes("necesitas") && text.includes("hay")) {
      return text;
    }

    const rawStockMatch = text.match(/insufficient raw stock for material_id=(\d+)/i);

    if (rawStockMatch) {
      const materialId = Number(rawStockMatch[1]);
      const material = rawMaterials.find((item) => Number(item.id) === materialId);
      const materialName = material ? getDisplayName(material) : `ID ${materialId}`;

      return `No hay materia prima suficiente para producir. Falta stock de ${materialName}. Carga una entrada de ajuste en Inventario > Movimientos y vuelve a registrar la produccion.`;
    }

    const productStockMatch = text.match(/insufficient stock for product_id=(\d+)/i);
    if (productStockMatch) {
      return "No hay producto terminado suficiente en inventario para completar la operacion.";
    }

    return message || "No se pudo completar la operacion";
  };

  const showActionError = (message) => {
    const nextMessage = message || "No se pudo completar la operacion";
    setError(nextMessage);
    toast.error(nextMessage);
  };

  const createProductionOrder = async () => {
    if (creating) {
      return;
    }

    setError(null);
    setFieldErrors({});

    const nextErrors = {};
    if (!newOrder.branchId) {
      nextErrors.branchId = "Selecciona una sucursal";
    }
    if (!newOrder.plannedDate) {
      nextErrors.plannedDate = "La fecha planificada es obligatoria";
    }
    if (newOrder.notes.length > 250) {
      nextErrors.notes = "Maximo 250 caracteres";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showActionError("Corrige los campos marcados");
      return;
    }

    setCreating(true);
    try {
      const result = await productionService.createOrder({
        p_branch_id: Number(newOrder.branchId),
        p_planned_date: newOrder.plannedDate,
        p_notes: newOrder.notes || null,
      });

      if (result?.code !== 1) {
        showActionError(result?.message || "No se pudo crear la orden de produccion");
        return;
      }

      const createdId = Number(result?.data?.production_order_id || 0);
      toast.success(result?.message || "Orden de produccion creada");
      setNewOrder((current) => ({ ...current, notes: "" }));
      setSelectedOrderId(createdId ? String(createdId) : "");
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      showActionError(getErrorMessage(requestError, "Error de red al crear la orden de produccion"));
    } finally {
      setCreating(false);
    }
  };

  const addProductionOrderItem = async () => {
    if (addingItem) {
      return;
    }

    setError(null);
    setFieldErrors({});

    const nextErrors = {};
    if (!selectedOrder) {
      nextErrors.selectedOrder = "Selecciona una orden";
    }
    if (!newItem.productId) {
      nextErrors.productId = "Selecciona un producto";
    }
    if (!newItem.recipeId) {
      nextErrors.recipeId = "Selecciona una receta activa";
    }
    if (!newItem.plannedQty || Number(newItem.plannedQty) <= 0) {
      nextErrors.plannedQty = "La cantidad debe ser mayor a 0";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showActionError("Corrige los campos marcados");
      return;
    }

    setAddingItem(true);
    try {
      const result = await productionService.addOrderItem(Number(selectedOrder.id), {
        p_product_id: Number(newItem.productId),
        p_recipe_id: Number(newItem.recipeId),
        p_planned_qty: Number(newItem.plannedQty),
      });

      if (result?.code !== 1) {
        showActionError(result?.message || "No se pudo agregar el item planificado");
        return;
      }

      toast.success(result?.message || "Item planificado agregado");
      setNewItem((current) => ({ ...current, plannedQty: "" }));
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      showActionError(getErrorMessage(requestError, "Error de red al agregar item planificado"));
    } finally {
      setAddingItem(false);
    }
  };

  const registerItemResult = async (item) => {
    if (resultSavingItemId) {
      return;
    }

    setError(null);
    setFieldErrors({});

    const quantity = Number(resultQuantities[item.id] || 0);
    if (!quantity || quantity <= 0) {
      setFieldErrors({ [`result-${item.id}`]: "Cantidad invalida" });
      showActionError("Ingresa una cantidad producida mayor a 0");
      return;
    }

    const pendingQty = getPendingQuantity(item);
    if (quantity - pendingQty > 0.0001) {
      setFieldErrors({ [`result-${item.id}`]: "Supera faltante" });
      showActionError("La cantidad producida no puede superar el faltante");
      return;
    }

    setResultSavingItemId(item.id);
    try {
      const result = await productionService.registerOrderItemResult(Number(selectedOrder.id), Number(item.id), {
        p_produced_qty: quantity,
        p_notes: `Registro item ${item.product_name || item.product_id}`,
      });

      if (result?.code !== 1) {
        showActionError(getFriendlyProductionError(result?.message));
        return;
      }

      toast.success(result?.message || "Resultado registrado");
      setResultQuantities((current) => ({ ...current, [item.id]: "" }));
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      showActionError(getErrorMessage(requestError, "Error de red al registrar resultado"));
    } finally {
      setResultSavingItemId(null);
    }
  };

  const adjustItemPlan = async (item) => {
    if (adjustingItemId || !selectedOrder) {
      return;
    }

    setError(null);
    setFieldErrors({});

    const plannedQty = Number(plannedAdjustments[item.id] || 0);
    const producedQty = Number(item.produced_qty || 0);

    if (!plannedQty || plannedQty <= 0) {
      setFieldErrors({ [`plan-${item.id}`]: "Cantidad invalida" });
      showActionError("La cantidad planificada debe ser mayor a 0");
      return;
    }

    if (plannedQty < producedQty) {
      setFieldErrors({ [`plan-${item.id}`]: "Menor a lo producido" });
      showActionError("No puedes planificar menos de lo que ya se produjo");
      return;
    }

    setAdjustingItemId(item.id);
    try {
      const result = await productionService.updateOrderItemPlan(Number(selectedOrder.id), Number(item.id), {
        p_planned_qty: plannedQty,
      });

      if (result?.code !== 1) {
        showActionError(result?.message || "No se pudo ajustar el item planificado");
        return;
      }

      toast.success(result?.message || "Item planificado ajustado");
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      showActionError(getErrorMessage(requestError, "Error de red al ajustar item planificado"));
    } finally {
      setAdjustingItemId(null);
    }
  };

  const cancelItemPlan = async (item) => {
    if (cancellingItemId || !selectedOrder) {
      return;
    }

    if (Number(item.produced_qty || 0) > 0) {
      showActionError("Este item ya tiene produccion registrada. Ajusta la cantidad planificada al producido en lugar de cancelarlo.");
      return;
    }

    setCancellingItemId(item.id);
    setError(null);
    try {
      const result = await productionService.cancelOrderItem(Number(selectedOrder.id), Number(item.id), {
        p_reason: "Cancelado desde orden de produccion",
      });

      if (result?.code !== 1) {
        showActionError(result?.message || "No se pudo cancelar el item planificado");
        return;
      }

      toast.success(result?.message || "Item cancelado");
      setCancelDialog(null);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      showActionError(getErrorMessage(requestError, "Error de red al cancelar item planificado"));
    } finally {
      setCancellingItemId(null);
    }
  };

  const closeSelectedOrder = async () => {
    if (closing || !selectedOrder) {
      return;
    }

    setClosing(true);
    setError(null);
    try {
      const result = await productionService.closeOrder(Number(selectedOrder.id));
      if (result?.code !== 1) {
        showActionError(result?.message || "No se pudo cerrar la orden de produccion");
        return;
      }

      toast.success(result?.message || `Orden ${selectedOrder.id} cerrada`);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      showActionError(getErrorMessage(requestError, "Error de red al cerrar la orden de produccion"));
    } finally {
      setClosing(false);
    }
  };

  const cancelSelectedOrder = async () => {
    if (cancellingOrder || !selectedOrder) {
      return;
    }

    if (!canCancelOrder) {
      showActionError("Solo puedes cancelar una orden de produccion si no tiene produccion registrada.");
      return;
    }

    setCancellingOrder(true);
    setError(null);
    try {
      const result = await productionService.cancelOrder(Number(selectedOrder.id), {
        p_reason: "Cancelada desde pantalla de produccion",
      });

      if (result?.code !== 1) {
        showActionError(result?.message || "No se pudo cancelar la orden de produccion");
        return;
      }

      toast.success(result?.message || `Orden ${selectedOrder.id} cancelada`);
      setCancelDialog(null);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      showActionError(getErrorMessage(requestError, "Error de red al cancelar la orden de produccion"));
    } finally {
      setCancellingOrder(false);
    }
  };

  return (
    <FlowPageLayout title="Produccion - Ordenes" subtitle="Consulta y cierre de ordenes de produccion">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Alert severity="info" sx={{ mb: 2 }}>
        Flujo: crea una orden, agrega productos planificados, registra la produccion por item y cierra la orden cuando no quede faltante.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Buscar orden" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <DashboardMetric label="Ordenes activas" value={activeOrders} helper="Abiertas o en proceso" color={activeOrders ? "warning" : "success"} />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardMetric label="Completadas" value={completedOrders} helper="Cerradas correctamente" color="success" />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardMetric label="Planificado" value={formatNumber(totalPlannedQty)} helper="Total del listado" color="info" />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardMetric label="Producido" value={formatNumber(totalProducedQty)} helper={`${getProgressPercent(totalProducedQty, totalPlannedQty)}% avance`} color="primary" />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: 16, sm: 20 } }}>
          Nueva orden
        </Typography>
        <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Sucursal"
              value={newOrder.branchId}
              onChange={(event) => {
                setFieldErrors((prev) => ({ ...prev, branchId: null }));
                setNewOrder((current) => ({ ...current, branchId: event.target.value }));
              }}
              error={Boolean(fieldErrors.branchId)}
              helperText={fieldErrors.branchId || " "}
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={String(branch.id)}>
                  {getDisplayName(branch)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Fecha planificada"
              value={newOrder.plannedDate}
              onChange={(event) => {
                setFieldErrors((prev) => ({ ...prev, plannedDate: null }));
                setNewOrder((current) => ({ ...current, plannedDate: event.target.value }));
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: getTodayInputValue() }}
              error={Boolean(fieldErrors.plannedDate)}
              helperText={fieldErrors.plannedDate || " "}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Notas"
              value={newOrder.notes}
              onChange={(event) => {
                setFieldErrors((prev) => ({ ...prev, notes: null }));
                setNewOrder((current) => ({ ...current, notes: event.target.value }));
              }}
              error={Boolean(fieldErrors.notes)}
              helperText={fieldErrors.notes || " "}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <AppButton color="secondary" onClick={createProductionOrder} disabled={creating || branches.length === 0}>
              {creating ? "Creando..." : "Crear orden"}
            </AppButton>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 2 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{ justifyContent: "space-between" }}>
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" } }}>
              <Stack spacing={0.5}>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {selectedOrder ? `Orden #${selectedOrder.id}` : "Selecciona una orden"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedOrder ? `${selectedOrder.branch_name || "Sucursal"} - planificada ${formatDate(selectedOrder.planned_date)}` : "Elige una orden del listado para ver su avance."}
                </Typography>
              </Stack>
              <StatusChip status={selectedOrder?.status} />
            </Stack>

            <Box>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 0.75 }}>
                <Typography variant="body2" color="text.secondary">
                  Avance de produccion
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {selectedOrder ? `${selectedOrderProgress}%` : "0%"}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={selectedOrderProgress}
                sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": { borderRadius: 999 },
                }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <OrderMetric label="Items" value={selectedOrder ? formatNumber(selectedOrder.items_count) : "-"} />
              </Grid>
              <Grid item xs={6} md={3}>
                <OrderMetric label="Planificado" value={selectedOrder ? formatNumber(selectedOrder.planned_qty) : "-"} />
              </Grid>
              <Grid item xs={6} md={3}>
                <OrderMetric label="Producido" value={selectedOrder ? formatNumber(selectedOrder.produced_qty) : "-"} />
              </Grid>
              <Grid item xs={6} md={3}>
                <OrderMetric label="Pendientes" value={selectedOrder ? formatNumber(selectedOrder.pending_items) : "-"} />
              </Grid>
            </Grid>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", lg: "block" } }} />

          <Stack spacing={1.5} sx={{ minWidth: { lg: 220 }, justifyContent: "center" }}>
            <AppButton color="secondary" onClick={closeSelectedOrder} disabled={closing || !canClose}>
              {closing ? "Cerrando..." : "Cerrar orden"}
            </AppButton>
            <AppButton color="error" variant="outlined" onClick={() => setCancelDialog({ type: "order" })} disabled={cancellingOrder || !canCancelOrder}>
              {cancellingOrder ? "Cancelando..." : "Cancelar orden"}
            </AppButton>
            <Typography variant="body2" color="text.secondary">
              Puedes cancelar solo si aun no hay produccion registrada. Si ya produjo, ajusta pendientes o cierra con trazabilidad.
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {canAddItems ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: 16, sm: 20 } }}>
            Agregar producto planificado
          </Typography>
          {fieldErrors.selectedOrder ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.selectedOrder}</Alert> : null}
          {availableProducts.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No hay productos disponibles para planificar. Primero crea y publica una receta activa.
            </Alert>
          ) : null}
          <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Producto disponible"
                value={newItem.productId}
                onChange={(event) => {
                  const productId = event.target.value;
                  const defaultRecipe = recipes.find((recipe) => Number(recipe.product_id) === Number(productId));
                  setFieldErrors((prev) => ({ ...prev, productId: null, recipeId: null }));
                  setNewItem((current) => ({
                    ...current,
                    productId,
                    recipeId: defaultRecipe?.id ? String(defaultRecipe.id) : "",
                  }));
                }}
                error={Boolean(fieldErrors.productId)}
                helperText={fieldErrors.productId || "Solo se muestran productos con receta activa"}
                disabled={availableProducts.length === 0}
              >
                {availableProducts.map((product) => (
                  <MenuItem key={product.id} value={String(product.id)}>
                    {getDisplayName(product)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad"
                value={newItem.plannedQty}
                onChange={(event) => {
                  setFieldErrors((prev) => ({ ...prev, plannedQty: null }));
                  setNewItem((current) => ({ ...current, plannedQty: event.target.value }));
                }}
                inputProps={{ min: 0.001, step: 0.001 }}
                error={Boolean(fieldErrors.plannedQty)}
                helperText={fieldErrors.plannedQty || " "}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <AppButton color="secondary" onClick={addProductionOrderItem} disabled={addingItem}>
                {addingItem ? "Agregando..." : "Agregar item"}
              </AppButton>
            </Grid>
          </Grid>
        </Paper>
      ) : selectedOrder ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta orden ya esta cerrada. Selecciona una orden abierta o crea una nueva para planificar mas productos.
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Items de la orden seleccionada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registra avances por producto y controla el faltante.
            </Typography>
          </Stack>
          <Chip label={`${orderItems.length} items`} variant="outlined" />
        </Stack>

        {itemsLoading ? <Alert severity="info">Cargando items de la orden...</Alert> : null}
        {!itemsLoading && orderItems.length === 0 ? <Alert severity="info">La orden seleccionada no tiene items.</Alert> : null}

        <Grid container spacing={2}>
          {orderItems.map((item) => {
            const pendingQty = getPendingQuantity(item);
            const effectiveStatus = getItemEffectiveStatus(item);
            const itemProgress = getProgressPercent(item.produced_qty, item.planned_qty);
            const disabled = !selectedOrder || isClosedOrder(selectedOrder) || effectiveStatus === "cancelled" || pendingQty <= 0 || resultSavingItemId === item.id;

            return (
              <Grid item xs={12} md={6} xl={4} key={item.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    height: "100%",
                    borderColor: effectiveStatus === "done" ? "success.main" : effectiveStatus === "in_progress" ? "warning.main" : "divider",
                  }}
                >
                  <Stack spacing={2} sx={{ height: "100%" }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>
                          {item.product_name || `Producto ${item.product_id}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Faltante: {formatNumber(pendingQty)}
                        </Typography>
                      </Stack>
                      <ItemStatusChip status={effectiveStatus} />
                    </Stack>

                    <Box>
                      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
                        <Typography variant="body2" color="text.secondary">
                          Avance
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {itemProgress}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={itemProgress}
                        sx={{
                          height: 8,
                          borderRadius: 999,
                          bgcolor: "action.hover",
                          "& .MuiLinearProgress-bar": { borderRadius: 999 },
                        }}
                      />
                    </Box>

                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <OrderMetric label="Plan" value={formatNumber(item.planned_qty)} />
                      </Grid>
                      <Grid item xs={4}>
                        <OrderMetric label="Hecho" value={formatNumber(item.produced_qty)} />
                      </Grid>
                      <Grid item xs={4}>
                        <OrderMetric label="Falta" value={formatNumber(pendingQty)} />
                      </Grid>
                    </Grid>

                    <Box sx={{ flex: 1 }} />

                    {!isClosedOrder(selectedOrder) && effectiveStatus !== "cancelled" ? (
                      <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: "background.default" }}>
                        <Stack spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            Ajuste por cambio del cliente
                          </Typography>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField
                              type="number"
                              size="small"
                              label="Nuevo plan"
                              value={plannedAdjustments[item.id] ?? ""}
                              onChange={(event) => {
                                setFieldErrors((prev) => ({ ...prev, [`plan-${item.id}`]: null }));
                                setPlannedAdjustments((current) => ({ ...current, [item.id]: event.target.value }));
                              }}
                              inputProps={{ min: Number(item.produced_qty || 0) || 0.001, step: 0.001 }}
                              error={Boolean(fieldErrors[`plan-${item.id}`])}
                              helperText={fieldErrors[`plan-${item.id}`] || " "}
                              fullWidth
                            />
                            <AppButton
                              color="secondary"
                              variant="outlined"
                              onClick={() => adjustItemPlan(item)}
                              disabled={adjustingItemId === item.id}
                              sx={{ minWidth: 110, alignSelf: { sm: "flex-start" } }}
                            >
                              {adjustingItemId === item.id ? "..." : "Ajustar"}
                            </AppButton>
                          </Stack>
                          <AppButton
                            color="error"
                            variant="text"
                            onClick={() => setCancelDialog({ type: "item", item })}
                            disabled={cancellingItemId === item.id || Number(item.produced_qty || 0) > 0}
                            sx={{ alignSelf: "flex-start" }}
                          >
                            {cancellingItemId === item.id ? "Cancelando..." : "Cancelar producto planificado"}
                          </AppButton>
                        </Stack>
                      </Paper>
                    ) : null}

                    {disabled && (pendingQty <= 0 || isClosedOrder(selectedOrder)) ? (
                      <Alert severity="success">Sin faltante por registrar.</Alert>
                    ) : (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          type="number"
                          size="small"
                          label="Cantidad producida"
                          value={resultQuantities[item.id] || ""}
                          onChange={(event) => {
                            setFieldErrors((prev) => ({ ...prev, [`result-${item.id}`]: null }));
                            setResultQuantities((current) => ({ ...current, [item.id]: event.target.value }));
                          }}
                          inputProps={{ min: 0.001, max: pendingQty, step: 0.001 }}
                          error={Boolean(fieldErrors[`result-${item.id}`])}
                          helperText={fieldErrors[`result-${item.id}`] || `Max: ${formatNumber(pendingQty)}`}
                          disabled={disabled}
                          fullWidth
                        />
                        <AppButton color="secondary" onClick={() => registerItemResult(item)} disabled={disabled}>
                          {resultSavingItemId === item.id ? "..." : "Registrar"}
                        </AppButton>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Ordenes de produccion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selecciona una orden para ver detalle, registrar avances o cerrarla.
            </Typography>
          </Stack>
          <Chip label={`${orders.length} ordenes`} variant="outlined" />
        </Stack>

        {loading ? <Alert severity="info">Cargando ordenes de produccion...</Alert> : null}
        {!loading && orders.length === 0 ? <Alert severity="info">No hay ordenes de produccion.</Alert> : null}

        <Grid container spacing={2}>
          {orders.map((order) => {
            const progress = getProgressPercent(order.produced_qty, order.planned_qty);
            const isSelected = String(order.id) === String(selectedOrderId);
            const pendingItems = Number(order.pending_items || 0);

            return (
              <Grid item xs={12} md={6} xl={4} key={order.id}>
                <Paper
                  variant="outlined"
                  onClick={() => setSelectedOrderId(String(order.id))}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    height: "100%",
                    cursor: "pointer",
                    borderColor: isSelected ? "primary.main" : pendingItems > 0 ? "warning.main" : "divider",
                    bgcolor: isSelected ? "action.selected" : "background.paper",
                  }}
                >
                  <Stack spacing={2} sx={{ height: "100%" }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                          Orden #{order.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {order.branch_name || "Sucursal"} - {formatDate(order.planned_date)}
                        </Typography>
                      </Stack>
                      <StatusChip status={order.status} />
                    </Stack>

                    <Box>
                      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
                        <Typography variant="body2" color="text.secondary">
                          Avance
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 8,
                          borderRadius: 999,
                          bgcolor: "action.hover",
                          "& .MuiLinearProgress-bar": { borderRadius: 999 },
                        }}
                      />
                    </Box>

                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <OrderMetric label="Items" value={formatNumber(order.items_count)} />
                      </Grid>
                      <Grid item xs={4}>
                        <OrderMetric label="Plan" value={formatNumber(order.planned_qty)} />
                      </Grid>
                      <Grid item xs={4}>
                        <OrderMetric label="Hecho" value={formatNumber(order.produced_qty)} />
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: "auto" }}>
                      <Chip
                        size="small"
                        color={pendingItems > 0 ? "warning" : "success"}
                        label={pendingItems > 0 ? `${pendingItems} pendientes` : "Sin pendientes"}
                      />
                      {isSelected ? <Chip size="small" color="primary" label="Seleccionada" variant="outlined" /> : null}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Dialog
        open={Boolean(cancelDialog)}
        onClose={() => {
          if (!cancellingOrder && !cancellingItemId) {
            setCancelDialog(null);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {cancelDialog?.type === "order" ? "Cancelar orden de produccion" : "Cancelar producto planificado"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              Esta accion deja trazabilidad y no se puede usar si ya existe produccion registrada.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {cancelDialog?.type === "order"
                ? `Vas a cancelar la orden #${selectedOrder?.id || ""}. Los productos planificados quedaran cancelados.`
                : `Vas a cancelar "${cancelDialog?.item?.product_name || cancelDialog?.item?.product_id || "producto"}" dentro de la orden seleccionada.`}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" color="secondary" onClick={() => setCancelDialog(null)} disabled={cancellingOrder || Boolean(cancellingItemId)}>
            Volver
          </AppButton>
          <AppButton
            color="error"
            onClick={() => {
              if (cancelDialog?.type === "order") {
                cancelSelectedOrder();
                return;
              }

              if (cancelDialog?.item) {
                cancelItemPlan(cancelDialog.item);
              }
            }}
            disabled={cancellingOrder || Boolean(cancellingItemId)}
          >
            {cancellingOrder || cancellingItemId ? "Cancelando..." : "Confirmar cancelacion"}
          </AppButton>
        </DialogActions>
      </Dialog>
    </FlowPageLayout>
  );
};

export default ProductionOrdersPage;
