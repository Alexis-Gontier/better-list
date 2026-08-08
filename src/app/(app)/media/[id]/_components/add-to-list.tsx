import { AddToListDialog } from "@/app/(app)/media/[id]/_components/add-to-list-dialog";
import { getListsForMedia } from "@/features/lists/server/lists.queries";

/**
 * Charge mes listes côté serveur, puis passe la main à l'îlot client.
 *
 * Même découpage que la barre de filtres de la recherche : la lecture reste serveur, le dialogue ne
 * reçoit que ce qu'il affiche. Il connaît déjà quelles listes contiennent l'œuvre, donc il n'a aucune
 * requête à faire à l'ouverture — et le premier clic est instantané.
 */
export async function AddToList({ mediaId }: { mediaId: number }) {
  const lists = await getListsForMedia(mediaId);

  return <AddToListDialog lists={lists} mediaId={mediaId} />;
}
