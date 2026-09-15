import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ventes",
};

export default function VentesRedirectPage() {
  redirect("/sales");
}
