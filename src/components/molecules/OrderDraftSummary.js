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

const OrderDraftSummary = ({
  summary,
  settings,
  creditAvailable = 0,
  creditRedeemed = 0,
  showCreditDetails = true,
}) => {
  const used = Number(summary.regulatedBonusTotal || 0);
  const generated = Number(summary.bonusGenerated || 0);
  const standaloneBonus = Math.max(Number(summary.bonusTotal || 0) - used, 0);
  const visibleBonusTotal = generated + standaloneBonus;
  const exchangeTotal = Number(summary.exchangeTotal || 0);
  const finalTotal = Math.max(Number(summary.saleTotal || 0), 0);
  const remainingCredit = Math.max(Number(creditAvailable || 0) - Number(creditRedeemed || 0), 0);
  const showBonusRule = Boolean(summary.hasRegulatedBonus);

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        Resumen
      </Typography>
      <MoneyRow label="Venta" value={summary.saleTotal} />
      {visibleBonusTotal > 0 ? <MoneyRow label="Vendaje" value={visibleBonusTotal} /> : null}
      {exchangeTotal > 0 ? <MoneyRow label="Cambio" value={exchangeTotal} /> : null}

      {showCreditDetails && creditAvailable > 0 ? (
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "success.lighter", border: "1px solid", borderColor: "success.light" }}>
          <Stack spacing={1}>
            <MoneyRow label="Saldo a favor disponible" value={creditAvailable} />
            {Number(creditRedeemed || 0) > 0 ? (
              <>
                <MoneyRow label="Saldo aplicado automaticamente" value={creditRedeemed} />
                <MoneyRow label="Saldo restante estimado" value={remainingCredit} />
                <Typography variant="caption" color="text.secondary">
                  Se descuenta al entregar los productos marcados como Cambio.
                </Typography>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                El saldo solo se utiliza al agregar productos de tipo Cambio.
              </Typography>
            )}
          </Stack>
        </Box>
      ) : null}

      <Divider />
      <MoneyRow label="Total a cobrar" value={finalTotal} strong />

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
