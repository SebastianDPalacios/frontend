import { Box, Grid, MenuItem, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import FormField from "@core/components/ui/FormField";
import ColombianCurrencyField from "components/atoms/ColombianCurrencyField";

const RawMaterialCreateForm = ({
  values,
  errors,
  touched,
  isSubmitting,
  categories,
  suppliers,
  loadingOptions,
  unitOptions,
  purchaseUnitOptions,
  unitHelperText,
  onSubmit,
  onChange,
  onBlur,
  onCostCalculatorChange,
  onReset,
  getUnitCostLabel,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
    <Stack spacing={3} component="form" onSubmit={onSubmit}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Informacion del insumo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Define proveedor, unidad de medida, costo y stock minimo.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormField
            name="name"
            label="Nombre"
            value={values.name}
            error={errors.name}
            touched={touched.name}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Harina de trigo"
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormField
            name="description"
            label="Descripcion"
            value={values.description}
            error={errors.description}
            touched={touched.description}
            onChange={onChange}
            onBlur={onBlur}
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
            onChange={onChange}
            onBlur={onBlur}
            disabled={loadingOptions}
            helperText={loadingOptions ? "Cargando categorias..." : "Obligatoria"}
            required
          >
            <MenuItem value="">Selecciona una categoria</MenuItem>
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
            onChange={onChange}
            onBlur={onBlur}
            disabled={loadingOptions}
            helperText={loadingOptions ? "Cargando proveedores..." : "Opcional; solo se muestran proveedores activos"}
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
            onChange={onCostCalculatorChange}
            onBlur={onBlur}
            helperText={unitHelperText}
          >
            {unitOptions.map((unit) => (
              <MenuItem key={unit.value} value={unit.value}>
                {unit.label}
              </MenuItem>
            ))}
          </FormField>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Costo de compra</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Escribe como lo compras. Ejemplo: 50 kilos por $150.000 calcula $3 por gramo.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormField
                  name="purchase_package_name"
                  label="Presentacion"
                  value={values.purchase_package_name}
                  error={errors.purchase_package_name}
                  touched={touched.purchase_package_name}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder={values.unit === "ml" ? "Garrafa" : "Bulto"}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormField
                  name="package_quantity"
                  label="Cantidad del empaque"
                  type="number"
                  value={values.package_quantity}
                  error={errors.package_quantity}
                  touched={touched.package_quantity}
                  onChange={onCostCalculatorChange}
                  onBlur={onBlur}
                  placeholder={values.unit === "ml" ? "5" : "50"}
                  inputProps={{ min: 0, step: "0.001" }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormField
                  select
                  name="package_unit"
                  label="Unidad del empaque"
                  value={values.package_unit}
                  error={errors.package_unit}
                  touched={touched.package_unit}
                  onChange={onCostCalculatorChange}
                  onBlur={onBlur}
                >
                  {purchaseUnitOptions[values.unit].map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </FormField>
              </Grid>
              <Grid item xs={12} md={3}>
                <ColombianCurrencyField
                  name="package_cost"
                  label="Costo total del empaque"
                  value={values.package_cost}
                  error={errors.package_cost}
                  touched={touched.package_cost}
                  onChange={onCostCalculatorChange}
                  onBlur={onBlur}
                  placeholder="150000"
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <ColombianCurrencyField
            name="unit_cost"
            label={getUnitCostLabel(values.unit)}
            value={values.unit_cost}
            error={errors.unit_cost}
            touched={touched.unit_cost}
            onChange={onChange}
            onBlur={onBlur}
            decimalScale={6}
            placeholder="0"
            helperText="Este valor se guarda internamente para costear recetas."
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
            onChange={onChange}
            onBlur={onBlur}
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
            onChange={onChange}
            onBlur={onBlur}
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
        <AppButton type="button" variant="outlined" color="secondary" onClick={onReset}>
          Limpiar formulario
        </AppButton>
      </Stack>
    </Stack>
  </Paper>
);

export default RawMaterialCreateForm;
