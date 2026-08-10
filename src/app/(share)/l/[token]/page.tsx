import type { Metadata } from "next";
import { Suspense } from "react";

import {
  SharedList,
  SharedListSkeleton,
} from "@/app/(share)/l/[token]/_components/shared-list";
import { LOCALE } from "@/config/locale";
import { site } from "@/config/site";
import { getSharedList } from "@/features/lists/server/lists.queries";

/**
 * Une liste partagée par lien non listé (docs/PRODUCT.md §4.4).
 *
 * **La seule page du projet qui répond sans session.** Sa garde n'est pas l'identité du lecteur —
 * il n'en a pas — mais la possession du jeton : `getSharedList` ne rend une liste que si ce jeton
 * correspond exactement à une ligne, et rend `null` aussi bien pour un jeton faux que pour un
 * partage révoqué. Les deux donnent la même page introuvable, ce qui retire tout intérêt à en
 * essayer au hasard.
 *
 * **En lecture seule, et pas par oubli** : ni glisser-déposer, ni retrait, ni « +1 ». Ces commandes
 * passent par des Server Actions qui exigent une session ; les dessiner pour un visiteur qui n'en a
 * pas reviendrait à afficher des boutons qui échouent.
 *
 * **Un jeton inconnu rend la bonne page, mais un statut 200.** Mesuré, puis vérifié dans la
 * documentation embarquée (`not-found.md`) : avec Cache Components, toute route dynamique diffuse
 * une coquille statique avant d'exécuter quoi que ce soit, donc la réponse a commencé en 200 quand
 * `notFound()` survient — un statut ne se change plus une fois le flux ouvert. Next appelle ça un
 * « soft 404 » et recommande, pour un vrai 404, de faire le contrôle **dans le proxy** : ce projet
 * s'y refuse, `src/proxy.ts` ne lisant jamais la base sous peine d'un aller-retour par requête pour
 * tout le monde. Le `noindex` ci-dessous est la parade que la documentation indique elle-même, et
 * l'échange n'en vaut pas la peine pour une page qu'aucun moteur n'indexe.
 */

/** Le partage n'est pas une publication : « non listé » veut dire introuvable autrement que par le lien. */
const UNLISTED_ROBOTS = { index: false, follow: false } as const;

export async function generateMetadata({
  params,
}: PageProps<"/l/[token]">): Promise<Metadata> {
  const { token } = await params;
  const list = await getSharedList(token);

  // Pas de titre qui trahisse l'existence de la liste : un jeton révoqué doit ressembler à un jeton
  // qui n'a jamais existé, dans l'onglet du navigateur comme dans la page.
  if (!list) return { title: "Liste introuvable", robots: UNLISTED_ROBOTS };

  const owner = list.owner.name ?? list.owner.username;
  const description =
    list.description ??
    `Une liste de ${list.items.length.toLocaleString(LOCALE)} œuvres partagée par ${owner}.`;

  return {
    title: list.title,
    description,
    robots: UNLISTED_ROBOTS,
    /**
     * `openGraph` est ce que lit une messagerie qui déplie le lien. L'image n'est pas déclarée ici :
     * `opengraph-image.tsx`, à côté de ce fichier, est détectée par Next et ajoutée d'office — la
     * nommer une seconde fois créerait deux sources pour la même balise.
     */
    openGraph: { title: list.title, description, siteName: site.name },
  };
}

export default function SharedListPage({ params }: PageProps<"/l/[token]">) {
  return (
    <Suspense fallback={<SharedListSkeleton />}>
      <SharedList params={params} />
    </Suspense>
  );
}
