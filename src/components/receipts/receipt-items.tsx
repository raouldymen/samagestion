import { formatReceiptAmount } from "@/lib/receipts/format";
import type { ReceiptView } from "@/types/receipts";

export function ReceiptItems({ receipt }: { receipt: ReceiptView }) {
  return (
    <table className="mt-3 w-full text-xs">
      <thead>
        <tr className="border-y border-black">
          <th className="py-1 text-left font-semibold">Produit</th>
          <th className="py-1 text-right font-semibold">Qté</th>
          <th className="py-1 text-right font-semibold">Prix</th>
          <th className="py-1 text-right font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {receipt.items.map((item, index) => (
          <tr key={`${item.name}-${index}`}>
            <td className="py-1 pr-1">{item.name}</td>
            <td className="py-1 text-right">{item.quantity}</td>
            <td className="py-1 text-right">{formatReceiptAmount(item.unitPrice)}</td>
            <td className="py-1 text-right">{formatReceiptAmount(item.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
