import { Alert, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { normalizeRows } from "views/modules/flow-utils";

const PendingPackagingBatches = ({
  batchStatusLabels,
  formatShortDate,
  loading,
  pendingBatches,
  selectedBatchId,
  setSelectedBatchId,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%", bgcolor: "background.paper" }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Lotes pendientes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Elige el lote. Aqui solo se muestran productos, no cantidades del panadero.
        </Typography>
      </Box>
      <Chip label={`${pendingBatches.length}`} variant="outlined" />
    </Stack>

    {loading ? <Alert severity="info">Cargando lotes...</Alert> : null}
    {!loading && pendingBatches.length === 0 ? <Alert severity="info">No hay lotes pendientes para conteo.</Alert> : null}

    <Stack spacing={1.25}>
      {pendingBatches.map((batch) => {
        const isSelected = String(batch.production_batch_id) === String(selectedBatchId);
        const batchItems = normalizeRows(batch.items);
        const itemCount = batchItems.length;
        const previewItems = batchItems.slice(0, 4);
        const hiddenItems = Math.max(itemCount - previewItems.length, 0);

        return (
          <Paper
            key={batch.production_batch_id}
            onClick={() => setSelectedBatchId(String(batch.production_batch_id))}
            sx={{
              position: "relative",
              p: 1.5,
              pl: 2,
              borderRadius: 2,
              cursor: "pointer",
              border: "1px solid",
              borderColor: isSelected ? "secondary.light" : "divider",
              bgcolor: isSelected ? "rgba(230, 98, 40, 0.06)" : "background.paper",
              boxShadow: isSelected ? "0 10px 24px rgba(13, 21, 37, 0.08)" : "none",
              transition: "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease",
              "&:hover": {
                borderColor: "secondary.light",
                bgcolor: isSelected ? "rgba(230, 98, 40, 0.08)" : "background.default",
              },
              "&::before": isSelected
                ? {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 14,
                    bottom: 14,
                    width: 4,
                    borderRadius: 999,
                    bgcolor: "secondary.main",
                  }
                : {},
            }}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>Lote #{batch.production_batch_id}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                    {batch.recipe_name || "Receta"} - {formatShortDate(batch.produced_date)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={batchStatusLabels[batch.status] || batch.status || "Pendiente"}
                  color={batch.status === "partially_packed" ? "warning" : "default"}
                  variant={isSelected ? "filled" : "outlined"}
                  sx={{ fontWeight: 800, minWidth: 92 }}
                />
              </Stack>

              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  {batch.branch_name || "Sucursal"}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  /
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {itemCount} producto{itemCount === 1 ? "" : "s"}
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                {previewItems.map((item) => (
                  <Typography key={item.production_batch_output_id} variant="caption" color="text.secondary" noWrap>
                    {item.product_name || `Producto ${item.product_id}`}
                  </Typography>
                ))}
                {hiddenItems > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    +{hiddenItems} producto{hiddenItems === 1 ? "" : "s"} mas
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  </Paper>
);

export default PendingPackagingBatches;
