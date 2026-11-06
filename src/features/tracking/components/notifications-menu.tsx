"use client";

import { BellIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/config/routes";
import { notificationLabel } from "@/features/social/lib/notification-rules";
import type {
  Activity,
  ActivityItem,
} from "@/features/social/schemas/social.schema";
import { markNotificationsRead } from "@/features/social/server/social.actions";
import { formatLag } from "@/features/tracking/lib/airing-lag";
import { formatSince } from "@/features/tracking/lib/entry-format";
import {
  type Bell,
  bellSchema,
  type EpisodeNotifications,
} from "@/features/tracking/schemas/notifications.schema";
import { upfetch } from "@/lib/http/fetch";
import { cn } from "@/lib/utils";

/**
 * La cloche de l'en-tête, en deux onglets depuis le lot 3 (maquette E).
 *
 * **« Épisodes »** : les épisodes sortis que je n'ai pas vus. Il n'y a rien à y marquer comme lu
 * (décision d'Alexis du 14 septembre 2026) : le retard *est* l'état non-lu, il s'éteint au « +1 ».
 *
 * **« Activité »** : likes, copies et demandes d'inscription, stockés (table `Notification`).
 * Ouvrir l'onglet les marque lus ; leur point reste visible jusqu'à la fermeture, pour qu'on voie
 * ce qui était neuf.
 *
 * Elle vit dans `features/tracking/` depuis le 14 septembre 2026 : un composant qui connaît une
 * entité métier quitte `components/layout/` (CLAUDE.md).
 */

/** Où en est la lecture. Pas d'état inerte : elle part au montage, il n'y a rien à attendre. */
type MenuState =
  | { phase: "loading" }
  | { phase: "done"; result: Bell }
  | { phase: "error" };

type Tab = "episodes" | "activite";

export function NotificationsMenu() {
  const [state, setState] = useState<MenuState>({ phase: "loading" });
  const [tab, setTab] = useState<Tab>("episodes");
  const [activityRead, setActivityRead] = useState(false);
  const { execute: markRead } = useAction(markNotificationsRead);

  /*
    **Une seule requête, au montage**, hors du chemin de rendu : l'en-tête ne se remonte pas aux
    navigations client, et la pastille n'est pas une raison de retarder le premier octet.
  */
  useEffect(() => {
    const controller = new AbortController();

    upfetch(routes.api.notifications, {
      schema: bellSchema,
      signal: controller.signal,
    })
      .then((result) => {
        setState({ phase: "done", result });
        // Rien de neuf côté épisodes mais de l'activité : on ouvre là où il se passe quelque chose.
        if (result.episodes.items.length === 0 && result.activity.unread > 0) {
          setTab("activite");
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ phase: "error" });
      });

    return () => controller.abort();
  }, []);

  const episodes =
    state.phase === "done" ? state.result.episodes.items.length : 0;
  const activityUnread =
    state.phase === "done" && !activityRead ? state.result.activity.unread : 0;
  const unread = episodes + activityUnread;

  function readActivity() {
    if (activityUnread === 0) return;
    setActivityRead(true);
    markRead();
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && tab === "activite") readActivity();
      }}
    >
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
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-90 max-w-[calc(100vw-2rem)] p-2"
      >
        <Tabs
          onValueChange={(value) => {
            setTab(value as Tab);
            if (value === "activite") readActivity();
          }}
          value={tab}
        >
          <TabsList className="w-full">
            <TabsTrigger value="episodes">
              Épisodes <Badge variant="secondary">{episodes}</Badge>
            </TabsTrigger>
            <TabsTrigger value="activite">
              Activité{" "}
              <Badge variant="secondary">
                {state.phase === "done" ? state.result.activity.unread : 0}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="episodes">
            <EpisodesBody state={state} />
          </TabsContent>
          <TabsContent value="activite">
            <ActivityBody state={state} />
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const NOTICE =
  "flex items-center justify-center gap-2 px-3 py-6 text-center text-muted-foreground text-sm";

/** Les états communs aux deux onglets : chargement et échec. `null` quand la réponse est là. */
function PendingNotice({ state }: { state: MenuState }) {
  if (state.phase === "loading") {
    return (
      <p className={NOTICE}>
        <Spinner />
        Chargement…
      </p>
    );
  }
  if (state.phase === "error") {
    return <p className={NOTICE}>Les notifications n'ont pas pu être lues.</p>;
  }
  return null;
}

function NothingNew({ description }: { description: string }) {
  return (
    <Empty className="p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BellIcon />
        </EmptyMedia>
        <EmptyTitle>Rien de neuf</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * **Quatre états et non deux** : « rien de neuf », « on n'a pas pu demander » et « AniList n'a pas
 * répondu » sont trois choses différentes, et seule la première est une bonne nouvelle.
 */
function EpisodesBody({ state }: { state: MenuState }) {
  if (state.phase !== "done") return <PendingNotice state={state} />;
  const episodes: EpisodeNotifications = state.result.episodes;

  if (episodes.unavailable) {
    return (
      <p className={NOTICE}>
        AniList ne répond pas : impossible de savoir ce qui est sorti.
      </p>
    );
  }
  if (episodes.items.length === 0) {
    return (
      <NothingNew description="Vous êtes à jour sur tout ce que vous suivez." />
    );
  }

  // L'instant est pris une fois pour toute la liste : deux lignes de la même minute s'écrivent pareil.
  const now = new Date();

  return (
    // Le défilement sur l'enveloppe : `DropdownMenuGroup` porte le rôle ARIA.
    <div className="max-h-96 overflow-y-auto">
      <DropdownMenuGroup>
        {episodes.items.map((item) => (
          <DropdownMenuItem
            asChild
            className="cursor-pointer items-start gap-3"
            key={item.mediaId}
          >
            <Link href={routes.media(item.mediaId)}>
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
                {/* Le numéro d'abord, le retard ensuite : la nouvelle, puis ce qu'elle me coûte. */}
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

function ActivityBody({ state }: { state: MenuState }) {
  if (state.phase !== "done") return <PendingNotice state={state} />;
  const activity: Activity = state.result.activity;

  if (activity.items.length === 0) {
    return (
      <NothingNew description="Personne n'a encore aimé ni copié vos listes." />
    );
  }

  const now = new Date();

  return (
    <div className="max-h-96 overflow-y-auto">
      <DropdownMenuGroup>
        {activity.items.map((item) => (
          <ActivityRow item={item} key={item.id} now={now} />
        ))}
      </DropdownMenuGroup>
    </div>
  );
}

function ActivityRow({ item, now }: { item: ActivityItem; now: Date }) {
  const { lead, subject } = notificationLabel(item);
  const href =
    item.type === "SIGNUP_PENDING"
      ? routes.admin.users
      : item.listId
        ? routes.lists.detail(item.listId)
        : null;

  const body = (
    <>
      <UserAvatar
        className="size-7 text-xs"
        image={item.actorImage}
        name={item.actorName}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm">
          {lead} <span className="font-medium">{subject}</span>
        </span>
        <span className="text-muted-foreground text-xs">
          {formatSince(new Date(item.createdAt * 1000), now)}
          {item.type === "SIGNUP_PENDING" ? " · Administration" : null}
        </span>
      </div>
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.read ? "bg-transparent" : "bg-primary",
        )}
      />
    </>
  );

  return (
    <DropdownMenuItem
      asChild={href !== null}
      className="cursor-pointer items-start gap-3"
    >
      {href ? <Link href={href}>{body}</Link> : <div>{body}</div>}
    </DropdownMenuItem>
  );
}
