import { LandingBand } from "@/app/(welcome)/welcome/_components/landing-frame";

const FACTS = [
  { value: "≈ 10", label: "membres, sur invitation" },
  { value: "4", label: "formats : anime, manga, webtoon, light novel" },
  { value: "1 clic", label: "pour noter un épisode" },
  { value: "0", label: "page publique de profil" },
] as const;

/** Le bandeau d'accent, d'après celui de Firecrawl : le cercle en quatre chiffres vrais. */
export function LandingCircle() {
  return (
    <LandingBand id="cercle">
      <div className="bg-primary px-5 py-16 text-primary-foreground sm:px-8 sm:py-20">
        <h2 className="max-w-[20ch] text-balance font-heading font-semibold text-[clamp(30px,4vw,44px)] leading-tight tracking-tight">
          Un cercle privé, pas un réseau social
        </h2>
        <dl className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div className="flex flex-col gap-1" key={fact.value}>
              <dt className="font-heading font-semibold text-4xl tracking-tight">
                {fact.value}
              </dt>
              <dd className="text-primary-foreground/80 text-sm">
                {fact.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </LandingBand>
  );
}
