import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import toast from "react-hot-toast";
import productionService from "services/production/production-service";
import catalogService from "services/catalog/catalog-service";
import recipesService from "services/recipes/recipes-service";
import AppButton from "@core/components/ui/AppButton";
import AppCard from "@core/components/ui/AppCard";
import FlowPageLayout from "views/modules/FlowPageLayout";
import { getDisplayName, normalizeRows } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 3,
});

const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const getRecipeParts = (recipe) => {
  const rawNotes = String(recipe?.notes || "").trim();
  const [name, ...descriptionParts] = rawNotes.split(/\s+[—-]\s+/);
  const fallbackName = recipe?.version_no ? `Receta V${recipe.version_no}` : "Receta";

  return {
    name: name || fallbackName,
    description: descriptionParts.join(" - ").trim(),
  };
};

const ProductionRegisterPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState({});
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState({});
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [productionResponse, branchesResponse, recipesResponse] = await Promise.all([
          productionService.getBaseData({ onlyActive: 1, page: 1, pageSize: 40 }),
          catalogService.getBranches({ onlyActive: 1 }),
          recipesService.getList({ onlyActive: 1 }),
        ]);

        if (productionResponse?.code !== 1) {
          setError(productionResponse?.message || "No se pudo cargar registro de produccion");
          return;
        }

        if (branchesResponse?.code !== 1) {
          setError(branchesResponse?.message || "No se pudieron cargar sucursales");
          return;
        }

        if (recipesResponse?.code !== 1) {
          setError(recipesResponse?.message || "No se pudieron cargar recetas");
          return;
        }

        const branchRows = normalizeRows(branchesResponse.data);
        const productRows = normalizeRows(productionResponse.data?.products);
        const recipeRows = Array.isArray(recipesResponse?.data) ? recipesResponse.data : [];
        const defaultRecipeSelection = {};

        productRows.forEach((product) => {
          const availableRecipes = recipeRows.filter((recipe) => Number(recipe.product_id) === Number(product.id));
          if (availableRecipes.length) {
            defaultRecipeSelection[product.id] = String(availableRecipes[0].id);
          }
        });

        setBranches(branchRows);
        setSelectedBranch(branchRows[0]?.id ? String(branchRows[0].id) : "");
        setProducts(productRows);
        setRecipes(recipeRows);
        setSelectedRecipes(defaultRecipeSelection);
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error de red al cargar registro de produccion"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const productsWithRecipes = useMemo(
    () =>
      products.map((product) => ({
        product,
        recipes: recipes.filter((recipe) => Number(recipe.product_id) === Number(product.id)),
      })),
    [products, recipes]
  );

  const selectedEntries = productsWithRecipes
    .map(({ product, recipes: productRecipes }) => ({
      product,
      hasRecipe: productRecipes.length > 0,
      quantity: Number(batches[product.id] || 0),
    }))
    .filter((entry) => entry.quantity > 0);

  const totalBatches = selectedEntries.reduce((acc, entry) => acc + entry.quantity, 0);
  const selectedCount = selectedEntries.length;
  const withoutRecipeCount = productsWithRecipes.filter(({ recipes: productRecipes }) => productRecipes.length === 0).length;

  const onSubmitProduction = async () => {
    if (saving) {
      return;
    }

    setError(null);
    setFieldErrors({});

    const entries = productsWithRecipes
      .map(({ product, recipes: productRecipes }) => {
        const recipeId = selectedRecipes[product.id]
          ? Number(selectedRecipes[product.id])
          : productRecipes[0]
          ? Number(productRecipes[0].id)
          : null;

        return {
          productId: Number(product.id),
          recipeId,
          quantity: Number(batches[product.id] || 0),
        };
      })
      .filter((item) => item.productId > 0 && item.quantity > 0);

    const nextErrors = {};
    if (!selectedBranch) {
      nextErrors.selectedBranch = "Selecciona una sucursal";
    }

    if (notes.length > 250) {
      nextErrors.notes = "Maximo 250 caracteres";
    }

    const invalidBatch = products.some((product) => {
      const raw = batches[product.id];
      if (raw === "" || raw === undefined || raw === null) {
        return false;
      }

      const value = Number(raw);
      return Number.isNaN(value) || value < 0;
    });

    if (invalidBatch) {
      nextErrors.batches = "No se permiten lotes negativos";
    }

    const invalidRecipeSelection = entries.some((entry) => !entry.recipeId);
    if (invalidRecipeSelection) {
      nextErrors.recipes = "Selecciona una receta para cada producto con lote";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Corrige los campos marcados antes de registrar");
      return;
    }

    if (entries.length === 0) {
      setError("Ingresa al menos un lote para registrar produccion");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        entries.map((item) =>
          productionService.registerResult({
            p_branch_id: Number(selectedBranch),
            p_product_id: item.productId,
            p_recipe_id: item.recipeId,
            p_produced_qty: item.quantity,
            p_reference_type: "manual",
            p_reference_id: null,
            p_notes: notes || null,
          })
        )
      );

      const failed = results.find((result) => result?.code !== 1);
      if (failed) {
        setError(failed?.message || "No se pudo registrar toda la produccion");
        return;
      }

      toast.success(`Produccion registrada para ${entries.length} productos`);
      setBatches({});
      setNotes("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error de red al registrar produccion"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout title="Produccion - Registrar" subtitle="Carga de lotes diarios de produccion">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Sucursal"
              value={selectedBranch}
              onChange={(event) => {
                setFieldErrors((prev) => ({ ...prev, selectedBranch: null }));
                setSelectedBranch(event.target.value);
              }}
              error={Boolean(fieldErrors.selectedBranch)}
              helperText={fieldErrors.selectedBranch || " "}
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={String(branch.id)}>
                  {getDisplayName(branch)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Alert severity="info">
              {selectedCount} productos seleccionados - {formatNumber(totalBatches)} lotes
            </Alert>
          </Grid>
          <Grid item xs={12} md={4}>
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
      </Paper>

      {withoutRecipeCount > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {withoutRecipeCount} producto(s) no tienen receta activa. Puedes verlos, pero no se registraran hasta crear una receta.
        </Alert>
      ) : null}
      {fieldErrors.batches ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.batches}</Alert> : null}
      {fieldErrors.recipes ? <Alert severity="warning" sx={{ mb: 2 }}>{fieldErrors.recipes}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", mb: 2 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Productos a producir
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selecciona la receta y captura solo los lotes que vas a registrar.
            </Typography>
          </Box>
          <Chip
            label={`${productsWithRecipes.length} productos`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {loading ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Cargando productos y recetas...
          </Alert>
        ) : null}

      <Grid container spacing={2}>
          {productsWithRecipes.map(({ product, recipes: productRecipes }) => {
            const productName = getDisplayName(product);
            const selectedRecipeId = selectedRecipes[product.id] || (productRecipes[0]?.id ? String(productRecipes[0].id) : "");
            const selectedRecipe = productRecipes.find((recipe) => String(recipe.id) === String(selectedRecipeId));
            const selectedRecipeParts = getRecipeParts(selectedRecipe);
            const hasRecipe = productRecipes.length > 0;
            const quantity = batches[product.id] || "";

          return (
            <Grid item xs={12} md={6} xl={4} key={product.id}>
              <AppCard
                variant="outlined"
                sx={{
                  height: "100%",
                  borderRadius: 2,
                  borderColor: Number(quantity || 0) > 0 ? "primary.main" : "divider",
                  boxShadow: Number(quantity || 0) > 0 ? "0 10px 24px rgba(13, 21, 37, 0.08)" : "none",
                }}
                contentSx={{ height: "100%" }}
              >
                <Stack spacing={2} sx={{ height: "100%" }}>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }} noWrap>
                        {productName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {product.sku || "Sin SKU"}
                      </Typography>
                    </Box>
                    <Chip
                      label={hasRecipe ? "Con receta" : "Sin receta"}
                      color={hasRecipe ? "success" : "warning"}
                      size="small"
                      variant={hasRecipe ? "outlined" : "filled"}
                    />
                  </Stack>

                  {hasRecipe ? (
                    <TextField
                      select
                      fullWidth
                      label="Receta"
                      value={selectedRecipeId}
                      onChange={(event) =>
                        setSelectedRecipes((prev) => ({
                          ...prev,
                          [product.id]: event.target.value,
                        }))
                      }
                        error={Boolean(fieldErrors.recipes) && Boolean(quantity)}
                      >
                        {productRecipes.map((recipe) => (
                          <MenuItem key={recipe.id} value={String(recipe.id)}>
                            {getRecipeParts(recipe).name}
                          </MenuItem>
                        ))}
                      </TextField>
                  ) : (
                    <Alert severity="info">Crea una receta activa para poder registrar este producto.</Alert>
                  )}

                    {selectedRecipe ? (
                      <Stack spacing={1}>
                        <TextField
                          fullWidth
                          label="Descripcion de la receta"
                          value={selectedRecipeParts.description || "Sin descripcion registrada"}
                          InputProps={{ readOnly: true }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Produce {formatNumber(selectedRecipe.output_quantity)} unidades por lote.
                        </Typography>
                      </Stack>
                    ) : null}

                  <Box sx={{ flex: 1 }} />

                  <TextField
                    type="number"
                    label="Lotes producidos"
                    value={quantity}
                    onChange={(event) => {
                      setFieldErrors((prev) => ({ ...prev, batches: null, recipes: null }));
                      setBatches((prev) => ({ ...prev, [product.id]: event.target.value }));
                    }}
                    inputProps={{ min: 0, step: 0.001 }}
                    error={Boolean(fieldErrors.batches)}
                    disabled={!hasRecipe}
                    fullWidth
                  />
                </Stack>
              </AppCard>
            </Grid>
          );
        })}
      </Grid>
      </Paper>

      {!loading && productsWithRecipes.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No hay productos activos para registrar produccion.
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 3, alignItems: { xs: "stretch", sm: "center" } }}>
        <AppButton color="secondary" onClick={onSubmitProduction} disabled={saving || loading}>
          {saving ? "Registrando..." : "Registrar produccion"}
        </AppButton>
        <Typography variant="body2" color="text.secondary">
          El registro descuenta materias primas segun la receta seleccionada.
        </Typography>
      </Stack>
    </FlowPageLayout>
  );
};

export default ProductionRegisterPage;
