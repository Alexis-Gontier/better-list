"use client";

import { useEffect, useState } from "react";

/**
 * Le visiteur pointe-t-il avec une souris, ou avec un doigt ?
 *
 * Sert à n'armer un menu contextuel que là où le clic droit existe. Sur un écran tactile, Radix
 * ouvre son menu sur un **appui long**, et c'est exactement le geste que le `TouchSensor` de dnd-kit
 * réserve au glisser (200 ms) : les deux se disputeraient le doigt, et le menu s'ouvrirait par-dessus
 * une carte déjà saisie. Un clic droit ne se dispute rien.
 *
 * **Faux au premier rendu, puis corrigé après montage**, comme [`useReducedMotion`](./use-reduced-motion.ts) :
 * le serveur ne connaît pas le matériel du visiteur, et deviner produirait un désaccord
 * d'hydratation. Le pire cas est un clic droit dans les millisecondes qui suivent le montage, qui
 * ouvre le menu du navigateur — pas une régression, c'est ce qui se passait avant ce menu.
 */
export function useFinePointer() {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    /*
      `any-pointer` et non `pointer` : `pointer` décrit le dispositif **principal**, donc un portable
      tactile dont on se sert à la souris répondrait « grossier » et perdrait le menu. La question
      posée ici est « existe-t-il un pointeur fin ? », pas « lequel est le principal ? ».
    */
    const query = window.matchMedia("(any-pointer: fine)");

    setFine(query.matches);

    // On écoute : brancher une souris sur une tablette ne recharge pas la page.
    const onChange = (event: MediaQueryListEvent) => setFine(event.matches);
    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  return fine;
}
