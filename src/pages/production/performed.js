import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Checkbox, Chip, FormControlLabel, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import ProductionPlanOverview from "components/organisms/production/ProductionPlanOverview";
import ProductionWorkDialog from "components/organisms/production/ProductionWorkDialog";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const oneDecimalFormatter = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const formatOneDecimalTruncated = (value) => oneDecimalFormatter.format(
  Math.trunc(Number(value || 0) * 10) / 10
);
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const buildProductionQuantities = (item) => normalizeRows(item?.outputs).reduce((acc, output) => {
  const expectedTotal = Math.round(Number(output.expected_quantity || 0) * Number(item?.arrobas || 1) * 1000) / 1000;
  acc[String(output.product_id)] = String(output.produced_quantity ?? expectedTotal);
  return acc;
}, {});

const buildManualQuantities = (recipe, arrobas) => normalizeRows(recipe?.outputs).reduce((acc, output) => {
  const expectedTotal = Math.round(Number(output.expected_quantity || 0) * Number(arrobas || 1) * 1000) / 1000;
  acc[String(output.product_id)] = String(expectedTotal || "");
  return acc;
}, {});

const buildProductionPayload = (item, quantities) => normalizeRows(item?.outputs).map((output) => ({
  product_id: Number(output.product_id),
  produced_quantity: Number(quantities[String(output.product_id)] || 0),
}));

const buildManualPayload = (recipe, quantities, selectedOutputIds) => normalizeRows(recipe?.outputs)
  .filter((output) => selectedOutputIds.includes(String(output.product_id)))
  .map((output) => ({
    product_id: Number(output.product_id),
    produced_quantity: Number(quantities[String(output.product_id)] || 0),
  }));

const calculateEquivalentArrobas = (recipe, quantities, selectedOutputIds) => {
  const equivalents = normalizeRows(recipe?.outputs)
    .filter((output) => selectedOutputIds.includes(String(output.product_id)))
    .map((output) => {
      const expected = Number(output.expected_quantity || 0);
      const produced = Number(quantities[String(output.product_id)] || 0);
      return expected > 0 && produced > 0 ? produced / expected : 0;
    });

  return equivalents.length ? Math.max(...equivalents) : 0;
};

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
  const [manualQuantities, setManualQuantities] = useState({});
  const [selectedOutputIds, setSelectedOutputIds] = useState([]);
  const [manualForm, setManualForm] = useState({
    branchId: "",
    recipeId: "",
    arrobas: "1",
    producedDate: toDateInputValue(),
    notes: "",
    registrationMode: "arrobas",
  });

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => String(recipe.id) === String(manualForm.recipeId)) || null,
    [manualForm.recipeId, recipes]
  );
  const equivalentArrobas = useMemo(
    () => calculateEquivalentArrobas(selectedRecipe, manualQuantities, selectedOutputIds),
    [manualQuantities, selectedOutputIds, selectedRecipe]
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
        recipeId: current.recipeId || (recipeRows[0]?.id ? String(recipeRows[0].id) : ""),
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

  useEffect(() => {
    const outputIds = normalizeRows(selectedRecipe?.outputs).map((output) => String(output.product_id));
    setSelectedOutputIds(outputIds);
  }, [selectedRecipe]);

  useEffect(() => {
    if (manualForm.registrationMode === "arrobas") {
      setManualQuantities(buildManualQuantities(selectedRecipe, manualForm.arrobas));
    }
  }, [manualForm.arrobas, manualForm.registrationMode, selectedRecipe]);

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
    if (!outputPayload.length || outputPayload.some((output) => !Number.isFinite(output.produced_quantity) || output.produced_quantity <= 0)) {
      setError("Todas las cantidades realizadas deben ser mayores a cero.");
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

    const arrobas = manualForm.registrationMode === "units"
      ? calculateEquivalentArrobas(selectedRecipe, manualQuantities, selectedOutputIds)
      : Number(manualForm.arrobas || 0);
    const outputs = buildManualPayload(selectedRecipe, manualQuantities, selectedOutputIds);

    if (!baker) {
      setError("Tu usuario debe tener un empleado panadero activo para registrar produccion manual.");
      return;
    }

    if (!Number(manualForm.branchId) || !Number(manualForm.recipeId)) {
      setError("Selecciona sucursal y receta para registrar la produccion.");
      return;
    }

    if (!Number.isFinite(arrobas) || arrobas <= 0) {
      setError("Ingresa bultos o unidades válidas para calcular la producción.");
      return;
    }

    if (!selectedOutputIds.length) {
      setError("Selecciona al menos un producto creado.");
      return;
    }

    if (!outputs.length || outputs.some((output) => !Number.isFinite(output.produced_quantity) || output.produced_quantity <= 0)) {
      setError("Todas las cantidades realizadas deben ser mayores a cero.");
      return;
    }

    setSavingManual(true);
    setError(null);
    try {
      const response = await productionService.registerMyBatch({
        p_branch_id: Number(manualForm.branchId),
        p_recipe_id: Number(manualForm.recipeId),
        p_batch_quantity: arrobas,
        p_produced_date: manualForm.producedDate,
        p_notes: manualForm.notes || null,
        p_outputs: outputs,
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo registrar la produccion manual.");
        return;
      }

      toast.success(response.message || "Produccion registrada");
      setManualForm((current) => ({ ...current, notes: "" }));
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
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Receta vigente"
              value={manualForm.recipeId}
              onChange={(event) => setManualForm((current) => ({ ...current, recipeId: event.target.value }))}
            >
              {recipes.map((recipe) => (
                <MenuItem key={recipe.id} value={String(recipe.id)}>
                  {recipe.recipe_name || recipe.product_name || `Receta #${recipe.id}`} - V{recipe.version_no}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              label="Tipo de registro"
              value={manualForm.registrationMode}
              onChange={(event) => setManualForm((current) => ({ ...current, registrationMode: event.target.value }))}
            >
              <MenuItem value="arrobas">Por bultos</MenuItem>
              <MenuItem value="units">Por unidades</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {manualForm.registrationMode === "arrobas" ? (
              <TextField
                fullWidth
                type="number"
                label="Bultos realizados"
                value={manualForm.arrobas}
                inputProps={{ min: 0, step: 0.01 }}
                onChange={(event) => setManualForm((current) => ({ ...current, arrobas: event.target.value }))}
              />
            ) : (
              <TextField
                fullWidth
                disabled
                label="Bultos estimados"
                value={formatOneDecimalTruncated(equivalentArrobas)}
                helperText="Calculadas según el rendimiento"
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
            <AppButton fullWidth variant="contained" disabled={savingManual || !baker} onClick={registerManualProduction} sx={{ height: "100%", minHeight: 54 }}>
              {savingManual ? "Guardando..." : "Registrar produccion"}
            </AppButton>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
          <Typography sx={{ fontWeight: 800 }}>Productos creados con la receta</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Marca únicamente los productos que realmente fueron elaborados.
          </Typography>
          {normalizeRows(selectedRecipe?.outputs).length ? (
            <Grid container spacing={2}>
              {normalizeRows(selectedRecipe?.outputs).map((output) => {
                const outputId = String(output.product_id);
                const selected = selectedOutputIds.includes(outputId);
                return (
                  <Grid item xs={12} md={6} key={output.product_id}>
                    <Box sx={{ p: 1.5, border: "1px solid", borderColor: selected ? "secondary.main" : "divider", borderRadius: 2, bgcolor: selected ? "secondary.lighter" : "background.paper" }}>
                      <FormControlLabel
                        control={(
                          <Checkbox
                            color="secondary"
                            checked={selected}
                            onChange={(event) => setSelectedOutputIds((current) => event.target.checked
                              ? [...current, outputId]
                              : current.filter((id) => id !== outputId))}
                          />
                        )}
                        label={<Typography sx={{ fontWeight: 900 }}>{output.product_name}</Typography>}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Rendimiento: {formatNumber(output.expected_quantity)} unidades por bulto
                      </Typography>
                      <TextField
                        fullWidth
                        disabled={!selected}
                        type="number"
                        label={manualForm.registrationMode === "units" ? "Unidades realizadas" : "Cantidad realizada"}
                        value={selected ? manualQuantities[outputId] || "" : ""}
                        inputProps={{ min: 0, step: 0.001 }}
                        onChange={(event) => setManualQuantities((current) => ({ ...current, [outputId]: event.target.value }))}
                        helperText={manualForm.registrationMode === "units" && selected
                          ? `${formatOneDecimalTruncated(Number(manualQuantities[outputId] || 0) / Number(output.expected_quantity || 1))} bulto(s) estimado(s)`
                          : ""}
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Alert severity="info">Selecciona una receta vigente para ver sus productos.</Alert>
          )}
        </Box>
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
