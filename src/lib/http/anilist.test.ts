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
