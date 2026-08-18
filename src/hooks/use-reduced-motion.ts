"use client";

import { useEffect, useState } from "react";

/**
 * `prefers-reduced-motion` lu en JavaScript, pour ce que CSS ne peut pas atteindre.
 *
 * Presque tout le mouvement du projet se désamorce en CSS (`motion-reduce:transition-none` sur les
 * jaquettes, les barres de progression). Un carrousel non : son défilement est animé **par
 * JavaScript**, dans Embla, et aucune classe ne l'arrête — il faut lui passer une durée nulle.
 *
 * **Faux au premier rendu, puis corrigé après montage**, et c'est volontaire : le serveur ne connaît
 * pas les réglages système du visiteur. Deviner produirait un désaccord d'hydratation ; ici la
 * valeur ne pilote aucun balisage, seulement une option passée à Embla, donc la corriger dans un
 * effet ne fait sauter aucun pixel. Le seul cas perdu est un défilement déclenché dans les
 * millisecondes qui suivent le montage, avant que l'effet ait tourné.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    setReduced(query.matches);

    // On écoute au lieu de lire une fois : le réglage se change sans recharger la page, et un
    // carrousel qui continuerait d'animer après coup serait précisément ce qu'on cherche à éviter.
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
