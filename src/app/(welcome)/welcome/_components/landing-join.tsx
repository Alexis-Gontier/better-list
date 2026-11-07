import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { ProviderButtons } from "@/features/auth/components/provider-buttons";
import { getShowcase } from "@/features/media/server/showcase.queries";
import { getLastLoginMethod } from "@/lib/auth/last-login-method";
import { ENABLED_PROVIDERS } from "@/lib/auth/providers";

/**
 * L'appel final, connexion comprise : pas besoin de passer par `/login`. Posé sur la bannière
 * d'une tendance du moment ; sans elle, le fond uni de la carte suffit. Lit le cookie de dernière
 * méthode, d'où sa `<Suspense>` dans la page.
 */
export async function LandingJoin() {
  const [lastUsed, { banner }] = await Promise.all([
    getLastLoginMethod(),
    getShowcase(),
  ]);

  return (
    <section className="reveal relative isolate overflow-hidden rounded-2xl border bg-card px-5 py-14 sm:rounded-3xl sm:px-12 sm:py-24">
      {banner ? (
        <>
          <Image
            alt=""
            className="-z-10 object-cover"
            fill
            sizes="(min-width: 1152px) 1152px, 100vw"
            src={banner.src}
          />
          {/* Le voile porte la lisibilité du titre : c'est la seule raison de cette transparence. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-background/75"
          />
        </>
      ) : null}
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6 text-center">
        <h2 className="text-balance font-heading font-semibold text-3xl tracking-tight sm:text-5xl">
          Votre carnet vous attend
        </h2>
        <p className="text-pretty text-lg">
          Une connexion suffit. Un membre valide ensuite votre compte.
        </p>
        <ProviderButtons
          callbackUrl={routes.home}
          lastUsed={lastUsed}
          providers={ENABLED_PROVIDERS}
        />
        {banner ? (
          <p className="text-muted-foreground text-xs">{banner.title}</p>
        ) : null}
      </div>
    </section>
  );
}

/** Le squelette de l'appel final : la carte à sa hauteur, titre, phrase, trois boutons `lg` (40). */
export function LandingJoinSkeleton() {
  return (
    <div className="rounded-2xl border bg-card px-5 py-14 sm:rounded-3xl sm:px-12 sm:py-24">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <Skeleton className="h-9 w-72 sm:h-12" />
        <Skeleton className="h-14 w-full" />
        <div className="flex w-full flex-col gap-3.5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
