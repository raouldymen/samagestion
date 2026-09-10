"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createSupplierAction } from "@/lib/purchases/actions";
import type { Supplier } from "@/types/purchases";

export function SupplierSelector({
  suppliers,
  value,
  onChange,
}: {
  suppliers: Supplier[];
  value: string;
  onChange: (supplierId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Select
        id="supplierId"
        name="supplierId"
        label="Fournisseur"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Aucun fournisseur</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </Select>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Ajouter un fournisseur
      </Button>
      <Dialog
        open={open}
        title="Nouveau fournisseur"
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
      >
        <div className="flex flex-col gap-3">
          <Input
            id="supplier-name"
            label="Nom"
            required
            placeholder="Dépôt Sandaga"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            id="supplier-phone"
            label="Téléphone"
            placeholder="+221 77 000 00 00"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            loading={pending}
            onClick={() => {
              const formData = new FormData();
              formData.set("name", name);
              formData.set("phone", phone);
              startTransition(async () => {
                const result = await createSupplierAction({ error: null }, formData);

                if (result.error) {
                  setError(result.error);
                  return;
                }

                if (result.message) {
                  onChange(result.message);
                }

                setName("");
                setPhone("");
                setOpen(false);
              });
            }}
          >
            Enregistrer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
