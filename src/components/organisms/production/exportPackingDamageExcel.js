import ExcelJS from "exceljs";

const reasonLabels = { production: "Producción", oven: "Horno", cut: "Corte", packaging: "Empaque" };
const statusLabels = { matched: "Conciliado", shortage: "Con faltante", surplus: "Con sobrante" };

export const addPackingDamageWorksheet = (workbook, { rows, filters, totalsByProduct = [], totalsByReason = [] }) => {
  const sheet = workbook.addWorksheet("Daños de conteo");
  sheet.columns = [
    { header: "Fecha", key: "date", width: 14 }, { header: "Sucursal", key: "branch", width: 24 },
    { header: "Lote", key: "batch", width: 12 }, { header: "Producto", key: "product", width: 28 },
    { header: "Empaquetador", key: "packer", width: 25 }, { header: "Empacado", key: "packed", width: 14 },
    { header: "Dañado", key: "damaged", width: 14 }, { header: "Motivo", key: "reason", width: 18 },
    { header: "Detalle", key: "detail", width: 35 }, { header: "Conciliación", key: "status", width: 18 },
    { header: "Corregido", key: "corrected", width: 14 }, { header: "Auditoría de corrección", key: "audit", width: 55 },
  ];
  rows.forEach((row) => sheet.addRow({
    date: String(row.damage_date || "").slice(0, 10), branch: row.branch_name, batch: `#${row.production_batch_id}`,
    product: row.product_name, packer: row.packer_name, packed: Number(row.packed_quantity || 0),
    damaged: Number(row.damaged_quantity || 0), reason: reasonLabels[row.damage_reason] || row.damage_reason,
    detail: row.damage_detail || "", status: statusLabels[row.reconciliation_status] || row.reconciliation_status || "Pendiente",
    corrected: row.was_corrected ? "Sí" : "No",
    audit: (row.corrections || []).map((item) => `${item.original_quantity} -> ${item.corrected_quantity}; ${item.reason}; ${item.corrected_by_name}; ${item.created_at}`).join(" | "),
  }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4510B" } };
  sheet.autoFilter = { from: "A1", to: "L1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.addRow([]);
  sheet.addRow(["TOTALES POR PRODUCTO"]);
  sheet.getRow(sheet.rowCount).font = { bold: true };
  totalsByProduct.forEach((item) => sheet.addRow([item.product_name, Number(item.damaged_quantity || 0), `${item.damage_records} registro(s)`]));
  sheet.addRow([]);
  sheet.addRow(["TOTALES POR MOTIVO"]);
  sheet.getRow(sheet.rowCount).font = { bold: true };
  totalsByReason.forEach((item) => sheet.addRow([reasonLabels[item.damage_reason] || item.damage_reason, Number(item.damaged_quantity || 0), `${item.damage_records} registro(s)`]));
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return sheet;
};

const exportPackingDamageExcel = async ({ rows, filters, totalsByProduct, totalsByReason }) => {
  const workbook = new ExcelJS.Workbook();
  addPackingDamageWorksheet(workbook, { rows, filters, totalsByProduct, totalsByReason });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte-danos-${filters.dateFrom}-${filters.dateTo}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default exportPackingDamageExcel;
