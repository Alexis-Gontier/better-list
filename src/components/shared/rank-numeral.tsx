/**
 * Le rang d'une œuvre dans un classement, posé sur le coin bas-gauche de sa jaquette.
 *
 * En blanc, jamais en accent (D33) : il vit sur une illustration, d'où l'ombre qui le détache des
 * jaquettes claires. `aria-hidden` : l'appelant dit le rang en toutes lettres au lecteur d'écran.
 */
export function RankNumeral({ rank }: { rank: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-0.5 left-1.5 font-extrabold font-heading text-5xl text-white tabular-nums leading-none tracking-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.85)]"
    >
      {rank}
    </span>
  );
}
