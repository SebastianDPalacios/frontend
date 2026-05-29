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

const unitOptions = [
  { value: "kg", label: "Kilogramo" },
  { value: "g", label: "Gramo" },
  { value: "lb", label: "Libra" },
  { value: "oz", label: "Onza" },
  { value: "unit", label: "Unidad" },
  { value: "lt", label: "Litro" },
  { value: "ml", label: "Mililitro" },
];

const NuevaMateriaPrimaPage = () => {
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);

      try {
        const [categoriesResult, suppliersResult] = await Promise.all([
          catalogService.getRawMaterialCategories({ onlyActive: 1 }),
          catalogService.getSuppliers({ onlyActive: 1 }),
        ]);

        setCategories(normalizeList(categoriesResult?.data ?? categoriesResult));
        setSuppliers(normalizeList(suppliersResult?.data ?? suppliersResult));
      } catch (error) {
        setCategories([]);
        setSuppliers([]);
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
        supplier_id: "",
        unit: "kg",
        unit_cost: "",
        min_stock: "",
        is_active: "1",
      },
      async (formValues, helpers) => {
        try {
          const result = await catalogService.createRawMaterial({
            p_sku: formValues.sku.trim() || null,
            p_name: formValues.name.trim(),
            p_description: formValues.description.trim(),
            p_category_id: formValues.category_id ? Number(formValues.category_id) : null,
            p_supplier_id: formValues.supplier_id ? Number(formValues.supplier_id) : null,
            p_unit: formValues.unit.trim() || null,
            p_unit_cost: formValues.unit_cost ? Number(formValues.unit_cost) : null,
            p_min_stock: formValues.min_stock ? Number(formValues.min_stock) : null,
            p_is_active: Number(formValues.is_active),
          });

          if (result?.code !== 1) {
            toast.error(result?.message || "No se pudo crear la materia prima");
            helpers.setSubmitError(result?.message || "Error al crear la materia prima");
            return;
          }

          toast.success(result?.message || "Materia prima creada correctamente");
          helpers.resetForm();
        } catch (requestError) {
          helpers.setSubmitError(getApiErrorMessage(requestError, "Error de red al crear la materia prima. Verifica tu conexion."));
        }
      }
    );

  return (
    <FlowPageLayout title="Nueva materia prima" subtitle="Registra insumos para recetas, compras y control de inventario.">
      {submitError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Informacion del insumo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define proveedor, unidad de medida, costo y stock minimo.
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
                placeholder="MP-001"
                helperText="Codigo unico para identificar la materia prima"
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
                placeholder="Harina de trigo"
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
                placeholder="Harina para panaderia"
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
                helperText={loadingOptions ? "Cargando categorias..." : "Opcional"}
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
                name="supplier_id"
                label="Proveedor"
                value={values.supplier_id}
                error={errors.supplier_id}
                touched={touched.supplier_id}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loadingOptions}
                helperText={loadingOptions ? "Cargando proveedores..." : "Opcional"}
              >
                <MenuItem value="">Sin proveedor</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name || supplier.description || "Proveedor"}
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
                {unitOptions.map((unit) => (
                  <MenuItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </MenuItem>
                ))}
              </FormField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormField
                name="unit_cost"
                label="Costo unitario"
                type="number"
                value={values.unit_cost}
                error={errors.unit_cost}
                touched={touched.unit_cost}
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
            <AppButton type="submit" color="secondary" loading={isSubmitting} loadingLabel="Creando materia prima...">
              Crear materia prima
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

export default NuevaMateriaPrimaPage;
