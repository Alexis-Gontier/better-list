"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BAN_DURATION_LABELS,
  BAN_DURATIONS,
  type BanDuration,
} from "@/features/admin/lib/ban-duration";
import { banMember } from "@/features/admin/server/admin.actions";

/**
 * Bannir un membre : une durée, un motif facultatif. **Rien n'est supprimé** ; ses sessions sont
 * coupées par Better Auth et ses listes quittent la communauté tant que dure le bannissement.
 */
export function BanDialog({
  member,
  open,
  onOpenChange,
}: {
  member: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [duration, setDuration] = useState<BanDuration>("forever");
  const [reason, setReason] = useState("");
  const { execute, isPending } = useAction(banMember, {
    onSuccess: () => {
      toast.success(`${member.name} est banni.`);
      onOpenChange(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Le bannissement a échoué."),
  });

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bannir {member.name} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Ses sessions sont coupées et il ne peut plus se connecter. Ses
            listes disparaissent de la communauté ; rien n'est supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Durée</Label>
            <ToggleGroup
              onValueChange={(value) => {
                if (value) setDuration(value as BanDuration);
              }}
              type="single"
              value={duration}
              variant="outline"
            >
              {BAN_DURATIONS.map((value) => (
                <ToggleGroupItem key={value} value={value}>
                  {BAN_DURATION_LABELS[value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motif-bannissement">Motif</Label>
            <Textarea
              id="motif-bannissement"
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Visible des seuls administrateurs"
              value={reason}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              // La fenêtre ne se ferme qu'au succès : une erreur doit rester lisible.
              event.preventDefault();
              execute({ userId: member.id, duration, reason });
            }}
            variant="destructive"
          >
            Bannir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
