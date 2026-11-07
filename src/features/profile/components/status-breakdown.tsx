import { LOCALE } from "@/config/locale";
import type { StatusSlice } from "@/features/profile/lib/profile-stats";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import { ENTRY_STATUS_LABELS } from "@/features/tracking/lib/entry-format";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";
import { cn } from "@/lib/utils";

/**
 * La répartition de la bibliothèque par statut — une barre de composition.
 *
 * ## Pourquoi ce n'est ni un camembert, ni un graphe
 *
 * **Le camembert a été écarté** parce qu'il transporte son sens par la couleur seule : six parts
 * voisines ne se distinguent qu'à la teinte, la légende redevient le vrai graphe, et les formes de
 * référence le déconseillent au-delà de cinq parts.
 *
 * **Recharts a été écarté ensuite**, après l'avoir écrit. Une barre empilée d'une seule ligne n'est
 * pas un graphe : il n'y a pas d'échelle, pas d'axe, pas de série à comparer. Six `<div>` en flex
 * font exactement la même image, et rendent **trois** choses que le graphe rendait mal ou pas :
 *
 * 1. **Un composant serveur.** Zéro JavaScript pour un bloc qui n'a aucune interaction. C'est la
 *    règle server-first du projet, appliquée là où elle coûte le moins et rapporte le plus.
 * 2. **Des interstices entre les segments.** Recharts empile des rectangles jointifs : deux teintes
 *    voisines se fondent l'une dans l'autre. Un liséré de la couleur de la carte sépare les parts
 *    quelle que soit leur teinte — c'est ce qui rend la barre lisible sans dépendre du contraste.
 * 3. **Aucune infobulle à écrire**, parce que la légende donne déjà chaque nombre et chaque part.
 *    Une infobulle qui répète ce qui est écrit dessous n'est pas une aide, c'est une redite qu'on
 *    réserve à ceux qui peuvent survoler.
 *
 */

/** L'ordre d'empilement, du plus vivant au plus dormant. Il porte la moitié du sens. */
const STATUS_ORDER: EntryStatus[] = [
  "CURRENT",
  "REPEATING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
  "PLANNING",
];

/**
 * La rampe, écrite en classes complètes et non composées : Tailwind lit le source pour décider des
 * règles à produire, et un nom construit à l'exécution n'en produit aucune — le piège que
 * `entry-status-dot.tsx` documente déjà.
 *
 * ## Les six teintes sont celles de `/library`, et c'est une décision d'Alexis (12 septembre 2026)
 *
 * Deux versions grises ont précédé celle-ci — une rampe de `--chart-*`, puis des opacités de
 * `--muted-foreground` — et **toutes deux étaient fausses pour la même raison** : elles
 * enseignaient un second code couleur pour une notion que l'application code déjà. Dans
 * `/library`, la rangée d'onglets apprend « vert = en cours, violet = terminé, rouge = abandonné »,
 * et chaque jaquette le répète en pastille. Réafficher ces six mots avec des carrés gris sur le
 * profil, c'est demander de retenir deux fois la même chose de deux façons différentes.
 *
 * **L'argument contraire n'a pas tenu à l'examen.** Le troisième garde-fou de `globals.css` réserve
 * ces teintes à la pastille et les interdit en surface ; le motif écrit juste au-dessus est
 * qu'elles doivent « perdre » à côté d'une jaquette. **Cet écran n'en a aucune** à cet endroit —
 * exactement l'exception déjà admise pour la rampe du calendrier, qui est colorée pour cette même
 * raison. Refuser ici ce qu'on accepte trois blocs plus haut n'était pas une règle, c'était un goût.
 *
 * La barre est en revanche **plus basse que les autres blocs** (`h-7`) : la surface colorée suffit à
 * se lire sans devenir l'objet le plus voyant de la page. C'est le vrai réglage du compromis —
 * l'aire, pas la teinte.
 */
const STATUS_FILL: Record<EntryStatus, string> = {
  CURRENT: "bg-status-current",
  REPEATING: "bg-status-repeating",
  COMPLETED: "bg-status-completed",
  PAUSED: "bg-status-paused",
  DROPPED: "bg-status-dropped",
  PLANNING: "bg-status-planning",
};

const PERCENT_FORMAT = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 0,
});

const COUNT_FORMAT = new Intl.NumberFormat(LOCALE);

export function StatusBreakdown({ data }: { data: StatusSlice[] }) {
  const byStatus = new Map(data.map((slice) => [slice.status, slice.count]));
  const total = data.reduce((sum, slice) => sum + slice.count, 0);

  // Une part vide ne se dessine pas : elle laisserait un interstice sans segment de part et d'autre.
  const present = STATUS_ORDER.filter(
    (status) => (byStatus.get(status) ?? 0) > 0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/*
        `gap-0.5` sur la barre : ce sont les interstices dont Recharts était incapable. Deux pixels
        de fond de carte entre deux teintes voisines suffisent à les séparer, ce qu'aucun écart de
        luminosité ne garantissait — et c'est ce qui permet à « En cours » et « Relecture », voisins
        dans la pile et proches en teinte, de rester deux parts.

        `h-7` et non `h-9` : c'est **l'aire, pas la teinte**, qui décidait du bruit visuel. Six
        couleurs sur un bandeau de 36 px dominaient la page ; les mêmes sur 28 px se lisent sans
        s'imposer.
      */}
      <div aria-hidden className="flex h-7 gap-0.5 overflow-hidden rounded-md">
        {present.map((status) => (
          <div
            className={cn("min-w-1", STATUS_FILL[status])}
            key={status}
            style={{
              // La largeur est la donnée. `flex-basis` plutôt que `width` pour que les parts
              // se partagent exactement la ligne, interstices déduits.
              flexBasis: `${((byStatus.get(status) ?? 0) / total) * 100}%`,
            }}
          />
        ))}
      </div>

      {/*
        **La légende est la moitié utile du bloc, pas une annexe.** C'est elle qui porte le nom, le
        nombre et la part — donc tout ce que la barre ne dit pas, et tout ce qui reste quand on ne
        distingue pas deux gris. La barre au-dessus est `aria-hidden` pour cette raison : elle ne
        contient aucune information que ces lignes n'aient déjà.
      */}
      {/*
        **Une seule colonne sous `sm`.** À deux colonnes dans 375 px, chaque ligne disposait de
        160 px pour un libellé, un nombre et un pourcentage : « Terminé » devenait « Termi… » et
        « Abandonné » « Abando… ». Tronquer le nom d'un statut dans la légende qui existe justement
        pour le nommer revient à n'avoir plus de légende du tout.
      */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 lg:grid-cols-2">
        {STATUS_ORDER.map((status) => {
          const count = byStatus.get(status) ?? 0;

          return (
            <div className="flex items-center gap-2" key={status}>
              {/*
                **La pastille du reste de l'application, pas un carré refait ici.** C'est le même
                composant que la rangée d'onglets de `/library` et que chaque vignette de la grille,
                donc la même teinte pour le même statut — ce qui est tout l'intérêt d'avoir un code
                couleur. `labelled` parce que le mot est écrit juste à côté : sans lui, un lecteur
                d'écran annoncerait « En cours En cours ».
              */}
              <EntryStatusDot labelled status={status} />
              <dt className="truncate text-sm">
                {ENTRY_STATUS_LABELS[status]}
              </dt>
              <dd className="ml-auto text-muted-foreground text-sm tabular-nums">
                {COUNT_FORMAT.format(count)}
                <span className="ml-1.5 text-xs">
                  {total > 0 ? PERCENT_FORMAT.format(count / total) : "—"}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
