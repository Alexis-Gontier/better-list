"use client";

import { HeartIcon, Trash2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ScoreStars } from "@/features/tracking/components/score-stars";
import {
  type EntryDraft,
  entryDraftChanges,
  entryDraftFrom,
} from "@/features/tracking/lib/entry-draft";
import {
  ENTRY_STATUS_LABELS,
  ENTRY_UNIT_LABELS,
  type EntryUnit,
  UNKNOWN_TOTAL,
} from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";
import {
  removeEntry,
  saveEntry,
} from "@/features/tracking/server/tracking.actions";
import { cn } from "@/lib/utils";

/**
 * Le suivi en formulaire : on corrige, puis on enregistre.
 *
 * **Il n'enregistre pas au geste, contrairement au panneau de la fiche**, et c'est le seul écart
 * entre les deux. La différence tient à l'endroit : le panneau est visible en permanence à côté de
 * l'œuvre, chaque contrôle y est une décision isolée. Cette fenêtre-ci, on l'ouvre exprès pour
 * remettre trois choses d'aplomb — un statut, une progression, une date — et enregistrer chacune
 * en passant produirait trois écritures et trois lignes de journal pour une seule intention.
 *
 * L'invariant, lui, ne bouge pas : **seuls les champs modifiés partent** (`entryDraftChanges`,
 * pur et testé). Un formulaire qui réécrirait ses huit champs effacerait ce qu'un autre onglet
 * vient de saisir, exactement ce que le §4.2 refuse.
 *
 * Il est monté par la fenêtre, donc **remonté à chaque ouverture** : le brouillon repart de l'état
 * que le serveur vient de rendre, sans qu'aucune synchronisation ne soit à écrire ici.
 */
export function EntryForm({
  mediaId,
  entry,
  total,
  unit,
  onSaved,
  onRemoved,
}: {
  mediaId: number;
  /** `null` quand l'œuvre n'est pas encore suivie — enregistrer la fait entrer en bibliothèque. */
  entry: EntryState | null;
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: number | null;
  unit: EntryUnit;
  onSaved?: () => void;
  onRemoved?: () => void;
}) {
  /**
   * Identifiants dérivés d'un `useId` : une grille rend une fenêtre par vignette, et des `id`
   * constants s'y dupliqueraient — un `<label for>` désignerait alors le champ d'une autre carte.
   */
  const fieldId = useId();

  const [draft, setDraft] = useState(() => entryDraftFrom(entry));
  const set = <K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = useAction(saveEntry, {
    onSuccess: () => onSaved?.(),
    onError: () => toast.error("Le suivi n'a pas pu être enregistré."),
  });

  const remove = useAction(removeEntry, {
    onSuccess: () => onRemoved?.(),
    onError: () => toast.error("Le suivi n'a pas pu être supprimé."),
  });

  const pending = save.isPending || remove.isPending;

  const submit = () => {
    const changes = entryDraftChanges(entry, draft);

    // Rien n'a bougé : on ferme sans écrire. Une action vide coûterait un aller-retour, une
    // revalidation de trois pages, et remonterait `updatedAt` — donc réordonnerait l'accueil, qui
    // trie par date de modification.
    if (Object.keys(changes).length === 0) {
      onSaved?.();
      return;
    }

    save.execute({ mediaId, ...changes });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/*
        Trois colonnes au-delà du mobile, et l'ordre de lecture y est vertical par sujet : où j'en
        suis à gauche et au centre, quand à droite. Sous 640 px la grille s'empile — la fenêtre y
        occupe toute la largeur, et trois colonnes de 90 px n'auraient tenu ni une date ni cinq
        étoiles.
      */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-statut`}>Statut</Label>
          <Select
            disabled={pending}
            onValueChange={(status) => set("status", status as EntryStatus)}
            value={draft.status}
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
          </Label>

          {/*
            Le total est **dans le champ**, à droite de la saisie : c'est là qu'on lit une fraction,
            et l'y coller évite une étiquette « sur 12 » qui aurait doublé la hauteur de la cellule.
            Inconnu, il s'écrit « / ? » — se taire laissait lire la progression comme un total.
          */}
          <InputGroup>
            <InputGroupInput
              aria-label={ENTRY_UNIT_LABELS[unit].consumed}
              className="tabular-nums"
              disabled={pending}
              id={`${fieldId}-progression`}
              inputMode="numeric"
              max={total ?? undefined}
              min={0}
              onChange={(event) => set("progress", event.target.value)}
              type="number"
              value={draft.progress}
            />
            <InputGroupAddon align="inline-end">
              <span className="tabular-nums">/ {total ?? UNKNOWN_TOTAL}</span>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-debut`}>Date de début</Label>
          <Input
            disabled={pending}
            id={`${fieldId}-debut`}
            onChange={(event) => set("startedAt", event.target.value)}
            type="date"
            value={draft.startedAt}
          />
        </div>

        <div className="space-y-1.5">
          {/*
            Pas de `htmlFor` : `ScoreStars` rend un groupe de boutons radio, qu'aucune étiquette ne
            peut désigner d'un seul `for`. Le composant porte son propre nom accessible.
          */}
          <Label>Ma note</Label>

          {/*
            Les étoiles sont posées dans la coquille d'un champ, et c'est la **même primitive** que
            le compteur d'épisodes juste à côté — pas une bordure recopiée à la main. Dans une
            grille de six champs encadrés, une rangée d'icônes nues flottait sans ligne de base :
            elle avait l'air d'un reste d'affichage plutôt que d'une chose à remplir.

            `justify-between` pousse la croix d'effacement au bord droit, là où les autres cellules
            portent leur chevron ou leur icône de calendrier.
          */}
          <InputGroup className="justify-between px-1.5">
            <ScoreStars
              disabled={pending}
              onChange={(score) => set("score", score)}
              value={draft.score}
            />
          </InputGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-relectures`}>Revisionnages</Label>
          <Input
            className="tabular-nums"
            disabled={pending}
            id={`${fieldId}-relectures`}
            inputMode="numeric"
            min={0}
            onChange={(event) => set("repeatCount", event.target.value)}
            type="number"
            value={draft.repeatCount}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-fin`}>Date de fin</Label>
          <Input
            disabled={pending}
            id={`${fieldId}-fin`}
            onChange={(event) => set("finishedAt", event.target.value)}
            type="date"
            value={draft.finishedAt}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-notes`}>Mes notes</Label>
        <Textarea
          className="min-h-24 resize-y"
          disabled={pending}
          id={`${fieldId}-notes`}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="Ce que j'en ai pensé…"
          value={draft.notes}
        />
      </div>

      {/*
        « Favori » vit avec les commandes et non dans la grille : c'est un marquage, pas une donnée
        de suivi, et lui donner une cellule l'aurait mis sur le même plan qu'une date.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-pressed={draft.favorite}
          className={cn(draft.favorite && "text-red-500")}
          disabled={pending}
          onClick={() => set("favorite", !draft.favorite)}
          type="button"
          variant={draft.favorite ? "secondary" : "outline"}
        >
          <HeartIcon className={cn(draft.favorite && "fill-red-500")} />
          Favori
        </Button>

        {/* Le retrait n'existe que sur une œuvre suivie — sinon il n'y a rien à retirer. */}
        {entry ? (
          <Button
            disabled={pending}
            onClick={() => remove.execute({ mediaId })}
            type="button"
            variant="destructive"
          >
            {remove.isPending ? <Spinner /> : <Trash2Icon />}
            Supprimer
          </Button>
        ) : null}

        {/*
          Le bouton d'enregistrement occupe la place restante et ferme la ligne : c'est la sortie
          normale de la fenêtre, et il doit rester la plus grande cible des trois.
        */}
        <Button
          className="ml-auto min-w-40 flex-1"
          disabled={pending}
          type="submit"
        >
          {save.isPending ? <Spinner /> : null}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
