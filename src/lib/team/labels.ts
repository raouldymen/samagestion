import type { BusinessRole } from "@/types/database";
import type { InvitationStatus, MemberStatus } from "@/types/team";

export const ROLE_LABELS: Record<BusinessRole, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  cashier: "Caissier",
  seller: "Vendeur",
  stock_manager: "Responsable stock",
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Actif",
  invited: "Invité",
  suspended: "Suspendu",
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  expired: "Expirée",
  cancelled: "Annulée",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "member.invited": "a invité un membre",
  "member.role_changed": "a modifié le rôle",
  "member.suspended": "a suspendu un membre",
  "member.removed": "a retiré un membre",
  "product.created": "a créé un produit",
  "product.updated": "a modifié un produit",
  "product.deleted": "a désactivé un produit",
  "stock.adjusted": "a modifié le stock",
  "sale.created": "a créé une vente",
  "sale.cancelled": "a annulé une vente",
  "sale.returned": "a enregistré un retour / avoir pour la vente",
  "sale.debt_paid": "a enregistré un règlement client pour la vente",
  "purchase.created": "a créé un achat",
  "purchase.cancelled": "a annulé un achat",
  "purchase.debt_paid": "a enregistré un règlement fournisseur pour l'achat",
  "expense.created": "a créé une dépense",
  "expense.updated": "a modifié une dépense",
  "expense.cancelled": "a annulé une dépense",
  "customer.created": "a créé un client",
  "customer.updated": "a modifié un client",
  "supplier.created": "a créé un fournisseur",
  "supplier.updated": "a modifié un fournisseur",
  "settings.updated": "a modifié",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  member: "Membre",
  invitation: "Invitation",
  product: "Produit",
  sale: "Vente",
  purchase: "Achat",
  expense: "Dépense",
  customer: "Client",
  supplier: "Fournisseur",
  business: "Commerce",
  receipt: "Reçu",
  preferences: "Préférences",
};

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityRef(action: string, metadata: Record<string, unknown>) {
  if (typeof metadata.sale_number === "string") {
    return metadata.sale_number;
  }

  if (typeof metadata.purchase_number === "string") {
    return metadata.purchase_number;
  }

  if (typeof metadata.name === "string") {
    return metadata.name;
  }

  if (typeof metadata.email === "string") {
    return metadata.email;
  }

  if (typeof metadata.description === "string") {
    return metadata.description;
  }

  if (typeof metadata.section === "string") {
    if (metadata.section === "receipt") {
      return "les paramètres du reçu";
    }

    if (metadata.section === "profile") {
      return "les informations du commerce";
    }

    if (metadata.section === "logo") {
      return "le logo du commerce";
    }

    if (metadata.section === "preferences") {
      return "les préférences";
    }
  }

  return null;
}
