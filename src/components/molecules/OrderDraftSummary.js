import { Alert, Box, Divider, LinearProgress, Stack, Typography } from "@mui/material";
import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";

const MoneyRow = ({ label, value, strong = false }) => (
  <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
    <Typography variant="body2" color={strong ? "text.primary" : "text.secondary"} sx={{ fontWeight: strong ? 800 : 500 }}>
      {label}
    </Typography>
    <Typography variant={strong ? "h6" : "body2"} sx={{ fontWeight: 900 }}>
      ${formatCurrencyValue(value, 0)}
    </Typography>
  </Stack>
);

const OrderDraftSummary = ({ summary, settings }) => {
  const allowed = Number(summary.allowedBonus || 0);
  const used = Number(summary.bonusTotal || 0);
  const progress = allowed > 0 ? Math.min((used / allowed) * 100, 100) : 0;

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        Resumen
      </Typography>
      <MoneyRow label="Venta" value={summary.saleTotal} />
      <MoneyRow label="Vendaje seleccionado" value={summary.bonusTotal} />
      <MoneyRow label="Obsequios" value={summary.giftTotal} />
      <MoneyRow label="Cambios" value={summary.exchangeTotal} />
      <Divider />
      <MoneyRow label="Total a cobrar" value={summary.saleTotal} strong />

      <Box>
        <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            Vendaje disponible
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 900 }}>
            ${formatCurrencyValue(Math.max(allowed - used, 0), 0)}
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} color={summary.bonusExceeded ? "error" : "success"} />
      </Box>

      {summary.saleTotal < Number(settings.bonus_minimum_amount || 0) ? (
        <Alert severity="info">
          El vendaje se habilita desde ${formatCurrencyValue(settings.bonus_minimum_amount, 0)}.
        </Alert>
      ) : null}
      {summary.bonusExceeded ? (
        <Alert severity="error">El vendaje seleccionado supera el {Number(settings.bonus_percent || 0)}% permitido.</Alert>
      ) : null}
    </Stack>
  );
};

export default OrderDraftSummary;
