import { COMPARISON_ROWS } from "@/lib/subscriptions/constants";

export function PricingComparison() {
  return (
    <div className="mt-10 overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Fonctionnalité</th>
            <th className="px-4 py-3 font-medium">Free</th>
            <th className="px-4 py-3 font-medium">Pro</th>
            <th className="px-4 py-3 font-medium">Business</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium">{row.label}</td>
              <td className="px-4 py-3">{row.free}</td>
              <td className="px-4 py-3">{row.pro}</td>
              <td className="px-4 py-3">{row.business}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
