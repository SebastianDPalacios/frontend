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

const Metric = ({ label, value, helper }) => (
  <Paper variant="outlined" sx={{ p: 2, height: "100%", borderRadius: 2 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 900 }}>{value}</Typography>
    {helper ? <Typography variant="caption" color="text.secondary">{helper}</Typography> : null}
  </Paper>
);

const buildSettlementReceipt = (data) => {
  const summary = data.summary || {};
  const dailyOrderNumbers = getDailyOrderNumbers(data.items || []);
  const rows = (data.items || []).map((item) => `
    <div class="row">
      <div class="customer">${escapeHtml(item.customer_name)}</div>
      <div class="values">
        <span>Pedido #${dailyOrderNumbers[String(item.order_id)] || Number(item.order_id)}</span>
        <strong>${money.format(Number(item.delivered_sales_total || 0))}</strong>
      </div>
    </div>
  `).join("");

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Liquidacion ${escapeHtml(data.settlement_date)}</title>
      <style>
        @page { size: 80mm auto; margin: 3mm; }
        * { box-sizing: border-box; }
        body { width: 74mm; margin: 0 auto; color: #111; font-family: Arial, sans-serif; font-size: 10.5px; }
        h1 { margin: 0; text-align: center; font-size: 20px; text-transform: uppercase; }
        .subtitle { margin-top: 3px; text-align: center; font-weight: 800; }
        .rule { margin: 7px 0; border-top: 1px dashed #111; }
        .meta { display: grid; gap: 3px; }
        .meta strong { font-size: 12px; }
        .row { padding: 5px 0; border-bottom: 1px dashed #777; break-inside: avoid; }
        .customer { font-size: 11.5px; font-weight: 900; }
        .values { display: flex; justify-content: space-between; gap: 8px; margin-top: 2px; }
        .totals { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; margin-top: 8px; font-size: 11.5px; }
        .totals strong { text-align: right; }
        .deliver { padding-top: 5px; border-top: 2px solid #111; font-size: 15px; font-weight: 900; }
        .footer { margin-top: 9px; text-align: center; font-size: 9px; }
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
      <div class="totals">
        <span>VENTA</span><strong>${money.format(Number(summary.delivered_sales_total || 0))}</strong>
        <span>DEVOLUCIONES</span><strong>${money.format(Number(summary.returned_sales_total || 0))}</strong>
        <span>COMISION</span><strong>${money.format(Number(summary.commission_amount || 0))}</strong>
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    if (!data?.seller || !(data?.items || []).length) {
      toast.error("No hay ventas entregadas para imprimir");
      return;
    }

    const popup = window.open("", "_blank", "width=430,height=760");
    if (!popup) {
      toast.error("El navegador bloqueo la ventana de impresion");
      return;
    }
    popup.document.open();
    popup.document.write(buildSettlementReceipt(data));
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  };

  const summary = data?.summary || {};
  const sellers = useMemo(() => (Array.isArray(data?.sellers) ? data.sellers : []), [data?.sellers]);
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data?.items]);
  const dailyOrderNumbers = useMemo(() => getDailyOrderNumbers(items), [items]);

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
            disabled={loading || !items.length}
          >
            Imprimir cierre
          </Button>
        </Stack>
      </Paper>

      {error ? <Alert severity={data?.sellers ? "info" : "error"} sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? <Alert severity="info" sx={{ mb: 2 }}>Calculando liquidacion...</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={2.4}>
          <Metric label="Pedidos" value={Number(summary.order_count || 0)} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Metric label="Ventas entregadas" value={money.format(Number(summary.delivered_sales_total || 0))} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Metric label="Devoluciones" value={money.format(Number(summary.returned_sales_total || 0))} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <Metric label="Comision" value={money.format(Number(summary.commission_amount || 0))} helper="Segun porcentaje registrado" />
        </Grid>
        <Grid item xs={12} md={2.4}>
          <Metric label="Debe entregar" value={money.format(Number(summary.amount_to_deliver || 0))} helper="Venta menos comision" />
        </Grid>
      </Grid>

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
    </FlowPageLayout>
  );
};

export default DailySettlementPage;
