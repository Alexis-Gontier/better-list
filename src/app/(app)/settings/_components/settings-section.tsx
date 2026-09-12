import type { ReactNode } from "react";

/**
 * Une section de l'écran de réglages : son intitulé, la ligne qui dit ce qu'on y règle, et le
 * contenu.
 *
 * Deux appelants dès la première ligne — « Compte » et « Affichage » —, ce qui est précisément le
 * seuil de la règle de promotion d'ARCHITECTURE.md. Il reste dans le `_components/` de la route
 * parce que ces deux appelants y sont : c'est `/settings` qui a des sections, pas l'application.
 *
 * Composant **serveur** : il ne rend que du texte et ses enfants.
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  /** Le `<h2>` de la section. Le `<h1>` appartient au `PageHeading` de la page. */
  title: string;
  /** Ce qu'on règle ici, en une phrase — jamais la répétition du titre. */
  description: string;
  children: ReactNode;
}) {
  return (
    /*
      L'écart entre l'en-tête de section et son contenu est plus large que celui qui tient le titre
      à sa description : ces deux lignes-là forment un bloc, le contenu en est un autre. C'est la
      même hiérarchie d'espacements que `PageHeading` applique à l'échelle de la page.
    */
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {/*
          `text-lg` mesuré à l'écran, et non choisi sur plan : en `font-medium` à la taille du
          texte courant, « Affichage » avait exactement le poids de « Langue des titres » juste en
          dessous — deux niveaux différents qui se lisaient comme un seul. Le titre de section se
          pose maintenant entre le `text-2xl` du `<h1>` et le `text-sm` des libellés de réglage.
        */}
        <h2 className="font-medium text-lg">{title}</h2>
        <p className="text-pretty text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
