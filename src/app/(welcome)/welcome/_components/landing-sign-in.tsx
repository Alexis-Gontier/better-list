import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/config/routes";
import { ProviderButtons } from "@/features/auth/components/provider-buttons";
import { getLastLoginMethod } from "@/lib/auth/last-login-method";

/**
 * « Entrez dans le cercle ». Lit le cookie de dernière méthode : c'est pour lui que la page le pose
 * dans sa propre `<Suspense>`, le reste de la landing restant statique.
 */
export async function LandingSignIn() {
  const lastUsed = await getLastLoginMethod();

  return (
    <section className="grid items-end gap-12 px-6 py-24 sm:px-10 lg:min-h-svh lg:grid-cols-2 lg:px-16">
      <div className="flex flex-col gap-4 max-lg:order-last">
        <h2 className="font-bold font-heading text-[clamp(56px,7vw,88px)] leading-none tracking-tight">
          Entrez dans
          <br />
          le cercle
        </h2>
        <p className="max-w-sm text-muted-foreground text-sm">
          Une connexion suffit. Votre compte attend ensuite qu'un membre le
          valide.
        </p>
      </div>

      <Card className="w-full max-w-[440px] lg:mb-[30svh] lg:justify-self-center">
        <CardHeader>
          <CardTitle>Se connecter à Better-List</CardTitle>
          <CardDescription>
            Choisissez le compte que vous utilisez déjà.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderButtons callbackUrl={routes.home} lastUsed={lastUsed} />
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">
          Un premier passage crée votre compte. Il attend qu'un membre le
          valide.
        </CardFooter>
      </Card>
    </section>
  );
}
