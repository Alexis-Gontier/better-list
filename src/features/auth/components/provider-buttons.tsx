"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  PROVIDER_LABELS,
  type Provider,
  ProviderLogo,
} from "@/features/auth/components/provider-logos";
import { signIn } from "@/lib/auth/client";

/**
 * Les trois fournisseurs, **tous en contour** : aucun n'est l'action principale, c'est la personne
 * qui sait lequel est le sien. Celui de la dernière fois porte la pastille « Dernière », posée
 * sur le coin haut droit du bouton (D56).
 *
 * L'état de chargement ne revient pas à `false` en cas de succès : la page part chez le fournisseur.
 */
export function ProviderButtons({
  callbackUrl,
  lastUsed,
  providers,
}: {
  callbackUrl: string;
  lastUsed: Provider | null;
  /** Ceux qui ont des identifiants (`ENABLED_PROVIDERS`) : un bouton sans fournisseur échouerait. */
  providers: readonly Provider[];
}) {
  const [pending, setPending] = useState<Provider | null>(null);

  async function handleSignIn(provider: Provider) {
    setPending(provider);

    const { error } = await signIn.social({
      provider,
      callbackURL: callbackUrl,
    });

    if (error) {
      toast.error("La connexion a échoué.", {
        description: error.message ?? "Réessayez dans un instant.",
      });
      setPending(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3.5">
      {providers.map((provider) => (
        <div className="relative" key={provider}>
          <Button
            className="w-full"
            disabled={pending !== null}
            onClick={() => handleSignIn(provider)}
            size="lg"
            type="button"
            variant="outline"
          >
            {pending === provider ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ProviderLogo provider={provider} />
            )}
            Continuer avec {PROVIDER_LABELS[provider]}
          </Button>
          {lastUsed === provider ? (
            <Badge className="pointer-events-none absolute top-0 right-0 h-6 translate-x-2 -translate-y-1/2 px-2.5 text-[13px]">
              Dernière
            </Badge>
          ) : null}
        </div>
      ))}
    </div>
  );
}
