import { Chip, Grid, Paper, Stack, Typography } from "@mui/material";

const InventoryMetricCard = ({ label, value, helper, color = "primary" }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: "100%" }}>
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Chip label={helper} color={color} variant="outlined" sx={{ alignSelf: "flex-start" }} />
    </Stack>
  </Paper>
);

const InventoryOverviewMetrics = ({
  branchesCount,
  rawMaterialsCount,
  productsCount,
  emptyMaterialsCount,
  lowMaterialsCount,
  emptyProductsCount,
  lowProductsCount,
  totalAlerts,
}) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    <Grid item xs={12} md={3}>
      <InventoryMetricCard label="Sucursales" value={branchesCount} helper="Operativas" color="info" />
    </Grid>
    <Grid item xs={12} md={3}>
      <InventoryMetricCard
        label="Materias primas"
        value={rawMaterialsCount}
        helper={`${emptyMaterialsCount} sin stock - ${lowMaterialsCount} bajo minimo`}
        color={emptyMaterialsCount ? "error" : lowMaterialsCount ? "warning" : "success"}
      />
    </Grid>
    <Grid item xs={12} md={3}>
      <InventoryMetricCard
        label="Productos"
        value={productsCount}
        helper={`${emptyProductsCount} sin stock - ${lowProductsCount} bajo minimo`}
        color={emptyProductsCount ? "error" : lowProductsCount ? "warning" : "success"}
      />
    </Grid>
    <Grid item xs={12} md={3}>
      <InventoryMetricCard
        label="Alertas"
        value={totalAlerts}
        helper={totalAlerts ? "Items a revisar" : "Inventario estable"}
        color={totalAlerts ? "warning" : "success"}
      />
    </Grid>
  </Grid>
);

export default InventoryOverviewMetrics;
