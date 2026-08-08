import { PersonAvatar } from "@/app/(app)/media/[id]/_components/person-avatar";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

/**
 * Personnages, avec la voix japonaise quand AniList la connaît.
 *
 * Disposition en miroir : le personnage à gauche, son interprète à droite, adossés dos à dos dans
 * la même carte. C'est la convention du domaine (AniList, MAL), et elle dit la relation sans avoir
 * à écrire « interprété par ».
 *
 * La requête borne déjà la liste à douze entrées triées par rôle : la fiche n'a pas à afficher un
 * casting complet, et chaque personnage supplémentaire est payé sur le quota AniList.
 */
const ROLE_LABELS: Record<string, string> = {
  MAIN: "Principal",
  SUPPORTING: "Secondaire",
  BACKGROUND: "Second plan",
};

export function MediaCharacters({ media }: { media: MediaDetail }) {
  const characters = media.characters.edges;

  if (characters.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        AniList ne référence aucun personnage pour cette œuvre.
      </p>
    );
  }

  return (
    /*
      Deux colonnes au maximum, jamais trois. La carte est coupée en deux — le personnage à
      gauche, son interprète à droite —, donc chaque moitié n'a que la moitié de la largeur. À
      trois colonnes, il restait 60 px de texte par moitié et tous les noms se terminaient en
      points de suspension.
    */
    <ul className="grid gap-3 lg:grid-cols-2">
      {characters.map((edge) => {
        const voiceActor = edge.voiceActors[0];

        return (
          <li
            className="flex items-stretch justify-between gap-2 overflow-hidden rounded-lg border bg-card"
            key={edge.node.id}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 p-2">
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
            </div>

            {voiceActor ? (
              <div className="flex min-w-0 flex-1 items-center justify-end gap-3 p-2 text-right">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">
                    {voiceActor.name.full ?? "—"}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    Voix japonaise
                  </p>
                </div>
                <PersonAvatar
                  name={voiceActor.name.full}
                  src={voiceActor.image?.large ?? null}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
