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
import settingsService from "services/settings/settings-service";

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
    timeZone: "America/Bogota",
  }).format(new Date(value));
};

const formatTicketDateTime = (value) => {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).replace("T", " ").slice(0, 19);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

const lineLabels = {
  sale: "Venta",
  sale_bonus: "Venta + vendaje",
  bonus: "Solo vendaje",
  gift: "Obsequio",
  exchange: "Cambio",
};

const getItemLineLabel = (item, displayLineType) => {
  const includesBonus = [true, 1, "1", "true", "yes", "si", "sí"].includes(
    typeof item?.includes_bonus === "string"
      ? item.includes_bonus.trim().toLowerCase()
      : item?.includes_bonus
  );

  if (includesBonus && ["sale", "sale_bonus"].includes(displayLineType)) {
    return "Venta con vendaje incluido";
  }

  return lineLabels[displayLineType] || displayLineType;
};

const defaultTicketSettings = {
  businessName: "PANADERIA",
  businessSubtitle: "",
  logoDataUrl: "",
  showLogo: false,
  showBranchName: true,
  showBranchContact: true,
  showSeller: true,
  showDeliveryDate: true,
  showSaleTotal: true,
  showBonusTotal: true,
  showGiftTotal: true,
  showExchangeTotal: true,
  customerTitle: "CLIENTE",
  showCustomerName: true,
  showCustomerIdentification: true,
  showCustomerAddress: true,
  showCustomerNeighborhood: true,
  showCustomerPhone: true,
  customerIdentificationLabel: "Identificacion",
  customerAddressLabel: "Direccion",
  customerNeighborhoodLabel: "Barrio/Zona",
  customerPhoneLabel: "Tel",
  detailTitle: "DETALLE SOLICITADO",
  showProductCategories: true,
  requestedLabel: "Solicitado",
  unitLabel: "UND",
  showItemDetail: true,
  policyTitle: "POLITICA DE CAMBIOS",
  policyText:
    "Se realizan cambios por producto vencido, con moho, mojado o mal moldeado. La vigencia es de 15 dias desde la entrega. El inconveniente debe reportarse como maximo dentro de los 2 dias siguientes al vencimiento y requiere autorizacion del vendedor.",
  footerText: "Gracias por su compra",
  fontScale: "normal",
  bodyFontSize: 12,
  headerFontSize: 24,
  customerFontSize: 20,
  customerContactFontSize: 16,
  customerIdentificationFontSize: 13,
  customerAddressFontSize: 16,
  customerNeighborhoodFontSize: 15,
  customerPhoneFontSize: 16,
  productFontSize: 13,
  quantityFontSize: 20,
  totalFontSize: 17,
  subtitleFontSize: 12,
  branchFontSize: 14,
  branchContactFontSize: 11,
  orderNumberFontSize: 18,
  orderDateFontSize: 12,
  deliveryDateFontSize: 12,
  sellerFontSize: 12,
  sectionTitleFontSize: 14,
  categoryFontSize: 12,
  typeFontSize: 10,
  productValueFontSize: 13,
  quantityLabelFontSize: 10,
  itemDetailFontSize: 11,
  summaryFontSize: 13,
  policyTitleFontSize: 11,
  policyTextFontSize: 10,
  footerFontSize: 11,
  showExtraLegend: false,
  extraLegendTitle: "LEYENDA ADICIONAL",
  extraLegendText: "",
};

const numberOrFallback = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getTicketFontScale = (settings) => {
  if (settings.fontScale === "extra_large") {
    return {
      body: numberOrFallback(settings.bodyFontSize, 14),
      title: numberOrFallback(settings.headerFontSize, 29),
      branch: 15,
      section: 15,
      customer: numberOrFallback(settings.customerFontSize, 25),
      identification: numberOrFallback(settings.customerIdentificationFontSize, settings.customerContactFontSize || 13),
      address: numberOrFallback(settings.customerAddressFontSize, settings.customerContactFontSize || 19),
      neighborhood: numberOrFallback(settings.customerNeighborhoodFontSize, settings.customerContactFontSize || 15),
      phone: numberOrFallback(settings.customerPhoneFontSize, settings.customerContactFontSize || 19),
      item: numberOrFallback(settings.productFontSize, 15),
      qty: numberOrFallback(settings.quantityFontSize, 24),
      total: numberOrFallback(settings.totalFontSize, 20),
    };
  }

  if (settings.fontScale === "large") {
    return {
      body: numberOrFallback(settings.bodyFontSize, 13),
      title: numberOrFallback(settings.headerFontSize, 27),
      branch: 14,
      section: 14,
      customer: numberOrFallback(settings.customerFontSize, 23),
      identification: numberOrFallback(settings.customerIdentificationFontSize, settings.customerContactFontSize || 13),
      address: numberOrFallback(settings.customerAddressFontSize, settings.customerContactFontSize || 18),
      neighborhood: numberOrFallback(settings.customerNeighborhoodFontSize, settings.customerContactFontSize || 15),
      phone: numberOrFallback(settings.customerPhoneFontSize, settings.customerContactFontSize || 18),
      item: numberOrFallback(settings.productFontSize, 14),
      qty: numberOrFallback(settings.quantityFontSize, 22),
      total: numberOrFallback(settings.totalFontSize, 19),
    };
  }

  return {
    body: numberOrFallback(settings.bodyFontSize, 12),
    title: numberOrFallback(settings.headerFontSize, 24),
    branch: 13,
    section: 12,
    customer: numberOrFallback(settings.customerFontSize, 20),
    identification: numberOrFallback(settings.customerIdentificationFontSize, settings.customerContactFontSize || 13),
    address: numberOrFallback(settings.customerAddressFontSize, settings.customerContactFontSize || 16),
    neighborhood: numberOrFallback(settings.customerNeighborhoodFontSize, settings.customerContactFontSize || 15),
    phone: numberOrFallback(settings.customerPhoneFontSize, settings.customerContactFontSize || 16),
    item: numberOrFallback(settings.productFontSize, 13),
    qty: numberOrFallback(settings.quantityFontSize, 20),
    total: numberOrFallback(settings.totalFontSize, 17),
  };
};

const mergeTicketSettings = (settings) => ({
  ...defaultTicketSettings,
  ...(settings || {}),
});


const getItemProductKey = (item) => String(item.product_id || item.product_name || "");
const belongsToSameSaleGroup = (sale, bonus) => {
  const saleGroup = String(sale?.line_group_key || "");
  const bonusGroup = String(bonus?.line_group_key || "");
  if (saleGroup && bonusGroup && !saleGroup.startsWith("legacy-") && !bonusGroup.startsWith("legacy-")) {
    return saleGroup === bonusGroup;
  }
  return getItemProductKey(sale) === getItemProductKey(bonus);
};

const mergeSaleBonusDisplayItems = (items = []) => {
  const usedBonusIndexes = new Set();

  return items.reduce((acc, item, index) => {
    if (usedBonusIndexes.has(index)) return acc;

    if (item.line_type !== "sale") {
      acc.push(item);
      return acc;
    }

    const bonusIndex = items.findIndex((candidate, candidateIndex) =>
      candidateIndex > index &&
      !usedBonusIndexes.has(candidateIndex) &&
      candidate.line_type === "bonus" &&
      belongsToSameSaleGroup(item, candidate)
    );

    if (bonusIndex === -1) {
      acc.push(item);
      return acc;
    }

    const bonusItem = items[bonusIndex];
    usedBonusIndexes.add(bonusIndex);

    acc.push({
      ...item,
      display_line_type: "sale_bonus",
      display_quantity: Number(item.quantity || 0) + Number(bonusItem.quantity || 0),
      display_value: Number(item.line_total || 0),
      display_request_detail: "",
    });

    return acc;
  }, []);
};

const calculateVisibleBonusTotal = (items = [], bonusPercent = 0) => {
  const usedSaleIndexes = new Set();

  return items.reduce((total, item, bonusIndex) => {
    if (item.line_type !== "bonus") return total;

    const saleIndex = items.findIndex((candidate, candidateIndex) =>
      candidateIndex < bonusIndex &&
      !usedSaleIndexes.has(candidateIndex) &&
      candidate.line_type === "sale" &&
      getItemProductKey(candidate) === getItemProductKey(item)
    );
    const deliveredValue = Number(item.commercial_value || 0);

    if (saleIndex === -1) return total + deliveredValue;

    usedSaleIndexes.add(saleIndex);
    const generatedValue = Number(items[saleIndex].line_total || 0) * (Number(bonusPercent || 0) / 100);
    return total + Math.min(deliveredValue, generatedValue);
  }, 0);
};

const buildReceiptHtml = ({ order, items }, settings = defaultTicketSettings) => {
  const ticketSettings = mergeTicketSettings(settings);
  const scale = {
    ...getTicketFontScale(ticketSettings),
    subtitle: numberOrFallback(ticketSettings.subtitleFontSize, 12),
    branch: numberOrFallback(ticketSettings.branchFontSize, 14),
    branchContact: numberOrFallback(ticketSettings.branchContactFontSize, 11),
    orderNumber: numberOrFallback(ticketSettings.orderNumberFontSize, 18),
    orderDate: numberOrFallback(ticketSettings.orderDateFontSize, 12),
    deliveryDate: numberOrFallback(ticketSettings.deliveryDateFontSize, 12),
    seller: numberOrFallback(ticketSettings.sellerFontSize, 12),
    section: numberOrFallback(ticketSettings.sectionTitleFontSize, 14),
    category: numberOrFallback(ticketSettings.categoryFontSize, 12),
    type: numberOrFallback(ticketSettings.typeFontSize, 10),
    productValue: numberOrFallback(ticketSettings.productValueFontSize, 13),
    quantityLabel: numberOrFallback(ticketSettings.quantityLabelFontSize, 10),
    itemDetail: numberOrFallback(ticketSettings.itemDetailFontSize, 11),
    summary: numberOrFallback(ticketSettings.summaryFontSize, 13),
    policyTitle: numberOrFallback(ticketSettings.policyTitleFontSize, 11),
    policyText: numberOrFallback(ticketSettings.policyTextFontSize, 10),
    footer: numberOrFallback(ticketSettings.footerFontSize, 11),
  };
  const saleTotal = items
    .filter((item) => item.line_type === "sale")
    .reduce((total, item) => total + Number(item.line_total || 0), 0);
  const visibleBonusTotal = calculateVisibleBonusTotal(items, order.bonus_percent);
  const displayItems = mergeSaleBonusDisplayItems(items);

  const groupedItems = displayItems.reduce((groups, item) => {
    const categoryName = item.category_name || "Sin categoria";
    if (!groups.has(categoryName)) {
      groups.set(categoryName, []);
    }
    groups.get(categoryName).push(item);
    return groups;
  }, new Map());

  const rows = Array.from(groupedItems.entries()).map(([categoryName, categoryItems]) => {
    const itemRows = categoryItems.map((item) => {
      const displayLineType = item.display_line_type || item.line_type;
      const displayLineLabel = getItemLineLabel(item, displayLineType);
      const displayQuantity = item.display_quantity ?? item.quantity;
      const value = item.display_value ?? (item.line_type === "sale" ? item.line_total : item.commercial_value);
      const requestDetail = item.display_request_detail ?? (item.capture_mode === "amount" && item.requested_amount
        ? `${ticketSettings.requestedLabel || "Solicitado"}: ${money.format(Number(item.requested_amount || 0))}`
        : `Precio unitario: ${money.format(Number(item.unit_price || 0))}`);

      return `
        <div class="item">
          <div class="item-main">
            <div class="item-head">
              <span class="item-name">${escapeHtml(item.product_name)}</span>
              <span class="type type-${escapeHtml(displayLineType)}">${escapeHtml(displayLineLabel)}</span>
            </div>
            <span class="qty-box">
              <span class="qty">${number.format(Number(displayQuantity || 0))}</span>
              <span class="qty-label">${escapeHtml(ticketSettings.unitLabel || "UND")}</span>
            </span>
            <strong class="item-value">${money.format(Number(value || 0))}</strong>
          </div>
          ${ticketSettings.showItemDetail && requestDetail ? `<div class="item-detail">${escapeHtml(requestDetail)}</div>` : ""}
        </div>`;
    }).join("");

    return `
      <div class="category-block${ticketSettings.showProductCategories ? "" : " category-hidden"}">
        ${ticketSettings.showProductCategories ? `<div class="category-title">${escapeHtml(categoryName)}</div>` : ""}
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
        body { width: 74mm; margin: 0 auto; color: #111; background: #fff; font-family: Arial, sans-serif; font-size: ${scale.body}px; line-height: 1.28; }
        h1 { margin: 0; font-size: ${scale.title}px; line-height: 1; text-align: center; text-transform: uppercase; }
        .logo { display: block; max-width: 34mm; max-height: 22mm; object-fit: contain; margin: 0 auto 3px; }
        .subtitle { margin-top: 2px; text-align: center; font-size: ${scale.subtitle}px; font-weight: 700; }
        .branch { margin-top: 4px; text-align: center; font-size: ${scale.branch}px; font-weight: 900; }
        .contact { margin-top: 2px; text-align: center; font-size: ${scale.branchContact}px; }
        .rule { margin: 7px 0; border-top: 1px dashed #111; }
        .section-title { margin-bottom: 4px; font-size: ${scale.section}px; font-weight: 900; text-transform: uppercase; }
        .meta { display: grid; gap: 2px; }
        .order-date { font-size: ${scale.orderDate}px; }
        .delivery-date { font-size: ${scale.deliveryDate}px; }
        .seller { font-size: ${scale.seller}px; }
        .meta strong { font-size: 15px; }
        .customer-meta { gap: 3px; font-size: 13px; line-height: 1.25; }
        .customer-meta strong { font-size: ${scale.customer}px; line-height: 1.05; text-transform: uppercase; }
        .customer-id { font-size: ${scale.identification}px; line-height: 1.18; overflow-wrap: anywhere; }
        .customer-address { font-size: ${scale.address}px; font-weight: 900; line-height: 1.18; overflow-wrap: anywhere; }
        .customer-zone { font-size: ${scale.neighborhood}px; font-weight: 800; line-height: 1.18; overflow-wrap: anywhere; }
        .customer-phone { font-size: ${scale.phone}px; font-weight: 900; line-height: 1.18; overflow-wrap: anywhere; }
        .order-number { padding: 5px; border: 1px solid #111; text-align: center; font-size: ${scale.orderNumber}px; font-weight: 900; }
        .category-block { margin-top: 7px; break-inside: avoid; }
        .category-block.category-hidden { margin-top: 0; }
        .category-title { padding: 3px 4px; border: 1px solid #111; background: #eee; font-size: ${scale.category}px; font-weight: 900; text-align: center; text-transform: uppercase; }
        .item { padding: 7px 0 6px; border-bottom: 1px dashed #777; break-inside: avoid; }
        .item-main { display: grid; grid-template-columns: minmax(0, 1fr) 42px minmax(19mm, auto); gap: 5px; align-items: center; }
        .item-head { display: grid; min-width: 0; justify-items: start; gap: 3px; }
        .item-name { min-width: 0; font-weight: 900; font-size: ${scale.item}px; overflow-wrap: anywhere; }
        .item-value { font-size: ${scale.productValue}px; white-space: nowrap; text-align: right; }
        .qty-box { display: grid; justify-items: center; text-align: center; }
        .qty { font-size: ${scale.qty}px; font-weight: 900; letter-spacing: 0; line-height: 1; }
        .qty-label { font-size: ${scale.quantityLabel}px; font-weight: 900; line-height: 1; }
        .item-detail { margin-top: 2px; color: #333; font-size: ${scale.itemDetail}px; }
        .type { display: inline-block; max-width: 100%; padding: 1px 4px; border: 1px solid #111; border-radius: 2px; font-size: ${scale.type}px; font-weight: 900; line-height: 1.12; text-transform: uppercase; overflow-wrap: anywhere; }
        .totals { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px 8px; margin-top: 8px; font-size: ${scale.summary}px; }
        .totals strong { text-align: right; }
        .total { padding-top: 5px; border-top: 2px solid #111; font-size: ${scale.total}px; font-weight: 900; }
        .policy { padding: 6px; border: 1px solid #111; font-size: ${scale.policyText}px; line-height: 1.35; }
        .policy strong { display: block; margin-bottom: 3px; text-align: center; font-size: ${scale.policyTitle}px; }
        .footer { margin-top: 8px; text-align: center; font-size: ${scale.footer}px; font-weight: 700; }
        @media print { body { width: 74mm; } }
      </style>
    </head>
    <body>
      ${ticketSettings.showLogo && ticketSettings.logoDataUrl ? `<img class="logo" src="${escapeHtml(ticketSettings.logoDataUrl)}" alt="Logo" />` : ""}
      <h1>${escapeHtml(ticketSettings.businessName || defaultTicketSettings.businessName)}</h1>
      ${ticketSettings.businessSubtitle ? `<div class="subtitle">${escapeHtml(ticketSettings.businessSubtitle)}</div>` : ""}
      ${ticketSettings.showBranchName ? `<div class="branch">${escapeHtml(order.branch_name)}</div>` : ""}
      ${ticketSettings.showBranchContact ? `<div class="contact">
        ${escapeHtml(order.branch_address || "")}
        ${order.branch_phone ? `<br>Tel: ${escapeHtml(order.branch_phone)}` : ""}
      </div>` : ""}
      <div class="rule"></div>
      <div class="order-number">PEDIDO #${Number(order.id)}</div>
      <div class="rule"></div>
      <div class="meta">
        <span class="order-date">Fecha: ${escapeHtml(formatTicketDateTime(order.created_at || order.order_date))}</span>
        ${ticketSettings.showDeliveryDate ? `<span class="delivery-date">Entrega: ${escapeHtml(String(order.delivery_date || "Sin fecha").slice(0, 10))}</span>` : ""}
        ${ticketSettings.showSeller ? `<span class="seller">Vendedor: ${escapeHtml(order.sales_agent_name || "Sin vendedor")}</span>` : ""}
      </div>
      <div class="rule"></div>
      <div class="section-title">${escapeHtml(ticketSettings.customerTitle || defaultTicketSettings.customerTitle)}</div>
      <div class="meta customer-meta">
        ${ticketSettings.showCustomerName ? `<strong>${escapeHtml(order.customer_name)}</strong>` : ""}
        ${ticketSettings.showCustomerIdentification ? `<span class="customer-id">${escapeHtml(ticketSettings.customerIdentificationLabel || defaultTicketSettings.customerIdentificationLabel)}: ${escapeHtml(order.customer_identification || "Sin identificacion")}</span>` : ""}
        ${ticketSettings.showCustomerAddress ? `<span class="customer-address">${escapeHtml(ticketSettings.customerAddressLabel || defaultTicketSettings.customerAddressLabel)}: ${escapeHtml(order.customer_address || "Sin direccion")}</span>` : ""}
        ${ticketSettings.showCustomerNeighborhood ? `<span class="customer-zone">${escapeHtml(ticketSettings.customerNeighborhoodLabel || defaultTicketSettings.customerNeighborhoodLabel)}: ${escapeHtml(order.customer_neighborhood || "Sin barrio/zona")}</span>` : ""}
        ${ticketSettings.showCustomerPhone ? `<span class="customer-phone">${escapeHtml(ticketSettings.customerPhoneLabel || defaultTicketSettings.customerPhoneLabel)}: ${escapeHtml(order.customer_phone || "Sin telefono")}</span>` : ""}
      </div>
      <div class="rule"></div>
      <div class="section-title">${escapeHtml(ticketSettings.detailTitle || defaultTicketSettings.detailTitle)}</div>
      ${rows}
      <div class="totals">
        ${ticketSettings.showSaleTotal ? `<span>Venta</span><strong>${money.format(saleTotal)}</strong>` : ""}
        ${ticketSettings.showBonusTotal ? `<span>Vendaje</span><strong>${money.format(visibleBonusTotal)}</strong>` : ""}
        ${ticketSettings.showGiftTotal ? `<span>Obsequio</span><strong>${money.format(Number(order.gift_total || 0))}</strong>` : ""}
        ${ticketSettings.showExchangeTotal ? `<span>Cambio</span><strong>${money.format(Number(order.exchange_total || 0))}</strong>` : ""}
        ${Number(order.credit_redeemed_amount || 0) > 0 ? `<span>Saldo a favor aplicado</span><strong>-${money.format(Number(order.credit_redeemed_amount || 0))}</strong>` : ""}
        <span class="total">TOTAL A COBRAR</span><strong class="total">${money.format(Number(order.amount_to_collect ?? order.grand_total ?? 0))}</strong>
      </div>
      ${order.notes ? `<div class="rule"></div><div>Nota: ${escapeHtml(order.notes)}</div>` : ""}
      <div class="rule"></div>
      <div class="policy">
        <strong>${escapeHtml(ticketSettings.policyTitle || defaultTicketSettings.policyTitle)}</strong>
        ${escapeHtml(ticketSettings.policyText || defaultTicketSettings.policyText)}
      </div>
      ${ticketSettings.showExtraLegend && ticketSettings.extraLegendText ? `<div class="rule"></div>
      <div class="policy">
        <strong>${escapeHtml(ticketSettings.extraLegendTitle || defaultTicketSettings.extraLegendTitle)}</strong>
        ${escapeHtml(ticketSettings.extraLegendText)}
      </div>` : ""}
      <div class="footer">${escapeHtml(ticketSettings.footerText || defaultTicketSettings.footerText)}</div>
    </body>
  </html>`;
};

const OrderPrintManager = ({ order, onConfirmed, compact = false, triggerLabel = "Imprimir pedido" }) => {
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
      const [response, settingsResponse] = await Promise.all([
        ordersService.getOrderPrintData(Number(order.id)),
        settingsService.getPosTicketSettings().catch(() => null),
      ]);
      if (response?.code !== 1) {
        popup.close();
        toast.error(response?.message || "No se pudo preparar la impresion");
        return;
      }

      setPrintData(response.data);
      popup.document.open();
      popup.document.write(buildReceiptHtml(response.data, settingsResponse?.data));
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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          variant={compact ? "outlined" : "contained"}
          color="secondary"
          size={compact ? "small" : "medium"}
          startIcon={compact ? null : <PrintRoundedIcon />}
          onClick={printPreview}
          disabled={loading || !order?.id || order?.status === "cancelled"}
          sx={compact ? { whiteSpace: "nowrap", minWidth: 92 } : undefined}
        >
          {loading ? "Preparando..." : triggerLabel}
        </Button>
        {!compact ? (
          <Chip
            variant="outlined"
            label={`${Number(order?.print_count || 0)} impresion(es) confirmada(s)`}
          />
        ) : null}
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
