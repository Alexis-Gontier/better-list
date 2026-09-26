/**
 * Les faits d'une personne : anniversaire, âge, genre… Une ligne sans valeur **disparaît** au lieu
 * d'afficher un tiret — même règle que la ligne de faits de la fiche d'une œuvre.
 */
export function PersonFacts({
  facts,
}: {
  facts: { label: string; value: string | null }[];
}) {
  const known = facts.filter(
    (fact): fact is { label: string; value: string } => fact.value !== null,
  );
  if (known.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {known.map((fact) => (
        <div className="contents" key={fact.label}>
          <dt className="font-medium text-[0.6875rem] text-muted-foreground uppercase leading-5 tracking-[0.12em]">
            {fact.label}
          </dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
