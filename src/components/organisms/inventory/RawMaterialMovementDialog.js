import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AppButton from "@core/components/ui/AppButton";
import inventoryService from "services/inventory/inventory-service";
import { formatInventoryQuantity, getDisplayName, isIntegerUnit } from "views/modules/flow-utils";

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
        p_notes: notes.trim() || null,
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

  const currentStock = Number(material?.quantity_on_hand || 0);
  const parsedQuantity = Number(quantity);
  const stockChange = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;
  const resultingStock = movementType === "adjustment_out" ? currentStock - stockChange : currentStock + stockChange;
  const unit = material?.unit || "unidad";

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, m: 1.5, overflow: "hidden" } }}>
      <DialogTitle sx={{ p: { xs: 2.5, sm: 3 }, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: "secondary.main", color: "secondary.contrastText", flexShrink: 0 }}>
            <Inventory2OutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 900 }}>Cargar movimiento</Typography>
            <Typography variant="body2" color="text.secondary">Actualiza la existencia de esta materia prima.</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{material ? getDisplayName(material) : "Materia prima"}</Typography>
                <Typography variant="body2" color="text.secondary">Existencia actual</Typography>
              </Box>
              <Chip label={`${formatInventoryQuantity(currentStock, unit)} ${unit}`} variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
            </Stack>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>¿Qué deseas hacer?</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button fullWidth variant={movementType === "adjustment_in" ? "contained" : "outlined"} color="success" startIcon={<AddCircleOutlineIcon />} onClick={() => { setMovementType("adjustment_in"); setError(""); }} sx={{ py: 1.25 }}>Agregar stock</Button>
              <Button fullWidth variant={movementType === "adjustment_out" ? "contained" : "outlined"} color="error" startIcon={<RemoveCircleOutlineIcon />} onClick={() => { setMovementType("adjustment_out"); setError(""); }} sx={{ py: 1.25 }}>Retirar stock</Button>
            </Stack>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
            <TextField
              autoFocus
              fullWidth
              type="number"
              label={`Cantidad (${unit})`}
              value={quantity}
              onChange={(event) => { setQuantity(event.target.value); setError(""); }}
              inputProps={{ min: 0, max: MAX_QUANTITY, step: isIntegerUnit(material?.unit) ? 1 : 0.001 }}
            />
            <Box sx={{ minWidth: { sm: 180 }, px: 2, py: 1.25, borderRadius: 2.5, bgcolor: "background.default" }}>
              <Typography variant="caption" color="text.secondary">Stock resultante</Typography>
              <Typography sx={{ fontWeight: 900 }}>{formatInventoryQuantity(Math.max(resultingStock, 0), unit)} {unit}</Typography>
            </Box>
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Detalle opcional"
            placeholder="Puedes indicar el origen o motivo del movimiento"
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 250))}
            helperText={notes ? `${notes.length}/250 caracteres` : "No es obligatorio"}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: { xs: 2.5, sm: 3 }, pt: 0, gap: 1 }}>
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
