"use client";

import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  Preferences,
  TitleLanguage,
} from "@/features/preferences/schemas/preferences.schema";
import { updatePreferences } from "@/features/preferences/server/preferences.actions";

/**
 * Les deux réglages d'affichage — **la seule feuille interactive de l'écran.**
 *
 * `"use client"` est posé ici et nulle part au-dessus : la page, ses sections et le bloc « Compte »
 * restent des composants serveur. C'est la règle de frontière d'CLAUDE.md, appliquée à la
 * lettre — un `"use client"` sur la page emporterait la lecture de session dans le bundle.
 *
 * **Chaque contrôle enregistre seul, et sans bouton.** Il n'y a pas de formulaire à valider : deux
 * réglages indépendants, dont chacun est un geste complet. Un bouton « Enregistrer » ajouterait une
 * étape à un écran qu'on ouvre pour changer une chose, et créerait l'état « modifié mais pas
 * enregistré » — celui qu'on perd en fermant l'onglet.
 *
 * **L'état bouge avant la réponse du serveur**, comme la grille réordonnable de `/lists/[id]` : un
 * interrupteur qui attendrait l'aller-retour resterait visiblement dans son ancienne position le
 * temps de la requête, ce qui se lit comme un clic manqué. En échange, l'échec doit se voir — d'où
 * le retour à la valeur du serveur et le toast dans `onError`.
 */

/**
 * Le vocabulaire du sélecteur, valeur et libellé côté à côté.
 *
 * `ROMAJI` est en tête parce que c'est le défaut du schéma et de la base — un sélecteur dont le
 * premier cran n'est pas la valeur par défaut se lit comme un classement, pas comme un choix.
 * « Original » plutôt que « Natif » : `NATIVE` désigne l'écriture d'origine (japonaise, coréenne,
 * chinoise), et « natif » ne dit ça à personne en français.
 */
const TITLE_LANGUAGE_OPTIONS: ReadonlyArray<{
  value: TitleLanguage;
  label: string;
}> = [
  { value: "ROMAJI", label: "Romaji" },
  { value: "ENGLISH", label: "Anglais" },
  { value: "NATIVE", label: "Original" },
];

/**
 * Le cran actif s'affiche **en inversé**, et non dans l'accent par défaut du composant.
 *
 * C'est la mesure faite le 2 septembre pour les puces de `/search` : sur le thème sombre, le
 * `bg-accent` de l'état actif est indiscernable du fond au premier coup d'œil. Il faut un
 * renversement de valeur, pas une nuance.
 *
 * La classe est recopiée plutôt que partagée avec `search-filter-panel.tsx`, et c'est délibéré :
 * là-bas une puce se déselectionne (le filtre redevient « peu importe »), ici le choix est
 * obligatoire — il y a toujours une langue. Deux widgets qui se ressemblent et ne se comportent
 * pas pareil ; les fondre demanderait de choisir laquelle des deux sémantiques l'emporte.
 */
const SEGMENT_CLASSNAME =
  "data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90 data-[state=on]:hover:text-background";

export function DisplaySettings({
  preferences,
}: {
  /**
   * Les valeurs du compte, lues côté serveur.
   *
   * Elles sèment l'état local **et servent de point de retour** quand une écriture échoue : on ne
   * devine pas la valeur corrigée, on revient à celle qui faisait foi au dernier rendu.
   */
  preferences: Preferences;
}) {
  const [titleLanguage, setTitleLanguage] = useState<TitleLanguage>(
    preferences.titleLanguage,
  );
  const [includeAdult, setIncludeAdult] = useState(preferences.includeAdult);

  const { execute } = useAction(updatePreferences, {
    onError: ({ error, input }) => {
      toast.error(
        error.serverError ?? "Le réglage n'a pas été enregistré. Réessayez.",
      );
      /*
        Les **deux** contrôles reviennent à la valeur du serveur, et pas seulement celui qui a
        échoué : celui qu'on n'a pas touché y est déjà, donc le remettre ne coûte rien, là où
        démêler lequel des deux était en cause demanderait de lire l'entrée pour s'en servir.
      */
      setTitleLanguage(preferences.titleLanguage);
      setIncludeAdult(preferences.includeAdult);
      console.error("[updatePreferences]", input);
    },
  });

  /*
    Aucun toast de succès, et c'est un choix : le nouvel état du contrôle **est** la confirmation.
    Une notification à chaque bascule ferait trois bandeaux pour trois clics sur un écran qu'on
    ouvre justement pour en enchaîner quelques-uns. C'est la règle de la grille réordonnable, qui ne
    parle que lorsque ça rate.
  */
  const saveTitleLanguage = (next: TitleLanguage) => {
    setTitleLanguage(next);
    execute({ titleLanguage: next });
  };

  const saveIncludeAdult = (next: boolean) => {
    setIncludeAdult(next);
    execute({ includeAdult: next });
  };

  /*
    `useId` plutôt qu'une chaîne écrite à la main : deux instances du composant sur une même page
    partageraient l'identifiant, et cliquer un libellé activerait le contrôle de l'autre.
  */
  const titleLanguageLabelId = useId();
  const includeAdultId = useId();

  return (
    <div className="flex flex-col gap-6">
      <SettingRow
        description="Sous quel nom une œuvre apparaît partout : catalogue, bibliothèque, listes."
        labelId={titleLanguageLabelId}
        title="Langue des titres"
      >
        <ToggleGroup
          aria-labelledby={titleLanguageLabelId}
          /*
            Le `onValueChange` de Radix envoie une chaîne vide quand on reclique le cran actif. On
            l'ignore : cet écran n'a pas d'état « aucune langue », et laisser passer la chaîne vide
            viderait le groupe d'un clic distrait — et enverrait une écriture pour rien.
          */
          onValueChange={(next) => {
            if (next) saveTitleLanguage(next as TitleLanguage);
          }}
          type="single"
          value={titleLanguage}
          variant="outline"
        >
          {TITLE_LANGUAGE_OPTIONS.map((option) => (
            <ToggleGroupItem
              className={SEGMENT_CLASSNAME}
              key={option.value}
              size="sm"
              value={option.value}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingRow>

      <SettingRow
        description="Les œuvres 18+ dans la recherche, la bibliothèque et les listes. Le filtre s'applique à la requête, pas à l'affichage."
        htmlFor={includeAdultId}
        title="Contenu adulte"
      >
        <Switch
          checked={includeAdult}
          id={includeAdultId}
          onCheckedChange={saveIncludeAdult}
        />
      </SettingRow>
    </div>
  );
}

/**
 * Une ligne de réglage : à gauche ce qu'on règle, à droite le contrôle.
 *
 * **Empilée sur téléphone, en ligne à partir de `sm`.** Côte à côte sous 640 px, le groupe à trois
 * crans écraserait l'explication en une colonne de trois lignes — le même arbitrage que la tête de
 * `/lists`.
 *
 * `labelId` ou `htmlFor`, jamais les deux : un `Switch` est un vrai contrôle, qu'un `<label for>`
 * active au clic ; un `ToggleGroup` est un groupe de boutons, qui se décrit par `aria-labelledby`
 * et n'a rien à activer.
 */
function SettingRow({
  title,
  description,
  htmlFor,
  labelId,
  children,
}: {
  title: string;
  description: string;
  htmlFor?: string;
  labelId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-1">
        <Label className="font-medium text-sm" htmlFor={htmlFor} id={labelId}>
          {title}
        </Label>
        <p className="text-pretty text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      {/* `shrink-0` : une explication longue ne doit pas comprimer le contrôle qu'elle décrit. */}
      <div className="shrink-0">{children}</div>
    </div>
  );
}
