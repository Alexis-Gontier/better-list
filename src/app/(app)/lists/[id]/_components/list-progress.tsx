/**
 * Où en est une file ou une attente, en une barre : ce qu'on lit d'un coup d'œil, là où une phrase
 * demande de faire le calcul.
 *
 * La barre est en couleur de texte, pas en accent (D33) : elle informe, elle ne désigne rien à
 * cliquer. Un vrai `<progress>` porte la valeur pour le lecteur d'écran ; l'apparence est dessinée
 * à côté, parce que le style natif diffère d'un navigateur à l'autre.
 */
export function ListProgress({
  ratio,
  label,
}: {
  ratio: number;
  label: string;
}) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);

  return (
    <div className="mt-2 flex max-w-xs items-center gap-3">
      <progress
        aria-label={label}
        className="sr-only"
        max={100}
        value={percent}
      />
      <div
        aria-hidden
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-foreground/70 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span aria-hidden className="text-muted-foreground text-xs tabular-nums">
        {percent} %
      </span>
    </div>
  );
}
