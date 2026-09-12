"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { getAuthUser } from "@/lib/auth/session";
import { isRedirectError } from "@/lib/products/errors";
import { assertFeature, assertLimit } from "@/lib/subscriptions/access";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";
import { mapTeamError } from "@/lib/team/errors";
import { validateInvitationForm } from "@/lib/team/validation";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

function mapInviteError(error: unknown) {
  const subscriptionMessage = mapSubscriptionError(error);
  if (subscriptionMessage !== "Une erreur est survenue. Veuillez réessayer.") {
    return subscriptionMessage;
  }
  return mapTeamError(error);
}

function revalidateTeam(memberId?: string) {
  revalidatePath("/team");
  revalidatePath("/team/activity");
  revalidatePath("/dashboard");

  if (memberId) {
    revalidatePath(`/team/${memberId}`);
  }
}

export async function inviteMemberAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateInvitationForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    await requirePermission("team.invite");
    await assertFeature("team_management");
    await assertLimit("team_members");
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("invite_business_member", {
      p_email: values.email,
      p_role: values.role,
    });

    if (rpcError) {
      return {
        error: mapInviteError(rpcError),
        fieldErrors,
      };
    }

    revalidateTeam();
    return { error: null, success: true, message: "Invitation envoyée." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapInviteError(caught), fieldErrors };
  }
}

export async function updateMemberRoleAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "");

  try {
    await requirePermission("team.edit_role");
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_member_role", {
      p_member_id: memberId,
      p_role: role,
    });

    if (error) {
      return { error: mapTeamError(error) };
    }

    revalidateTeam(memberId);
    return { error: null, success: true, message: "Rôle mis à jour." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapInviteError(caught) };
  }
}

export async function setMemberStatusAction(formData: FormData): Promise<AuthResult> {
  const memberId = String(formData.get("memberId") ?? "");
  const status = String(formData.get("status") ?? "");

  try {
    await requirePermission("team.suspend");
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_member_status", {
      p_member_id: memberId,
      p_status: status,
    });

    if (error) {
      return { error: mapTeamError(error) };
    }

    revalidateTeam(memberId);
    return {
      error: null,
      success: true,
      message: status === "suspended" ? "Membre suspendu." : "Membre réactivé.",
    };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapInviteError(caught) };
  }
}

export async function removeMemberAction(formData: FormData): Promise<AuthResult> {
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requirePermission("team.suspend");
    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_business_member", {
      p_member_id: memberId,
    });

    if (error) {
      return { error: mapTeamError(error) };
    }

    revalidateTeam();
    redirect("/team");
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapInviteError(caught) };
  }
}

export async function resendInvitationAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const invitationId = String(formData.get("invitationId") ?? "");

  try {
    await requirePermission("team.invite");
    const supabase = await createClient();
    const { error } = await supabase.rpc("resend_invitation", {
      p_invitation_id: invitationId,
    });

    if (error) {
      return { error: mapTeamError(error) };
    }

    revalidateTeam();
    return { error: null, success: true, message: "Invitation renvoyée." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapInviteError(caught) };
  }
}

export async function acceptInvitationAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const token = String(formData.get("token") ?? "");
  const user = await getAuthUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_invitation", { p_token: token });

    if (error) {
      return { error: mapTeamError(error) };
    }

    revalidatePath("/team");
    revalidatePath("/dashboard");
    redirect("/dashboard");
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapInviteError(caught) };
  }
}

export async function declineInvitationAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const token = String(formData.get("token") ?? "");
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("decline_invitation", { p_token: token });

    if (error) {
      return { error: mapTeamError(error) };
    }

    redirect("/dashboard");
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapInviteError(caught) };
  }
}
