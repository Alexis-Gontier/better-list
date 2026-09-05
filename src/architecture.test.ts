import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Les règles d'architecture qu'aucun autre garde-fou ne sait tenir.
 *
 * Le hook `conventions-guard.mjs` refuse une écriture d'après **un fichier** et une regex ; il ne
 * peut donc pas répondre à « qui importe ce module ? ». Biome et TypeScript ne le peuvent pas non
 * plus : ce qui est vérifié ici compile parfaitement et ne casse qu'au build de Next, ou pire, pas
 * du tout — silencieusement, en embarquant du code serveur dans un bundle client.
 *
 * Ce fichier est donc posé à la racine de `src/` plutôt que colocalisé : son sujet est l'arbre
 * entier, pas un module. Même raison que `proxy.test.ts`, qui est le seul autre test de cette
 * nature.
 */
const SRC = resolve(import.meta.dirname);

/** `generated/` est produit par Prisma : y chercher une règle de style n'aurait aucun sens. */
const IGNORED_DIRECTORIES = new Set(["generated", "node_modules"]);

function sourceFiles(directory = SRC): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);

    if (entry.isDirectory()) {
      return IGNORED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(full);
    }

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [full]
      : [];
  });
}

const MODULES = sourceFiles().map((path) => ({
  /** Chemin POSIX relatif à `src/`, sans extension — la forme que porte un import `@/…`. */
  id: relative(SRC, path)
    .replaceAll("\\", "/")
    .replace(/\.tsx?$/, ""),
  path,
  content: readFileSync(path, "utf8"),
}));

const isClientModule = (content: string) =>
  /^\s*["']use client["']/m.test(content);

/**
 * Un Server Component `async` : une fonction exportée dont le nom commence par une majuscule.
 *
 * La majuscule est ce qui distingue un composant d'une requête `async` ordinaire — `getLibrary` en
 * est une, `MediaCard` non. Une heuristique, donc, mais une heuristique **stable** : la convention
 * de nommage de React est la même depuis toujours et Biome la fait respecter.
 */
const asyncServerComponents = MODULES.filter(
  ({ content }) =>
    !isClientModule(content) && /^export async function [A-Z]/m.test(content),
);

const importedIds = (content: string) =>
  [...content.matchAll(/from\s+["']@\/([^"']+)["']/g)].map(
    (match) => match[1] as string,
  );

describe("frontière server / client", () => {
  /**
   * **Le garde-fou de `MediaCard`, généralisé.**
   *
   * Cette carte est un Server Component `async` qui lit lui-même les préférences plutôt que de les
   * recevoir en propriété — cinq écrans la rendent, dont certains à trois niveaux de profondeur, et
   * faire descendre un réglage jusque-là traverserait toute l'arborescence pour une chaîne de
   * caractères. Le choix est bon. Mais il repose sur un invariant qui n'était écrit **que dans un
   * commentaire du fichier** : aucun composant client ne doit la rendre, sinon l'`await` casse.
   *
   * Un commentaire ne se vérifie pas. Un `"use client"` posé un jour sur un composant parent — le
   * geste le plus banal du projet — aurait rendu l'invariant faux sans que rien ne le dise avant le
   * build, et l'erreur de React ne nomme pas la règle qu'on vient d'enfreindre.
   *
   * Le test ne cible pas `MediaCard` : il découvre les six Server Components `async` de `features/`
   * et vaut pour ceux qu'on écrira ensuite, sans qu'on ait à penser à l'étendre.
   */
  it("aucun module client n'importe un Server Component async", () => {
    const serverComponentIds = new Set(
      asyncServerComponents.map(({ id }) => id),
    );

    const offences = MODULES.filter(({ content }) => isClientModule(content))
      .flatMap(({ id, content }) =>
        importedIds(content)
          .filter((imported) => serverComponentIds.has(imported))
          .map((imported) => `${id} importe ${imported}`),
      )
      .sort();

    expect(offences).toEqual([]);
  });

  /**
   * Le corollaire : ces composants ne sont des Server Components que tant qu'ils le restent. Le
   * test ci-dessus deviendrait vide et silencieusement inutile si la détection cessait de trouver
   * quoi que ce soit — une regex qui ne correspond plus à rien passe au vert.
   */
  it("en trouve effectivement, pour que le test précédent ait un objet", () => {
    expect(asyncServerComponents.length).toBeGreaterThan(0);
  });
});

describe("placement des fichiers", () => {
  /**
   * `src/app/` ne fait que du routing : un fichier y est une convention Next ou vit dans un dossier
   * privé `_*`. La règle est dans `docs/ARCHITECTURE.md` et le hook n'en voit qu'une partie — il
   * juge le fichier écrit, pas l'arborescence qu'il rejoint.
   */
  it("src/app/ ne contient que des conventions Next et des dossiers privés", () => {
    const CONVENTIONS =
      /^(page|layout|template|loading|error|global-error|not-found|forbidden|unauthorized|default|route|robots|sitemap|icon|apple-icon|opengraph-image|twitter-image|manifest)\.tsx?$/;

    const strays = MODULES.filter(({ id }) => id.startsWith("app/"))
      .filter(({ id }) => {
        const segments = id.split("/");
        const file = `${segments.at(-1)}.tsx`;
        const fileTs = `${segments.at(-1)}.ts`;

        // Un dossier privé `_*` quelque part dans le chemin autorise n'importe quel nom.
        if (segments.some((segment) => segment.startsWith("_"))) return false;

        return !CONVENTIONS.test(file) && !CONVENTIONS.test(fileTs);
      })
      .map(({ id }) => id)
      .sort();

    expect(strays).toEqual([]);
  });

  /**
   * Pas de barrel dans `features/` : ça casse le tree-shaking et brouille la frontière
   * server/client. Le hook refuse d'en **écrire** un ; ce test constate qu'il n'en existe pas, y
   * compris arrivé par un déplacement de fichier, que le hook ne voit pas.
   */
  it("aucun barrel index.ts dans features/", () => {
    const barrels = MODULES.filter(
      ({ id }) => id.startsWith("features/") && id.endsWith("/index"),
    ).map(({ id }) => id);

    expect(barrels).toEqual([]);
  });
});
