import "@/styles/globals.css";
import type { Metadata } from "next";

import { env } from "@/config/env";
import { site } from "@/config/site";
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
  /*
    **Le nom de la page d'abord, puis celui du site** (décision d'Alexis, 17 septembre 2026, qui
    renverse celle du 7 septembre) : « Rechercher · Better-List ». Ce qui est rogné quand on ouvre
    plusieurs onglets, c'est la fin du titre — donc autant que ce soit la marque qui parte, puisque
    tous les onglets du site la répètent à l'identique. C'est le nom de la page qui les distingue
    les uns des autres, et c'est lui qu'il faut garder au début.

    Le point médian est le séparateur de la maison : c'est déjà lui qui sépare les titres secondaires
    d'une œuvre, et l'auteur du décompte sur une liste partagée.

    `default` et `template` ne servent pas au même moment. Le gabarit habille les pages qui **se
    nomment** ; le défaut couvre celles qui ne déclarent rien — `/signup`, qui ne fait que rediriger,
    sortait avec un `<title>` **vide** avant le 7 septembre 2026.
  */
  title: { default: site.name, template: `%s · ${site.name}` },
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
