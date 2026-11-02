import { routes } from "@/config/routes";
import { ProviderButtons } from "@/features/auth/components/provider-buttons";
import { getLastLoginMethod } from "@/lib/auth/last-login-method";

/**
 * La fin de page : une phrase, les trois fournisseurs, et du vide décidé autour. Lit le cookie de
 * dernière méthode : c'est pour lui que la page le pose dans sa propre `<Suspense>`.
 */
export async function LandingClose() {
  const lastUsed = await getLastLoginMethod();

  return (
    <section className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 pt-[24svh] pb-[18svh]">
      <h2 className="text-pretty text-xl">
        Une connexion suffit. Un membre valide ensuite votre compte.
      </h2>
      <ProviderButtons callbackUrl={routes.home} lastUsed={lastUsed} />
    </section>
  );
}
