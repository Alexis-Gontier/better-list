import { describe, expect, it } from "vitest";

import {
  episodeLag,
  formatLag,
  hasAired,
  latestAiredPerMedia,
} from "@/features/tracking/lib/airing-lag";

/**
 * Le sujet de ce fichier est la frontière « déjà diffusé / à venir », parce que c'est elle qui vaut
 * un épisode entier de différence — et parce qu'un écran qui annonce un épisode de retard de trop
 * sur chaque série à jour est un écran qu'on cesse de regarder.
 */

/** Secondes Unix d'un instant écrit en UTC. */
function seconds(iso: string): number {
  return Date.parse(iso) / 1000;
}

const AIRING = seconds("2026-09-11T21:00:00Z");

describe("hasAired", () => {
  it("compte un épisode passé comme diffusé", () => {
    expect(hasAired(AIRING, new Date("2026-09-11T21:00:01Z"))).toBe(true);
  });

  it("compte un épisode à venir comme non diffusé", () => {
    expect(hasAired(AIRING, new Date("2026-09-11T20:59:59Z"))).toBe(false);
  });

  it("compte l'instant exact de diffusion comme diffusé", () => {
    expect(hasAired(AIRING, new Date("2026-09-11T21:00:00Z"))).toBe(true);
  });
});

describe("episodeLag", () => {
  it("compte l'épisode qui vient de passer dans le retard", () => {
    // L'épisode 12 est sorti, j'en ai vu 10 : le 11 et le 12 me manquent.
    expect(episodeLag({ episode: 12, progress: 10, aired: true })).toBe(2);
  });

  it("ne compte pas un épisode à venir dans le retard", () => {
    // Le même épisode 12, annoncé pour samedi : seul le 11 me manque aujourd'hui.
    expect(episodeLag({ episode: 12, progress: 10, aired: false })).toBe(1);
  });

  it("ne met aucun retard sur une série à jour dont l'épisode est à venir", () => {
    // C'est le faux positif que la distinction existe pour empêcher : sans elle, chaque série
    // suivie afficherait « 1 épisode de retard » tous les jours de la semaine à venir.
    expect(episodeLag({ episode: 12, progress: 11, aired: false })).toBe(0);
  });

  it("ne met aucun retard sur une série à jour dont l'épisode vient de passer", () => {
    expect(episodeLag({ episode: 12, progress: 12, aired: true })).toBe(0);
  });

  it("borne à zéro une progression en avance sur la grille horaire", () => {
    expect(episodeLag({ episode: 3, progress: 8, aired: true })).toBe(0);
  });

  it("compte tout le premier épisode pour une série jamais commencée", () => {
    expect(episodeLag({ episode: 1, progress: 0, aired: true })).toBe(1);
    expect(episodeLag({ episode: 1, progress: 0, aired: false })).toBe(0);
  });
});

describe("formatLag", () => {
  it("dit « à jour » plutôt que rien", () => {
    expect(formatLag(0)).toBe("à jour");
  });

  it("accorde le singulier", () => {
    expect(formatLag(1)).toBe("1 épisode de retard");
  });

  it("accorde le pluriel", () => {
    expect(formatLag(11)).toBe("11 épisodes de retard");
  });

  it("traite un retard négatif comme « à jour »", () => {
    expect(formatLag(-2)).toBe("à jour");
  });
});

describe("latestAiredPerMedia", () => {
  /** Une diffusion réduite à ce que la réduction regarde. */
  const slot = (mediaId: number, episode: number, at: string) => ({
    mediaId,
    episode,
    airingAt: seconds(at),
  });

  const NOW = new Date("2026-09-12T00:00:00Z");

  it("garde la dernière diffusion passée d'une série", () => {
    const latest = latestAiredPerMedia(
      [
        slot(1, 10, "2026-09-04T21:00:00Z"),
        slot(1, 11, "2026-09-11T21:00:00Z"),
      ],
      NOW,
    );

    expect(latest.get(1)?.episode).toBe(11);
  });

  it("ne se laisse pas dépasser par une diffusion reçue dans le désordre", () => {
    // AniList rend sa grille triée, mais rien dans le contrat ne le promet : c'est la comparaison
    // qui décide, pas le rang d'arrivée.
    const latest = latestAiredPerMedia(
      [
        slot(1, 11, "2026-09-11T21:00:00Z"),
        slot(1, 10, "2026-09-04T21:00:00Z"),
      ],
      NOW,
    );

    expect(latest.get(1)?.episode).toBe(11);
  });

  it("écarte une diffusion à venir au profit de la dernière passée", () => {
    // Ce qui sépare cette réduction d'un simple maximum : l'épisode 12 est le plus récent de la
    // liste, et c'est précisément celui qu'il ne faut pas retenir.
    const latest = latestAiredPerMedia(
      [
        slot(1, 11, "2026-09-11T21:00:00Z"),
        slot(1, 12, "2026-09-18T21:00:00Z"),
      ],
      NOW,
    );

    expect(latest.get(1)?.episode).toBe(11);
  });

  it("ne retient rien d'une série dont tout est à venir", () => {
    const latest = latestAiredPerMedia(
      [slot(1, 1, "2026-09-18T21:00:00Z")],
      NOW,
    );

    expect(latest.has(1)).toBe(false);
  });

  it("tient une entrée par série", () => {
    const latest = latestAiredPerMedia(
      [slot(1, 11, "2026-09-11T21:00:00Z"), slot(2, 3, "2026-09-10T15:00:00Z")],
      NOW,
    );

    expect(latest.get(1)?.episode).toBe(11);
    expect(latest.get(2)?.episode).toBe(3);
  });

  it("rend une table vide sur une grille vide", () => {
    expect(latestAiredPerMedia([], NOW).size).toBe(0);
  });
});
