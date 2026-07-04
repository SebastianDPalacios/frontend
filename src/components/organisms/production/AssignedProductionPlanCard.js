import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import AppButton from "@core/components/ui/AppButton";
import ProductionOutputChip from "components/molecules/ProductionOutputChip";

const formatPlanDate = (value) => {
  if (!value) return "";
  const date = String(value).split("T")[0];
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
};

const getStatusLabel = (status) => {
  if (status === "completed") return "Produccion finalizada";
  if (status === "viewed") return "Vista";
  return "Asignada";
};

const getActionLabel = (item) => {
  if (item.production_batch_id) return "Ver produccion";
  if (item.started_at) return "Finalizar produccion";
  return "Iniciar produccion";
};

const AssignedProductionPlanCard = ({
  plan,
  onStartItem,
  onViewItem,
  startingItemId,
  formatNumber,
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ justifyContent: "space-between", mb: 1.5 }}
    >
      <Box>
        <Typography sx={{ fontWeight: 900 }}>{plan.baker_name || "Mi produccion"}</Typography>
        <Typography variant="body2" color="text.secondary">
          {formatPlanDate(plan.planned_date)} - {plan.branch_name}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={getStatusLabel(plan.status)}
        color={plan.status === "assigned" ? "warning" : "success"}
        variant="outlined"
      />
    </Stack>

    <Stack spacing={1}>
      {(Array.isArray(plan.items) ? plan.items : []).map((item) => {
        const alreadyStarted = Boolean(item.started_at || item.production_batch_id);

        return (
          <Box key={item.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
            >
              <Box>
                <Typography sx={{ fontWeight: 900 }}>
                  {item.recipe_name} - V{item.recipe_version} - {formatNumber(item.arrobas)} arroba(s)
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                  {(Array.isArray(item.outputs) ? item.outputs : []).map((output) => (
                    <ProductionOutputChip
                      key={`${item.id}-${output.product_id}`}
                      itemId={item.id}
                      output={output}
                      formatNumber={formatNumber}
                    />
                  ))}
                </Stack>
              </Box>

              {alreadyStarted ? (
                <AppButton
                  variant="outlined"
                  color="secondary"
                  onClick={() => onViewItem(plan, item)}
                  sx={{ flexShrink: 0 }}
                >
                  {getActionLabel(item)}
                </AppButton>
              ) : (
                <AppButton
                  color="secondary"
                  onClick={() => onStartItem(item.id)}
                  loading={String(startingItemId) === String(item.id)}
                  disabled={Boolean(startingItemId)}
                  sx={{ flexShrink: 0 }}
                >
                  {getActionLabel(item)}
                </AppButton>
              )}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  </Paper>
);

export default AssignedProductionPlanCard;
