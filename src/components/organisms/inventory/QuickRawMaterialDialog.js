import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const QuickRawMaterialDialog = ({
  open,
  saving,
  quickMaterial,
  categories,
  purchaseUnitOptions,
  onClose,
  onUpdate,
  onCreate,
}) => (
  <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md">
    <DialogTitle>Crear materia prima para esta factura</DialogTitle>
    <DialogContent>
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Usa esto solo cuando la materia prima no existe. Se crea activa, con el proveedor de la factura y queda seleccionada en la linea.
        </Typography>

        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>Datos basicos</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <TextField
                  fullWidth
                  label="Nombre de la materia prima"
                  value={quickMaterial.name}
                  onChange={onUpdate("name")}
                  disabled={saving}
                  placeholder="Ej: Sal refinada"
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  select
                  fullWidth
                  label="Categoria"
                  value={quickMaterial.categoryId}
                  onChange={onUpdate("categoryId")}
                  disabled={saving}
                >
                  <MenuItem value="">Seleccionar categoria</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Descripcion"
                  value={quickMaterial.description}
                  onChange={onUpdate("description")}
                  disabled={saving}
                  placeholder="Opcional"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label={`Stock minimo (${quickMaterial.unit})`}
                  value={quickMaterial.minStock}
                  onChange={onUpdate("minStock")}
                  disabled={saving}
                  inputProps={{ min: 0, step: 0.001 }}
                />
              </Grid>
            </Grid>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: "background.default" }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>Como se compra</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Unidad base" value={quickMaterial.unit} onChange={onUpdate("unit")} disabled={saving}>
                  <MenuItem value="g">Gramo</MenuItem>
                  <MenuItem value="ml">Mililitro</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Presentacion"
                  value={quickMaterial.packageName}
                  onChange={onUpdate("packageName")}
                  disabled={saving}
                  placeholder={quickMaterial.unit === "ml" ? "Garrafa" : "Bulto"}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  value={quickMaterial.packageQuantity}
                  onChange={onUpdate("packageQuantity")}
                  disabled={saving}
                  inputProps={{ min: 0, step: 0.001 }}
                  placeholder={quickMaterial.unit === "ml" ? "20" : "25"}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Unidad" value={quickMaterial.packageUnit} onChange={onUpdate("packageUnit")} disabled={saving}>
                  {purchaseUnitOptions[quickMaterial.unit].map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Stack>
    </DialogContent>
    <DialogActions>
      <AppButton variant="outlined" color="secondary" onClick={onClose} disabled={saving}>
        Cancelar
      </AppButton>
      <AppButton color="secondary" onClick={onCreate} disabled={saving}>
        {saving ? "Creando..." : "Crear y seleccionar"}
      </AppButton>
    </DialogActions>
  </Dialog>
);

export default QuickRawMaterialDialog;
