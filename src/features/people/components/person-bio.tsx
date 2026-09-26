import Link from "next/link";

import { BioSpoiler } from "@/features/people/components/bio-spoiler";
import { type BioSegment, parseBio } from "@/features/people/lib/people-bio";

/** Deux paragraphes : de quoi reconnaître la personne sans pousser la grille hors de l'écran. */
const VISIBLE_PARAGRAPHS = 2;

/**
 * La biographie d'une personne, lue par `parseBio` et rendue en éléments — jamais en HTML brut.
 *
 * **Repliée après deux paragraphes**, dans un `<details>` natif : pas de JavaScript pour un geste
 * que le navigateur sait faire, et le texte replié reste trouvable par la recherche de la page.
 * Une biographie absente ne rend rien.
 */
export function PersonBio({ text }: { text: string | null }) {
  const paragraphs = parseBio(text);
  if (paragraphs.length === 0) return null;

  const visible = paragraphs.slice(0, VISIBLE_PARAGRAPHS);
  const folded = paragraphs.slice(VISIBLE_PARAGRAPHS);

  return (
    <section className="flex flex-col gap-3 text-muted-foreground text-sm/6">
      {visible.map((paragraph, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: texte figé, jamais réordonné
        <p key={index}>{renderSegments(paragraph)}</p>
      ))}
      {folded.length > 0 ? (
        <details className="group flex flex-col gap-3">
          <summary className="cursor-pointer text-foreground text-sm group-open:hidden">
            Lire la suite
          </summary>
          <div className="flex flex-col gap-3">
            {folded.map((paragraph, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: texte figé, jamais réordonné
              <p key={index}>{renderSegments(paragraph)}</p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function renderSegments(segments: BioSegment[]): React.ReactNode[] {
  return segments.map((segment, index) => {
    // L'index suffit ici : les segments viennent d'un texte figé et ne se réordonnent jamais.
    const key = index;
    switch (segment.kind) {
      case "text":
        return <span key={key}>{segment.text}</span>;
      case "break":
        return <br key={key} />;
      case "strong":
        return (
          <strong className="font-medium text-foreground" key={key}>
            {renderSegments(segment.children)}
          </strong>
        );
      case "spoiler":
        return (
          <BioSpoiler key={key}>{renderSegments(segment.children)}</BioSpoiler>
        );
    }

    // Il ne reste que le lien : interne, il reste dans l'app ; externe, il ouvre un onglet.
    return segment.external ? (
      <a
        className="text-foreground underline underline-offset-2"
        href={segment.href}
        key={key}
        rel="noreferrer"
        target="_blank"
      >
        {renderSegments(segment.children)}
      </a>
    ) : (
      <Link
        className="text-foreground underline underline-offset-2"
        href={segment.href}
        key={key}
        prefetch={false}
      >
        {renderSegments(segment.children)}
      </Link>
    );
  });
}
