export const AUTH_PATHS = ["/login", "/register", "/forgot-password"] as const;

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/products",
  "/sales",
  "/customers",
  "/expenses",
  "/purchases",
  "/suppliers",
  "/reports",
  "/notifications",
  "/settings",
  "/team",
  "/invitations",
  "/upgrade",
  "/checkout",
  "/payment",
  "/admin",
  "/suspended",
] as const;

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((path) => pathname === path);
}

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
