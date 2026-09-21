import { redirect } from "next/navigation";
import { InventoryForm } from "@/components/products/inventory-form";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { listInventoryProducts } from "@/lib/products/queries";

export default async function InventoryPage() {
  const session = await requireBusinessSession();
  if (!hasPermission(session.role, "stock.adjust")) redirect("/products");
  const products = await listInventoryProducts();
  return <><PageHeader title="Inventaire physique" description="Comparez le stock compté avec le stock théorique, puis validez les écarts." /><InventoryForm products={products} /></>;
}
