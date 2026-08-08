import { PersonAvatar } from "@/app/(app)/media/[id]/_components/person-avatar";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Équipe créative : réalisation, composition, character design, musique.
 *
 * `role` est une **chaîne libre côté AniList**, saisie par les contributeurs — « Director »,
 * « Original Creator », mais aussi « Key Animation (ep. 12) ». Une table de traduction exhaustive
 * est donc impossible : on traduit les rôles qui reviennent partout et on laisse passer le reste
 * tel quel, plutôt que d'inventer une correspondance qui se tromperait.
 */
const ROLE_LABELS: Record<string, string> = {
  Director: "Réalisation",
  "Original Creator": "Œuvre originale",
  "Original Story": "Histoire originale",
  "Character Design": "Character design",
  "Series Composition": "Composition de la série",
  Music: "Musique",
  "Art Director": "Direction artistique",
  "Sound Director": "Direction du son",
  "Animation Director": "Direction de l'animation",
  "Chief Animation Director": "Direction générale de l'animation",
  "Story & Art": "Scénario et dessin",
  Story: "Scénario",
  Art: "Dessin",
  Producer: "Production",
  "Assistant Director": "Assistant réalisateur",
  Script: "Scénario",
};

export function MediaStaff({ media }: { media: MediaDetail }) {
  const staff = media.staff.edges;

  if (staff.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        AniList ne référence aucune équipe pour cette œuvre.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {staff.map((edge) => (
        <li
          className="flex items-center gap-3 rounded-lg border bg-card p-2"
          key={`${edge.node.id}-${edge.role}`}
        >
          <PersonAvatar
            name={edge.node.name.full}
            src={edge.node.image?.large ?? null}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">
              {edge.node.name.full ?? "—"}
            </p>
            <p className="truncate text-muted-foreground text-xs">
              {edge.role ? (ROLE_LABELS[edge.role] ?? edge.role) : null}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
