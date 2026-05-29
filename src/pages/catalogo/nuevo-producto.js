import { useEffect, useState } from "react";
import { Alert, Box, Grid, MenuItem, Paper, Stack, Typography } from "@mui/material";
import toast from "react-hot-toast";
import catalogService from "services/catalog/catalog-service";
import { getApiErrorMessage } from "utils/api-error";
import useForm from "hooks/useForm";
import FormField from "@core/components/ui/FormField";
import AppButton from "@core/components/ui/AppButton";
import FlowPageLayout from "views/modules/FlowPageLayout";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const NuevoProductoPage = () => {
  const [categories, setCategories] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [categoriesResult, taxRatesResult] = await Promise.all([
          catalogService.getProductCategories({ onlyActive: 1 }),
          catalogService.getTaxRates({ onlyActive: 1 }),
        ]);

        setCategories(normalizeList(categoriesResult?.data ?? categoriesResult));
        setTaxRates(normalizeList(taxRatesResult?.data ?? taxRatesResult));
      } catch (error) {
        setCategories([]);
        setTaxRates([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const { values, errors, touched, isSubmitting, submitError, handleChange, handleBlur, handleSubmit, resetForm } =
    useForm(
      {
        sku: "",
        name: "",
        description: "",
        category_id: "",
        tax_rate_id: "",
        unit: "unit",
        base_price: "",
        min_stock: "",
        is_active: "1",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.createProduct({
            p_sku: formValues.sku.trim() || null,
            p_name: formValues.name.trim(),
            p_description: formValues.description.trim(),
            p_category_id: formValues.category_id ? Number(formValues.category_id) : null,
            p_tax_rate_id: formValues.tax_rate_id ? Number(formValues.tax_rate_id) : null,
            p_unit: formValues.unit.trim() || null,
            p_base_price: formValues.base_price ? Number(formValues.base_price) : null,
            p_min_stock: formValues.min_stock ? Number(formValues.min_stock) : null,
            p_is_active: Number(formValues.is_active),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear el producto");
            helpers.setSubmitError(result?.message || "Error al crear producto");
            return;
          }

          toast.success(result?.message || "Producto creado correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear el producto. Verifica tu conexion."));
        }
      }
    );

  return (
    <FlowPageLayout title="Nuevo producto" subtitle="Crea productos terminados para venta, pedidos y produccion.">
      {submitError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Informacion del producto
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define nombre, clasificacion, precio y estado operativo.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormField
                name="sku"
                label="SKU"
                value={values.sku}
                error={errors.sku}
                touched={touched.sku}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="PAN-001"
                required
                helperText="Identificador unico del producto"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                name="name"
                label="Nombre"
                value={values.name}
                error={errors.name}
                touched={touched.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Pan integral"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                name="description"
                label="Descripcion"
                value={values.description}
                error={errors.description}
                touched={touched.description}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Pan de molde integral"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                select
                name="category_id"
                label="Categoria"
                value={values.category_id}
                error={errors.category_id}
                touched={touched.category_id}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loadingOptions}
                helperText={loadingOptions ? "Cargando categorias..." : ""}
              >
                <MenuItem value="">Sin categoria</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </FormField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                select
                name="tax_rate_id"
                label="Tasa de impuesto"
                value={values.tax_rate_id}
                error={errors.tax_rate_id}
                touched={touched.tax_rate_id}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loadingOptions}
                helperText={loadingOptions ? "Cargando tasas..." : ""}
              >
                <MenuItem value="">Sin impuesto</MenuItem>
                {taxRates.map((taxRate) => (
                  <MenuItem key={taxRate.id} value={taxRate.id}>
                    {taxRate.name} ({taxRate.rate_percent}%)
                  </MenuItem>
                ))}
              </FormField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                select
                name="unit"
                label="Unidad"
                value={values.unit}
                error={errors.unit}
                touched={touched.unit}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <MenuItem value="unit">Unidad</MenuItem>
                <MenuItem value="kg">Kilogramo</MenuItem>
                <MenuItem value="g">Gramo</MenuItem>
                <MenuItem value="lb">Libra</MenuItem>
              </FormField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                name="base_price"
                label="Precio base"
                type="number"
                value={values.base_price}
                error={errors.base_price}
                touched={touched.base_price}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0"
                inputProps={{ min: 0, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                name="min_stock"
                label="Stock minimo"
                type="number"
                value={values.min_stock}
                error={errors.min_stock}
                touched={touched.min_stock}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                select
                name="is_active"
                label="Estado"
                value={values.is_active}
                error={errors.is_active}
                touched={touched.is_active}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <MenuItem value="1">Activo</MenuItem>
                <MenuItem value="0">Inactivo</MenuItem>
              </FormField>
            </Grid>
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando producto...">
              Crear producto
            </AppButton>
            <AppButton type="button" variant="outlined" color="secondary" onClick={resetForm}>
              Limpiar formulario
            </AppButton>
          </Stack>
        </Stack>
      </Paper>
    </FlowPageLayout>
  );
};

export default NuevoProductoPage;
