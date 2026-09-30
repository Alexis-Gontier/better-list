import { BlurredBackdrop } from "@/components/shared/blurred-backdrop";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LOCALE, TIMEZONE } from "@/config/locale";

/**
 * L'identité d'un membre, et les quatre chiffres qui résument son suivi.
 *
 * **Composant serveur** : il ne rend que du texte, un avatar et une image floutée.
 *
 * **Refait le 30 septembre 2026** (demande d'Alexis) : l'en-tête était un petit avatar et une rangée
 * de quatre tuiles encadrées, et la page se lisait comme un tableau de bord plutôt que comme le
 * profil de quelqu'un. Il prend maintenant la charpente des pages Personnage et Staff — une bande
 * floutée, un grand avatar qui mord dessus, le nom en titre — et la bande est tirée de la jaquette
 * du dernier favori : la seule couleur de l'écran reste une jaquette (spec du 2 septembre), et c'est
 * celle que le membre a choisie.
 *
 * Les chiffres sont dans l'en-tête parce qu'ils *sont* l'identité : sur un profil de suivi, « 412
 * œuvres, 6 874 épisodes » en dit plus long sur quelqu'un que la date de son inscription. **Ils ne
 * sont plus encadrés** : quatre tuiles bordées pesaient autant que le nom, alors qu'ils le
 * commentent.
 *
 * **Quatre, et pas six.** La note moyenne et la série de jours en cours appartiennent chacune à un
 * graphe plus bas — la première à l'histogramme des notes, la seconde au calendrier.
 */

const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  month: "long",
  year: "numeric",
});

/** Les grands nombres, espacés par milliers : `6 874` se lit mieux que `6874`. */
const COUNT_FORMAT = new Intl.NumberFormat(LOCALE);

export function ProfileHeader({
  name,
  username,
  image,
  banner,
  memberSince,
  tiles,
}: {
  name: string;
  username: string;
  image: string | null;
  /** La jaquette du dernier favori, floutée en bande. `null` : une surface neutre à la place. */
  banner: string | null;
  memberSince: Date;
  tiles: {
    entries: number;
    episodes: number;
    chapters: number;
    hoursWatched: number;
  };
}) {
  return (
    <header className="flex flex-col gap-6">
      <BlurredBackdrop image={banner} />

      <div className="-mt-20 relative flex flex-col gap-4 sm:-mt-24 sm:flex-row sm:items-end sm:gap-6">
        <UserAvatar
          className="size-24 shadow-lg ring-4 ring-background sm:size-28"
          image={image}
          name={name}
        />

        <div className="flex min-w-0 flex-col gap-1 sm:pb-2">
          {/*
            Le `<h1>` de l'écran porte le nom du membre, pas le mot « Profil » : la page est *à
            propos* de quelqu'un, et un titre générique perdrait cette information pour un lecteur
            d'écran comme dans un historique de navigation.
          */}
          <h1 className="truncate font-bold font-heading text-3xl tracking-tight sm:text-4xl">
            {name}
          </h1>
          <p className="text-muted-foreground text-sm">
            @{username} · membre depuis{" "}
            {MEMBER_SINCE_FORMAT.format(memberSince)}
          </p>
        </div>
      </div>

      {/*
        Une rangée qui s'enroule plutôt qu'une grille : sans cadre, rien n'impose que les quatre
        chiffres tombent en colonnes, et ils se lisent comme une phrase — « 29 œuvres, 583 épisodes ».
      */}
      <dl className="flex flex-wrap gap-x-10 gap-y-4">
        <Stat label="Œuvres suivies" value={tiles.entries} />
        <Stat label="Épisodes vus" value={tiles.episodes} />
        <Stat label="Chapitres lus" value={tiles.chapters} />
        <Stat label="Heures de visionnage" value={tiles.hoursWatched} />
      </dl>
    </header>
  );
}

/**
 * Un chiffre et ce qu'il compte.
 *
 * `<dt>` / `<dd>` : c'est littéralement une liste de définitions, et c'est ce qui fait lire
 * « Œuvres suivies : 412 » à un lecteur d'écran. L'ordre visuel est inversé (`flex-col-reverse`)
 * pour que le chiffre soit au-dessus de son intitulé sans que le balisage ne le précède : en HTML,
 * un `<dd>` avant son `<dt>` n'est pas valide.
 */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-heading font-semibold text-2xl tabular-nums">
        {COUNT_FORMAT.format(value)}
      </dd>
    </div>
  );
}
