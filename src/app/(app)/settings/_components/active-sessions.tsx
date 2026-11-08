"use client";

import { MonitorIcon, SmartphoneIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import type { ActiveSession } from "@/app/(app)/settings/_lib/active-sessions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  revokeOtherSessions,
  revokeSession,
} from "@/features/auth/server/account.actions";

const FALLBACK_ERROR = "L'opération n'a pas abouti. Réessayez.";

/**
 * Les appareils connectés, celui-ci en tête (D74). Une session dure un an : c'est d'ici qu'on
 * coupe un téléphone perdu ou un ordinateur emprunté. Le rendu suivant vient du serveur.
 */
export function ActiveSessions({ sessions }: { sessions: ActiveSession[] }) {
  const revoke = useAction(revokeSession, {
    onSuccess: () => toast.success("Appareil déconnecté."),
    onError: ({ error }) => toast.error(error.serverError ?? FALLBACK_ERROR),
  });
  const revokeOthers = useAction(revokeOtherSessions, {
    onSuccess: () => toast.success("Les autres appareils sont déconnectés."),
    onError: ({ error }) => toast.error(error.serverError ?? FALLBACK_ERROR),
  });

  const others = sessions.filter((session) => !session.current).length;
  const pending = revoke.isPending || revokeOthers.isPending;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y rounded-lg border">
        {sessions.map((session) => {
          const Icon =
            session.device.kind === "mobile" ? SmartphoneIcon : MonitorIcon;

          return (
            <li
              className="flex items-center justify-between gap-4 px-4 py-3"
              key={session.id}
            >
              <span className="flex min-w-0 items-center gap-3 text-sm">
                <Icon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {session.device.label}
                    </span>
                    {session.current ? (
                      <Badge variant="secondary">Cet appareil</Badge>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    Connecté le {session.signedInAt}
                  </span>
                </span>
              </span>
              {/* Pas de bouton sur l'appareil courant : la déconnexion est dans le menu du compte. */}
              {session.current ? null : (
                <Button
                  disabled={pending}
                  onClick={() => revoke.execute({ sessionId: session.id })}
                  size="sm"
                  variant="outline"
                >
                  Déconnecter
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others > 1 ? (
        <Button
          className="w-fit"
          disabled={pending}
          onClick={() => revokeOthers.execute()}
          variant="outline"
        >
          Déconnecter les {others} autres appareils
        </Button>
      ) : null}
    </div>
  );
}
