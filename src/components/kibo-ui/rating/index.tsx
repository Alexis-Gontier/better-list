"use client";

/**
 * Composant `Rating` du registre kibo-ui (https://www.kibo-ui.com/components/rating), installé par
 * `pnpm shadcn add https://www.kibo-ui.com/r/rating.json`.
 *
 * **Trois écarts par rapport à l'original**, tous signalés à l'endroit où ils se trouvent :
 *
 * 1. `useControllableState` vient de `radix-ui/internal` et non de
 *    `@radix-ui/react-use-controllable-state`. Le paquet parapluie `radix-ui` est déjà une
 *    dépendance et expose ce hook ; c'est aussi par lui que passent les primitives shadcn de
 *    `components/ui/`. Une seule porte d'entrée Radix, donc pas deux copies à deux versions.
 * 2. `RatingButton` accepte un `label`, faute de quoi les boutons n'ont aucun nom accessible.
 * 3. `Rating` accepte un `aria-label`, pour ne pas annoncer « Rating » dans une interface en
 *    français.
 *
 * **Une réinstallation depuis le registre écrase ces trois points** — les remettre, ou vérifier
 * qu'ils ont été corrigés en amont.
 */
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

type RatingContextValue = {
  value: number;
  readOnly: boolean;
  hoverValue: number | null;
  focusedStar: number | null;
  handleValueChange: (
    event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>,
    value: number,
  ) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  setHoverValue: (value: number | null) => void;
  setFocusedStar: (value: number | null) => void;
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
   * Écart n° 2 par rapport au registre — nom accessible de l'étoile.
   *
   * L'original rend un `<button>` dont l'unique contenu est une icône en `aria-hidden` : le bouton
   * n'a donc **aucun nom accessible**, ce qui est un échec WCAG 4.1.2 et rend le composant
   * inutilisable au lecteur d'écran. Le composant ne diffusant pas ses props sur le bouton, il n'y
   * avait pas moyen de le corriger depuis l'appelant.
   */
  label?: string;
};

export const RatingButton = ({
  index: providedIndex,
  size = 20,
  className,
  icon = <StarIcon />,
  label,
}: RatingButtonProps) => {
  const {
    value,
    readOnly,
    hoverValue,
    focusedStar,
    handleValueChange,
    handleKeyDown,
    setHoverValue,
    setFocusedStar,
  } = useRating();

  const index = providedIndex ?? 0;
  const isActive = index < (hoverValue ?? focusedStar ?? value ?? 0);
  let tabIndex = -1;

  if (!readOnly) {
    tabIndex = value === index + 1 ? 0 : -1;
  }

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      handleValueChange(event, index + 1);
    },
    [handleValueChange, index],
  );

  const handleMouseEnter = useCallback(() => {
    if (!readOnly) {
      setHoverValue(index + 1);
    }
  }, [readOnly, setHoverValue, index]);

  const handleFocus = useCallback(() => {
    setFocusedStar(index + 1);
  }, [setFocusedStar, index]);

  const handleBlur = useCallback(() => {
    setFocusedStar(null);
  }, [setFocusedStar]);

  return (
    <button
      aria-label={label}
      className={cn(
        "rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "p-0.5",
        readOnly && "cursor-default",
        className,
      )}
      disabled={readOnly}
      onBlur={handleBlur}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      tabIndex={tabIndex}
      type="button"
    >
      {cloneElement(icon, {
        size,
        className: cn(
          "transition-colors duration-200",
          isActive && "fill-current",
          !readOnly && "cursor-pointer",
        ),
        "aria-hidden": "true",
      })}
    </button>
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
   * Écart n° 3 — libellé du groupe. L'original code en dur `aria-label="Rating"`, en anglais et
   * non remplaçable puisque le type ne laissait passer aucune prop supplémentaire. Déclaré ici, le
   * champ atterrit dans `...props`, diffusé **après** le libellé par défaut, et le remplace.
   */
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
  ...props
}: RatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [focusedStar, setFocusedStar] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, onValueChange] = useControllableState({
    defaultProp: defaultValue,
    prop: controlledValue,
    onChange: controlledOnValueChange,
  });

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

      const total = Children.count(children);
      let newValue = focusedStar !== null ? focusedStar : (value ?? 0);

      switch (event.key) {
        case "ArrowRight":
          if (event.shiftKey || event.metaKey) {
            newValue = total;
          } else {
            newValue = Math.min(total, newValue + 1);
          }
          break;
        case "ArrowLeft":
          if (event.shiftKey || event.metaKey) {
            newValue = 1;
          } else {
            newValue = Math.max(1, newValue - 1);
          }
          break;
        default:
          return;
      }

      event.preventDefault();
      setFocusedStar(newValue);
      handleValueChange(event, newValue);
    },
    [focusedStar, value, children, readOnly, handleValueChange],
  );

  useEffect(() => {
    if (focusedStar !== null && containerRef.current) {
      const buttons = containerRef.current.querySelectorAll("button");
      buttons[focusedStar - 1]?.focus();
    }
  }, [focusedStar]);

  const contextValue: RatingContextValue = {
    value: value ?? 0,
    readOnly,
    hoverValue,
    focusedStar,
    handleValueChange,
    handleKeyDown,
    setHoverValue,
    setFocusedStar,
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
