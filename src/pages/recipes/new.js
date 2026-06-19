import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import Link from "next/link";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import AppButton from "@core/components/ui/AppButton";
import ColombianCurrencyField from "components/atoms/ColombianCurrencyField";
import RecipeIngredientsTable from "components/organisms/recipes/RecipeIngredientsTable";
import { normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const emptyBaseRow = () => ({
  rowKey: `base-${Date.now()}-${Math.random()}`,
  concept: "MOJE",
  rawMaterialId: "",
  quantity: "",
  wastagePercent: "0",
});

const emptyOutputItem = () => ({
  rowKey: `output-item-${Date.now()}-${Math.random()}`,
  concept: "RELLENO",
  rawMaterialId: "",
  quantity: "",
  wastagePercent: "0",
});

const emptyOutput = () => ({
  productId: "",
  productName: "",
  expectedQuantity: "",
  unitWeightGrams: "",
  salePrice: "",
  packingNote: "",
  items: [],
});

const getProductDisplayName = (product) => {
  return product?.name || product?.product_name || product?.description || "Sin nombre";
};

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const buildSkuFromName = (name) => {
  const base = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 40);

  return `${base || "PRODUCTO"}-${Date.now().toString(36).toUpperCase()}`;
};

const getMaterialCostPerGram = (material) => {
  return toNumber(material?.unit_cost);
};

const getRowMaterial = (rawMaterials, row) => {
  return rawMaterials.find((material) => String(material.id) === String(row.rawMaterialId));
};

const getRowCost = (rawMaterials, row) => {
  const material = getRowMaterial(rawMaterials, row);
  const quantity = toNumber(row.quantity);
  const wastage = toNumber(row.wastagePercent);
  return quantity * (1 + wastage / 100) * getMaterialCostPerGram(material);
};

const getRowWeight = (row) => toNumber(row.quantity);

const MetricCard = ({ label, value, helper }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: "background.default", height: "100%" }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
      {value}
    </Typography>
    {helper ? (
      <Typography variant="caption" color="text.secondary">
        {helper}
      </Typography>
    ) : null}
  </Paper>
);

const RecipeCreatePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [recipeName, setRecipeName] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [baseRows, setBaseRows] = useState([emptyBaseRow()]);
  const [outputs, setOutputs] = useState([emptyOutput()]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [baseDataResponse, categoriesResponse, taxRatesResponse] = await Promise.all([
          recipesService.getBaseData({ onlyActive: 1 }),
          catalogService.getProductCategories({ onlyActive: 1 }),
          catalogService.getTaxRates({ onlyActive: 1 }),
        ]);

        if (baseDataResponse?.code !== 1) {
          setError(baseDataResponse?.message || "No se pudieron cargar productos o materias primas");
          return;
        }

        const productRows = normalizeRows(baseDataResponse.data?.products);
        const rawMaterialRows = normalizeRows(baseDataResponse.data?.raw_materials);
        const categoryRows = normalizeRows(categoriesResponse?.data);
        const taxRateRows = normalizeRows(taxRatesResponse?.data);

        setProducts(productRows);
        setRawMaterials(rawMaterialRows);
        setProductCategories(categoryRows);
        setTaxRates(taxRateRows);

        setOutputs([emptyOutput()]);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error al cargar productos o materias primas"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const baseSummary = useMemo(() => {
    return baseRows.reduce(
      (summary, row) => ({
        cost: summary.cost + getRowCost(rawMaterials, row),
        weight: summary.weight + getRowWeight(row),
      }),
      { cost: 0, weight: 0 }
    );
  }, [baseRows, rawMaterials]);

  const outputSummaries = useMemo(() => {
    return outputs.map((output) => {
      const specificCost = output.items.reduce((total, item) => total + getRowCost(rawMaterials, item), 0);
      const totalCost = baseSummary.cost + specificCost;
      const quantity = toNumber(output.expectedQuantity);
      const unitCost = quantity > 0 ? totalCost / quantity : 0;
      const salePrice = toNumber(output.salePrice);
      const profitPercent = salePrice > 0 ? ((salePrice - unitCost) / salePrice) * 100 : 0;

      return {
        totalCost,
        unitCost,
        filledWeight: toNumber(output.unitWeightGrams),
        profitPercent,
      };
    });
  }, [baseSummary.cost, outputs, rawMaterials]);

  const updateBaseRow = (index, key, value) => {
    setBaseRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const updateOutput = (index, key, value) => {
    setOutputs((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const updateOutputItem = (outputIndex, itemIndex, key, value) => {
    setOutputs((current) => current.map((output, index) => {
      if (index !== outputIndex) return output;
      return {
        ...output,
        items: output.items.map((item, rowIndex) => (rowIndex === itemIndex ? { ...item, [key]: value } : item)),
      };
    }));
  };

  const moveBaseRow = (index, direction) => {
    setBaseRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const moveOutputItem = (outputIndex, itemIndex, direction) => {
    setOutputs((current) => current.map((output, index) => {
      if (index !== outputIndex) return output;
      const target = itemIndex + direction;
      if (target < 0 || target >= output.items.length) return output;
      const items = [...output.items];
      [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
      return { ...output, items };
    }));
  };

  const isValidIngredientRow = (row) => {
    return row.rawMaterialId && toNumber(row.quantity) > 0 && toNumber(row.wastagePercent) >= 0;
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!recipeName.trim()) nextErrors.recipeName = "Ingresa el nombre de la receta";
    if (recipeDescription.length > 255) nextErrors.recipeDescription = "Maximo 255 caracteres";
    if (!baseRows.every(isValidIngredientRow)) nextErrors.baseRows = "Completa los ingredientes base";

    const hasValidOutputs = outputs.every((output) => {
      return (output.productId || output.productName.trim()) && toNumber(output.expectedQuantity) > 0;
    });

    if (!hasValidOutputs) nextErrors.outputs = "Completa producto final y cantidad";
    if (!outputs.every((output) => output.items.every(isValidIngredientRow))) {
      nextErrors.outputItems = "Completa o elimina los ingredientes específicos incompletos";
    }

    setFieldErrors(nextErrors);
    return nextErrors;
  };

  const onSubmit = async () => {
    setError(null);

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setError("Corrige los campos marcados antes de crear la receta");
      return;
    }

    setSaving(true);
    try {
      const defaultCategory = productCategories[0];
      const defaultTaxRate = taxRates[0];

      const outputProductIds = [];
      const createdProducts = [];

      for (const output of outputs) {
        if (output.productId) {
          outputProductIds.push(Number(output.productId));
          continue;
        }

        if (!defaultCategory || !defaultTaxRate) {
          setError("Para crear productos finales nuevos necesitas una categoria de producto y una tasa de impuesto activas");
          setSaving(false);
          return;
        }

        const productName = output.productName.trim();
        const createProductResult = await catalogService.createProduct({
          p_sku: buildSkuFromName(productName),
          p_name: productName,
          p_description: `Producto final creado desde receta ${recipeName.trim()}`,
          p_category_id: Number(defaultCategory.id),
          p_tax_rate_id: Number(defaultTaxRate.id),
          p_unit: "unit",
          p_base_price: output.salePrice === "" ? 0 : toNumber(output.salePrice),
          p_min_stock: 0,
          p_is_active: 1,
        });

        if (createProductResult?.code !== 1) {
          setError(createProductResult?.message || `No se pudo crear el producto final ${productName}`);
          setSaving(false);
          return;
        }

        const productId = Number(createProductResult?.data?.product_id || 0);
        if (!productId) {
          setError(`El producto final ${productName} se creo sin retornar ID`);
          setSaving(false);
          return;
        }

        outputProductIds.push(productId);
        createdProducts.push({
          id: productId,
          name: productName,
          sku: createProductResult?.data?.sku,
          is_active: 1,
        });
      }

      const result = await recipesService.createCosting({
        p_primary_product_id: null,
        p_recipe_name: recipeName.trim(),
        p_notes: recipeDescription.trim() || null,
        p_base_items: baseRows.map((row) => ({
          concept: row.concept || "MOJE",
          raw_material_id: Number(row.rawMaterialId),
          quantity: toNumber(row.quantity),
          wastage_percent: toNumber(row.wastagePercent),
        })),
        p_outputs: outputs.map((output, index) => ({
          product_id: outputProductIds[index],
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

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo crear la receta");
        return;
      }

      toast.success("Receta con costeo creada correctamente");
      if (createdProducts.length > 0) {
        toast.success(`${createdProducts.length} producto(s) final(es) creado(s)`);
        setProducts((current) => [...current, ...createdProducts]);
      }
      setRecipeName("");
      setRecipeDescription("");
      setBaseRows([emptyBaseRow()]);
      setOutputs([emptyOutput()]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al crear la receta"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout
      title="Crear receta"
      subtitle="Construye el moje, sus productos finales y el costo estimado por unidad"
      links={[{ label: "Lotes y empaque", href: "/production/packaging" }]}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Datos de la receta
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define la receta base o moje. Los productos finales se agregan como derivados.
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre de la receta"
                  value={recipeName}
                  onChange={(event) => setRecipeName(event.target.value)}
                  error={Boolean(fieldErrors.recipeName)}
                  helperText={fieldErrors.recipeName || "Ej: Brazo de vainilla"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Observaciones"
                  value={recipeDescription}
                  onChange={(event) => setRecipeDescription(event.target.value)}
                  error={Boolean(fieldErrors.recipeDescription)}
                  helperText={fieldErrors.recipeDescription || "Opcional"}
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ width: { xs: "100%", lg: 330 } }}>
            <Grid container spacing={2}>
              <Grid item xs={6} lg={12}>
                <MetricCard label="Costo base" value={moneyFormatter.format(baseSummary.cost)} />
              </Grid>
              <Grid item xs={6} lg={12}>
                <MetricCard label="Peso del moje" value={`${numberFormatter.format(baseSummary.weight)} grs`} />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Ingredientes base
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Materias primas que se usan antes de hornear.
            </Typography>
          </Box>
        </Stack>

        {fieldErrors.baseRows ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {fieldErrors.baseRows}
          </Alert>
        ) : null}

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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Productos finales
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define qué sale del moje y los ingredientes propios de cada producto cuando aplique.
            </Typography>
          </Box>
          <AppButton color="secondary" variant="outlined" onClick={() => setOutputs((prev) => [...prev, emptyOutput()])} disabled={loading || saving}>
            <AddCircleOutlineIcon sx={{ mr: 1 }} /> Agregar producto
          </AppButton>
        </Stack>

        {fieldErrors.outputs ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {fieldErrors.outputs}
          </Alert>
        ) : null}
        {fieldErrors.outputItems ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.outputItems}</Alert> : null}

        <Stack spacing={2}>
          {outputs.map((output, outputIndex) => {
            const summary = outputSummaries[outputIndex] || {};

            return (
              <Paper
                variant="outlined"
                key={`output-${outputIndex}`}
                sx={{
                  borderRadius: 3,
                  p: 2,
                  borderColor: output.productId && toNumber(output.expectedQuantity) > 0 ? "primary.main" : "divider",
                  boxShadow: output.productId && toNumber(output.expectedQuantity) > 0 ? "0 10px 24px rgba(13, 21, 37, 0.08)" : "none",
                }}
              >
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>
                        Producto {outputIndex + 1}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Costo unitario estimado: {moneyFormatter.format(summary.unitCost || 0)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                      <Chip label={`Total ${moneyFormatter.format(summary.totalCost || 0)}`} variant="outlined" />
                      <Chip label={`Peso ${numberFormatter.format(summary.filledWeight || 0)} grs`} variant="outlined" />
                      <Chip label={`Utilidad ${numberFormatter.format(summary.profitPercent || 0)}%`} color="secondary" variant="outlined" />
                      <IconButton
                        onClick={() => setOutputs((prev) => prev.filter((_, rowIndex) => rowIndex !== outputIndex))}
                        disabled={outputs.length === 1}
                        size="small"
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Nombre del producto final"
                        value={output.productName}
                        onChange={(event) => {
                          updateOutput(outputIndex, "productName", event.target.value);
                          updateOutput(outputIndex, "productId", "");
                        }}
                        helperText="Escribe uno nuevo o selecciona uno existente"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        fullWidth
                        label="Usar existente"
                        value={output.productId}
                        onChange={(event) => {
                          const productId = event.target.value;
                          const selectedProduct = products.find((product) => String(product.id) === String(productId));
                          updateOutput(outputIndex, "productId", productId);
                          updateOutput(outputIndex, "productName", selectedProduct ? getProductDisplayName(selectedProduct) : "");
                        }}
                        helperText="Opcional"
                      >
                        <MenuItem value="">Crear nuevo</MenuItem>
                        {products.map((product) => (
                          <MenuItem key={product.id} value={String(product.id)}>
                            {getProductDisplayName(product)}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Cantidad"
                        value={output.expectedQuantity}
                        onChange={(event) => updateOutput(outputIndex, "expectedQuantity", event.target.value)}
                        inputProps={{ min: 0.01, step: "0.01" }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Peso unidad"
                        value={output.unitWeightGrams}
                        onChange={(event) => updateOutput(outputIndex, "unitWeightGrams", event.target.value)}
                        inputProps={{ min: 0, step: "0.01" }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                      <ColombianCurrencyField
                        fullWidth
                        label="Precio"
                        value={output.salePrice}
                        onChange={(event) => updateOutput(outputIndex, "salePrice", event.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Nota"
                        value={output.packingNote}
                        onChange={(event) => updateOutput(outputIndex, "packingNote", event.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Ingredientes propios de este producto</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Se descontarán automáticamente al producir este producto. Déjalo vacío si no requiere relleno, cobertura o decoración.
                    </Typography>
                    <RecipeIngredientsTable
                      rows={output.items}
                      rawMaterials={rawMaterials}
                      allowEmpty
                      addLabel="Agregar ingrediente al producto"
                      onAdd={() => updateOutput(outputIndex, "items", [...output.items, emptyOutputItem()])}
                      onChange={(itemIndex, key, value) => updateOutputItem(outputIndex, itemIndex, key, value)}
                      onMove={(itemIndex, direction) => moveOutputItem(outputIndex, itemIndex, direction)}
                      onRemove={(itemIndex) => updateOutput(
                        outputIndex,
                        "items",
                        output.items.filter((_, index) => index !== itemIndex)
                      )}
                    />
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: "background.default", mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              Necesitas crear un producto o materia prima?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crealos en catalogo y vuelve para seleccionarlos en la receta.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <AppButton component={Link} href="/catalogo/nuevo-producto" color="secondary" variant="outlined">
              Crear producto
            </AppButton>
            <AppButton component={Link} href="/catalogo/nueva-materia-prima" color="secondary" variant="outlined">
              Crear materia prima
            </AppButton>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
        <AppButton color="secondary" onClick={onSubmit} loading={saving} disabled={loading || saving}>
          Crear receta
        </AppButton>
        <Typography variant="body2" color="text.secondary">
          Esta receta quedará guardada como la versión vigente para producción.
        </Typography>
      </Stack>
    </FlowPageLayout>
  );
};

export default RecipeCreatePage;
