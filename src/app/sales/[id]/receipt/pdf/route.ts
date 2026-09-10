import { requirePermission } from "@/lib/auth/access";
import { buildReceiptPdf } from "@/lib/receipts/pdf";
import { getReceiptView } from "@/lib/receipts/queries";
import { isReceiptFormat } from "@/lib/settings/constants";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("sales.view");
  const { id } = await params;
  const formatParam = new URL(request.url).searchParams.get("format");
  const format = formatParam && isReceiptFormat(formatParam) ? formatParam : undefined;
  const receipt = await getReceiptView(id, format);

  if (!receipt) {
    return new Response("Reçu introuvable", { status: 404 });
  }

  const pdf = buildReceiptPdf(receipt);
  const filename = `recu-${receipt.saleNumber.replaceAll("/", "-")}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
