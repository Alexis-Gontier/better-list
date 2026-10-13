import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

/**
 * Le transport AniList : la partie du code dont les chemins d'erreur ne se déclenchent presque
 * jamais en développement — un 404, un quota dépassé, une erreur GraphQL renvoyée avec un statut
 * 200. C'est précisément ce qu'on ne peut pas tester à la main, donc ce qu'on teste ici.
 *
 * `@/lib/http/fetch` capture `globalThis.fetch` au chargement du module : le faux doit donc être posé
 * **avant** l'import, d'où le `vi.resetModules()` et l'import dynamique dans chaque test.
 */

const schema = z.object({ Media: z.object({ id: z.number() }) });

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function importAnilist(fetchMock: typeof fetch) {
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  return import("@/lib/http/anilist");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("anilistQuery", () => {
  it("renvoie le champ `data` validé", async () => {
    const { anilistQuery } = await importAnilist(
      vi.fn(async () => jsonResponse({ data: { Media: { id: 21 } } })) as never,
    );

    await expect(anilistQuery({ query: "query {}", schema })).resolves.toEqual({
      Media: { id: 21 },
    });
  });

  it("passe les variables dans le corps, jamais dans la query", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ data: { Media: { id: 21 } } }),
    );
    const { anilistQuery } = await importAnilist(fetchMock as never);

    await anilistQuery({ query: "query {}", variables: { id: 21 }, schema });

    // up-fetch peut appeler `fetch(request)` ou `fetch(url, init)` selon sa version : on lit le
    // corps dans les deux formes plutôt que de figer un détail d'implémentation.
    const [input, init] = fetchMock.mock.calls[0] as unknown as [
      RequestInfo,
      RequestInit | undefined,
    ];
    const body =
      input instanceof Request
        ? await input.clone().text()
        : String(init?.body);

    expect(JSON.parse(body)).toEqual({
      query: "query {}",
      variables: { id: 21 },
    });
  });

  /*
    **Sans `Referer`, AniList répond 403 à tout** — mesuré le 7 septembre 2026 par élimination sur
    les en-têtes d'un appel navigateur. Ce test existe parce que la panne serait *silencieuse* : le
    repli sur le miroir rattrape le 403, donc retirer cet en-tête ne casserait aucun écran, ne
    lèverait aucune erreur, et laisserait simplement le catalogue servi depuis la copie locale pour
    toujours.
  */
  it("envoie un en-tête `Referer` — sans lui AniList répond 403", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ data: { Media: { id: 21 } } }),
    );
    const { anilistQuery } = await importAnilist(fetchMock as never);

    await anilistQuery({ query: "query {}", schema });

    const [input, init] = fetchMock.mock.calls[0] as unknown as [
      RequestInfo,
      RequestInit | undefined,
    ];
    const referer =
      input instanceof Request
        ? input.headers.get("referer")
        : new Headers(init?.headers).get("referer");

    expect(referer).toBeTruthy();
  });

  it("lève une AniListError quand l'erreur GraphQL arrive dans un corps en statut 200", async () => {
    const { anilistQuery, isAniListError } = await importAnilist(
      vi.fn(async () =>
        jsonResponse({ errors: [{ message: "Not Found.", status: 404 }] }),
      ) as never,
    );

    const error = await anilistQuery({ query: "query {}", schema }).catch(
      (e: unknown) => e,
    );

    expect(isAniListError(error)).toBe(true);
    expect((error as { message: string }).message).toBe("Not Found.");
    expect((error as { isNotFound: boolean }).isNotFound).toBe(true);
  });

  it("expose `isRateLimited` sur un quota dépassé", async () => {
    const { anilistQuery, isAniListError } = await importAnilist(
      vi.fn(async () =>
        jsonResponse(
          { errors: [{ message: "Too Many Requests.", status: 429 }] },
          429,
        ),
      ) as never,
    );

    const error = await anilistQuery({ query: "query {}", schema }).catch(
      (e: unknown) => e,
    );

    expect(isAniListError(error)).toBe(true);
    expect((error as { isRateLimited: boolean }).isRateLimited).toBe(true);
  });

  it("ne réessaie pas sur un 429 — la fenêtre de quota dure une minute", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { errors: [{ message: "Too Many Requests.", status: 429 }] },
        429,
      ),
    );
    const { anilistQuery } = await importAnilist(fetchMock as never);

    await anilistQuery({ query: "query {}", schema }).catch(() => undefined);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejette une charge utile qui ne correspond pas au schéma", async () => {
    const { anilistQuery } = await importAnilist(
      vi.fn(async () =>
        jsonResponse({ data: { Media: { id: "vingt-et-un" } } }),
      ) as never,
    );

    await expect(anilistQuery({ query: "query {}", schema })).rejects.toThrow();
  });
});

/**
 * Le repli de panne. Ce qui est vérifié ici n'est pas qu'on rattrape — c'est **ce qu'on ne rattrape
 * pas** : un 404 ou une charge utile invalide qui se déguiserait en « catalogue indisponible »
 * transformerait un bug en écran silencieux, et personne ne le verrait jamais.
 */
describe("tryAniList", () => {
  it("renvoie `null` quand AniList est coupé — le 403 de l'API désactivée", async () => {
    const { anilistQuery, tryAniList } = await importAnilist(
      vi.fn(async () =>
        jsonResponse(
          {
            errors: [
              {
                message:
                  "The AniList API has been temporarily disabled due to severe stability issues.",
                status: 403,
              },
            ],
          },
          403,
        ),
      ) as never,
    );

    await expect(
      tryAniList(() => anilistQuery({ query: "query {}", schema })),
    ).resolves.toBeNull();
  });

  it("renvoie `null` sur un quota dépassé", async () => {
    const { anilistQuery, tryAniList } = await importAnilist(
      vi.fn(async () =>
        jsonResponse(
          { errors: [{ message: "Too Many Requests.", status: 429 }] },
          429,
        ),
      ) as never,
    );

    await expect(
      tryAniList(() => anilistQuery({ query: "query {}", schema })),
    ).resolves.toBeNull();
  });

  /**
   * Le test qui garde la mécanique honnête.
   *
   * Une erreur levée sous `"use cache"` arrive à l'appelant resérialisée : un `Error` nu, sans
   * `status` et sans sa classe (mesuré le 15 août 2026, Next 16.3). C'est cette forme-là — la seule
   * que l'accueil voie réellement — qui est reconstituée ici à la main. Si le tri repassait un jour
   * par `instanceof` ou par `status`, tout marcherait encore en test unitaire et le repli
   * retomberait en panne sur la vraie page.
   */
  it("rattrape une erreur qui a perdu sa classe en traversant `use cache`", async () => {
    const { tryAniList } = await importAnilist(vi.fn() as never);

    const transported = new Error(
      "The AniList API has been temporarily disabled due to severe stability issues.",
    );
    transported.name = "AniListOutageError";

    await expect(
      tryAniList(() => Promise.reject(transported)),
    ).resolves.toBeNull();
  });

  /**
   * La même traversée, **en production** — là où l'accueil est tombé le 13 octobre 2026.
   *
   * Hors `next dev`, React ne transporte ni `name` ni `message` : l'appelant reçoit un `Error`
   * générique, et seul le `digest` de l'erreur d'origine est recopié dessus. C'est cette forme que
   * le test reconstitue, à partir de la vraie erreur levée par un 429.
   */
  it("rattrape une panne qui n'a gardé que son digest en traversant `use cache` en production", async () => {
    const { anilistQuery, tryAniList } = await importAnilist(
      vi.fn(async () =>
        jsonResponse(
          { errors: [{ message: "Too Many Requests.", status: 429 }] },
          429,
        ),
      ) as never,
    );
    const original = (await anilistQuery({ query: "query {}", schema }).catch(
      (error: unknown) => error,
    )) as { digest?: string };

    const transported = Object.assign(
      new Error(
        "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details.",
      ),
      { digest: original.digest },
    );

    await expect(
      tryAniList(() => Promise.reject(transported)),
    ).resolves.toBeNull();
  });

  it("laisse passer en production une erreur qui n'est pas une panne", async () => {
    const { tryAniList } = await importAnilist(vi.fn() as never);

    const transported = Object.assign(
      new Error("An error occurred in the Server Components render."),
      { digest: "1234567890" },
    );

    await expect(tryAniList(() => Promise.reject(transported))).rejects.toBe(
      transported,
    );
  });

  it("laisse passer un 404 : une fiche inconnue n'est pas une panne", async () => {
    const { anilistQuery, tryAniList } = await importAnilist(
      vi.fn(async () =>
        jsonResponse({ errors: [{ message: "Not Found.", status: 404 }] }),
      ) as never,
    );

    await expect(
      tryAniList(() => anilistQuery({ query: "query {}", schema })),
    ).rejects.toThrow("Not Found.");
  });

  it("laisse passer une charge utile invalide : c'est un bug, pas une coupure", async () => {
    const { anilistQuery, tryAniList } = await importAnilist(
      vi.fn(async () =>
        jsonResponse({ data: { Media: { id: "vingt-et-un" } } }),
      ) as never,
    );

    await expect(
      tryAniList(() => anilistQuery({ query: "query {}", schema })),
    ).rejects.toThrow();
  });
});
