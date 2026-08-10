"use client";

import { type LucideProps, StarIcon } from "lucide-react";
import { useControllableState } from "radix-ui/internal";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";
import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Composant `Rating`, d'après le registre kibo-ui (https://www.kibo-ui.com/components/rating),
 * installé par `npx shadcn add @kibo-ui/rating` puis déplacé ici — le registre le pose dans
 * `components/kibo-ui/rating/index.tsx`, alors que `components.json` range les primitives dans
 * `components/ui`.
 *
 * **Il diverge de l'original, et une réinstallation écraserait tout ce qui suit.** Les écarts sont
 * signalés un par un à l'endroit où ils se trouvent ; les quatre premiers ont été vérifiés comme
 * toujours absents en amont au 10 août 2026 :
 *
 * 1. **Le demi-cran** (`step`), qui est la raison d'être de cette copie : l'original ne sait noter
 *    qu'en étoiles entières, or une note sur cinq sans demie est une note sur cinq valeurs.
 * 2. `RatingButton` accepte un `label`, faute de quoi les boutons n'ont **aucun nom accessible** —
 *    leur seul contenu est une icône `aria-hidden` (échec WCAG 4.1.2).
 * 3. `Rating` accepte un `aria-label` : l'original code en dur « Rating », en anglais.
 * 4. Les boutons portent `role="radio"` et `aria-checked`. L'original annonce un `radiogroup` dont
 *    aucun enfant n'est un bouton radio, ce qui ne décrit ni le choix courant ni l'ensemble.
 * 5. Une note à zéro laissait le composant **injoignable au clavier** : aucun bouton n'était
 *    tabulable tant que rien n'était noté, donc on ne pouvait pas noter au clavier. Le premier cran
 *    prend le relais.
 * 6. `useControllableState` vient de `radix-ui/internal` et non de
 *    `@radix-ui/react-use-controllable-state`. Le paquet parapluie `radix-ui` est déjà une
 *    dépendance et expose ce hook ; c'est aussi par lui que passent les autres primitives. Une
 *    seule porte d'entrée Radix, donc pas deux copies à deux versions.
 */

type RatingContextValue = {
  value: number;
  readOnly: boolean;
  /** Le plus petit écart entre deux notes : 1 étoile, ou 0,5 quand les demies sont ouvertes. */
  step: number;
  hoverValue: number | null;
  focusedValue: number | null;
  handleValueChange: (
    event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>,
    value: number,
  ) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  setHoverValue: (value: number | null) => void;
  setFocusedValue: (value: number | null) => void;
};

const RatingContext = createContext<RatingContextValue | null>(null);

const useRating = () => {
  const context = useContext(RatingContext);
  if (!context) {
    throw new Error("useRating must be used within a Rating component");
  }
  return context;
};

export type RatingButtonProps = LucideProps & {
  index?: number;
  icon?: ReactElement<LucideProps>;
  /**
   * Nom accessible du cran — écart n° 2.
   *
   * Avec les demies, il en faut **un par cran** et non un par étoile : le composant construit
   * « … (demie) » à partir de celui-ci pour la moitié gauche, faute de quoi deux boutons voisins
   * porteraient le même nom.
   */
  label?: string;
  /** Nom accessible de la moitié gauche. À défaut, `label` suffixé — voir `label`. */
  halfLabel?: string;
};

export const RatingButton = ({
  index: providedIndex,
  size = 20,
  className,
  icon = <StarIcon />,
  label,
  halfLabel,
}: RatingButtonProps) => {
  const {
    value,
    readOnly,
    step,
    hoverValue,
    focusedValue,
    handleValueChange,
    handleKeyDown,
    setHoverValue,
    setFocusedValue,
  } = useRating();

  const index = providedIndex ?? 0;
  const shown = hoverValue ?? focusedValue ?? value ?? 0;

  /**
   * La part remplie de **cette** étoile, entre 0 et 1. C'est ce qui remplace le booléen de
   * l'original : à 3,5 sur cinq, la quatrième étoile n'est ni pleine ni vide.
   */
  const fill = Math.min(Math.max(shown - index, 0), 1);

  /**
   * Le cran tabulable est celui qui porte la note — et le tout premier quand il n'y a pas de note.
   * Sans ce repli (écart n° 5), un composant vide n'avait aucun `tabIndex={0}` : il sortait du
   * parcours clavier exactement dans le cas où l'on vient noter.
   */
  const focusable = value > 0 ? value : step;

  const crans =
    step >= 1
      ? [{ cranValue: index + 1, half: false }]
      : [
          { cranValue: index + 0.5, half: true },
          { cranValue: index + 1, half: false },
        ];

  return (
    // Le conteneur n'est plus un bouton : avec les demies il en abrite deux, et un bouton dans un
    // bouton est du HTML invalide.
    // L'aperçu au survol se remet à zéro sur le groupe entier, pas ici : effacer en quittant une
    // étoile le ferait clignoter à chaque passage d'un cran au suivant.
    <span className={cn("relative inline-flex p-0.5", className)}>
      <span
        className="relative block shrink-0"
        style={{ height: size, width: size }}
      >
        {/* L'étoile vide, toujours dessinée : c'est elle qui donne son contour au cran. */}
        {cloneElement(icon, {
          size,
          className: "absolute inset-0 opacity-40",
          "aria-hidden": "true",
        })}

        {/*
          La même étoile, pleine, rognée à la fraction voulue. Deux calques superposés plutôt qu'une
          icône « demi-étoile » : la coupe suit alors n'importe quel pas, et n'importe quelle icône
          passée en `icon` continue de marcher.
        */}
        {fill > 0 ? (
          <span
            className="absolute inset-y-0 left-0 overflow-hidden motion-safe:transition-[width] motion-safe:duration-100"
            style={{ width: `${fill * 100}%` }}
          >
            {/*
              Taille fixe et position absolue : c'est la fenêtre qui rétrécit, pas l'icône. Une
              icône en largeur relative se déformerait au lieu d'être coupée.
            */}
            {cloneElement(icon, {
              size,
              className: "absolute inset-y-0 left-0 fill-current",
              "aria-hidden": "true",
            })}
          </span>
        ) : null}
      </span>

      {crans.map(({ cranValue, half }) => (
        <button
          aria-checked={value === cranValue}
          aria-label={half ? (halfLabel ?? `${label} (demie)`) : label}
          className={cn(
            // Zones de clic transparentes **posées sur** l'étoile : la moitié gauche note la demie,
            // la droite l'étoile pleine. Elles se voient au focus, sinon rien ne dirait où l'on est.
            "absolute inset-y-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
            half ? "left-0 w-1/2" : "right-0",
            step >= 1 ? "w-full" : "w-1/2",
            readOnly ? "cursor-default" : "cursor-pointer",
          )}
          disabled={readOnly}
          key={cranValue}
          onBlur={() => setFocusedValue(null)}
          onClick={(event) => handleValueChange(event, cranValue)}
          onFocus={() => setFocusedValue(cranValue)}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => !readOnly && setHoverValue(cranValue)}
          role="radio"
          tabIndex={!readOnly && cranValue === focusable ? 0 : -1}
          type="button"
        />
      ))}
    </span>
  );
};

export type RatingProps = {
  defaultValue?: number;
  value?: number;
  onChange?: (
    event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>,
    value: number,
  ) => void;
  onValueChange?: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  children?: ReactNode;
  /**
   * Le plus petit écart entre deux notes — écart n° 1. `1` par défaut, comme l'original ; `0.5`
   * ouvre les demi-étoiles, et chaque étoile porte alors deux zones de clic.
   */
  step?: number;
  /** Écart n° 3 : l'original code « Rating » en dur, en anglais et non remplaçable. */
  "aria-label"?: string;
};

export const Rating = ({
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  defaultValue = 0,
  onChange,
  readOnly = false,
  className,
  children,
  step = 1,
  ...props
}: RatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [focusedValue, setFocusedValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, onValueChange] = useControllableState({
    defaultProp: defaultValue,
    prop: controlledValue,
    onChange: controlledOnValueChange,
  });

  const total = Children.count(children);

  const handleValueChange = useCallback(
    (
      event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>,
      newValue: number,
    ) => {
      if (!readOnly) {
        onChange?.(event, newValue);
        onValueChange?.(newValue);
      }
    },
    [readOnly, onChange, onValueChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (readOnly) {
        return;
      }

      let newValue = focusedValue ?? value ?? 0;

      switch (event.key) {
        case "ArrowRight":
          // Les flèches avancent **d'un cran**, pas d'une étoile : avec les demies ouvertes, le
          // clavier doit atteindre les mêmes notes que la souris.
          newValue =
            event.shiftKey || event.metaKey
              ? total
              : Math.min(total, newValue + step);
          break;
        case "ArrowLeft":
          newValue =
            event.shiftKey || event.metaKey
              ? step
              : Math.max(step, newValue - step);
          break;
        default:
          return;
      }

      event.preventDefault();
      setFocusedValue(newValue);
      handleValueChange(event, newValue);
    },
    [focusedValue, value, total, step, readOnly, handleValueChange],
  );

  useEffect(() => {
    if (focusedValue !== null && containerRef.current) {
      const buttons = containerRef.current.querySelectorAll("button");
      // Un bouton par cran, dans l'ordre : la note divisée par le pas donne son rang.
      buttons[Math.round(focusedValue / step) - 1]?.focus();
    }
  }, [focusedValue, step]);

  const contextValue: RatingContextValue = {
    value: value ?? 0,
    readOnly,
    step,
    hoverValue,
    focusedValue,
    handleValueChange,
    handleKeyDown,
    setHoverValue,
    setFocusedValue,
  };

  return (
    <RatingContext.Provider value={contextValue}>
      <div
        aria-label="Rating"
        className={cn("inline-flex items-center gap-0.5", className)}
        onMouseLeave={() => setHoverValue(null)}
        ref={containerRef}
        role="radiogroup"
        {...props}
      >
        {Children.map(children, (child, index) => {
          if (!child) {
            return null;
          }

          return cloneElement(child as ReactElement<RatingButtonProps>, {
            index,
          });
        })}
      </div>
    </RatingContext.Provider>
  );
};
