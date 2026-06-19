import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Alert, Box, Chip, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import toast from "react-hot-toast";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import AppButton from "@core/components/ui/AppButton";
import ColombianCurrencyField from "components/atoms/ColombianCurrencyField";
import RecipeIngredientsTable from "components/organisms/recipes/RecipeIngredientsTable";
import { normalizeRows } from "views/modules/flow-utils";

const moneyFormatter = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyBaseRow = () => ({ rowKey: `base-${Date.now()}-${Math.random()}`, concept: "MOJE", rawMaterialId: "", quantity: "", wastagePercent: "0" });
const emptyOutputItem = () => ({ rowKey: `output-item-${Date.now()}-${Math.random()}`, concept: "RELLENO", rawMaterialId: "", quantity: "", wastagePercent: "0" });
const emptyOutput = () => ({ productId: "", productName: "", expectedQuantity: "", unitWeightGrams: "", salePrice: "", packingNote: "", items: [] });
const getProductName = (product) => product?.name || product?.product_name || product?.description || "Sin nombre";
const getMaterialCost = (material) => toNumber(material?.unit_cost);

const RecipeEditPage = () => {
  const router = useRouter();
  const recipeId = router.query.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [recipeName, setRecipeName] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [baseRows, setBaseRows] = useState([emptyBaseRow()]);
  const [outputs, setOutputs] = useState([emptyOutput()]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!recipeId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [detailResponse, baseDataResponse] = await Promise.all([
          recipesService.getDetail(recipeId),
          recipesService.getBaseData({ onlyActive: 1 }),
        ]);

        if (detailResponse?.code !== 1) {
          setError(detailResponse?.message || "No se pudo cargar la receta");
          return;
        }
        if (baseDataResponse?.code !== 1) {
          setError(baseDataResponse?.message || "No se pudieron cargar catalogos");
          return;
        }

        const detail = detailResponse.data;
        setRecipe(detail);
        setProducts(normalizeRows(baseDataResponse.data?.products));
        setRawMaterials(normalizeRows(baseDataResponse.data?.raw_materials));
        setRecipeName(detail.recipe_name || "");
        setRecipeDescription(detail.recipe_description || "");
        const loadedBaseRows = normalizeRows(detail.base_items).map((item) => ({
            rowKey: `base-${item.raw_material_id}`,
            concept: item.concept || "MOJE",
            rawMaterialId: String(item.raw_material_id || ""),
            quantity: item.quantity ?? "",
            wastagePercent: item.wastage_percent ?? "0",
          }));
        const loadedOutputs = normalizeRows(detail.outputs).map((output) => ({
            productId: String(output.product_id || ""),
            productName: output.product_name || "",
            expectedQuantity: output.expected_quantity ?? "",
            unitWeightGrams: output.unit_weight_grams ?? "",
            salePrice: output.sale_price ?? "",
            packingNote: output.packing_note || "",
            items: normalizeRows(output.items).map((item) => ({
              rowKey: `output-${output.id}-${item.raw_material_id}-${item.concept}`,
              concept: item.concept || "RELLENO",
              rawMaterialId: String(item.raw_material_id || ""),
              quantity: item.quantity ?? "",
              wastagePercent: item.wastage_percent ?? "0",
            })),
          }));
        setBaseRows(loadedBaseRows.length ? loadedBaseRows : [emptyBaseRow()]);
        setOutputs(loadedOutputs.length ? loadedOutputs : [emptyOutput()]);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error al cargar la receta"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recipeId]);

  const baseSummary = useMemo(() => {
    return baseRows.reduce((summary, row) => {
      const material = rawMaterials.find((item) => String(item.id) === String(row.rawMaterialId));
      const quantity = toNumber(row.quantity);
      const wastage = toNumber(row.wastagePercent);
      return {
        cost: summary.cost + quantity * (1 + wastage / 100) * getMaterialCost(material),
        weight: summary.weight + quantity,
      };
    }, { cost: 0, weight: 0 });
  }, [baseRows, rawMaterials]);

  const updateBaseRow = (index, key, value) => setBaseRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  const updateOutput = (index, key, value) => setOutputs((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  const updateOutputItem = (outputIndex, itemIndex, key, value) => setOutputs((current) => current.map((output, index) => (
    index === outputIndex
      ? { ...output, items: output.items.map((item, rowIndex) => (rowIndex === itemIndex ? { ...item, [key]: value } : item)) }
      : output
  )));
  const moveBaseRow = (index, direction) => setBaseRows((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const moveOutputItem = (outputIndex, itemIndex, direction) => setOutputs((current) => current.map((output, index) => {
    if (index !== outputIndex) return output;
    const target = itemIndex + direction;
    if (target < 0 || target >= output.items.length) return output;
    const items = [...output.items];
    [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
    return { ...output, items };
  }));

  const validateForm = () => {
    const nextErrors = {};
    if (!recipeName.trim()) nextErrors.recipeName = "Ingresa el nombre";
    if (!baseRows.every((row) => row.rawMaterialId && toNumber(row.quantity) > 0)) nextErrors.baseRows = "Completa ingredientes base";
    if (!outputs.every((output) => output.productId && toNumber(output.expectedQuantity) > 0)) nextErrors.outputs = "Completa productos finales";
    if (!outputs.every((output) => output.items.every((item) => item.rawMaterialId && toNumber(item.quantity) > 0))) {
      nextErrors.outputItems = "Completa o elimina los ingredientes específicos incompletos";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveVersion = async () => {
    setError(null);
    if (!validateForm()) {
      setError("Corrige los campos marcados antes de guardar");
      return;
    }

    setSaving(true);
    try {
      const response = await recipesService.createVersion(recipeId, {
        p_primary_product_id: recipe?.primary_product_id || null,
        p_recipe_name: recipeName.trim(),
        p_notes: recipeDescription.trim() || null,
        p_base_items: baseRows.map((row) => ({
          concept: row.concept || "MOJE",
          raw_material_id: Number(row.rawMaterialId),
          quantity: toNumber(row.quantity),
          wastage_percent: toNumber(row.wastagePercent),
        })),
        p_outputs: outputs.map((output, index) => ({
          product_id: Number(output.productId),
          expected_quantity: toNumber(output.expectedQuantity),
          unit_weight_grams: output.unitWeightGrams === "" ? null : toNumber(output.unitWeightGrams),
          sale_price: output.salePrice === "" ? null : toNumber(output.salePrice),
          packing_note: output.packingNote || null,
          sort_order: index + 1,
          items: output.items.map((item) => ({
            concept: item.concept || "RELLENO",
            raw_material_id: Number(item.rawMaterialId),
            quantity: toNumber(item.quantity),
            wastage_percent: toNumber(item.wastagePercent),
          })),
        })),
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo guardar la nueva version");
        return;
      }

      toast.success("Nueva version de receta creada");
      router.push("/recipes");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al guardar la receta"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Editar receta" subtitle="Los cambios se guardan como una nueva version activa." links={[{ label: "Recetas", href: "/recipes" }]}>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info">Cargando receta...</Alert> : null}

      {!loading ? (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Datos de la receta</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Nombre de la receta" value={recipeName} onChange={(event) => setRecipeName(event.target.value)} error={Boolean(fieldErrors.recipeName)} helperText={fieldErrors.recipeName || `Version actual V${recipe?.version_no || 1}`} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Observaciones" value={recipeDescription} onChange={(event) => setRecipeDescription(event.target.value)} />
                  </Grid>
                </Grid>
              </Box>
              <Box sx={{ width: { xs: "100%", lg: 280 } }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: "background.default" }}>
                  <Typography variant="body2" color="text.secondary">Costo base</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{moneyFormatter.format(baseSummary.cost)}</Typography>
                  <Typography variant="caption" color="text.secondary">{numberFormatter.format(baseSummary.weight)} g de moje</Typography>
                </Paper>
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Ingredientes base</Typography>
                <Typography variant="body2" color="text.secondary">Cantidades en gramos.</Typography>
              </Box>
            </Stack>
            {fieldErrors.baseRows ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.baseRows}</Alert> : null}
            <RecipeIngredientsTable
              rows={baseRows}
              rawMaterials={rawMaterials}
              onAdd={() => setBaseRows((prev) => [...prev, emptyBaseRow()])}
              onChange={updateBaseRow}
              onMove={moveBaseRow}
              onRemove={(index) => setBaseRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
            />
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Productos finales</Typography>
                <Typography variant="body2" color="text.secondary">Selecciona productos existentes para la nueva version.</Typography>
              </Box>
              <AppButton color="secondary" variant="outlined" onClick={() => setOutputs((prev) => [...prev, emptyOutput()])}>
                <AddCircleOutlineIcon sx={{ mr: 1 }} /> Agregar producto
              </AppButton>
            </Stack>
            {fieldErrors.outputs ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.outputs}</Alert> : null}
            {fieldErrors.outputItems ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.outputItems}</Alert> : null}
            <Stack spacing={2}>
              {outputs.map((output, index) => (
                <Paper key={`output-${index}`} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>Producto {index + 1}</Typography>
                      <Chip label={`Costo unitario ${moneyFormatter.format(toNumber(output.expectedQuantity) > 0 ? baseSummary.cost / toNumber(output.expectedQuantity) : 0)}`} variant="outlined" size="small" />
                    </Box>
                    <IconButton onClick={() => setOutputs((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} disabled={outputs.length === 1} size="small">
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField select fullWidth label="Producto final" value={output.productId} onChange={(event) => {
                        const selected = products.find((product) => String(product.id) === String(event.target.value));
                        updateOutput(index, "productId", event.target.value);
                        updateOutput(index, "productName", selected ? getProductName(selected) : "");
                      }}>
                        <MenuItem value="">Seleccionar</MenuItem>
                        {products.map((product) => <MenuItem key={product.id} value={String(product.id)}>{getProductName(product)}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                      <TextField fullWidth type="number" label="Cantidad" value={output.expectedQuantity} onChange={(event) => updateOutput(index, "expectedQuantity", event.target.value)} inputProps={{ min: 0.01, step: "0.01" }} />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                      <TextField fullWidth type="number" label="Peso unidad" value={output.unitWeightGrams} onChange={(event) => updateOutput(index, "unitWeightGrams", event.target.value)} inputProps={{ min: 0, step: "0.01" }} />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                      <ColombianCurrencyField
                        label="Precio"
                        value={output.salePrice}
                        onChange={(event) => updateOutput(index, "salePrice", event.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth label="Nota de empaque" value={output.packingNote} onChange={(event) => updateOutput(index, "packingNote", event.target.value)} />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Ingredientes propios de este producto</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      El sistema los descontará junto con el moje cuando este producto sea seleccionado.
                    </Typography>
                    <RecipeIngredientsTable
                      rows={output.items}
                      rawMaterials={rawMaterials}
                      allowEmpty
                      addLabel="Agregar ingrediente al producto"
                      onAdd={() => updateOutput(index, "items", [...output.items, emptyOutputItem()])}
                      onChange={(itemIndex, key, value) => updateOutputItem(index, itemIndex, key, value)}
                      onMove={(itemIndex, direction) => moveOutputItem(index, itemIndex, direction)}
                      onRemove={(itemIndex) => updateOutput(index, "items", output.items.filter((_, rowIndex) => rowIndex !== itemIndex))}
                    />
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Paper>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <AppButton color="secondary" onClick={saveVersion} loading={saving} disabled={saving}>
              Guardar nueva version
            </AppButton>
            <AppButton component={Link} href="/recipes" color="secondary" variant="outlined" disabled={saving}>
              Cancelar
            </AppButton>
          </Stack>
        </>
      ) : null}
    </FlowPageLayout>
  );
};

export default RecipeEditPage;
