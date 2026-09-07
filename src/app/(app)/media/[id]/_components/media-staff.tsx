import { UserAvatar } from "@/components/shared/user-avatar";
import { formatStaffRole } from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaStaffProps = {
  media: MediaDetail;
};

/**
 * L'équipe : qui a réalisé, écrit, dessiné, composé.
 *
 * **En rangées et non en grille**, contrairement aux personnages. Ce qu'on cherche ici est un
 * rôle — « qui a réalisé ça ? » —, pas un visage : une grille de portraits obligerait à lire douze
 * légendes pour trouver une ligne. La photo reste, en petit, parce qu'elle aide à reconnaître un
 * nom déjà croisé ailleurs.
 *
 * `UserAvatar` est réemployé tel quel : il ne connaît aucune entité — il met en forme un nom et une
 * URL d'image, et se replie sur les initiales quand la photo manque, ce qui arrive souvent au staff
 * d'AniList. Son propre commentaire pose déjà cette réutilisation comme légitime.
 *
 * Huit au plus, borné par la requête (`staff(perPage: 8)`) : au-delà, on liste les intervalliers.
 */
export function MediaStaff({ media }: MediaStaffProps) {
  const staff = media.staff.edges.filter((edge) => edge.node.name.full);

  if (staff.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Équipe</h2>

      <ul className="grid gap-4 sm:grid-cols-2">
        {staff.map((edge) => {
          const role = formatStaffRole(edge.role);
          const name = edge.node.name.full ?? "";

          return (
            <li className="flex min-w-0 items-center gap-3" key={edge.node.id}>
              <UserAvatar
                className="size-10 shrink-0"
                image={edge.node.image?.large}
                name={name}
              />

              <div className="min-w-0">
                <p className="truncate font-medium text-sm" title={name}>
                  {name}
                </p>
                {role ? (
                  <p
                    className="truncate text-muted-foreground text-xs"
                    title={role}
                  >
                    {role}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
