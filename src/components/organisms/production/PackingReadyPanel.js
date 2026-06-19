import { Alert, Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";

const PackingReadyPanel = ({
  clearPackingRow,
  createPackingReport,
  formatUnits,
  getPendingQty,
  markOutputReady,
  packers,
  packingForm,
  packingRows,
  savingPacking,
  selectedBatch,
  selectedItems,
  setPackingForm,
  totalDamaged,
  totalMissing,
  totalPacked,
  updatePackingRow,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        Registrar empaque del lote
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Marca los productos que ya salieron buenos. Lo listo entra a inventario de producto terminado; los daños quedan reportados.
      </Typography>
    </Stack>

    <Grid container spacing={2} sx={{ alignItems: "flex-start", mb: 2 }}>
      <Grid item xs={12} md={4}>
        <TextField
          select
          fullWidth
          label="Empaquetador"
          value={packingForm.packerId}
          onChange={(event) => setPackingForm((current) => ({ ...current, packerId: event.target.value }))}
        >
          {packers.map((employee) => (
            <MenuItem key={employee.id} value={String(employee.id)}>
              {employee.full_name || employee.username || `Empleado ${employee.id}`}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} md={3}>
        <BalanceDatePicker
          label="Fecha empaque"
          value={packingForm.packedDate}
          onChange={(value) => setPackingForm((current) => ({ ...current, packedDate: value }))}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={5}>
        <TextField
          fullWidth
          label="Notas de empaque"
          value={packingForm.notes}
          onChange={(event) => setPackingForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </Grid>
    </Grid>

    {!selectedBatch ? <Alert severity="info">Selecciona un lote pendiente para registrar su empaque.</Alert> : null}
    {selectedBatch && selectedItems.length === 0 ? <Alert severity="info">Este lote no tiene productos pendientes para registrar.</Alert> : null}

    <Grid container spacing={1.5}>
      {selectedItems.map((item) => {
        const key = item.production_batch_output_id;
        const row = packingRows[key] || {};
        const pendingQty = getPendingQty(item);
        const packedQty = Number(row.packed_quantity || 0);
        const damagedQty = Number(row.damaged_quantity || 0);
        const missingQty = Number(row.missing_quantity || 0);
        const rowTotal = packedQty + damagedQty + missingQty;
        const exceedsPending = rowTotal > pendingQty;
        const hasDamage = damagedQty > 0;
        const hasMissing = missingQty > 0;

        return (
          <Grid item xs={12} md={6} key={key}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                p: 1.5,
                height: "100%",
                borderColor: exceedsPending ? "error.main" : rowTotal > 0 ? "secondary.main" : "divider",
                bgcolor: rowTotal > 0 ? "rgba(216, 88, 30, 0.04)" : "background.paper",
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900 }} noWrap>
                      {item.product_name || `Producto ${item.product_id}`}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 0.75, gap: 0.75 }}>
                      <Chip size="small" label={`${formatUnits(pendingQty)} pendientes`} color="warning" variant="outlined" />
                      <Chip size="small" label={`${formatUnits(item.packed_quantity)} empacados previamente`} color="success" variant="outlined" />
                      {Number(item.direct_delivered_quantity || 0) > 0 ? (
                        <Chip size="small" label={`${formatUnits(item.direct_delivered_quantity)} vendidos directo`} color="info" variant="outlined" />
                      ) : null}
                      {Number(item.reserved_quantity || 0) > 0 ? (
                        <Chip size="small" label={`${formatUnits(item.reserved_quantity)} reservados`} color="warning" variant="outlined" />
                      ) : null}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
                    <AppButton
                      color="secondary"
                      onClick={() => markOutputReady(item)}
                      disabled={pendingQty <= 0}
                      sx={{ minHeight: 34, px: 1.5, fontSize: 12 }}
                    >
                      Empacar todo
                    </AppButton>
                    <AppButton color="inherit" onClick={() => clearPackingRow(item)} sx={{ minHeight: 34, px: 1.5, fontSize: 12 }}>
                      Limpiar
                    </AppButton>
                  </Stack>
                </Stack>

                <Grid container spacing={1.25}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Empacados"
                      value={row.packed_quantity || ""}
                      onChange={(event) => updatePackingRow(key, { packed_quantity: event.target.value })}
                      inputProps={{ min: 0, max: pendingQty, step: 0.001 }}
                      helperText="Bueno para vender"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Dañado"
                      value={row.damaged_quantity || ""}
                      onChange={(event) => updatePackingRow(key, { damaged_quantity: event.target.value })}
                      inputProps={{ min: 0, max: pendingQty, step: 0.001 }}
                      helperText={hasDamage ? "No entra a inventario" : "Opcional"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Faltante"
                      value={row.missing_quantity || ""}
                      onChange={(event) => updatePackingRow(key, { missing_quantity: event.target.value })}
                      inputProps={{ min: 0, max: pendingQty, step: 0.001 }}
                      helperText={hasMissing ? "Requiere explicación" : "Opcional"}
                    />
                  </Grid>
                  {hasDamage ? (
                    <Grid item xs={12} sm={5}>
                      <TextField
                        select
                        fullWidth
                        label="Motivo daño"
                        value={row.damage_reason || "packaging"}
                        onChange={(event) => updatePackingRow(key, { damage_reason: event.target.value })}
                      >
                        <MenuItem value="packaging">Empaque</MenuItem>
                        <MenuItem value="cut">Corte</MenuItem>
                      </TextField>
                    </Grid>
                  ) : null}
                  {hasMissing ? (
                    <Grid item xs={12} sm={5}>
                      <TextField
                        select
                        fullWidth
                        required
                        label="Motivo del faltante"
                        value={row.missing_reason || "count_difference"}
                        onChange={(event) => updatePackingRow(key, { missing_reason: event.target.value })}
                      >
                        <MenuItem value="count_difference">Diferencia de conteo</MenuItem>
                        <MenuItem value="handling_loss">Pérdida en manipulación</MenuItem>
                        <MenuItem value="suspected_theft">Posible extravío</MenuItem>
                        <MenuItem value="other">Otro</MenuItem>
                      </TextField>
                    </Grid>
                  ) : null}
                  <Grid item xs={12} sm={hasDamage && hasMissing ? 12 : hasDamage || hasMissing ? 7 : 12}>
                    <TextField
                      fullWidth
                      required={hasMissing}
                      label={hasMissing ? "Explicación del faltante" : "Notas"}
                      value={row.notes || ""}
                      onChange={(event) => updatePackingRow(key, { notes: event.target.value })}
                      error={hasMissing && !String(row.notes || "").trim()}
                      helperText={hasMissing && !String(row.notes || "").trim() ? "Explica qué ocurrió" : " "}
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color={exceedsPending ? "error.main" : "text.secondary"} sx={{ fontWeight: 800 }}>
                    Captura: {formatUnits(rowTotal)} / {formatUnits(pendingQty)}
                  </Typography>
                  {exceedsPending ? (
                    <Chip size="small" color="error" label="Supera pendiente" />
                  ) : rowTotal > 0 ? (
                    <Chip size="small" color="secondary" label="Listo para agregar" />
                  ) : (
                    <Chip size="small" label="Sin cambios" variant="outlined" />
                  )}
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        );
      })}
    </Grid>

    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ mt: 2, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
    >
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Chip label={`A registrar: ${formatUnits(totalPacked)} empacados`} color="success" variant="outlined" />
        <Chip label={`${formatUnits(totalMissing)} faltantes justificados`} color="warning" variant="outlined" />
        <Chip label={`${formatUnits(totalDamaged)} dañados`} color="error" variant="outlined" />
      </Stack>
      <AppButton color="secondary" onClick={createPackingReport} disabled={savingPacking || !selectedBatch}>
        {savingPacking ? "Registrando..." : "Registrar empaque"}
      </AppButton>
    </Stack>
  </Paper>
);

export default PackingReadyPanel;
