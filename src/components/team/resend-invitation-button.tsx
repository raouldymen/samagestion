"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { resendInvitationAction } from "@/lib/team/actions";

export function ResendInvitationButton({
  invitationId,
  expired,
}: {
  invitationId: string;
  expired: boolean;
}) {
  const [state, formAction, pending] = useActionState(resendInvitationAction, { error: null });

  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        {expired ? "Renvoyer" : "Renvoyer le lien"}
      </Button>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-success">Lien renvoyé.</p> : null}
    </form>
  );
}
