import { PersonPortrait } from "@/app/(app)/media/[id]/_components/person-portrait";
import { formatStaffRole } from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type StaffEdge = MediaDetail["staff"]["edges"][number];

/**
 * L'équipe : qui a fait l'œuvre, et à quel poste.
 *
 * **L'onglet a sa propre lecture**, qui en demande vingt-cinq là où l'aperçu n'en montre que
 * trois — soit une rangée pleine au palier large, et rien qui dépasse. Le hero, lui, n'en retient qu'un seul : celui qui signe (`_lib/media-credits.ts`). Les
 * trois ne font pas double emploi — la ligne de faits répond « de qui est-ce ? », l'aperçu « qui
 * d'autre ? », l'onglet « qui l'a fabriquée ? ».
 *
 * Les deux requêtes trient `[RELEVANCE]` : les postes arrivent dans l'ordre où AniList les juge
 * importants, aucun tri à refaire.
 *
 * Même carte que les personnages, amputée de son côté droit — une personne, un rôle. La géométrie
 * est partagée (`person-portrait.tsx`) pour que les deux onglets se ressemblent : ce sont les mêmes
 * objets, des gens attachés à l'œuvre.
 *
 * Composant serveur.
 */
/**
 * Les membres à montrer, **déjà bornés par l'appelant** : trois pour l'échantillon de l'aperçu,
 * vingt-cinq pour l'onglet. Un nom absent rend la carte muette — un portrait et un poste sans
 * titulaire —, donc la ligne est écartée ici plutôt qu'affichée vide.
 */
export function MediaStaff({ staff: edges }: { staff: StaffEdge[] }) {
  const staff = edges.filter((edge) => edge.node.name.full);

  if (staff.length === 0) return null;

  return (
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-x-4 lg:grid-cols-3">
      {staff.map((edge) => (
        <StaffCard edge={edge} key={edge.node.id} />
      ))}
    </ul>
  );
}

function StaffCard({ edge }: { edge: StaffEdge }) {
  const name = edge.node.name.full;
  const role = formatStaffRole(edge.role);

  return (
    <li className="min-w-0">
      {/*
        Même matière et même hauteur que la carte d'un personnage : liseré interne, coins arrondis,
        `overflow-hidden` pour que le portrait vienne mourir exactement dessus, et `h-20` pour que
        les deux onglets aient la même respiration quand on passe de l'un à l'autre.
      */}
      <div className="flex h-20 items-stretch gap-3 overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
        <PersonPortrait name={name} src={edge.node.image?.large ?? null} />

        <div className="flex min-w-0 flex-col justify-center py-2 pr-3">
          <p className="truncate text-sm font-medium" title={name ?? undefined}>
            {name}
          </p>
          {role ? (
            /*
              Le rôle n'est **pas** en capitales espacées comme celui d'un personnage, et l'écart est
              voulu : « Principal » est une valeur parmi trois, qui se lit comme une étiquette, alors
              qu'un rôle d'équipe est du texte libre — « Direction de l'animation en chef » en
              capitales espacées passerait sur deux lignes et crierait. L'infobulle rend l'entier.
            */
            <p className="truncate text-xs text-muted-foreground" title={role}>
              {role}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
