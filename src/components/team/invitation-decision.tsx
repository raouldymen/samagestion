"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction, declineInvitationAction } from "@/lib/team/actions";

export function InvitationDecision({ token }: { token: string }) {
  const [acceptState, acceptAction, acceptPending] = useActionState(acceptInvitationAction, {
    error: null,
  });
  const [declineState, declineAction, declinePending] = useActionState(declineInvitationAction, {
    error: null,
  });
  const error = acceptState.error ?? declineState.error;

  return (
    <div className="mt-6 flex flex-col gap-2">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <form action={acceptAction} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" className="w-full" loading={acceptPending}>
            Accepter
          </Button>
        </form>
        <form action={declineAction} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="outline" className="w-full" loading={declinePending}>
            Refuser
          </Button>
        </form>
      </div>
    </div>
  );
}
