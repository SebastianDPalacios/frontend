import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import ProductionPlanOverview from "components/organisms/production/ProductionPlanOverview";
import ProductionWorkDialog from "components/organisms/production/ProductionWorkDialog";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const normalizeWholeNumberInput = (value, update) => {
  if (value === "" || /^\d+$/.test(value)) update(value);
};

const buildProductionQuantities = (item) => normalizeRows(item?.outputs).reduce((acc, output) => {
  const expectedTotal = Math.round(Number(output.expected_quantity || 0) * Number(item?.arrobas || 1));
  acc[String(output.product_id)] = String(output.produced_quantity ?? expectedTotal);
  return acc;
}, {});

const buildProductionPayload = (item, quantities) => normalizeRows(item?.outputs).map((output) => ({
  product_id: Number(output.product_id),
  produced_quantity: Number(quantities[String(output.product_id)] || 0),
}));

const ProductionPerformedPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [branches, setBranches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [baker, setBaker] = useState(null);
  const [startingItemId, setStartingItemId] = useState("");
  const [finishingItemId, setFinishingItemId] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [workDialog, setWorkDialog] = useState({ plan: null, item: null, canFinish: true });
  const [productionQuantities, setProductionQuantities] = useState({});
  const [manualForm, setManualForm] = useState({
    branchId: "",
    productId: "",
    arrobas: "1",
    producedQuantity: "",
    producedDate: toDateInputValue(),
    notes: "",
  });

  const manualProducts = useMemo(() => recipes.flatMap((recipe) => normalizeRows(recipe.outputs).map((output) => ({
    ...output,
    recipe_id: recipe.id,
    recipe_name: recipe.recipe_name || recipe.product_name || `Receta #${recipe.id}`,
    recipe_version: recipe.version_no,
  }))).filter((product, index, rows) => rows.findIndex((row) => String(row.product_id) === String(product.product_id)) === index), [recipes]);
  const selectedProduct = useMemo(
    () => manualProducts.find((product) => String(product.product_id) === String(manualForm.productId)) || null,
    [manualForm.productId, manualProducts]
  );
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansResponse, baseResponse] = await Promise.all([
        productionService.getMyPlans(),
        productionService.getMyProductionBaseData(),
      ]);

      if (plansResponse?.code !== 1) {
        setError(plansResponse?.message || "No se pudo cargar tu produccion asignada.");
        return;
      }

      if (baseResponse?.code !== 1) {
        setError(baseResponse?.message || "No se pudo cargar los datos para registrar produccion.");
        return;
      }

      const branchRows = normalizeRows(baseResponse.data?.branches);
      const recipeRows = normalizeRows(baseResponse.data?.recipes);
      setMyPlans(normalizeRows(plansResponse.data));
      setBranches(branchRows);
      setRecipes(recipeRows);
      setBaker(baseResponse.data?.baker || null);
      setManualForm((current) => ({
        ...current,
        branchId: current.branchId || (branchRows[0]?.id ? String(branchRows[0].id) : ""),
        productId: current.productId || "",
      }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar tu produccion."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openWorkDialog = (plan, item, options = {}) => {
    setProductionQuantities(buildProductionQuantities(item));
    setWorkDialog({ plan, item, canFinish: options.canFinish !== false });
  };

  const startPlanItem = async (productionPlanItemId) => {
    if (startingItemId) return;

    setStartingItemId(String(productionPlanItemId));
    setError(null);
    try {
      const response = await productionService.startPlanItem(productionPlanItemId);
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo iniciar la produccion.");
        return;
      }

      toast.success(response.message || "Produccion iniciada");
      const ownerPlan = myPlans.find((plan) =>
        normalizeRows(plan.items).some((item) => String(item.id) === String(productionPlanItemId))
      );
      const ownerItem = normalizeRows(ownerPlan?.items).find(
        (item) => String(item.id) === String(productionPlanItemId)
      );
      openWorkDialog(ownerPlan, { ...ownerItem, started_at: new Date().toISOString() });
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al iniciar la produccion."));
    } finally {
      setStartingItemId("");
    }
  };

  const finishPlanItem = async (productionPlanItemId) => {
    if (finishingItemId) return;

    const outputPayload = buildProductionPayload(workDialog.item, productionQuantities);
    if (!outputPayload.length || outputPayload.some((output) => !Number.isInteger(output.produced_quantity) || output.produced_quantity <= 0)) {
      setError("Todas las cantidades realizadas deben ser numeros enteros mayores a cero.");
      return;
    }

    setFinishingItemId(String(productionPlanItemId));
    setError(null);
    try {
      const response = await productionService.finishPlanItem(productionPlanItemId, { p_outputs: outputPayload });
      if (response?.code !== 1) {
        setError(response?.message || "No se pudo finalizar la produccion.");
        return;
      }

      toast.success(response.message || "Produccion finalizada");
      setWorkDialog((current) => ({
        ...current,
        item: current.item
          ? {
              ...current.item,
              finished_at: new Date().toISOString(),
              production_batch_id: response.data?.production_batch_id,
              outputs: normalizeRows(current.item.outputs).map((output) => ({
                ...output,
                produced_quantity: productionQuantities[String(output.product_id)],
              })),
            }
          : current.item,
      }));
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al finalizar la produccion."));
    } finally {
      setFinishingItemId("");
    }
  };

  const registerManualProduction = async () => {
    if (savingManual) return;

    const arrobas = Number(manualForm.arrobas || 0);
    const producedQuantity = Number(manualForm.producedQuantity || 0);

    if (!baker) {
      setError("Tu usuario debe tener un empleado panadero activo para registrar produccion manual.");
      return;
    }

    if (!Number(manualForm.branchId) || !selectedProduct) {
      setError("Selecciona la sucursal y el producto elaborado.");
      return;
    }

    if (!Number.isFinite(arrobas) || arrobas <= 0) {
      setError("Ingresa bultos o unidades válidas para calcular la producción.");
      return;
    }

    if (!Number.isInteger(producedQuantity) || producedQuantity <= 0) {
      setError("La cantidad producida debe ser un numero entero mayor a cero.");
      return;
    }

    setSavingManual(true);
    setError(null);
    try {
      const response = await productionService.registerMyBatch({
        p_branch_id: Number(manualForm.branchId),
        p_recipe_id: Number(selectedProduct.recipe_id),
        p_batch_quantity: arrobas,
        p_produced_date: manualForm.producedDate,
        p_notes: manualForm.notes || null,
        p_outputs: [{ product_id: Number(selectedProduct.product_id), produced_quantity: producedQuantity }],
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo registrar la produccion manual.");
        return;
      }

      toast.success(response.message || "Produccion registrada");
      setManualForm((current) => ({ ...current, productId: "", producedQuantity: "", notes: "" }));
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar la produccion."));
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <FlowPageLayout
      title="Produccion realizada"
      subtitle="Registra los panes hechos y deja cada lote listo para conteo y empaque. El plan del panadero es opcional."
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando produccion...</Alert> : null}

      <Box sx={{ mb: 3, p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Registrar produccion sin plan</Typography>
            <Typography color="text.secondary">Usa esta opcion cuando no te hayan enviado una asignacion previa.</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="Plan opcional" color="success" variant="outlined" />
            <Chip label={baker?.name || "Sin panadero asociado"} color={baker ? "primary" : "warning"} variant="outlined" />
          </Stack>
        </Stack>

        {!baker ? (
          <Alert severity="warning" sx={{ mb: 2 }}>Tu usuario no tiene un empleado panadero activo asociado. Puedes ver asignaciones, pero no registrar produccion manual.</Alert>
        ) : null}

        <Alert severity="info" sx={{ mb: 2 }}>
          Selecciona un producto, indica cuántos bultos de masa utilizaste y escribe cuántas unidades completas terminaste.
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Sucursal"
              value={manualForm.branchId}
              onChange={(event) => setManualForm((current) => ({ ...current, branchId: event.target.value }))}
            >
              {branches.map((branch) => <MenuItem key={branch.id} value={String(branch.id)}>{branch.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              select
              fullWidth
              label="1. Producto que elaboraste *"
              value={manualForm.productId}
              onChange={(event) => setManualForm((current) => ({ ...current, productId: event.target.value, producedQuantity: "" }))}
            >
              <MenuItem value="">Seleccionar producto</MenuItem>
              {manualProducts.map((product) => (
                <MenuItem key={product.product_id} value={String(product.product_id)}>
                  {product.product_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth disabled label="Receta aplicada automáticamente" value={selectedProduct ? `${selectedProduct.recipe_name} - V${selectedProduct.recipe_version}` : "Selecciona primero un producto"} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="2. Bultos de masa utilizados *"
              value={manualForm.arrobas}
              inputProps={{ min: 0.1, step: 0.1 }}
              onChange={(event) => setManualForm((current) => ({ ...current, arrobas: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth type="number" label="3. Unidades terminadas *" value={manualForm.producedQuantity}
              inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
              onChange={(event) => normalizeWholeNumberInput(event.target.value, (value) => setManualForm((current) => ({ ...current, producedQuantity: value })))}
              helperText="Ejemplo: 1000 panes. No admite decimales." />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="date"
              label="Fecha"
              value={manualForm.producedDate}
              InputLabelProps={{ shrink: true }}
              onChange={(event) => setManualForm((current) => ({ ...current, producedDate: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={9}>
            <TextField
              fullWidth
              label="Notas"
              value={manualForm.notes}
              onChange={(event) => setManualForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppButton fullWidth variant="contained" disabled={savingManual || !baker || !selectedProduct || Number(manualForm.arrobas) <= 0 || !Number.isInteger(Number(manualForm.producedQuantity)) || Number(manualForm.producedQuantity) <= 0} onClick={registerManualProduction} sx={{ height: "100%", minHeight: 54 }}>
              {savingManual ? "Guardando..." : "Guardar producto realizado"}
            </AppButton>
          </Grid>
        </Grid>

        {selectedProduct ? <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
          <Typography sx={{ fontWeight: 800 }}>Resumen antes de guardar</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: "none" }}>
            Se registra individualmente usando su receta vigente.
          </Typography>
          <Grid container spacing={2}>
              <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Producto</Typography><Typography sx={{ fontWeight: 900 }}>{selectedProduct.product_name}</Typography></Grid>
              <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Receta utilizada</Typography><Typography sx={{ fontWeight: 800 }}>{selectedProduct.recipe_name} · V{selectedProduct.recipe_version}</Typography></Grid>
              <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Rendimiento de referencia</Typography><Typography sx={{ fontWeight: 800 }}>{formatNumber(selectedProduct.expected_quantity)} unidades por bulto</Typography></Grid>
          </Grid>
        </Box> : null}
      </Box>

      <ProductionPlanOverview
        canManage={false}
        loading={loading}
        myPlans={myPlans}
        plans={[]}
        startingItemId={startingItemId}
        formatNumber={formatNumber}
        onStartItem={startPlanItem}
        onViewItem={openWorkDialog}
      />

      <ProductionWorkDialog
        open={Boolean(workDialog.item)}
        plan={workDialog.plan}
        item={workDialog.item}
        finishing={Boolean(finishingItemId)}
        canFinish={workDialog.canFinish}
        productionQuantities={productionQuantities}
        onQuantityChange={(productId, value) => setProductionQuantities((current) => ({ ...current, [String(productId)]: value }))}
        onClose={() => setWorkDialog({ plan: null, item: null, canFinish: true })}
        onFinish={finishPlanItem}
      />
    </FlowPageLayout>
  );
};

export default ProductionPerformedPage;
