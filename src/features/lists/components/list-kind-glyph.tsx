import type { ReactNode } from "react";

import type { ListKind } from "@/features/lists/schemas/lists.schema";
import { cn } from "@/lib/utils";

/**
 * Ce qu'un genre de liste **produira à l'écran**, en miniature : des jaquettes au rapport 2:3, et
 * ce que le genre leur ajoute — des rangs, une progression, des prêtes et des en-parution.
 *
 * On reconnaît un genre d'un coup d'œil au lieu de lire sa définition. Tout est en `currentColor`
 * (D33) : la carte qui l'entoure décide de la teinte, l'iris ne marquant que celle qu'on a choisie.
 */
export function ListKindGlyph({
  kind,
  className,
}: {
  kind: ListKind;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      className={cn("h-10 w-16 shrink-0", className)}
      fill="none"
      viewBox="0 0 64 40"
    >
      {GLYPHS[kind]}
    </svg>
  );
}

/** Une jaquette : 2:3, coins de 1,5 — la `MediaCard` vue de très loin. */
function Cover({
  x,
  y = 4,
  w = 12,
  dashed = false,
  muted = false,
}: {
  x: number;
  y?: number;
  w?: number;
  dashed?: boolean;
  muted?: boolean;
}) {
  return (
    <rect
      fill={dashed ? "none" : "currentColor"}
      fillOpacity={muted ? 0.25 : 0.55}
      height={w * 1.5}
      rx={1.5}
      stroke="currentColor"
      strokeDasharray={dashed ? "2 2" : undefined}
      strokeOpacity={dashed ? 0.7 : 0}
      width={w}
      x={x}
      y={y}
    />
  );
}

const GLYPHS: Record<ListKind, ReactNode> = {
  // Quatre jaquettes côte à côte, sans rien d'autre : l'ordre n'y dit rien.
  SELECTION: (
    <>
      <Cover x={2} y={7} />
      <Cover x={17} y={7} />
      <Cover x={32} y={7} />
      <Cover x={47} y={7} />
    </>
  ),
  // Le premier en grand, et des chiffres sous chaque jaquette : l'ordre est l'information.
  RANKING: (
    <>
      <Cover w={14} x={4} y={2} />
      <Cover x={25} y={7} />
      <Cover x={44} y={7} />
      <text fill="currentColor" fontSize="11" fontWeight="800" x={8} y={38}>
        1
      </text>
      <text fill="currentColor" fontSize="9" fontWeight="800" x={28} y={38}>
        2
      </text>
      <text fill="currentColor" fontSize="9" fontWeight="800" x={47} y={38}>
        3
      </text>
    </>
  ),
  // Des jaquettes, et une barre qui avance : une file qu'on vide.
  WATCHLIST: (
    <>
      <Cover muted x={2} y={2} />
      <Cover muted x={17} y={2} />
      <Cover x={32} y={2} />
      <Cover x={47} y={2} />
      <rect
        fill="currentColor"
        fillOpacity={0.2}
        height={3}
        rx={1.5}
        width={57}
        x={2}
        y={33}
      />
      <rect fill="currentColor" height={3} rx={1.5} width={26} x={2} y={33} />
    </>
  ),
  // Deux prêtes, cochées ; deux en parution, en pointillés : elles ne sont pas encore là.
  WAIT_FOR_END: (
    <>
      <Cover x={2} y={7} />
      <Cover x={17} y={7} />
      <Cover dashed x={34} y={7} />
      <Cover dashed x={49} y={7} />
      <path
        d="M5 33.5l2.5 2.5 5-5M20 33.5l2.5 2.5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </>
  ),
};
