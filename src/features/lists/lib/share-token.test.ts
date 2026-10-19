import { describe, expect, it } from "vitest";

import { generateShareToken } from "@/features/lists/lib/share-token";

/**
 * Ce fichier teste **le seul secret du projet**.
 *
 * Une liste partagée s'ouvre sur `/l/<jeton>` sans session, sans compte et sans garde : il n'y a
 * rien derrière ce jeton que le jeton lui-même (docs/conception.md §4.4). Chacune des propriétés
 * vérifiées ici est donc une façon dont la confidentialité tomberait sans que rien ne casse par
 * ailleurs — un jeton trop court, un alphabet qui oblige à échapper, un générateur prévisible :
 * l'application continuerait de fonctionner parfaitement dans les trois cas.
 */
describe("generateShareToken", () => {
  /**
   * 18 octets en base64url font exactement 24 caractères, sans remplissage : 18 est un multiple de
   * 3, donc l'encodage tombe juste et ne produit aucun `=`. Si cette longueur change, c'est que la
   * taille du tirage a changé — donc l'entropie, donc la garantie.
   */
  it("fait 24 caractères, soit 18 octets sans remplissage", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(generateShareToken()).toHaveLength(24);
    }
  });

  /**
   * L'alphabet base64url : ni `+`, ni `/`, ni `=`. C'est ce qui permet au jeton d'aller dans un
   * chemin d'URL tel quel — un `/` le couperait en deux segments et un `+` se relit comme une
   * espace après décodage de formulaire.
   */
  it("n'emploie que l'alphabet base64url", () => {
    for (let i = 0; i < 1_000; i += 1) {
      expect(generateShareToken()).toMatch(/^[A-Za-z0-9_-]{24}$/);
    }
  });

  /**
   * L'unicité sur 10 000 tirages ne prouve pas l'imprévisibilité — un compteur la passerait. Ce
   * qu'elle attrape est l'accident réel : un générateur figé (graine constante, valeur mémoïsée,
   * `Math.random()` mal réamorcé) qui rendrait deux fois la même chaîne. Sur 144 bits, une seule
   * collision ici est un défaut d'implémentation, jamais un coup de malchance.
   */
  it("ne se répète pas sur 10 000 tirages", () => {
    const draws = new Set<string>();

    for (let i = 0; i < 10_000; i += 1) {
      draws.add(generateShareToken());
    }

    expect(draws.size).toBe(10_000);
  });

  /**
   * Un tirage aléatoire remplit son alphabet ; un tirage dégénéré non. Compter les caractères
   * distincts sur un échantillon large sépare les deux sans rien affirmer de cryptographique : 64
   * symboles possibles sur ~24 000 caractères observés, en voir moins de 60 signale une source
   * biaisée ou tronquée bien avant qu'on s'en aperçoive à l'œil.
   */
  it("couvre l'ensemble de son alphabet", () => {
    const seen = new Set<string>();

    for (let i = 0; i < 1_000; i += 1) {
      for (const character of generateShareToken()) seen.add(character);
    }

    expect(seen.size).toBeGreaterThan(60);
  });
});
