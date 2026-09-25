import { Box, Chip, Grid, Paper, Stack, Typography } from "@mui/material";

const STATUS_PRESENTATION = {
  pending_count: { label: "Pendiente de conteo", color: "warning" },
  matched: { label: "Conciliado", color: "success" },
  shortage: { label: "Con faltante", color: "warning" },
  surplus: { label: "Con sobrante", color: "info" },
  corrected: { label: "Corregido", color: "secondary" },
};

const ProductValue = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography sx={{ fontWeight: 900 }}>{value}</Typography>
  </Box>
);

const ProductionProductSummary = ({ product, formatUnits, showBatchCount = false }) => {
  const status = STATUS_PRESENTATION[product.reconciliation_status] || STATUS_PRESENTATION.pending_count;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
      <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
        <Grid item xs={12} md={3}>
          <Typography sx={{ fontWeight: 900 }}>{product.product_name}</Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
            {showBatchCount ? (
              <Chip size="small" label={`Lotes: ${formatUnits(product.batches_count)}`} color="info" variant="outlined" />
            ) : null}
            <Chip size="small" label={status.label} color={status.color} variant="outlined" />
          </Stack>
        </Grid>
        <Grid item xs={6} sm={3} md><ProductValue label="Informado" value={product.informed_quantity == null ? "—" : formatUnits(product.informed_quantity)} /></Grid>
        <Grid item xs={6} sm={3} md><ProductValue label="Producido" value={formatUnits(product.produced_quantity)} /></Grid>
        <Grid item xs={6} sm={3} md><ProductValue label="Empacado" value={formatUnits(product.packed_quantity)} /></Grid>
        <Grid item xs={6} sm={3} md><ProductValue label="Dañado" value={formatUnits(product.damaged_quantity)} /></Grid>
        <Grid item xs={6} sm={3} md><ProductValue label="Faltante" value={formatUnits(product.shortage_quantity)} /></Grid>
        <Grid item xs={6} sm={3} md><ProductValue label="Sobrante" value={formatUnits(product.surplus_quantity)} /></Grid>
        <Grid item xs={6} sm={3} md><ProductValue label="A inventario" value={formatUnits(product.inventory_quantity)} /></Grid>
      </Grid>
    </Paper>
  );
};

export default ProductionProductSummary;
