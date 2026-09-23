export const PASSWORD_MISMATCH_MESSAGE = "Les mots de passe ne correspondent pas.";

export function passwordMismatchMessage(form: HTMLFormElement) {
  const data = new FormData(form);
  const password = String(data.get("password") ?? "");
  const confirmPassword = String(data.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return PASSWORD_MISMATCH_MESSAGE;
  }

  return null;
}
