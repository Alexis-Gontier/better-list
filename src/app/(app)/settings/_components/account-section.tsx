import { SettingsSection } from "@/app/(app)/settings/_components/settings-section";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth/session";

/**
 * Le bloc « Compte » — **en lecture seule, et c'est le sujet.**
 *
 * Rien n'y est éditable parce que rien n'y nous appartient : le nom, la photo et l'email viennent
 * de GitHub, et le `username` est verrouillé après l'inscription par le hook `user.update.before`
 * (`src/lib/auth/server.ts`) — il porte l'URL `/u/[username]`, la changer casserait les liens
 * partagés. Offrir un champ pour ces valeurs promettrait une écriture que l'auth refuse.
 *
 * Composant **serveur** : il lit la session, il n'écoute rien.
 */
export async function AccountSection() {
  /*
    `getSession` et non `requireApprovedUser` : la garde est déjà passée dans `(app)/layout.tsx`, et
    la redoubler ici serait la deuxième vérification que la convention interdit. `cache` de React
    déduplique l'appel avec celui du layout — cette lecture ne coûte rien.
  */
  const session = await getSession();

  // Inatteignable sous la garde du layout, mais le type est nullable et un `!` mentirait.
  if (!session) return null;

  const { name, email, username, image } = session.user;

  return (
    <SettingsSection
      description="Ce que GitHub nous dit de vous. Rien ne s'édite ici — tout vient de là-bas."
      title="Compte"
    >
      {/*
        `items-start` et non `center` : le bloc de texte fait quatre lignes, centrer l'avatar sur
        cette hauteur le poserait en face de l'email plutôt qu'en face du nom.
      */}
      <div className="flex items-start gap-4">
        <UserAvatar className="size-14 shrink-0" image={image} name={name} />

        {/*
          `min-w-0` sur la colonne, sans quoi le `truncate` de ses enfants n'a aucun effet : un
          élément flex refuse par défaut de descendre sous la largeur de son contenu, donc un email
          long pousserait la ligne au lieu de s'y couper.
        */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{name}</span>
            {/*
              Le badge dit toujours la même chose, et ce n'est pas un oubli de câblage : le layout
              du groupe `(app)` redirige `PENDING` vers la liste d'attente et `REJECTED` vers la
              connexion (docs/PRODUCT.md §7.1). Personne d'autre qu'un membre approuvé n'atteint
              cet écran — une table de correspondance à trois entrées aurait deux branches mortes.
            */}
            <Badge variant="secondary">Membre</Badge>
          </div>

          {/*
            L'arobase est décorative : elle marque l'identifiant public sans faire partie de sa
            valeur. `username` est déclaré `required: false` côté Better Auth même si la colonne
            est non nulle — on n'affiche pas une ligne vide plutôt que de forcer le type.
          */}
          {username ? (
            <span className="truncate text-muted-foreground text-sm">
              @{username}
            </span>
          ) : null}
          <span className="truncate text-muted-foreground text-sm">
            {email}
          </span>
          <span className="mt-1 text-muted-foreground text-xs">
            Connecté avec GitHub
          </span>
        </div>
      </div>
    </SettingsSection>
  );
}

/** Les proportions de ce qui arrive : le disque, le nom, et les trois lignes sous lui. */
export function AccountSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2 py-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
    </div>
  );
}
