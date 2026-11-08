import { Suspense } from "react";

import { LinkedAccounts } from "@/app/(app)/settings/_components/linked-accounts";
import {
  SettingsSection,
  SettingsSectionSkeleton,
} from "@/app/(app)/settings/_components/settings-section";
import { getLinkedProviders } from "@/app/(app)/settings/_lib/linked-providers";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ENABLED_PROVIDERS } from "@/lib/auth/providers";
import { isAdmin } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

/**
 * Le bloc « Compte » — **en lecture seule, et c'est le sujet.**
 *
 * Rien n'y est éditable parce que rien n'y nous appartient : le nom, la photo et l'email viennent
 * du fournisseur, et le `username` est verrouillé après l'inscription par le hook `user.update.before`
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
  const providers = await getLinkedProviders(session.user.id);

  return (
    <SettingsSection
      description="Ce que vos fournisseurs nous disent de vous, et ceux par lesquels vous pouvez entrer."
      title="Compte"
    >
      <div className="flex flex-col gap-6">
        {/*
        `items-start` et non `center` : le bloc de texte fait trois lignes, centrer l'avatar sur
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
              Membre ou administrateur, rien d'autre : le layout de `(app)` écarte déjà les
              comptes en attente et refusés (docs/conception.md §7.1).
            */}
              <Badge variant="secondary">
                {isAdmin(session.user) ? "Admin" : "Membre"}
              </Badge>
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
          </div>
        </div>
        {/* `Suspense` : `useSearchParams` lit l'erreur de liaison renvoyée dans l'URL. */}
        <Suspense fallback={<LinkedAccountsSkeleton />}>
          <LinkedAccounts linked={providers} providers={ENABLED_PROVIDERS} />
        </Suspense>
      </div>
    </SettingsSection>
  );
}

/** Les proportions de ce qui arrive : le disque, le nom, les deux lignes sous lui, puis les fournisseurs. */
export function AccountSectionSkeleton() {
  return (
    <SettingsSectionSkeleton titleClassName="w-24">
      <div className="flex flex-col gap-6">
        {/* Serrées en `gap-0.5` comme dans le bloc rendu : le nom (24), l'identifiant et l'adresse (20). */}
        <div className="flex items-start gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex flex-col gap-0.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-52" />
          </div>
        </div>
        <LinkedAccountsSkeleton />
      </div>
    </SettingsSectionSkeleton>
  );
}

/** Un cadre de lignes de 65 px : deux lignes de texte (40), le remplissage (24) et le filet. */
function LinkedAccountsSkeleton() {
  return (
    <div className="flex flex-col divide-y rounded-lg border">
      {ENABLED_PROVIDERS.map((provider) => (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3"
          key={provider}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-5 rounded-full" />
            <div className="flex flex-col gap-0">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
