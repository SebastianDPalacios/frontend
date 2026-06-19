import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import ProductionOutputChip from "components/molecules/ProductionOutputChip";

const ProductionPlanCard = ({ plan, formatNumber }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ justifyContent: "space-between", mb: 1.5 }}
    >
      <Box>
        <Typography sx={{ fontWeight: 900 }}>{plan.baker_name || "Producción asignada"}</Typography>
        <Typography variant="body2" color="text.secondary">
          {plan.planned_date} · {plan.branch_name}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={plan.status === "viewed" ? "Vista" : plan.status === "completed" ? "Completada" : "Asignada"}
        color={plan.status === "viewed" || plan.status === "completed" ? "success" : "warning"}
        variant="outlined"
      />
    </Stack>

    <Stack spacing={1}>
      {(Array.isArray(plan.items) ? plan.items : []).map((item) => (
        <Box key={item.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default" }}>
          <Typography sx={{ fontWeight: 900 }}>
            {item.recipe_name} · V{item.recipe_version} · {formatNumber(item.arrobas)} arroba(s)
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
      ))}
    </Stack>
  </Paper>
);

export default ProductionPlanCard;
