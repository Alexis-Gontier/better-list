"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { routes } from "@/config/routes";
import { signOut as endSession } from "@/lib/auth/client";

/**
 * Fermer la session, puis renvoyer à la connexion.
 *
 * **La logique est ici parce qu'elle a maintenant deux affordances**, et qu'aucune ne peut
 * emprunter celle de l'autre : la liste d'attente veut un `Button`, le menu du compte veut un
 * `DropdownMenuItem`. Glisser le premier dans le second par `asChild` fusionne les classes des
 * deux et ne donne plus la géométrie d'aucun — le même piège de composition que celui rencontré
 * sur `ToggleGroup` (docs/JOURNAL.md, 11 août). Chacun rend donc sa forme, et seule la logique se
 * partage.
 *
 * `router.refresh()` après la redirection : sans lui, le rendu serveur déjà en cache continue
 * d'afficher la session qu'on vient de fermer.
 */
export function useSignOut() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);

    const { error } = await endSession();

    if (error) {
      toast.error("La déconnexion a échoué.");
      setIsPending(false);
      return;
    }

    // Pas de `setIsPending(false)` sur le chemin nominal : on quitte la page, et rendre le contrôle
    // à nouveau cliquable le temps de la navigation inviterait un second appel pour rien.
    router.push(routes.auth.login);
    router.refresh();
  }

  return { signOut, isPending };
}
