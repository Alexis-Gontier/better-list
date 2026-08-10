import { mediaTitle } from "@/features/media/lib/media-format";
import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryDialog } from "@/features/tracking/components/entry-dialog";
import { EntryQuickProgress } from "@/features/tracking/components/entry-quick-progress";
import type { EntryState } from "@/features/tracking/lib/entry-transition";

/**
 * Les commandes posées sur une vignette : avancer d'un cran, tout modifier — ou commencer à suivre.
 *
 * Sur une œuvre suivie, les deux premières voyagent ensemble parce qu'elles se répondent — le
 * « +1 » couvre le cas fréquent, la fenêtre couvre tous les autres. Les câbler séparément dans
 * chaque écran a déjà produit deux copies du même bloc (accueil et bibliothèque) ; une troisième les
 * aurait fait diverger.
 *
 * **Sur une œuvre pas encore suivie, il n'y a que la fenêtre**, et c'est délibéré : un « +1 » y
 * créerait un suivi à l'épisode 1 avec un statut choisi par personne. Commencer à suivre est une
 * décision (quel statut, où j'en suis déjà), pas un incrément — et c'est justement ce que le
 * formulaire sait faire depuis toujours avec `entry === null`. Il ne lui manquait que ce bouton.
 *
 * Server Component : il ne descend au client que les deux feuilles interactives, et lit lui-même
 * l'échelle de note et la langue des titres. `getPreferences` porte le `cache` de React, donc les
 * vingt-quatre vignettes d'une page ne coûtent qu'une requête — le même raisonnement que
 * `MediaCard`, pour la même raison : faire descendre ces réglages depuis la page traverserait toute
 * l'arborescence pour deux valeurs.
 */
export async function EntryCardActions({
  media,
  entry,
  total,
  bannerImage,
}: {
  media: MediaCompact;
  /**
   * L'état complet du suivi, tel que la page l'a lu — la fenêtre l'édite sans rien recharger.
   *
   * `null` sur une œuvre que ce compte ne suit pas : c'est le cas des grilles de recherche et de
   * découverte, qui viennent d'AniList et croisent les suivis par `getEntryStatesFor`.
   */
  entry: EntryState | null;
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: number | null;
  /**
   * La bannière du miroir, pour l'en-tête de la fenêtre. Elle manque sur la plupart des mangas et
   * des webtoons chez AniList — la jaquette prend alors le relais, et elle ne manque jamais.
   */
  bannerImage?: string | null;
}) {
  const { titleLanguage } = await getPreferences();

  const unit = media.type === "ANIME" ? "episode" : "chapitre";

  return (
    // Le « +1 » d'abord : il vient en premier au clavier comme à l'œil, ce qui est l'ordre de
    // fréquence des deux gestes.
    <div className="flex items-center gap-1">
      {entry ? (
        <EntryQuickProgress
          mediaId={media.id}
          progress={entry.progress}
          total={total}
          unit={unit}
        />
      ) : null}

      <EntryDialog
        entry={entry}
        image={bannerImage ?? media.coverImage?.extraLarge}
        mediaId={media.id}
        title={mediaTitle(media.title, titleLanguage)}
        total={total}
        unit={unit}
      />
    </div>
  );
}
