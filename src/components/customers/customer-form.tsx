"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AuthResult } from "@/types";
import type { Customer } from "@/types/customers";

const initial: AuthResult = { error: null };

export function CustomerForm({
  customer,
  action,
  submitLabel,
}: {
  customer?: Customer;
  action: (prev: AuthResult, formData: FormData) => Promise<AuthResult>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {customer ? <input type="hidden" name="customerId" value={customer.id} /> : null}
      <Input
        id="name"
        name="name"
        label="Nom *"
        required
        defaultValue={customer?.name ?? ""}
        error={state.fieldErrors?.name}
        placeholder="Moussa Diop"
      />
      <Input
        id="phone"
        name="phone"
        label="Téléphone"
        defaultValue={customer?.phone ?? ""}
        error={state.fieldErrors?.phone}
        placeholder="77 123 45 67"
      />
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        defaultValue={customer?.email ?? ""}
        error={state.fieldErrors?.email}
        placeholder="moussa@exemple.sn"
      />
      <Input
        id="address"
        name="address"
        label="Adresse"
        defaultValue={customer?.address ?? ""}
        error={state.fieldErrors?.address}
        placeholder="Dakar, Sénégal"
      />
      <Textarea
        id="notes"
        name="notes"
        label="Notes"
        defaultValue={customer?.notes ?? ""}
        error={state.fieldErrors?.notes}
        rows={3}
      />
      {customer ? (
        <Select
          id="isActive"
          name="isActive"
          label="Statut"
          defaultValue={customer.isActive ? "true" : "false"}
        >
          <option value="true">Actif</option>
          <option value="false">Archivé</option>
        </Select>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success && state.message ? (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? "Enregistrement..." : submitLabel}
      </Button>
    </form>
  );
}
