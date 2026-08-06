"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin:
    "Impossible de démarrer Google OAuth. Vérifie GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans ton fichier .env, puis redémarre le serveur.",
  OAuthCallback:
    "Erreur au retour Google. Vérifie l’URI de redirection autorisée : http://localhost:4000/api/auth/callback/google",
  OAuthCreateAccount: "Impossible de créer le compte.",
  Callback: "Erreur de callback d’authentification.",
  AccessDenied: "Accès refusé.",
  Configuration:
    "Configuration Auth incomplète. Renseigne GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et NEXTAUTH_SECRET.",
  Default: "La connexion a échoué. Réessaie.",
};

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const message =
    error != null
      ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
      : null;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-heading text-3xl font-bold">Connexion</h1>
      <p className="text-muted-foreground">
        Connecte-toi avec Google pour enregistrer ton profil et jouer en classé.
      </p>
      {message ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button
        size="lg"
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continuer avec Google
      </Button>
      <p className="max-w-md text-xs text-muted-foreground">
        Google OAuth ne s’ouvre pas en popup : tu es redirigé vers Google. En
        local, crée un client OAuth « Application Web » dans Google Cloud et
        ajoute l’URI de redirection{" "}
        <code className="text-foreground">
          http://localhost:4000/api/auth/callback/google
        </code>
        .
      </p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[70vh] items-center justify-center px-6">
          Chargement…
        </main>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
