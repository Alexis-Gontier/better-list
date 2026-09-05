import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Profil",
  description: "Le suivi et le journal d'un membre.",
  // Le profil reste hors index, comme avant la mise à blanc : le cercle est privé, et `robots.ts`
  // ferme déjà tout le site. Les deux gardes se doublent volontairement.
  robots: { index: false, follow: false },
};

/**
 * Le profil d'un membre — vidé par la mise à blanc totale du 5 septembre 2026.
 *
 * Son `_lib/profile-params.ts` est épargné : il porte le contrat d'URL de la pagination du journal,
 * une décision et non un rendu — même traitement que `calendar/_lib/calendar-params.ts`.
 *
 * Le titre redevient statique : il nommait le membre via `getProfile`, supprimé avec la feature
 * `profile` dont il était le seul consommateur.
 */
export default function ProfilePage() {
  return (
    <RouteUnderConstruction
      description="Le suivi et le journal d'un membre."
      title="Profil"
    />
  );
}
