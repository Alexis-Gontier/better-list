"use client";

import { ArrowUpIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bouton de retour en haut, qui n'apparaît qu'une fois la page défilée d'un écran : avant, le haut
 * est encore à portée de molette et le bouton ne ferait que masquer du contenu.
 *
 * Caché, il reste monté pour que son apparition soit une transition, mais `inert` le retire du
 * parcours clavier et de l'arbre d'accessibilité — un bouton invisible qu'on atteint au Tab est
 * un piège.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Retour en haut de page"
      inert={!visible}
      onClick={scrollToTop}
      className={cn(
        "fixed right-4 bottom-4 z-40 rounded-full shadow-md transition-[opacity,translate] duration-200 sm:right-6 sm:bottom-6 motion-reduce:transition-none",
        visible ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUpIcon />
    </Button>
  );
}
