import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaLinksProps = {
  media: MediaDetail;
};

/**
 * Où regarder, et où lire la fiche d'origine.
 *
 * **Deux avertissements, dont un obligatoire.**
 *
 * Le premier : `externalLinks` est **communautaire et régional** — ce sont des liens ajoutés par
 * les contributeurs d'AniList, et rien ne garantit que la plateforme citée diffuse l'œuvre dans le
 * pays d'où on regarde (docs/fiche-media.md §1.3). D'où la note en pied : promettre un catalogue
 * qu'on ne contrôle pas est le meilleur moyen de faire passer une absence pour une panne.
 *
 * Le second : le lien vers AniList n'est pas une politesse, c'est **l'attribution que leurs CGU
 * attendent** (docs/PRODUCT.md §9). Il est donc rendu même quand aucune plateforme n'est connue,
 * et c'est ce qui empêche cette section de disparaître entièrement.
 *
 * **Aucune couleur**, alors qu'AniList fournit `color` et `icon` par lien : cinquante pastilles
 * aux couleurs de marques rejoueraient exactement ce que la spec du 2 septembre interdit — des
 * surfaces colorées qui se battent avec la jaquette.
 */
export function MediaLinks({ media }: MediaLinksProps) {
  /*
    `type` distingue le streaming du site officiel et des réseaux sociaux. Seul le premier répond à
    la question qu'on se pose ici ; le compte Twitter d'une série n'est pas un endroit où la
    regarder. Un lien sans URL n'est pas un lien — AniList laisse le champ nul.
  */
  const streaming = media.externalLinks.filter(
    (link) => link.type === "STREAMING" && link.url,
  );

  if (streaming.length === 0 && !media.siteUrl) return null;

  return (
    <section className="flex flex-col gap-3">
      {/* On ne regarde pas un manga : l'intitulé suit le type, comme le compteur du hero. */}
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.12em]">
        {media.type === "ANIME" ? "Où regarder" : "Où lire"}
      </h2>

      {streaming.length > 0 ? (
        <>
          <ul className="flex flex-wrap gap-2">
            {streaming.map((link) => (
              <li key={link.id}>
                <Badge asChild variant="outline">
                  {/*
                    `noreferrer` autant que `noopener` : on n'a aucune raison d'annoncer à une
                    plateforme de streaming depuis quelle fiche on arrive.
                  */}
                  <a href={link.url ?? ""} rel="noreferrer" target="_blank">
                    {link.site}
                  </a>
                </Badge>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground text-xs">
            Liens ajoutés par la communauté AniList : la disponibilité dépend du
            pays.
          </p>
        </>
      ) : null}

      {media.siteUrl ? (
        <a
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
          href={media.siteUrl}
          rel="noreferrer"
          target="_blank"
        >
          Voir sur AniList
          <ExternalLinkIcon aria-hidden className="size-3.5" />
        </a>
      ) : null}
    </section>
  );
}
