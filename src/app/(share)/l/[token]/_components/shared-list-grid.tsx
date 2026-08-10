import Image from "next/image";

import { MediaGrid } from "@/components/shared/media-grid";
import { mirroredTitle } from "@/features/media/lib/media-format";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Les œuvres d'une liste partagée : des jaquettes et des titres, **sans lien**.
 *
 * Ce n'est pas `MediaCard`, et c'est délibéré. Cette carte-là mène à `/media/[id]`, qui est derrière
 * la garde d'accès : sur une page publique, chaque jaquette aurait renvoyé un visiteur sans compte
 * vers une connexion qu'il ne peut pas franchir — l'inscription passe par une liste d'attente
 * (docs/PRODUCT.md §7.1). Une grille entière de liens qui mènent à un mur n'est pas une grille, et
 * lui ajouter un mode « sans lien » aurait mis dans le composant le plus partagé du projet une
 * condition que quatre écrans sur cinq n'utilisent jamais.
 *
 * Tout ce qui suppose un compte est absent pour la même raison : ni progression, ni note
 * personnelle, ni « +1 ». Ce qui reste — l'image et le titre — est exactement ce qu'on partage.
 *
 * `MediaGrid` est en revanche réutilisé tel quel : les paliers de colonnes sont un calcul, pas un
 * style, et les recopier ici les ferait diverger au premier ajustement.
 */
export async function SharedListGrid({
  items,
}: {
  items: {
    id: string;
    media: {
      titleRomaji: string | null;
      titleEnglish: string | null;
      titleNative: string | null;
      coverImage: string | null;
      isAdult: boolean;
    };
  }[];
}) {
  /**
   * Sans session, `getPreferences` rend les valeurs par défaut — c'est écrit dans sa documentation,
   * et c'est ce qui permet de l'appeler ici sans cas particulier. Le propriétaire qui relit sa propre
   * page partagée y retrouve donc sa langue de titres, et un visiteur anonyme voit le romaji.
   */
  const { titleLanguage } = await getPreferences();

  return (
    <MediaGrid>
      {items.map((item) => {
        const title = mirroredTitle(item.media, titleLanguage);

        return (
          <li className="space-y-2" key={item.id}>
            <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60">
              {item.media.coverImage ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 180px"
                  src={item.media.coverImage}
                />
              ) : null}

              {/*
                Le « 18+ » suit l'œuvre partout où sa jaquette est montrée, et ici plus qu'ailleurs :
                la page s'ouvre sans compte, donc sans le filtre de contenu adulte que le reste de
                l'application applique depuis les préférences (§4.6).
              */}
              {item.media.isAdult ? (
                <div className="pointer-events-none absolute top-1.5 left-1.5">
                  <span className="rounded-md bg-destructive px-1.5 py-0.5 font-semibold text-[10px] text-white shadow-sm">
                    18+
                  </span>
                </div>
              ) : null}
            </div>

            {/* Une seule ligne, comme dans la grille de l'application : deux feraient varier la
                hauteur d'une carte à l'autre et la rangée se lirait comme un escalier. */}
            <p
              className="truncate font-medium text-sm leading-snug"
              title={title}
            >
              {title}
            </p>
          </li>
        );
      })}
    </MediaGrid>
  );
}
