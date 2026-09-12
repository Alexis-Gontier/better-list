import { MediaSection } from "@/app/(app)/media/[id]/_components/media-section";
import { MediaCard } from "@/features/media/components/media-card";
import { formatRelationType } from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";

type RelationEdge = MediaDetail["relations"]["edges"][number];

type MediaRelationsProps = {
  /** Les liens à montrer, **déjà filtrés et classés** par `_lib/media-panels.ts`. */
  relations: RelationEdge[];
  titleLanguage: TitleLanguage;
  /** L'onglet où la liste se lit en entier. Absent quand on y est déjà. */
  href?: string;
};

/**
 * Les œuvres liées — **une seule rangée, qui défile** (décision d'Alexis du 12 septembre 2026).
 *
 * Deux formes ont précédé celle-ci. Une liste plate de cartes horizontales, d'abord : elle
 * obligeait à lire chaque étiquette pour reconstituer la franchise. Puis un groupement par nature
 * de lien, avec un repli `<details>` sur les catégories de contexte : la structure devenait la mise
 * en page, mais le prix était la hauteur — sur One Piece, cinq titres de groupe et autant de
 * grilles poussaient « À voir ensuite » très loin sous la ligne de flottaison.
 *
 * **La ligne unique rend la hauteur constante, quel que soit le nombre de liens.** Trois relations
 * ou soixante-cinq occupent exactement la même place ; c'est le défilement horizontal qui absorbe
 * la différence, et non la page. Le repli n'a plus d'objet — il servait à cacher du volume
 * vertical, et il n'y en a plus.
 *
 * **Ce que le groupement portait, la carte le porte maintenant** : le type du lien est écrit sous
 * chaque titre. C'est la contrepartie assumée de la ligne unique — on ne compte plus « trente
 * histoires parallèles » d'un coup d'œil, mais l'ordre de tri (`RELATION_ORDER`, dans
 * `_lib/media-panels.ts`) met toujours en tête ce qui répond à « qu'est-ce que je regarde avant,
 * qu'est-ce que je regarde après ». La structure est donc dans l'ordre, plus dans la découpe.
 *
 * Composant serveur : le défilement est du CSS, la navigation est dans `MediaCard`.
 */
export function MediaRelations({
  relations,
  titleLanguage,
  href,
}: MediaRelationsProps) {
  if (relations.length === 0) return null;

  return (
    <MediaSection href={href} title="Œuvres liées">
      {/*
        `overflow-x-auto` et rien d'autre : pas de flèches, pas de JavaScript. Une rangée qui déborde
        se fait défiler à la molette horizontale, au trackpad et au doigt, et le focus clavier amène
        lui-même la carte suivante dans le champ — les liens sont focalisables, donc le navigateur
        fait le travail sans qu'on ait à rendre le conteneur focalisable à la main.

        `pb-1` réserve la place de la barre de défilement là où le système la peint par-dessus le
        contenu, pour qu'elle ne vienne pas mordre la ligne des types de lien. Elle reste visible,
        au contraire de la barre d'onglets qui la masque (`scrollbar-none`) : là-haut, les onglets
        coupés disent déjà qu'il y en a d'autres, ici c'est le seul repère fixe.

        Le débord négatif est celui du planning (`airing-week-grid.tsx`) : au palier étroit, la
        rangée court jusqu'au bord de l'écran plutôt que de s'arrêter dans la marge du conteneur —
        une rangée qui défile doit sortir du cadre, sinon elle a l'air de finir là où elle est
        coupée. Il retombe dans la marge à partir de `sm`, où le conteneur passe à `px-6` et où le
        décalage ne correspondrait plus.

        La **largeur fixe** des cartes est ce qui fait la rangée : sans `shrink-0`, flex les
        comprimerait toutes pour rentrer dans la largeur disponible au lieu de déborder, et
        soixante-cinq jaquettes deviendraient soixante-cinq traits verticaux. Le format retenu
        laisse une carte à moitié visible au bord droit sur la plupart des fiches — c'est ce bord
        coupé qui dit qu'il y a autre chose derrière, mieux que n'importe quelle flèche.
      */}
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {relations.map((edge) => (
          // La clé est l'id de l'œuvre liée, pas celui de l'arête : AniList n'expose pas d'id
          // d'arête dans cette sélection, et une même œuvre n'apparaît qu'une fois par fiche.
          <li className="w-32 shrink-0" key={edge.node.id}>
            <RelationCard edge={edge} titleLanguage={titleLanguage} />
          </li>
        ))}
      </ul>
    </MediaSection>
  );
}

/**
 * Une jaquette du catalogue, **et le type de son lien juste dessous**.
 *
 * L'étiquette est posée ici et non dans `MediaCard` : la carte du catalogue vit dans
 * `features/media/` et sert quatre écrans, dont trois n'ont pas de relation à afficher. Elle expose
 * déjà deux emplacements (`marker`, `action`), et aucun des deux n'est celui-ci — `marker` est à
 * gauche du titre, où une étiquette de dix caractères mangerait la place du titre lui-même.
 *
 * Elle reprend la graisse et la chasse des intitulés de la ligne de faits et des rôles de
 * personnage : c'est le rôle typographique de l'étiquette sur cette page, et il est écrit une fois
 * de la même façon partout.
 *
 * `truncate` plutôt qu'un retour à la ligne : « Histoire parallèle » dépasse 128 px, et une carte
 * plus haute que ses voisines désalignerait la rangée. Le libellé complet reste dans l'infobulle.
 */
function RelationCard({
  edge,
  titleLanguage,
}: {
  edge: RelationEdge;
  titleLanguage: TitleLanguage;
}) {
  const label = formatRelationType(edge.relationType) ?? "Autre";

  return (
    <div className="flex flex-col gap-1">
      <MediaCard media={edge.node} titleLanguage={titleLanguage} />
      <p
        className="truncate text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase"
        title={label}
      >
        {label}
      </p>
    </div>
  );
}
