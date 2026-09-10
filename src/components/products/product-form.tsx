"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_UNITS } from "@/lib/products/constants";
import { createProductAction, updateProductAction } from "@/lib/products/actions";
import type { Category, Product } from "@/types/products";

export function ProductForm({
  mode,
  product,
  categories,
}: {
  mode: "create" | "edit";
  product?: Product;
  categories: Category[];
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "edit" && product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}
      <Input
        id="name"
        name="name"
        label="Nom du produit"
        required
        defaultValue={product?.name}
        placeholder="Jean Zara"
        error={state.fieldErrors?.name}
      />
      <Select
        id="categoryId"
        name="categoryId"
        label="Catégorie"
        defaultValue={product?.categoryId ?? ""}
      >
        <option value="">Sans catégorie</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Input
        id="sku"
        name="sku"
        label="SKU"
        defaultValue={product?.sku ?? ""}
        placeholder="JZ-001"
        error={state.fieldErrors?.sku}
      />
      <Textarea
        id="description"
        name="description"
        label="Description"
        defaultValue={product?.description ?? ""}
        placeholder="Coupe, matière, détails utiles..."
        error={state.fieldErrors?.description}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="purchasePrice"
          name="purchasePrice"
          label="Prix d'achat"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          defaultValue={product?.purchasePrice ?? 0}
          error={state.fieldErrors?.purchasePrice}
        />
        <Input
          id="sellingPrice"
          name="sellingPrice"
          label="Prix de vente"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          defaultValue={product?.sellingPrice ?? 0}
          error={state.fieldErrors?.sellingPrice}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mode === "create" ? (
          <Input
            id="initialStock"
            name="initialStock"
            label="Stock initial"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.001"
            required
            defaultValue={0}
            error={state.fieldErrors?.initialStock}
          />
        ) : null}
        <Input
          id="minimumStock"
          name="minimumStock"
          label="Stock minimum"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.001"
          required
          defaultValue={product?.minimumStock ?? 0}
          error={state.fieldErrors?.minimumStock}
        />
      </div>
      <Select
        id="unit"
        name="unit"
        label="Unité"
        defaultValue={product?.unit ?? "piece"}
        error={state.fieldErrors?.unit}
      >
        {PRODUCT_UNITS.map((unit) => (
          <option key={unit.value} value={unit.value}>
            {unit.label}
          </option>
        ))}
      </Select>
      {mode === "edit" ? (
        <Select
          id="isActive"
          name="isActive"
          label="Statut"
          defaultValue={product?.isActive ? "true" : "false"}
        >
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </Select>
      ) : null}
      <Input
        id="image"
        name="image"
        label="Image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hint="JPG, PNG ou WebP — 2 Mo maximum."
      />
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" loading={pending} className="sm:flex-1">
          {pending
            ? mode === "create"
              ? "Création du produit..."
              : "Enregistrement..."
            : mode === "create"
              ? "Créer le produit"
              : "Enregistrer"}
        </Button>
        <Button href={product ? `/products/${product.id}` : "/products"} variant="outline" size="lg">
          Annuler
        </Button>
      </div>
    </form>
  );
}
