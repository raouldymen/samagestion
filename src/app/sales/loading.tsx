export default function SalesLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
