import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import inventoryService from "services/inventory/inventory-service";
import { formatInventoryQuantity, getDisplayName, isIntegerUnit } from "views/modules/flow-utils";

const MAX_QUANTITY = 99999999999.999;

const ProductStockEntryDialog = ({ products, product, branchId, open, onClose, onSaved }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedProduct(product || null);
    setQuantity("");
    setNotes("");
    setError("");
  }, [open, product]);

  const resultingStock = useMemo(() => {
    const amount = Number(quantity);
    return Number(selectedProduct?.quantity_on_hand || 0) + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, [quantity, selectedProduct]);

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async () => {
    if (saving) return;

    const parsedQuantity = Number(quantity);
    if (!branchId) return setError("No hay una sucursal seleccionada.");
    if (!selectedProduct) return setError("Selecciona un producto.");
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > MAX_QUANTITY) {
      return setError("Ingresa una cantidad valida mayor que cero.");
    }
    if (isIntegerUnit(selectedProduct.unit) && !Number.isInteger(parsedQuantity)) {
      return setError("Este producto solo permite cantidades enteras.");
    }
    setSaving(true);
    setError("");
    try {
      const response = await inventoryService.applyMovement({
        p_branch_id: Number(branchId),
        p_item_type: "product",
        p_item_id: Number(selectedProduct.id),
        p_movement_type: "adjustment_in",
        p_quantity: parsedQuantity,
        p_unit_cost: null,
        p_reference_type: "manual",
        p_reference_id: null,
        p_notes: notes.trim() || "Entrada manual de stock",
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo registrar la entrada.");
        return;
      }
      onSaved();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Error de red al registrar la entrada.");
    } finally {
      setSaving(false);
    }
  };

  const unit = selectedProduct?.unit || "unit";

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, m: 1.5 } }}>
      <DialogTitle sx={{ pb: 1 }}>Agregar stock de producto</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Autocomplete
            options={products}
            value={selectedProduct}
            onChange={(_, value) => {
              setSelectedProduct(value);
              setError("");
            }}
            getOptionLabel={(option) => `${getDisplayName(option)}${option.sku ? ` - ${option.sku}` : ""}`}
            isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
            renderInput={(params) => <TextField {...params} label="Buscar producto" placeholder="Nombre o codigo" />}
          />

          {selectedProduct ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                autoFocus
                fullWidth
                type="number"
                label={`Cantidad a agregar (${unit})`}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputProps={{ min: 0, max: MAX_QUANTITY, step: isIntegerUnit(unit) ? 1 : 0.001 }}
              />
              <Stack sx={{ minWidth: 180, justifyContent: "center" }}>
                <Typography variant="caption" color="text.secondary">Stock resultante</Typography>
                <Typography sx={{ fontWeight: 900 }}>
                  {formatInventoryQuantity(resultingStock, unit)} {unit}
                </Typography>
              </Stack>
            </Stack>
          ) : null}

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Motivo de la entrada"
            placeholder="Opcional. Ejemplo: inventario inicial o entrada sin factura"
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 250))}
            helperText={`${notes.length}/250 caracteres`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <AppButton variant="outlined" color="secondary" onClick={handleClose} disabled={saving}>Cancelar</AppButton>
        <AppButton color="secondary" onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : "Guardar entrada"}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default ProductStockEntryDialog;
