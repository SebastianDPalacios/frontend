const colors = {
  navy: "FF111827",
  orange: "FFDD5D2A",
  white: "FFFFFFFF",
  border: "FFD1D5DB",
  soft: "FFF8FAFC",
};

const border = {
  top: { style: "thin", color: { argb: colors.border } },
  left: { style: "thin", color: { argb: colors.border } },
  bottom: { style: "thin", color: { argb: colors.border } },
  right: { style: "thin", color: { argb: colors.border } },
};

const formatDate = (value) => {
  const [year, month, day] = String(value || "").split("-");
  return year && month && day ? `${day}/${month}/${year}` : value || "";
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
    fgColor: { argb: colors.orange },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleCell.border = border;

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => styleCell(cell, { bold: true, fill: colors.soft }));

  rows.forEach((values, rowIndex) => {
    const row = worksheet.addRow(values);
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
  bakerSummary,
  formatMaterialEquivalent,
}) => {
  const excelModule = await import("exceljs");
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Panadería";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Producción ${filters.month}`);
  worksheet.views = [{ state: "frozen", ySplit: 4 }];
  [32, 32, 18, 18, 18, 18].forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  worksheet.mergeCells("A1:F1");
  worksheet.getCell("A1").value = "Reporte mensual de producción";
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

  worksheet.mergeCells("A2:F2");
  worksheet.getCell("A2").value = "Generado desde Panadería";
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
      ["Lotes", Number(summary.batches_count || 0)],
      ["Arrobas", Number(summary.batch_quantity || 0)],
      ["Fabricados", produced],
      ["Empacados", packed],
      ["Dañados", damaged],
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
    ["Producto", "Lotes", "Fabricados", "Empacados", "Dañados", "Faltantes", "Pendientes"],
    report.products.map((product) => [
      product.product_name || "",
      Number(product.batches_count || 0),
      Number(product.produced_quantity || 0),
      Number(product.packed_quantity || 0),
      Number(product.damaged_quantity || 0),
      Number(product.missing_quantity || 0),
      Number(product.pending_quantity || 0),
    ]),
    { decimalColumns: [2, 3, 4, 5, 6, 7] }
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
    ["Panadero", "Lotes", "Arrobas", "Fabricados", "Empacados", "Dañados", "Faltantes"],
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
