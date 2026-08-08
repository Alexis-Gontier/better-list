import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryControls } from "@/features/tracking/components/entry-controls";
import { getEntryForMedia } from "@/features/tracking/server/tracking.queries";

/**
 * Panneau de suivi d'une œuvre.
 *
 * Server Component : il lit l'entrée en base et ne descend au client que les contrôles, avec la
 * frontière la plus étroite possible (docs/ARCHITECTURE.md). Le titre, l'encadré et les dates
 * restent serveur.
 *
 * Il vit dans `features/` et non dans le `_components/` de la route parce qu'il ne servira pas
 * qu'à la fiche : la bibliothèque et le tableau de bord ont le même geste à offrir
 * (docs/PRODUCT.md §6, V1).
 */
export async function EntryPanel({ media }: { media: MediaDetail }) {
  const entry = await getEntryForMedia(media.id);
  const { scoreFormat } = await getPreferences();

  return (
    <section
      aria-labelledby="mon-suivi"
      className="space-y-4 rounded-lg border bg-card p-4"
    >
      <h2 className="font-medium text-sm" id="mon-suivi">
        Mon suivi
      </h2>

      <EntryControls
        entry={entry}
        scoreFormat={scoreFormat}
        mediaId={media.id}
        total={mediaTotalUnits(media)}
        unit={media.type === "ANIME" ? "episode" : "chapitre"}
      />
    </section>
  );
}
