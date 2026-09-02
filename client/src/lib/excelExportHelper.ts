import ExcelJS from "exceljs";

export interface ExcelColumnDef {
  header: string;
  align?: "left" | "center" | "right";
  isAmount?: boolean;
  numFmt?: string;
  minWidth?: number;
}

export interface ExportStyledExcelOptions {
  sheetName: string;
  fileName: string;
  columns: ExcelColumnDef[];
  rows: (string | number | null | undefined)[][];
  includeIndex?: boolean; // Defaults to true ('م' column)
  showTotalRow?: boolean; // Defaults to true if any isAmount column exists
}

/**
 * Exports data to a beautifully styled Excel (.xlsx) file matching the corporate Emerald Green
 * design standard (RTL, Segoe UI, dark emerald header, striped rows, accounting borders, smart auto-width).
 */
export async function exportStyledExcel(options: ExportStyledExcelOptions) {
  const {
    sheetName,
    fileName,
    columns: inputColumns,
    rows: inputRows,
    includeIndex = true,
    showTotalRow = true,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة تمام";
  workbook.lastModifiedBy = "منصة تمام";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true, rightToLeft: true }],
  });

  // Prepare full column list (including 'م' if enabled)
  const columns: ExcelColumnDef[] = includeIndex
    ? [{ header: "م", align: "center", minWidth: 8 }, ...inputColumns]
    : [...inputColumns];

  // Colors based on reference Excel standard (FF065F46 header, FFE2E8F0 borders)
  const HEADER_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF065F46" }, // Emerald 800
  };

  const HEADER_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "medium", color: { argb: "FF022C22" } },
    bottom: { style: "medium", color: { argb: "FF022C22" } },
    left: { style: "medium", color: { argb: "FF022C22" } },
    right: { style: "medium", color: { argb: "FF022C22" } },
  };

  const DATA_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  const DATA_FONT: Partial<ExcelJS.Font> = {
    name: "Segoe UI",
    size: 11,
    bold: false,
    color: { argb: "FF1E293B" }, // Slate 800
  };

  // 1. Add Header Row
  const headerRow = worksheet.addRow(columns.map((c) => c.header));
  headerRow.height = 32;

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Segoe UI",
      size: 12,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = HEADER_FILL;
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = HEADER_BORDER;
  });

  // Track totals for amount columns
  const totals: Record<number, number> = {};
  let hasAmounts = false;

  columns.forEach((col, idx) => {
    if (col.isAmount) {
      totals[idx] = 0;
      hasAmounts = true;
    }
  });

  // 2. Add Data Rows
  inputRows.forEach((rowValues, rowIndex) => {
    const fullRowValues: (string | number | null | undefined)[] = includeIndex
      ? [rowIndex + 1, ...rowValues]
      : [...rowValues];

    const dataRow = worksheet.addRow(fullRowValues);
    dataRow.height = 25.5;

    // Alternating Zebra stripes
    const isEvenRow = rowIndex % 2 === 1;
    const rowFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isEvenRow ? "FFF8FAFC" : "FFFFFFFF" }, // Slate-50 vs White
    };

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      const align = colDef?.align || (colDef?.isAmount ? "center" : "center");

      cell.font = DATA_FONT;
      cell.fill = rowFill;
      cell.border = DATA_BORDER;
      cell.alignment = {
        horizontal: align,
        vertical: "middle",
      };

      if (colDef?.isAmount) {
        const numVal = Number(cell.value) || 0;
        totals[colNumber - 1] = (totals[colNumber - 1] || 0) + numVal;
        cell.numFmt = colDef.numFmt || "#,##0.00";
      } else if (colDef?.numFmt) {
        cell.numFmt = colDef.numFmt;
      }
    });
  });

  // 3. Add Summary / Total Row if amounts exist and showTotalRow is true
  if (showTotalRow && hasAmounts && inputRows.length > 0) {
    const totalRowValues: (string | number | null | undefined)[] = columns.map(
      (col, colIdx) => {
        if (colIdx === 0) {
          return "الإجمالي";
        }
        if (col.isAmount) {
          return totals[colIdx] || 0;
        }
        return "";
      }
    );

    const totalRow = worksheet.addRow(totalRowValues);
    totalRow.height = 28;

    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];

      cell.font = {
        name: "Segoe UI",
        size: 11,
        bold: true,
        color: { argb: "FF0F172A" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" }, // Slate 100
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "double", color: { argb: "FF022C22" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.alignment = {
        horizontal: colDef?.align || "center",
        vertical: "middle",
      };

      if (colDef?.isAmount) {
        cell.numFmt = colDef.numFmt || "#,##0.00";
      }
    });
  }

  // 4. Smart column width calculation
  columns.forEach((colDef, idx) => {
    const colNumber = idx + 1;
    const worksheetCol = worksheet.getColumn(colNumber);

    if (includeIndex && idx === 0) {
      worksheetCol.width = 8;
      return;
    }

    let maxLength = colDef.header.length;
    inputRows.forEach((row) => {
      const cellVal = row[includeIndex ? idx - 1 : idx];
      if (cellVal !== undefined && cellVal !== null) {
        const strVal = String(cellVal);
        if (strVal.length > maxLength) {
          maxLength = strVal.length;
        }
      }
    });

    // Padding + bounds
    const minW = colDef.minWidth || 14;
    const calculatedWidth = Math.min(Math.max(maxLength * 1.35 + 4, minW), 45);
    worksheetCol.width = Math.round(calculatedWidth * 10) / 10;
  });

  // 5. Generate and download buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
