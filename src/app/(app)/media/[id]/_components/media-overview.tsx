import { MediaCharacters } from "@/app/(app)/media/[id]/_components/media-characters";
import { MediaRecommendations } from "@/app/(app)/media/[id]/_components/media-recommendations";
import { MediaRelations } from "@/app/(app)/media/[id]/_components/media-relations";
import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { MediaStaff } from "@/app/(app)/media/[id]/_components/media-staff";
import { MediaSynopsis } from "@/app/(app)/media/[id]/_components/media-synopsis";
import {
  sampleRecommendations,
  visibleRelations,
  visibleTags,
} from "@/app/(app)/media/[id]/_lib/media-panels";
import type { MediaTab } from "@/app/(app)/media/[id]/_lib/media-tab-params";
import { Badge } from "@/components/ui/badge";
import { formatGenre } from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

/**
 * Combien de liens l'aperçu montre.
 *
 * Huit, soit **la rangée pleine et une carte qui dépasse** au palier large. Le chiffre était à
 * trois tant que les liens s'empilaient en grille, où chaque carte de plus coûtait de la hauteur
 * sur une fiche où cinq autres blocs attendent. Depuis que le bloc tient sur une seule ligne qui
 * défile (`MediaRelations`, 12 septembre 2026), montrer trois liens ou huit coûte exactement la
 * même place — et une rangée aux deux tiers vide, juste au-dessus des sept recommandations, se
 * lisait comme une franchise pauvre plutôt que comme un échantillon.
 *
 * Ça reste un échantillon, et « Tout voir » garde son sens : une franchise qui arrive jusqu'ici en
 * compte souvent trente.
 */
const SAMPLE_RELATIONS = 8;

type MediaOverviewProps = {
  media: MediaDetail;
  titleLanguage: TitleLanguage;
  includeAdult: boolean;
  /** De quoi construire les liens « Tout voir » sans concaténer une URL à la main. */
  tabHref: (tab: MediaTab) => string;
};

/**
 * L'onglet d'ouverture : **un peu de tout, en petite quantité** (décision d'Alexis du 11 septembre
 * 2026).
 *
 * Il a d'abord été un onglet comme les autres — synopsis, genres, tags — pendant que personnages,
 * équipe et œuvres liées vivaient chacun dans le leur. Le défaut se voyait à l'usage : arriver sur
 * une fiche ne disait rien de ce qu'elle contenait, et il fallait ouvrir trois onglets pour savoir
 * s'il y avait quelque chose à y voir. **Un aperçu doit donner l'inventaire, pas un chapitre.**
 *
 * Chaque bloc montre donc un échantillon et porte un « Tout voir » vers son onglet. Le chiffre de
 * chaque échantillon est calé sur ce que la requête de fiche ramène déjà — six personnages, trois
 * postes, sept recommandations —, si bien que **cet onglet ne coûte aucune lecture supplémentaire** :
 * il affiche exactement ce qui arrivait de toute façon avec le hero.
 *
 * Les tags n'y sont pas, et c'est le seul écart : ils ont leur onglet, et un échantillon de tags
 * n'apprend rien — c'est leur masse et leur classement qui disent quelque chose, pas les cinq
 * premiers. Les genres, eux, sont cinq au total : les montrer, c'est les montrer tous.
 */
export function MediaOverview({
  media,
  titleLanguage,
  includeAdult,
  tabHref,
}: MediaOverviewProps) {
  const genres = media.genres.filter(Boolean);
  const relations = visibleRelations(media, includeAdult);
  const recommendations = sampleRecommendations(media, includeAdult);

  /*
    Le nombre de tags sert **uniquement** au lien vers leur onglet : on ne montre pas les tags ici,
    mais on dit qu'ils existent. Sans ce compte, le seul chemin vers l'onglet serait la barre, et
    rien n'indiquerait qu'il y a cinquante entrées derrière plutôt que trois.
  */
  const tagCount = visibleTags(media, includeAdult).length;

  return (
    <div className="flex flex-col gap-8">
      <MediaSynopsis description={media.description} />

      {genres.length > 0 ? (
        <MediaSection
          href={tagCount > 0 ? tabHref("tags") : undefined}
          title="Genres"
        >
          <ul className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <li key={genre}>
                <Badge variant="secondary">{formatGenre(genre)}</Badge>
              </li>
            ))}
          </ul>
        </MediaSection>
      ) : null}

      {media.characters.edges.length > 0 ? (
        <MediaSection href={tabHref("personnages")} title="Personnages">
          <MediaCharacters characters={media.characters.edges} />
        </MediaSection>
      ) : null}

      {media.staff.edges.length > 0 ? (
        <MediaSection href={tabHref("equipe")} title="Équipe">
          <MediaStaff staff={media.staff.edges} />
        </MediaSection>
      ) : null}

      {/*
        Ces deux-là portent **leur propre titre** (`MediaRelations`, `MediaRecommendations`), alors
        que les trois blocs au-dessus sont enveloppés ici. L'écart n'est pas un oubli : ces deux
        composants servent aussi dans l'onglet Œuvres liées, où ils doivent se titrer eux-mêmes ;
        personnages et équipe, dans leur onglet, n'ont pas de titre du tout — c'est l'onglet qui le
        porte. Envelopper les uns et pas les autres est ce qui évite un titre en double d'un côté et
        un bloc anonyme de l'autre.
      */}
      <MediaRelations
        href={tabHref("oeuvres")}
        relations={relations.slice(0, SAMPLE_RELATIONS)}
        titleLanguage={titleLanguage}
      />

      <MediaRecommendations
        href={tabHref("oeuvres")}
        recommendations={recommendations}
        titleLanguage={titleLanguage}
      />
    </div>
  );
}
