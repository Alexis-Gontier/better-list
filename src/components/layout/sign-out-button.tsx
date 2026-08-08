"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { signOut } from "@/lib/auth/client";

type SignOutButtonProps = {
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

/**
 * Déconnexion. `router.refresh()` après coup, sinon le rendu serveur déjà en cache continue
 * d'afficher la session qu'on vient de fermer.
 */
export function SignOutButton({
  variant = "ghost",
  className,
}: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);

    const { error } = await signOut();

    if (error) {
      toast.error("La déconnexion a échoué.");
      setIsPending(false);
      return;
    }

    router.push(routes.auth.login);
    router.refresh();
  }

  return (
    <Button
      className={className}
      disabled={isPending}
      onClick={handleSignOut}
      type="button"
      variant={variant}
    >
      <LogOutIcon aria-hidden="true" />
      Se déconnecter
    </Button>
  );
}
