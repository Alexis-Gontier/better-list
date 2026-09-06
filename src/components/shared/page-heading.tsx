/**
 * Le titre d'un écran et la ligne qui dit ce qu'on y fait.
 *
 * Il naît **directement dans `components/shared/`**, ce qui est l'exception et pas l'oubli : la
 * règle de promotion d'ARCHITECTURE.md fait démarrer un composant dans le `_components/` de sa
 * route et ne l'en sort qu'au deuxième appelant — or il en a deux dès la première ligne, `/search`
 * et `/library`, qui l'ont demandé ensemble. Le faire naître dans l'un pour l'en sortir dans la
 * même passe serait la lettre de la règle contre son objet.
 *
 * Il atterrit dans `shared/` et non dans `features/` parce qu'il ne connaît **aucune** entité : il
 * met en forme deux chaînes. C'est le même raisonnement que pour `catalogue-grid.tsx`, qui pose des
 * colonnes sans savoir ce qu'elle range.
 *
 * Composant **serveur** : il ne rend que du texte.
 *
 * **La description n'est pas la `metadata.description` de la page**, même quand les deux se
 * ressemblent. L'une s'adresse à un onglet de navigateur et à un aperçu de lien ; celle-ci s'adresse
 * à quelqu'un qui est déjà sur l'écran et qui veut savoir ce qu'il y trouvera. Les partager par une
 * constante ferait qu'un jour, réécrire l'une pour le partage abîmerait l'autre à l'écran.
 */
export function PageHeading({
  title,
  description,
}: {
  /** Le nom de l'écran. C'est le `<h1>` de la page — il n'y en a qu'un. */
  title: string;
  /** Ce qu'on fait ici, en une phrase. */
  description: string;
}) {
  return (
    /*
      Un écart plus court que celui de la colonne qui l'accueille : ces deux lignes forment un seul
      bloc, et les espacer comme deux sections en ferait deux choses posées l'une sous l'autre.
    */
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl">{title}</h1>
      {/*
        `text-pretty` plutôt qu'un retour à la ligne subi : sur un écran étroit, une phrase de
        soixante caractères se coupe volontiers en laissant un mot seul sur la seconde ligne.
      */}
      <p className="text-pretty text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
