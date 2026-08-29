import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import FactoryRoundedIcon from "@mui/icons-material/FactoryRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import toast from "react-hot-toast";
import AppButton from "@core/components/ui/AppButton";
import { toDateInputValue } from "@core/components/ui/balance-date-utils";
import productionService from "services/production/production-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const normalizeWholeNumberInput = (value, update) => { if (value === "" || /^\d+$/.test(value)) update(value); };

const ProductionPerformedPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [baker, setBaker] = useState(null);
  const [form, setForm] = useState({ branchId: "", productId: "", producedQuantity: "", producedDate: toDateInputValue() });

  const products = useMemo(() => recipes.flatMap((recipe) => normalizeRows(recipe.outputs).map((output) => ({
    ...output,
    recipe_id: recipe.id,
    recipe_name: recipe.recipe_name || recipe.product_name || `Receta #${recipe.id}`,
    recipe_version: recipe.version_no,
  }))).filter((product, index, rows) => rows.findIndex((row) => String(row.product_id) === String(product.product_id)) === index), [recipes]);
  const selectedProduct = useMemo(() => products.find((product) => String(product.product_id) === String(form.productId)) || null, [form.productId, products]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productionService.getMyProductionBaseData();
      if (response?.code !== 1) throw new Error(response?.message || "No se pudieron cargar los datos de produccion.");
      const branchRows = normalizeRows(response.data?.branches);
      setBranches(branchRows);
      setRecipes(normalizeRows(response.data?.recipes));
      setBaker(response.data?.baker || null);
      setForm((current) => ({ ...current, branchId: current.branchId || String(branchRows[0]?.id || "") }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al cargar los datos de produccion."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveProduction = async () => {
    if (saving) return;
    const producedQuantity = Number(form.producedQuantity || 0);
    const yieldPerBatch = Number(selectedProduct?.expected_quantity || 0);
    if (!baker) return setError("Tu usuario debe tener un empleado panadero activo para registrar produccion.");
    if (!Number(form.branchId) || !selectedProduct) return setError("Selecciona la sucursal y el producto elaborado.");
    if (!Number.isInteger(producedQuantity) || producedQuantity <= 0) return setError("La cantidad producida debe ser un numero entero mayor a cero.");
    if (!Number.isFinite(yieldPerBatch) || yieldPerBatch <= 0) return setError("El producto no tiene un rendimiento valido en su receta vigente.");

    setSaving(true);
    setError(null);
    try {
      const response = await productionService.registerMyBatch({
        p_branch_id: Number(form.branchId),
        p_recipe_id: Number(selectedProduct.recipe_id),
        p_batch_quantity: producedQuantity / yieldPerBatch,
        p_produced_date: form.producedDate,
        p_outputs: [{ product_id: Number(selectedProduct.product_id), produced_quantity: producedQuantity }],
      });
      if (response?.code !== 1) throw new Error(response?.message || "No se pudo registrar la produccion.");
      toast.success(response.message || "Produccion registrada");
      setForm((current) => ({ ...current, productId: "", producedQuantity: "" }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar la produccion."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Produccion realizada" subtitle="Selecciona el producto e indica libremente las unidades completas elaboradas.">
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Cargando produccion...</Alert> : null}
      <Paper
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: { xs: 4, md: 5 },
          borderColor: "rgba(221, 93, 38, 0.24)",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
          "&:before": { content: '\"\"', position: "absolute", inset: "0 0 auto", height: 7, bgcolor: "secondary.main" },
        }}
      >
        <Box
          sx={{
            p: { xs: 2.25, sm: 3 },
            color: "common.white",
            background: "linear-gradient(135deg, #111827 0%, #1f2937 72%, #3b241c 100%)",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 3, bgcolor: "secondary.main", flexShrink: 0 }}>
              <FactoryRoundedIcon />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }}>Registrar producto elaborado</Typography>
              <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,.72)" }}>Carga rápida de la producción terminada.</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 0.75 }}>
            <Chip label="Registro libre" size="small" sx={{ bgcolor: "rgba(255,255,255,.12)", color: "common.white", fontWeight: 800 }} />
            <Chip label="Solo unidades completas" size="small" sx={{ bgcolor: "rgba(221,93,38,.28)", color: "#ffd7c4", fontWeight: 800 }} />
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2.25, sm: 3 }, bgcolor: "background.paper" }}>
        {!baker ? <Alert severity="warning" sx={{ mb: 2 }}>Tu usuario no tiene un empleado panadero activo asociado.</Alert> : null}
        <Grid
          container
          spacing={2}
          sx={{
            "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "background.default", minHeight: 56 },
            "& .MuiInputLabel-root": { fontWeight: 700 },
          }}
        >
          <Grid item xs={12} md={3}>
            <TextField select fullWidth label="Sucursal" value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}>
              {branches.map((branch) => <MenuItem key={branch.id} value={String(branch.id)}>{branch.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              fullWidth
              options={products}
              value={selectedProduct}
              onChange={(_event, product) => setForm((current) => ({ ...current, productId: product ? String(product.product_id) : "", producedQuantity: "" }))}
              getOptionLabel={(product) => product.product_name || "Producto"}
              isOptionEqualToValue={(option, value) => String(option.product_id) === String(value.product_id)}
              noOptionsText="No encontramos productos"
              renderInput={(params) => <TextField {...params} label="Producto" placeholder="Escribe para buscar" />}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth type="number" label="Unidades producidas" value={form.producedQuantity} inputProps={{ min: 1, step: 1, inputMode: "numeric" }} onChange={(event) => normalizeWholeNumberInput(event.target.value, (value) => setForm((current) => ({ ...current, producedQuantity: value })))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label="Fecha" value={form.producedDate} InputLabelProps={{ shrink: true }} onChange={(event) => setForm((current) => ({ ...current, producedDate: event.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            {selectedProduct ? (
              <Box sx={{ mb: 2, p: 1.75, borderRadius: 3, display: "flex", alignItems: "center", gap: 1.25, bgcolor: "rgba(221, 93, 38, 0.07)", border: "1px solid rgba(221, 93, 38, 0.2)" }}>
                <Inventory2OutlinedIcon color="secondary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Producto seleccionado</Typography>
                  <Typography sx={{ fontWeight: 900 }}>{selectedProduct.product_name}</Typography>
                </Box>
              </Box>
            ) : null}
            <AppButton fullWidth color="secondary" disabled={saving || !baker || !selectedProduct || !Number.isInteger(Number(form.producedQuantity)) || Number(form.producedQuantity) <= 0} onClick={saveProduction} sx={{ minHeight: 58, borderRadius: 3, fontSize: 17, fontWeight: 900, boxShadow: selectedProduct ? "0 10px 24px rgba(221, 93, 38, 0.25)" : "none" }}>
              {saving ? "Guardando..." : "Guardar produccion"}
            </AppButton>
          </Grid>
        </Grid>
        </Box>
      </Paper>
    </FlowPageLayout>
  );
};

export default ProductionPerformedPage;
