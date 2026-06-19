import {
  Button,
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
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";
import ColombianCurrencyField from "components/atoms/ColombianCurrencyField";

const PurchaseInvoiceDialog = ({
  open,
  creating,
  loading,
  suppliers,
  materials,
  newOrder,
  newOrderItems,
  onClose,
  onUpdateOrder,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onCreate,
  onOpenQuickMaterial,
  getDisplayName,
  getLineUnitOptions,
  getLinePurchaseData,
  formatNumber,
}) => (
  <Dialog open={open} onClose={() => !creating && onClose()} fullWidth maxWidth="lg">
    <DialogTitle>Registrar factura de proveedor</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Registra el numero de factura, proveedor y materias primas compradas. Al guardar se suma el stock.
        </Typography>
        <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Proveedor"
              value={newOrder.supplierId}
              onChange={(event) => onUpdateOrder({ supplierId: event.target.value })}
              disabled={creating || suppliers.length === 0}
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={String(supplier.id)}>
                  {getDisplayName(supplier)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Numero de factura"
              value={newOrder.invoiceNumber}
              onChange={(event) => onUpdateOrder({ invoiceNumber: event.target.value })}
              disabled={creating}
              placeholder="Ej: FV-12345"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <BalanceDatePicker
              fullWidth
              label="Fecha de compra"
              value={newOrder.orderDate}
              onChange={(nextDate) => onUpdateOrder({ orderDate: nextDate })}
              helperText=" "
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Notas"
              value={newOrder.notes}
              onChange={(event) => onUpdateOrder({ notes: event.target.value })}
              disabled={creating}
            />
          </Grid>
        </Grid>

        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
          >
            <Typography sx={{ fontWeight: 900 }}>Productos comprados</Typography>
            <Typography variant="body2" color="text.secondary">
              Si no existe, crealo rapido desde la linea.
            </Typography>
          </Stack>
          {newOrderItems.map((item, index) => {
            const material = materials.find((row) => String(row.id) === String(item.rawMaterialId));
            const unit = material?.unit || "g";
            const lineOptions = getLineUnitOptions(material);
            const purchaseData = getLinePurchaseData(item, material);

            return (
              <Paper key={`po-item-${index}`} variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: "background.default" }}>
                <Grid container spacing={1.5} sx={{ alignItems: "flex-start" }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Producto comprado"
                      value={item.rawMaterialId}
                      onChange={(event) => onUpdateItem(index, "rawMaterialId", event.target.value)}
                      disabled={creating}
                    >
                      <MenuItem value="">Seleccionar producto comprado</MenuItem>
                      {materials.map((materialOption) => (
                        <MenuItem key={materialOption.id} value={String(materialOption.id)}>
                          {getDisplayName(materialOption)}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      color="secondary"
                      size="small"
                      onClick={() => onOpenQuickMaterial(index)}
                      disabled={creating}
                      sx={{ mt: 0.5, px: 0, fontWeight: 800 }}
                    >
                      No existe? Crear materia prima
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Cantidad"
                      value={item.quantity}
                      onChange={(event) => onUpdateItem(index, "quantity", event.target.value)}
                      inputProps={{ min: 0, step: 0.001 }}
                      disabled={creating}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      select
                      fullWidth
                      label="Como viene"
                      value={item.purchaseUnit || lineOptions[0]?.value || ""}
                      onChange={(event) => onUpdateItem(index, "purchaseUnit", event.target.value)}
                      disabled={creating || !material}
                    >
                      {lineOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <ColombianCurrencyField
                      label="Costo total"
                      value={item.totalCost}
                      onChange={(event) => onUpdateItem(index, "totalCost", event.target.value)}
                      disabled={creating}
                    />
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <Typography variant="caption" color="text.secondary">
                      Entra
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      {formatNumber(purchaseData.baseQuantity, unit)} {unit}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <AppButton
                      variant="outlined"
                      color="secondary"
                      onClick={() => onRemoveItem(index)}
                      disabled={creating || newOrderItems.length === 1}
                    >
                      Quitar
                    </AppButton>
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </Stack>
        <AppButton variant="outlined" color="secondary" onClick={onAddItem} disabled={creating}>
          Agregar producto
        </AppButton>
      </Stack>
    </DialogContent>
    <DialogActions>
      <AppButton variant="outlined" color="secondary" onClick={onClose} disabled={creating}>
        Cancelar
      </AppButton>
      <AppButton color="secondary" onClick={onCreate} disabled={creating || loading}>
        {creating ? "Registrando..." : "Registrar factura y sumar stock"}
      </AppButton>
    </DialogActions>
  </Dialog>
);

export default PurchaseInvoiceDialog;
