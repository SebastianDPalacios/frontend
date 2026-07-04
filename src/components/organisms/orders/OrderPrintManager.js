import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import toast from "react-hot-toast";
import ordersService from "services/orders/orders-service";

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 });

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

const lineLabels = {
  sale: "Venta",
  bonus: "Vendaje",
  gift: "Obsequio",
  exchange: "Cambio",
};

const buildReceiptHtml = ({ order, items }) => {
  const saleTotal = items
    .filter((item) => item.line_type === "sale")
    .reduce((total, item) => total + Number(item.line_total || 0), 0);

  const groupedItems = items.reduce((groups, item) => {
    const categoryName = item.category_name || "Sin categoria";
    if (!groups.has(categoryName)) {
      groups.set(categoryName, []);
    }
    groups.get(categoryName).push(item);
    return groups;
  }, new Map());

  const rows = Array.from(groupedItems.entries()).map(([categoryName, categoryItems]) => {
    const itemRows = categoryItems.map((item) => {
      const value = item.line_type === "sale" ? item.line_total : item.commercial_value;
      const requestDetail = item.capture_mode === "amount" && item.requested_amount
        ? `Solicitado: ${money.format(Number(item.requested_amount || 0))}`
        : `Precio unitario: ${money.format(Number(item.unit_price || 0))}`;

      return `
        <div class="item">
          <div class="item-head">
            <span class="item-name">${escapeHtml(item.product_name)}</span>
            <span class="type type-${escapeHtml(item.line_type)}">${escapeHtml(lineLabels[item.line_type] || item.line_type)}</span>
          </div>
          <div class="item-values">
            <span></span>
            <span class="qty-box">
              <span class="qty">${number.format(Number(item.quantity || 0))}</span>
              <span class="qty-label">UND</span>
            </span>
            <strong>${money.format(Number(value || 0))}</strong>
          </div>
          <div class="item-detail">${escapeHtml(requestDetail)}</div>
        </div>`;
    }).join("");

    return `
      <div class="category-block">
        <div class="category-title">${escapeHtml(categoryName)}</div>
        ${itemRows}
      </div>`;
  }).join("");

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Pedido #${Number(order.id)}</title>
      <style>
        @page { size: 80mm auto; margin: 3mm; }
        * { box-sizing: border-box; }
        body { width: 74mm; margin: 0 auto; color: #111; background: #fff; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.28; }
        h1 { margin: 0; font-size: 24px; line-height: 1; text-align: center; text-transform: uppercase; }
        .branch { margin-top: 4px; text-align: center; font-size: 13px; font-weight: 900; }
        .contact { margin-top: 2px; text-align: center; font-size: 10.5px; }
        .rule { margin: 7px 0; border-top: 1px dashed #111; }
        .section-title { margin-bottom: 4px; font-size: 12px; font-weight: 900; text-transform: uppercase; }
        .meta { display: grid; gap: 2px; font-size: 11.5px; }
        .meta strong { font-size: 15px; }
        .customer-meta { gap: 3px; font-size: 13px; line-height: 1.25; }
        .customer-meta strong { font-size: 20px; line-height: 1.05; text-transform: uppercase; }
        .customer-address { font-size: 16px; font-weight: 900; line-height: 1.18; overflow-wrap: anywhere; }
        .customer-zone { font-size: 14px; font-weight: 800; line-height: 1.18; overflow-wrap: anywhere; }
        .customer-phone { font-size: 16px; font-weight: 900; line-height: 1.18; overflow-wrap: anywhere; }
        .order-number { padding: 5px; border: 1px solid #111; text-align: center; font-size: 16px; font-weight: 900; }
        .category-block { margin-top: 7px; break-inside: avoid; }
        .category-title { padding: 3px 4px; border: 1px solid #111; background: #eee; font-size: 12px; font-weight: 900; text-align: center; text-transform: uppercase; }
        .item { padding: 7px 0; border-bottom: 1px dashed #777; break-inside: avoid; }
        .item-head { display: flex; justify-content: space-between; gap: 5px; align-items: baseline; }
        .item-name { min-width: 0; font-weight: 900; font-size: 13px; overflow-wrap: anywhere; }
        .item-values { display: grid; grid-template-columns: minmax(0, 1fr) 58px auto; gap: 4px; align-items: center; margin-top: 3px; }
        .item-values strong { font-size: 12.5px; white-space: nowrap; text-align: right; }
        .qty-box { display: grid; justify-items: center; text-align: center; }
        .qty { font-size: 20px; font-weight: 900; letter-spacing: 0; line-height: 1; }
        .qty-label { font-size: 10px; font-weight: 900; line-height: 1; }
        .item-detail { margin-top: 2px; color: #333; font-size: 10px; }
        .type { flex: 0 0 auto; padding: 1px 4px; border: 1px solid #111; border-radius: 2px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; white-space: nowrap; }
        .totals { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px 8px; margin-top: 8px; font-size: 12.5px; }
        .totals strong { text-align: right; }
        .total { padding-top: 5px; border-top: 2px solid #111; font-size: 17px; font-weight: 900; }
        .policy { padding: 6px; border: 1px solid #111; font-size: 10px; line-height: 1.35; }
        .policy strong { display: block; margin-bottom: 3px; text-align: center; font-size: 11px; }
        .footer { margin-top: 8px; text-align: center; font-size: 10px; font-weight: 700; }
        @media print { body { width: 74mm; } }
      </style>
    </head>
    <body>
      <h1>Panaderia</h1>
      <div class="branch">${escapeHtml(order.branch_name)}</div>
      <div class="contact">
        ${escapeHtml(order.branch_address || "")}
        ${order.branch_phone ? `<br>Tel: ${escapeHtml(order.branch_phone)}` : ""}
      </div>
      <div class="rule"></div>
      <div class="order-number">PEDIDO #${Number(order.id)}</div>
      <div class="rule"></div>
      <div class="meta">
        <span>Fecha: ${escapeHtml(String(order.created_at || order.order_date).replace("T", " ").slice(0, 19))}</span>
        <span>Entrega: ${escapeHtml(String(order.delivery_date || "Sin fecha").slice(0, 10))}</span>
        <span>Vendedor: ${escapeHtml(order.sales_agent_name || "Sin vendedor")}</span>
      </div>
      <div class="rule"></div>
      <div class="section-title">Cliente</div>
      <div class="meta customer-meta">
        <strong>${escapeHtml(order.customer_name)}</strong>
        <span>Identificacion: ${escapeHtml(order.customer_identification || "Sin identificacion")}</span>
        <span class="customer-address">Direccion: ${escapeHtml(order.customer_address || "Sin direccion")}</span>
        <span class="customer-zone">Barrio/Zona: ${escapeHtml(order.customer_neighborhood || "Sin barrio/zona")}</span>
        <span class="customer-phone">Tel: ${escapeHtml(order.customer_phone || "Sin telefono")}</span>
      </div>
      <div class="rule"></div>
      <div class="section-title">Detalle solicitado</div>
      ${rows}
      <div class="totals">
        <span>Venta</span><strong>${money.format(saleTotal)}</strong>
        <span>Vendaje</span><strong>${money.format(Number(order.bonus_total || 0))}</strong>
        <span>Obsequio</span><strong>${money.format(Number(order.gift_total || 0))}</strong>
        <span>Cambio</span><strong>${money.format(Number(order.exchange_total || 0))}</strong>
        <span class="total">TOTAL</span><strong class="total">${money.format(Number(order.grand_total || 0))}</strong>
      </div>
      ${order.notes ? `<div class="rule"></div><div>Nota: ${escapeHtml(order.notes)}</div>` : ""}
      <div class="rule"></div>
      <div class="policy">
        <strong>POLITICA DE CAMBIOS</strong>
        Se realizan cambios por producto vencido, con moho, mojado o mal moldeado.
        La vigencia es de 15 dias desde la entrega. El inconveniente debe reportarse
        como maximo dentro de los 2 dias siguientes al vencimiento y requiere
        autorizacion del vendedor.
      </div>
      <div class="footer">Gracias por su compra</div>
    </body>
  </html>`;
};

const OrderPrintManager = ({ order, onConfirmed }) => {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  const printPreview = async () => {
    if (!order?.id || loading) return;

    const popup = window.open("", "_blank", "width=430,height=760");
    if (!popup) {
      toast.error("El navegador bloqueo la ventana de impresion");
      return;
    }

    popup.document.write("<p style='font-family:Arial;padding:20px'>Preparando comprobante...</p>");
    setLoading(true);
    try {
      const response = await ordersService.getOrderPrintData(Number(order.id));
      if (response?.code !== 1) {
        popup.close();
        toast.error(response?.message || "No se pudo preparar la impresion");
        return;
      }

      setPrintData(response.data);
      popup.document.open();
      popup.document.write(buildReceiptHtml(response.data));
      popup.document.close();
      popup.focus();
      window.setTimeout(() => {
        popup.print();
        setConfirmOpen(true);
      }, 250);
    } catch (error) {
      popup.close();
      toast.error(error?.response?.data?.message || "No se pudo preparar la impresion");
    } finally {
      setLoading(false);
    }
  };

  const confirmPrint = async () => {
    if (!order?.id || loading) return;
    setLoading(true);
    try {
      const response = await ordersService.confirmOrderPrint(Number(order.id));
      if (response?.code !== 1) {
        toast.error(response?.message || "No se pudo confirmar la impresion");
        return;
      }
      toast.success(response.message);
      setConfirmOpen(false);
      await onConfirmed?.(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "No se pudo confirmar la impresion");
    } finally {
      setLoading(false);
    }
  };

  const logs = Array.isArray(printData?.print_logs) ? printData.print_logs : [];

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<PrintRoundedIcon />}
          onClick={printPreview}
          disabled={loading || !order?.id || order?.status === "cancelled"}
        >
          {loading ? "Preparando..." : "Imprimir pedido"}
        </Button>
        <Chip
          variant="outlined"
          label={`${Number(order?.print_count || 0)} impresion(es) confirmada(s)`}
        />
      </Stack>

      <Dialog open={confirmOpen} onClose={() => !loading && setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirmar impresion del pedido #{order?.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              Confirma solamente si el comprobante salio correctamente de la impresora.
              Cerrar o cancelar esta ventana no incrementa el contador.
            </Alert>
            {logs.length ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                  Impresiones anteriores
                </Typography>
                <Stack spacing={0.75}>
                  {logs.slice(0, 5).map((log) => (
                    <Typography key={log.id} variant="body2" color="text.secondary">
                      #{log.print_number} - {log.printed_by_name || "Usuario"} - {formatDateTime(log.confirmed_at)}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setConfirmOpen(false)} disabled={loading}>
            No se imprimio
          </Button>
          <Button variant="contained" color="secondary" onClick={confirmPrint} disabled={loading}>
            {loading ? "Confirmando..." : "Si, confirmar impresion"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OrderPrintManager;
