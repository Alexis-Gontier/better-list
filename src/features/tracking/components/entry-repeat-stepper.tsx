"use client";

import { StepButton } from "@/components/shared/step-button";
import { ButtonGroup } from "@/components/ui/button-group";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { MAX_REPEAT_COUNT } from "@/features/tracking/schemas/tracking.schema";

/**
 * Combien de fois j'ai relu — un champ de saisie encadré de deux crans.
 *
 * **Il remplace un champ nu, à la demande d'Alexis le 19 septembre 2026.** Le champ nu était
 * justifié ici même par l'argument « on ne relit pas une série assez souvent pour avoir besoin
 * d'un +1 » ; l'argument était vrai sur la fréquence et faux sur la forme. Dans une grille où la
 * progression juste à côté porte ses deux crans, un champ seul se lit comme un contrôle d'une
 * autre nature — alors que les deux comptent la même chose, un entier qu'on ajuste.
 *
 * **Ce n'est pas `EntryProgressStepper`**, et le rapprochement s'arrête à la silhouette : celui-là
 * porte une unité — épisode ou chapitre —, un total connu, et l'addon « / 24 » qui va avec.
 * Ici il n'y a ni unité ni fin : on relit autant de fois qu'on veut. Les faire dériver d'un même
 * composant demanderait de rendre optionnel tout ce qui fait l'un des deux. Ce qu'ils partagent
 * réellement — le bouton d'un cran et son cadre — est déjà extrait dans
 * `components/shared/step-button.tsx`, dont la docstring annonçait ce troisième appelant.
 *
 * **La valeur est une chaîne, comme dans `EntryDraft`** : un champ vidé pour être retapé n'a pas
 * d'équivalent numérique, et le convertir à chaque touche obligerait à choisir une valeur pour
 * l'intermédiaire — valeur qui finirait enregistrée.
 *
 * Le compteur monte de toute façon **tout seul** quand une relecture se termine
 * (`entry-transition.ts`). Ce contrôle sert à rattraper un historique, pas à compter au fil de
 * l'eau : c'est pourquoi il n'y a pas de « +1 » ailleurs dans le produit pour les relectures.
 */
export function EntryRepeatStepper({
  value,
  onValueChange,
  className,
}: {
  /** Le nombre de relectures, tel qu'un `<input>` le porte. Chaîne vide = saisie en cours. */
  value: string;
  onValueChange: (value: string) => void;
  /** Même raison que sur le pas de progression : une colonne de grille veut `w-full`. */
  className?: string;
}) {
  const parsed = Number.parseInt(value, 10);
  const current = Number.isNaN(parsed) ? 0 : parsed;

  const step = (by: number) =>
    onValueChange(
      String(Math.min(Math.max(current + by, 0), MAX_REPEAT_COUNT)),
    );

  return (
    <ButtonGroup className={className}>
      <StepButton
        direction="decrement"
        disabled={current <= 0}
        label="Une relecture de moins"
        onClick={() => step(-1)}
      />

      <InputGroup className="w-32 flex-1">
        <InputGroupInput
          aria-label="Nombre de relectures"
          // Sans ça, un gestionnaire de mots de passe propose ses suggestions sur un champ qui ne
          // contient qu'un compteur.
          autoComplete="off"
          /*
            Centré, là où la progression est alignée à droite : celle-ci colle son nombre à
            l'addon « / 24 » qui le suit, et ce champ-ci n'a rien à sa droite. Aligné à droite, le
            chiffre irait se plaquer contre le bouton « + ».
          */
          className="text-center font-mono tabular-nums"
          inputMode="numeric"
          onChange={(event) =>
            // Filtré aux chiffres plutôt que `type="number"`, qui impose ses propres flèches en
            // doublon des nôtres et accepte « 1e5 » comme une saisie valide.
            onValueChange(event.target.value.replace(/\D/g, ""))
          }
          value={value}
        />
      </InputGroup>

      <StepButton
        direction="increment"
        disabled={current >= MAX_REPEAT_COUNT}
        label="Une relecture de plus"
        onClick={() => step(1)}
      />
    </ButtonGroup>
  );
}
