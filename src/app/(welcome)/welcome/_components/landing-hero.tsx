import Link from "next/link";

import {
  FragmentTitle,
  JournalFragment,
  ListsFragment,
  ShelfFragment,
  TrackingFragment,
} from "@/app/(welcome)/welcome/_components/carnet-fragments";
import { EpisodeRow } from "@/app/(welcome)/welcome/_components/episode-row";
import { Logo } from "@/components/layout/logo";
import { GridBackdrop } from "@/components/shared/grid-backdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

const NAV = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#cercle", label: "Le cercle" },
  { href: "#questions", label: "Questions" },
] as const;

const TABS = [
  {
    value: "suivi",
    label: "Suivi",
    title: "En cours",
    content: (
      <>
        <EpisodeRow state="live" />
        <TrackingFragment />
      </>
    ),
  },
  {
    value: "journal",
    label: "Journal",
    title: "Journal · 16 semaines",
    content: <JournalFragment />,
  },
  {
    value: "etagere",
    label: "Étagère",
    title: "Rurouni Kenshin · collection",
    content: <ShelfFragment />,
  },
  {
    value: "listes",
    label: "Listes",
    title: "Listes de la communauté",
    content: <ListsFragment />,
  },
] as const;

/**
 * Le hero, d'après Firecrawl : la navigation, un grand titre centré dont la seconde ligne porte
 * l'accent, puis **le widget à onglets** — un morceau de l'app qu'on manipule, avec le « +1 » qui
 * marche dans l'onglet Suivi.
 */
export function LandingHero() {
  return (
    <>
      <header className="flex items-center justify-between gap-6 px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <Logo className="size-6" />
          <span className="font-heading font-semibold tracking-tight">
            {site.name}
          </span>
        </span>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          {NAV.map((item) => (
            <a
              className="text-muted-foreground transition-colors hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Button asChild size="sm" variant="secondary">
          <Link href={routes.auth.login}>Se connecter</Link>
        </Button>
      </header>

      <section className="relative overflow-hidden border-border border-t px-5 pt-20 pb-16 sm:px-8 sm:pt-28">
        <GridBackdrop />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <Badge variant="outline">
            Sur invitation · une dizaine de membres
          </Badge>
          <h1 className="font-heading font-semibold text-[clamp(36px,6vw,72px)] leading-[1.02] tracking-tight">
            Le carnet de vos animes,
            <br />
            <span className="text-primary">épisode par épisode</span>
          </h1>
          <p className="max-w-[52ch] text-pretty text-lg text-muted-foreground">
            Suivi, journal, collection et listes : Better-List garde la trace de
            tout ce que vous regardez et lisez, entre amis.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={routes.auth.login}>Rejoindre le cercle</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#fonctionnalites">Voir le carnet</a>
            </Button>
          </div>
        </div>

        <Tabs
          className="relative mx-auto mt-14 w-full max-w-xl rounded-xl border bg-card p-2 text-left shadow-2xl"
          defaultValue="suivi"
        >
          {TABS.map((tab) => (
            <TabsContent
              className="flex min-h-56 flex-col gap-3 p-3"
              key={tab.value}
              value={tab.value}
            >
              <FragmentTitle>{tab.title}</FragmentTitle>
              {tab.content}
            </TabsContent>
          ))}
          <TabsList className="w-full">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </section>
    </>
  );
}
