"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSupplierAction, updateSupplierAction } from "@/lib/purchases/actions";
import type { Supplier } from "@/types/purchases";

export function SupplierForm({
  mode,
  supplier,
}: {
  mode: "create" | "edit";
  supplier?: Supplier;
}) {
  const action = mode === "create" ? createSupplierAction : updateSupplierAction;
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "edit" && supplier ? (
        <input type="hidden" name="supplierId" value={supplier.id} />
      ) : (
        <input type="hidden" name="redirect" value="detail" />
      )}
      <Input
        id="name"
        name="name"
        label="Nom"
        required
        defaultValue={supplier?.name}
        placeholder="Dépôt Sandaga"
        error={state.fieldErrors?.name}
      />
      <Input
        id="phone"
        name="phone"
        label="Téléphone"
        defaultValue={supplier?.phone ?? ""}
        placeholder="+221 77 000 00 00"
      />
      <Input
        id="email"
        name="email"
        label="Email"
        type="email"
        defaultValue={supplier?.email ?? ""}
      />
      <Input
        id="address"
        name="address"
        label="Adresse"
        defaultValue={supplier?.address ?? ""}
      />
      <Textarea
        id="notes"
        name="notes"
        label="Notes"
        defaultValue={supplier?.notes ?? ""}
      />
      {mode === "edit" ? (
        <Select
          id="isActive"
          name="isActive"
          label="Statut"
          defaultValue={supplier?.isActive === false ? "false" : "true"}
        >
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </Select>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={pending}>
          {mode === "create" ? "Ajouter le fournisseur" : "Enregistrer"}
        </Button>
        <Button href="/suppliers" variant="outline">
          Annuler
        </Button>
      </div>
    </form>
  );
}
