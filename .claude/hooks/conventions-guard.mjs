#!/usr/bin/env node
/**
 * PreToolUse hook — refuse une écriture qui viole une règle non négociable de
 * `docs/ARCHITECTURE.md`.
 *
 * Ne contient que des règles **déterministes** : chacune se vérifie par un chemin ou une regex,
 * sans jugement. Une règle qui demanderait de l'interprétation n'a rien à faire ici — elle va
 * dans CLAUDE.md ou dans l'agent `convention-reviewer`.
 *
 * Sortie 2 = écriture bloquée, le message de stderr revient à l'agent pour qu'il corrige.
 * Toute autre situation sort en 0 : un hook cassé ne doit jamais empêcher de travailler.
 */
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Les seuls fichiers autorisés à lire `process.env` directement.
 *
 * Deux familles, et la frontière est celle du runtime : la configuration que Next lui-même charge
 * avant `@/config/env`, et les **fichiers de CLI** — `prisma/seed.ts` tourne sous `tsx`, hors de
 * Next, donc sans le `NODE_ENV` que t3-env exige. Du code applicatif n'a jamais sa place ici.
 */
const ENV_ALLOWLIST = [
  "src/config/env.ts",
  "next.config.ts",
  "postcss.config.mjs",
  "prisma/seed.ts",
  "playwright.config.ts",
];

/** Les tests de bout en bout tournent sous le runner Playwright, hors de Next — même famille que le seed. */
const ENV_ALLOWED_PREFIXES = [".claude/", "e2e/"];

/**
 * Les seuls fichiers tolérés à la racine de `src/lib/` — le reste est rangé par sujet
 * (`auth/`, `db/`, `http/`, `security/`), voir ARCHITECTURE.md.
 *
 * `utils.ts` est immobile pour une raison extérieure au projet : `components.json` déclare
 * `aliases.utils`, et tout ce que shadcn génère importe `@/lib/utils`.
 */
const LIB_ROOT_ALLOWLIST = ["src/lib/utils.ts", "src/lib/safe-action.ts"];

/**
 * @param {string} path chemin POSIX relatif à la racine du projet
 * @param {string} content contenu écrit (fichier complet ou fragment remplaçant)
 * @returns {string | null} le motif du refus, ou null
 */
function check(path, content) {
  // Les règles ne s'appliquent qu'au code : un `.md` a le droit de citer `process.env` ou un
  // barrel pour expliquer pourquoi on n'en veut pas.
  const isCode = /\.(m?[jt]sx?)$/.test(path);
  const isSource = /^src\/.*\.(m?tsx?)$/.test(path);

  if (
    isCode &&
    /\bprocess\.env\./.test(content) &&
    !ENV_ALLOWLIST.includes(path) &&
    !ENV_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    return `\`process.env\` est interdit hors de \`src/config/env.ts\`.
Déclarer la variable dans \`src/config/env.ts\` (t3-env) puis \`import { env } from "@/config/env"\`.
Une variable \`NEXT_PUBLIC_\` doit être déclarée deux fois : dans \`client\` et dans \`experimental__runtimeEnv\`.`;
  }

  if (path.startsWith("src/types/")) {
    return `Ce projet n'a pas de dossier \`src/types/\`.
Les types se dérivent du schéma Zod avec \`z.infer\`, dans \`src/features/<domaine>/schemas/\`.
Un type sans schéma va dans le \`types.ts\` de sa feature.`;
  }

  if (
    /^src\/lib\/[^/]+\.(m?tsx?)$/.test(path) &&
    !LIB_ROOT_ALLOWLIST.includes(path)
  ) {
    return `\`src/lib/\` est rangé par sujet, pas à plat.
Poser le fichier dans \`src/lib/auth/\`, \`db/\`, \`http/\` ou \`security/\` — ou créer un sujet si aucun ne convient.
Seuls \`utils.ts\` (immobile : \`components.json\` y pointe) et \`safe-action.ts\` restent à la racine.`;
  }

  if (/^src\/features\/[^/]+(\/[^/]+)*\/index\.ts$/.test(path)) {
    return `Pas de barrel \`index.ts\` dans \`features/\` : ça casse le tree-shaking et brouille la frontière server/client.
Importer le fichier directement : \`@/features/<domaine>/components/<fichier>\`.`;
  }

  if (
    /^src\/app\/.*\/(page|layout)\.tsx$/.test(path) &&
    /^\s*["']use client["']/m.test(content)
  ) {
    return `\`"use client"\` ne se pose pas sur une \`page.tsx\` ou un \`layout.tsx\` : tout le sous-arbre bascule côté client.
Le poser sur la feuille interactive (\`_components/<x>.tsx\`), et passer le contenu serveur en \`children\`.`;
  }

  if (isSource && /from\s+["']\.\.\/\.\.\//.test(content)) {
    return `Import relatif remontant de plusieurs niveaux. Utiliser l'alias \`@/*\` → \`src/*\`.`;
  }

  if (isSource && /[^\w]fetch\s*\(\s*["'`]https?:/.test(content)) {
    return `Appel HTTP sortant avec \`fetch\` nu. Passer par \`upfetch\` (\`@/lib/http/fetch\`) avec un \`schema\` Zod, pour que la réponse soit validée comme le reste.`;
  }

  if (
    isSource &&
    /\.schema\s*\(\s*\w/.test(content) &&
    content.includes("actionClient")
  ) {
    return `\`.schema()\` est l'API next-safe-action v7. En v8 c'est \`.metadata({ actionName }).inputSchema(...)\`.`;
  }

  return null;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw).tool_input ?? {};
  } catch {
    process.exit(0);
  }

  const file = input.file_path;
  if (!file) process.exit(0);

  // Les règles sont écrites en chemins POSIX relatifs à la racine ; le hook tourne sous Windows.
  const path = relative(PROJECT_ROOT, resolve(file)).replaceAll("\\", "/");
  if (path.startsWith("..")) process.exit(0);

  const content = input.content ?? input.new_string ?? "";
  const reason = check(path, content);

  if (reason) {
    process.stderr.write(`[conventions] ${path}\n\n${reason}\n`);
    process.exit(2);
  }

  process.exit(0);
});
