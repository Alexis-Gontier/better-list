import { UserIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { mainNav, type NavSection } from "@/config/navigation";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

/**
 * Les colonnes de liens du pied de page.
 *
 * **Elles sont dérivées de `mainNav`, jamais recopiées.** Un pied de page qui réécrit les entrées de
 * l'en-tête est un doublon qui diverge : on ajoute une route à la nav, on oublie le bas de page, et
 * le site se met à proposer deux plans différents de lui-même. `config/navigation.ts` reste donc la
 * source unique, et ce fichier n'ajoute que ce qui n'a pas sa place dans une barre.
 *
 * **« Compte » n'a qu'une entrée, et c'est volontaire.** Le réflexe serait de la remplir — « Aide »,
 * « À propos », « Confidentialité » — mais aucune de ces pages n'existe, et `config/navigation.ts`
 * a déjà tranché le principe pour `/collection` : *une entrée de nav qui répond 404 est pire qu'une
 * entrée absente, elle se lit comme une panne plutôt que comme un chantier*. Une colonne courte dit
 * la vérité sur le produit ; trois liens morts diraient qu'il est cassé.
 */
const footerNav: NavSection[] = [
  ...mainNav,
  {
    href: routes.settings,
    label: "Compte",
    icon: UserIcon,
    links: [
      {
        href: routes.settings,
        label: "Réglages",
        description: "Préférences d'affichage et de contenu.",
      },
    ],
  },
];

type FooterProps = {
  /**
   * Afficher les colonnes de navigation.
   *
   * **`false` n'est pas un réglage d'apparence, c'est une contrainte d'accès.** Tout ce que ces
   * colonnes pointent vit derrière la garde de `app/(app)/layout.tsx`, or une liste partagée
   * s'ouvre **sans compte** : chaque lien y mènerait un visiteur vers un écran de connexion qu'il ne
   * peut pas franchir, l'inscription passant par une liste d'attente. C'est la règle que
   * `app/(share)/layout.tsx` énonce pour son en-tête, et elle vaut tout autant ici.
   *
   * Le pied de page réduit garde donc la marque et l'attribution — ce qu'on **doit** dire — et perd
   * ce qu'on ne peut pas tenir.
   */
  withNavigation?: boolean;
};

/**
 * Le pied de page.
 *
 * **Sa raison d'être est l'attribution AniList** (docs/PRODUCT.md §9 : usage non commercial,
 * attribution attendue). Tout le catalogue vient de chez eux et aucun écran ne le disait ; un pied
 * de page est exactement l'endroit d'une mention qu'on doit pouvoir trouver sans jamais avoir à la
 * chercher. Le reste — le plan, la signature — s'organise autour d'elle.
 *
 * **Le nom est en toutes lettres ici, contrairement à l'en-tête.** La décision du 6 septembre 2026
 * n'y gardait le monogramme seul que pour ne pas pousser la navigation vers la droite : une
 * contrainte de barre, pas une règle de marque. En bas de page il n'y a rien à pousser, et c'est le
 * seul endroit où le produit peut se nommer — et se décrire — sans prendre la place de rien.
 *
 * Composant serveur : des liens et du texte, aucun état.
 */
export function Footer({ withNavigation = false }: FooterProps) {
  return (
    /*
      `mt-auto` et non une marge fixe : les layouts qui le montent sont des colonnes flex dont le
      `main` porte `flex-1`, donc sur une page longue le pied de page est déjà poussé en bas. Sur une
      page courte — un écran vide, un placeholder — c'est lui qui l'y tient quand même, plutôt que de
      le laisser remonter au milieu de l'écran.

      La bordure reprend celle du chrome de `(share)` (`border-border/60`) : un trait plein aurait
      fait du pied de page un bloc, alors qu'il ne fait que clore la colonne.
    */
    <footer className="mt-auto border-border/60 border-t">
      <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/*
          La marque tient une colonne plus large que les autres, et la grille le dit : `2fr` contre
          trois `1fr`. Sans ça la phrase de description se serait cassée en cinq lignes étroites à
          côté de colonnes de liens presque vides.

          Sous `sm` tout retombe sur une seule colonne — trois colonnes de deux liens sur 390 px
          donnent des libellés coupés, ce que la spec refuse partout ailleurs.
        */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-semibold">
              {/*
                `Logo` porte `aria-hidden` — c'est pour ça que le nom qui suit est du texte réel et
                non un `aria-label` : ici il est visible, donc il nomme la marque pour tout le monde
                d'un coup, sans dépendre d'ARIA.
              */}
              <Logo className="size-5" />
              {site.name}
            </span>

            {/*
              La description du produit, celle-là même que portent les métadonnées. Elle n'est
              affichée **nulle part ailleurs** dans l'application : l'accueil suppose qu'on sait déjà
              où l'on est, ce qui est vrai d'un cercle de quatre comptes mais laisse le produit sans
              un seul endroit où il se présente.
            */}
            <p className="max-w-xs text-sm/6 text-muted-foreground">
              {site.description}
            </p>
          </div>

          {withNavigation
            ? footerNav.map((section) => (
                /*
                  `aria-label` plutôt qu'un titre lié par `aria-labelledby` : le libellé visible
                  n'est pas un titre de section du document — le plan de la page appartient au
                  contenu, et intercaler trois `h2` de pied de page entre les siens le rendrait
                  illisible à la navigation par titres.
                */
                <nav aria-label={section.label} key={section.label}>
                  <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    {section.label}
                  </p>

                  <ul className="mt-3 flex flex-col gap-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        {/*
                          Pas de `prefetch={false}` ici, contrairement aux liens vers une fiche : ces
                          destinations sont des écrans de l'application, pas des `/media/[id]`, donc
                          leur préchargement n'exécute aucune `generateMetadata` qui interrogerait
                          AniList. Le quota n'est pas en jeu (`features/media/components/media-card.tsx`).
                        */}
                        <Link
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          href={link.href}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))
            : null}
        </div>

        {/*
          La barre du bas : ce qu'on doit dire, séparé de ce qu'on propose. Le trait intérieur n'est
          pas décoratif — il marque que cette ligne ne fait pas partie du plan du site.
        */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-border/60 border-t py-6 text-sm text-muted-foreground">
          {/*
            **Aucune année dans la signature**, et ce n'est pas un oubli. Un millésime demanderait de
            lire l'horloge au rendu, ce qui rendrait dynamique un pied de page monté sur *tous* les
            layouts — y compris la liste partagée, dont la coquille doit pouvoir être servie
            d'avance. L'usage non commercial, lui, est une condition des CGU d'AniList (§9) : elle
            dit quelque chose de vrai, là où « © 2026 » n'aurait dit que la date du dernier
            déploiement.
          */}
          <span>© {site.name} — usage non commercial.</span>

          {/*
            `rel="noreferrer"` accompagne `target="_blank"` : sans lui, la page ouverte reçoit
            l'adresse d'où vient le clic — et sur une liste partagée, cette adresse contient le jeton
            de partage. Une fuite de jeton par en-tête `Referer` est exactement le genre de chose qui
            ne se voit jamais à l'écran.
          */}
          <span>
            Données fournies par{" "}
            <a
              className="underline underline-offset-4 transition-colors hover:text-foreground"
              href={site.attribution.url}
              rel="noreferrer"
              target="_blank"
            >
              {site.attribution.name}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
