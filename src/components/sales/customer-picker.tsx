"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matchingCustomers = useMemo(() => {
    const needle = normalize(query);

    if (!needle) {
      return customers;
    }

    return customers.filter(
      (customer) => customer.id !== value && [customer.name, customer.phone, customer.email].some((field) => normalize(field).includes(needle)),
    );
  }, [customers, query]);
  const selectedCustomer = customers.find((customer) => customer.id === value);
  const visibleCustomers =
    selectedCustomer && !matchingCustomers.some((customer) => customer.id === selectedCustomer.id)
      ? [selectedCustomer, ...matchingCustomers]
      : matchingCustomers;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="customer-search"
          label="Rechercher un client"
          hideLabel
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom, téléphone ou e-mail..."
          className="pl-10"
        />
        {query ? (
          <ul
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg"
            aria-label="Clients correspondants"
          >
            {matchingCustomers.length > 0 ? (
              matchingCustomers.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(customer.id);
                      setQuery("");
                    }}
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-medium">{customer.name}</span>
                    {customer.phone || customer.email ? (
                      <span className="text-sm text-muted-foreground">
                        {[customer.phone, customer.email].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">Aucun client trouvé.</li>
            )}
          </ul>
        ) : null}
      </div>
      <Select
        id="customerId"
        name="customerId"
        label="Client"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Aucun client</option>
        {visibleCustomers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}{customer.phone ? ` · ${customer.phone}` : ""}
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

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-SN");
}
