import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import AppButton from "@core/components/ui/AppButton";
import inventoryService from "services/inventory/inventory-service";
import { formatInventoryQuantity, getDisplayName, isIntegerUnit } from "views/modules/flow-utils";
import { normalizeRawMaterialEntryQuantity } from "utils/raw-material-entry-rounding";

const MAX_QUANTITY = 99999999999.999;

const RawMaterialMovementDialog = ({ material, branchId, open, onClose, onSaved }) => {
  const [movementType, setMovementType] = useState("adjustment_in");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMovementType("adjustment_in"); setQuantity(""); setNotes(""); setError("");
  }, [material?.id, open]);

  const choose = (type) => { setMovementType(type); setQuantity(""); setError(""); };
  const handleClose = () => { if (!saving) onClose(); };

  const handleSubmit = async () => {
    if (saving) return;
    const isZeroing = movementType === "zero_stock";
    const amount = isZeroing ? Number(material?.quantity_on_hand || 0) : Number(quantity);
    if (!branchId) return setError("No hay una sucursal seleccionada.");
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_QUANTITY) return setError(isZeroing ? "Esta materia prima ya se encuentra sin stock." : "Ingresa una cantidad válida mayor que cero.");
    if (!isZeroing && isIntegerUnit(material?.unit) && !Number.isInteger(amount)) return setError("Esta materia prima solo permite cantidades enteras.");
    if (movementType === "adjustment_out" && amount > Number(material?.quantity_on_hand || 0)) return setError("La salida no puede superar la cantidad disponible.");
    setSaving(true); setError("");
    try {
      const common = { p_branch_id: Number(branchId), p_item_type: "raw_material", p_item_id: Number(material.id), p_notes: notes.trim() || null };
      const response = isZeroing
        ? await inventoryService.zeroStock(common)
        : await inventoryService.applyMovement({ ...common, p_movement_type: movementType, p_quantity: amount, p_unit_cost: null, p_reference_type: "manual", p_reference_id: null });
      if (response?.code !== 1) return setError(response?.message || "No se pudo registrar el movimiento.");
      onSaved({ movementType, quantity: response?.data?.normalized_quantity ?? amount });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Error de red al registrar el movimiento.");
    } finally { setSaving(false); }
  };

  const currentStock = Number(material?.quantity_on_hand || 0);
  const amount = Number(quantity);
  const stockChange = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const normalizedChange = movementType === "adjustment_in" ? normalizeRawMaterialEntryQuantity(stockChange) : stockChange;
  const resultingStock = movementType === "zero_stock" ? 0 : movementType === "adjustment_out" ? currentStock - stockChange : currentStock + normalizedChange;
  const unit = material?.unit || "unidad";

  return <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, m: 1.5, overflow: "hidden" } }}>
    <DialogTitle sx={{ p: { xs: 2.5, sm: 3 }, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: "secondary.main", color: "secondary.contrastText" }}><Inventory2OutlinedIcon /></Box>
        <Box><Typography variant="h5" sx={{ fontWeight: 900 }}>Cargar movimiento</Typography><Typography variant="body2" color="text.secondary">Actualiza la existencia de esta materia prima.</Typography></Box>
      </Stack>
    </DialogTitle>
    <DialogContent sx={{ p: { xs: 2.5, sm: 3 } }}><Stack spacing={2.5}>
      <Box sx={{ p: 2, borderRadius: 3, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
          <Box><Typography variant="h6" sx={{ fontWeight: 900 }}>{material ? getDisplayName(material) : "Materia prima"}</Typography><Typography variant="body2" color="text.secondary">Existencia actual</Typography></Box>
          <Chip label={`${formatInventoryQuantity(currentStock, unit)} ${unit}`} variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
        </Stack>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box><Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>¿Qué deseas hacer?</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Button fullWidth variant={movementType === "adjustment_in" ? "contained" : "outlined"} color="success" startIcon={<AddCircleOutlineIcon />} onClick={() => choose("adjustment_in")} sx={{ py: 1.25 }}>Agregar stock</Button>
          <Button fullWidth variant={movementType === "adjustment_out" ? "contained" : "outlined"} color="error" startIcon={<RemoveCircleOutlineIcon />} onClick={() => choose("adjustment_out")} sx={{ py: 1.25 }}>Retirar stock</Button>
          <Button fullWidth variant={movementType === "zero_stock" ? "contained" : "outlined"} color="error" startIcon={<DeleteSweepOutlinedIcon />} onClick={() => choose("zero_stock")} sx={{ py: 1.25 }}>Eliminar stock</Button>
        </Stack>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        {movementType === "zero_stock" ? <Alert severity="warning" sx={{ flex: 1 }}>Se retirará toda la existencia disponible. El elemento y su historial se conservarán.</Alert> : <TextField autoFocus fullWidth type="number" label={`Cantidad (${unit})`} value={quantity} onChange={(event) => { setQuantity(event.target.value); setError(""); }} inputProps={{ min: 0, max: MAX_QUANTITY, step: isIntegerUnit(material?.unit) ? 1 : 0.001 }} />}
        <Box sx={{ minWidth: { sm: 180 }, px: 2, py: 1.25, borderRadius: 2.5, bgcolor: "background.default" }}><Typography variant="caption" color="text.secondary">Stock resultante</Typography><Typography sx={{ fontWeight: 900 }}>{formatInventoryQuantity(Math.max(resultingStock, 0), unit)} {unit}</Typography></Box>
      </Stack>
      {movementType === "adjustment_in" && stockChange > 0 ? <Alert severity="info">Valor ingresado: {formatInventoryQuantity(stockChange, unit)} {unit}. Entrará al inventario: {formatInventoryQuantity(normalizedChange, unit)} {unit}.</Alert> : null}
      <TextField fullWidth multiline minRows={2} label="Detalle opcional" placeholder="Puedes indicar el origen o motivo del movimiento" value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 250))} helperText={notes ? `${notes.length}/250 caracteres` : "No es obligatorio"} />
    </Stack></DialogContent>
    <DialogActions sx={{ p: { xs: 2.5, sm: 3 }, pt: 0, gap: 1 }}><AppButton variant="outlined" color="secondary" onClick={handleClose} disabled={saving}>Cancelar</AppButton><AppButton color={movementType === "zero_stock" ? "error" : "secondary"} onClick={handleSubmit} disabled={saving}>{saving ? "Guardando..." : "Guardar movimiento"}</AppButton></DialogActions>
  </Dialog>;
};

export default RawMaterialMovementDialog;
