import { useEffect, useState } from "react";
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import inventoryService from "services/inventory/inventory-service";
import { getDisplayName, isIntegerUnit } from "views/modules/flow-utils";

const MAX_QUANTITY = 99999999999.999;

const RawMaterialMovementDialog = ({ material, branchId, open, onClose, onSaved }) => {
  const [movementType, setMovementType] = useState("adjustment_in");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMovementType("adjustment_in");
    setQuantity("");
    setNotes("");
    setError("");
  }, [material?.id, open]);

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async () => {
    if (saving) return;

    const parsedQuantity = Number(quantity);
    if (!branchId) {
      setError("No hay una sucursal seleccionada.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > MAX_QUANTITY) {
      setError("Ingresa una cantidad valida mayor que cero.");
      return;
    }
    if (isIntegerUnit(material?.unit) && !Number.isInteger(parsedQuantity)) {
      setError("Esta materia prima solo permite cantidades enteras.");
      return;
    }
    if (movementType === "adjustment_out" && parsedQuantity > Number(material?.quantity_on_hand || 0)) {
      setError("La salida no puede superar la cantidad disponible.");
      return;
    }
    if (notes.trim().length < 5) {
      setError("Escribe un motivo de al menos 5 caracteres.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await inventoryService.applyMovement({
        p_branch_id: Number(branchId),
        p_item_type: "raw_material",
        p_item_id: Number(material.id),
        p_movement_type: movementType,
        p_quantity: parsedQuantity,
        p_unit_cost: null,
        p_reference_type: "manual",
        p_reference_id: null,
        p_notes: notes.trim(),
      });

      if (response?.code !== 1) {
        setError(response?.message || "No se pudo registrar el movimiento.");
        return;
      }

      onSaved({ movementType, quantity: parsedQuantity });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Error de red al registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, m: 1.5 } }}>
      <DialogTitle sx={{ pb: 1 }}>Cargar movimiento</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {material ? getDisplayName(material) : "Materia prima"}
            </Typography>
            <Typography color="text.secondary">
              Disponible: {Number(material?.quantity_on_hand || 0).toLocaleString("es-CO")} {material?.unit || ""}
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Movimiento"
                value={movementType}
                onChange={(event) => setMovementType(event.target.value)}
              >
                <MenuItem value="adjustment_in">Entrada de stock</MenuItem>
                <MenuItem value="adjustment_out">Salida de stock</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                fullWidth
                type="number"
                label={`Cantidad (${material?.unit || "unidad"})`}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputProps={{ min: 0, max: MAX_QUANTITY, step: isIntegerUnit(material?.unit) ? 1 : 0.001 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Motivo del movimiento"
                placeholder="Ejemplo: inventario inicial, merma o correccion fisica"
                value={notes}
                onChange={(event) => setNotes(event.target.value.slice(0, 250))}
                helperText={`${notes.length}/250 caracteres`}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <AppButton variant="outlined" color="secondary" onClick={handleClose} disabled={saving}>
          Cancelar
        </AppButton>
        <AppButton color="secondary" onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : "Guardar movimiento"}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default RawMaterialMovementDialog;
