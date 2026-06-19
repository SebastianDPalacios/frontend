import { Alert, Box, Grid, Stack, Typography } from "@mui/material";
import AssignedProductionPlanCard from "components/organisms/production/AssignedProductionPlanCard";
import ProductionPlanCard from "components/organisms/production/ProductionPlanCard";

const ProductionPlanOverview = ({
  canManage,
  loading,
  myPlans,
  plans,
  startingItemId,
  formatNumber,
  onStartItem,
  onViewItem,
}) => (
  <Grid container spacing={2}>
    <Grid item xs={12} lg={canManage ? 6 : 12}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Mi producción asignada</Typography>
          <Typography variant="body2" color="text.secondary">
            Planes enviados a tu usuario como panadero.
          </Typography>
        </Box>
        {!loading && myPlans.length === 0 ? (
          <Alert severity="info">No tienes producción asignada.</Alert>
        ) : null}
        {myPlans.map((plan) => (
          <AssignedProductionPlanCard
            key={plan.id}
            plan={plan}
            onStartItem={onStartItem}
            onViewItem={onViewItem}
            startingItemId={startingItemId}
            formatNumber={formatNumber}
          />
        ))}
      </Stack>
    </Grid>

    {canManage ? (
      <Grid item xs={12} lg={6}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Asignaciones enviadas</Typography>
            <Typography variant="body2" color="text.secondary">
              Consulta si el panadero ya vio cada plan.
            </Typography>
          </Box>
          {!loading && plans.length === 0 ? (
            <Alert severity="info">Aún no hay planes enviados.</Alert>
          ) : null}
          {plans.map((plan) => (
            <ProductionPlanCard key={plan.id} plan={plan} formatNumber={formatNumber} />
          ))}
        </Stack>
      </Grid>
    ) : null}
  </Grid>
);

export default ProductionPlanOverview;
