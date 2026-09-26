import Link from "next/link";

import { PersonPortrait } from "@/app/(app)/media/[id]/_components/person-portrait";
import { routes } from "@/config/routes";
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

        La carte entière mène à la page de la personne (26 septembre 2026).
      */}
      <Link
        className="flex h-20 items-stretch gap-3 overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-colors hover:bg-muted/40"
        href={routes.staff(edge.node.id)}
        prefetch={false}
      >
        <PersonPortrait name={name} src={edge.node.image?.large ?? null} />

        {/*
          **La typographie est celle de la carte d'un personnage** (décision d'Alexis du
          13 septembre 2026) : nom sur deux lignes au plus, poste en capitales espacées, calés en
          haut et en bas. Le poste d'équipe est du texte libre et plus long qu'un « Principal » —
          il est donc tronqué sur une ligne, et l'infobulle rend l'entier.
        */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-2 pr-3">
          <p
            className="line-clamp-2 text-sm font-medium"
            title={name ?? undefined}
          >
            {name}
          </p>
          {role ? (
            <p
              className="truncate text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase"
              title={role}
            >
              {role}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
