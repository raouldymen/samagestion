# SamaGestion

Application de gestion pour petits commerces et entrepreneurs en Afrique francophone.

## Démarrage

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Base de données

Appliquez **toutes** les migrations présentes dans `supabase/migrations/`, dans leur ordre chronologique. Elles construisent progressivement le schéma, les politiques RLS, les modules métier et les protections de sécurité.

Avec la CLI Supabase liée à votre projet :

```bash
supabase db push
```

Si vous utilisez l’éditeur SQL Supabase, exécutez chaque fichier de migration dans l’ordre de son préfixe numérique. Ne vous limitez pas à la migration initiale : les migrations suivantes ajoutent notamment les produits, ventes, dépenses, achats, abonnements, paiements et correctifs de sécurité.

Dans Authentication → URL Configuration, ajoutez `http://localhost:3000/auth/callback` aux Redirect URLs.

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — compilation de production
- `npm run start` — serveur de production
- `npm run lint` — lint
- `npm run test` — tests unitaires
- `npm run test:rls` — test d’intégration multi-comptes (nécessite une instance Supabase locale ou dédiée et les variables Supabase)
