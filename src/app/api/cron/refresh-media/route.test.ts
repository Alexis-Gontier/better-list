import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La garde du cron, et elle seule.
 *
 * Ce handler est la seule route de l'app qui ne soit couverte **ni** par le proxy — dont le
 * `matcher` exclut `api/` en entier — **ni** par `requireApprovedUser()` du layout `(app)`. Son
 * jeton porteur est donc tout ce qui sépare le miroir d'un déclencheur anonyme, et une erreur y
 * serait invisible en développement, où personne n'appelle cette URL.
 *
 * `refreshStaleMirror` est doublée : ce qui est vérifié ici, c'est **qui passe la porte**, pas ce
 * qui se trouve derrière. Le double sert aussi de témoin — un refus qui aurait quand même appelé la
 * fonction serait un refus pour rien.
 */

const refreshStaleMirror = vi.fn();

vi.mock("@/features/media/server/media.mirror", () => ({
  refreshStaleMirror: () => refreshStaleMirror(),
}));

// La valeur de `vitest.config.mts`, qui satisfait le `min(32)` de `config/env.ts`.
const CRON_SECRET = "test-cron-secret-of-at-least-32-chars";

function cronRequest(authorization?: string) {
  return new NextRequest("http://localhost:3000/api/cron/refresh-media", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  refreshStaleMirror.mockReset();
  refreshStaleMirror.mockResolvedValue({
    stale: 3,
    refreshed: 2,
    vanished: 1,
    batches: 1,
  });
});

describe("GET /api/cron/refresh-media", () => {
  it("refuse un appel sans en-tête `Authorization`", async () => {
    const { GET } = await import("./route");

    const response = await GET(cronRequest());

    expect(response.status).toBe(401);
    expect(refreshStaleMirror).not.toHaveBeenCalled();
  });

  it("refuse un jeton faux", async () => {
    const { GET } = await import("./route");

    const response = await GET(cronRequest("Bearer pas-le-bon-secret-du-tout"));

    expect(response.status).toBe(401);
    expect(refreshStaleMirror).not.toHaveBeenCalled();
  });

  /**
   * Le cas qui fait rater les gardes écrites trop vite : un jeton **de la bonne longueur** mais
   * faux. `timingSafeEqual` lève sur deux tampons de tailles différentes, donc une garde qui
   * s'appuierait sur lui sans comparer les longueurs d'abord planterait en 500 sur le test
   * précédent et laisserait celui-ci passer.
   */
  it("refuse un jeton de la bonne longueur mais faux", async () => {
    const { GET } = await import("./route");

    const wrong = `Bearer ${"x".repeat(CRON_SECRET.length)}`;
    expect(wrong.length).toBe(`Bearer ${CRON_SECRET}`.length);

    const response = await GET(cronRequest(wrong));

    expect(response.status).toBe(401);
    expect(refreshStaleMirror).not.toHaveBeenCalled();
  });

  /** Un refus ne dit ni pourquoi, ni ce qu'il protège. */
  it("ne révèle rien dans un refus", async () => {
    const { GET } = await import("./route");

    const response = await GET(cronRequest("n'importe quoi"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    // Ni le secret, ni sa longueur, ni le nom de ce qui est protégé.
    expect(response.headers.get("www-authenticate")).toBeNull();
  });

  it("accepte le jeton de Vercel et rend le compte rendu de la passe", async () => {
    const { GET } = await import("./route");

    const response = await GET(cronRequest(`Bearer ${CRON_SECRET}`));

    expect(response.status).toBe(200);
    expect(refreshStaleMirror).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      stale: 3,
      refreshed: 2,
      vanished: 1,
      batches: 1,
    });
  });

  /** `Bearer` est un préfixe, pas une décoration : le secret nu ne vaut pas autorisation. */
  it("refuse le secret sans son préfixe `Bearer`", async () => {
    const { GET } = await import("./route");

    const response = await GET(cronRequest(CRON_SECRET));

    expect(response.status).toBe(401);
    expect(refreshStaleMirror).not.toHaveBeenCalled();
  });
});
