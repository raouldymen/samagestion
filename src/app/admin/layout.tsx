import { notFound } from "next/navigation";

/**
 * Zone admin plateforme — non exposée en V1.
 * notFound() plutôt qu'un redirect : ne révèle pas l'existence d'une zone admin.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  void children;
  notFound();
}
