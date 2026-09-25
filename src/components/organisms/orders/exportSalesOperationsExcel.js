import ExcelJS from "exceljs";

const moneyFormat = '$#,##0';

const downloadBuffer = (buffer, filename) => {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const styleHeader = (row) => {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4510B" } };
};

const exportSalesOperationsExcel = async ({ items, totalsBySeller, totalsByProduct, filters }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Panadería";

  const detail = workbook.addWorksheet("Detalle");
  detail.columns = [
    { header: "Fecha", key: "date", width: 14 },
    { header: "Tipo", key: "type", width: 15 },
    { header: "Pedido original", key: "order", width: 18 },
    { header: "Vendedor", key: "seller", width: 24 },
    { header: "Cliente", key: "customer", width: 28 },
    { header: "Tipo de venta", key: "priceType", width: 18 },
    { header: "Lista de precios", key: "priceList", width: 24 },
    { header: "Producto recibido", key: "received", width: 28 },
    { header: "Producto físico recibido", key: "receivedPhysical", width: 30 },
    { header: "Cantidad recibida", key: "receivedQty", width: 18 },
    { header: "Producto entregado como reemplazo", key: "delivered", width: 35 },
    { header: "Producto físico entregado", key: "deliveredPhysical", width: 30 },
    { header: "Cantidad entregada", key: "deliveredQty", width: 20 },
    { header: "Precio aplicado", key: "price", width: 18 },
    { header: "Precio congelado pedido original", key: "originalPrice", width: 28 },
    { header: "Valor total", key: "total", width: 18 },
    { header: "Motivo", key: "reason", width: 20 },
    { header: "Registrado por", key: "user", width: 24 },
    { header: "Estado", key: "status", width: 20 },
  ];
  styleHeader(detail.getRow(1));
  items.forEach((item) => detail.addRow({
    date: String(item.operation_date || "").slice(0, 10),
    type: item.operation_type === "exchange" ? "Cambio" : item.operation_type === "return" ? "Devolución" : "Obsequio",
    order: item.original_order_id || "—",
    seller: item.sales_agent_name || "—",
    customer: item.customer_name || "—",
    priceType: item.customer_price_type === "wholesale" ? "Mayorista" : "Regular",
    priceList: item.wholesale_price_list_name || "No aplica",
    received: item.received_product_name || "—",
    receivedPhysical: item.received_physical_product_name || "—",
    receivedQty: Number(item.received_quantity || 0),
    delivered: item.delivered_product_name || "—",
    deliveredPhysical: item.delivered_physical_product_name || "—",
    deliveredQty: Number(item.delivered_quantity || 0),
    price: Number(item.applied_unit_price || 0),
    originalPrice: Number(item.original_applied_unit_price || 0),
    total: Number(item.total_value || 0),
    reason: item.reason || "—",
    user: item.registered_by_name || "—",
    status: item.status || "—",
  }));
  detail.getColumn("price").numFmt = moneyFormat;
  detail.getColumn("originalPrice").numFmt = moneyFormat;
  detail.getColumn("total").numFmt = moneyFormat;
  detail.autoFilter = { from: "A1", to: "S1" };

  const addSummary = (name, rows, productMode = false) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = productMode
      ? [
          { header: "Producto físico", key: "name", width: 30 }, { header: "Tipo", key: "type", width: 15 },
          { header: "Tipo de venta", key: "priceType", width: 18 },
          { header: "Resultados", key: "count", width: 14 }, { header: "Recibidos", key: "received", width: 15 },
          { header: "Entregados", key: "delivered", width: 15 }, { header: "Valor total", key: "total", width: 18 },
        ]
      : [
          { header: "Vendedor", key: "name", width: 30 }, { header: "Resultados", key: "count", width: 14 },
          { header: "Recibidos", key: "received", width: 15 }, { header: "Entregados", key: "delivered", width: 15 },
          { header: "Valor total", key: "total", width: 18 },
        ];
    styleHeader(sheet.getRow(1));
    rows.forEach((row) => sheet.addRow({
      name: productMode ? row.product_name : row.sales_agent_name,
      type: productMode ? (row.operation_type === "exchange" ? "Cambio" : row.operation_type === "return" ? "Devolución" : "Obsequio") : undefined,
      priceType: productMode ? (row.customer_price_type === "wholesale" ? "Mayorista" : "Regular") : undefined,
      count: Number(row.result_count || 0), received: Number(row.received_quantity || 0),
      delivered: Number(row.delivered_quantity || 0), total: Number(row.total_value || 0),
    }));
    sheet.getColumn("total").numFmt = moneyFormat;
  };
  addSummary("Totales por vendedor", totalsBySeller || []);
  addSummary("Totales por producto", totalsByProduct || [], true);

  const buffer = await workbook.xlsx.writeBuffer();
  const suffix = filters?.dateFrom || new Date().toISOString().slice(0, 10);
  downloadBuffer(buffer, `reporte-cambios-devoluciones-${suffix}.xlsx`);
};

export default exportSalesOperationsExcel;
