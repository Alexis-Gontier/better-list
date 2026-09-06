"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav } from "@/config/navigation";

/**
 * La navigation sous le palier `md`, **et la seule qu'il y ait à cette largeur**.
 *
 * `MainNav` est en `hidden md:flex` : jusqu'au 7 septembre 2026, rien ne la remplaçait en dessous.
 * L'en-tête mobile n'offrait alors que le monogramme, qui mène à l'accueil — un placeholder le
 * temps de la refonte. Ni `/search`, ni `/library`, ni `/lists` n'étaient donc atteignables depuis
 * un téléphone, et la palette `⌘K` qui aurait pu servir de repli est partie à la mise à blanc.
 *
 * Un tiroir plutôt qu'une barre basse (décision d'Alexis) : il garde les **descriptions** de
 * `config/navigation.ts`, que trois onglets d'icônes auraient jetées, et il ne prend aucune hauteur
 * en permanence — sur une grille de jaquettes, cinquante pixels collés en bas coûtent une ligne.
 *
 * Il lit la **même** `mainNav` que le menu desktop. Deux listes finiraient par diverger, et la
 * divergence se lirait comme une porte manquante sur l'un des deux formats.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /*
    Le tiroir ne se ferme pas tout seul quand on suit un de ses liens : la navigation de Next
    remplace le contenu de la page **sans démonter** l'en-tête, donc le panneau resterait ouvert
    par-dessus l'écran qu'on vient de demander. Fermer sur le changement de chemin plutôt qu'au clic
    couvre aussi le retour arrière du navigateur.

    C'est un **ajustement d'état pendant le rendu**, et non un `useEffect` : React documente ce
    motif pour « changer d'état quand une entrée change », et il évite la passe de rendu
    supplémentaire qu'un effet imposerait — le panneau se fermerait après avoir été peint une fois
    de trop. Biome le demande aussi : un effet dont le corps ne lit pas `pathname` ne peut pas le
    déclarer en dépendance.
  */
  const [pathWhenOpened, setPathWhenOpened] = useState(pathname);

  if (pathWhenOpened !== pathname) {
    setPathWhenOpened(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="md:hidden"
          size="icon-sm"
          variant="ghost"
          aria-label="Ouvrir la navigation"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>

      {/*
        Le titre et la description sont obligatoires pour Radix — sans eux, le panneau est annoncé
        sans nom. Ils sont masqués visuellement : à l'écran, deux sections nommées suffisent.
      */}
      <SheetContent side="left" className="gap-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>
            Les sections du site : découvrir, et ma bibliothèque.
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="Navigation principale">
          {mainNav.map((section) => (
            <div className="mb-6 last:mb-0" key={section.href}>
              {/*
                Un intitulé de section, pas un lien : `section.href` double toujours le premier de
                ses `links`, et deux cibles identiques à une ligne d'écart font hésiter sans rien
                offrir de plus.
              */}
              <p className="px-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {section.label}
              </p>

              <ul>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      /*
                        `aria-current` et non une simple classe : la page courante doit être dite,
                        pas seulement montrée. C'est le pendant de l'`active` que le menu desktop
                        passe à `NavigationMenuLink`.
                      */
                      aria-current={pathname === link.href ? "page" : undefined}
                      className="flex flex-col gap-0.5 rounded-md px-2 py-2 transition-colors hover:bg-accent aria-[current=page]:bg-accent"
                      href={link.href}
                    >
                      <span className="font-medium">{link.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {link.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
