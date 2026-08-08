import type { ReactNode } from "react";

import { site } from "@/config/site";

/**
 * Chrome minimal des pages d'authentification : pas de header, pas de navigation — il n'y a rien
 * à naviguer tant qu'on n'est pas entré.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-semibold text-2xl tracking-tight">{site.name}</h1>
          <p className="text-muted-foreground text-sm">{site.description}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
