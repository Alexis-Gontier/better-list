import { AniListOutageNotice } from "@/components/layout/anilist-outage-notice";
import { BackToTop } from "@/components/layout/back-to-top";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { requireApprovedUser } from "@/lib/auth/session";
import { isAniListDown } from "@/lib/http/anilist";

/**
 * L'application authentifiée bloque sur la lecture de session, et c'est assumé.
 *
 * `cacheComponents` valide que chaque segment produise une coquille statique instantanée. Ce
 * layout ne peut pas : son rôle est justement de refuser le rendu à qui n'a pas le droit de voir
 * la page. Servir une coquille avant de savoir qui demande reviendrait à afficher l'application à
 * un visiteur non autorisé.
 *
 * Le coût réel est faible : `cookieCache` est activé côté Better Auth, donc la lecture de session
 * est une vérification HMAC de cookie, pas un aller-retour base.
 */
export const instant = false;

/**
 * Garde d'accès de toute l'application authentifiée.
 *
 * **Elle est posée ici et nulle part ailleurs.** Répéter la vérification page par page revient à
 * l'oublier un jour sur une route, et une seule route oubliée ouvre tout le reste. `src/proxy.ts`
 * ne fait qu'une redirection optimiste sur présence de cookie : c'est cet appel qui valide
 * réellement la session et le statut `APPROVED` (docs/conception.md §7.1).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireApprovedUser();

  return (
    /*
      `overflow-x-clip` est posé **ici et pas sur le `main`**, et l'endroit n'est pas indifférent :
      un `overflow` recoupe à la boîte de l'élément qui le porte. Sur le `main`, qui fait
      `max-w-6xl`, il rognait la bannière pleine largeur de la fiche média à 1152 px — visible
      comme deux marges sur les côtés.
      Sur ce conteneur, qui occupe toute la largeur disponible, il ne rattrape plus que le
      dépassement d'un enfant en `w-screen` : `100vw` compte la barre de défilement, donc quelques
      pixels de chaque côté, qui feraient sinon apparaître un défilement horizontal.
      `clip` et non `hidden` : `hidden` créerait un conteneur de défilement, et tout ce qui est
      collant à l'intérieur — l'en-tête, la barre d'onglets, le panneau de suivi — cesserait de
      coller.
    */
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      {/*
        Au-dessus de l'en-tête : un avis d'incident vaut pour toute l'app, pas pour une page. Il
        est donc rendu **ici**, une fois, et non par l'écran qui a découvert la panne — c'était le
        cas jusqu'au 5 septembre, et seule la fiche savait alors l'afficher.

        La lecture est synchrone et ne coûte rien : `isAniListDown` interroge la mémoire du
        processus, pas AniList. Sonder l'API à chaque affichage de page dépenserait le quota qu'on
        prétend justement protéger.
      */}
      <AniListOutageNotice initialDown={isAniListDown()} />
      <Header user={user} />
      <main className="container mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>

      {/*
        **Hors du `main`, et c'est un choix de structure, pas de style.** Le pied de page n'est pas
        le contenu de la page courante : le mettre dedans le ferait annoncer comme tel par un
        lecteur d'écran, et il entrerait dans la largeur maximale du contenu au lieu de porter sa
        propre bordure d'un bord à l'autre.
      */}
      <Footer withNavigation />
      <BackToTop />
    </div>
  );
}
