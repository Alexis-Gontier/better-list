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
  TitleLanguage,
} from "@/features/preferences/schemas/preferences.schema";
import { updatePreferences } from "@/features/preferences/server/preferences.actions";

/**
 * Les réglages du compte, un contrôle par ligne.
 *
 * **Chaque contrôle enregistre seul**, comme le panneau de suivi : pas de bouton « Enregistrer ».
 * Deux réglages ne forment pas un formulaire — ils forment deux décisions indépendantes, et un
 * bouton de validation ajouterait une étape à chacune pour rien.
 *
 * L'affichage est optimiste : le sélecteur montre le nouveau choix immédiatement, et le rendu
 * serveur — que l'action revalide en entier — s'aligne ensuite.
 */

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
      {/*
        Pas de réglage d'échelle : les notes sont sur cinq étoiles, demies comprises, pour tout le
        monde (docs/PRODUCT.md §4.2). Le stockage reste sur cent, donc les notes importées d'AniList
        gardent leur précision — mais ça ne se règle pas, ça se subit sans y penser.
      */}
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
