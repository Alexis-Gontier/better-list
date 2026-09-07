import { describe, expect, it } from "vitest";

import {
  type RelatedSource,
  relatedMedia,
} from "@/app/(app)/media/[id]/_lib/media-related";
import type { MediaCompact } from "@/features/media/schemas/media.schema";

function compact(id: number, isAdult = false): MediaCompact {
  return {
    id,
    type: "ANIME",
    format: "TV",
    status: "FINISHED",
    averageScore: null,
    isAdult,
    title: {
      romaji: `Œuvre ${id}`,
      english: null,
      native: null,
      userPreferred: null,
    },
    coverImage: null,
  };
}

function source(overrides: Partial<RelatedSource> = {}): RelatedSource {
  return {
    relations: { edges: [] },
    recommendations: { nodes: [] },
    ...overrides,
  };
}

describe("relatedMedia", () => {
  it("groupe par nature du lien et traduit l'intitulé", () => {
    const media = source({
      relations: {
        edges: [
          { relationType: "SEQUEL", node: compact(1) },
          { relationType: "ADAPTATION", node: compact(2) },
          { relationType: "SEQUEL", node: compact(3) },
        ],
      },
    });

    const { groups } = relatedMedia(media, true);

    expect(groups.map((group) => group.label)).toEqual(["Adaptation", "Suite"]);
    expect(groups[1]?.items.map((item) => item.id)).toEqual([1, 3]);
  });

  /**
   * L'ordre répond à « par quoi je commence » : l'origine, puis la chronologie, puis les
   * satellites. Un tri alphabétique mettrait « Autre » en deuxième position.
   */
  it("ordonne les groupes par lecture, pas par alphabet", () => {
    const media = source({
      relations: {
        edges: [
          { relationType: "OTHER", node: compact(1) },
          { relationType: "SIDE_STORY", node: compact(2) },
          { relationType: "SOURCE", node: compact(3) },
        ],
      },
    });

    expect(relatedMedia(media, true).groups.map((g) => g.label)).toEqual([
      "Œuvre d'origine",
      "Histoire parallèle",
      "Autre",
    ]);
  });

  it("range un lien inconnu en dernier plutôt que de le perdre", () => {
    const media = source({
      relations: {
        edges: [
          { relationType: "PROLOGUE", node: compact(1) },
          { relationType: "SEQUEL", node: compact(2) },
        ],
      },
    });

    expect(relatedMedia(media, true).groups.map((g) => g.label)).toEqual([
      "Suite",
      "PROLOGUE",
    ]);
  });

  it("ignore un lien sans nature, qui n'a pas de groupe où aller", () => {
    const media = source({
      relations: { edges: [{ relationType: null, node: compact(1) }] },
    });

    expect(relatedMedia(media, true).groups).toEqual([]);
  });

  /**
   * Le cas qui justifie ce module : l'œuvre demandée est filtrée par la requête, ce qu'elle cite
   * ne l'est pas.
   */
  it("écarte les œuvres adultes quand la préférence est éteinte", () => {
    const media = source({
      relations: {
        edges: [
          { relationType: "SEQUEL", node: compact(1, true) },
          { relationType: "SEQUEL", node: compact(2) },
        ],
      },
      recommendations: {
        nodes: [
          { rating: 10, mediaRecommendation: compact(3, true) },
          { rating: 5, mediaRecommendation: compact(4) },
        ],
      },
    });

    const off = relatedMedia(media, false);
    expect(off.groups[0]?.items.map((item) => item.id)).toEqual([2]);
    expect(off.recommendations.map((item) => item.id)).toEqual([4]);

    const on = relatedMedia(media, true);
    expect(on.groups[0]?.items).toHaveLength(2);
    expect(on.recommendations).toHaveLength(2);
  });

  /** AniList garde le nœud d'une recommandation dont l'œuvre a été supprimée depuis. */
  it("écarte une recommandation dont la cible n'existe plus", () => {
    const media = source({
      recommendations: {
        nodes: [
          { rating: 10, mediaRecommendation: null },
          { rating: 5, mediaRecommendation: compact(1) },
        ],
      },
    });

    expect(relatedMedia(media, true).recommendations.map((i) => i.id)).toEqual([
      1,
    ]);
  });
});
