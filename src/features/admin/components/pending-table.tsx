"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProviderIcons } from "@/features/admin/components/provider-icons";
import { setUsersStatus } from "@/features/admin/server/admin.actions";
import type { AdminMember } from "@/features/admin/server/admin.queries";
import { formatSince } from "@/features/tracking/lib/entry-format";

type Decision = "APPROVED" | "REJECTED";

/**
 * Les demandes en attente. Approuver est le geste attendu, donc **le seul accent** de l'écran, sur
 * la sélection ; chaque décision s'annule depuis le toast (retour à `PENDING`).
 */
export function PendingTable({ requests }: { requests: AdminMember[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const { execute, isPending } = useAction(setUsersStatus, {
    onSuccess: ({ input }) => {
      if (input.status === "PENDING") return;

      const names = requests
        .filter((request) => input.userIds.includes(request.id))
        .map((request) => request.name);
      const who = names.length === 1 ? names[0] : `${names.length} comptes`;
      const verdict =
        input.status === "APPROVED"
          ? `${who} ${names.length === 1 ? "est maintenant membre" : "sont maintenant membres"}.`
          : `Demande de ${who} refusée.`;

      setSelected([]);
      toast(verdict, {
        action: {
          label: "Annuler",
          onClick: () => execute({ userIds: input.userIds, status: "PENDING" }),
        },
      });
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "La décision n'a pas été enregistrée."),
  });

  function decide(userIds: string[], status: Decision) {
    execute({ userIds, status });
  }

  const now = new Date();
  const allChecked = selected.length === requests.length;

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card px-4 py-2.5">
          <span className="text-sm">
            {selected.length} demande{selected.length > 1 ? "s" : ""}{" "}
            sélectionnée{selected.length > 1 ? "s" : ""}
          </span>
          <span className="flex gap-2">
            <Button
              disabled={isPending}
              onClick={() => decide(selected, "REJECTED")}
              size="sm"
              variant="ghost"
            >
              Refuser
            </Button>
            <Button
              disabled={isPending}
              onClick={() => decide(selected, "APPROVED")}
              size="sm"
            >
              Approuver la sélection
            </Button>
          </span>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Tout sélectionner"
                checked={allChecked}
                onCheckedChange={(checked) =>
                  setSelected(checked ? requests.map((r) => r.id) : [])
                }
              />
            </TableHead>
            <TableHead>Demandeur</TableHead>
            <TableHead>Connexion via</TableHead>
            <TableHead>Demandé</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Décision</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow
              data-state={
                selected.includes(request.id) ? "selected" : undefined
              }
              key={request.id}
            >
              <TableCell>
                <Checkbox
                  aria-label={`Sélectionner ${request.name}`}
                  checked={selected.includes(request.id)}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked
                        ? [...current, request.id]
                        : current.filter((id) => id !== request.id),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-3">
                  <UserAvatar
                    className="size-8"
                    image={request.image}
                    name={request.name}
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">{request.name}</span>
                    <span className="text-muted-foreground text-sm">
                      @{request.username}
                    </span>
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <ProviderIcons providers={request.providers} withLabel />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatSince(request.createdAt, now)}
              </TableCell>
              <TableCell>
                <span className="flex justify-end gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() => decide([request.id], "REJECTED")}
                    size="sm"
                    variant="ghost"
                  >
                    Refuser
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={() => decide([request.id], "APPROVED")}
                    size="sm"
                    variant="outline"
                  >
                    Approuver
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
