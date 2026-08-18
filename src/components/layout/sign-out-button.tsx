"use client";

import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSignOut } from "@/hooks/use-sign-out";

type SignOutButtonProps = {
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

/**
 * Déconnexion, en bouton — la forme qu'attend la page de liste d'attente, seule page où l'on n'a
 * pas d'en-tête pour porter le menu du compte.
 *
 * La logique vit dans `useSignOut` : le menu du compte s'en sert aussi, sous une autre forme.
 */
export function SignOutButton({
  variant = "ghost",
  className,
}: SignOutButtonProps) {
  const { signOut, isPending } = useSignOut();

  return (
    <Button
      className={className}
      disabled={isPending}
      onClick={signOut}
      type="button"
      variant={variant}
    >
      {isPending ? <Spinner /> : <LogOutIcon aria-hidden="true" />}
      Se déconnecter
    </Button>
  );
}
