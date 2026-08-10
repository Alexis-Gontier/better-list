import "@/styles/globals.css";
import type { Metadata } from "next";

import { env } from "@/config/env";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";
import { fontVariables } from "@/styles/fonts";

/**
 * `metadataBase` est ce qui rend absolues les URL d'`openGraph` et de `twitter`.
 *
 * Sans elle, Next assemble les images de partage sur `localhost:3000` — invisible en
 * développement, et fatal en production : une carte de partage dont l'image pointe une machine
 * locale ne s'affiche chez personne. Elle est ici et pas sur la page partagée, parce qu'elle vaut
 * pour tout ce que le site publiera.
 */
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      // L'interface est en français (docs/PRODUCT.md §7). Un `lang` qui ment fait prononcer la page
      // avec les phonèmes de l'autre langue par un lecteur d'écran — et c'est sur une page publique,
      // ouverte par des gens qu'on ne connaît pas, que ça se paie.
      lang="fr"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", "font-sans", ...fontVariables)}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
