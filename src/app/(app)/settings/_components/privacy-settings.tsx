"use client";

import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { toast } from "sonner";

import { SettingRow } from "@/app/(app)/settings/_components/setting-row";
import { Switch } from "@/components/ui/switch";
import type { ProfilePrivacy } from "@/features/preferences/schemas/preferences.schema";
import { updatePreferences } from "@/features/preferences/server/preferences.actions";

type SectionKey = Exclude<keyof ProfilePrivacy, "profileVisible" | "showAdult">;

const SECTIONS: { key: SectionKey; title: string; description: string }[] = [
  {
    key: "showJournal",
    title: "Journal",
    description: "Chaque progression, note et changement de statut.",
  },
  {
    key: "showStats",
    title: "Statistiques",
    description:
      "Les chiffres du haut, la répartition, les notes et les genres.",
  },
  {
    key: "showActivityCalendar",
    title: "Calendrier d'activité",
    description: "Une case par jour sur douze mois.",
  },
  {
    key: "showFavorites",
    title: "Favoris",
    description: "Œuvres, personnages et membres du staff.",
  },
];

/**
 * Ce que les autres membres voient de mon profil (D64), enregistré réglage par réglage (D44). Les
 * sections sont grisées quand le profil est caché : elles gardent leur valeur pour le jour où on le
 * rouvre, mais ne décident plus de rien.
 */
export function PrivacySettings({ privacy }: { privacy: ProfilePrivacy }) {
  const [values, setValues] = useState(privacy);
  const id = useId();

  const { execute } = useAction(updatePreferences, {
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? "Le réglage n'a pas été enregistré. Réessayez.",
      );
      // Retour à l'état du serveur : c'est la seule valeur qui fasse foi.
      setValues(privacy);
    },
  });

  const save = (key: keyof ProfilePrivacy, next: boolean) => {
    setValues((current) => ({ ...current, [key]: next }));
    execute({ [key]: next });
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingRow
        description={
          values.profileVisible
            ? "Les autres membres voient les sections cochées ci-dessous."
            : "Les autres ne voient que votre avatar, votre pseudo et vos listes « Membres »."
        }
        htmlFor={`${id}-profile`}
        title="Profil visible des membres"
      >
        <Switch
          checked={values.profileVisible}
          id={`${id}-profile`}
          onCheckedChange={(next) => save("profileVisible", next)}
        />
      </SettingRow>

      <div className="flex flex-col gap-5 border-l pl-4">
        <p className="font-medium text-muted-foreground text-sm">
          Ce que le profil montre
        </p>
        {SECTIONS.map((section) => (
          <SettingRow
            description={section.description}
            htmlFor={`${id}-${section.key}`}
            key={section.key}
            title={section.title}
          >
            <Switch
              checked={values[section.key]}
              disabled={!values.profileVisible}
              id={`${id}-${section.key}`}
              onCheckedChange={(next) => save(section.key, next)}
            />
          </SettingRow>
        ))}
      </div>

      <SettingRow
        description="Montrées seulement aux membres qui ont activé le contenu adulte. Désactivé, elles sont cachées partout sur votre profil, compteurs compris."
        htmlFor={`${id}-adult`}
        title="Œuvres 18+"
      >
        <Switch
          checked={values.showAdult}
          id={`${id}-adult`}
          onCheckedChange={(next) => save("showAdult", next)}
        />
      </SettingRow>

      <p className="text-pretty text-muted-foreground text-sm">
        Pour cacher une seule œuvre, marquez-la « privée » dans sa fenêtre
        d'édition : elle disparaît partout, compteurs compris.
      </p>
    </div>
  );
}
