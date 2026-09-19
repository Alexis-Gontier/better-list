import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";
import { ShelfStatusLine } from "@/features/collection/components/shelf-status-line";
import type { ShelfSeries } from "@/features/collection/server/collection.queries";
import { mediaTitle } from "@/features/media/lib/media-format";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * L'étagère : une rangée par série, la réglette des tomes, et les manquants en toutes lettres.
 *
 * **La forme a été choisie contre une grille de jaquettes** (19 septembre 2026), et la raison est
 * la seule qui compte ici : une grille montre ce qu'on possède déjà, alors que l'écran doit
 * montrer ce qui manque. « Il me manque 51 tomes » sous une jaquette n'aide pas dans un rayon ;
 * « il me manque 11, 12, 29, 63 → 110 » est la liste de courses.
 *
 * Le prix est accepté : la rangée est haute, donc six séries remplissent un écran, et cette
 * disposition ne ressemble à aucune autre du produit.
 *
 * Composant **serveur** : rien n'y est interactif, les liens sont des liens.
 */
export function ShelfRows({
  shelf,
  titleLanguage,
}: {
  shelf: ShelfSeries[];
  titleLanguage: TitleLanguage;
}) {
  return (
    <ul className="flex flex-col">
      {shelf.map((series) => (
        <li className="border-b last:border-b-0" key={series.edition.id}>
          <ShelfRow series={series} titleLanguage={titleLanguage} />
        </li>
      ))}
    </ul>
  );
}

function ShelfRow({
  series,
  titleLanguage,
}: {
  series: ShelfSeries;
  titleLanguage: TitleLanguage;
}) {
  const title = mediaTitle(series.media.title, titleLanguage);
  const cover = series.media.coverImage?.large ?? null;
  const total = series.edition.volumesTotal;

  return (
    <Link
      className="flex gap-4 py-4 transition-colors hover:bg-muted/40"
      href={routes.collection.detail(series.media.id)}
      prefetch={false}
    >
      {/*
        Une vignette étroite, pas une jaquette : ici l'image sert à reconnaître la série d'un coup
        d'œil, pas à la donner à voir. Le rapport 2:3 est sur le conteneur pour que la rangée ne
        saute pas quand l'image arrive.

        **`self-start` est indispensable, pas décoratif.** Sans lui, l'étirement par défaut du flex
        (`align-items: stretch`) écrase la hauteur calculée par `aspect-2/3` : la vignette prend
        toute la hauteur de la rangée, et une série longue — dont la réglette passe à trois lignes
        en 390 px — se retrouve avec une jaquette deux fois trop haute que `object-cover` rogne.
      */}
      <div className="relative aspect-2/3 w-12 shrink-0 self-start overflow-hidden rounded-sm bg-muted shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
        {cover ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="48px"
            src={cover}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-sm" title={title}>
              {title}
            </p>
            {/*
              L'éditeur quand il est connu — il ne l'est jamais sur une édition créée en silence,
              AniList n'ayant aucune donnée d'édition (docs/PRODUCT.md §9). Le libellé seul suffit
              alors, plutôt qu'un tiret devant le vide.
            */}
            <p className="truncate text-muted-foreground text-xs">
              {series.edition.publisher
                ? `${series.edition.publisher} · ${series.edition.label}`
                : series.edition.label}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground text-sm tabular-nums">
              {total === null
                ? `${series.ownedCount} tomes`
                : `${series.ownedCount} / ${total}`}
            </span>
            {/*
              La pastille se tait quand l'étagère déborde du total : « complète » et « 25 / 23 »
              sur la même ligne se contredisent, et c'est la phrase en dessous qui explique.
            */}
            {series.isComplete && series.extra.length === 0 ? (
              <Badge className="text-[10px]" variant="secondary">
                Complète
              </Badge>
            ) : null}
          </div>
        </div>

        <VolumeStrip
          owned={series.ownedNumbers}
          /*
            Le maximum des deux : sans total saisi la réglette s'arrête au dernier tome possédé —
            on ne dessine pas des cases vides pour une fin de série qu'on ignore —, et un tome
            au-delà d'un total trop court reste visible plutôt que d'être effacé du dessin.
          */
          total={Math.max(total ?? 0, ...series.ownedNumbers, 0)}
        />

        {/*
          La phrase, et pas seulement la réglette. Une bande de cases dit *combien* de trous, jamais
          *lesquels* : c'est en la lisant qu'on saurait qu'il manque le 29, et personne ne compte
          vingt-neuf cases dans une librairie. La réglette montre la forme de l'étagère, la phrase
          donne la réponse — et elle n'est écrite qu'une fois, dans `shelf-status-line.tsx`.
        */}
        <ShelfStatusLine
          className="text-xs"
          extra={series.extra}
          isComplete={series.isComplete}
          missing={series.missing}
          ownedCount={series.ownedCount}
          volumesTotal={total}
        />
      </div>
    </Link>
  );
}

/**
 * La réglette : une case par tome de l'édition, pleine si le tome est sur l'étagère.
 *
 * `aria-hidden`, et ce n'est pas un renoncement : la même information est juste en dessous, en
 * français. Cent dix cases annoncées une à une à un lecteur d'écran seraient un mur, et un mur
 * moins précis que la phrase qu'il recouvre.
 *
 * Les cases enveloppent plutôt que de défiler — une série longue prend deux ou trois lignes, ce
 * qui se lit comme un rayon plutôt que comme une barre de progression, et évite un défilement
 * horizontal sur téléphone.
 */
function VolumeStrip({ owned, total }: { owned: number[]; total: number }) {
  const present = new Set(owned);

  return (
    <div aria-hidden className="flex flex-wrap gap-0.5">
      {Array.from({ length: total }, (_, index) => index + 1).map((number) => (
        <span
          className={
            present.has(number)
              ? "h-3.5 w-1.5 rounded-[1px] bg-foreground/70"
              : "h-3.5 w-1.5 rounded-[1px] bg-muted-foreground/20"
          }
          key={number}
        />
      ))}
    </div>
  );
}
