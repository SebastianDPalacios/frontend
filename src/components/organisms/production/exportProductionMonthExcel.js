const colors = {
  navy: "FF111827",
  orange: "FFDD5D2A",
  white: "FFFFFFFF",
  border: "FFD1D5DB",
  soft: "FFF8FAFC",
  softOrange: "FFFFF1E8",
  softGreen: "FFEAF7EA",
};

const border = {
  top: { style: "thin", color: { argb: colors.border } },
  left: { style: "thin", color: { argb: colors.border } },
  bottom: { style: "thin", color: { argb: colors.border } },
  right: { style: "thin", color: { argb: colors.border } },
};

const formatDate = (value) => {
  const [year, month, day] = String(value || "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value || "";
};

const monthLabel = (monthValue) => {
  const [year, month] = String(monthValue || "").split("-");
  const date = new Date(Number(year || 0), Number(month || 1) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return String(monthValue || "");
  }

  return date.toLocaleDateString("es-CO", { month: "long", year: "numeric" }).toUpperCase();
};

const styleCell = (cell, options = {}) => {
  cell.border = border;
  cell.alignment = {
    vertical: "middle",
    horizontal: options.horizontal || "left",
    wrapText: true,
  };

  if (options.bold) {
    cell.font = { ...(cell.font || {}), bold: true };
  }

  if (options.fill) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: options.fill },
    };
  }
};

const addSection = (worksheet, title, headers, rows, options = {}) => {
  const columnCount = headers.length;
  const titleRowNumber = worksheet.rowCount + 1;

  worksheet.mergeCells(titleRowNumber, 1, titleRowNumber, columnCount);
  const titleCell = worksheet.getCell(titleRowNumber, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, color: { argb: colors.white } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: options.titleFill || colors.orange },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleCell.border = border;
  worksheet.getRow(titleRowNumber).height = 22;

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => styleCell(cell, { bold: true, fill: options.headerFill || colors.soft }));

  rows.forEach((values, rowIndex) => {
    const row = worksheet.addRow(values);
    row.height = 22;
    row.eachCell((cell, columnNumber) => {
      styleCell(cell, { fill: rowIndex % 2 === 1 ? colors.soft : undefined });

      if (options.currencyColumns?.includes(columnNumber)) {
        cell.numFmt = '"$" #,##0';
      } else if (options.percentColumns?.includes(columnNumber)) {
        cell.numFmt = "0%";
      } else if (options.decimalColumns?.includes(columnNumber)) {
        cell.numFmt = "#,##0.###";
      }
    });
  });

  return {
    firstDataRow: titleRowNumber + 2,
    lastDataRow: titleRowNumber + 1 + rows.length,
  };
};

const addSheetHeader = (worksheet, title, subtitle, columnCount) => {
  worksheet.mergeCells(1, 1, 1, columnCount);
  worksheet.getCell(1, 1).value = title;
  worksheet.getCell(1, 1).font = {
    bold: true,
    size: 16,
    color: { argb: colors.navy },
  };
  worksheet.getCell(1, 1).alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getRow(1).height = 26;

  worksheet.mergeCells(2, 1, 2, columnCount);
  worksheet.getCell(2, 1).value = subtitle;
  worksheet.getCell(2, 1).font = { color: { argb: "FF4B5563" }, bold: true };
  worksheet.getCell(2, 1).alignment = { vertical: "middle", horizontal: "center" };
};

const addBlankRows = (worksheet, count = 1) => {
  Array.from({ length: count }).forEach(() => worksheet.addRow([]));
};

const sumBy = (rows, field) => rows.reduce((total, row) => total + Number(row?.[field] || 0), 0);

const buildReturnsMatrix = (rows, valueField, salesUsers = []) => {
  const sellers = [];
  const sellerKeys = new Set();
  const products = new Map();

  const addSeller = (seller) => {
    const sellerKey = String(seller.sales_agent_user_id || seller.sales_agent_name || "");
    if (!sellerKey || sellerKeys.has(sellerKey)) return;

    sellerKeys.add(sellerKey);
    sellers.push({
      key: sellerKey,
      name: seller.sales_agent_name || "Sin vendedor",
    });
  };

  salesUsers.forEach(addSeller);

  rows.forEach((row) => {
    const sellerKey = String(row.sales_agent_user_id || row.sales_agent_name || "");
    addSeller(row);

    const productKey = String(row.product_id || row.product_name || "");
    if (!products.has(productKey)) {
      products.set(productKey, {
        name: row.product_name || "Producto",
        sku: row.product_sku || "",
        values: {},
      });
    }

    const product = products.get(productKey);
    product.values[sellerKey] = Number(product.values[sellerKey] || 0) + Number(row[valueField] || 0);
  });

  const matrixRows = Array.from(products.values()).map((product) => {
    const sellerValues = sellers.map((seller) => Number(product.values[seller.key] || 0));
    return [
      product.name,
      product.sku,
      ...sellerValues,
      sellerValues.reduce((total, value) => total + value, 0),
    ];
  });

  const totalRow = [
    "TOTAL",
    "",
    ...sellers.map((seller) => matrixRows.reduce((total, row) => total + Number(row[2 + sellers.indexOf(seller)] || 0), 0)),
  ];
  totalRow.push(totalRow.slice(2).reduce((total, value) => total + Number(value || 0), 0));

  return {
    headers: ["PRODUCTOS", "SKU", ...sellers.map((seller) => seller.name.toUpperCase()), "TOTAL"],
    rows: matrixRows.length ? [...matrixRows, totalRow] : [["Sin devoluciones", "", ...sellers.map(() => 0), 0]],
    sellers,
  };
};

const addInventorySection = (worksheet, title, rows) => {
  const section = addSection(
    worksheet,
    title,
    ["Producto", "Categoria", "Cantidad", "Unidad", "Valor unitario", "Total"],
    rows.map((item) => [
      item.item_name || "",
      item.category_name || "",
      Number(item.quantity_on_hand || 0),
      item.unit || "",
      Number(item.unit_cost || 0),
      Number(item.total_value || 0),
    ]),
    { decimalColumns: [3], currencyColumns: [5, 6], headerFill: colors.softOrange }
  );

  const totalRow = worksheet.addRow(["TOTAL", "", "", "", "", sumBy(rows, "total_value")]);
  totalRow.eachCell((cell, columnNumber) => {
    styleCell(cell, { bold: true, fill: colors.soft });
    if (columnNumber === 6) {
      cell.numFmt = '"$" #,##0';
    }
  });

  return section;
};

const downloadWorkbook = (filename, content) => {
  const blob = new Blob([content], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportProductionMonthExcel = async ({
  filters,
  reportRange,
  selectedBranchName,
  selectedRecipeName,
  summary,
  produced,
  packed,
  damaged,
  missing,
  pending,
  progress,
  report,
  flourDailyUsage = [],
  selectedFlourName = "Todas las harinas",
  bakerSummary,
  formatMaterialEquivalent,
}) => {
  const excelModule = await import("exceljs");
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Panaderia";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Produccion ${filters.month}`);
  worksheet.views = [{ state: "frozen", ySplit: 4 }];
  [34, 20, 28, 18, 16, 18, 18, 18, 18, 16, 16, 16, 18, 14].forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  worksheet.mergeCells("A1:G1");
  worksheet.getCell("A1").value = "Reporte mensual de produccion";
  worksheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: colors.navy },
  };
  worksheet.getCell("A1").alignment = {
    vertical: "middle",
    horizontal: "left",
  };
  worksheet.getRow(1).height = 26;

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value = "Generado desde Panaderia";
  worksheet.getCell("A2").font = { color: { argb: "FF4B5563" } };

  addSection(
    worksheet,
    "Filtros",
    ["Campo", "Valor"],
    [
      ["Mes", filters.month],
      ["Desde", formatDate(reportRange.from)],
      ["Hasta", formatDate(reportRange.to)],
      ["Sucursal", selectedBranchName],
      ["Receta", selectedRecipeName],
    ]
  );

  const summarySection = addSection(
    worksheet,
    "Resumen",
    ["Indicador", "Valor"],
    [
      ["Lotes de producción", Number(summary.batches_count || 0)],
      ["Bultos realizados", Number(summary.batch_quantity || 0)],
      ["Fabricados", produced],
      ["Empacados", packed],
      ["Danados", damaged],
      ["Faltantes justificados", missing],
      ["Pendientes", pending],
      ["Avance", progress / 100],
      ["Costo estimado", Number(report.estimated_cost || 0)],
    ],
    { decimalColumns: [2] }
  );

  worksheet.getCell(summarySection.firstDataRow + 7, 2).numFmt = "0%";
  worksheet.getCell(summarySection.firstDataRow + 8, 2).numFmt = '"$" #,##0';

  addSection(
    worksheet,
    "Productos",
    ["Producto", "Lotes de producción", "Fabricados", "Empacados", "Danados", "Faltantes", "Pendientes"],
    report.products.map((product) => [
      product.product_name || "",
      Number(product.batches_count || 0),
      Number(product.produced_quantity || 0),
      Number(product.packed_quantity || 0),
      Number(product.damaged_quantity || 0),
      Number(product.missing_quantity || 0),
      Number(product.pending_quantity || 0),
    ]),
    { decimalColumns: [2, 3, 4, 5, 6, 7], headerFill: colors.softOrange }
  );

  addSection(
    worksheet,
    "Planificacion y resultado por producto",
    ["Fecha", "Panadero", "Producto", "Formato", "Solicitud", "Arrobas estimadas", "Unidades estimadas", "Estado", "Arrobas reales", "Producido", "Empacado", "Latas reales", "Unidades por lata", "Sueltas"],
    (report.plan_products || []).map((product) => [
      formatDate(product.planned_date),
      product.baker_name || "",
      product.product_name || "",
      product.planning_format === "legacy" ? "Plan anterior" : (product.request_mode === "units" ? "Por unidades" : "Por arrobas"),
      Number(product.requested_quantity || 0),
      Number(product.planned_arrobas || 0),
      Number(product.estimated_units || 0),
      product.product_status || "",
      product.actual_arrobas == null ? "" : Number(product.actual_arrobas),
      Number(product.batch_produced_quantity || product.produced_quantity || 0),
      Number(product.packed_quantity || 0),
      product.actual_tray_count == null ? "" : Number(product.actual_tray_count),
      product.actual_units_per_tray == null ? "" : Number(product.actual_units_per_tray),
      product.actual_loose_units == null ? "" : Number(product.actual_loose_units),
    ]),
    { decimalColumns: [5, 6, 7, 9, 10, 11, 12, 13, 14], headerFill: colors.softGreen }
  );

  addSection(
    worksheet,
    "Insumos usados por receta",
    ["Receta", "Materia prima", "Total usado", "Unidad", "Equivalencia", "Costo"],
    report.recipe_materials_usage.map((material) => [
      material.recipe_name || "",
      material.raw_material_name || "",
      Number(material.total_quantity || 0),
      material.raw_material_unit === "ml" ? "ml" : "g",
      formatMaterialEquivalent(material),
      Number(material.total_cost || 0),
    ]),
    { currencyColumns: [6], decimalColumns: [3] }
  );

  addSection(
    worksheet,
    "Panaderos",
    ["Panadero", "Lotes de producción", "Bultos realizados", "Fabricados", "Empacados", "Danados", "Faltantes"],
    bakerSummary.map((baker) => [
      baker.baker_name || "",
      Number(baker.batches_count || 0),
      Number(baker.batch_quantity || 0),
      Number(baker.produced_quantity || 0),
      Number(baker.packed_quantity || 0),
      Number(baker.damaged_quantity || 0),
      Number(baker.missing_quantity || 0),
    ]),
    { decimalColumns: [2, 3, 4, 5, 6, 7] }
  );

  addSection(
    worksheet,
    "Empacadores",
    ["Empacador", "Reportes", "Empacados", "Dañados", "Faltantes"],
    report.packers.map((packer) => [
      packer.packer_name || "",
      Number(packer.reports_count || 0),
      Number(packer.packed_quantity || 0),
      Number(packer.damaged_quantity || 0),
      Number(packer.missing_quantity || 0),
    ]),
    { decimalColumns: [2, 3, 4, 5] }
  );

  const flourWorksheet = workbook.addWorksheet(`Harinas ${filters.month}`);
  flourWorksheet.views = [{ state: "frozen", ySplit: 4 }];
  [16, 34, 18, 18, 16, 24].forEach((width, index) => {
    flourWorksheet.getColumn(index + 1).width = width;
  });

  flourWorksheet.mergeCells("A1:F1");
  flourWorksheet.getCell("A1").value = "Consumo diario de harina";
  flourWorksheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: colors.navy },
  };
  flourWorksheet.getCell("A1").alignment = {
    vertical: "middle",
    horizontal: "left",
  };
  flourWorksheet.getRow(1).height = 26;

  flourWorksheet.mergeCells("A2:F2");
  flourWorksheet.getCell("A2").value = "Resumen dia por dia del mes";
  flourWorksheet.getCell("A2").font = { color: { argb: "FF4B5563" } };

  addSection(
    flourWorksheet,
    "Filtros",
    ["Campo", "Valor"],
    [
      ["Mes", filters.month],
      ["Desde", formatDate(reportRange.from)],
      ["Hasta", formatDate(reportRange.to)],
      ["Sucursal", selectedBranchName],
      ["Receta", selectedRecipeName],
      ["Harina", selectedFlourName],
    ]
  );

  addSection(
    flourWorksheet,
    `Produccion por bultos ${monthLabel(filters.month)}`,
    ["Fecha", "Cantidad gramos", "Bultos"],
    Array.from(
      flourDailyUsage.reduce((days, material) => {
        const key = String(material.usage_date || "").slice(0, 10);
        if (!key) {
          return days;
        }

        const current = days.get(key) || { usage_date: key, total_grams: 0, bags_used: 0 };
        current.total_grams += Number(material.total_grams || 0);
        current.bags_used += Number(material.bags_used || 0);
        days.set(key, current);
        return days;
      }, new Map()).values()
    ).map((day) => [
      formatDate(day.usage_date),
      Number(day.total_grams || 0),
      Number(day.bags_used || 0),
    ]),
    { decimalColumns: [2, 3], headerFill: colors.softGreen }
  );

  addBlankRows(flourWorksheet);

  addSection(
    flourWorksheet,
    "Harinas",
    ["Fecha", "Harina", "Gramos", "Kilos", "Bultos", "Presentacion"],
    flourDailyUsage.map((material) => [
      formatDate(material.usage_date),
      material.raw_material_name || "",
      Number(material.total_grams || 0),
      Number(material.total_kilos || 0),
      material.bags_used === null || material.bags_used === undefined ? "" : Number(material.bags_used || 0),
      material.purchase_package_name
        ? `${material.purchase_package_name} (${Number(material.purchase_package_quantity || 0)})`
        : "",
    ]),
    { decimalColumns: [3, 4, 5], headerFill: colors.softGreen }
  );

  const flourTotals = flourDailyUsage.reduce(
    (total, material) => ({
      grams: total.grams + Number(material.total_grams || 0),
      kilos: total.kilos + Number(material.total_kilos || 0),
      bags: total.bags + Number(material.bags_used || 0),
    }),
    { grams: 0, kilos: 0, bags: 0 }
  );

  addSection(
    flourWorksheet,
    "Total mensual",
    ["Indicador", "Valor"],
    [
      ["Gramos", flourTotals.grams],
      ["Kilos", flourTotals.kilos],
      ["Bultos", flourTotals.bags],
    ],
    { decimalColumns: [2] }
  );

  const returnsRows = Array.isArray(report.returns_summary) ? report.returns_summary : [];
  const salesUsers = Array.isArray(report.sales_users) ? report.sales_users : [];
  const unitReturns = buildReturnsMatrix(returnsRows, "returned_quantity", salesUsers);
  const valueReturns = buildReturnsMatrix(returnsRows, "returned_value", salesUsers);
  const returnsWorksheet = workbook.addWorksheet(`Devoluciones ${filters.month}`);
  const returnsSellersCount = Math.max(unitReturns.sellers.length, valueReturns.sellers.length);
  const returnsColumnCount = Math.max(4, returnsSellersCount + 3);
  Array.from({ length: returnsColumnCount }).forEach((_, index) => {
    returnsWorksheet.getColumn(index + 1).width = index === 0 ? 28 : index === 1 ? 18 : 16;
  });
  returnsWorksheet.views = [{ state: "frozen", ySplit: 4 }];
  addSheetHeader(
    returnsWorksheet,
    `Total devoluciones de ${monthLabel(filters.month)}`,
    "En unidades y en pesos",
    returnsColumnCount
  );
  addBlankRows(returnsWorksheet);

  addSection(
    returnsWorksheet,
    `Total devoluciones de ${monthLabel(filters.month)} - En unidades`,
    unitReturns.headers,
    unitReturns.rows,
    { decimalColumns: Array.from({ length: unitReturns.headers.length - 2 }, (_, index) => index + 3), headerFill: "FFEDE7F6" }
  );

  addBlankRows(returnsWorksheet, 2);

  addSection(
    returnsWorksheet,
    `Total devoluciones de ${monthLabel(filters.month)} - En pesos`,
    valueReturns.headers,
    valueReturns.rows,
    { currencyColumns: Array.from({ length: valueReturns.headers.length - 2 }, (_, index) => index + 3), headerFill: colors.softOrange }
  );

  const inventorySnapshot = report.inventory_snapshot || {};
  const inventoryWorksheet = workbook.addWorksheet(`Inventarios ${filters.month}`);
  [34, 22, 16, 14, 18, 18].forEach((width, index) => {
    inventoryWorksheet.getColumn(index + 1).width = width;
  });
  inventoryWorksheet.views = [{ state: "frozen", ySplit: 4 }];
  addSheetHeader(
    inventoryWorksheet,
    `Inventarios de ${monthLabel(filters.month)}`,
    "Materia prima, producto terminado, rollos y bolsas",
    6
  );
  addBlankRows(inventoryWorksheet);

  addInventorySection(inventoryWorksheet, "Inventario de materia prima", inventorySnapshot.raw_materials || []);
  addBlankRows(inventoryWorksheet, 2);
  addInventorySection(inventoryWorksheet, "Inventario producto terminado", inventorySnapshot.finished_products || []);
  addBlankRows(inventoryWorksheet, 2);
  addInventorySection(inventoryWorksheet, "Inventario de rollos y bolsas", inventorySnapshot.packaging || []);
  addBlankRows(inventoryWorksheet, 2);

  const inventoryTotals = [
    ["Inventario de materia prima", sumBy(inventorySnapshot.raw_materials || [], "total_value")],
    ["Inventario producto terminado", sumBy(inventorySnapshot.finished_products || [], "total_value")],
    ["Inventario de rollos y bolsas", sumBy(inventorySnapshot.packaging || [], "total_value")],
  ];
  inventoryTotals.push(["TOTAL", inventoryTotals.reduce((total, row) => total + Number(row[1] || 0), 0)]);
  addSection(
    inventoryWorksheet,
    "Total de inventarios",
    ["Inventario", "Valor"],
    inventoryTotals,
    { currencyColumns: [2], headerFill: colors.softGreen }
  );

  flourWorksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  returnsWorksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  inventoryWorksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbook(`reporte-produccion-${filters.month}.xlsx`, buffer);
};

export default exportProductionMonthExcel;
