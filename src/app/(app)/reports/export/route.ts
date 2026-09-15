import { canViewFinancialReports } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { hasFeature } from "@/lib/subscriptions/limits";
import { buildReportExport } from "@/lib/reports/export-data";
import { parseExportDataset, parseExportFormat } from "@/lib/reports/export";
import { parseReportSearch } from "@/lib/reports/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireBusinessSession();
  const bundle = await getSubscriptionBundle();

  if (!canViewFinancialReports(session.role)) {
    return new Response("Interdit", { status: 403 });
  }

  if (!hasFeature(bundle.features, "exports")) {
    return new Response("FEATURE_NOT_AVAILABLE:exports", { status: 402 });
  }

  if (!hasFeature(bundle.features, "financial_reports")) {
    return new Response("FEATURE_NOT_AVAILABLE:financial_reports", { status: 402 });
  }

  const url = new URL(request.url);
  const { period, from, to } = parseReportSearch({
    period: url.searchParams.get("period") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  const dataset = parseExportDataset(url.searchParams.get("dataset"));
  const format = parseExportFormat(url.searchParams.get("format"));

  try {
    const file = await buildReportExport({ dataset, period, from, to, format });

    return new Response(Buffer.from(file.body), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new Response("Interdit", { status: 403 });
    }

    return new Response("Export impossible", { status: 500 });
  }
}
