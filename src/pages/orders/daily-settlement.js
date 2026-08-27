import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import toast from "react-hot-toast";
import authService from "services/auth/auth-service";
import ordersService from "services/orders/orders-service";
import settingsService from "services/settings/settings-service";
import FlowPageLayout from "views/modules/FlowPageLayout";

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};


const defaultSettlementPrintSettings = {
  pageWidthMm: 80,
  pageMarginMm: 3,
  bodyWidthMm: 74,
  bodyFontSize: 10.5,
  titleFontSize: 20,
  metaFontSize: 12,
  customerFontSize: 11.5,
  mutedFontSize: 10,
  totalsFontSize: 11.5,
  deliverFontSize: 15,
  footerFontSize: 9,
  showOrderGrossSale: true,
  showOrderCreditApplied: true,
  showOrderCollectedSale: true,
  showOrderExchange: true,
  showGrossSale: true,
  showCreditApplied: true,
  showCollectedSale: true,
  showReturns: true,
  showCreditGenerated: true,
  showGifts: true,
  showCommission: true,
};

const settlementPrintFields = [
  { key: "pageWidthMm", label: "Ancho papel (mm)", min: 58, max: 120, step: 1 },
  { key: "pageMarginMm", label: "Margen (mm)", min: 0, max: 10, step: 0.5 },
  { key: "bodyWidthMm", label: "Ancho contenido (mm)", min: 50, max: 110, step: 1 },
  { key: "bodyFontSize", label: "Texto general", min: 8, max: 18, step: 0.5 },
  { key: "titleFontSize", label: "Titulo", min: 14, max: 32, step: 1 },
  { key: "metaFontSize", label: "Datos principales", min: 9, max: 20, step: 0.5 },
  { key: "customerFontSize", label: "Cliente", min: 9, max: 22, step: 0.5 },
  { key: "mutedFontSize", label: "Texto secundario", min: 8, max: 16, step: 0.5 },
  { key: "totalsFontSize", label: "Totales", min: 9, max: 20, step: 0.5 },
  { key: "deliverFontSize", label: "Valor a entregar", min: 12, max: 28, step: 1 },
  { key: "footerFontSize", label: "Pie de cierre", min: 7, max: 14, step: 0.5 },
];

const settlementVisibilityFields = [
  "showOrderGrossSale",
  "showOrderCreditApplied",
  "showOrderCollectedSale",
  "showOrderExchange",
  "showGrossSale",
  "showCreditApplied",
  "showCollectedSale",
  "showReturns",
  "showCreditGenerated",
  "showGifts",
  "showCommission",
];

const normalizeSettlementPrintSettings = (settings) => {
  const normalized = { ...defaultSettlementPrintSettings };
  settlementPrintFields.forEach((field) => {
    const value = Number(settings?.[field.key]);
    if (Number.isFinite(value)) {
      normalized[field.key] = Math.min(Math.max(value, field.min), field.max);
    }
  });
  settlementVisibilityFields.forEach((field) => {
    if (typeof settings?.[field] === "boolean") normalized[field] = settings[field];
  });
  normalized.bodyWidthMm = Math.min(
    normalized.bodyWidthMm,
    Math.max(38, normalized.pageWidthMm - (normalized.pageMarginMm * 2))
  );
  return normalized;
};

const getDailyOrderNumbers = (items) => {
  const dayMap = new Map();

  items.forEach((item) => {
    const day = formatDate(item.order_date || item.delivered_at);
    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    dayMap.get(day).push(item);
  });

  return Array.from(dayMap.values()).reduce((acc, dayItems) => {
    [...dayItems]
      .sort((a, b) => Number(a.order_id || 0) - Number(b.order_id || 0))
      .forEach((item, index) => {
        acc[String(item.order_id)] = index + 1;
      });
    return acc;
  }, {});
};

const Metric = ({ label, value, helper, emphasis = false }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      height: "100%",
      borderRadius: 3,
      borderColor: emphasis ? "secondary.main" : "divider",
      bgcolor: emphasis ? "rgba(221, 91, 42, 0.04)" : "background.paper",
    }}
  >
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant={emphasis ? "h4" : "h5"} sx={{ mt: 0.5, fontWeight: 900 }}>{value}</Typography>
    {helper ? <Typography variant="caption" color="text.secondary">{helper}</Typography> : null}
  </Paper>
);

const CompactMetric = ({ label, value, helper }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography sx={{ fontWeight: 900 }}>{value}</Typography>
    {helper ? <Typography variant="caption" color="text.secondary">{helper}</Typography> : null}
  </Box>
);

const buildSettlementReceipt = (data, printSettings = defaultSettlementPrintSettings) => {
  const summary = data.summary || {};
  const print = normalizeSettlementPrintSettings(printSettings);
  const dailyOrderNumbers = getDailyOrderNumbers(data.items || []);
  const rows = (data.items || []).map((item) => {
    const orderNumber = dailyOrderNumbers[String(item.order_id)] || Number(item.order_id);
    const grossSale = Number(item.delivered_sales_total || 0);
    const creditUsed = Number(item.credit_redeemed_amount || 0);
    const collectedSale = Number(item.collected_sales_total ?? grossSale);
    const exchangeTotal = Number(item.exchange_total || 0);
    const exchangeCollected = Number(item.exchange_collected_total ?? 0);

    return `
      <div class="row">
        <div class="customer">${escapeHtml(item.customer_name)}</div>
        <div class="values">
          <span>Pedido #${orderNumber}</span>
          <strong>${money.format(collectedSale)}</strong>
        </div>
        ${print.showOrderGrossSale ? `<div class="values muted">
          <span>Venta bruta</span>
          <span>${money.format(grossSale)}</span>
        </div>` : ""}
        ${print.showOrderCreditApplied && creditUsed > 0 ? `<div class="values muted"><span>Saldo aplicado</span><span>-${money.format(creditUsed)}</span></div>` : ""}
        ${print.showOrderCollectedSale ? `<div class="values muted">
          <span>Venta cobrada</span>
          <span>${money.format(collectedSale)}</span>
        </div>` : ""}
        ${print.showOrderExchange && exchangeTotal > 0 ? `<div class="values muted"><span>Cambio entregado</span><span>${money.format(exchangeTotal)}</span></div>` : ""}
        ${exchangeCollected > 0 ? `<div class="values muted"><span>Excedente cobrado</span><span>${money.format(exchangeCollected)}</span></div>` : ""}
      </div>
    `;
  }).join("");
  const giftRows = (data.gifts || []).map((gift) => `
    <div class="row gift-row">
      <div class="customer">${escapeHtml(gift.customer_name)}</div>
      <div class="values">
        <span>${escapeHtml(gift.products_summary || "Obsequio")}</span>
        <strong>${money.format(Number(gift.total_commercial_value || 0))}</strong>
      </div>
    </div>
  `).join("");

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Liquidacion ${escapeHtml(data.settlement_date)}</title>
      <style>
        @page { size: ${print.pageWidthMm}mm auto; margin: ${print.pageMarginMm}mm; }
        * { box-sizing: border-box; }
        body { width: ${print.bodyWidthMm}mm; margin: 0 auto; color: #111; font-family: Arial, sans-serif; font-size: ${print.bodyFontSize}px; }
        h1 { margin: 0; text-align: center; font-size: ${print.titleFontSize}px; text-transform: uppercase; }
        .subtitle { margin-top: 3px; text-align: center; font-weight: 800; font-size: ${print.metaFontSize}px; }
        .rule { margin: 7px 0; border-top: 1px dashed #111; }
        .meta { display: grid; gap: 3px; font-size: ${print.metaFontSize}px; }
        .meta strong { font-size: ${print.metaFontSize + 0.5}px; }
        .row { padding: 5px 0; border-bottom: 1px dashed #777; break-inside: avoid; }
        .customer { font-size: ${print.customerFontSize}px; font-weight: 900; }
        .values { display: flex; justify-content: space-between; gap: 8px; margin-top: 2px; }
        .muted { color: #444; font-size: ${print.mutedFontSize}px; }
        .totals { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; margin-top: 8px; font-size: ${print.totalsFontSize}px; }
        .totals strong { text-align: right; }
        .deliver { padding-top: 5px; border-top: 2px solid #111; font-size: ${print.deliverFontSize}px; font-weight: 900; }
        .footer { margin-top: 9px; text-align: center; font-size: ${print.footerFontSize}px; }
        @media print { body { width: ${print.bodyWidthMm}mm; } }
      </style>
    </head>
    <body>
      <h1>Panaderia</h1>
      <div class="subtitle">LIQUIDACION DIARIA</div>
      <div class="rule"></div>
      <div class="meta">
        <strong>${escapeHtml(data.seller?.full_name || "Vendedor")}</strong>
        <span>Fecha: ${escapeHtml(data.settlement_date)}</span>
        <span>Pedidos entregados: ${Number(summary.order_count || 0)}</span>
      </div>
      <div class="rule"></div>
      ${rows || "<div>Sin ventas entregadas en esta fecha.</div>"}
      ${giftRows ? `<div class="rule"></div><strong>OBSEQUIOS REGISTRADOS</strong>${giftRows}` : ""}
      <div class="totals">
        ${print.showGrossSale ? `<span>VENTA BRUTA</span><strong>${money.format(Number(summary.delivered_sales_total || 0))}</strong>` : ""}
        ${print.showCreditApplied ? `<span>SALDO APLICADO</span><strong>-${money.format(Number(summary.credit_redeemed_amount || 0))}</strong>` : ""}
        ${print.showCollectedSale ? `<span>VENTA COBRADA</span><strong>${money.format(Number(summary.collected_sales_total ?? summary.delivered_sales_total ?? 0))}</strong>` : ""}
        ${Number(summary.exchange_collected_total || 0) > 0 ? `<span>EXCEDENTE CAMBIOS</span><strong>${money.format(Number(summary.exchange_collected_total || 0))}</strong>` : ""}
        ${print.showReturns ? `<span>CAMBIOS</span><strong>${money.format(Number(summary.returned_sales_total || 0))}</strong>` : ""}
        ${print.showCreditGenerated ? `<span>SALDO GENERADO</span><strong>${money.format(Number(summary.credit_generated_total || 0))}</strong>` : ""}
        ${print.showGifts ? `<span>OBSEQUIOS</span><strong>${money.format(Number(summary.gift_total || 0))}</strong>` : ""}
        ${print.showCommission ? `<span>COMISION</span><strong>${money.format(Number(summary.commission_amount || 0))}</strong>` : ""}
        <span class="deliver">ENTREGAR</span><strong class="deliver">${money.format(Number(summary.amount_to_deliver || 0))}</strong>
      </div>
      <div class="footer">Generado: ${escapeHtml(formatDateTime(new Date()))}</div>
    </body>
  </html>`;
};

const DailySettlementPage = () => {
  const currentUser = useMemo(() => authService.getCurrentUser(), []);
  const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
  const canChooseSeller = roles.some((role) =>
    ["ADMIN", "SUPER_ADMIN"].includes(typeof role === "string" ? role : role?.code)
  );
  const [date, setDate] = useState(today());
  const [sellerId, setSellerId] = useState("");
  const [printSettings, setPrintSettings] = useState(defaultSettlementPrintSettings);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    settingsService.getPosTicketSettings().then((response) => {
      if (response?.code === 1) {
        setPrintSettings(normalizeSettlementPrintSettings(response.data?.settlementPrint));
      }
    }).catch(() => null);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await ordersService.getDailySettlement({
          date,
          ...(sellerId ? { salesAgentUserId: sellerId } : {}),
        });

        if (response?.code !== 1) {
          setData(response?.data || null);
          setError(response?.message || "No se pudo calcular la liquidacion");
          return;
        }

        setData(response.data);
        if (!sellerId && response.data?.seller?.id) {
          setSellerId(String(response.data.seller.id));
        }
      } catch (requestError) {
        setError(requestError?.response?.data?.message || "No se pudo cargar la liquidacion");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [date, sellerId]);

  const printSettlement = () => {
    if (!data?.seller || (!(data?.items || []).length && !(data?.gifts || []).length)) {
      toast.error("No hay ventas u obsequios para imprimir");
      return;
    }

    const popup = window.open("", "_blank", "width=430,height=760");
    if (!popup) {
      toast.error("El navegador bloqueo la ventana de impresion");
      return;
    }
    popup.document.open();
    popup.document.write(buildSettlementReceipt(data, printSettings));
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  };

  const summary = data?.summary || {};
  const sellers = useMemo(() => (Array.isArray(data?.sellers) ? data.sellers : []), [data?.sellers]);
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data?.items]);
  const gifts = useMemo(() => (Array.isArray(data?.gifts) ? data.gifts : []), [data?.gifts]);
  const creditsGenerated = useMemo(() => (Array.isArray(data?.credits_generated) ? data.credits_generated : []), [data?.credits_generated]);
  const dailyOrderNumbers = useMemo(() => getDailyOrderNumbers(items), [items]);
  const grossSalesTotal = Number(summary.delivered_sales_total || 0);
  const creditAppliedTotal = Number(summary.credit_redeemed_amount || 0);
  const collectedSalesTotal = Number(
    summary.collected_sales_total ?? grossSalesTotal
  );

  return (
    <FlowPageLayout
      title="Liquidacion diaria"
      subtitle="Ventas entregadas, comision y valor que debe entregar cada vendedor"
    >
      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 3 }, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "flex-end" } }}>
          <TextField
            label="Fecha de liquidacion"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { md: 220 } }}
          />
          {canChooseSeller ? (
            <TextField
              select
              label="Vendedor"
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
              sx={{ minWidth: { md: 280 } }}
            >
              <MenuItem value="">Todos los vendedores</MenuItem>
              {sellers.map((seller) => (
                <MenuItem key={seller.id} value={String(seller.id)}>
                  {seller.full_name}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PrintRoundedIcon />}
            onClick={printSettlement}
            disabled={loading || (!items.length && !gifts.length)}
          >
            Imprimir cierre
          </Button>
        </Stack>
      </Paper>

      {error ? <Alert severity={data?.sellers ? "info" : "error"} sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Calculando liquidacion...</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <Metric label="Pedidos" value={Number(summary.order_count || 0)} helper="Entregados del dia" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric label="Venta cobrada" value={money.format(collectedSalesTotal)} helper="Total recibido por ventas" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric label="Comision" value={money.format(Number(summary.commission_amount || 0))} helper="Solo sobre venta" />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric
            label="Debe entregar"
            value={money.format(Number(summary.amount_to_deliver || 0))}
            helper="Venta cobrada menos comision"
            emphasis
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2, bgcolor: "background.default" }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Otros movimientos del cierre</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <CompactMetric label="Venta antes de ajustes" value={money.format(grossSalesTotal)} />
          </Grid>
          <Grid item xs={6} md={3}>
            <CompactMetric label="Saldo aplicado" value={money.format(creditAppliedTotal)} helper="Solo en cambios" />
          </Grid>
          <Grid item xs={6} md={3}>
            <CompactMetric
              label="Cambios"
              value={money.format(Number(summary.returned_sales_total || 0))}
              helper={`Saldo generado: ${money.format(Number(summary.credit_generated_total || 0))}`}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <CompactMetric
              label="Obsequios"
              value={money.format(Number(summary.gift_total || 0))}
              helper={`${Number(summary.gift_count || 0)} registro(s)`}
            />
          </Grid>
        </Grid>
      </Paper>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {data?.seller?.full_name || "Selecciona un vendedor"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clientes y pedidos realmente entregados el {date}
            </Typography>
          </Box>
          <Chip label={`${items.length} pedido(s)`} variant="outlined" />
        </Stack>

        {!loading && !items.length ? (
          <Alert severity="info">
            No hay pedidos entregados para esta fecha{sellerId ? " con este vendedor. Prueba con Todos los vendedores o valida que el pedido haya sido marcado como entregado." : "."}
          </Alert>
        ) : null}
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} md={6} xl={4} key={item.commission_id}>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: "100%" }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }}>{item.customer_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pedido #{dailyOrderNumbers[String(item.order_id)] || item.order_id}{item.sales_agent_name ? ` - ${item.sales_agent_name}` : ""}
                      </Typography>
                    </Box>
                    <Chip size="small" color="success" label="Entregado" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{formatDateTime(item.delivered_at)}</Typography>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2">Venta</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{money.format(Number(item.delivered_sales_total || 0))}</Typography>
                  </Stack>
                  {Number(item.credit_redeemed_amount || 0) > 0 ? (
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2">Saldo aplicado</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>-{money.format(Number(item.credit_redeemed_amount || 0))}</Typography>
                    </Stack>
                  ) : null}
                  {Number(item.exchange_total || 0) > 0 ? (
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2">Cambio / excedente</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {money.format(Number(item.exchange_total || 0))} / {money.format(Number(item.exchange_collected_total || 0))}
                      </Typography>
                    </Stack>
                  ) : null}
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2">Venta cobrada</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {money.format(Number(item.collected_sales_total ?? item.delivered_sales_total ?? 0))}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2">Comision ({Number(item.commission_percent || 0)}%)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{money.format(Number(item.commission_amount || 0))}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: 900 }}>Entregar</Typography>
                    <Typography sx={{ fontWeight: 900 }}>{money.format(Number(item.amount_to_deliver || 0))}</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 3 }, mt: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Saldos a favor generados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cambios autorizados que quedan disponibles para el cliente.
            </Typography>
          </Box>
          <Chip label={`${creditsGenerated.length} saldo(s)`} variant="outlined" color="success" />
        </Stack>
        {!loading && !creditsGenerated.length ? (
          <Alert severity="info">No hay saldos generados para esta fecha.</Alert>
        ) : null}
        <Grid container spacing={2}>
          {creditsGenerated.map((credit) => (
            <Grid item xs={12} md={6} xl={4} key={credit.id}>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: "100%", borderColor: "success.light" }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 900 }}>{credit.customer_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pedido #{dailyOrderNumbers[String(credit.order_id)] || credit.order_id} - {credit.sales_agent_name || "Sin vendedor"}
                  </Typography>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2">Saldo generado</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>{money.format(Number(credit.amount || 0))}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Saldo cliente: {money.format(Number(credit.balance_after || 0))}</Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 3 }, mt: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Obsequios registrados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pan entregado como obsequio. No suma a venta, vendaje ni comision.
            </Typography>
          </Box>
          <Chip label={`${gifts.length} obsequio(s)`} variant="outlined" color="success" />
        </Stack>
        {!loading && !gifts.length ? (
          <Alert severity="info">No hay obsequios registrados para esta fecha.</Alert>
        ) : null}
        <Grid container spacing={2}>
          {gifts.map((gift) => (
            <Grid item xs={12} md={6} xl={4} key={gift.sales_gift_id}>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: "100%", borderColor: "success.light" }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }}>{gift.customer_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {gift.sales_agent_name || "Sin vendedor"} - {formatDate(gift.gift_date)}
                      </Typography>
                    </Box>
                    <Chip size="small" color="success" variant="outlined" label="Obsequio" />
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                    {gift.products_summary || "Sin productos"}
                  </Typography>
                  {gift.notes ? <Typography variant="body2" color="text.secondary">{gift.notes}</Typography> : null}
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2">Valor comercial</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>{money.format(Number(gift.total_commercial_value || 0))}</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </FlowPageLayout>
  );
};

export default DailySettlementPage;
