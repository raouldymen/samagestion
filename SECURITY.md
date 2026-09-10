# Sécurité SamaGestion

Document d’architecture sécurité multi-tenant. Ce document n’affirme pas une sécurité à 100 %.

## Principes

1. **Le frontend n’est pas une couche de sécurité** (boutons désactivés, menus masqués, guards de routes = UX uniquement).
2. **La source de vérité** est PostgreSQL (RLS + fonctions `security definer`) et les routes API serveur.
3. **Ne jamais faire confiance** à `business_id`, `user_id`, `plan`, `amount` fournis par le client.
4. **Isolation par commerce** : tout accès métier passe par `is_business_member(business_id)` (membre `active`).

## Multi-tenant

```text
auth.uid()
    → business_members (status = active)
    → business_id
    → données du commerce
```

Fonctions centrales :

| Fonction | Rôle |
|---|---|
| `is_business_member(uuid)` | Appartenance active |
| `member_role_for(uuid)` | Rôle dans un commerce donné |
| `has_permission(text, uuid?)` | Permission liée au commerce (pas au seul `current_business_id`) |
| `current_business_id()` | Commerce « actif » de session (UX), jamais seule barrière |

Un membre `removed` / `suspended` / `invited` ne passe pas `is_business_member`.

## RLS

Toutes les tables métier ont RLS activée (souvent `FORCE`). Les policies SELECT/INSERT/UPDATE/DELETE exigent l’appartenance au `business_id` de la ligne (ou une relation parent, ex. `sale_items` → `sales`).

Tables protégées (non exhaustif) :

- `businesses`, `profiles`, `business_members`, `business_invitations`
- `products`, `categories`, `stock_movements`
- `sales`, `sale_items`, `customers`
- `expenses`, `expense_categories`
- `suppliers`, `purchases`, `purchase_items`
- `notifications`, `audit_logs`, `business_settings`
- `subscription_plans`, `subscription_plan_features` (catalogue lecture)
- `business_subscriptions`, `subscription_transactions` (**SELECT membre uniquement** — pas d’UPDATE client)
- `payment_settings` (pas d’accès client)

Les tables sans `business_id` direct (`sale_items`, `purchase_items`) sont liées via la table parente.

## Rôles & permissions

Rôles : `owner`, `manager`, `cashier`, `seller`, `stock_manager`.

- **Owner** : toutes les permissions sur **son** commerce uniquement.
- **Manager / vendeur / …** : catalogue fixe côté SQL (`has_permission`) aligné avec `src/lib/auth/permissions.ts`.
- Un vendeur **ne peut pas** s’attribuer `owner` / `manager` via l’API : `update_member_role` exige `team.edit_role` (owner).

Les permissions sont aussi appliquées dans les policies RLS **et** les RPC `security definer` mutantes (`update_product`, `deactivate_product`, `set_product_image`, `update_expense`, `update_supplier`, `cancel_sale`, …) via `has_permission(perm, business_id)` sur le commerce de la ligne. Contourner l’UI et appeler Supabase directement ne suffit pas.

## Abonnements & plans

Source de vérité :

```text
business_subscriptions → subscription_plans → subscription_plan_features
```

- Impossible de forcer `plan = business` depuis le client.
- `change_business_plan` n’autorise que le **downgrade Free** (`PAYMENT_REQUIRED` sinon).
- Activation payante : `create_payment_checkout` → prestataire → webhook signé → `confirm_subscription_payment` (**service_role uniquement**).
- Limites (`products`, `sales_monthly`, `customers`, `team_members`) contrôlées côté SQL / RPC.

## Paiements & webhooks

- Montant / devise / plan lus en base au checkout.
- `PAYMENT_WEBHOOK_SECRET` obligatoire pour le mock (fail-closed : signature invalide ou secret absent → rejet).
- PayDunya : IPN vérifié par hash SHA-512 de la Master Key, puis `GET confirm/{token}` avant `confirm_subscription_payment`.
- Webhooks : idempotence sur la transaction ; montant / devise / environnement vérifiés en SQL.
- Mock : `confirm_mock_test_payment` et `set_mock_payments_enabled` = **service_role** ; flag `payment_settings.mock_payments_enabled` (défaut `false`).
- Une transaction d’un commerce A ne peut pas activer le commerce B.

## Service role

`SUPABASE_SERVICE_ROLE_KEY` :

- Uniquement côté serveur (`src/lib/payments/service-client.ts`, routes API).
- Jamais `NEXT_PUBLIC_*` / `VITE_*` / bundle client.
- Utilisée pour confirmer les webhooks et simuler les paiements mock.

## Stockage

| Bucket | Visibilité | Isolation |
|---|---|---|
| `business-logos` | **Public** (reçus / branding) | Écriture : membre + `settings.edit` sur le dossier `{business_id}/…` |
| `product-images` | Privé | Lecture : membre ; écriture : membre + `products.edit` |

## Variables d’environnement

Voir `.env.example`. Secrets jamais commités (`.env*` ignoré sauf `.env.example`).

## Audit logs

- SELECT pour membres avec `team.view`.
- Pas d’INSERT / UPDATE / DELETE pour `authenticated` (écriture via `write_audit_log` security definer).

## Admin

Les administrateurs de plateforme sont dans l'allowlist `platform_admins`, séparée de `business_members` : ils n'obtiennent donc aucun accès implicite aux données d'un commerce.

- `/admin/*` vérifie `is_platform_admin()` et répond `404` aux autres utilisateurs.
- `platform_admins` n'est pas lisible ni modifiable par `authenticated` ; son attribution passe exclusivement par `service_role`.
- Pour désigner le premier administrateur :

```bash
npm run admin:create
# ou
PLATFORM_ADMIN_EMAIL=toi@exemple.com npm run admin:create
```

## Rate limiting

Limiteur best-effort en mémoire (`src/lib/security/rate-limit.ts`) sur :

| Endpoint | Fenêtre | Max |
|---|---|---|
| login | 15 min | 20 |
| signup | 60 min | 10 |
| checkout | 15 min | 30 |
| webhook | 1 min | 120 |
| mock simulate | 15 min | 40 |

Complète (ne remplace pas) les protections Supabase Auth et celles de l’hébergeur. En multi-instance, chaque instance a son propre compteur.

## Test live multi-tenant

Suite `scripts/live-rls-multitenant.ts` (JWT réels A/B) :

```text
Tests : 71 — PASS : 71 — FAIL : 0
LIVE MULTI-TENANT TEST : PASS
```

Couvre SELECT/INSERT/UPDATE/DELETE cross-tenant, IDOR, storage, subscriptions, paiement, webhook, notifications, audit, vendeur (edit/deactivate/image/stock), membre `removed`, logout.

## Limites de cet audit

- Pas de pentest externe ni fuzzing automatisé exhaustif.
- Rate limiting applicatif best-effort (pas de store Redis partagé).
- Prestataire de paiement réel non branché (mock uniquement).
- Rotation obligatoire de toute clé exposée accidentellement (ex. service_role collée dans un chat).
- Ne pas déclarer SamaGestion « sécurisé à 100 % ».
