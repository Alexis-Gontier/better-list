"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Le survol d'une jaquette — **le déclencheur, et rien du contenu**.
 *
 * C'est la feuille interactive de `MediaCard` : la carte reste un Server Component, et seul ce
 * fichier part au bundle. Les deux côtés arrivent en props — la carte par `children`, le panneau par
 * `preview` — donc tous deux sont **rendus sur le serveur** et traversent la frontière déjà en HTML.
 * C'est la règle server-first d'ARCHITECTURE.md à la lettre : on passe les Server Components en
 * `children` plutôt que de convertir le sous-arbre.
 *
 * **Le panneau est accroché au curseur** (demande d'Alexis, 17 septembre 2026), et c'est ce qui a
 * fait quitter `HoverCard` de Radix. Radix positionne son contenu contre la **boîte** du
 * déclencheur : il sait basculer de côté, pas suivre un point. Son API n'expose pas d'ancre
 * virtuelle pour cette primitive — `Popover` en a une, `HoverCard` non —, et détourner la
 * transformation que son moteur de placement écrit à chaque image reviendrait à lutter contre lui
 * soixante fois par seconde.
 *
 * Ce qu'on reprend de lui, en revanche, est repris à l'identique : les deux délais, le portail, le
 * panneau qui ne capte pas la souris, et l'ouverture au clavier.
 */

/**
 * **400 ms avant l'ouverture, 80 ms avant la fermeture.** Une grille en compte vingt et une par
 * écran : sans délai, traverser la page d'un coin à l'autre ferait clignoter une demi-douzaine de
 * panneaux. Le délai de fermeture, lui, est court exprès — le panneau n'a rien à protéger, il n'est
 * pas fait pour qu'on aille dedans (voir `pointer-events-none` plus bas).
 */
const OPEN_DELAY = 400;
const CLOSE_DELAY = 80;

/**
 * L'écart entre le curseur et le coin du panneau.
 *
 * Il ne sert pas qu'à l'élégance : collé au point, le panneau se retrouve **sous** la pointe de la
 * flèche, qui en masque alors le premier mot. Seize pixels dégagent la pointe sans détacher le
 * panneau du geste.
 */
const CURSOR_OFFSET = 16;

/** Ce que le panneau garde entre lui et le bord de la fenêtre quand il vient buter dessus. */
const EDGE_PADDING = 12;

type Point = { x: number; y: number };

export function MediaHoverCard({
  preview,
  children,
}: {
  /** Le panneau, rendu par l'appelant côté serveur. */
  preview: React.ReactNode;
  /** La carte, qui sert de déclencheur. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Le dernier point visé — en ref et non en état : il change à chaque image, il ne rend rien. */
  const pointRef = useRef<Point>({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  /**
   * Pose le panneau, **en écrivant dans le DOM plutôt que dans un état**.
   *
   * Un `setState` par `pointermove` rendrait le composant à chaque image de chaque survol, sur une
   * grille qui en compte vingt et une. Ici le point vit dans une ref et la position part
   * directement en `transform` : le navigateur n'a ni style à recalculer ni disposition à reprendre.
   *
   * **La bascule se fait sur le bord touché, pas sur la moitié d'écran.** Tant que le panneau tient
   * à droite du curseur il y reste ; il ne passe à gauche qu'au moment où il déborderait, ce qui
   * évite de le faire sauter d'un côté à l'autre au milieu de la grille. Le bornage qui suit
   * rattrape le cas où il ne tient d'aucun côté — une fenêtre plus étroite que lui.
   */
  const place = useCallback(({ x, y }: Point) => {
    const panel = panelRef.current;
    if (!panel) return;

    const { offsetWidth: width, offsetHeight: height } = panel;
    const limitX = window.innerWidth - EDGE_PADDING;
    const limitY = window.innerHeight - EDGE_PADDING;

    let left = x + CURSOR_OFFSET;
    let top = y + CURSOR_OFFSET;

    if (left + width > limitX) left = x - CURSOR_OFFSET - width;
    if (top + height > limitY) top = y - CURSOR_OFFSET - height;

    left = Math.max(EDGE_PADDING, Math.min(left, limitX - width));
    top = Math.max(EDGE_PADDING, Math.min(top, limitY - height));

    panel.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }, []);

  /*
    Le placement de la **première** image : à l'ouverture, le panneau n'existait pas encore quand le
    point a été relevé, donc personne n'a pu le mesurer. On le pose ici, après le rendu du portail
    et avant la peinture — sans quoi il paraîtrait un instant en haut à gauche avant de rejoindre
    le curseur.
  */
  useEffect(() => {
    if (open) place(pointRef.current);
  }, [open, place]);

  /*
    **Un défilement ferme le panneau.** Il est en position fixe, la carte non : faire défiler
    laisserait un panneau immobile décrire une jaquette qui n'est plus dessous. Le curseur ne
    bougeant pas, aucun `pointermove` ne viendrait le rattraper. Même raison pour le
    redimensionnement, qui déplace toute la grille sous un panneau qui ne le saurait pas.
  */
  useEffect(() => {
    if (!open) return;

    const close = () => {
      clearTimer();
      setOpen(false);
    };

    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close, { passive: true });

    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open, clearTimer]);

  // Les horloges en attente ne survivent pas au démontage : une grille se remplace en entier au
  // changement de page, et un `setOpen` d'après démontage n'a personne à prévenir.
  useEffect(() => clearTimer, [clearTimer]);

  /** Une souris, et elle seule : un survol n'existe ni au doigt ni au stylet. */
  const isMouse = (event: React.PointerEvent) => event.pointerType === "mouse";

  const handleEnter = (event: React.PointerEvent) => {
    if (!isMouse(event)) return;

    pointRef.current = { x: event.clientX, y: event.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  };

  const handleMove = (event: React.PointerEvent) => {
    if (!isMouse(event)) return;

    pointRef.current = { x: event.clientX, y: event.clientY };
    if (open) place(pointRef.current);
  };

  const handleLeave = (event: React.PointerEvent) => {
    if (!isMouse(event)) return;

    clearTimer();
    timerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  /**
   * **L'ouverture au clavier, qui n'a pas de curseur à suivre.**
   *
   * Le lien de la carte est focusable, donc le panneau venait au `Tab` du temps de Radix — c'est un
   * acquis qu'un panneau accroché à la souris perdrait sans ça. On vise alors le bord droit de la
   * carte à mi-hauteur : le même point qu'aurait donné un curseur posé là, ce qui laisse tout le
   * reste du placement — écart, bascule, bornage — se dérouler à l'identique.
   *
   * `:focus-visible` et non `:focus` : un clic sur la carte donne aussi le focus au lien, et sans
   * cette distinction le panneau resterait ouvert après le clic, souris déjà partie ailleurs.
   * C'est le correctif exact qui avait été posé sur l'action de la jaquette (`media-card.tsx`).
   */
  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.target.matches(":focus-visible")) return;

    const { right, top, height } = event.target.getBoundingClientRect();
    pointRef.current = { x: right, y: top + height / 2 };
    clearTimer();
    setOpen(true);
  };

  const handleBlur = () => {
    clearTimer();
    setOpen(false);
  };

  return (
    /*
      `display: contents` : l'enveloppe porte les écouteurs sans poser de boîte. Sans elle, il
      faudrait soit un `div` réel — qui deviendrait l'élément flex de `MediaCard` à la place du lien
      et casserait la carte —, soit un `cloneElement` sur un enfant dont ce fichier ne sait rien.

      React reconstruit `pointerenter` et `pointerleave` le long de **son** arbre à partir de
      `pointerover` / `pointerout` : ils se déclenchent donc bien ici, à l'entrée et à la sortie du
      lien, alors que les événements natifs du même nom ne remontent pas.

      **`noStaticElementInteractions` est levée juste en dessous**, et la règle n'a pas tort en
      général : elle vise le `div` cliquable qui aurait dû être un bouton. Ici, les écouteurs ne
      portent aucun geste — ils révèlent un panneau décoratif —, et l'élément interactif est
      l'enfant : le lien de la carte, déjà focusable, dont `onFocus` tient le chemin clavier. Lui
      donner un `role` mentirait sur une enveloppe qui, en `display: contents`, n'a pas même de
      boîte.
    */
    // biome-ignore lint/a11y/noStaticElementInteractions: enveloppe sans geste, voir au-dessus
    <div
      className="contents"
      onBlur={handleBlur}
      onFocus={handleFocus}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onPointerMove={handleMove}
    >
      {children}

      {/*
        **Un portail sur `<body>`, et ce n'est pas un choix de confort.** Une position fixe ne
        échappe à son ancêtre que si aucun n'a de transformation : or le panneau naît à l'intérieur
        d'un carrousel Embla, qui translate son contenu, et sous l'`overflow-x-clip` du layout de
        `(app)`. Rendu sur place, il serait positionné contre la bande du carrousel **et** rogné par
        elle.
      */}
      {open
        ? createPortal(
            <div
              /*
                **Le panneau ne capte pas la souris**, et c'est ce qui le rend sûr sur une grille.
                Rien dedans n'est cliquable — et posé sous le curseur comme il l'est maintenant,
                un panneau qui capterait le pointeur se placerait entre la souris et la carte
                qu'elle survole : le survol se refermerait à l'instant où le panneau paraît, pour
                rouvrir aussitôt. Là, le pointeur le traverse.

                **Caché sous `sm`** : un survol n'existe pas au doigt, et c'est déjà la règle de
                l'action posée sur la jaquette (`media-card.tsx`). Sur un écran étroit, le panneau
                recouvrirait de toute façon la moitié de la grille pour un geste que personne ne
                peut faire.

                `top-0 left-0` et tout le placement en `transform` : c'est la seule façon de
                déplacer un élément à chaque image sans faire reprendre la disposition à la page.

                L'animation ne porte que sur l'apparition — jamais sur la position, qui doit coller
                au geste. `motion-reduce` la retire pour qui demande moins d'animation.
              */
              className="pointer-events-none fixed top-0 left-0 z-50 hidden w-112 sm:block"
              ref={panelRef}
            >
              {/*
                **La position et l'apparition sont sur deux éléments, et il le faut.** Les deux
                s'écrivent en `transform`, et une animation CSS l'emporte sur le style inline : tant
                que les keyframes d'entrée tournaient sur le même nœud, elles écrasaient la position
                pendant leurs cent millisecondes. Le panneau paraissait alors **en haut à gauche de
                la fenêtre** avant de sauter sous le curseur — invisible à toute mesure prise après
                coup, et bien réel à l'œil.

                L'enveloppe porte donc la position, que ce fichier écrit à chaque image ; cette
                boîte-ci porte l'apparence et son animation, qui ne regarde pas où elle est.
              */}
              <div className="origin-top-left rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none">
                {preview}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
