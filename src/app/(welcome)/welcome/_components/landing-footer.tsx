import { ArrowUpIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

import { LANDING_ANCHORS } from "@/app/(welcome)/welcome/_components/landing-nav";
import { Logo } from "@/components/layout/logo";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

const linkClass =
  "text-muted-foreground text-sm transition-colors hover:text-foreground";

/**
 * Le pied de la landing : la marque, les ancres (la seule navigation de la page en 390, où la
 * barre les cache), l'accès, puis le nom en filigrane. Les jaquettes viennent d'AniList, et ses
 * CGU demandent qu'on le dise là où on les montre : l'attribution reste visible en toute largeur.
 */
export function LandingFooter({ providersLabel }: { providersLabel: string }) {
  return (
    <footer className="relative overflow-hidden border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-14 pb-10 sm:px-8 sm:pt-18 grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 flex max-w-xs flex-col gap-4 md:col-span-1">
          <span className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="font-heading font-semibold text-lg tracking-tight">
              {site.name}
            </span>
          </span>
          <p className="text-pretty text-muted-foreground text-sm leading-relaxed">
            Le carnet privé d'animes et de mangas d'une dizaine d'amis, sur le
            catalogue d'{site.attribution.name}.
          </p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-emerald-500"
            />
            Sur invitation · avec {providersLabel}
          </p>
        </div>

        <nav aria-label="Pied de page" className="contents">
          <div className="flex flex-col gap-4">
            <h2 className="font-medium text-sm">Le carnet</h2>
            <ul className="flex flex-col gap-3">
              {LANDING_ANCHORS.map(([href, label]) => (
                <li key={href}>
                  <a className={linkClass} href={href}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="font-medium text-sm">Le cercle</h2>
            <ul className="flex flex-col gap-3">
              <li>
                <Link className={linkClass} href={routes.auth.login}>
                  Se connecter
                </Link>
              </li>
              <li>
                <Link className={linkClass} href={routes.auth.login}>
                  Demander une place
                </Link>
              </li>
              <li>
                <a
                  className={`${linkClass} inline-flex items-center gap-1`}
                  href={site.attribution.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {site.attribution.name}
                  <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t py-6 text-muted-foreground text-xs">
          <span>
            © 2026 {site.name} · Projet non commercial · Données et images :{" "}
            <a
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
              href={site.attribution.url}
              rel="noreferrer"
              target="_blank"
            >
              {site.attribution.name}
            </a>
          </span>
          <a
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            href="#contenu"
          >
            Haut de page
            <ArrowUpIcon aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Le nom en filigrane, rogné par le bas : une signature, pas un texte à lire. */}
      <p
        aria-hidden="true"
        className="pointer-events-none mx-auto mb-[-0.22em] max-w-6xl select-none bg-linear-to-b from-foreground/12 to-transparent bg-clip-text px-4 text-center font-heading font-semibold text-[clamp(64px,17vw,232px)] text-transparent leading-none tracking-tighter sm:px-8"
      >
        {site.name}
      </p>
    </footer>
  );
}
