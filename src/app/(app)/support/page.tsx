import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return <>
    <PageHeader title="Support" description="Besoin d’aide avec SamaGestion ? Contactez-nous." />
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <a href="https://wa.me/221773517345" target="_blank" rel="noreferrer" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Card className="h-full transition-colors hover:bg-muted">
          <CardHeader><MessageCircle className="size-6 text-success" aria-hidden="true" /><CardTitle>WhatsApp</CardTitle></CardHeader>
          <p className="text-sm text-muted-foreground">Écrivez-nous directement sur WhatsApp.</p>
          <p className="mt-3 font-medium">+221 77 351 73 45</p>
        </Card>
      </a>
      <a href="mailto:Dymenservice@gmail.com" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Card className="h-full transition-colors hover:bg-muted">
          <CardHeader><Mail className="size-6 text-primary" aria-hidden="true" /><CardTitle>E-mail</CardTitle></CardHeader>
          <p className="text-sm text-muted-foreground">Envoyez-nous votre question ou une capture d’écran.</p>
          <p className="mt-3 break-all font-medium">Dymenservice@gmail.com</p>
        </Card>
      </a>
    </div>
  </>;
}
