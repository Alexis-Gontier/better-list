import { describe, expect, it } from "vitest";

import {
  episodeLag,
  formatLag,
  hasAired,
} from "@/app/(app)/calendar/_lib/airing-lag";

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
