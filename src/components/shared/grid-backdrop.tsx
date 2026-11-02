/**
 * Un quadrillage de fond, fondu sur les bords pour ne pas faire cadre dans le cadre (landing et
 * pages d'entrée, d'après Firecrawl). Son parent est `relative` ; le contenu passe au-dessus.
 */
export function GridBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[96px_96px] opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]"
    />
  );
}
