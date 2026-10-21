import Image from "next/image";
import { connection } from "next/server";

import { searchMedia } from "@/features/media/server/media.queries";
import { cn } from "@/lib/utils";

/**
 * Les colonnes du mur, **chacune à son rythme**.
 *
 * Des durées différentes et des sens alternés : quatre colonnes qui glisseraient d'un même bloc se
 * liraient comme une seule image qui monte, pas comme un mur. Les durées sont longues exprès — le
 * mouvement doit se remarquer du coin de l'œil, pas tirer le regard loin du bouton.
 */
const COLUMNS = [
  { duration: "[--cover-duration:70s]", reverse: false },
  { duration: "[--cover-duration:90s]", reverse: true },
  { duration: "[--cover-duration:64s]", reverse: false },
  { duration: "[--cover-duration:82s]", reverse: true },
] as const;

/** Les passages de la liste d'une colonne — voir le rendu, plus bas. */
const ROUNDS = ["a", "b", "c", "d"] as const;

/**
 * Le mur de jaquettes des pages d'authentification : **les tendances du moment, inclinées, qui
 * défilent**.
 *
 * Inspiré de la page premium d'Ortega Scans (demande d'Alexis, 2 octobre 2026) : une grille de
 * quatre colonnes tournée en perspective, chaque colonne en boucle verticale, fondue dans le fond
 * par deux masques — vers le bas et le haut pour qu'elle n'ait pas de bord, vers la gauche pour
 * laisser le texte lisible.
 *
 * **Aucune requête de plus au quota AniList.** Les paramètres sont exactement ceux de la rangée
 * « Tendances » de l'accueil pour un compte sans contenu adulte : `searchMedia` sert donc la même
 * entrée de cache. `includeAdult: false` n'est pas qu'une économie : la page est vue avant toute
 * connexion, donc avant toute préférence.
 *
 * **Les jaquettes y sont celles du catalogue** — même rayon, même liseré interne que `MediaCard` :
 * c'est la seule chose colorée de l'écran, comme partout ailleurs sur le site.
 *
 * Une panne rend le mur vide plutôt qu'une erreur — la page de connexion doit toujours s'afficher.
 * Le mouvement s'arrête quand le système demande de réduire les animations.
 */
export async function CoverWall() {
  // Lu à la requête, jamais au build : Next fait échouer un prérendu sur toute erreur d'un
  // `"use cache"`, même rattrapée, et une panne d'AniList bloquait alors tout déploiement (D52).
  await connection();
  const trending = await searchMedia({
    page: 1,
    perPage: 20,
    sortDirection: "DESC",
    includeAdult: false,
    type: "ANIME",
    sortField: "TRENDING",
  });

  const covers = (trending?.items ?? []).flatMap((media) => {
    const src = media.coverImage?.large ?? media.coverImage?.extraLarge;
    return src ? [{ id: media.id, src }] : [];
  });
  if (covers.length < COLUMNS.length) return null;

  const columns = COLUMNS.map((settings, column) => ({
    ...settings,
    id: `colonne-${column}`,
    covers: covers.filter((_, index) => index % COLUMNS.length === column),
  }));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full overflow-hidden opacity-20 [mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_70%,transparent)] lg:w-[52vw] lg:opacity-100"
    >
      <div className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent,rgb(0_0_0/0.55)_26%,#000_62%)]">
        <div className="absolute -inset-y-64 -right-16 -left-24 perspective-[1500px]">
          <div className="grid h-full rotate-y-[-17deg] rotate-z-[-5deg] grid-cols-4 gap-4 transform-3d">
            {columns.map((column) => (
              <div
                className={cn(
                  "flex animate-cover-rise flex-col motion-reduce:animate-none",
                  column.duration,
                  column.reverse && "[animation-direction:reverse]",
                )}
                key={column.id}
              >
                {/*
                  Cinq jaquettes par colonne, **passées quatre fois**. Deux tours suffisent à
                  dépasser la hauteur d'un grand écran ; les deux suivants sont la copie dont
                  l'animation a besoin pour boucler sans raccord (`cover-rise`, globals.css).
                */}
                {ROUNDS.map((round) =>
                  column.covers.map((cover) => (
                    <div className="pb-4" key={`${round}-${cover.id}`}>
                      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted ring-1 ring-border ring-inset">
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="(min-width: 1024px) 15vw, 25vw"
                          src={cover.src}
                        />
                      </div>
                    </div>
                  )),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
