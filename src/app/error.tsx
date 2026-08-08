"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Une erreur est survenue</EmptyTitle>
          <EmptyDescription>
            L'écran n'a pas pu s'afficher. Réessayer suffit le plus souvent ; si
            le problème persiste, il vient d'ailleurs que de cette page.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={reset}>Réessayer</Button>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              Réf. {error.digest}
            </p>
          ) : null}
        </EmptyContent>
      </Empty>
    </main>
  );
}
