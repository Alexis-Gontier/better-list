import Link from "next/link";

import type { MediaTab } from "@/app/(app)/media/[id]/_lib/media-tab-params";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type MediaTabLink = {
  value: MediaTab;
  label: string;
  href: string;
};

type MediaTabsProps = {
  tabs: MediaTabLink[];
  active: MediaTab;
  /** Le panneau de l'onglet actif — **le seul rendu**, voir plus bas. */
  children: React.ReactNode;
};

/**
 * La barre d'onglets de la fiche.
 *
 * **Ce sont des liens, pas des boutons, et ce n'est pas un détail d'accessibilité** : c'est ce qui
 * permet aux onglets d'avoir chacun leur propre lecture AniList (décision d'Alexis du 11 septembre
 * 2026). Un onglet client aurait dû garder tous les panneaux montés — donc tout charger d'avance,
 * donc dépenser cinq crédits de quota pour une visite qui n'en regarde qu'un. Ici le serveur ne
 * rend que le panneau désigné par `?onglet=`, et la requête part avec lui.
 *
 * **Ce composant est donc resté serveur**, alors que la version précédente était cliente. Il ne
 * porte aucun état : l'onglet actif vient de l'URL, et c'est la navigation qui le change. Le
 * `Tabs` de shadcn n'est utilisé que pour sa matière — la barre, le trait, l'onglet souligné —, les
 * déclencheurs étant remplacés par des liens via `asChild`.
 *
 * Ce qu'on perd par rapport aux panneaux montés : la recherche du navigateur ne trouve plus que ce
 * qui est à l'écran. C'est le prix de la lecture à la demande, et il est explicite.
 */
export function MediaTabs({ tabs, active, children }: MediaTabsProps) {
  return (
    /*
      `gap-6` écrase le `gap-2` du composant : deux unités séparent un contrôle de son étiquette,
      pas une barre d'onglets d'une page entière de contenu.
    */
    <Tabs className="gap-6" value={active}>
      {/*
        La barre défile horizontalement sous `sm` plutôt que de passer à la ligne : cinq onglets sur
        390 px tiennent sur deux rangées, et une barre d'onglets à deux étages ne se lit plus comme
        une barre. `-mx-4 px-4` fait courir la zone de défilement jusqu'aux bords de l'écran, sinon
        le dernier onglet paraît coupé par la marge du contenu plutôt que par la fenêtre, et
        `scrollbar-none` masque la barre grise que Windows dessine alors au milieu de la page.
      */}
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:overflow-visible sm:px-0">
        {/*
          **Le trait court sous toute la barre** (décision d'Alexis du 11 septembre 2026), et pas
          seulement sous l'onglet actif comme le fait `variant="line"` tout seul. C'est lui qui fait
          la frontière entre la barre et le panneau : sans lui, les onglets flottaient au-dessus du
          contenu et le souligné de l'actif se lisait comme un soulignement de texte.

          `w-full justify-start` parce que `TabsList` est en `w-fit` par défaut : un trait qui
          s'arrêterait au dernier onglet séparerait le tiers gauche de la page et rien d'autre.
        */}
        <TabsList
          className="w-full justify-start rounded-none border-border/60 border-b"
          variant="line"
        >
          {tabs.map((tab) => (
            /*
              `asChild` remet le `<a>` de Next à la place du `<button>` de Radix : la navigation
              est un vrai lien, donc ouvrable dans un nouvel onglet et visible dans la barre d'état.

              `scroll={false}` parce que le hero est au-dessus : changer d'onglet ne doit pas
              remonter la page, on vient de cliquer sur une barre qui ne bouge pas.

              `flex-none` écrase le `flex-1` du composant, qui répartit les onglets sur toute la
              largeur disponible. C'est juste pour une barre de deux ou trois onglets dans un
              panneau ; sur la largeur de cette page, cinq onglets se retrouvaient espacés de deux
              cents pixels et ne se lisaient plus comme un groupe. Ils gardent donc leur largeur de
              texte, calés à gauche sous le titre.
            */
            <TabsTrigger
              asChild
              className="flex-none px-3"
              key={tab.value}
              value={tab.value}
            >
              <Link href={tab.href} scroll={false}>
                {tab.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/*
        Un seul `TabsContent`, celui de l'onglet actif. Les autres n'existent pas — ni dans le DOM,
        ni côté serveur, ni en requête AniList. C'est toute la différence avec des onglets clients.
      */}
      <TabsContent value={active}>{children}</TabsContent>
    </Tabs>
  );
}
