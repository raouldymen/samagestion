export const EXPORT_DATASETS = [
  "sales",
  "products",
  "expenses",
  "purchases",
  "customers",
  "payments",
] as const;

export type ExportDataset = (typeof EXPORT_DATASETS)[number];
export type ExportFormat = "csv" | "xlsx";

export const DATASET_LABELS: Record<ExportDataset, string> = {
  sales: "Ventes",
  products: "Produits",
  expenses: "Dépenses",
  purchases: "Achats",
  customers: "Clients",
  payments: "Paiements",
};

export const DATASET_FILENAMES: Record<ExportDataset, string> = {
  sales: "ventes",
  products: "produits",
  expenses: "depenses",
  purchases: "achats",
  customers: "clients",
  payments: "paiements",
};

export type ExportSheet = {
  name: string;
  headers: string[];
  rows: (string | number)[][];
};

export type ExportFile = {
  filename: string;
  mime: string;
  body: Uint8Array;
  format: ExportFormat;
};

const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

export function parseExportDataset(value?: string | null): ExportDataset {
  if (value && EXPORT_DATASETS.includes(value as ExportDataset)) {
    return value as ExportDataset;
  }

  return "sales";
}

export function parseExportFormat(value?: string | null): ExportFormat {
  return value === "xlsx" ? "xlsx" : "csv";
}

export function csvNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(".", ",");
}

export function csvCell(value: string | number) {
  const raw = typeof value === "number" ? csvNumber(value) : value;

  if (/[;"\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

export function toCsv(headers: string[], rows: (string | number)[][]) {
  const lines = [
    headers.map(csvCell).join(";"),
    ...rows.map((row) => row.map(csvCell).join(";")),
  ];

  return `${lines.join("\r\n")}\r\n`;
}

function withBom(csv: string) {
  const payload = new TextEncoder().encode(csv);
  const body = new Uint8Array(UTF8_BOM.length + payload.length);
  body.set(UTF8_BOM, 0);
  body.set(payload, UTF8_BOM.length);
  return body;
}

export function serializeCsv(sheet: ExportSheet, basename: string): ExportFile {
  return {
    filename: `${basename}.csv`,
    mime: "text/csv; charset=utf-8",
    body: withBom(toCsv(sheet.headers, sheet.rows)),
    format: "csv",
  };
}

function worksheetName(name: string) {
  return (name.replace(/[\\/:*?\[\]]/g, " ").trim() || "Export").slice(0, 31);
}

export async function serializeWorkbook(
  sheet: ExportSheet,
  basename: string,
  format: ExportFormat = "csv",
): Promise<ExportFile> {
  if (format === "csv") {
    return serializeCsv(sheet, basename);
  }

  return serializeWorkbookSheets([sheet], basename);
}

export async function serializeWorkbookSheets(
  sheets: ExportSheet[],
  basename: string,
): Promise<ExportFile> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SamaGestion";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(worksheetName(sheet.name));
    const header = worksheet.addRow(sheet.headers);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    header.alignment = { vertical: "middle" };

    for (const row of sheet.rows) {
      worksheet.addRow(row);
    }

    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = { from: "A1", to: { row: Math.max(1, sheet.rows.length + 1), column: sheet.headers.length } };
    worksheet.columns = sheet.headers.map((headerName, index) => ({
      width: Math.min(42, Math.max(12, headerName.length + 3, ...sheet.rows.map((row) => String(row[index] ?? "").length + 2))),
    }));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: `${basename}.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: new Uint8Array(buffer),
    format: "xlsx",
  };
}
import ExcelJS from "exceljs";
