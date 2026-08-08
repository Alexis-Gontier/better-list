"use client";

import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Un onglet. `content` est un **Server Component déjà rendu**, passé en prop : c'est la frontière
 * client la plus étroite possible (docs/ARCHITECTURE.md). Seule la barre d'onglets est
 * interactive ; le contenu, lui, ne traverse jamais le bundle client.
 */
export type MediaTabDefinition = {
  value: string;
  label: string;
  /** Effectif affiché en exposant du libellé. `null` quand la notion n'a pas de compte. */
  count?: number | null;
  content: ReactNode;
};

/**
 * Barre d'onglets de la fiche, synchronisée dans l'URL.
 *
 * L'onglet actif vit dans `?tab=` et pas dans un `useState` : un lien vers les personnages d'une
 * œuvre doit pouvoir se partager et se recharger. `shallow` reste à sa valeur par défaut — tout le
 * contenu est déjà dans la charge utile, changer d'onglet ne redemande rien au serveur.
 *
 * `clearOnDefault` garde `/media/123` propre tant qu'on n'a pas quitté l'aperçu.
 */
export function MediaTabs({ tabs }: { tabs: MediaTabDefinition[] }) {
  const fallback = tabs[0]?.value ?? "";
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsString.withDefault(fallback).withOptions({ clearOnDefault: true }),
  );

  /**
   * Un `?tab=` peut arriver forgé, ou pointer sur un onglet qu'on n'affiche pas pour cette œuvre —
   * un manga n'a pas de personnages secondaires, un film n'a pas de suite. Sans ce repli, la page
   * s'afficherait vide sans que rien n'indique pourquoi.
   */
  const active = tabs.some((item) => item.value === tab) ? tab : fallback;

  return (
    <Tabs onValueChange={setTab} value={active}>
      {/*
        Collant sous l'en-tête (`h-14`) : sur une fiche longue, revenir aux onglets ne doit pas
        demander de remonter toute la page. Le débordement horizontal est assumé sur mobile — cinq
        onglets ne tiennent pas sur 375 px, et les replier sur deux lignes coûterait plus cher.
      */}
      {/*
        `overflow-y-hidden` est **obligatoire** à côté de `overflow-x-auto`, pas décoratif : en CSS,
        une valeur `visible` sur un seul axe est recalculée en `auto` dès que l'autre ne l'est plus.
        Sans elle, le soulignement de l'onglet actif — posé 2 px sous la liste — suffisait à faire
        apparaître une barre de défilement verticale à droite des onglets.
        `pb-1` donne à ce soulignement la place de tenir dans la boîte au lieu d'être rogné.
      */}
      <div className="sticky top-14 z-30 overflow-x-auto overflow-y-hidden border-b bg-background pb-1">
        <TabsList variant="line">
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              {item.count ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {item.count}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((item) => (
        <TabsContent className="pt-6" key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
