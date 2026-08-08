"use client";

import "@/styles/globals.css";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            L'application n'a pas démarré
          </h1>
          <p className="text-muted-foreground">
            Quelque chose a échoué avant même que la page puisse se rendre.
            Recharger devrait suffire.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              Réf. {error.digest}
            </p>
          ) : null}
          <div>
            <Button type="button" size="lg" onClick={reset}>
              Recharger
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
