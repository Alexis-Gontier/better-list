import { HeartIcon } from "lucide-react";
import Image from "next/image";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { PersonPreviewData } from "@/features/media/schemas/media.schema";
import { bioExcerpt } from "@/features/people/lib/people-bio";
import {
  formatAge,
  formatFuzzyDate,
  formatGender,
} from "@/features/people/lib/people-format";

/**
 * Même délai d'ouverture que le survol d'une jaquette (`media-hover-card.tsx`) : une grille de
 * vingt-cinq personnes se traverse sans faire clignoter un panneau par carte. La fermeture est
 * courte, le panneau n'a rien de cliquable à protéger.
 */
const OPEN_DELAY = 400;
const CLOSE_DELAY = 100;

/**
 * Le survol d'un personnage, d'un doubleur ou d'un membre de l'équipe sur la fiche d'une œuvre
 * (demande d'Alexis, 29 septembre 2026).
 *
 * **Ce qu'il ajoute à la carte** : la carte ne dit qu'un nom, souvent coupé, et un rôle. Le panneau
 * rend le nom entier et le nom natif, un portrait lisible — celui de la carte fait 56 px —, l'âge,
 * le genre, l'anniversaire, les favoris, et **le début de la biographie**, sans la fiche technique
 * ni les spoilers (`bioExcerpt`). De quoi savoir qui c'est avant d'ouvrir sa page.
 *
 * **Le `HoverCard` de shadcn, et pas le panneau accroché au curseur des jaquettes.** Celui-là suit
 * la souris parce qu'une jaquette est grande et que le panneau la recouvrait ; une carte de
 * personne est une bande basse, et un panneau ancré dessous ne cache rien de ce qu'on regarde.
 * Radix apporte le reste : délais, portail, bascule de côté contre les bords, ouverture au focus.
 *
 * **Au doigt, il ne s'ouvre pas**, et c'est voulu : Radix ignore le toucher sur cette primitive.
 * Le panneau ne porte rien d'essentiel — le lien, lui, mène à la page entière.
 *
 * Composant serveur : les primitives de `hover-card.tsx` sont des feuilles clientes, et le contenu
 * leur arrive déjà rendu.
 */
export function PersonHoverCard({
  person,
  subtitle,
  align = "start",
  children,
}: {
  person: PersonPreviewData;
  /** Ce que la personne est pour cette œuvre : « Principal », « Doubleur · Japonais », un poste. */
  subtitle: string | null;
  align?: "start" | "end";
  /** Le lien de la carte, qui sert de déclencheur. */
  children: React.ReactNode;
}) {
  return (
    <HoverCard closeDelay={CLOSE_DELAY} openDelay={OPEN_DELAY}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align={align} className="w-80 p-3">
        <PersonPreview person={person} subtitle={subtitle} />
      </HoverCardContent>
    </HoverCard>
  );
}

function PersonPreview({
  person,
  subtitle,
}: {
  person: PersonPreviewData;
  subtitle: string | null;
}) {
  const facts = [
    formatAge(person.age),
    formatGender(person.gender),
    formatFuzzyDate(person.dateOfBirth),
  ].filter((fact): fact is string => fact !== null);
  const excerpt = bioExcerpt(person.description);
  const portrait = person.image?.large ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
          {portrait ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="80px"
              src={portrait}
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-semibold leading-tight">
            {person.name.full ?? "Sans nom"}
          </p>
          {person.name.native ? (
            <p className="text-muted-foreground text-xs">
              {person.name.native}
            </p>
          ) : null}
          {subtitle ? (
            <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-[0.12em]">
              {subtitle}
            </p>
          ) : null}

          {/* Poussés en bas du bloc : la ligne de faits et les favoris s'alignent sur le portrait. */}
          <div className="mt-auto flex flex-col gap-1 pt-1 text-xs">
            {facts.length > 0 ? <p>{facts.join(" · ")}</p> : null}
            {person.favourites ? (
              <p className="flex items-center gap-1 text-muted-foreground tabular-nums">
                <HeartIcon aria-hidden className="size-3" />
                {new Intl.NumberFormat("fr-FR").format(person.favourites)}
                <span className="sr-only">favoris sur AniList</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {excerpt ? (
        <p className="line-clamp-4 text-muted-foreground text-xs/5">
          {excerpt}
        </p>
      ) : null}
    </div>
  );
}
