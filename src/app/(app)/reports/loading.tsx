export default function ReportsLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-56 rounded-lg bg-muted" />
      <div className="h-10 w-full rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
      <div className="h-52 rounded-xl bg-muted" />
    </div>
  );
}
