"use client";

import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ListKindGlyph } from "@/features/lists/components/list-kind-glyph";
import {
  LIST_KIND_HINTS,
  LIST_KIND_LABELS,
} from "@/features/lists/lib/list-labels";
import {
  type ListKind,
  listKindSchema,
} from "@/features/lists/schemas/lists.schema";

/**
 * Le formulaire d'une liste — **ce qu'elle est, puis son nom**, et ce qu'elle dit d'elle.
 *
 * **Le genre vient en premier** : c'est lui qui décide de tout le reste (affichage, Top,
 * suggestions), et un nom vient plus facilement une fois qu'on sait ce qu'on fabrique. Chaque genre
 * se choisit sur un aperçu de ce qu'il produira (`ListKindGlyph`), pas sur une définition à lire.
 * Le chemin court tient en trois gestes : genre, nom, Entrée ; la description est repliée.
 *
 * Il sert à créer comme à renommer, parce que les deux posent exactement les mêmes règles :
 * `createListSchema` et `updateListSchema` partagent leurs bornes, définies une seule fois dans
 * `lists.schema.ts` précisément pour qu'un titre accepté à la création ne soit pas refusé à la
 * modification. Deux formulaires auraient fini par diverger de la même façon.
 *
 * **Il ne connaît aucune action**, et c'est ce qui lui permet d'en servir deux : l'appelant tient
 * son `useAction` et passe `onSubmit`, `pending` et `fieldErrors`. Le composant ne fait que
 * recueillir deux chaînes.
 *
 * Il a démarré dans le `_components/` de `/lists` et **a été promu ici le 6 septembre 2026**, quand
 * la barre d'actions de `/lists/[id]` en a eu besoin pour renommer : deuxième route, donc
 * `features/lists/components/`, la maison d'un composant qui connaît une entité métier et sert
 * plusieurs écrans (CLAUDE.md).
 *
 * **Le partage n'y figure pas**, et `lists.schema.ts` dit pourquoi : publier une liste et la
 * renommer n'ont ni la même portée ni le même défaire. Les mêler ferait d'« Enregistrer » un bouton
 * dont on ne mesure plus les conséquences.
 */

export type ListFormValues = {
  title: string;
  description: string;
  kind: ListKind;
  /** Des chiffres seuls tant qu'on tape : l'appelant le convertit avec `parseCutoff`. */
  cutoff: string;
};

/** Vide devient `null`. Le champ ne laisse passer que des chiffres, donc jamais de `NaN` ici. */
export function parseCutoff(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

type ListFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** L'intitulé de la fenêtre — « Nouvelle liste » ou « Modifier la liste ». */
  heading: string;
  /** Ce que fait le bouton d'envoi : « Créer et remplir », « Enregistrer ». */
  submitLabel: string;
  /**
   * Les valeurs de départ. **Relues à chaque ouverture**, jamais une seule fois au montage : sans
   * ça, annuler une modification puis rouvrir la fenêtre montrerait le texte qu'on venait
   * d'abandonner, et l'enverrait au geste suivant.
   */
  initialValues?: ListFormValues;
  pending: boolean;
  /** Ce que le serveur a refusé, par champ. `defaultValidationErrorsShape: "flattened"`. */
  fieldErrors?: {
    title?: string[];
    description?: string[];
    cutoff?: string[];
  };
  onSubmit: (values: ListFormValues) => void;
};

const EMPTY: ListFormValues = {
  title: "",
  description: "",
  kind: "SELECTION",
  cutoff: "",
};

/** Un exemple de nom qui suit le genre choisi : il souffle un nom pertinent plutôt qu'un modèle. */
const TITLE_PLACEHOLDERS: Record<ListKind, string> = {
  SELECTION: "À faire découvrir, Mes classiques…",
  RANKING: "Top 10 anime",
  WATCHLIST: "À voir cet hiver",
  WAIT_FOR_END: "À lire quand c'est fini",
};

/** Le Top proposé en passant au classement : c'est celui qu'on écrit le plus souvent. */
const DEFAULT_CUTOFF = "10";

export function ListFormDialog({
  open,
  onOpenChange,
  heading,
  submitLabel,
  initialValues,
  pending,
  fieldErrors,
  onSubmit,
}: ListFormDialogProps) {
  const [values, setValues] = useState<ListFormValues>(initialValues ?? EMPTY);
  const [describing, setDescribing] = useState(false);

  /*
    Les valeurs de départ sont relues **à l'ouverture seulement**. L'appelant reconstruit l'objet à
    chaque rendu ; en dépendre effacerait la saisie au moindre rafraîchissement de la page pendant
    qu'on tape. La remise à zéro se fait à l'ouverture et pas à la fermeture : la fenêtre reste
    montée le temps de son animation de sortie, et on la verrait se vider.
  */
  const initialRef = useRef(initialValues);
  initialRef.current = initialValues;
  useEffect(() => {
    if (!open) return;
    const start = initialRef.current ?? EMPTY;
    setValues(start);
    setDescribing(start.description !== "");
  }, [open]);

  const set = (patch: Partial<ListFormValues>) =>
    setValues((current) => ({ ...current, ...patch }));

  const chooseKind = (kind: ListKind) =>
    set({
      kind,
      // Un Top est proposé en passant au classement, jamais imposé : on peut le vider.
      ...(kind === "RANKING" && values.cutoff === ""
        ? { cutoff: DEFAULT_CUTOFF }
        : {}),
    });

  const titleError = fieldErrors?.title?.[0];
  const descriptionError = fieldErrors?.description?.[0];
  const cutoffError = fieldErrors?.cutoff?.[0];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {/*
        Corps qui défile, pied qui reste : en 390 le formulaire dépasse l'écran, et le bouton
        d'envoi ne doit jamais se trouver sous la ligne de flottaison.
      */}
      <DialogContent className="flex max-h-[min(92svh,46rem)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription className="sr-only">
            Choisissez le genre de la liste, puis donnez-lui un nom.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
            <fieldset className="flex flex-col">
              <legend className="mb-3 font-medium text-sm">
                Quel genre de liste ?
              </legend>
              <RadioGroup
                className="grid grid-cols-2 gap-2"
                onValueChange={(kind) => chooseKind(listKindSchema.parse(kind))}
                value={values.kind}
              >
                {listKindSchema.options.map((kind) => (
                  <Label
                    className="relative flex cursor-pointer flex-col items-start gap-2 rounded-md border p-3 font-normal text-muted-foreground transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:text-foreground"
                    htmlFor={`list-kind-${kind}`}
                    key={kind}
                  >
                    {/* La pastille reste pour le clavier et le lecteur d'écran, dans le coin. */}
                    <RadioGroupItem
                      className="absolute top-3 right-3"
                      id={`list-kind-${kind}`}
                      value={kind}
                    />
                    <ListKindGlyph kind={kind} />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {LIST_KIND_LABELS[kind]}
                      </span>
                      {/* En 390, le glyphe et le nom suffisent : la phrase allongerait la grille. */}
                      <span className="hidden text-xs sm:block">
                        {LIST_KIND_HINTS[kind]}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor="list-title">Nom</Label>
              <Input
                /*
                  **Pas de `required` ni de `maxLength` posés ici.** Les bornes vivent dans le schéma
                  Zod, qui est ce que le serveur applique réellement.
                */
                aria-describedby={titleError ? "list-title-error" : undefined}
                aria-invalid={titleError ? true : undefined}
                autoFocus
                id="list-title"
                onChange={(event) => set({ title: event.target.value })}
                placeholder={TITLE_PLACEHOLDERS[values.kind]}
                value={values.title}
              />
              {titleError ? (
                <p className="text-destructive text-sm" id="list-title-error">
                  {titleError}
                </p>
              ) : null}
            </div>

            {/*
              La ligne de coupe ne se montre que pour un classement, mais sa valeur reste dans
              l'état : changer de genre puis revenir retrouve son Top.
            */}
            {values.kind === "RANKING" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Label htmlFor="list-cutoff">Top</Label>
                  <Input
                    aria-describedby={
                      cutoffError ? "list-cutoff-error" : "list-cutoff-hint"
                    }
                    aria-invalid={cutoffError ? true : undefined}
                    className="w-20 tabular-nums"
                    id="list-cutoff"
                    inputMode="numeric"
                    // Des chiffres seuls : une lettre ne passe pas, donc aucune erreur à expliquer.
                    onChange={(event) =>
                      set({ cutoff: event.target.value.replace(/\D/g, "") })
                    }
                    placeholder="10"
                    value={values.cutoff}
                  />
                  <p
                    className="text-muted-foreground text-xs"
                    id="list-cutoff-hint"
                  >
                    Au-delà, les prétendants. Vide : pas de coupe.
                  </p>
                </div>
                {cutoffError ? (
                  <p
                    className="text-destructive text-sm"
                    id="list-cutoff-error"
                  >
                    Un Top va de 1 à 100.
                  </p>
                ) : null}
              </div>
            ) : null}

            {describing ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="list-description">Description</Label>
                <Textarea
                  aria-describedby={
                    descriptionError ? "list-description-error" : undefined
                  }
                  aria-invalid={descriptionError ? true : undefined}
                  id="list-description"
                  onChange={(event) => set({ description: event.target.value })}
                  placeholder="D'où vient cette liste, à qui elle s'adresse…"
                  rows={3}
                  value={values.description}
                />
                {descriptionError ? (
                  <p
                    className="text-destructive text-sm"
                    id="list-description-error"
                  >
                    {descriptionError}
                  </p>
                ) : null}
              </div>
            ) : (
              <Button
                className="-ml-2 w-fit text-muted-foreground"
                onClick={() => setDescribing(true)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <PlusIcon data-icon="inline-start" />
                Ajouter une description
              </Button>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            {/*
              `type="button"` explicite : dans un `<form>`, un bouton sans type est un bouton
              d'envoi, et « Annuler » enverrait le formulaire qu'il est censé abandonner.
            */}
            <Button
              disabled={pending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? <Spinner /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
