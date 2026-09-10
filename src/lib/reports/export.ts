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

/**
 * Point d'extension Excel : brancher ici un sérialiseur xlsx
 * sans changer les routes ni les composants d'export.
 */
export function serializeWorkbook(
  sheet: ExportSheet,
  basename: string,
  format: ExportFormat = "csv",
): ExportFile {
  if (format === "xlsx") {
    return serializeCsv(sheet, basename);
  }

  return serializeCsv(sheet, basename);
}
