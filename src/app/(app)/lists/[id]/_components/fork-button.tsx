"use client";

import { CopyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { forkList } from "@/features/social/server/social.actions";

/**
 * « Copier dans mes listes » (maquette B). On reste sur la liste qu'on lisait : le toast dit que la
 * copie est privée et propose de l'ouvrir (D65).
 */
export function ForkButton({ listId }: { listId: string }) {
  const router = useRouter();

  const { execute, isPending } = useAction(forkList, {
    onSuccess: ({ data }) => {
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

  return (
    <Button
      className="max-sm:h-10"
      disabled={isPending}
      onClick={() => execute({ listId })}
      size="sm"
      variant="outline"
    >
      <CopyIcon data-icon="inline-start" />
      Copier dans mes listes
    </Button>
  );
}
