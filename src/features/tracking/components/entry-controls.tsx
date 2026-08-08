"use client";

import { HeartIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useAction, useOptimisticAction } from "next-safe-action/hooks";
import { useState } from "react";
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
import type { ScoreFormat } from "@/features/preferences/schemas/preferences.schema";
import { ScoreInput } from "@/features/tracking/components/score-input";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_UNIT_LABELS,
} from "@/features/tracking/lib/entry-format";
import {
  type EntryState,
  INITIAL_ENTRY,
} from "@/features/tracking/lib/entry-transition";
import type {
  EntryStatus,
  SaveEntryInput,
} from "@/features/tracking/schemas/tracking.schema";
import {
  removeEntry,
  saveEntry,
} from "@/features/tracking/server/tracking.actions";
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

/**
 * `Date` → valeur d'un `<input type="date">`.
 *
 * En UTC, et pas avec les accesseurs locaux : ce composant est rendu une première fois sur le
 * serveur, dont le fuseau n'est pas celui du visiteur. `getFullYear()` produirait deux valeurs
 * différentes de part et d'autre et casserait l'hydratation. Les dates saisies sont d'ailleurs
 * stockées à midi UTC exprès, pour qu'aucun fuseau ne fasse basculer le jour.
 */
function toInputDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function EntryControls({
  mediaId,
  entry,
  total,
  unit,
  scoreFormat,
}: {
  mediaId: number;
  /** `null` tant que l'œuvre n'est pas suivie. */
  entry: EntryState | null;
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: number | null;
  unit: "episode" | "chapitre";
  /** L'échelle d'affichage du compte. Le stockage, lui, reste sur 0–100 (docs/PRODUCT.md §4.2). */
  scoreFormat: ScoreFormat;
}) {
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

  const remove = useAction(removeEntry, {
    onError: () => toast.error("Le suivi n'a pas pu être supprimé."),
  });

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
        <Label htmlFor="entry-status">Statut</Label>
        <Select
          disabled={isPending}
          onValueChange={(status) => update({ status: status as EntryStatus })}
          value={state.status}
        >
          <SelectTrigger className="w-full" id="entry-status">
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
        <Label htmlFor="entry-progress">
          {unit === "episode" ? "Épisode" : "Chapitre"}
          {total !== null ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              sur {total}
            </span>
          ) : null}
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
            id="entry-progress"
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
        <ScoreInput
          disabled={isPending}
          format={scoreFormat}
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
          <Label htmlFor="entry-started">Date de début</Label>
          <Input
            defaultValue={toInputDate(state.startedAt)}
            disabled={isPending}
            id="entry-started"
            key={`debut-${toInputDate(state.startedAt)}`}
            onChange={(event) =>
              update({ startedAt: event.target.value || null })
            }
            type="date"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entry-finished">Date de fin</Label>
          <Input
            defaultValue={toInputDate(state.finishedAt)}
            disabled={isPending}
            id="entry-finished"
            key={`fin-${toInputDate(state.finishedAt)}`}
            onChange={(event) =>
              update({ finishedAt: event.target.value || null })
            }
            type="date"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entry-repeat">Revisionnages</Label>
          <Input
            className="tabular-nums"
            defaultValue={state.repeatCount}
            disabled={isPending}
            id="entry-repeat"
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

      <Button
        className="w-full text-muted-foreground"
        disabled={remove.isPending}
        onClick={() => remove.execute({ mediaId })}
        size="sm"
        variant="ghost"
      >
        <Trash2Icon />
        Retirer de ma liste
      </Button>
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
  const [draft, setDraft] = useState(notes ?? "");
  const dirty = draft !== (notes ?? "");

  return (
    <div className="space-y-1.5">
      <Label htmlFor="entry-notes">Mes notes</Label>
      <Textarea
        className="min-h-20 resize-y"
        disabled={disabled}
        id="entry-notes"
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
