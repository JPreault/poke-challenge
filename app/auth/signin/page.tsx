"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { LEGAL_ROUTES } from "@/lib/legal/site-config";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const message =
    error != null
      ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
      : null;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="flex min-h-[70vh] w-full items-center justify-center">
        Redirection…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-heading text-3xl font-bold">Connexion</h1>
      <p className="text-muted-foreground">
        Connecte-toi avec Google pour enregistrer ton profil et jouer en classé.
      </p>
      {message ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <p className="max-w-md text-sm text-muted-foreground">
        Google nous transmet ton adresse e-mail, ton nom et ta photo de profil
        pour créer ton compte.
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        En te connectant avec Google, tu acceptes nos{" "}
        <Link
          href={LEGAL_ROUTES.cgu}
          className="text-foreground underline-offset-4 hover:underline"
        >
          CGU
        </Link>{" "}
        et confirmes avoir lu notre{" "}
        <Link
          href={LEGAL_ROUTES.confidentialite}
          className="text-foreground underline-offset-4 hover:underline"
        >
          politique de confidentialité
        </Link>
        .
      </p>
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
        <code className="break-all text-foreground">
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
        <main className="flex min-h-[70vh] w-full items-center justify-center">
          Chargement…
        </main>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
