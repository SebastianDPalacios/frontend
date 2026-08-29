import { Alert, Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import { BalanceDatePicker } from "@core/components/ui/BalancePeriodPickers";

const PackingReadyPanel = ({
  clearPackingRow,
  createPackingReport,
  formatUnits,
  markOutputReady,
  packers,
  packingForm,
  packingRows,
  savingPacking,
  selectedBatch,
  selectedItems,
  setPackingForm,
  totalCounted,
  totalDamaged,
  totalMissing,
  totalPacked,
  updatePackingRow,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ mb: 2.5, justifyContent: "space-between", alignItems: { xs: "stretch", md: "flex-start" } }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {selectedBatch ? `Registrar conteo · Lote #${selectedBatch.production_batch_id}` : "Registrar conteo y empaque"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {selectedBatch
            ? `${selectedBatch.recipe_name || "Produccion"} · ${String(selectedBatch.produced_date || "").split("T")[0]} · ${selectedBatch.branch_name || "Sucursal"}`
            : "Selecciona un lote pendiente para comenzar."}
        </Typography>
        {selectedBatch ? (
          <Typography variant="caption" color="text.secondary">
            {selectedItems.length} {selectedItems.length === 1 ? "producto" : "productos"}. Solo lo empacado entra a inventario.
          </Typography>
        ) : null}
      </Box>
      {selectedBatch ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          <Chip label={`${formatUnits(totalCounted)} contados`} color="info" variant="outlined" />
          <Chip label={`${formatUnits(totalPacked)} a inventario`} color="success" variant="outlined" />
          <Chip label={`${formatUnits(totalDamaged)} danados`} color="error" variant="outlined" />
          <Chip label={`${formatUnits(totalMissing)} faltantes`} color="warning" variant="outlined" />
        </Stack>
      ) : null}
    </Stack>

    <Grid container spacing={2} sx={{ alignItems: "flex-start", mb: 2 }}>
      <Grid item xs={12} md={4}>
        <TextField
          select
          fullWidth
          label="Contador / empaquetador"
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
          label="Fecha conteo"
          value={packingForm.packedDate}
          onChange={(value) => setPackingForm((current) => ({ ...current, packedDate: value }))}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={5}>
        <TextField
          fullWidth
          label="Notas del conteo"
          value={packingForm.notes}
          onChange={(event) => setPackingForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </Grid>
    </Grid>

    {!selectedBatch ? <Alert severity="info">Selecciona un lote pendiente para registrar su conteo.</Alert> : null}
    {selectedBatch && selectedItems.length === 0 ? <Alert severity="info">Este lote no tiene productos para contar.</Alert> : null}

    <Grid container spacing={1.5}>
      {selectedItems.map((item) => {
        const key = item.production_batch_output_id;
        const row = packingRows[key] || {};
        const countedQty = Number(row.counted_quantity || 0);
        const packedQty = Number(row.packed_quantity || 0);
        const damagedQty = Number(row.damaged_quantity || 0);
        const missingQty = Number(row.missing_quantity || 0);
        const controlledQty = packedQty + damagedQty;
        const exceedsCounted = countedQty > 0 && controlledQty > countedQty;
        const hasDamage = damagedQty > 0;
        const hasMissing = missingQty > 0;
        const hasMovement = countedQty > 0 || packedQty > 0 || damagedQty > 0 || missingQty > 0;

        return (
          <Grid item xs={12} md={6} key={key}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                p: 1.5,
                height: "100%",
                borderColor: exceedsCounted ? "error.main" : hasMovement ? "secondary.main" : "divider",
                bgcolor: hasMovement ? "rgba(216, 88, 30, 0.04)" : "background.paper",
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900 }} noWrap>
                      {item.product_name || `Producto ${item.product_id}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.product_sku || "Sin SKU"}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
                    <AppButton
                      color="secondary"
                      onClick={() => markOutputReady(item)}
                      disabled={countedQty <= 0}
                      sx={{ minHeight: 34, px: 1.5, fontSize: 12 }}
                    >
                      Empacar conteo
                    </AppButton>
                    <AppButton color="inherit" onClick={() => clearPackingRow(item)} sx={{ minHeight: 34, px: 1.5, fontSize: 12 }}>
                      Limpiar
                    </AppButton>
                  </Stack>
                </Stack>

                <Grid container spacing={1.25}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Conteo real"
                      value={row.counted_quantity || ""}
                      onChange={(event) => updatePackingRow(key, { counted_quantity: event.target.value })}
                      inputProps={{ min: 0, step: 0.001 }}
                      helperText="Cantidad contada fisicamente"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Empacados"
                      value={row.packed_quantity || ""}
                      onChange={(event) => updatePackingRow(key, { packed_quantity: event.target.value })}
                      inputProps={{ min: 0, step: 0.001 }}
                      helperText="Entra a inventario"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Danado"
                      value={row.damaged_quantity || ""}
                      onChange={(event) => updatePackingRow(key, { damaged_quantity: event.target.value })}
                      inputProps={{ min: 0, step: 0.001 }}
                      helperText={hasDamage ? "No entra a inventario" : "Opcional"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      type="number"
                      fullWidth
                      label="Faltante"
                      value={row.missing_quantity || ""}
                      onChange={(event) => updatePackingRow(key, { missing_quantity: event.target.value })}
                      inputProps={{ min: 0, step: 0.001 }}
                      helperText={hasMissing ? "Requiere explicacion" : "Opcional"}
                    />
                  </Grid>
                  {hasDamage ? (
                    <Grid item xs={12} sm={5}>
                      <TextField
                        select
                        fullWidth
                        label="Motivo del daño"
                        value={row.damage_reason || "packaging"}
                        onChange={(event) => updatePackingRow(key, { damage_reason: event.target.value })}
                      >
                        <MenuItem value="production">Producción</MenuItem>
                        <MenuItem value="oven">Horneo</MenuItem>
                        <MenuItem value="cut">Corte</MenuItem>
                        <MenuItem value="packaging">Empaque</MenuItem>
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
                        <MenuItem value="handling_loss">Perdida en manipulacion</MenuItem>
                        <MenuItem value="suspected_theft">Posible extravio</MenuItem>
                        <MenuItem value="other">Otro</MenuItem>
                      </TextField>
                    </Grid>
                  ) : null}
                  <Grid item xs={12} sm={hasDamage && hasMissing ? 12 : hasDamage || hasMissing ? 7 : 12}>
                    <TextField
                      fullWidth
                      required={hasMissing}
                      label={hasMissing ? "Explicacion del faltante" : "Notas"}
                      value={row.notes || ""}
                      onChange={(event) => updatePackingRow(key, { notes: event.target.value })}
                      error={hasMissing && !String(row.notes || "").trim()}
                      helperText={hasMissing && !String(row.notes || "").trim() ? "Explica que ocurrio" : " "}
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color={exceedsCounted ? "error.main" : "text.secondary"} sx={{ fontWeight: 800 }}>
                    Controlado: {formatUnits(controlledQty)} / Conteo: {formatUnits(countedQty)}
                  </Typography>
                  {exceedsCounted ? (
                    <Chip size="small" color="error" label="Supera conteo" />
                  ) : hasMovement ? (
                    <Chip size="small" color="secondary" label="Listo para registrar" />
                  ) : (
                    <Chip size="small" label="Sin conteo" variant="outlined" />
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
      <Typography variant="body2" color="text.secondary">
        Revisa las cantidades antes de registrar. Esta accion actualiza el inventario con lo empacado.
      </Typography>
      <AppButton color="secondary" onClick={createPackingReport} disabled={savingPacking || !selectedBatch}>
        {savingPacking ? "Registrando..." : "Registrar conteo"}
      </AppButton>
    </Stack>
  </Paper>
);

export default PackingReadyPanel;
