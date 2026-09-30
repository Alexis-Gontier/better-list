import { HeartIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { BlurredBackdrop } from "@/components/shared/blurred-backdrop";
import { Badge } from "@/components/ui/badge";
import { BioSpoiler } from "@/features/people/components/bio-spoiler";
import {
  BioSegments,
  PersonBio,
} from "@/features/people/components/person-bio";
import {
  type PersonFact,
  PersonFacts,
} from "@/features/people/components/person-facts";
import { parseBio, splitBioFacts } from "@/features/people/lib/people-bio";

type PersonHeaderProps = {
  image: string | null;
  name: string | null;
  native: string | null;
  alternatives: (string | null)[];
  /** Les surnoms qui trahissent l'intrigue (« Joy Boy ») : masqués comme un spoiler de biographie. */
  spoilerAlternatives?: (string | null)[];
  favourites: number | null;
  /** Les faits qu'AniList donne en champs : anniversaire, âge, genre… */
  facts: PersonFact[];
  /** La biographie brute. Sa fiche technique de tête rejoint `facts`, le reste est rendu à droite. */
  description: string | null;
  /** Le geste posé à côté du nom — le cœur des favoris. Rendu par la page, qui connaît la cible. */
  action?: ReactNode;
};

/**
 * Le profil d'une page Personnage ou Staff : bande, portrait, nom, autres noms, favoris, puis les
 * faits en colonne et la biographie à côté. Deux appelants dès sa création, donc dans
 * `features/people/components/`.
 *
 * **Reprise le 29 septembre 2026** (demande d'Alexis), sur trois constats relevés à l'écran :
 *
 * - **La page n'avait pas d'identité visuelle.** Portrait et texte sur fond nu, là où la fiche d'une
 *   œuvre ouvre sur sa bannière. Une personne n'a pas de bannière chez AniList ; son portrait,
 *   agrandi et flouté, en fait une — la même bande pleine largeur que `MediaBanner`, pour que
 *   passer d'une œuvre à un personnage garde la même charpente.
 * - **Les autres noms tenaient en une phrase de quinze virgules.** En pastilles, chacun se lit seul.
 * - **La biographie commençait par un bloc de gras** — « Height: 172 cm », « Devil Fruit: … » —,
 *   des faits écrits en prose. `splitBioFacts` les rend à la liste des faits, et la biographie
 *   commence enfin par une phrase.
 *
 * **Deux colonnes, comme sur AniList** : le portrait à gauche, tout le reste à droite — nom, faits
 * en tuiles, biographie. Les faits ont d'abord vécu en colonne sous le portrait ; Luffy en compte
 * douze, et la colonne descendait deux écrans plus bas que la biographie, laissant un trou à sa
 * droite. En tuiles, ils tiennent en trois rangées.
 */
export function PersonHeader({
  image,
  name,
  native,
  alternatives,
  spoilerAlternatives = [],
  favourites,
  facts,
  description,
  action,
}: PersonHeaderProps) {
  const others = alternatives.filter((value): value is string =>
    Boolean(value),
  );
  const hidden = spoilerAlternatives.filter((value): value is string =>
    Boolean(value),
  );

  const { facts: bioFacts, body } = splitBioFacts(parseBio(description));
  const allFacts: PersonFact[] = [
    ...facts,
    ...bioFacts.map((fact) => ({
      label: fact.label,
      value: <BioSegments segments={fact.value} />,
    })),
  ];

  return (
    <header className="flex flex-col gap-8">
      <BlurredBackdrop image={image} />

      <div className="-mt-24 relative grid gap-5 sm:-mt-32 sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-8 lg:grid-cols-[12rem_1fr] lg:gap-10">
        <div className="relative aspect-2/3 w-32 overflow-hidden rounded-lg bg-muted shadow-lg ring-4 ring-background sm:w-full">
          {image ? (
            <Image
              alt=""
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 192px, 160px"
              src={image}
            />
          ) : null}
        </div>

        {/*
          `sm:pt-36` : la colonne commence 128 px au-dessus du bas de la bande (`-mt-32`), et le nom
          doit se poser **dessous**, sur le fond de la page, plutôt que par-dessus le flou où il
          perdrait son contraste.
        */}
        <div className="flex min-w-0 flex-col gap-6 sm:pt-36">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-balance font-bold font-heading text-3xl tracking-tight sm:text-4xl">
                  {name ?? "Sans nom"}
                </h1>
                {native ? (
                  <p className="text-lg text-muted-foreground">{native}</p>
                ) : null}
              </div>
              {action}
            </div>

            {favourites || others.length > 0 || hidden.length > 0 ? (
              <ul
                aria-label="Autres noms"
                className="flex flex-wrap items-center gap-1.5"
              >
                {favourites ? (
                  <li>
                    <Badge variant="default">
                      <HeartIcon data-icon="inline-start" />
                      {new Intl.NumberFormat("fr-FR").format(favourites)}
                      <span className="sr-only">favoris sur AniList</span>
                    </Badge>
                  </li>
                ) : null}
                {others.map((other) => (
                  <li key={other}>
                    <Badge variant="secondary">{other}</Badge>
                  </li>
                ))}
                {hidden.length > 0 ? (
                  <li>
                    <BioSpoiler>
                      <span className="inline-flex flex-wrap gap-1.5">
                        {hidden.map((other) => (
                          <Badge key={other} variant="outline">
                            {other}
                          </Badge>
                        ))}
                      </span>
                    </BioSpoiler>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <PersonFacts facts={allFacts} />
          <PersonBio paragraphs={body} />
        </div>
      </div>
    </header>
  );
}
