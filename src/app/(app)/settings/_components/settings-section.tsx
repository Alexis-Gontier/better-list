import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/*
  **Deux colonnes à partir de `lg` (D73)** : l'intitulé et sa phrase à gauche sur un tiers, les
  réglages à droite sur deux. La page garde la largeur de la coquille (`max-w-6xl`) sans que les
  contrôles partent à mille pixels de leur libellé : ils vivent dans une colonne de sept cents.
  En dessous, l'en-tête repasse au-dessus du contenu.
*/
const GRID =
  "flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-x-12";

/**
 * Une section de l'écran de réglages : son intitulé, la ligne qui dit ce qu'on y règle, et le
 * contenu.
 *
 * Il reste dans le `_components/` de la route : c'est `/settings` qui a des sections, pas
 * l'application. Composant **serveur** : il ne rend que du texte et ses enfants.
 */
export function SettingsSection({
  title,
  description,
  tone = "default",
  children,
}: {
  /** Le `<h2>` de la section. Le `<h1>` appartient au `PageHeading` de la page. */
  title: string;
  /** Ce qu'on règle ici, en une phrase — jamais la répétition du titre. */
  description: string;
  /** `danger` pour un geste sans retour : l'intitulé passe en rouge, comme son bouton. */
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <section className={GRID}>
      <div className="flex flex-col gap-1">
        {/*
          `text-lg` mesuré à l'écran : en `font-medium` à la taille du texte courant, « Affichage »
          avait exactement le poids de « Langue des titres » — deux niveaux qui se lisaient comme un
          seul.
        */}
        <h2
          className={
            tone === "danger"
              ? "font-medium text-destructive text-lg"
              : "font-medium text-lg"
          }
        >
          {title}
        </h2>
        <p className="text-pretty text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/**
 * Le squelette d'une section, sur la même grille. La description est annoncée sur **deux lignes** :
 * c'est ce qu'elle prend dans le tiers gauche en 1440, comme en 390 où elle a toute la largeur.
 */
export function SettingsSectionSkeleton({
  titleClassName,
  children,
}: {
  /** La largeur de l'intitulé qui arrive (`w-28` pour « Affichage »…). */
  titleClassName: string;
  children: ReactNode;
}) {
  return (
    <div className={GRID}>
      <div className="flex flex-col gap-1">
        <Skeleton className={`h-7 ${titleClassName}`} />
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="h-5 w-2/3 max-w-60" />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
