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

/**
 * Une fiche technique tirée de la biographie : « __Taille :__ 172 cm ». `label: null` quand la
 * ligne entière est sous spoiler — l'intitulé en trahirait autant que la valeur.
 */
export type BioFact = { label: string | null; value: BioSegment[] };

/**
 * Les intitulés les plus courants, traduits. Les contributeurs AniList écrivent en anglais ; le
 * reste passe tel quel plutôt que d'être deviné.
 */
const FACT_LABELS: Record<string, string> = {
  height: "Taille",
  weight: "Poids",
  affiliation: "Affiliation",
  affiliations: "Affiliations",
  occupation: "Métier",
  occupations: "Métiers",
  status: "Statut",
  species: "Espèce",
  race: "Race",
  rank: "Rang",
  title: "Titre",
  birthplace: "Lieu de naissance",
  agency: "Agence",
  nickname: "Surnom",
  nicknames: "Surnoms",
  bounty: "Prime",
  "devil fruit": "Fruit du démon",
  "devil fruit type": "Type de fruit",
  "blood type": "Groupe sanguin",
  hometown: "Ville natale",
};

/** Un intitulé plus long que ça est une phrase en gras, pas une étiquette. */
const MAX_LABEL_LENGTH = 32;

/** Le texte brut d'une suite de segments. Les spoilers sont **omis** quand `spoilers` est faux. */
export function bioText(
  segments: BioSegment[],
  { spoilers = true }: { spoilers?: boolean } = {},
): string {
  return segments
    .map((segment) => {
      switch (segment.kind) {
        case "text":
          return segment.text;
        case "break":
          return " ";
        case "spoiler":
          return spoilers ? bioText(segment.children, { spoilers }) : "";
        default:
          return bioText(segment.children, { spoilers });
      }
    })
    .join("");
}

function splitLines(paragraph: BioParagraph): BioSegment[][] {
  const lines: BioSegment[][] = [[]];
  for (const segment of paragraph) {
    if (segment.kind === "break") lines.push([]);
    else (lines[lines.length - 1] as BioSegment[]).push(segment);
  }
  return lines.map(trimParagraph).filter((line) => line.length > 0);
}

/** Retire les deux-points et les blancs en tête de la valeur : « : 172 cm » → « 172 cm ». */
function trimValueStart(value: BioSegment[]): BioSegment[] {
  const [first, ...rest] = value;
  if (first?.kind !== "text") return value;
  const text = first.text.replace(/^\s*:?\s*/, "");
  return text ? [{ kind: "text", text }, ...rest] : rest;
}

function factOf(line: BioSegment[]): BioFact | null {
  const [head, ...rest] = line;
  if (!head) return null;

  // Toute la ligne sous spoiler : elle compte comme une fiche si son contenu en est une.
  if (head.kind === "spoiler" && rest.length === 0) {
    return factOf(trimParagraph(head.children))
      ? { label: null, value: line }
      : null;
  }
  if (head.kind !== "strong") return null;

  const raw = bioText(head.children).trim();
  const inside = raw.endsWith(":");
  const next = rest[0];
  // Le deux-points peut être dans le gras (« __Taille:__ ») ou juste après (« __Taille__: »).
  if (!inside && !(next?.kind === "text" && /^\s*:/.test(next.text))) {
    return null;
  }

  const label = (inside ? raw.slice(0, -1) : raw).trim();
  if (!label || label.length > MAX_LABEL_LENGTH) return null;

  const value = trimValueStart(rest);
  if (value.length === 0) return null;

  return { label: FACT_LABELS[label.toLowerCase()] ?? label, value };
}

/**
 * Sépare la **fiche technique** en tête de biographie du texte qui suit.
 *
 * Les biographies AniList commencent souvent par des lignes « __Taille :__ 172 cm » avant la prose.
 * Rendues comme du texte, elles repoussent la biographie sous un bloc de gras ; elles sont en
 * réalité des faits, et vont avec les autres. Seuls les paragraphes **de tête** entièrement faits
 * de telles lignes sont pris : une ligne en gras au milieu de la prose reste de la prose.
 */
export function splitBioFacts(paragraphs: BioParagraph[]): {
  facts: BioFact[];
  body: BioParagraph[];
} {
  const facts: BioFact[] = [];
  let index = 0;

  for (; index < paragraphs.length; index += 1) {
    const lines = splitLines(paragraphs[index] as BioParagraph);
    const parsed = lines.map(factOf);
    if (
      parsed.length === 0 ||
      parsed.some((fact) => fact === null) ||
      !parsed.some((fact) => fact?.label)
    ) {
      break;
    }
    facts.push(...(parsed as BioFact[]));
  }

  return { facts, body: paragraphs.slice(index) };
}

/**
 * Un extrait de biographie pour un survol : **le premier paragraphe de prose**, sans la fiche
 * technique ni les spoilers, coupé sur un mot. `null` quand il n'y a rien à montrer.
 *
 * Un paragraphe fait **seulement de liens** n'est pas de la prose : les doubleurs ouvrent souvent
 * leur biographie sur un « [Profile](…) » seul, et c'est ce mot qui servait d'extrait.
 */
export function bioExcerpt(
  text: string | null,
  maxLength = 280,
): string | null {
  const { body } = splitBioFacts(parseBio(text));

  for (const paragraph of body) {
    const linksOnly = paragraph.every(
      (segment) =>
        segment.kind === "link" ||
        segment.kind === "break" ||
        (segment.kind === "text" && !segment.text.trim()),
    );
    if (linksOnly) continue;

    const plain = bioText(paragraph, { spoilers: false })
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) continue;
    if (plain.length <= maxLength) return plain;

    const cut = plain.slice(0, maxLength);
    const space = cut.lastIndexOf(" ");
    return `${(space > maxLength / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
  }

  return null;
}
