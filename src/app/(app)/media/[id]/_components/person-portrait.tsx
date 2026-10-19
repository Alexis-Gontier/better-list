import Image from "next/image";

/**
 * Un portrait collé au bord de sa carte — personnage, doubleur ou membre de l'équipe.
 *
 * Extrait des cartes de personnages quand l'onglet Équipe a demandé la même boîte : deuxième
 * appelant, donc le composant sort de son fichier. Il reste dans le `_components/` de la route et
 * ne monte pas dans `features/` — les deux appelants sont sur cette route, et la règle de promotion
 * parle de deuxième **route**, pas de deuxième usage (CLAUDE.md).
 *
 * Largeur fixe et `shrink-0` : sans eux, un nom long comprimerait l'image au lieu de se tronquer —
 * c'est le texte qui doit céder, puisqu'il a `truncate` et son infobulle pour se rattraper.
 *
 * `alt=""` à dessein : le nom est juste à côté, en texte. Le répéter ferait lire deux fois la même
 * chose à un lecteur d'écran — `name` ne sert qu'à l'infobulle de l'image et à la lisibilité de
 * l'appel.
 */
export function PersonPortrait({
  src,
  name,
}: {
  src: string | null;
  name: string | null;
}) {
  if (!src) {
    // Le bloc de repli garde la largeur : une carte sans portrait doit occuper la même boîte que
    // ses voisines, sinon la rangée se désaligne sur une personne mal documentée.
    return <div aria-hidden className="w-14 shrink-0 bg-muted" />;
  }

  return (
    <div className="relative w-14 shrink-0 bg-muted">
      <Image
        alt=""
        className="object-cover"
        fill
        // Largeur fixe : le portrait ne suit pas la colonne.
        sizes="56px"
        src={src}
        title={name ?? undefined}
      />
    </div>
  );
}
