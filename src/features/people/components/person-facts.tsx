/** Un fait d'une personne. `label: null` pour une ligne de biographie entièrement sous spoiler. */
export type PersonFact = { label: string | null; value: React.ReactNode };

/**
 * Les faits d'une personne : anniversaire, âge, genre… puis la fiche technique tirée de sa
 * biographie (`splitBioFacts`). Une ligne sans valeur **disparaît** au lieu d'afficher un tiret —
 * même règle que la ligne de faits de la fiche d'une œuvre.
 *
 * **En tuiles** : intitulé au-dessus, valeur dessous, sur un fond à peine levé. Une liste à deux
 * colonnes intitulé / valeur tenait quand il y avait quatre faits ; avec la fiche technique de la
 * biographie, un personnage en compte une douzaine, et la liste devenait une colonne plus haute que
 * tout le reste du profil. La grille les range sur trois ou quatre de front et se lit d'un coup
 * d'œil.
 */
export function PersonFacts({ facts }: { facts: PersonFact[] }) {
  const known = facts.filter(
    (fact) => fact.value !== null && fact.value !== undefined,
  );
  if (known.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:grid-cols-4">
      {known.map((fact, index) => (
        <div
          className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2"
          // biome-ignore lint/suspicious/noArrayIndexKey: liste figée au rendu, deux lignes sous spoiler n'ont pas d'intitulé
          key={index}
        >
          {fact.label ? (
            <dt className="font-medium text-[0.6875rem] text-muted-foreground uppercase leading-5 tracking-[0.12em]">
              {fact.label}
            </dt>
          ) : (
            <dt className="sr-only">Détail masqué</dt>
          )}
          <dd className="break-words">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
