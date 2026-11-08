import type { Metadata } from "next";
import { Suspense } from "react";

import {
  AccountSection,
  AccountSectionSkeleton,
} from "@/app/(app)/settings/_components/account-section";
import { DeleteAccount } from "@/app/(app)/settings/_components/delete-account";
import { DiscordSettings } from "@/app/(app)/settings/_components/discord-settings";
import { DisplaySettings } from "@/app/(app)/settings/_components/display-settings";
import { PrivacySettings } from "@/app/(app)/settings/_components/privacy-settings";
import {
  SettingsSection,
  SettingsSectionSkeleton,
} from "@/app/(app)/settings/_components/settings-section";
import { PageHeading } from "@/components/shared/page-heading";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getDiscordWebhookStatus } from "@/features/notifications/server/discord.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Paramètres",
  description:
    "Langue des titres, contenu adulte, confidentialité, notifications Discord, comptes liés.",
};

/**
 * Les préférences du compte (docs/conception.md §4.6).
 *
 * Cinq rubriques, chacune sur la grille à deux colonnes de `SettingsSection` (D73). L'échelle de
 * notation n'est pas un réglage — cinq étoiles pour tout le monde —, la langue de l'interface non
 * plus : l'application est en français uniquement. Le thème et la déconnexion vivent déjà dans l'en-tête et le menu du compte ; les redire ici
 * donnerait deux endroits pour le même geste.
 *
 * **La page ne fait aucun `await`.** Le titre et le trait sont statiques et doivent s'afficher
 * pendant que la session et la base répondent — une frontière par zone, jamais de `loading.tsx` de
 * segment. C'est la règle qu'appliquent déjà `/lists` et `/library`.
 */
export default function SettingsPage() {
  return (
    /*
      **Aucune largeur propre : celle du `main` du layout**, qui plafonne à `max-w-6xl` pour tous
      les écrans. Une colonne de lecture serrée a été essayée à 672 px et écartée — un écran qui
      s'arrête à mi-chemin quand les six autres vont au bout se lit comme un écran inachevé, et la
      cohérence de la coquille pèse plus que le trajet de l'œil jusqu'à l'interrupteur.

      Sur cette largeur, un contrôle posé tout à droite partait loin de son libellé : la grille de
      `SettingsSection` range les réglages dans les deux tiers droits, l'intitulé à gauche (D73).
      `gap-8` : à deux colonnes, une rubrique est un bloc plus haut qu'il faut détacher davantage.
    */
    <div className="flex flex-col gap-8">
      {/*
        L'écart est porté par la colonne et non par le trait — la règle de `/search`, `/library` et
        de `/lists` : une marge posée sur un séparateur lui ferait dicter l'espacement de ses deux
        voisins.
      */}
      <div className="flex flex-col gap-4">
        <PageHeading
          description="Votre compte, ce que l'application affiche, ce que les autres membres voient de vous."
          title="Paramètres"
        />
        <Separator />
      </div>

      <Suspense fallback={<AccountSectionSkeleton />}>
        <AccountSection />
      </Suspense>

      <Separator />

      <Suspense fallback={<DisplaySectionSkeleton />}>
        <DisplaySection />
      </Suspense>

      <Separator />

      <Suspense fallback={<PrivacySectionSkeleton />}>
        <PrivacySection />
      </Suspense>

      <Separator />

      <Suspense fallback={<NotificationsSectionSkeleton />}>
        <NotificationsSection />
      </Suspense>

      <Separator />

      <Suspense fallback={<DeleteAccountSectionSkeleton />}>
        <DeleteAccountSection />
      </Suspense>
    </div>
  );
}

/**
 * La lecture des préférences, isolée derrière sa propre frontière.
 *
 * Elle est ici plutôt que dans `_components/` parce qu'elle n'est que le raccord entre une requête
 * et une feuille cliente : la sortir en fichier donnerait un composant sans autre contenu que son
 * `await`. Même arbitrage que `ListsGrid` dans `/lists`.
 */
async function DisplaySection() {
  const preferences = await getPreferences();

  return (
    <SettingsSection
      description="Deux réglages, appliqués partout où une œuvre s'affiche."
      title="Affichage"
    >
      <DisplaySettings preferences={preferences} />
    </SettingsSection>
  );
}

/**
 * Le webhook Discord : même raccord qu'au-dessus, derrière sa propre frontière — la lecture est une
 * autre table, elle n'a pas à attendre les préférences ni à les faire attendre.
 */
async function NotificationsSection() {
  const status = await getDiscordWebhookStatus();

  return (
    <SettingsSection
      description="Les épisodes des animes que vous suivez, postés dans un salon Discord à vous — une fois par heure au plus."
      title="Notifications Discord"
    >
      <DiscordSettings status={status} />
    </SettingsSection>
  );
}

/** Ce que les autres membres voient de mon profil (D64) : mes propres réglages, lus comme ceux d'un autre. */
async function PrivacySection() {
  const preferences = await getPreferences();

  return (
    <SettingsSection
      description="Ce que les autres membres voient de vous. Vous, vous voyez toujours tout. Rien n'est jamais public."
      title="Confidentialité"
    >
      <PrivacySettings privacy={preferences} />
    </SettingsSection>
  );
}

/**
 * La structure de `PrivacySettings` : le profil visible, le bloc indenté de ses quatre sections
 * sous son intitulé, le 18+ et la note finale.
 */
function PrivacySectionSkeleton() {
  return (
    <SettingsSectionSkeleton titleClassName="w-40">
      <div className="flex flex-col gap-6">
        <SettingRowSkeleton control="h-5 w-9" />
        <div className="flex flex-col gap-5 border-l pl-4">
          <Skeleton className="h-5 w-44" />
          {["journal", "stats", "calendrier", "favoris"].map((key) => (
            <SettingRowSkeleton control="h-5 w-9" key={key} />
          ))}
        </div>
        <SettingRowSkeleton control="h-5 w-9" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    </SettingsSectionSkeleton>
  );
}

/** Une ligne de réglage : le libellé, l'aide, et le contrôle avec sa forme réelle. */
function SettingRowSkeleton({ control }: { control: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>
      <div className="shrink-0">
        <Skeleton className={control} />
      </div>
    </div>
  );
}

/** La sortie du cercle, en dernier : elle lit l'identifiant à recopier pour confirmer. */
async function DeleteAccountSection() {
  const session = await getSession();
  if (!session?.user.username) return null;

  return (
    <SettingsSection
      description="Quitter le cercle. On ne peut pas revenir en arrière."
      title="Supprimer mon compte"
      tone="danger"
    >
      <DeleteAccount username={session.user.username} />
    </SettingsSection>
  );
}

/** Le cadre rouge : sa phrase sur une ligne et le bouton (36), plus le remplissage de 16. */
function DeleteAccountSectionSkeleton() {
  return (
    <SettingsSectionSkeleton titleClassName="w-56">
      <Skeleton className="h-17.5 w-full rounded-lg" />
    </SettingsSectionSkeleton>
  );
}

/** Le statut du webhook, ou le champ et son bouton. */
function NotificationsSectionSkeleton() {
  return (
    <SettingsSectionSkeleton titleClassName="w-52">
      <Skeleton className="h-9 w-full" />
    </SettingsSectionSkeleton>
  );
}

/**
 * Les deux réglages, **avec la forme de leur contrôle** : un groupe de bascules pour la langue des
 * titres, un interrupteur pour le 18+. Le second faisait la largeur du premier, ce qui annonçait un
 * bouton de cent soixante pixels là où il en arrive trente-six.
 */
function DisplaySectionSkeleton() {
  return (
    <SettingsSectionSkeleton titleClassName="w-28">
      <div className="flex flex-col gap-6">
        <SettingRowSkeleton control="h-8 w-40" />
        <SettingRowSkeleton control="h-5 w-9" />
      </div>
    </SettingsSectionSkeleton>
  );
}
