import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p>Dernière mise à jour : 15 septembre 2026</p>
      <p>
        SamaGestion (« nous ») est une application de gestion pour commerçants et
        entrepreneurs. Cette page explique quelles données nous collectons et
        comment elles sont utilisées.
      </p>

      <h2>Données collectées</h2>
      <p>Selon votre usage, nous pouvons traiter :</p>
      <ul>
        <li>votre adresse e-mail, nom et photo de profil (compte Google ou inscription) ;</li>
        <li>les données de votre boutique (produits, ventes, clients, stocks, etc.) ;</li>
        <li>des informations techniques (connexion, appareil) pour sécuriser le service.</li>
      </ul>

      <h2>Connexion avec Google</h2>
      <p>
        Si vous choisissez « Continuer avec Google », Google nous transmet votre
        adresse e-mail, votre nom et, le cas échéant, votre photo de profil. Nous
        utilisons ces informations uniquement pour créer ou ouvrir votre compte
        SamaGestion. Nous n’accédons pas à vos e-mails ni à vos autres données
        Google.
      </p>

      <h2>Utilisation</h2>
      <p>
        Les données servent à vous identifier, à faire fonctionner l’application,
        à gérer les abonnements et à assurer la sécurité du service.
      </p>

      <h2>Conservation et partage</h2>
      <p>
        Vos données sont hébergées chez nos prestataires (hébergement et
        authentification). Nous ne les vendons pas. Elles sont conservées tant
        que votre compte est actif, puis supprimées ou anonymisées dans un délai
        raisonnable après clôture, sauf obligation légale.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès, la rectification ou la suppression de vos
        données. Contact :{" "}
        <a className="text-primary underline" href="mailto:raouldymen@gmail.com">
          raouldymen@gmail.com
        </a>
        .
      </p>
    </>
  );
}
