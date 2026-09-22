export const EXPENSE_REDIRECTS = ["/expenses", "/sales/checkout"] as const;

export function expenseRedirectPath(value: FormDataEntryValue | null | undefined) {
  const path = String(value ?? "").trim();
  return (EXPENSE_REDIRECTS as readonly string[]).includes(path) ? path : "/expenses";
}
