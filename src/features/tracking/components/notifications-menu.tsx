"use client";

import { BellIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { formatLag } from "@/features/tracking/lib/airing-lag";
import { formatSince } from "@/features/tracking/lib/entry-format";
import {
  type EpisodeNotifications,
  episodeNotificationsSchema,
} from "@/features/tracking/schemas/notifications.schema";
import { upfetch } from "@/lib/http/fetch";

/**
 * La cloche de l'en-tête — **les épisodes sortis que je n'ai pas vus**.
 *
 * Elle a été un décor pendant cinq semaines, `notifications` étant un tableau vide écrit en dur
 * (relevé du 8 août 2026, l'historique git) : une entrée qui ne mène nulle part se lit comme une panne.
 * Elle dit maintenant ce que dit la rangée « En cours » de l'accueil, mais **depuis les dix
 * routes** — c'est la seule chose qu'elle ajoute, et c'est ce qui la justifie à côté d'elle.
 *
 * **Elle vit dans `features/tracking/` et non dans `components/layout/`**, d'où elle est partie le
 * 14 septembre 2026 : dès qu'un composant connaît une entité métier, il change de maison
 * (CLAUDE.md). C'est déjà pourquoi `CommandSearch` est dans `features/command/` alors que
 * l'en-tête l'importe.
 *
 * **Il n'y a rien à marquer comme lu, et c'est le cœur du dessin** (décision d'Alexis du
 * 14 septembre 2026) : le retard *est* l'état non-lu. Le badge s'éteint au « +1 », pas à
 * l'ouverture du menu — donc aucune table, aucune migration, et une cloche qui ne peut pas se
 * désynchroniser de ce qu'on a vraiment vu.
 */

/** Où en est la lecture. Pas d'état inerte : elle part au montage, il n'y a rien à attendre. */
type MenuState =
  | { phase: "loading" }
  | { phase: "done"; result: EpisodeNotifications }
  | { phase: "error" };

export function NotificationsMenu() {
  const [state, setState] = useState<MenuState>({ phase: "loading" });

  /*
    **Une seule requête, au montage.** L'en-tête est monté par le layout `(app)` : il ne se remonte
    pas aux navigations client, donc c'est un appel par chargement complet et non par page.

    Et il est **hors du chemin de rendu** : la cloche paraît tout de suite, le badge arrive quand la
    réponse arrive. Le faire au serveur aurait fait payer une requête Postgres au premier octet de
    chacune des dix routes, pour une pastille que personne n'attend.
  */
  useEffect(() => {
    const controller = new AbortController();

    upfetch(routes.api.notifications, {
      schema: episodeNotificationsSchema,
      signal: controller.signal,
    })
      .then((result) => setState({ phase: "done", result }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ phase: "error" });
      });

    return () => controller.abort();
  }, []);

  const unread = state.phase === "done" ? state.result.items.length : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={
            unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"
          }
          className="relative text-muted-foreground"
          size="icon-sm"
          variant="ghost"
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <NotificationsBody state={state} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Ce que le menu montre, cas par cas.
 *
 * **Quatre états et non deux**, parce que trois d'entre eux se ressembleraient sinon à tort :
 * « rien de neuf », « on n'a pas pu demander » et « AniList n'a pas répondu » sont trois choses
 * différentes, et la première est la seule qui soit une bonne nouvelle. Les confondre ferait dire à
 * la cloche qu'on est à jour au moment précis où elle ne sait rien.
 */
function NotificationsBody({ state }: { state: MenuState }) {
  const notice =
    "flex items-center justify-center gap-2 px-3 py-6 text-center text-muted-foreground text-sm";

  if (state.phase === "loading") {
    return (
      <p className={notice}>
        <Spinner />
        Chargement…
      </p>
    );
  }

  if (state.phase === "error") {
    return <p className={notice}>Les notifications n'ont pas pu être lues.</p>;
  }

  if (state.result.unavailable) {
    return (
      <p className={notice}>
        AniList ne répond pas : impossible de savoir ce qui est sorti.
      </p>
    );
  }

  if (state.result.items.length === 0) {
    return (
      <Empty className="p-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BellIcon />
          </EmptyMedia>
          <EmptyTitle>Rien de neuf</EmptyTitle>
          <EmptyDescription>
            Vous êtes à jour sur tout ce que vous suivez.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  /*
    L'instant est pris **une fois pour toute la liste** : relu à chaque ligne, deux épisodes sortis
    à la même minute pourraient tomber de part et d'autre d'une borne et s'écrire différemment.
  */
  const now = new Date();

  return (
    /*
      Le défilement est sur l'enveloppe et non sur le groupe : `DropdownMenuGroup` porte le rôle
      ARIA, et lui donner une hauteur bornée ferait défiler un conteneur que les lecteurs d'écran
      annoncent comme un tout.

      Huit lignes environ avant de défiler — au-delà, un menu plus haut que l'écran d'un téléphone.
    */
    <div className="max-h-96 overflow-y-auto">
      <DropdownMenuGroup>
        {state.result.items.map((item) => (
          <DropdownMenuItem
            asChild
            className="cursor-pointer items-start gap-3"
            key={item.mediaId}
          >
            <Link href={routes.media(item.mediaId)}>
              {/*
                La jaquette au format d'une jaquette, comme dans la palette : c'est elle qui fait
                reconnaître une œuvre avant qu'on ait lu le titre.
              */}
              <div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded-sm bg-muted-foreground/20">
                {item.cover ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="40px"
                    src={item.cover}
                  />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium">{item.title}</span>
                {/*
                  **Le numéro d'abord, le retard ensuite.** « Épisode 12 sorti » est la nouvelle ;
                  « 2 épisodes de retard » est ce qu'elle me coûte. Écrit en toutes lettres par
                  `formatLag`, comme au planning — jamais en pictogramme.
                */}
                <span className="text-muted-foreground text-xs">
                  Épisode {item.episode} sorti · {formatLag(item.lag)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatSince(new Date(item.airedAt * 1000), now)}
                </span>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </div>
  );
}
