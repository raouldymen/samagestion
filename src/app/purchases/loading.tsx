export default function PurchasesLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
      <div className="h-40 rounded-xl bg-muted" />
    </div>
  );
}
