"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LOCALE, TIMEZONE } from "@/config/locale";
import { routes } from "@/config/routes";
import { BanDialog } from "@/features/admin/components/ban-dialog";
import { ProviderIcons } from "@/features/admin/components/provider-icons";
import {
  setMemberRole,
  unbanMember,
} from "@/features/admin/server/admin.actions";
import type { AdminMember } from "@/features/admin/server/admin.queries";
import { isAdmin } from "@/lib/auth/roles";

const MONTH_YEAR = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: TIMEZONE,
});
const DAY_MONTH = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: TIMEZONE,
});

function banSummary(member: AdminMember) {
  const until = member.banExpires
    ? `jusqu'au ${DAY_MONTH.format(member.banExpires)}`
    : "définitif";
  return member.banReason ? `« ${member.banReason} » · ${until}` : until;
}

/**
 * Les membres, ou les bannis (`mode`). Les actions sont dans un menu par ligne ; **aucune sur sa
 * propre ligne** : on ne se bannit pas et on ne se retire pas son rôle.
 */
export function MembersTable({
  members,
  selfId,
  mode,
}: {
  members: AdminMember[];
  selfId: string;
  mode: "members" | "banned";
}) {
  const [banning, setBanning] = useState<AdminMember | null>(null);
  const onError = ({ error }: { error: { serverError?: string } }) =>
    toast.error(error.serverError ?? "L'action a échoué.");
  const role = useAction(setMemberRole, {
    onSuccess: () => toast.success("Rôle mis à jour."),
    onError,
  });
  const unban = useAction(unbanMember, {
    onSuccess: () => toast.success("Membre réintégré."),
    onError,
  });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membre</TableHead>
            <TableHead>Connexion via</TableHead>
            <TableHead>{mode === "members" ? "Rôle" : "Banni"}</TableHead>
            {mode === "members" ? <TableHead>Membre depuis</TableHead> : null}
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const self = member.id === selfId;
            const admin = isAdmin(member);

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <UserAvatar
                      className="size-8"
                      image={member.image}
                      name={member.name}
                    />
                    <span className="flex flex-col">
                      <span className="font-medium">
                        {member.name}
                        {self ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            (vous)
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        @{member.username}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <ProviderIcons providers={member.providers} />
                </TableCell>
                <TableCell>
                  {mode === "banned" ? (
                    <span className="text-muted-foreground">
                      {banSummary(member)}
                    </span>
                  ) : admin ? (
                    <Badge variant="secondary">Admin</Badge>
                  ) : (
                    <span className="text-muted-foreground">Membre</span>
                  )}
                </TableCell>
                {mode === "members" ? (
                  <TableCell className="text-muted-foreground capitalize">
                    {MONTH_YEAR.format(member.createdAt)}
                  </TableCell>
                ) : null}
                <TableCell>
                  {self ? null : mode === "banned" ? (
                    <Button
                      disabled={unban.isPending}
                      onClick={() => unban.execute({ userId: member.id })}
                      size="sm"
                      variant="outline"
                    >
                      Réintégrer
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`Actions pour ${member.name}`}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={routes.profile(member.username)}>
                            Voir le profil
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            role.execute({
                              userId: member.id,
                              role: admin ? "user" : "admin",
                            })
                          }
                        >
                          {admin
                            ? "Retirer le rôle d'administrateur"
                            : "Nommer administrateur"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setBanning(member)}
                          variant="destructive"
                        >
                          Bannir…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {banning ? (
        <BanDialog
          member={banning}
          onOpenChange={(open) => {
            if (!open) setBanning(null);
          }}
          open
        />
      ) : null}
    </>
  );
}
