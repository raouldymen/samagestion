"use client";

import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DATASET_LABELS,
  EXPORT_DATASETS,
} from "@/lib/reports/export";
import { reportSearchQuery } from "@/lib/reports/params";
import type { ReportPeriod } from "@/types/reports";

export function ReportExportActions({
  period,
  from,
  to,
}: {
  period: ReportPeriod;
  from?: string;
  to?: string;
}) {
  const query = reportSearchQuery(period, from, to);
  const printHref = query ? `/reports/print?${query}` : "/reports/print";

  return (
    <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap">
      <details className="group relative">
        <summary className="inline-flex h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted">
          <Download className="size-4" aria-hidden="true" />
          Exporter CSV
        </summary>
        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
          {EXPORT_DATASETS.map((dataset) => {
            const params = new URLSearchParams(query);
            params.set("dataset", dataset);
            return (
              <a
                key={dataset}
                href={`/reports/export?${params.toString()}`}
                className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                {DATASET_LABELS[dataset]}
              </a>
            );
          })}
        </div>
      </details>
      <Button href={printHref} variant="outline">
        <FileText className="size-4" aria-hidden="true" />
        Générer le rapport
      </Button>
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden="true" />
        Imprimer
      </Button>
    </div>
  );
}
