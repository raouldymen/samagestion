import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAuthOrigin } from "./origin";
import { safePostAuthNext } from "./paths";

const siteUrl = "https://app.samagestion.example";

describe("origine des liens d'authentification", () => {
  it("utilise uniquement l'URL configurée en production", () => {
    assert.equal(
      resolveAuthOrigin({
        origin: "https://attacker.example",
        forwardedHost: "attacker.example",
        host: "attacker.example",
        forwardedProto: "https",
        siteUrl,
        allowedOrigins: "https://attacker.example",
        nodeEnv: "production",
      }),
      siteUrl,
    );
  });

  it("accepte une origine locale explicitement autorisée en développement", () => {
    assert.equal(
      resolveAuthOrigin({
        origin: "http://localhost:3001",
        forwardedHost: null,
        host: null,
        forwardedProto: null,
        siteUrl,
        allowedOrigins: "http://localhost:3000, http://localhost:3001",
        nodeEnv: "development",
      }),
      "http://localhost:3001",
    );
  });

  it("ignore un hôte injecté ou non autorisé", () => {
    assert.equal(
      resolveAuthOrigin({
        origin: null,
        forwardedHost: "attacker.example",
        host: "attacker.example",
        forwardedProto: "https",
        siteUrl,
        allowedOrigins: "http://localhost:3000",
        nodeEnv: "development",
      }),
      siteUrl,
    );
  });
});

describe("redirection post-auth", () => {
  it("n'accepte que les liens d'invitation internes", () => {
    assert.equal(safePostAuthNext("/invitations/abc"), "/invitations/abc");
    assert.equal(safePostAuthNext("/dashboard"), "");
    assert.equal(safePostAuthNext("https://evil.example/invitations/x"), "");
    assert.equal(safePostAuthNext("/invitations//bypass"), "");
  });
});
