"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BUSINESS_LOGO_MAX_BYTES, BUSINESS_LOGO_MAX_EDGE } from "@/lib/settings/constants";
import { removeBusinessLogoAction, uploadBusinessLogoAction } from "@/lib/settings/actions";

export function LogoUploader({
  logoUrl,
  canEdit,
}: {
  logoUrl: string | null;
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit && !logoUrl) {
    return <p className="text-sm text-muted-foreground">Aucun logo.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt="Logo du commerce"
          className="h-20 w-20 rounded-lg border border-border bg-white object-contain"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
          Logo
        </div>
      )}
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) {
                return;
              }

              startTransition(async () => {
                const prepared = await prepareLogoFile(file);
                if ("error" in prepared) {
                  setError(prepared.error);
                  return;
                }

                const form = new FormData();
                form.set("logo", prepared.file);
                const result = await uploadBusinessLogoAction(form);
                setError(result.error);
              });
            }}
          />
          <Button type="button" variant="outline" size="sm" loading={pending} onClick={() => inputRef.current?.click()}>
            Ajouter un logo
          </Button>
          {logoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeBusinessLogoAction();
                  setError(result.error);
                })
              }
            >
              Retirer
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">PNG, JPG ou WebP · 2 Mo max. Redimensionné à 512 px si besoin.</p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function prepareLogoFile(file: File): Promise<{ file: File } | { error: string }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Seuls les fichiers JPG, PNG et WebP sont acceptés." };
  }

  if (file.size > BUSINESS_LOGO_MAX_BYTES * 4) {
    return { error: "Le logo est trop volumineux." };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, BUSINESS_LOGO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return file.size > BUSINESS_LOGO_MAX_BYTES
        ? { error: "Le logo ne doit pas dépasser 2 Mo." }
        : { file };
    }

    context.drawImage(bitmap, 0, 0, width, height);
    const type = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, 0.86);
    });

    if (!blob) {
      return { error: "Impossible de traiter cette image." };
    }

    if (blob.size > BUSINESS_LOGO_MAX_BYTES) {
      return { error: "Le logo ne doit pas dépasser 2 Mo." };
    }

    const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    return {
      file: new File([blob], `logo.${extension}`, { type }),
    };
  } catch {
    if (file.size > BUSINESS_LOGO_MAX_BYTES) {
      return { error: "Le logo ne doit pas dépasser 2 Mo." };
    }

    return { file };
  }
}
