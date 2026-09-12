import { UserAvatar } from "@/components/shared/user-avatar";
import { LOCALE, TIMEZONE } from "@/config/locale";

/**
 * L'identité d'un membre, et les quatre chiffres qui résument son suivi.
 *
 * **Composant serveur** : il ne rend que du texte et un avatar. Rien ici n'a besoin d'hydratation.
 *
 * Les chiffres sont dans l'en-tête et non dans une rangée de cartes séparées parce qu'ils *sont*
 * l'identité : sur un profil de suivi, « 412 œuvres, 6 874 épisodes » en dit plus long sur
 * quelqu'un que la date de son inscription.
 *
 * **Quatre, et pas six.** La note moyenne et la série de jours en cours existent aussi, mais elles
 * appartiennent chacune à un graphe plus bas — la première à l'histogramme des notes, la seconde au
 * calendrier. Les remonter ici les couperait de ce qu'elles commentent, et une rangée de six
 * chiffres ne se lit plus : on la balaye.
 */

const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  month: "long",
  year: "numeric",
});

/**
 * Les grands nombres, espacés par milliers.
 *
 * `6874` et `6 874` ne se lisent pas au même rythme, et cet écran n'affiche presque que des
 * nombres à quatre chiffres. Le fuseau ne joue aucun rôle ici, mais la locale si : c'est elle qui
 * met une espace insécable là où l'anglais met une virgule.
 */
const COUNT_FORMAT = new Intl.NumberFormat(LOCALE);

export function ProfileHeader({
  name,
  username,
  image,
  memberSince,
  tiles,
}: {
  name: string;
  username: string;
  image: string | null;
  memberSince: Date;
  tiles: {
    entries: number;
    episodes: number;
    chapters: number;
    hoursWatched: number;
  };
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <UserAvatar className="size-16" image={image} name={name} />

        <div className="flex flex-col gap-0.5">
          {/*
            Le `<h1>` de l'écran porte le nom du membre, pas le mot « Profil » : la page est *à
            propos* de quelqu'un, et un titre générique perdrait cette information pour un lecteur
            d'écran comme dans un historique de navigation.
          */}
          <h1 className="text-2xl">{name}</h1>
          <p className="text-muted-foreground text-sm">
            @{username} · membre depuis{" "}
            {MEMBER_SINCE_FORMAT.format(memberSince)}
          </p>
        </div>
      </div>

      {/*
        Deux colonnes sur téléphone, quatre dès `sm` : à quatre colonnes sous 380 px, « Chapitres
        lus » se coupe en trois lignes et la rangée cesse de se lire comme une rangée.
      */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
        <Tile label="Œuvres suivies" value={tiles.entries} />
        <Tile label="Épisodes vus" value={tiles.episodes} />
        <Tile label="Chapitres lus" value={tiles.chapters} />
        <Tile label="Heures de visionnage" value={tiles.hoursWatched} />
      </dl>
    </div>
  );
}

/**
 * Un chiffre et ce qu'il compte.
 *
 * `<dt>` / `<dd>` plutôt que deux `<div>` : c'est littéralement une liste de définitions, et c'est
 * ce qui fait lire « Œuvres suivies : 412 » à un lecteur d'écran au lieu de deux fragments posés
 * l'un sous l'autre.
 *
 * L'ordre visuel est inversé (`flex-col-reverse`) pour que le chiffre soit au-dessus de son
 * intitulé sans que le balisage ne le précède : en HTML, un `<dd>` avant son `<dt>` n'est pas
 * valide.
 */
function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse gap-1 bg-background p-4">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      {/*
        `tabular-nums` : quatre chiffres cadrés sur des chasses variables font danser la rangée
        d'une tuile à l'autre. C'est le genre de détail qu'on ne voit pas et qu'on sent.
      */}
      <dd className="font-heading text-2xl tabular-nums">
        {COUNT_FORMAT.format(value)}
      </dd>
    </div>
  );
}
