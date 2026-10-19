"use client";

import { EyeIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { RankNumeral } from "@/components/shared/rank-numeral";

/**
 * Une œuvre 18+ d'une liste partagée : **floutée, titre compris, jusqu'à ce qu'on la révèle** (D49).
 *
 * Le visiteur n'a pas de compte, donc pas de préférence 18+ ; le lien peut partir hors du cercle.
 * Rien n'est retiré — la liste reste celle qu'on a partagée, décompte compris —, mais rien n'est
 * imposé non plus : un clic suffit, et il ne vaut que pour cette œuvre.
 *
 * Le titre est remplacé et non flouté : un texte flou se lit encore, et un lecteur d'écran le
 * lirait en entier.
 */
export function AdultItem({
  cover,
  title,
  rank,
}: {
  cover: string | null;
  title: string;
  /** Le rang, pour un classement ; absent sinon. */
  rank?: number;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted ring-1 ring-border ring-inset">
        {cover ? (
          <Image
            alt=""
            className={
              revealed
                ? "object-cover"
                : "scale-110 object-cover blur-xl brightness-75"
            }
            fill
            sizes="(min-width: 1024px) 14vw, (min-width: 640px) 22vw, 30vw"
            src={cover}
          />
        ) : null}
        {rank !== undefined ? <RankNumeral rank={rank} /> : null}
        {revealed ? null : (
          <button
            aria-label={`Afficher cette œuvre réservée aux adultes${rank !== undefined ? `, numéro ${rank}` : ""}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white"
            onClick={() => setRevealed(true)}
            type="button"
          >
            <span className="rounded-sm bg-black/60 px-1.5 py-0.5 font-medium text-xs">
              18+
            </span>
            <span className="flex items-center gap-1 text-xs">
              <EyeIcon aria-hidden className="size-3.5" />
              Afficher
            </span>
          </button>
        )}
      </div>
      <p
        className="min-w-0 truncate text-sm"
        title={revealed ? title : undefined}
      >
        {rank !== undefined ? (
          <span className="sr-only">Numéro {rank}, </span>
        ) : null}
        {revealed ? (
          title
        ) : (
          <span className="text-muted-foreground">Œuvre 18+</span>
        )}
      </p>
    </>
  );
}
