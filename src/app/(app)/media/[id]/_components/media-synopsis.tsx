import { cleanDescription } from "@/features/media/lib/media-format";

type MediaSynopsisProps = {
  /** `description` d'AniList. Nulle sur une fiche servie depuis le miroir local. */
  description: string | null;
};

/**
 * Le synopsis de l'œuvre.
 *
 * Le texte passe par `cleanDescription` et **n'est jamais injecté en HTML** : AniList le demande en
 * `asHtml: false` mais y laisse quand même des `<br>` et des balises d'emphase, parce que c'est de
 * la saisie de contributeurs et non une donnée structurée. On normalise et on rend du texte.
 *
 * Il est en anglais, et ce n'est pas un défaut à corriger : AniList ne fournit pas de synopsis
 * français (docs/conception.md §9).
 *
 * **Le cas vide est un vrai cas**, pas une exception : une fiche servie depuis le miroir n'a pas de
 * synopsis du tout, puisque la colonne n'existe pas en base (§4.1).
 */
export function MediaSynopsis({ description }: MediaSynopsisProps) {
  const paragraphs = cleanDescription(description);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Synopsis</h2>

      {paragraphs.length > 0 ? (
        // Sur toute la largeur (décision d'Alexis du 11 septembre 2026). La colonne `max-w-prose`
        // laissait la moitié droite de l'écran vide au-dessus de trois sections qui, elles,
        // l'occupent entièrement — le synopsis paraissait alors être un encart plutôt que le texte
        // de la page.
        <div className="flex flex-col gap-3 text-sm/6 text-muted-foreground">
          {paragraphs.map((paragraph) => (
            // Le paragraphe lui-même comme clé : deux paragraphes identiques dans un même synopsis
            // n'existent pas, et un index se périmerait au premier remaniement du texte.
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun synopsis n'est disponible pour cette œuvre.
        </p>
      )}
    </section>
  );
}
