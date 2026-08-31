import { Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";

const ProductSummaryCard = ({ label, value, chipLabel, chipColor }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Chip size="small" color={chipColor} variant="outlined" label={chipLabel} sx={{ alignSelf: "flex-start" }} />
    </Stack>
  </Paper>
);

const ProductStockSummary = ({ emptyCount, lowCount, onLoadStock }) => (
  <Grid container spacing={2} sx={{ mb: 2 }}>
    <Grid item xs={12} md={4}>
      <ProductSummaryCard
        label="Sin stock"
        value={emptyCount}
        chipColor={emptyCount ? "error" : "success"}
        chipLabel={emptyCount ? "Reponer primero" : "Todo con stock"}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <ProductSummaryCard
        label="Bajo minimo"
        value={lowCount}
        chipColor={lowCount ? "warning" : "success"}
        chipLabel={lowCount ? "Revisar produccion" : "Sin alertas"}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Accion rapida
          </Typography>
          <Typography sx={{ fontWeight: 800 }}>Entrada de producto</Typography>
          <AppButton onClick={() => onLoadStock(null)} color="secondary">
            Cargar stock
          </AppButton>
        </Stack>
      </Paper>
    </Grid>
  </Grid>
);

export default ProductStockSummary;
