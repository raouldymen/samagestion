"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createCustomerAction } from "@/lib/sales/actions";
import type { Customer } from "@/types/sales";

export function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Select
        id="customerId"
        name="customerId"
        label="Client"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Aucun client</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </Select>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Ajouter un client
      </Button>
      <Dialog
        open={open}
        title="Nouveau client"
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
      >
        <div className="flex flex-col gap-3">
          <Input
            id="customer-name"
            name="customerName"
            label="Nom"
            required
            placeholder="Moussa Diop"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            id="customer-phone"
            name="customerPhone"
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
                const result = await createCustomerAction({ error: null }, formData);

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
