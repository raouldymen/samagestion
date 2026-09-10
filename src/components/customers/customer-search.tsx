import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CustomerSearch({
  q,
  includeArchived,
}: {
  q?: string;
  includeArchived?: boolean;
}) {
  return (
    <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center" method="get">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Rechercher</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher (nom, téléphone, email)..."
          className="h-11 w-full rounded-lg border border-border bg-card py-2 pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="archived"
          value="1"
          defaultChecked={includeArchived}
          className="size-4 rounded border-border"
        />
        Inclure archivés
      </label>
      <Button type="submit" variant="outline">
        Rechercher
      </Button>
    </form>
  );
}
