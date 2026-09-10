import { redirectIfAuthenticated } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
