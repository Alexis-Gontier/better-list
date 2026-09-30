import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * La coquille d'un bloc du profil : un titre, la phrase qui dit ce qu'il montre, et le contenu.
 *
 * Elle existe parce que l'écran compte **six** blocs bâtis à l'identique, et que recopier la même
 * composition de `Card` six fois est exactement la manière dont un écran finit par avoir quatre
 * espacements différents.
 *
 * Elle naît dans le `_components/` de la route et n'en sortira que si un deuxième écran en veut —
 * c'est la règle de promotion d'ARCHITECTURE.md, et rien ici ne justifie de l'anticiper.
 *
 * **La description n'est pas décorative.** Un graphe muet oblige à deviner ce qu'il compte ;
 * « chaque case est une journée » ou « une barre par demi-étoile » règle la question avant qu'elle
 * ne se pose, et c'est ce qui rend l'écran lisible sans survol — donc au clavier et au doigt.
 */
export function ProfileSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description: string;
  /**
   * Le chiffre qui commente le bloc — la note moyenne au-dessus de l'histogramme, la série de
   * jours au-dessus du calendrier. Il vit là plutôt que dans l'en-tête de la page : un nombre posé
   * à côté de ce qu'il résume se comprend seul.
   */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {aside ? <CardAction>{aside}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Le chiffre d'appoint d'un bloc, mis en forme une seule fois.
 *
 * Aligné à droite et cadré sur des chiffres de chasse fixe, pour la même raison que les tuiles de
 * l'en-tête : ces nombres changent, leur boîte ne doit pas.
 */
export function ProfileSectionAside({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-heading text-xl tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
