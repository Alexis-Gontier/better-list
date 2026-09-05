import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le limiteur garde `api/command`, et un route handler n'a **rien** devant lui : le `matcher` du
 * proxy exclut `api/` en entier. Ce qui n'est pas vérifié ici n'est vérifié nulle part.
 *
 * La base est simulée plutôt que branchée : ce qu'on teste est la **politique** — quand une fenêtre
 * s'ouvre, quand elle refuse, ce que vaut le `Retry-After` — et elle est entièrement dans ce
 * fichier. Une vraie base ne vérifierait que Prisma, qu'on n'a pas écrit.
 */
const findUnique = vi.fn();
const upsert = vi.fn();
const update = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: { apiRateLimit: { findUnique, upsert, update } },
}));

const { consumeRateLimit } = await import("@/lib/security/rate-limit");

const RULE = { key: "command:user-1", max: 3, windowSeconds: 60 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("consumeRateLimit", () => {
  it("ouvre une fenêtre quand il n'y en a aucune", async () => {
    findUnique.mockResolvedValue(null);

    await expect(consumeRateLimit(RULE)).resolves.toEqual({ allowed: true });
    expect(upsert).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });

  it("laisse passer sous le plafond, en incrémentant", async () => {
    findUnique.mockResolvedValue({
      key: RULE.key,
      count: 2,
      windowStart: new Date(),
    });

    await expect(consumeRateLimit(RULE)).resolves.toEqual({ allowed: true });
    expect(update).toHaveBeenCalledWith({
      where: { key: RULE.key },
      data: { count: { increment: 1 } },
    });
  });

  /**
   * Le plafond est atteint **à égalité** (`count >= max`), pas au-delà : avec `max: 3`, la
   * quatrième requête doit être refusée, donc la troisième est la dernière acceptée. Un `>` à la
   * place du `>=` laisserait passer une requête de trop sans que rien ne le signale.
   */
  it("refuse dès que le compteur atteint le plafond", async () => {
    findUnique.mockResolvedValue({
      key: RULE.key,
      count: RULE.max,
      windowStart: new Date(),
    });

    const verdict = await consumeRateLimit(RULE);

    expect(verdict.allowed).toBe(false);
    // Aucune écriture sur un refus : un refus qui incrémenterait repousserait indéfiniment la
    // réouverture de la fenêtre pour qui insiste.
    expect(update).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  /**
   * Une fenêtre close se rouvre plutôt que de refuser. C'est la borne exacte qui compte : le code
   * compare `>= windowMs`, donc à 60 s pile la fenêtre est finie. Un `>` y bloquerait une requête
   * pendant une milliseconde, ce qui ne se reproduit jamais à la main.
   */
  it("rouvre une fenêtre expirée, même à la milliseconde près", async () => {
    findUnique.mockResolvedValue({
      key: RULE.key,
      count: RULE.max,
      windowStart: new Date(Date.now() - RULE.windowSeconds * 1000),
    });

    await expect(consumeRateLimit(RULE)).resolves.toEqual({ allowed: true });
    expect(upsert).toHaveBeenCalledOnce();
  });

  /**
   * `Retry-After` compte les secondes qui restent, et **jamais zéro** : un `Retry-After: 0` invite
   * à réessayer immédiatement, donc à se reprendre le même refus — le client boucle et le serveur
   * paie pour rien.
   */
  it("rend un Retry-After borné à au moins une seconde", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-09-05T12:00:00.000Z");
    vi.setSystemTime(now);

    // 59,5 s écoulées sur une fenêtre de 60 : il reste une demi-seconde, qui doit s'arrondir à 1.
    findUnique.mockResolvedValue({
      key: RULE.key,
      count: RULE.max,
      windowStart: new Date(now.getTime() - 59_500),
    });

    const verdict = await consumeRateLimit(RULE);

    expect(verdict).toEqual({ allowed: false, retryAfter: 1 });
  });

  it("rend le temps restant réel quand la fenêtre vient de s'ouvrir", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-09-05T12:00:00.000Z");
    vi.setSystemTime(now);

    findUnique.mockResolvedValue({
      key: RULE.key,
      count: RULE.max,
      windowStart: new Date(now.getTime() - 10_000),
    });

    const verdict = await consumeRateLimit(RULE);

    expect(verdict).toEqual({ allowed: false, retryAfter: 50 });
  });

  /** Le compteur est cloisonné par clé : le budget d'un membre n'entame pas celui d'un autre. */
  it("compte par clé", async () => {
    findUnique.mockResolvedValue(null);

    await consumeRateLimit({ ...RULE, key: "command:user-2" });

    expect(findUnique).toHaveBeenCalledWith({
      where: { key: "command:user-2" },
    });
  });
});
