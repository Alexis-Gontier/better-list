"use client";

import { CopyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { routes } from "@/config/routes";
import { forkList } from "@/features/social/server/social.actions";

type ForkMode = "copy" | "version";

/**
 * « Copier dans mes listes » (maquette B). On reste sur la liste qu'on lisait : le toast dit que la
 * copie est privée et propose de l'ouvrir (D65).
 *
 * Sur une tier list, le bouton ouvre d'abord un choix (lot 5, maquette C) : **faire ma version**,
 * le geste qu'on vient chercher sur la tier list d'un autre et donc le défaut, ou copier avec son
 * classement.
 */
export function ForkButton({
  listId,
  tierList,
}: {
  listId: string;
  /** `null` hors tier list : la copie part au clic, sans question. */
  tierList: { title: string; itemCount: number; ownerName: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ForkMode>("version");

  const { execute, isPending } = useAction(forkList, {
    onSuccess: ({ data }) => {
      setOpen(false);
      if (data?.status !== "ok") {
        toast.error("Cette liste n'est plus disponible.");
        return;
      }
      toast.success("Copiée dans vos listes, en privé.", {
        action: {
          label: "Ouvrir",
          onClick: () => router.push(routes.lists.detail(data.id)),
        },
      });
      router.refresh();
    },
    onError: () => toast.error("La copie n'a pas abouti. Réessayez."),
  });

  const trigger = (
    <Button
      className="max-sm:h-10"
      disabled={isPending}
      onClick={() =>
        tierList ? setOpen(true) : execute({ listId, mode: "copy" })
      }
      size="sm"
      variant="outline"
    >
      <CopyIcon data-icon="inline-start" />
      Copier dans mes listes
    </Button>
  );

  if (!tierList) return trigger;

  const choices: { value: ForkMode; label: string; hint: string }[] = [
    {
      value: "version",
      label: "Faire ma version",
      hint: `${sameWorks(tierList.itemCount)} et les mêmes paliers, à classer vous-même. ${tierList.ownerName} verra votre version à côté de la sienne.`,
    },
    {
      value: "copy",
      label: "Copier avec son classement",
      hint: "Une copie exacte, que vous pourrez retoucher.",
    },
  ];
  const chosen = choices.find((c) => c.value === mode) ?? choices[0];

  return (
    <>
      {trigger}
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copier « {tierList.title} »</DialogTitle>
            <DialogDescription>
              Elle arrive dans vos listes, en privé.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            className="gap-2"
            onValueChange={(value) => setMode(value as ForkMode)}
            value={mode}
          >
            {choices.map((choice) => (
              <Label
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary"
                htmlFor={`fork-${choice.value}`}
                key={choice.value}
              >
                <RadioGroupItem
                  className="mt-0.5"
                  id={`fork-${choice.value}`}
                  value={choice.value}
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium text-sm">{choice.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {choice.hint}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Annuler</Button>
            </DialogClose>
            <Button
              disabled={isPending}
              onClick={() => execute({ listId, mode })}
            >
              {chosen?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function sameWorks(count: number): string {
  return count === 1 ? "La même œuvre" : `Les mêmes ${count} œuvres`;
}
