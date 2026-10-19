import type { Metadata } from "next";
import { Suspense } from "react";

import {
  AccountSection,
  AccountSectionSkeleton,
} from "@/app/(app)/settings/_components/account-section";
import { DiscordSettings } from "@/app/(app)/settings/_components/discord-settings";
import { DisplaySettings } from "@/app/(app)/settings/_components/display-settings";
import { SettingsSection } from "@/app/(app)/settings/_components/settings-section";
import { PageHeading } from "@/components/shared/page-heading";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getDiscordWebhookStatus } from "@/features/notifications/server/discord.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export const metadata: Metadata = {
  title: "Paramètres",
  description: "Langue des titres, contenu adulte, notifications Discord.",
};

/**
 * Les préférences du compte (docs/conception.md §4.6).
 *
 * **Deux réglages, et c'est tout ce qu'il y a à régler.** L'échelle de notation n'en est plus un —
 * les notes sont sur cinq étoiles pour tout le monde — et la langue de l'interface non plus :
 * l'application est en français uniquement. Un sélecteur à un seul choix ne serait pas un choix.
 * Le thème et la déconnexion vivent déjà dans l'en-tête et le menu du compte ; les redire ici
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

      Ce que ça coûte est réel et assumé : un contrôle posé à droite est loin du libellé qu'il
      commande. C'est ce qui rend `SettingRow` responsable de garder la paire lisible — d'où
      l'écart généreux entre les deux réglages, qui empêche de rattacher un contrôle à la mauvaise
      ligne.
    */
    <div className="flex flex-col gap-6">
      {/*
        L'écart est porté par la colonne et non par le trait — la règle de `/search`, `/library` et
        de `/lists` : une marge posée sur un séparateur lui ferait dicter l'espacement de ses deux
        voisins.
      */}
      <div className="flex flex-col gap-4">
        <PageHeading
          description="Ce que l'application affiche, et sous quel nom. Rien ici n'est partagé avec les autres membres."
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

      <Suspense fallback={<NotificationsSectionSkeleton />}>
        <NotificationsSection />
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

function NotificationsSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/**
 * Deux lignes de réglage aux proportions de celles qui arrivent : le libellé, l'aide, le contrôle.
 *
 * Les interlignes sont ceux du rendu et non des valeurs rondes : `text-lg` pour l'intitulé de
 * section (28 px), `text-sm` pour tout le reste (20). À `h-4` partout, la section annonçait douze
 * pixels de moins qu'elle n'en prend.
 */
function DisplaySectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-6">
        {SKELETON_ROWS.map(({ key, control }) => (
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
            key={key}
          >
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-64 max-w-full" />
            </div>
            <div className="shrink-0">
              <Skeleton className={control} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Les deux réglages, **avec la forme de leur contrôle** : un groupe de bascules pour la langue des
 * titres, un interrupteur pour le 18+. Le second faisait la largeur du premier, ce qui annonçait un
 * bouton de cent soixante pixels là où il en arrive trente-six.
 */
const SKELETON_ROWS = [
  { key: "langue", control: "h-8 w-40" },
  { key: "adulte", control: "h-5 w-9" },
];
