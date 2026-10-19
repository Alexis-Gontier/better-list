import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { RankNumeral } from "@/components/shared/rank-numeral";
import { Separator } from "@/components/ui/separator";
import {
  listCountsLine,
  listHeadline,
  sectionHeading,
} from "@/features/lists/lib/list-labels";
import {
  listSections,
  sectionCounts,
} from "@/features/lists/lib/list-sections";
import { getSharedList } from "@/features/lists/server/lists.queries";
import { mediaTitle } from "@/features/media/lib/media-format";

/**
 * **Route bloquante, et il le faut.**
 *
 * `getSharedList` lit la base hors de tout `"use cache"` — et c'est délibéré : une page mémorisée
 * par jeton survivrait à sa révocation. Sans cette déclaration, les Cache Components tentent d'en
 * prérendre la coquille et journalisent une erreur à **chaque visite** de la seule page publique du
 * produit (« uncached data during prerendering »).
 *
 * Elle ne règle pas le statut 200 d'un jeton inconnu, décrit plus bas : `notFound()` reste sans
 * effet sous ce modèle de rendu. Les deux se ressemblent, ce sont deux problèmes distincts.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Liste partagée",
  description: "Une liste ouverte par lien.",
  /*
   * **Ne pas retirer.** C'est la seule route de l'app qui s'ouvre sans session : un lien secret
   * indexé n'est plus un secret, il est cherchable. `app/robots.ts` ferme déjà tout le site par un
   * `disallow: "/"` total, et cette balise le double au niveau de la page.
   *
   * Le titre et la description restent **génériques à dessein** : ce sont eux qui partent dans
   * l'onglet et dans l'historique du navigateur. Le nom de la liste, lui, est dans la page — et
   * dans l'aperçu du lien, que seul un destinataire déjà en possession de l'adresse peut demander
   * (`opengraph-image.tsx`).
   *
   * Le gabarit du layout racine suffixe ce titre : l'onglet affiche « Liste partagée ·
   * Better-List », et `og:title` avec lui. C'est voulu — un lien reçu dit alors d'où il vient — et
   * **ça ne divulgue rien de plus** : le nom de la liste reste hors du titre, ici comme ailleurs.
   */
  robots: { index: false, follow: false },
};

/**
 * Une liste ouverte par lien non listé (docs/conception.md §4.4).
 *
 * **La seule page du produit qui répond sans session, et sa garde est le jeton.** Elle vit hors du
 * groupe `(app)`, donc `requireApprovedUser()` ne la couvre pas — ce n'est pas un contournement de
 * la règle « une seule garde », c'est la raison d'être du groupe `(share)`.
 *
 * **Aucun cache, et jamais de `"use cache"` ici.** Une page mémorisée par jeton survivrait à sa
 * révocation, ce qui viderait de son sens le seul moyen de reprendre un lien.
 *
 * ⚠️ **Un jeton inconnu rend la page « introuvable » mais avec un statut 200, pas 404.** Mesuré sur
 * le build, pas seulement en dev : avec les Cache Components, la coquille part avant que la base ait
 * répondu, donc `notFound()` ne peut plus poser le code. `connection()` a été essayé le 6 septembre
 * 2026 pour forcer un rendu dynamique — sans effet, le build continue d'annoncer cette route en
 * rendu partiel.
 *
 * **Rien ne fuit pour autant, et c'est ce qui a été vérifié** : le corps servi pour un jeton inventé
 * comme pour un lien révoqué ne contient **aucun titre de liste**. Ce qui reste faux est le statut,
 * et il ne renseigne personne — il vaut 200 dans les trois cas, donc il ne distingue pas un lien
 * vivant d'un lien mort. À reprendre le jour où l'on saura poser un 404 sous ce modèle de rendu.
 *
 * **En lecture seule, et sans aucune trace de suivi.** Pas de `MediaCard` : elle mène à
 * `/media/[id]`, qui est derrière la garde — un visiteur sans compte n'y arriverait que sur un
 * écran de connexion qu'il ne peut pas franchir, puisque l'inscription passe par une liste
 * d'attente. Même raison que l'absence de navigation dans le layout `(share)`. Les jaquettes ne sont
 * donc pas cliquables, et c'est délibéré plutôt que faute de temps.
 *
 * **Rien n'est masqué.** Contrairement à `/lists` et `/lists/[id]`, aucun filtre 18+ : la
 * préférence appartient à un compte, et il n'y en a pas ici. La page montre la liste **telle qu'elle
 * a été partagée** (décision d'Alexis, 6 septembre 2026).
 */
export default async function SharedListPage({
  params,
}: PageProps<"/l/[token]">) {
  const { token } = await params;
  const list = await getSharedList(token);

  /*
    Jeton inconnu **et** lien révoqué rendent le même 404, et `getSharedList` les confond
    volontairement : répondre différemment confirmerait à qui essaie qu'un lien a existé ici.
  */
  if (!list) notFound();

  /*
    Sans suivi : le visiteur n'a pas celui du propriétaire, et le montrer dévoilerait sa
    bibliothèque. `entryStatus: null` partout, donc « Déjà vues » ne paraît jamais ici.
  */
  const sections = listSections(
    list.kind,
    list.cutoff,
    list.items.map((item) => ({
      item,
      mediaStatus: item.media.status,
      entryStatus: null,
    })),
  );
  const ranked = list.kind === "RANKING";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">{list.title}</h1>
          {list.description ? (
            <p className="text-pretty text-muted-foreground text-sm">
              {list.description}
            </p>
          ) : null}
          {/*
            De qui vient la liste — décision d'Alexis du 6 septembre 2026. Ça donne le contexte à qui
            reçoit le lien sans rien révéler qu'il ne sache déjà : c'est cette personne qui le lui a
            envoyé.
          */}
          <p className="text-muted-foreground text-xs">
            Une liste de {list.ownerName} ·{" "}
            {listHeadline(
              list.kind,
              list.cutoff,
              listCountsLine(list.kind, list.cutoff, {
                total: list.items.length,
                ...sectionCounts(sections),
              }),
            )}
          </p>
        </div>
        <Separator />
      </div>

      {list.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Cette liste est vide pour l'instant.
        </p>
      ) : (
        /*
          La grille du catalogue, aux mêmes paliers — mais écrite ici plutôt qu'empruntée à
          `CatalogueGrid` : celle-ci pose ses colonnes pour une page de vingt et un résultats dans
          une largeur de `max-w-6xl`, quand le layout `(share)` tient dans `max-w-5xl`. Deux
          contextes, deux densités ; les partager aurait fait dépendre l'un du réglage de l'autre.
        */
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section className="flex flex-col gap-4" key={section.key}>
              {/* Une section seule n'a rien à distinguer : son intitulé redirait l'en-tête. */}
              {section.label === null || sections.length === 1 ? null : (
                <h2 className="font-heading text-lg">
                  {sectionHeading(
                    section.key,
                    section.label,
                    section.items.length,
                  )}
                </h2>
              )}
              <ul className="grid grid-cols-3 gap-x-3 gap-y-4 lg:grid-cols-6">
                {section.items.map(({ item, rank }) => {
                  /* Pas de `titleLanguage` : il n'y a pas de compte, donc pas de préférence. Le
                     repli de `mediaTitle` sur le romaji est exactement ce qu'on veut afficher. */
                  const title = mediaTitle(item.media.title, "ROMAJI");
                  const cover =
                    item.media.coverImage?.extraLarge ??
                    item.media.coverImage?.large ??
                    null;

                  return (
                    <li className="flex flex-col gap-2" key={item.media.id}>
                      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted ring-1 ring-border ring-inset">
                        {cover ? (
                          <Image
                            alt=""
                            className="object-cover"
                            fill
                            sizes="(min-width: 1024px) 14vw, (min-width: 640px) 22vw, 30vw"
                            src={cover}
                          />
                        ) : null}
                        {ranked ? <RankNumeral rank={rank} /> : null}
                      </div>
                      <p className="min-w-0 truncate text-sm" title={title}>
                        {ranked ? (
                          <span className="sr-only">Numéro {rank}, </span>
                        ) : null}
                        {title}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
