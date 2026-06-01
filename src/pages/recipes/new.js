import { useEffect, useState } from "react";
import { Alert, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import Link from "next/link";
import toast from "react-hot-toast";
import recipesService from "services/recipes/recipes-service";
import FlowPageLayout from "views/modules/FlowPageLayout";
import AppButton from "@core/components/ui/AppButton";
import { normalizeRows, getDisplayName } from "views/modules/flow-utils";

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const unitOptions = [
  { value: "g", label: "Gramos" },
  { value: "kg", label: "Kilos" },
  { value: "oz", label: "Onzas" },
  { value: "lb", label: "Libras" },
  { value: "ml", label: "Mililitros" },
  { value: "l", label: "Litros" },
  { value: "unit", label: "Unidades" },
  { value: "box", label: "Cajas" },
  { value: "bag", label: "Bolsas" },
];

const unitLabels = unitOptions.reduce((acc, unit) => ({ ...acc, [unit.value]: unit.label }), {});

const unitGroups = {
  g: "mass",
  kg: "mass",
  oz: "mass",
  lb: "mass",
  ml: "volume",
  l: "volume",
  unit: "count",
  box: "box",
  bag: "bag",
};

const unitFactors = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
  ml: 1,
  l: 1000,
  unit: 1,
  box: 1,
  bag: 1,
};

const roundQuantity = (value) => Number(Number(value).toFixed(6));

const getProductDisplayName = (product) => {
  return product?.name || product?.product_name || product?.description || "Sin nombre";
};

const convertQuantity = (quantity, fromUnit, toUnit) => {
  const sourceUnit = fromUnit || toUnit;
  const targetUnit = toUnit || sourceUnit;

  if (sourceUnit === targetUnit) {
    return roundQuantity(quantity);
  }

  if (unitGroups[sourceUnit] !== unitGroups[targetUnit]) {
    return null;
  }

  const baseQuantity = Number(quantity) * unitFactors[sourceUnit];
  return roundQuantity(baseQuantity / unitFactors[targetUnit]);
};

const RecipeCreatePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [outputQuantity, setOutputQuantity] = useState(0);
  const [ingredientRows, setIngredientRows] = useState([
    { rawMaterialId: "", quantity: "", unit: "g", wastagePercent: "0" },
  ]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const baseDataResponse = await recipesService.getBaseData({ onlyActive: 1 });

        if (baseDataResponse?.code !== 1) {
          setError(baseDataResponse?.message || "No se pudieron cargar productos o materias primas");
          return;
        }

        const productRows = normalizeRows(baseDataResponse.data?.products);
        const rawMaterialRows = normalizeRows(baseDataResponse.data?.raw_materials);

        setProducts(productRows);
        setRawMaterials(rawMaterialRows);

        if (productRows.length) {
          setSelectedProduct(String(productRows[0].id));
        }
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Error al cargar productos o materias primas"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const onAddIngredient = () => {
    setIngredientRows((prev) => [...prev, { rawMaterialId: "", quantity: "", unit: "g", wastagePercent: "0" }]);
  };

  const onRemoveIngredient = (index) => {
    setIngredientRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const onUpdateIngredient = (index, key, value) => {
    setIngredientRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (key === "rawMaterialId") {
          const material = rawMaterials.find((item) => String(item.id) === String(value));
          return {
            ...row,
            rawMaterialId: value,
            unit: material?.unit || row.unit || "g",
          };
        }

        return { ...row, [key]: value };
      })
    );
  };

  const validateIngredients = () => {
    return ingredientRows.every((row) => {
      const quantity = Number(row.quantity);
      const material = rawMaterials.find((item) => String(item.id) === String(row.rawMaterialId));
      return (
        row.rawMaterialId &&
        material &&
        !Number.isNaN(quantity) &&
        quantity > 0 &&
        convertQuantity(quantity, row.unit, material.unit) !== null
      );
    });
  };

  const onSubmit = async () => {
    setError(null);
    setFieldErrors({});

    const nextErrors = {};
    if (!selectedProduct) nextErrors.selectedProduct = "Selecciona el producto final";
    if (!recipeName.trim()) nextErrors.recipeName = "Ingresa el nombre de la receta";
    if (!outputQuantity || Number(outputQuantity) <= 0) nextErrors.outputQuantity = "Ingresa una cantidad de salida mayor a 0";
    if (!validateIngredients()) nextErrors.ingredients = "Completa cada ingrediente con materia prima y cantidad valida";
    if (recipeDescription.length > 255) nextErrors.recipeDescription = "Maximo 255 caracteres";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Corrige los campos marcados antes de crear la receta");
      return;
    }

    setSaving(true);
    try {
      const result = await recipesService.create({
        p_product_id: Number(selectedProduct),
        p_output_quantity: Number(outputQuantity),
        p_notes: `${recipeName}${recipeDescription ? ` - ${recipeDescription}` : ""}`,
      });

      if (result?.code !== 1) {
        setError(result?.message || "No se pudo crear la receta");
        return;
      }

      const recipeId = Number(result.data?.recipe_id);
      const rowsToAdd = ingredientRows.map((ingredient) => {
        const material = rawMaterials.find((item) => String(item.id) === String(ingredient.rawMaterialId));
        const convertedQuantity = convertQuantity(Number(ingredient.quantity), ingredient.unit, material?.unit);

        return {
          p_raw_material_id: Number(ingredient.rawMaterialId),
          p_quantity: convertedQuantity,
          p_wastage_percent: Number(ingredient.wastagePercent) || 0,
        };
      });

      const addResults = await Promise.all(
        rowsToAdd.map((payload) => recipesService.addItem(recipeId, payload))
      );

      const failedAdd = addResults.find((item) => item?.code !== 1);
      if (failedAdd) {
        setError(failedAdd?.message || "Error al agregar ingredientes a la receta");
        return;
      }

      const publishResult = await recipesService.publish(recipeId);
      if (publishResult?.code !== 1) {
        setError(publishResult?.message || "No se pudo publicar la receta");
        return;
      }

      toast.success("Receta creada y publicada correctamente");
      setRecipeName("");
      setRecipeDescription("");
      setOutputQuantity(0);
      setIngredientRows([{ rawMaterialId: "", quantity: "", unit: "g", wastagePercent: "0" }]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Error al crear la receta"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowPageLayout
      title="Crear receta"
      subtitle="Define una receta con producto final e ingredientes antes de producir"
      links={[{ label: "Registrar produccion", href: "/production/register" }]}
    >
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Datos de la receta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define el producto final, el nombre visible y la cantidad que produce una receta.
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Producto final"
                value={selectedProduct}
                onChange={(event) => setSelectedProduct(event.target.value)}
                error={Boolean(fieldErrors.selectedProduct)}
                helperText={fieldErrors.selectedProduct || "Producto para el cual defines esta receta"}
                disabled={loading}
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={String(product.id)}>
                    {getProductDisplayName(product)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de la receta"
                value={recipeName}
                onChange={(event) => setRecipeName(event.target.value)}
                error={Boolean(fieldErrors.recipeName)}
                helperText={fieldErrors.recipeName || "Ej: Pan de dulce, Pan integral"}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad de salida"
                value={outputQuantity}
                onChange={(event) => setOutputQuantity(event.target.value)}
                error={Boolean(fieldErrors.outputQuantity)}
                helperText={fieldErrors.outputQuantity || "Producto final por receta"}
                inputProps={{ min: 0.1, step: "0.1" }}
              />
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Descripcion de la receta"
                value={recipeDescription}
                onChange={(event) => setRecipeDescription(event.target.value)}
                error={Boolean(fieldErrors.recipeDescription)}
                helperText={fieldErrors.recipeDescription || "Opcional: harina, huevos, maicena, etc."}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, bgcolor: "background.default" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}>
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Necesitas un producto final?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crea el producto en la vista de catalogo y luego vuelve para seleccionarlo en esta receta.
              </Typography>
            </Stack>
            <AppButton
              component={Link}
              href="/catalogo/nuevo-producto"
              color="secondary"
              variant="outlined"
            >
              Ir a crear producto
            </AppButton>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", mb: 2 }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Ingredientes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Agrega las materias primas y la cantidad necesaria por receta.
              </Typography>
            </Stack>
            <AppButton color="secondary" variant="outlined" onClick={onAddIngredient} disabled={loading || saving}>
              <AddCircleOutlineIcon sx={{ mr: 1 }} /> Agregar ingrediente
            </AppButton>
          </Stack>

          <Stack spacing={1.5}>
            {ingredientRows.map((row, index) => (
              <Paper key={`ingredient-${index}`} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                <Grid container spacing={2} sx={{ alignItems: "center" }}>
                  <Grid item xs={12} md={5}>
                    <TextField
                      select
                      fullWidth
                      label="Materia prima"
                      value={row.rawMaterialId}
                      onChange={(event) => onUpdateIngredient(index, "rawMaterialId", event.target.value)}
                    >
                      <MenuItem value="">Seleccionar materia prima</MenuItem>
                      {rawMaterials.map((material) => (
                        <MenuItem key={material.id} value={String(material.id)}>
                          {getDisplayName(material)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={5} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Cantidad"
                      value={row.quantity}
                      onChange={(event) => onUpdateIngredient(index, "quantity", event.target.value)}
                      inputProps={{ min: 0.01, step: "0.01" }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5} md={2}>
                    <TextField
                      select
                      fullWidth
                      label="Unidad capturada"
                      value={row.unit}
                      onChange={(event) => onUpdateIngredient(index, "unit", event.target.value)}
                      helperText={
                        row.rawMaterialId
                          ? `Se guardara en ${unitLabels[rawMaterials.find((item) => String(item.id) === String(row.rawMaterialId))?.unit] || "su unidad base"}`
                          : "Selecciona materia prima"
                      }
                    >
                      {unitOptions.map((unit) => (
                        <MenuItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={10} sm={5} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Perdida %"
                      value={row.wastagePercent}
                      onChange={(event) => onUpdateIngredient(index, "wastagePercent", event.target.value)}
                      inputProps={{ min: 0, max: 100, step: "0.1" }}
                    />
                  </Grid>
                  <Grid item xs={2} md={1}>
                    <IconButton onClick={() => onRemoveIngredient(index)} disabled={ingredientRows.length === 1}>
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>

          {fieldErrors.ingredients ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {fieldErrors.ingredients}
            </Alert>
          ) : null}
        </Paper>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
          >
            <Typography variant="body2" color="text.secondary">
              La receta se creara para el producto seleccionado y luego agregara los ingredientes registrados.
            </Typography>
            <AppButton onClick={onSubmit} loading={saving} disabled={loading || saving}>
              Crear y publicar receta
            </AppButton>
          </Stack>
        </Paper>
      </Stack>
    </FlowPageLayout>
  );
};

export default RecipeCreatePage;
