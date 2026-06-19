import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import ColombianCurrencyField from "components/atoms/ColombianCurrencyField";

const RawMaterialEditDialog = ({
  open,
  saving,
  form,
  categories,
  suppliers,
  unitOptions,
  purchaseUnitOptions,
  unitHelperText,
  onClose,
  onUpdateField,
  onSave,
  getDefaultPackageName,
  getUnitCostLabel,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>Editar materia prima</DialogTitle>
    <DialogContent>
      <Grid container spacing={2} sx={{ pt: 1 }}>
        <Grid item xs={12} md={4}>
          <TextField label="SKU" value={form.sku} fullWidth disabled helperText="El codigo no se cambia desde edicion." />
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField label="Nombre" value={form.name} onChange={onUpdateField("name")} fullWidth required />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Descripcion" value={form.description} onChange={onUpdateField("description")} fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label="Categoria" value={form.category_id} onChange={onUpdateField("category_id")} select fullWidth required>
            {categories.map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label="Proveedor" value={form.supplier_id} onChange={onUpdateField("supplier_id")} select fullWidth>
            <MenuItem value="">Sin proveedor</MenuItem>
            {suppliers.map((supplier) => (
              <MenuItem key={supplier.id} value={String(supplier.id)}>
                {supplier.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField label="Unidad" value={form.unit} onChange={onUpdateField("unit")} select fullWidth helperText={unitHelperText}>
            {unitOptions.map((unit) => (
              <MenuItem key={unit.value} value={unit.value}>
                {unit.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Costo de compra</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Escribe como lo compras. Ejemplo: 50 kilos por $150.000 calcula $3 por gramo.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Presentacion"
                  value={form.purchase_package_name}
                  onChange={onUpdateField("purchase_package_name")}
                  fullWidth
                  placeholder={form.unit === "ml" ? "Garrafa" : "Bulto"}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Cantidad del empaque"
                  value={form.package_quantity}
                  onChange={onUpdateField("package_quantity")}
                  type="number"
                  fullWidth
                  placeholder={form.unit === "ml" ? "5" : "50"}
                  inputProps={{ min: 0, step: "0.001" }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Unidad del empaque" value={form.package_unit} onChange={onUpdateField("package_unit")} select fullWidth>
                  {purchaseUnitOptions[form.unit].map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <ColombianCurrencyField
                  label="Costo total del empaque"
                  value={form.package_cost}
                  onChange={onUpdateField("package_cost")}
                  placeholder="150000"
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <ColombianCurrencyField
            label={getUnitCostLabel(form.unit)}
            value={form.unit_cost}
            onChange={onUpdateField("unit_cost")}
            decimalScale={6}
            helperText="Este valor se guarda internamente para costear recetas."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Stock minimo"
            value={form.min_stock}
            onChange={onUpdateField("min_stock")}
            type="number"
            fullWidth
            inputProps={{ min: 0, step: "0.001" }}
          />
        </Grid>
        <Grid item xs={12}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Switch checked={Number(form.is_active) === 1} onChange={onUpdateField("is_active")} />
            <Typography sx={{ fontWeight: 800 }}>{Number(form.is_active) === 1 ? "Activa" : "Inactiva"}</Typography>
          </Stack>
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 3 }}>
      <AppButton variant="outlined" color="secondary" onClick={onClose} disabled={saving}>
        Cancelar
      </AppButton>
      <AppButton color="secondary" onClick={onSave} loading={saving} loadingLabel="Guardando...">
        Guardar cambios
      </AppButton>
    </DialogActions>
  </Dialog>
);

export default RawMaterialEditDialog;
