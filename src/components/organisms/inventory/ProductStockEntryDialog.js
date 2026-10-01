import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import AppButton from "@core/components/ui/AppButton";
import inventoryService from "services/inventory/inventory-service";
import { formatInventoryQuantity, getDisplayName } from "views/modules/flow-utils";

const MAX_QUANTITY = 99999999999;

const ProductStockEntryDialog = ({ products, product, branchId, open, onClose, onSaved }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementType, setMovementType] = useState("adjustment_in");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedProduct(product || null); setMovementType("adjustment_in"); setQuantity(""); setNotes(""); setError("");
  }, [open, product]);

  const currentStock = Number(selectedProduct?.quantity_on_hand || 0);
  const resultingStock = useMemo(() => {
    const amount = Number(quantity);
    const change = Number.isFinite(amount) && amount > 0 ? amount : 0;
    if (movementType === "zero_stock") return 0;
    return movementType === "adjustment_out" ? Math.max(currentStock - change, 0) : currentStock + change;
  }, [currentStock, movementType, quantity]);

  const choose = (type) => { setMovementType(type); setQuantity(""); setError(""); };
  const handleClose = () => { if (!saving) onClose(); };
  const handleSubmit = async () => {
    if (saving) return;
    const isZeroing = movementType === "zero_stock";
    const amount = isZeroing ? currentStock : Number(quantity);
    if (!branchId) return setError("No hay una sucursal seleccionada.");
    if (!selectedProduct) return setError("Selecciona un producto.");
    if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_QUANTITY) return setError(isZeroing ? "Este producto ya se encuentra sin stock." : "Ingresa una cantidad entera mayor que cero.");
    if (movementType === "adjustment_out" && amount > currentStock) return setError("La salida no puede superar la cantidad disponible.");
    setSaving(true); setError("");
    try {
      const common = { p_branch_id: Number(branchId), p_item_type: "product", p_item_id: Number(selectedProduct.id), p_notes: notes.trim() || null };
      const response = isZeroing
        ? await inventoryService.zeroStock(common)
        : await inventoryService.applyMovement({ ...common, p_movement_type: movementType, p_quantity: amount, p_unit_cost: null, p_reference_type: "manual", p_reference_id: null });
      if (response?.code !== 1) return setError(response?.message || "No se pudo registrar el movimiento.");
      onSaved({ movementType });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Error de red al registrar el movimiento.");
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, m: 1.5 } }}>
    <DialogTitle sx={{ pb: 1 }}><Typography variant="h5" sx={{ fontWeight: 900 }}>Cargar movimiento</Typography><Typography variant="body2" color="text.secondary">Actualiza la existencia del producto terminado.</Typography></DialogTitle>
    <DialogContent sx={{ pt: "12px !important" }}><Stack spacing={2.25}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Autocomplete options={products} value={selectedProduct} onChange={(_, value) => { setSelectedProduct(value); setError(""); }} getOptionLabel={(option) => `${getDisplayName(option)}${option.sku ? ` - ${option.sku}` : ""}`} isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)} renderInput={(params) => <TextField {...params} label="Buscar producto" placeholder="Nombre o código" />} />
      {selectedProduct ? <>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Button fullWidth variant={movementType === "adjustment_in" ? "contained" : "outlined"} color="success" startIcon={<AddCircleOutlineIcon />} onClick={() => choose("adjustment_in")}>Agregar stock</Button>
          <Button fullWidth variant={movementType === "adjustment_out" ? "contained" : "outlined"} color="error" startIcon={<RemoveCircleOutlineIcon />} onClick={() => choose("adjustment_out")}>Retirar stock</Button>
          <Button fullWidth variant={movementType === "zero_stock" ? "contained" : "outlined"} color="error" startIcon={<DeleteSweepOutlinedIcon />} onClick={() => choose("zero_stock")}>Eliminar stock</Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {movementType === "zero_stock" ? <Alert severity="warning" sx={{ flex: 1 }}>Se retirarán las {formatInventoryQuantity(currentStock, "unit")} unidades disponibles. El producto y su historial se conservarán.</Alert> : <TextField autoFocus fullWidth type="number" label={`Cantidad a ${movementType === "adjustment_out" ? "retirar" : "agregar"} (Unidades)`} value={quantity} onChange={(event) => { setQuantity(event.target.value); setError(""); }} inputProps={{ min: 1, max: MAX_QUANTITY, step: 1, inputMode: "numeric" }} />}
          <Stack sx={{ minWidth: 180, justifyContent: "center", p: 1.5, borderRadius: 2.5, bgcolor: "background.default" }}><Typography variant="caption" color="text.secondary">Stock resultante</Typography><Typography sx={{ fontWeight: 900 }}>{formatInventoryQuantity(resultingStock, "unit")} Unidades</Typography></Stack>
        </Stack>
      </> : null}
      <TextField fullWidth multiline minRows={2} label="Detalle opcional" placeholder="Puedes indicar el origen o motivo del movimiento" value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 250))} helperText={notes ? `${notes.length}/250 caracteres` : "No es obligatorio"} />
    </Stack></DialogContent>
    <DialogActions sx={{ p: 2 }}><AppButton variant="outlined" color="secondary" onClick={handleClose} disabled={saving}>Cancelar</AppButton><AppButton color={movementType === "zero_stock" ? "error" : "secondary"} onClick={handleSubmit} disabled={saving}>{saving ? "Guardando..." : "Guardar movimiento"}</AppButton></DialogActions>
  </Dialog>;
};

export default ProductStockEntryDialog;
