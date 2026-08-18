import { Box, Divider, Stack, Typography } from "@mui/material";
import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";

const SummaryRow = ({ label, value, strong = false }) => (
  <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant={strong ? "h6" : "body1"} sx={{ fontWeight: strong ? 900 : 800, textAlign: "right" }}>
      {value}
    </Typography>
  </Stack>
);

const SalesRulesSummary = ({ bonusPercent, bonusMinimumAmount, bonusMaxCompanyLossAmount, commissionPercent }) => {
  const minimum = Number(bonusMinimumAmount || 0);
  const exampleSale = Math.max(minimum, 10000);
  const exampleBonus = exampleSale * (Number(bonusPercent || 0) / 100);
  const exampleCommission = exampleSale * (Number(commissionPercent || 0) / 100);

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "action.hover" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>
        Vista previa de la regla
      </Typography>
      <Stack spacing={1.25}>
        <SummaryRow label="Venta de ejemplo" value={`$${formatCurrencyValue(exampleSale, 0)}`} />
        <SummaryRow label={`Vendaje (${Number(bonusPercent || 0)}%)`} value={`$${formatCurrencyValue(exampleBonus, 0)}`} />
        <SummaryRow
          label={`Comisión externa (${Number(commissionPercent || 0)}%)`}
          value={`$${formatCurrencyValue(exampleCommission, 0)}`}
        />
        <SummaryRow label="Margen máximo por producto" value={`$${formatCurrencyValue(bonusMaxCompanyLossAmount, 0)}`} />
        <Divider />
        <SummaryRow
          label="Compra mínima para vendaje"
          value={`$${formatCurrencyValue(minimum, 0)}`}
          strong
        />
      </Stack>
    </Box>
  );
};

export default SalesRulesSummary;
