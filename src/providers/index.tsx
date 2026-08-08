import { TooltipProvider } from "@/components/ui/tooltip";

import { SearchParamsProvider } from "./search-params-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

/**
 * Providers de l'application, composés une seule fois dans le root layout.
 *
 * `TooltipProvider` est ici et pas autour de chaque infobulle : le composant `Tooltip` de
 * `components/ui/` n'embarque pas son contexte, et le provider porte le délai d'ouverture partagé —
 * en le posant localement, chaque écran finirait par avoir son propre réglage.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SearchParamsProvider>
        <TooltipProvider>
          {children}
          <ToastProvider />
        </TooltipProvider>
      </SearchParamsProvider>
    </ThemeProvider>
  );
}
