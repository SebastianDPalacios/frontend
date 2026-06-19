import { Alert, Box, Chip, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";

const PackagingBatchWorkPanel = ({
  formatNumber,
  formatUnits,
  getPendingQty,
  selectedBatch,
  selectedItems,
  selectedOutput,
  setSelectedOutputId,
  totalDamaged,
  totalMissing,
  totalPacked,
  totalPending,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, mb: 2 }}>
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 2 }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {selectedBatch ? `3. Trabajar lote #${selectedBatch.production_batch_id}` : "3. Selecciona un lote"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedBatch
            ? `${selectedBatch.recipe_name || "Receta"} - ${selectedBatch.baker_name || "Panadero"}`
            : "Cuando elijas un lote, aqui veras sus productos."}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Chip label={`${formatUnits(totalPending)} pendientes`} color={totalPending > 0 ? "warning" : "success"} variant="outlined" />
        <Chip label={`${formatUnits(totalPacked)} empacados`} color="success" variant="outlined" />
        <Chip label={`${formatUnits(totalMissing)} faltantes`} color="warning" variant="outlined" />
        <Chip label={`${formatUnits(totalDamaged)} dañados`} color="error" variant="outlined" />
      </Stack>
    </Stack>

    {selectedBatch ? (
      <Grid container spacing={1.5}>
        {selectedItems.map((item) => {
          const pendingQty = getPendingQty(item);
          const progress =
            Number(item.produced_quantity || 0) > 0
              ? Math.min(
                  Math.round(
                    ((
                      Number(item.packed_quantity || 0)
                      + Number(item.damaged_quantity || 0)
                      + Number(item.missing_quantity || 0)
                      + Number(item.direct_delivered_quantity || 0)
                    ) / Number(item.produced_quantity || 1)) * 100
                  ),
                  100
                )
              : 0;
          const isSelected = String(item.production_batch_output_id) === String(selectedOutput?.production_batch_output_id);

          return (
            <Grid item xs={12} md={6} key={item.production_batch_output_id}>
              <Paper
                variant="outlined"
                onClick={() => setSelectedOutputId(String(item.production_batch_output_id))}
                sx={{
                  borderRadius: 2,
                  p: 1.5,
                  cursor: "pointer",
                  borderColor: isSelected ? "primary.main" : "divider",
                  height: "100%",
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }} noWrap>
                        {item.product_name || `Producto ${item.product_id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pendiente: {formatUnits(pendingQty)}
                      </Typography>
                    </Box>
                    {isSelected ? <Chip size="small" color="primary" label="Activo" variant="outlined" /> : null}
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 8, borderRadius: 999, "& .MuiLinearProgress-bar": { borderRadius: 999 } }}
                  />
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={2.4}>
                      <Typography variant="caption" color="text.secondary">
                        Producido
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{formatNumber(item.produced_quantity)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Typography variant="caption" color="text.secondary">
                        Empacado
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{formatNumber(item.packed_quantity)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Typography variant="caption" color="text.secondary">
                        Dañado
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{formatNumber(item.damaged_quantity)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Typography variant="caption" color="text.secondary">
                        Faltante
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{formatNumber(item.missing_quantity)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <Typography variant="caption" color="text.secondary">
                        Venta directa
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{formatNumber(item.direct_delivered_quantity)}</Typography>
                    </Grid>
                  </Grid>
                  {Number(item.reserved_quantity || 0) > 0 ? (
                    <Alert severity="warning">
                      {formatNumber(item.reserved_quantity)} unidades reservadas para venta. No deben empacarse para inventario.
                    </Alert>
                  ) : null}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    ) : (
      <Alert severity="info">Selecciona o crea un lote pendiente para continuar.</Alert>
    )}
  </Paper>
);

export default PackagingBatchWorkPanel;
