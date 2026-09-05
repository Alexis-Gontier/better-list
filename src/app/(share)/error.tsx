"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * La page d'erreur des écrans ouverts **sans compte**.
 *
 * Elle existe parce que l'`error.tsx` racine s'adresse à quelqu'un de connecté : « réessayer suffit
 * le plus souvent », sur un écran nu, à un visiteur qui vient d'ouvrir un lien qu'on lui a envoyé
 * et qui ne sait même pas ce qu'est ce site. Sans cette frontière, une panne sur `/l/<jeton>`
 * remontait jusqu'à la racine et lui rendait la page d'erreur de l'application, en dehors du chrome
 * de partage — deux publics, une seule réponse.
 *
 * Elle est **posée sur le groupe et non sur la route** : `(share)/error.tsx` s'insère sous
 * `(share)/layout.tsx`, donc l'en-tête du partage reste à l'écran et la page continue de dire d'où
 * elle vient. Un `error.tsx` dans `l/[token]/` aurait le même effet aujourd'hui, mais ne couvrirait
 * pas la deuxième page publique le jour où il y en a une.
 *
 * **Aucun lien vers l'application, pour la raison du layout** : tout ce qu'elle contient est
 * derrière la garde, et l'inscription passe par une liste d'attente. Proposer une porte ici serait
 * proposer une porte fermée.
 *
 * Le message ne distingue pas la panne du jeton invalide, et c'est délibéré : un lien révoqué
 * atteint `notFound()`, pas cette frontière. Ce qui arrive ici est une vraie erreur serveur, et
 * elle n'a rien à dire de plus au visiteur — la référence, elle, sert à la personne qui a partagé
 * la liste et à qui il la transmettra.
 */
export default function ShareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Cette liste n'a pas pu s'afficher</EmptyTitle>
        <EmptyDescription>
          Le lien est peut-être valide et le problème passager — réessayer
          suffit le plus souvent. Si l'écran reste vide, demandez un nouveau
          lien à la personne qui vous a partagé cette liste.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={reset}>Réessayer</Button>
        {error.digest ? (
          <p className="font-mono text-muted-foreground text-xs">
            Réf. {error.digest}
          </p>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}
