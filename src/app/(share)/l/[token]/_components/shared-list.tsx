import { notFound } from "next/navigation";

import { SharedListGrid } from "@/app/(share)/l/[token]/_components/shared-list-grid";
import { MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { LOCALE } from "@/config/locale";
import { getSharedList } from "@/features/lists/server/lists.queries";

/**
 * Le contenu d'une liste partagée, et le squelette qui tient sa place.
 *
 * C'est **ce composant** qu'on suspend, jamais la page : la lecture par jeton est une requête base
 * non mémorisable — elle dépend du jeton de l'URL —, et `cacheComponents` exige que le segment sache
 * rendre quelque chose avant de l'attendre. Sans cette frontière, la page entière devient dynamique
 * et Next le signale à chaque rendu. C'est la forme qu'ont déjà toutes les pages du projet.
 *
 * Les deux vivent dans le même fichier, comme `MediaGrid` et son squelette : c'est ce qui empêche le
 * repli de dériver de ce qu'il remplace, et donc la page de sauter en fin de chargement.
 */
export async function SharedList({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const list = await getSharedList(token);

  // Jeton faux et partage révoqué donnent le même `null`, donc la même page : c'est ce qui rend
  // inutile d'en essayer au hasard.
  if (!list) notFound();

  const owner = list.owner.name ?? list.owner.username;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          Liste partagée
        </p>

        <h1 className="font-semibold text-2xl tracking-tight">{list.title}</h1>

        {list.description ? (
          <p className="max-w-2xl text-muted-foreground text-sm">
            {list.description}
          </p>
        ) : null}

        <p className="text-muted-foreground text-xs">
          {/*
            Le nom du propriétaire, **sans lien vers son profil** : `/u/[username]` est derrière la
            garde d'accès, donc le lien enverrait le visiteur sur une connexion qu'il ne peut pas
            franchir.
          */}
          Par {owner} · {list.items.length.toLocaleString(LOCALE)}{" "}
          {list.items.length > 1 ? "œuvres" : "œuvre"}
        </p>
      </header>

      {list.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Cette liste ne contient aucune œuvre pour l'instant.
        </p>
      ) : (
        <SharedListGrid items={list.items} />
      )}
    </div>
  );
}

export function SharedListSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      <MediaGridSkeleton count={12} />
    </div>
  );
}
