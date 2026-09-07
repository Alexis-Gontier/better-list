"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Les onglets de la fiche — **une coquille cliente, et rien d'autre.**
 *
 * `"use client"` est ici parce que basculer d'un onglet à l'autre demande du JavaScript. Le
 * **contenu**, lui, n'en demande aucun : les panneaux arrivent en propriétés, donc l'aperçu, la
 * distribution, les œuvres liées et le journal restent des composants serveur et ne descendent
 * jamais dans le bundle. C'est la règle de frontière d'ARCHITECTURE.md — « passer les Server
 * Components en `children` plutôt que convertir le sous-arbre » —, et elle est ici gratuite.
 *
 * **Des onglets ne coûtent aucune requête sur cette page**, et c'est ce qui les autorise :
 * `MEDIA_BY_ID_QUERY` ramène déjà la fiche entière — personnages, staff, relations,
 * recommandations comprises — en une seule lecture cachée un jour. Ranger ce qui est déjà là ne
 * dépense rien. Le journal fait exception : c'est une lecture en base, et elle a sa propre
 * frontière `<Suspense>` posée par l'appelant.
 *
 * **La liste des onglets est décidée par l'appelant, pas ici**, et c'est ce qui remplace la règle
 * qu'on s'était donnée en n'en écrivant que deux : un onglet vide apprend au visiteur que l'écran
 * est cassé — la leçon du menu à trois points de cette même fiche et du bouton « Ajouter à une
 * liste ». Un manga sans relations, une fiche sans personnages : le serveur sait avant le rendu
 * qu'il n'y a rien à mettre derrière l'intitulé, et l'onglet n'existe alors pas du tout.
 */

export type MediaTab = {
  /** Sert de clé React **et** de valeur d'onglet : deux identités pour une seule chose. */
  value: string;
  label: string;
  /** Rendu côté serveur avant que l'onglet actif soit connu — voir le commentaire de la page. */
  content: ReactNode;
};

export function MediaTabs({ tabs }: { tabs: MediaTab[] }) {
  const first = tabs[0];
  if (!first) return null;

  return (
    /*
      `variant="line"` plutôt que le fond plein par défaut : la fiche a déjà une bannière, une
      jaquette et une barre de suivi au-dessus. Une pastille grise pleine largeur y ajouterait un
      quatrième bloc à regarder, là où un simple trait sous l'onglet actif suffit à dire où l'on
      est. C'est aussi le seul emploi cohérent avec le principe directeur de la spec visuelle — la
      jaquette est la seule chose colorée de l'écran.

      **L'onglet ouvert à l'arrivée est le premier de la liste**, et l'ordre est celui de la page.
      On vient sur une fiche pour l'œuvre, pas pour son historique.
    */
    <Tabs className="gap-6" defaultValue={first.value}>
      {/*
        La barre défile horizontalement plutôt que de passer à la ligne : quatre intitulés ne
        tiennent pas dans 360 px, et une barre d'onglets sur deux lignes ne se lit plus comme une
        barre.

        **Le débordement est contenu ici, pas rattrapé par des marges négatives.** La première
        version tirait la barre jusqu'aux bords de la fenêtre (`-mx-4 px-4`) pour qu'elle paraisse
        aller d'un bord à l'autre ; mesurée à 390 px, elle dépassait de cinq pixels — rognés par le
        `overflow-x-clip` du layout, donc invisibles, mais c'est exactement le genre de dépassement
        qui coupe un anneau de focus sur le dernier onglet.
      */}
      {/*
        `overflow-y-hidden` n'est pas une précaution : régler le seul débordement horizontal fait
        passer l'axe vertical de `visible` à `auto` — c'est la règle CSS —, et le trait de l'onglet
        actif, qui dépasse d'un pixel, suffisait alors à faire apparaître une barre de défilement
        verticale à droite de la bande. Vue à l'écran le 7 septembre 2026.
      */}
      <div className="overflow-x-auto overflow-y-hidden">
        <TabsList variant="line">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
