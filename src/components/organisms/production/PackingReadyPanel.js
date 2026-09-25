import { Alert, Box, Chip, Grid, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AppButton from "@core/components/ui/AppButton";

const normalizeWholeNumberInput = (value, update) => {
  if (value === "" || /^\d+$/.test(value)) update(value);
};
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";

const damageOptions = [
  { value: "production", label: "Producción" },
  { value: "oven", label: "Horneo" },
  { value: "cut", label: "Corte" },
  { value: "packaging", label: "Empaque" },
];

const PackingReadyPanel = ({ canSelectPacker, clearPackingRow, createPackingReport, formatUnits, packers, packingForm, packingRows, savingPacking, selectedBatch, selectedItems, setPackingForm, today, totalDamaged, totalPacked, updatePackingRow }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2.5, justifyContent: "space-between", alignItems: { xs: "stretch", md: "flex-start" } }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{selectedBatch ? `Registrar conteo · Lote #${selectedBatch.production_batch_id}` : "Registrar conteo"}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedBatch ? `${selectedBatch.recipe_name || "Producción"} · ${String(selectedBatch.produced_date || "").split("T")[0]} · ${selectedBatch.branch_name || "Sucursal"}` : "Selecciona un lote pendiente para comenzar."}</Typography>
        {selectedBatch ? <Typography variant="caption" color="text.secondary">Solo lo empacado entra a inventario. La cantidad del panadero permanece oculta.</Typography> : null}
      </Box>
      {selectedBatch ? <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}><Chip label={`${formatUnits(totalPacked)} a inventario`} color="success" variant="outlined" /><Chip label={`${formatUnits(totalDamaged)} dañados`} color="error" variant="outlined" /></Stack> : null}
    </Stack>

    <Grid container spacing={2} sx={{ alignItems: "flex-start", mb: 2 }}>
      <Grid item xs={12} md={4}><TextField select fullWidth disabled={!canSelectPacker} label="Contador / empaquetador" value={packingForm.packerId} onChange={(event) => setPackingForm((current) => ({ ...current, packerId: event.target.value }))} helperText={canSelectPacker ? "Puedes registrar por otro empaquetador activo." : "El conteo quedará registrado a tu nombre."}>{packers.map((employee) => <MenuItem key={employee.id} value={String(employee.id)}>{employee.full_name || employee.username || `Empleado ${employee.id}`}</MenuItem>)}</TextField></Grid>
      <Grid item xs={12} md={3}><Tooltip title="Fecha en la que se realizó el empaque" arrow><Box><BalanceDatePicker label="Fecha de empaque" value={packingForm.packedDate} maxDate={today} onChange={(value) => setPackingForm((current) => ({ ...current, packedDate: value }))} fullWidth /></Box></Tooltip></Grid>
      <Grid item xs={12} md={5}><Tooltip title="Observación general opcional del lote" arrow><TextField fullWidth label="Notas del empaque" value={packingForm.notes} onChange={(event) => setPackingForm((current) => ({ ...current, notes: event.target.value }))} /></Tooltip></Grid>
    </Grid>

    {!selectedBatch ? <Alert severity="info">Selecciona un lote pendiente para registrar su empaque.</Alert> : null}
    {selectedBatch && selectedItems.length === 0 ? <Alert severity="info">Este lote no tiene productos para empacar.</Alert> : null}

    <Grid container spacing={1.5}>
      {selectedItems.map((item) => {
        const key = item.production_batch_output_id;
        const row = packingRows[key] || {};
        const damages = row.damages || [];
        const packedQty = Number(row.packed_quantity || 0);
        const damagedQty = damages.reduce((total, damage) => total + Number(damage.quantity || 0), 0);
        const hasMovement = packedQty > 0 || damagedQty > 0;
        const addDamage = () => updatePackingRow(key, { damages: [...damages, { id: `${Date.now()}-${damages.length}`, quantity: "", reason: "packaging", reason_label: "Empaque", notes: "" }] });
        const updateDamage = (id, values) => updatePackingRow(key, { damages: damages.map((damage) => damage.id === id ? { ...damage, ...values } : damage) });
        const removeDamage = (id) => updatePackingRow(key, { damages: damages.filter((damage) => damage.id !== id) });

        return <Grid item xs={12} md={6} key={key}><Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, height: "100%", borderColor: hasMovement ? "secondary.main" : "divider", bgcolor: hasMovement ? "rgba(216, 88, 30, 0.04)" : "background.paper" }}><Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}><Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 900 }} noWrap>{item.product_name || `Producto ${item.product_id}`}</Typography><Typography variant="body2" color="text.secondary">{item.product_sku || "Sin SKU"}</Typography></Box><AppButton color="inherit" onClick={() => clearPackingRow(item)} sx={{ minHeight: 34, px: 1.5, fontSize: 12 }}>Limpiar</AppButton></Stack>
          <TextField type="number" fullWidth label="Conteo" value={row.packed_quantity || ""} onChange={(event) => normalizeWholeNumberInput(event.target.value, (value) => updatePackingRow(key, { packed_quantity: value }))} inputProps={{ min: 0, step: 1, inputMode: "numeric" }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}><Box><Typography sx={{ fontWeight: 900 }}>Daños</Typography><Typography variant="caption" color="text.secondary">Cada daño debe tener cantidad y motivo.</Typography></Box><Tooltip title="Añade otro daño con su cantidad y motivo" arrow><span><AppButton color="secondary" variant="outlined" onClick={addDamage} startIcon={<AddRoundedIcon />} sx={{ minHeight: 38 }}>Agregar daño</AppButton></span></Tooltip></Stack>
          {damages.map((damage, index) => <Grid container spacing={1} key={damage.id} alignItems="center">
            <Grid item xs={12} sm={3}><Tooltip title="Unidades que no pueden ingresar al inventario" arrow><TextField type="number" fullWidth label={`Cantidad dañada ${index + 1}`} value={damage.quantity} onChange={(event) => normalizeWholeNumberInput(event.target.value, (value) => updateDamage(damage.id, { quantity: value }))} inputProps={{ min: 1, step: 1, inputMode: "numeric" }} /></Tooltip></Grid>
            <Grid item xs={10} sm={4}><TextField select fullWidth label="Motivo" value={damage.reason} onChange={(event) => { const selected = damageOptions.find((option) => option.value === event.target.value); updateDamage(damage.id, { reason: event.target.value, reason_label: selected?.label || event.target.value }); }}>{damageOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={10} sm={4}><Tooltip title="Detalle opcional para la auditoría" arrow><TextField fullWidth label="Detalle opcional" value={damage.notes || ""} onChange={(event) => updateDamage(damage.id, { notes: event.target.value })} /></Tooltip></Grid>
            <Grid item xs={2} sm={1}><Tooltip title="Eliminar este daño" arrow><IconButton color="error" onClick={() => removeDamage(damage.id)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip></Grid>
          </Grid>)}
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Conteo: {formatUnits(packedQty)} · Dañados: {formatUnits(damagedQty)}</Typography><Chip size="small" color={hasMovement ? "secondary" : "default"} label={hasMovement ? "Listo para registrar" : "Sin registrar"} variant={hasMovement ? "filled" : "outlined"} /></Stack>
        </Stack></Paper></Grid>;
      })}
    </Grid>

    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}><Typography variant="body2" color="text.secondary">El conteo se guarda de forma independiente. Los daños quedan separados y no entran a inventario.</Typography><Tooltip title="Guarda el conteo de máquina y actualiza inventario solo con lo empacado" arrow><span><AppButton color="secondary" onClick={createPackingReport} disabled={savingPacking || !selectedBatch}>{savingPacking ? "Registrando..." : "Registrar conteo"}</AppButton></span></Tooltip></Stack>
  </Paper>
);

export default PackingReadyPanel;
