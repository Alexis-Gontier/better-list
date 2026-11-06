"use client";

import { CheckIcon, EllipsisIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  MAX_TIERS,
  TIER_PALETTE,
  type Tier,
  type TierOp,
} from "@/features/lists/lib/tier-list";
import { updateTiers } from "@/features/lists/server/lists.actions";
import { cn } from "@/lib/utils";

/**
 * Le menu d'un palier (maquette B) : nom, couleur, place, vider, supprimer.
 *
 * **Un `Popover` et pas un `DropdownMenu`** : un menu Radix capte les touches pour sa recherche
 * par frappe, et le champ « Nom » ne recevrait pas ses lettres. Chaque entrée part aussitôt (D37) ;
 * la page se resynchronise au retour du serveur. Supprimer n'a pas de confirmation : les œuvres du
 * palier retournent dans la réserve, rien n'est perdu.
 */
export function TierMenu({
  listId,
  tier,
  index,
  tierCount,
}: {
  listId: string;
  tier: Tier;
  index: number;
  tierCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(tier.label);

  const { execute, isPending } = useAction(updateTiers, {
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "La modification n'a pas abouti. Réessayez.",
      ),
  });

  const run = (op: TierOp, close = true) => {
    execute({ listId, op });
    if (close) setOpen(false);
  };

  const rename = () => {
    const next = label.trim();
    if (next === "" || next === tier.label) return setLabel(tier.label);
    run({ type: "rename", index, label: next }, false);
  };

  const entry = (
    text: string,
    op: TierOp,
    { disabled = false, destructive = false } = {},
  ) => (
    <button
      className={cn(
        "rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        destructive && "text-destructive",
      )}
      disabled={disabled || isPending}
      onClick={() => run(op)}
      type="button"
    >
      {text}
    </button>
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Menu du palier ${tier.label}`}
          className="h-auto w-10 shrink-0 self-stretch rounded-none text-muted-foreground"
          size="icon"
          variant="ghost"
        >
          <EllipsisIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-64 flex-col gap-1 p-2">
        <label
          className="flex flex-col gap-1.5 px-1 pt-1"
          htmlFor={`tier-${index}-nom`}
        >
          <span className="text-muted-foreground text-xs">Nom</span>
          <Input
            id={`tier-${index}-nom`}
            maxLength={12}
            onBlur={rename}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") rename();
            }}
            value={label}
          />
        </label>

        <fieldset className="flex flex-col gap-1.5 px-1 pt-2">
          <legend className="pb-1.5 text-muted-foreground text-xs">
            Couleur
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {TIER_PALETTE.map((color) => (
              <button
                aria-label={`Couleur ${color}`}
                aria-pressed={tier.color === color}
                className="flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-popover focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-foreground"
                disabled={isPending}
                key={color}
                onClick={() => run({ type: "recolor", index, color }, false)}
                style={{ backgroundColor: color }}
                type="button"
              >
                {tier.color === color ? (
                  <CheckIcon className="size-3.5 text-black" />
                ) : null}
              </button>
            ))}
          </div>
        </fieldset>

        <Separator className="my-1" />
        {entry(
          "Monter",
          { type: "move", index, direction: "up" },
          { disabled: index === 0 },
        )}
        {entry(
          "Descendre",
          { type: "move", index, direction: "down" },
          { disabled: index === tierCount - 1 },
        )}
        {entry(
          "Ajouter un palier au-dessus",
          { type: "insert", index, where: "above" },
          { disabled: tierCount >= MAX_TIERS },
        )}
        {entry(
          "Ajouter un palier en dessous",
          { type: "insert", index, where: "below" },
          { disabled: tierCount >= MAX_TIERS },
        )}
        <Separator className="my-1" />
        {entry("Vider le palier", { type: "clear", index })}
        {entry(
          "Supprimer le palier",
          { type: "delete", index },
          { disabled: tierCount === 1, destructive: true },
        )}
      </PopoverContent>
    </Popover>
  );
}
