import { routes } from "@/config/routes";

/**
 * La biographie d'un personnage ou d'un staff, du markdown AniList vers des segments.
 *
 * C'est de la saisie de contributeurs : gras (`__x__`, `**x**`), liens (`[texte](url)`), spoilers
 * (`~!x!~`, y compris sur plusieurs lignes et contenant du gras), et des restes de HTML. On la
 * découpe en segments que l'écran rend en éléments React — **jamais** en HTML brut, même règle que
 * le synopsis (`media-synopsis.tsx`). Tout ce qui n'est pas reconnu reste du texte.
 */
export type BioSegment =
  | { kind: "text"; text: string }
  | { kind: "break" }
  | { kind: "strong"; children: BioSegment[] }
  | { kind: "spoiler"; children: BioSegment[] }
  | { kind: "link"; href: string; external: boolean; children: BioSegment[] };

export type BioParagraph = BioSegment[];

const ANILIST_LINK =
  /^(?:https?:\/\/(?:www\.)?anilist\.co)?\/(anime|manga|character|staff)\/(\d+)/i;

/**
 * Où mène un lien de biographie. Un lien AniList devient une route à nous — une page de personnage
 * qui renverrait sur anilist.co ferait sortir de l'app à chaque nom cité. Les autres liens restent
 * externes, **à condition d'être en http(s)** : `javascript:` et consorts sont refusés, et le
 * lien retombe sur son texte.
 */
export function resolveBioHref(
  raw: string,
): { href: string; external: boolean } | null {
  const match = raw.match(ANILIST_LINK);
  if (match) {
    const id = Number(match[2]);
    const kind = match[1]?.toLowerCase();
    const href =
      kind === "character"
        ? routes.character(id)
        : kind === "staff"
          ? routes.staff(id)
          : routes.media(id);
    return { href, external: false };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { href: url.toString(), external: true };
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

function normalize(text: string): string {
  return (
    text
      .replace(/\r\n?/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(
        /&(?:amp|quot|#0?39|lt|gt|nbsp);/g,
        (entity) => ENTITIES[entity] ?? entity,
      )
      // `~~~texte~~~` centre un bloc sur AniList ; ici il n'aurait aucun sens, on garde le texte.
      .replace(/~~~/g, "")
  );
}

type Frame = {
  kind: "root" | "strong" | "spoiler";
  marker: string;
  children: BioSegment[];
};

const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/;

function parseInline(source: string): BioSegment[] {
  const root: Frame = { kind: "root", marker: "", children: [] };
  const stack: Frame[] = [root];
  let buffer = "";

  const top = () => stack[stack.length - 1] as Frame;
  const flush = () => {
    if (buffer) top().children.push({ kind: "text", text: buffer });
    buffer = "";
  };
  // Referme les cadres jusqu'à celui demandé inclus : un gras resté ouvert dans un spoiler se
  // referme avec lui, plutôt que d'avaler la suite de la biographie.
  const closeUntil = (kind: Frame["kind"]) => {
    while (stack.length > 1) {
      const frame = stack.pop() as Frame;
      top().children.push({
        kind: frame.kind as "strong" | "spoiler",
        children: frame.children,
      });
      if (frame.kind === kind) return;
    }
  };

  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);

    if (rest.startsWith("~!")) {
      flush();
      stack.push({ kind: "spoiler", marker: "~!", children: [] });
      index += 2;
      continue;
    }
    if (
      rest.startsWith("!~") &&
      stack.some((frame) => frame.kind === "spoiler")
    ) {
      flush();
      closeUntil("spoiler");
      index += 2;
      continue;
    }

    const marker = rest.startsWith("__")
      ? "__"
      : rest.startsWith("**")
        ? "**"
        : null;
    if (marker) {
      flush();
      const current = top();
      if (current.kind === "strong" && current.marker === marker) {
        closeUntil("strong");
      } else {
        stack.push({ kind: "strong", marker, children: [] });
      }
      index += 2;
      continue;
    }

    const link = rest.match(LINK);
    if (link) {
      flush();
      const children = parseInline(link[1] ?? "");
      const target = resolveBioHref(link[2] ?? "");
      if (target) top().children.push({ kind: "link", ...target, children });
      else top().children.push(...children);
      index += link[0].length;
      continue;
    }

    if (rest[0] === "\n") {
      flush();
      top().children.push({ kind: "break" });
      index += 1;
      continue;
    }

    buffer += rest[0];
    index += 1;
  }

  flush();
  // Un marqueur jamais refermé : on garde ce qu'il enveloppe, sans le perdre ni le montrer brut.
  while (stack.length > 1) closeUntil(top().kind);
  return root.children;
}

function isBlank(segment: BioSegment): boolean {
  return (
    segment.kind === "break" ||
    (segment.kind === "text" && segment.text.trim() === "")
  );
}

function trimParagraph(paragraph: BioParagraph): BioParagraph {
  let start = 0;
  let end = paragraph.length;
  while (start < end && isBlank(paragraph[start] as BioSegment)) start += 1;
  while (end > start && isBlank(paragraph[end - 1] as BioSegment)) end -= 1;
  return paragraph.slice(start, end);
}

/**
 * Découpe **après** l'analyse, et seulement au premier niveau : un spoiler qui traverse une ligne
 * vide reste un seul spoiler, au lieu d'être coupé en deux moitiés dont la seconde s'afficherait.
 */
function splitParagraphs(segments: BioSegment[]): BioParagraph[] {
  const paragraphs: BioParagraph[] = [[]];
  let breaks = 0;

  for (const segment of segments) {
    if (segment.kind === "break") {
      breaks += 1;
      continue;
    }
    const current = paragraphs[paragraphs.length - 1] as BioParagraph;
    if (breaks >= 2 && current.length > 0) {
      paragraphs.push([segment]);
    } else {
      if (breaks === 1 && current.length > 0) current.push({ kind: "break" });
      current.push(segment);
    }
    breaks = 0;
  }

  return paragraphs
    .map(trimParagraph)
    .filter((paragraph) => paragraph.length > 0);
}

export function parseBio(text: string | null): BioParagraph[] {
  if (!text) return [];
  return splitParagraphs(parseInline(normalize(text)));
}
