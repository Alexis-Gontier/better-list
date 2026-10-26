"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Le bouton d'un cran, en plus ou en moins.
 *
 * **Il vit dans `shared/` et pas dans `features/` parce qu'il ne connaît rien du métier** : ni
 * épisode, ni note, ni entrée de suivi. Il reçoit un libellé et un geste. Deux contrôles s'en
 * servent aujourd'hui — le compteur de progression et la note — et il n'y a aucune raison qu'un
 * troisième ait à redécider ce qui suit.
 *
 * Ce qu'il porte, et qui justifie qu'il existe plutôt qu'un `Button` recopié deux fois :
 * `disabled:opacity-50`, le défaut du bouton shadcn, fait pâlir la bordure en même temps que le
 * contenu. Dans un `ButtonGroup`, dont les segments partagent leurs arêtes, le cadre se met alors à
 * changer d'intensité d'un segment à l'autre et le groupe cesse de se lire comme un seul objet. On
 * rend donc au bouton son opacité pleine, et c'est **la couleur du contenu** qui dit
 * l'indisponibilité — la bordure n'a jamais été le bon canal pour ça.
 *
 * **Maintenu enfoncé, il répète en accélérant** (D53) : un cran à l'appui, une pause pour qu'un clic
 * ordinaire ne déborde jamais, puis la répétition (voir `HOLD_*`).
 */

type StepButtonProps = {
  direction: "decrement" | "increment";
  /** Nom accessible, écrit en entier : « Avancer d'un épisode », pas « Plus ». */
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

/** La pause avant la première répétition : au-delà d'un clic franc, en deçà de l'impatience. */
const HOLD_DELAY = 400;
/** Le premier intervalle, puis le plancher qu'il atteint en se resserrant à chaque cran. */
const HOLD_START = 120;
const HOLD_FLOOR = 30;
/** Chaque répétition raccourcit la suivante de 12 % : le plancher arrive en une quinzaine de crans. */
const HOLD_RAMP = 0.88;

export function StepButton({
  direction,
  label,
  disabled,
  onClick,
}: StepButtonProps) {
  const Icon = direction === "increment" ? PlusIcon : MinusIcon;

  /*
    **Le geste le plus récent, pas celui de l'appui.** L'appelant calcule `valeur + 1` à partir de
    la valeur de son rendu : un minuteur qui garderait la fonction capturée au premier cran
    réenverrait la même valeur en boucle. Chaque rendu met donc la référence à jour, et chaque
    cran relit la dernière.
  */
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };

  const repeat = (interval: number) => {
    timer.current = setTimeout(() => {
      onClickRef.current();
      repeat(Math.max(HOLD_FLOOR, interval * HOLD_RAMP));
    }, interval);
  };

  /*
    **Arrivé à la borne, le bouton se désarme — et un bouton désarmé ne reçoit plus `pointerup`.**
    Sans cet effet, la répétition continuerait dans le vide jusqu'au démontage. Et le démontage
    lui-même — la fenêtre qu'on ferme le doigt posé — doit aussi couper le minuteur.
  */
  useEffect(() => {
    if (disabled && timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, [disabled]);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <Button
      aria-label={label}
      /*
        `touch-manipulation` retire le délai du double-tap, `select-none` évite qu'un appui long
        sélectionne l'icône ou les voisins, et le menu contextuel est refusé plus bas : sur un
        téléphone, c'est lui qui s'ouvrirait au bout d'une demi-seconde de pression.
      */
      className="touch-manipulation select-none disabled:text-muted-foreground/50 disabled:opacity-100"
      disabled={disabled}
      /*
        **`onClick` ne sert plus qu'au clavier.** La souris et le doigt passent par `pointerdown`,
        qui fait déjà le premier cran ; le `click` qui suit le relâchement le referait. Un clic
        clavier (Entrée, Espace) a `detail === 0` — c'est le seul qu'on garde ici, et la
        répétition native de la touche maintenue y fait le reste.
      */
      onClick={(event) => {
        if (event.detail === 0) onClickRef.current();
      }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerCancel={stop}
      onPointerDown={(event) => {
        // Le bouton principal seulement : un clic droit ou du milieu n'est pas un cran.
        if (event.button !== 0) return;
        // Garder le pointeur : glisser hors du bouton sans relâcher continue, comme sur iOS.
        event.currentTarget.setPointerCapture(event.pointerId);
        stop();
        onClickRef.current();
        timer.current = setTimeout(() => repeat(HOLD_START), HOLD_DELAY);
      }}
      onPointerUp={stop}
      onLostPointerCapture={stop}
      size="icon"
      variant="outline"
    >
      <Icon />
    </Button>
  );
}
