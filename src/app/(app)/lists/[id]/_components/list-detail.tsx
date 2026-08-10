import { LayersIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToListSearch } from "@/app/(app)/lists/[id]/_components/add-to-list-search";
import { DeleteListButton } from "@/app/(app)/lists/[id]/_components/delete-list-button";
import { EditListDialog } from "@/app/(app)/lists/[id]/_components/edit-list-dialog";
import { RemoveFromListButton } from "@/app/(app)/lists/[id]/_components/remove-from-list-button";
import { SortableListGrid } from "@/app/(app)/lists/[id]/_components/sortable-list-grid";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { LOCALE } from "@/config/locale";
import { routes } from "@/config/routes";
import { getListById } from "@/features/lists/server/lists.queries";
import { MediaCard } from "@/features/media/components/media-card";
import {
  compactFromMirror,
  mirroredTitle,
} from "@/features/media/lib/media-format";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Une liste et son contenu.
 *
 * L'ordre affiché est celui de `rank`, l'index fractionnaire de §4.4. En V1 il reflète l'ordre
 * d'ajout ; le glisser-déposer de V1.5 insérera entre deux clés sans toucher au reste, et **cet
 * écran n'aura rien à changer** — c'est tout l'intérêt d'avoir posé la colonne dès le départ.
 */
export async function ListDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await getListById(id);

  // La query est close sur le propriétaire : une liste d'un autre membre est indiscernable d'une
  // liste inexistante, et les deux donnent la même page introuvable.
  if (!list) notFound();

  const { titleLanguage } = await getPreferences();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="font-semibold text-xl">{list.title}</h1>

          {list.description ? (
            <p className="text-muted-foreground text-sm">{list.description}</p>
          ) : null}

          <p className="text-muted-foreground text-xs">
            {list.items.length.toLocaleString(LOCALE)}{" "}
            {list.items.length > 1 ? "œuvres" : "œuvre"}
            {list.visibility === "UNLISTED" ? " · lien non listé" : null}
          </p>
        </div>

        {/*
          Les commandes de la liste, la moins conséquente d'abord — ce qui est aussi l'ordre de
          fréquence. « Ajouter » est le geste qu'on refait dix fois de suite ; « Modifier » se
          défait ; « Supprimer » emporte tout, et c'est le seul des trois à demander confirmation.
        */}
        <div className="flex shrink-0 items-center gap-1">
          <AddToListSearch
            listId={list.id}
            presentMediaIds={list.items.map((item) => item.media.id)}
          />

          <EditListDialog
            description={list.description}
            listId={list.id}
            title={list.title}
          />

          <DeleteListButton
            itemCount={list.items.length}
            listId={list.id}
            title={list.title}
          />
        </div>
      </header>

      {list.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayersIcon />
            </EmptyMedia>
            <EmptyTitle>Liste vide</EmptyTitle>
            <EmptyDescription>
              « Ajouter une œuvre », en haut de la page, cherche dans votre
              bibliothèque et dans le catalogue. Une fiche sait aussi le faire,
              par « Ajouter à une liste ».
            </EmptyDescription>
          </EmptyHeader>

          {/*
            L'état vide garde sa porte vers la recherche : elle mène à un écran qui montre des
            jaquettes et des filtres, là où le champ d'ajout demande de savoir déjà quoi taper. Les
            deux ne répondent pas à la même question — « laquelle ajouter ? » contre « ajoute
            celle-ci ».
          */}
          <EmptyContent>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.search}>Parcourir le catalogue</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        /**
         * Les vignettes sont rendues **ici, côté serveur**, puis confiées à la grille triable qui ne
         * fait que les réordonner. `MediaCard` est asynchrone — il lit la préférence de langue des
         * titres —, donc un composant client ne peut pas l'appeler ; il peut en revanche recevoir son
         * résultat. C'est ce qui permet de rendre la grille interactive sans faire basculer son
         * contenu côté client.
         */
        <SortableListGrid
          items={list.items.map((item) => ({
            id: String(item.media.id),
            card: (
              <MediaCard
                action={
                  <RemoveFromListButton
                    listId={list.id}
                    mediaId={item.media.id}
                    title={mirroredTitle(item.media, titleLanguage)}
                  />
                }
                media={compactFromMirror(item.media)}
                /**
                 * La note de la ligne, quand elle existe : c'est ce qu'on a voulu dire de l'œuvre
                 * **dans cette liste**, et ça n'a rien à voir avec le suivi. Le titre du média
                 * suffit au reste.
                 */
                meta={item.note}
              />
            ),
          }))}
          listId={list.id}
        />
      )}
    </div>
  );
}
