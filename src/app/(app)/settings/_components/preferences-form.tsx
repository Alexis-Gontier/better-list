"use client";

import { useOptimisticAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  Preferences,
  ScoreFormat,
  TitleLanguage,
} from "@/features/preferences/schemas/preferences.schema";
import { updatePreferences } from "@/features/preferences/server/preferences.actions";

/**
 * Les réglages du compte, un contrôle par ligne.
 *
 * **Chaque contrôle enregistre seul**, comme le panneau de suivi : pas de bouton « Enregistrer ».
 * Trois réglages ne forment pas un formulaire — ils forment trois décisions indépendantes, et un
 * bouton de validation ajouterait une étape à chacune pour rien.
 *
 * L'affichage est optimiste : le sélecteur montre le nouveau choix immédiatement, et le rendu
 * serveur — que l'action revalide en entier — s'aligne ensuite.
 */

const SCORE_FORMAT_OPTIONS: Array<{ value: ScoreFormat; label: string }> = [
  { value: "POINT_5", label: "5 étoiles" },
  { value: "POINT_10", label: "10 points" },
  { value: "POINT_100", label: "100 points" },
];

const TITLE_LANGUAGE_OPTIONS: Array<{ value: TitleLanguage; label: string }> = [
  { value: "ROMAJI", label: "Romaji (Sousou no Frieren)" },
  { value: "ENGLISH", label: "Anglais (Frieren: Beyond Journey's End)" },
  { value: "NATIVE", label: "Original (葬送のフリーレン)" },
];

function Row({
  title,
  description,
  htmlFor,
  children,
}: {
  title: string;
  description: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="space-y-0.5">
        <Label className="font-medium text-sm" htmlFor={htmlFor}>
          {title}
        </Label>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {children}
    </div>
  );
}

export function PreferencesForm({ preferences }: { preferences: Preferences }) {
  const { execute, optimisticState, isPending } = useOptimisticAction(
    updatePreferences,
    {
      currentState: preferences,
      updateFn: (state, input) => ({ ...state, ...input }),
      onError: () => toast.error("Le réglage n'a pas pu être enregistré."),
    },
  );

  return (
    <div className="divide-y rounded-lg border bg-card px-4">
      <Row
        description="L'échelle utilisée pour afficher et saisir vos notes. Elles sont stockées sur 100 dans tous les cas, donc changer d'échelle ne perd rien."
        htmlFor="score-format"
        title="Échelle de notation"
      >
        <Select
          disabled={isPending}
          onValueChange={(value) =>
            execute({ scoreFormat: value as ScoreFormat })
          }
          value={optimisticState.scoreFormat}
        >
          <SelectTrigger className="w-44" id="score-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCORE_FORMAT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      <Row
        description="AniList ne fournit pas de titre français : le choix se fait entre le romaji, l'anglais et la langue d'origine."
        htmlFor="title-language"
        title="Langue des titres"
      >
        <Select
          disabled={isPending}
          onValueChange={(value) =>
            execute({ titleLanguage: value as TitleLanguage })
          }
          value={optimisticState.titleLanguage}
        >
          <SelectTrigger className="w-72" id="title-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TITLE_LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      <Row
        description="Affiche les œuvres classées adultes dans la recherche et le catalogue. Le filtre est appliqué côté serveur, pas par un masque."
        htmlFor="include-adult"
        title="Contenu adulte"
      >
        <Switch
          checked={optimisticState.includeAdult}
          disabled={isPending}
          id="include-adult"
          onCheckedChange={(includeAdult) => execute({ includeAdult })}
        />
      </Row>
    </div>
  );
}
