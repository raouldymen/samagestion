import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Stock",
};

export default function StockRedirectPage() {
  redirect("/products");
}
