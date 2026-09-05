import Image from "next/image";
import Link from "next/link";
import { formatAiringTime } from "@/app/(app)/calendar/_lib/airing-week";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";
import {
  type MirroredMedia,
  mirroredTitle,
} from "@/features/media/lib/media-format";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { EntryQuickProgress } from "@/features/tracking/components/entry-quick-progress";
import {
  type AiringCatchUp,
  describeAiringCatchUp,
} from "@/features/tracking/lib/entry-format";
import { cn } from "@/lib/utils";

/**
 * Une diffusion, jointe à mon suivi de la série.
 *
 * Le type est déclaré **ici**, du côté qui le consomme : c'est ce composant qui dit de quoi il a
 * besoin pour dessiner une ligne, et la page se charge de le fournir. L'inverse — un type posé dans
 * la page et importé par ses enfants — obligerait à le modifier à deux endroits dès qu'une colonne
 * s'ajoute.
 */
export type AiringEpisodeView = {
  /** L'id de la diffusion chez AniList : deux épisodes d'une même série cohabitent dans une semaine. */
  id: number;
  episode: number;
  /** Horodatage Unix **en secondes**, la convention d'AniList. */
  airingAt: number;
  /** Ma progression sur la série, telle que le miroir la connaît. */
  progress: number;
  media: MirroredMedia & {
    episodes: number | null;
    chapters: number | null;
  };
};

/**
 * La couleur de l'étiquette, par état de rattrapage.
 *
 * Le retard est le seul état sur lequel on peut **agir** : c'est donc le seul qui prend la couleur
 * d'accent. « Vu » et « à jour » sont des confirmations, elles n'ont pas à attirer l'œil sur une
 * page qui en compte trente. `Record` sur l'union : un quatrième état casserait le build ici plutôt
 * que de s'afficher sans style.
 */
const CATCH_UP_VARIANT: Record<
  AiringCatchUp["state"],
  "default" | "secondary" | "outline"
> = {
  seen: "outline",
  next: "secondary",
  behind: "default",
};

/**
 * Une diffusion : l'heure, l'œuvre, l'épisode, et où j'en suis.
 *
 * **La dernière colonne est ce qui distingue cette page d'une grille de chaîne.** AniList et
 * MyAnimeList disent ce qui sort ; ils ne disent pas ce qu'il vous manque pour le regarder. Sur un
 * tracker, c'est pourtant l'information qui décide : un épisode 9 ce soir n'a de sens que rapporté
 * au fait qu'on en est au 6.
 *
 * La carte lit la préférence de langue **elle-même**, comme `MediaCard` : `getPreferences` porte le
 * `cache` de React, donc les trente lignes d'une semaine ne coûtent qu'une requête. Tout le reste
 * vient du miroir local — AniList n'a fourni que l'heure et le numéro d'épisode.
 */
export async function AiringEpisode({
  airing,
  now,
}: {
  airing: AiringEpisodeView;
  /**
   * Passé par la page plutôt que relu ici : les trente lignes d'une semaine doivent trancher
   * « diffusé ou pas » sur le même instant, sinon deux lignes de la même minute peuvent se
   * contredire.
   */
  now: Date;
}) {
  const { titleLanguage } = await getPreferences();

  const { media, progress, episode, airingAt } = airing;
  const title = mirroredTitle(media, titleLanguage);
  const total = mediaTotalUnits(media);
  const aired = airingAt * 1000 <= now.getTime();
  const catchUp = describeAiringCatchUp(episode, progress, "episode");

  return (
    // `group` sur la ligne entière : c'est ce qui révèle le « +1 » au survol, exactement comme sur
    // une jaquette de la bibliothèque. Le bouton reste visible en permanence sur petit écran, où il
    // n'y a pas de survol — `EntryQuickProgress` s'en charge.
    <div className="group flex items-center gap-3 rounded-md border p-2">
      <time
        className={cn(
          "w-11 shrink-0 text-center font-medium text-xs tabular-nums",
          aired ? "text-muted-foreground" : "text-foreground",
        )}
        dateTime={new Date(airingAt * 1000).toISOString()}
      >
        {formatAiringTime(airingAt)}
      </time>

      <Link
        className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded-sm bg-muted"
        href={routes.media(media.id)}
        // La jaquette double le lien du titre : elle n'a rien à annoncer de plus.
        tabIndex={-1}
      >
        {media.coverImage ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="36px"
            src={media.coverImage}
          />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1 space-y-0.5">
        <Link
          className="line-clamp-1 font-medium text-sm hover:underline"
          href={routes.media(media.id)}
        >
          {title}
        </Link>

        {/*
          Le retard est collé au numéro d'épisode, et non renvoyé dans une colonne à droite. Deux
          raisons, et la seconde est la vraie : les deux informations n'ont de sens qu'ensemble
          — « épisode 5 sur 12 » et « 2 de retard » forment une phrase —, et une colonne de droite
          n'existe pas sous 640 px, où il aurait fallu masquer précisément ce que la page a de plus
          utile. Le `flex-wrap` fait passer l'étiquette à la ligne au lieu de la faire disparaître.
        */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-muted-foreground text-xs">
            {total ? `Épisode ${episode} sur ${total}` : `Épisode ${episode}`}
          </p>

          <Badge variant={CATCH_UP_VARIANT[catchUp.state]}>
            {catchUp.label}
          </Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/*
          Le « +1 » n'apparaît que sur un épisode **déjà diffusé** et **exactement suivant**. Les
          deux conditions comptent : avancer sur un épisode qui n'est pas sorti serait une écriture
          fausse, et sur un épisode qui en laisse deux derrière lui le geste ne rattraperait que le
          premier — il faudrait alors ouvrir la fiche, ce que le titre juste à côté permet.
        */}
        {aired && catchUp.state === "next" ? (
          <EntryQuickProgress
            mediaId={media.id}
            progress={progress}
            total={total}
            unit="episode"
          />
        ) : null}
      </div>
    </div>
  );
}
