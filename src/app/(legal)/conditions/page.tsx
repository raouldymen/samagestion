import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d’utilisation",
};

export default function TermsPage() {
  return (
    <>
      <h1>Conditions d’utilisation</h1>
      <p>Dernière mise à jour : 15 septembre 2026</p>
      <p>
        En utilisant SamaGestion, vous acceptez ces conditions. Le service permet
        de gérer une activité commerciale (ventes, stocks, clients) depuis le
        navigateur ou l’application installée.
      </p>

      <h2>Compte</h2>
      <p>
        Vous êtes responsable des identifiants de votre compte et des actions
        réalisées dans votre boutique. Vous pouvez vous inscrire par e-mail ou
        via Google.
      </p>

      <h2>Usage</h2>
      <p>
        L’application doit être utilisée conformément à la loi. Vous restez
        responsable des informations que vous y saisissez.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question :{" "}
        <a className="text-primary underline" href="mailto:raouldymen@gmail.com">
          raouldymen@gmail.com
        </a>
        .
      </p>
    </>
  );
}
