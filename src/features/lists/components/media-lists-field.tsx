"use client";

import { useEffect, useState } from "react";
import * as z from "zod";

import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { ListPicker } from "@/features/lists/components/list-membership";
import {
  type ListMembership,
  listMembershipSchema,
} from "@/features/lists/schemas/lists.schema";
import { upfetch } from "@/lib/http/fetch";

type FieldState =
  | { phase: "loading" }
  | { phase: "done"; lists: ListMembership[] }
  | { phase: "error" };

/**
 * Mes listes, **dans la fenêtre d'édition rapide d'une vignette** (D53) — le contenu du panneau de
 * droite : un en-tête, les cases qui défilent, la création en pied.
 *
 * Elles sont lues **au montage**, c'est-à-dire à l'ouverture de la fenêtre — `DialogContent` ne
 * monte rien tant qu'elle est fermée. Les lire au rendu de la grille coûterait une requête par carte
 * pour une fenêtre qu'on ouvre une fois sur vingt et une.
 *
 * **Chaque choix s'enregistre aussitôt, contrairement au reste de la fenêtre** (D37), qui attend
 * « Enregistrer ». C'est le contrat de la fiche, gardé tel quel : une case cochée dit où l'œuvre est
 * rangée *maintenant*, et un brouillon de rangement à valider ferait mentir la case jusqu'au clic.
 * L'en-tête le dit, pour qu'« Annuler » ne passe pas pour un défaire.
 */
export function MediaListsField({ mediaId }: { mediaId: number }) {
  const [state, setState] = useState<FieldState>({ phase: "loading" });
  // Relire après une écriture : la revalidation du serveur n'atteint pas ce qui a été lu par `fetch`.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // `version` est la seule raison de relire ; le lint ne voit pas qu'elle est lue par l'effet.
    void version;
    const controller = new AbortController();

    upfetch(routes.api.listMembership(mediaId), {
      schema: z.array(listMembershipSchema),
      signal: controller.signal,
    })
      .then((lists) => setState({ phase: "done", lists }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ phase: "error" });
      });

    return () => controller.abort();
  }, [mediaId, version]);

  const reload = () => setVersion((current) => current + 1);

  const containing =
    state.phase === "done"
      ? state.lists.filter((list) => list.contains).length
      : 0;

  return (
    <>
      <div className="flex flex-col gap-0.5 px-3 pt-3 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-medium text-sm">Mes listes</p>
          {/* Combien la contiennent : ce qu'on vient vérifier avant de lire les noms. */}
          {state.phase === "done" && state.lists.length > 0 ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              {containing} sur {state.lists.length}
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          Chaque choix est enregistré aussitôt.
        </p>
      </div>

      {/* `min-h-0` : sans lui, un enfant de flex ne rétrécit pas sous son contenu, et rien ne défile. */}
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
        {state.phase === "loading" ? (
          // Le champ et deux lignes, à leur hauteur réelle (jaquette de 40 px + rembourrage) : rien ne saute.
          <div className="flex flex-col gap-1 p-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-13 w-full" />
            <Skeleton className="h-13 w-full" />
          </div>
        ) : state.phase === "error" ? (
          <p className="px-2 py-2 text-muted-foreground text-sm">
            Les listes n'ont pas pu être lues. Rouvrez la fenêtre pour
            réessayer.
          </p>
        ) : (
          <ListPicker
            heading={null}
            lists={state.lists}
            mediaId={mediaId}
            onChanged={reload}
          />
        )}
      </div>
    </>
  );
}
