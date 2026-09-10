import Link from "next/link";

export function Pagination({
  page,
  pageSize,
  total,
  query,
}: {
  page: number;
  pageSize: number;
  total: number;
  query: Record<string, string | string[] | undefined>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (pageCount <= 1) {
    return null;
  }

  function href(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (key === "page" || !value) {
        return;
      }

      params.set(key, Array.isArray(value) ? value[0] ?? "" : value);
    });

    params.set("page", String(nextPage));
    return `?${params.toString()}`;
  }

  return (
    <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
      <Link
        href={href(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className="rounded-lg border border-border px-3 py-2 font-medium hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Précédent
      </Link>
      <p className="text-muted-foreground">
        Page {page} / {pageCount}
      </p>
      <Link
        href={href(Math.min(pageCount, page + 1))}
        aria-disabled={page === pageCount}
        className="rounded-lg border border-border px-3 py-2 font-medium hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Suivant
      </Link>
    </nav>
  );
}
