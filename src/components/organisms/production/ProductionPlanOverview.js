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
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Mi produccion asignada</Typography>
          <Typography variant="body2" color="text.secondary">
            Aqui el panadero inicia y marca como lista cada receta asignada.
          </Typography>
        </Box>
        {!loading && myPlans.length === 0 ? (
          <Alert severity={canManage ? "warning" : "info"}>
            {canManage
              ? "Tu usuario no es el panadero asignado. Para completar una asignacion, entra con el usuario del panadero."
              : "No tienes produccion asignada."}
          </Alert>
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
              Seguimiento administrativo: aqui ves si el panadero ya la vio o la completo.
            </Typography>
          </Box>
          {!loading && plans.length === 0 ? (
            <Alert severity="info">Aun no hay planes enviados.</Alert>
          ) : null}
          {plans.map((plan) => (
            <ProductionPlanCard
              key={plan.id}
              plan={plan}
              formatNumber={formatNumber}
              onViewItem={(currentPlan, currentItem) => onViewItem(currentPlan, currentItem, { canFinish: false })}
            />
          ))}
        </Stack>
      </Grid>
    ) : null}
  </Grid>
);

export default ProductionPlanOverview;
