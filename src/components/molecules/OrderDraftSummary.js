import { Alert, Box, Divider, LinearProgress, Stack, Typography } from "@mui/material";
import { formatCurrencyValue } from "components/atoms/ColombianCurrencyField";

const MoneyRow = ({ label, value, strong = false, largeOnMobile = false }) => (
  <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
    <Typography variant="body2" color={strong ? "text.primary" : "text.secondary"} sx={{ fontWeight: strong ? 900 : 600, fontSize: largeOnMobile ? { xs: strong ? 21 : 19, sm: 14 } : undefined }}>
      {label}
    </Typography>
    <Typography variant={strong ? "h6" : "body2"} sx={{ fontWeight: 900, fontSize: largeOnMobile ? { xs: strong ? 30 : 21, sm: strong ? 20 : 14 } : undefined }}>
      ${formatCurrencyValue(value, 0)}
    </Typography>
  </Stack>
);

const OrderDraftSummary = ({
  summary,
  settings,
  largeOnMobile = false,
}) => {
  const used = Number(summary.regulatedBonusTotal || 0);
  const generated = Number(summary.bonusGenerated || 0);
  const standaloneBonus = Math.max(Number(summary.bonusTotal || 0) - used, 0);
  const visibleBonusTotal = generated + standaloneBonus;
  const giftTotal = Number(summary.giftTotal || 0);
  const exchangeTotal = Number(summary.exchangeTotal || 0);
  const finalTotal = Math.max(Number(summary.saleTotal || 0), 0);
  const showBonusRule = Boolean(summary.hasRegulatedBonus);

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6" sx={{ fontWeight: 900, fontSize: largeOnMobile ? { xs: 28, sm: 20 } : undefined }}>
        Resumen
      </Typography>
      {Number(summary.saleTotal || 0) > 0 ? <MoneyRow label="Venta" value={summary.saleTotal} largeOnMobile={largeOnMobile} /> : null}
      {visibleBonusTotal > 0 ? <MoneyRow label="Vendaje" value={visibleBonusTotal} largeOnMobile={largeOnMobile} /> : null}
      {giftTotal > 0 ? <MoneyRow label="Obsequio" value={giftTotal} largeOnMobile={largeOnMobile} /> : null}
      {exchangeTotal > 0 ? <MoneyRow label="Cambio" value={exchangeTotal} largeOnMobile={largeOnMobile} /> : null}

      <Divider />
      <MoneyRow label="Total a cobrar" value={finalTotal} strong largeOnMobile={largeOnMobile} />

      {showBonusRule && summary.saleTotal > 0 && summary.saleTotal < Number(settings.bonus_minimum_amount || 0) ? (
        <Alert severity="info">
          El vendaje se habilita desde ${formatCurrencyValue(settings.bonus_minimum_amount, 0)}.
        </Alert>
      ) : null}
      {summary.bonusExceeded ? (
        <Alert severity="error">El vendaje supera el porcentaje y el margen máximo permitido por pedido.</Alert>
      ) : null}
    </Stack>
  );
};

export default OrderDraftSummary;
