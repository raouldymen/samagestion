import { Logo } from "@/components/ui/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Logo href="/" />
        </div>
        <main className="max-w-none text-sm leading-relaxed text-foreground [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground">
          {children}
        </main>
      </div>
    </div>
  );
}
