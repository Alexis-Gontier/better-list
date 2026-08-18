"use client";

import { HeartIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useOptimisticAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RemoveEntryDialog } from "@/features/tracking/components/remove-entry-dialog";
import { ScoreStars } from "@/features/tracking/components/score-stars";
import { toDateInputValue } from "@/features/tracking/lib/entry-draft";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_UNIT_LABELS,
  UNKNOWN_TOTAL,
} from "@/features/tracking/lib/entry-format";
import {
  type EntryState,
  INITIAL_ENTRY,
} from "@/features/tracking/lib/entry-transition";
import type {
  EntryStatus,
  SaveEntryInput,
} from "@/features/tracking/schemas/tracking.schema";
import { saveEntry } from "@/features/tracking/server/tracking.actions";
import { cn } from "@/lib/utils";

/**
 * Le panneau de suivi, côté interactif.
 *
 * Chaque contrôle envoie **uniquement ce qu'il modifie** : `saveEntry` accepte une entrée partielle
 * et la transition serveur en déduit le reste. Envoyer l'état complet à chaque clic ferait qu'un
 * onglet ouvert depuis dix minutes réécraserait, en cochant « favori », une progression saisie
 * ailleurs entre-temps.
 *
 * L'affichage est optimiste : cliquer « +1 » doit répondre au doigt, pas à l'aller-retour réseau.
 * Le serveur reste juge — quand il termine la série toute seule au dernier épisode, le rendu
 * revient sur son verdict.
 */
/** Champs que la projection optimiste ne recopie pas — voir `updateFn`. */
const IGNORED_IN_OPTIMISTIC = new Set(["mediaId", "startedAt", "finishedAt"]);

export function EntryControls({
  mediaId,
  title,
  entry,
  total,
  unit,
}: {
  mediaId: number;
  /**
   * Le titre déjà résolu dans la langue du compte, pour la confirmation de suppression — le seul
   * endroit du panneau qui ait besoin de nommer l'œuvre. Partout ailleurs, le `h1` de la fiche est
   * à quelques centimètres ; un dialogue modal, lui, recouvre la page qui le portait.
   */
  title: string;
  /** `null` tant que l'œuvre n'est pas suivie. */
  entry: EntryState | null;
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: number | null;
  unit: "episode" | "chapitre";
}) {
  /**
   * Les identifiants sont dérivés d'un `useId` et non écrits en dur : ces contrôles se rendent
   * désormais dans la fenêtre d'une vignette, et une grille en compte vingt-quatre. Des `id`
   * constants s'y dupliqueraient, et un `<label for>` désignerait alors le champ d'une autre carte.
   */
  const fieldId = useId();

  const { execute, optimisticState, isPending } = useOptimisticAction(
    saveEntry,
    {
      currentState: entry,
      /**
       * La projection locale est volontairement naïve : elle applique le champ modifié et rien
       * d'autre. Les déductions (fin de série, date de début, compteur de relectures) sont le
       * travail du serveur, et son résultat remplace celui-ci.
       *
       * Les deux dates sont **exclues** : elles voyagent en chaînes `AAAA-MM-JJ` alors que l'état
       * les porte en `Date`, et les recopier telles quelles mettrait une chaîne là où le rendu
       * attend un objet. Leurs champs sont non contrôlés, donc l'affichage garde de toute façon
       * ce qui vient d'être saisi pendant l'aller-retour.
       */
      updateFn: (state, input) => ({
        ...(state ?? INITIAL_ENTRY),
        ...Object.fromEntries(
          Object.entries(input).filter(
            ([key, value]) =>
              !IGNORED_IN_OPTIMISTIC.has(key) && value !== undefined,
          ),
        ),
      }),
      onError: () => toast.error("Le suivi n'a pas pu être enregistré."),
    },
  );

  const update = (changes: Omit<SaveEntryInput, "mediaId">) =>
    execute({ mediaId, ...changes });

  if (!optimisticState) {
    return (
      <div className="space-y-2">
        <Button
          className="w-full"
          disabled={isPending}
          onClick={() => update({ status: "CURRENT" })}
        >
          Commencer
        </Button>
        <Button
          className="w-full"
          disabled={isPending}
          onClick={() => update({ status: "PLANNING" })}
          variant="outline"
        >
          Je le prévois
        </Button>
      </div>
    );
  }

  const state = optimisticState;
  const atEnd = total !== null && state.progress >= total;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-statut`}>Statut</Label>
        <Select
          disabled={isPending}
          onValueChange={(status) => update({ status: status as EntryStatus })}
          value={state.status}
        >
          <SelectTrigger className="w-full" id={`${fieldId}-statut`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ENTRY_STATUS_LABELS).map(([status, label]) => (
              <SelectItem key={status} value={status}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-progression`}>
          {unit === "episode" ? "Épisode" : "Chapitre"}
          {/*
            Le dénominateur s'affiche même inconnu : « sur ? » dit qu'il en reste, là où l'absence
            de mention laissait croire à une série sans fin annoncée.
          */}
          <span className="font-normal text-muted-foreground">
            {" "}
            sur {total ?? UNKNOWN_TOTAL}
          </span>
        </Label>

        <div className="flex items-center gap-1.5">
          <Button
            aria-label={`Reculer d'un ${ENTRY_UNIT_LABELS[unit].singular}`}
            className="shrink-0"
            disabled={isPending || state.progress <= 0}
            onClick={() => update({ progress: state.progress - 1 })}
            size="icon"
            variant="outline"
          >
            <MinusIcon />
          </Button>

          <Input
            aria-label={ENTRY_UNIT_LABELS[unit].consumed}
            className="text-center tabular-nums"
            disabled={isPending}
            id={`${fieldId}-progression`}
            inputMode="numeric"
            max={total ?? undefined}
            min={0}
            /**
             * `onBlur` et pas `onChange` : à chaque frappe, « 12 » passerait par « 1 », et le
             * journal enregistrerait un recul suivi d'une avance. Un `PROGRESS` doit correspondre
             * à une intention, pas à une touche.
             */
            onBlur={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (Number.isNaN(parsed) || parsed === state.progress) return;
              update({ progress: Math.max(parsed, 0) });
            }}
            key={state.progress}
            defaultValue={state.progress}
            type="number"
          />

          <Button
            aria-label={`Avancer d'un ${ENTRY_UNIT_LABELS[unit].singular}`}
            className="shrink-0"
            disabled={isPending || atEnd}
            onClick={() => update({ progress: state.progress + 1 })}
            size="icon"
            variant="outline"
          >
            <PlusIcon />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Ma note</Label>
        <ScoreStars
          disabled={isPending}
          onChange={(score) => update({ score })}
          value={state.score}
        />
      </div>

      <Button
        aria-pressed={state.favorite}
        className="w-full"
        disabled={isPending}
        onClick={() => update({ favorite: !state.favorite })}
        size="sm"
        variant={state.favorite ? "secondary" : "outline"}
      >
        <HeartIcon
          className={cn(state.favorite && "fill-red-500 text-red-500")}
        />
        Favori
      </Button>

      {/*
        Dates et relectures : posées automatiquement par la transition, mais modifiables ici.
        C'est ce qui permet d'entrer une œuvre vue en 2019 sans qu'elle soit datée d'aujourd'hui.
        Champs **non contrôlés**, remontés par `key` quand le serveur renvoie autre chose que ce
        qui a été saisi — un champ contrôlé effacerait la frappe en cours à chaque aller-retour.
      */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-debut`}>Date de début</Label>
          <Input
            defaultValue={toDateInputValue(state.startedAt)}
            disabled={isPending}
            id={`${fieldId}-debut`}
            key={`debut-${toDateInputValue(state.startedAt)}`}
            onChange={(event) =>
              update({ startedAt: event.target.value || null })
            }
            type="date"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-fin`}>Date de fin</Label>
          <Input
            defaultValue={toDateInputValue(state.finishedAt)}
            disabled={isPending}
            id={`${fieldId}-fin`}
            key={`fin-${toDateInputValue(state.finishedAt)}`}
            onChange={(event) =>
              update({ finishedAt: event.target.value || null })
            }
            type="date"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-relectures`}>Revisionnages</Label>
          <Input
            className="tabular-nums"
            defaultValue={state.repeatCount}
            disabled={isPending}
            id={`${fieldId}-relectures`}
            inputMode="numeric"
            key={`relectures-${state.repeatCount}`}
            min={0}
            // `onBlur`, pour la même raison que la progression : une frappe n'est pas une intention.
            onBlur={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (Number.isNaN(parsed) || parsed === state.repeatCount) return;
              update({ repeatCount: Math.max(parsed, 0) });
            }}
            type="number"
          />
        </div>
      </div>

      <EntryNotes
        disabled={isPending}
        notes={state.notes}
        onSave={(notes) => update({ notes })}
      />

      <Separator />

      {/*
        « Supprimer le suivi », et non plus « Retirer de ma liste ».
        L'ancien libellé était devenu faux le jour où `/lists` a existé : il se lisait comme le
        retrait d'une œuvre d'une `List`, geste sans conséquence qui se refait d'un clic, alors
        qu'il détruit ici l'entrée **et son journal**. La fenêtre d'une vignette porte désormais le
        même mot pour la même chose.
      */}
      <RemoveEntryDialog
        className="w-full"
        mediaId={mediaId}
        title={title}
        variant="ghost"
      />
    </div>
  );
}

/**
 * Les notes personnelles ne s'enregistrent pas à la frappe.
 *
 * Chaque sauvegarde ajoute une ligne au journal (`EntryEvent` de type `NOTE`, append-only) : un
 * enregistrement automatique en produirait une par mot tapé, et le journal — qui porte la timeline
 * et le récap annuel — deviendrait illisible.
 */
function EntryNotes({
  notes,
  onSave,
  disabled,
}: {
  notes: string | null;
  onSave: (notes: string | null) => void;
  disabled?: boolean;
}) {
  const fieldId = useId();
  const [draft, setDraft] = useState(notes ?? "");
  const dirty = draft !== (notes ?? "");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>Mes notes</Label>
      <Textarea
        className="min-h-20 resize-y"
        disabled={disabled}
        id={fieldId}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Ce que j'en ai pensé…"
        value={draft}
      />
      {dirty ? (
        <Button
          disabled={disabled}
          onClick={() => onSave(draft.trim() || null)}
          size="sm"
          variant="secondary"
        >
          Enregistrer la note
        </Button>
      ) : null}
    </div>
  );
}
