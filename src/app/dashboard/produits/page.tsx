import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Produits",
};

export default function ProduitsRedirectPage() {
  redirect("/products");
}
