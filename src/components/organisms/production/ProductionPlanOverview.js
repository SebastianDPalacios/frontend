import { Alert, Box, Stack, Typography } from "@mui/material";
import ProductionPlanCard from "components/organisms/production/ProductionPlanCard";

const ProductionPlanOverview = ({
  loading,
  plans,
  formatNumber,
  onEditPlan,
  onCancelPlan,
  cancellingPlanId,
  canEditPlan,
}) => (
  <Stack spacing={1.5} sx={{ mt: 3 }}>
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>Asignaciones enviadas</Typography>
      <Typography variant="body2" color="text.secondary">
        Listas informativas enviadas a los panaderos. Puedes corregirlas o cancelarlas sin registrar produccion.
      </Typography>
    </Box>
    {!loading && plans.length === 0 ? <Alert severity="info">Aun no hay planes enviados.</Alert> : null}
    {plans.map((plan) => (
      <ProductionPlanCard
        key={plan.id}
        plan={plan}
        formatNumber={formatNumber}
        onEditPlan={typeof canEditPlan === "function" && canEditPlan(plan) ? onEditPlan : null}
        onCancelPlan={typeof canEditPlan === "function" && canEditPlan(plan) ? onCancelPlan : null}
        cancelling={String(cancellingPlanId) === String(plan.id)}
      />
    ))}
  </Stack>
);

export default ProductionPlanOverview;
