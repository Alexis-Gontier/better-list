import Image from "next/image";

import { formatCharacterRole } from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaCharactersProps = {
  media: MediaDetail;
};

/**
 * Les personnages, et qui les double.
 *
 * **Douze au plus, et c'est la requête qui le décide** (`characters(perPage: 12)`) : la pagination
 * d'AniList permettrait d'aller plus loin, mais chaque page suivante coûterait une requête sur les
 * trente de la minute que le serveur partage entre tous les visiteurs. Douze suffisent à couvrir la
 * distribution principale d'à peu près n'importe quelle série.
 *
 * Le doubleur affiché est le **japonais**, seule langue demandée par la requête. C'est un choix de
 * `media.documents.ts` et pas d'ici : AniList sait les rendre toutes, mais une fiche qui liste six
 * voix par personnage n'est plus une fiche.
 *
 * Aucun portrait ne mène nulle part : nous n'avons pas d'écran de personnage, et un lien vers
 * AniList à chaque visage sortirait du produit douze fois par fiche.
 */
export function MediaCharacters({ media }: MediaCharactersProps) {
  // Un personnage sans nom n'est pas affichable — AniList laisse le champ nul sur des fiches
  // ébauchées, et une carte anonyme sous un portrait ne dit rien.
  const characters = media.characters.edges.filter(
    (edge) => edge.node.name.full,
  );

  if (characters.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Personnages</h2>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {characters.map((edge) => {
          const role = formatCharacterRole(edge.role);
          const voice = edge.voiceActors[0]?.name.full ?? null;

          return (
            <li className="flex min-w-0 flex-col gap-2" key={edge.node.id}>
              {/*
                Même matière que la carte du catalogue : rapport 2:3, liseré **interne** de 8 % de
                blanc. Interne parce qu'une bordure ajouterait un pixel à la boîte et désalignerait
                la grille — c'est le premier des trois leviers de signature de la spec du
                2 septembre, et il vaut partout où une image est posée sur le fond.
              */}
              <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
                {edge.node.image?.large ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 12rem, (min-width: 640px) 25vw, 45vw"
                    src={edge.node.image.large}
                  />
                ) : null}
              </div>

              <div className="min-w-0">
                {/*
                  Un nom par ligne, coupé au besoin : sur deux lignes, la hauteur des cartes varie
                  d'une colonne à l'autre et la grille perd son alignement. Décision déjà prise pour
                  les vignettes du catalogue, le 6 septembre.
                */}
                <p
                  className="truncate font-medium text-sm"
                  title={edge.node.name.full ?? undefined}
                >
                  {edge.node.name.full}
                </p>

                {role ? (
                  <p className="truncate text-muted-foreground text-xs">
                    {role}
                  </p>
                ) : null}

                {/*
                  Le doubleur est **en dessous et en retrait**, jamais sur la même ligne que le
                  personnage : ce sont deux personnes, et les mettre côte à côte laisse chercher
                  laquelle est laquelle.
                */}
                {voice ? (
                  <p
                    className="truncate text-muted-foreground text-xs"
                    title={voice}
                  >
                    Voix : {voice}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
