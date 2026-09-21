import { buildBusinessBackup } from "@/lib/backups/export";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const file = await buildBusinessBackup();
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
    return new Response("Sauvegarde impossible", { status: 500 });
  }
}
