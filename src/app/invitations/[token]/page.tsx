import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { getAuthUser, requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/team/labels";
import { InvitationDecision } from "@/components/team/invitation-decision";
import { getInvitationByToken } from "@/lib/team/queries";

export const metadata: Metadata = {
  title: "Invitation",
};

export const dynamic = "force-dynamic";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const user = await getAuthUser();
  const { token } = await params;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
  }

  await requireUser();
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <InvitationShell>
        <h1 className="text-xl font-semibold">Invitation introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce lien n&apos;est pas valide. Demandez une nouvelle invitation au propriétaire.
        </p>
      </InvitationShell>
    );
  }

  if (invitation.status === "expired") {
    return (
      <InvitationShell>
        <h1 className="text-xl font-semibold">Cette invitation a expiré.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Demandez au propriétaire de renvoyer une invitation.
        </p>
      </InvitationShell>
    );
  }

  if (invitation.status === "cancelled" || invitation.status === "accepted") {
    return (
      <InvitationShell>
        <h1 className="text-xl font-semibold">Invitation indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette invitation n&apos;est plus active.
        </p>
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
      <h1 className="text-xl font-semibold">Invitation à rejoindre SamaGestion</h1>
      <p className="mt-3 text-sm text-muted-foreground">Commerce {invitation.businessName}</p>
      <p className="mt-1 text-sm">
        Rôle proposé : <strong>{ROLE_LABELS[invitation.role]}</strong>
      </p>
      <InvitationDecision token={token} />
    </InvitationShell>
  );
}

function InvitationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>
        {children}
      </Card>
    </div>
  );
}
