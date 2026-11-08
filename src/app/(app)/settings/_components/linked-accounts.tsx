"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import {
  PROVIDER_LABELS,
  type Provider,
  ProviderLogo,
} from "@/features/auth/components/provider-logos";
import { unlinkProvider } from "@/features/auth/server/account.actions";
import { authClient } from "@/lib/auth/client";

const FALLBACK_ERROR = "L'opération n'a pas abouti. Réessayez.";

/** Ce que Better Auth renvoie en `?error=` quand la liaison échoue au retour du fournisseur. */
const LINK_ERRORS: Record<string, string> = {
  account_already_linked_to_different_user:
    "Ce compte est déjà lié à un autre membre du cercle.",
};

/**
 * Les fournisseurs configurés, chacun lié ou non (D74).
 *
 * **Lier** passe par `authClient.linkSocial` : c'est un aller-retour OAuth, il quitte la page et y
 * revient. **Délier** passe par une action, qui refuse de retirer le dernier.
 */
export function LinkedAccounts({
  providers,
  linked,
}: {
  /** Les fournisseurs configurés, dans l'ordre de `/login`. */
  providers: readonly Provider[];
  linked: readonly Provider[];
}) {
  const [linking, setLinking] = useState<Provider | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  /*
    Le retour d'une liaison ratée arrive dans l'URL : on le dit une fois, puis on nettoie l'adresse,
    sans quoi un rechargement redirait l'erreur.
  */
  const error = searchParams.get("error");
  useEffect(() => {
    if (!error) return;
    toast.error(LINK_ERRORS[error] ?? "La liaison n'a pas abouti.");
    router.replace(pathname, { scroll: false });
  }, [error, router, pathname]);

  const unlink = useAction(unlinkProvider, {
    onSuccess: ({ data }) => {
      if (data?.ok) toast.success("Fournisseur délié.");
      else if (data) toast.error(data.message);
    },
    onError: ({ error }) => toast.error(error.serverError ?? FALLBACK_ERROR),
  });

  async function link(provider: Provider) {
    setLinking(provider);
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: routes.settings,
      errorCallbackURL: routes.settings,
    });
    // En cas de succès, le navigateur part chez le fournisseur : on ne revient ici qu'en échec.
    if (error) {
      toast.error(error.message ?? FALLBACK_ERROR);
      setLinking(null);
    }
  }

  const lastOne = linked.length <= 1;

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {providers.map((provider) => {
        const isLinked = linked.includes(provider);
        const label = PROVIDER_LABELS[provider];

        return (
          <li
            className="flex items-center justify-between gap-4 px-4 py-3"
            key={provider}
          >
            <span className="flex items-center gap-3 text-sm [&_svg]:size-5">
              <ProviderLogo provider={provider} />
              <span className="flex flex-col">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">
                  {isLinked ? "Lié" : "Non lié"}
                </span>
              </span>
            </span>
            {isLinked ? (
              /*
                Désactivé plutôt que caché pour le dernier : on voit qu'il existe un geste, et le
                `title` dit pourquoi il est éteint.
              */
              <Button
                disabled={lastOne || unlink.isPending}
                onClick={() => unlink.execute({ provider })}
                size="sm"
                title={
                  lastOne
                    ? "C'est votre seule façon de vous connecter."
                    : undefined
                }
                variant="outline"
              >
                Délier
              </Button>
            ) : (
              <Button
                disabled={linking !== null}
                onClick={() => void link(provider)}
                size="sm"
                variant="outline"
              >
                Lier {label}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
