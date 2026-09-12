"use client";

import { CalendarIcon, PencilIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { fr } from "react-day-picker/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TIMEZONE } from "@/config/locale";
import { EntryProgressStepper } from "@/features/tracking/components/entry-progress-stepper";
import { EntryScoreRating } from "@/features/tracking/components/entry-score-rating";
import { EntryStatusSelect } from "@/features/tracking/components/entry-status-select";
import {
  type EntryDraft,
  entryDraftChanges,
  entryDraftFrom,
} from "@/features/tracking/lib/entry-draft";
import type { EntryUnit } from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import { saveEntry } from "@/features/tracking/server/tracking.actions";

/**
 * L'édition rapide du suivi, **depuis une vignette** — le bouton posé sur la jaquette, et la
 * fenêtre qu'il ouvre.
 *
 * ⚠️ **Rien n'est enregistré.** Le brouillon vit dans ce composant, le temps de la fenêtre, et
 * disparaît à la fermeture comme au rechargement. C'est l'ordre de la séance et pas un oubli : la
 * mise en page se valide avant qu'on écrive la première Server Action du dépôt, pour ne pas avoir à
 * défaire une mécanique posée sur un écran qui bouge encore. Le même avertissement est porté par
 * `entry-action-bar.tsx` sur la fiche, et les deux tomberont ensemble.
 *
 * **Le brouillon est un `EntryDraft`, pas trois `useState` choisis.** `entryDraftFrom` et
 * `entryDraftChanges` (`entry-draft.ts`) existent pour cette fenêtre précisément — leur docstring
 * la nomme : « la fenêtre d'une vignette enregistre **au bouton** », par opposition au panneau de la
 * fiche qui enregistre au geste. Ils sont testés, et c'est eux qui garantiront l'invariant du §4.2 :
 * on n'envoie jamais l'état complet, seulement ce qui a bougé. Un onglet ouvert depuis dix minutes
 * qui réécrirait ses huit champs effacerait, en cochant « favori », une progression saisie ailleurs
 * entre-temps.
 *
 * **Il vit dans `features/tracking/components/` depuis que `/search` l'ouvre aussi.** Il avait
 * démarré dans le `_components/` de `/library`, et il en est monté **au deuxième appelant** — pas
 * avant, pas « puisqu'on y était ». C'est la règle de promotion d'ARCHITECTURE.md, la même qui a
 * fait monter `MediaCard`, la grille et la pagination.
 *
 * **Les trois contrôles viennent d'à côté, aucun n'est réécrit.** Ils avaient été promus d'avance,
 * en connaissance de cause, exactement pour ce deuxième appelant (docs/STATE.md) : c'est ici que la
 * dette est remboursée. Ce fichier ne porte que l'assemblage — la disposition propre à une fenêtre,
 * qui n'a rien à faire dans la rangée de la fiche.
 *
 * **Îlot client, et le plus petit possible.** `MediaCard` reste un Server Component : poser
 * `"use client"` sur elle embarquerait la grille entière — vingt et une jaquettes, leurs titres,
 * leur mise en page — dans le bundle pour un bouton. Seul ce fichier y part.
 */

type EntryQuickEditProps = {
  /**
   * L'œuvre concernée. C'est la seule clé que l'action reçoit — elle relit tout le reste en base,
   * y compris le plafond de progression, parce que rien de ce qui vient du navigateur ne fait
   * autorité (`tracking.actions.ts`).
   */
  mediaId: number;
  /**
   * Le titre affiché, tel que la carte le montre.
   *
   * Il sert deux fois, et pas au même public : en en-tête de la fenêtre, pour qu'on sache ce qu'on
   * modifie une fois la jaquette masquée par la surcouche ; et dans le nom accessible du bouton,
   * qui n'a plus que ça — il est réduit à une icône, et « Modifier » vingt et une fois de suite ne
   * distinguerait rien.
   */
  title: string;
  /** La bannière de l'œuvre. `null` sur la plupart des mangas — le cas est traité, pas subi. */
  banner: string | null;
  /**
   * Mon suivi, tel qu'il est en base — **ou `null` quand l'œuvre n'est pas encore suivie**.
   *
   * Les deux cas ouvrent la même fenêtre et c'est voulu : le geste est le même, seul le point de
   * départ change. `entryDraftFrom(null)` part de l'entrée neuve (`INITIAL_ENTRY`), et c'est déjà
   * ce que fait la fiche. Ce qui change vraiment, c'est ce qu'on **annonce** : « ajouter » n'est
   * pas « modifier », et le nom accessible du bouton le dit.
   */
  entry: EntryState | null;
  /** Ce qu'on compte : des épisodes sur un anime, des chapitres sur tout le reste. */
  unit: EntryUnit;
  /** Le plafond connu. `null` sur une œuvre en cours, dont AniList ignore le total. */
  total: number | null;
  /**
   * Le bouton est-il **posé sur une jaquette** plutôt que dans une rangée de contrôles.
   *
   * C'est la seule chose que l'appelant règle ici, et la fenêtre qu'il ouvre est identique des deux
   * côtés. Sur la fiche, le bouton vit dans une rangée où tout fait 36 px de haut — le sélecteur de
   * statut, le pas de progression — et il doit garder cette hauteur, sinon il dépasse ou flotte.
   * Sur une vignette, il n'a aucun voisin à aligner : il se pose dans un coin de jaquette large de
   * 140 px, où 36 px de bouton mangent un quart de la largeur de l'illustration.
   *
   * D'où deux tailles et pas une (décision d'Alexis, 6 septembre 2026) — la propriété `trigger`
   * retirée le matin même laissait l'appelant redéfinir le bouton entier ; celle-ci ne lui laisse
   * que le choix qu'il a vraiment à faire.
   */
  compact?: boolean;
};

export function EntryQuickEdit({
  mediaId,
  title,
  banner,
  entry,
  unit,
  total,
  compact = false,
}: EntryQuickEditProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EntryDraft>(() => entryDraftFrom(entry));

  /**
   * L'action, et l'état de son aller-retour.
   *
   * `useAction` de next-safe-action porte `isPending` — ce qui désarme le bouton pendant
   * l'écriture, sans quoi un double clic enverrait deux fois le même geste — et `onSuccess`, qui
   * referme la fenêtre seulement quand le serveur a répondu. Refermer au clic aurait montré une
   * fermeture réussie sur une écriture échouée.
   */
  const { execute, isPending } = useAction(saveEntry, {
    onSuccess: () => setOpen(false),
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "L'enregistrement n'a pas abouti. Réessayez.",
      ),
  });

  /**
   * Le brouillon **repart de la base à chaque ouverture**.
   *
   * Sans ça, annuler puis rouvrir montrerait les modifications qu'on vient justement d'abandonner —
   * et le prochain « Enregistrer » les enverrait sans qu'on les ait revues. C'est la remise à zéro
   * qui donne son sens au bouton « Annuler ».
   */
  const openChange = (next: boolean) => {
    if (next) setDraft(entryDraftFrom(entry));
    setOpen(next);
  };

  /** Une modification d'un seul champ, sans réécrire les sept autres. */
  const edit = (patch: Partial<EntryDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  /**
   * **On envoie la différence, jamais l'état complet** (docs/PRODUCT.md §4.2).
   *
   * `entryDraftChanges` compare le brouillon à ce qui a été chargé et ne rend que ce qui a bougé.
   * C'est ce qui laisse la transition dater la fin d'une série au dernier épisode alors que le
   * champ affichait une date vide : ne pas l'avoir touchée n'est pas l'avoir effacée. Et c'est ce
   * qui évite qu'un onglet ouvert depuis dix minutes réécrive, en cochant une case, une progression
   * saisie ailleurs entre-temps.
   */
  const save = () => execute({ mediaId, ...entryDraftChanges(entry, draft) });

  /**
   * La borne « pas de date future », relue à chaque rendu plutôt que figée à l'ouverture.
   *
   * Un onglet laissé ouvert la nuit franchit minuit : figée, la borne interdirait de dater
   * d'aujourd'hui le lendemain matin. Il n'y a pas d'écart d'hydratation à craindre malgré
   * l'appel à `new Date()` — cette valeur n'est lue que dans `DialogContent`, qui n'est monté
   * qu'une fois la fenêtre ouverte, donc jamais au rendu serveur.
   */
  const today = TODAY_IN_PARIS.format(new Date());

  return (
    <Dialog onOpenChange={openChange} open={open}>
      <DialogTrigger asChild>
        {/*
          **Une icône seule, et deux tailles selon l'endroit** (voir `compact`) : 36 px dans la
          rangée de la fiche, où elle s'aligne sur ses voisins ; 32 px en coin de jaquette, où elle
          n'a personne à qui s'aligner et où chaque pixel est pris à l'illustration.

          Sur une vignette, elle remplace une barre pleine largeur portant « Modifier », montée
          depuis le bas au survol : celle-ci marchait, mais elle demandait un tiers de la jaquette et
          ne se transposait pas au catalogue, où la plupart des cartes ne sont pas encore suivies.

          **Deux icônes et pas une, parce que ce ne sont pas deux fois le même geste** : un crayon
          modifie ce qui existe, un plus crée ce qui n'existe pas. Sur `/search`, où la plupart des
          résultats ne sont dans aucune bibliothèque, c'est **la seule information de la carte qui
          dise « celle-là, tu ne l'as pas »** en dehors de la pastille absente. Le nom accessible dit
          déjà la même chose, en toutes lettres ; l'icône la donne à l'œil.

          `outline` et pas d'accent : la règle est celle de la barre de la fiche (même décision, même
          jour) — un bouton plein tire l'œil plus que la jaquette, et vingt et un d'entre eux
          feraient de la grille un damier.
        */}
        <Button
          aria-label={
            entry
              ? `Modifier le suivi de ${title}`
              : `Ajouter ${title} à ma bibliothèque`
          }
          size={compact ? "icon-sm" : "icon"}
          variant="outline"
        >
          {entry ? <PencilIcon /> : <PlusIcon />}
        </Button>
      </DialogTrigger>

      {/*
        **Plus large que le défaut, parce que le contenu l'est.** `sm:max-w-md` tient trois contrôles
        empilés ; il n'en tient pas trois de front. `sm:max-w-2xl` est la première taille où le pas
        de progression et un champ de date cohabitent sur une ligne sans se comprimer.

        `p-0` et le rembourrage repoussé dans le corps : c'est ce qui laisse la bannière toucher les
        trois bords du haut. Un `-mx-6 -mt-6` sur la bannière aurait fait la même chose en
        obligeant chaque futur enfant à connaître le rembourrage qu'il annule.

        **La hauteur maximale et le défilement ne sont pas une précaution.** `DialogContent` est
        `fixed top-1/2 -translate-y-1/2` sans plafond : sur 390 × 844, la fenêtre dépliée en une
        colonne mesurait plus haut que l'écran, et elle débordait **des deux côtés à la fois** — la
        bannière rognée en haut, « Annuler » coupé en bas, donc inatteignable. Vu à l'écran, et
        invisible en 1440 où le contenu tient. `dvh` et non `vh` : sur mobile, la barre d'adresse
        mange une partie de `vh` et le pied serait sous elle.

        **`overflow-x-hidden` va avec, et ce n'est pas de la superstition.** En CSS, dès qu'un axe
        n'est plus `visible`, l'autre passe à `auto` : la barre verticale a rétréci la boîte de dix-
        neuf pixels sans que la grille se recalcule, et une **barre horizontale fantôme** est apparue
        sous le pied en 390. Mesuré — `scrollWidth` 362 contre `clientWidth` 343, soit exactement la
        largeur de l'autre barre. Rien ici n'est censé défiler latéralement : la grille retombe sur
        une colonne, le texte des notes revient à la ligne, le titre est tronqué.
      */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-2xl">
        <EntryQuickEditBanner src={banner} />

        {/*
          Le rembourrage du corps est plus court que celui d'une fenêtre shadcn ordinaire, et les
          écarts verticaux avec — décision d'Alexis. Cette fenêtre n'est pas une boîte de dialogue à
          une question : c'est un formulaire de huit champs, et le rythme large qui met en valeur une
          phrase la fait ici déborder de l'écran pour rien.
        */}
        <div className="flex flex-col gap-4 p-4">
          {/*
            `pr-8` réserve la place de la croix de fermeture, qui est posée en absolu par
            `DialogContent`. Sans elle, un titre long — et le catalogue en est plein — glisse
            dessous : `truncate` le coupe au bord de son conteneur, pas au bord du bouton.
          */}
          <DialogHeader className="gap-1 pr-8">
            <DialogTitle className="truncate">{title}</DialogTitle>
            {/*
              Une ligne, parce qu'elle ne sert qu'à dire où va le reste. La version longue énumérait
              les dates, les notes personnelles et le journal — or les dates et les notes sont ici
              désormais, et il ne reste vraiment que le journal.
            */}
            <DialogDescription>
              Le journal de cette œuvre se lit sur sa fiche.
            </DialogDescription>
          </DialogHeader>

          {/*
            **Trois colonnes, et la disposition est dictée** (Alexis, 6 septembre 2026) : statut,
            progression et date de début sur la première ligne ; note, relectures et date de fin sur
            la seconde ; les notes personnelles en dessous, sur toute la largeur.

            La logique de lecture est verticale autant qu'horizontale — la première colonne porte
            « où j'en suis », la deuxième « combien », la troisième « quand » — et c'est ce qui rend
            l'appariement début/fin lisible sans qu'un trait ait à le dire.

            **Chaque contrôle remplit sa colonne** (`w-full` partout) : à largeur naturelle, les
            trois colonnes se terminaient à trois abscisses différentes et la grille ne se lisait
            plus comme une grille. C'est ce qui a valu aux trois contrôles de `tracking` une largeur
            négociable.

            En dessous de `sm`, tout retombe sur une colonne : trois contrôles de front sur 390 px
            donneraient trois contrôles illisibles.
          */}
          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-3">
            <Field label="Statut">
              <EntryStatusSelect
                className="w-full"
                onValueChange={(status) => edit({ status })}
                value={draft.status}
              />
            </Field>

            <Field
              label={unit === "episode" ? "Épisodes vus" : "Chapitres lus"}
            >
              <EntryProgressStepper
                className="w-full"
                onValueChange={(progress) => edit({ progress })}
                total={total}
                unit={unit}
                value={draft.progress}
              />
            </Field>

            <Field label="Commencé le">
              {/*
                Deux bornes hautes, dont la plus contraignante gagne : on ne commence pas dans le
                futur, et on ne commence pas après avoir fini. La seconde ne s'applique que quand
                la date de fin est renseignée — sur une série en cours, il n'y a rien à borner.
              */}
              <DateField
                label="la date de début"
                max={earliest(today, draft.finishedAt)}
                onValueChange={(startedAt) => edit({ startedAt })}
                value={draft.startedAt}
              />
            </Field>

            <Field label="Ma note">
              <EntryScoreRating
                className="w-full"
                onScoreChange={(score) => edit({ score })}
                score={draft.score}
              />
            </Field>

            <Field label="Relectures">
              {/*
                Un champ nu plutôt qu'un pas à deux boutons : on ne relit pas une série assez souvent
                pour avoir besoin d'un « +1 », et le compteur monte de toute façon **tout seul**
                quand une relecture se termine (`entry-transition.ts`). Ce champ est là pour
                rattraper un historique, pas pour compter au fil de l'eau.
              */}
              <Input
                aria-label="Nombre de relectures"
                autoComplete="off"
                className="w-full font-mono tabular-nums"
                inputMode="numeric"
                onChange={(event) =>
                  edit({ repeatCount: event.target.value.replace(/\D/g, "") })
                }
                value={draft.repeatCount}
              />
            </Field>

            <Field label="Terminé le">
              {/*
                Le pendant du champ précédent : on ne finit pas dans le futur, et on ne finit pas
                avant d'avoir commencé. Les deux contraintes sont donc posées **une fois chacune**,
                de part et d'autre, plutôt que dupliquées — c'est ce qui les empêche de diverger.
              */}
              <DateField
                label="la date de fin"
                max={today}
                min={draft.startedAt || undefined}
                onValueChange={(finishedAt) => edit({ finishedAt })}
                value={draft.finishedAt}
              />
            </Field>

            {/*
              Les notes prennent les trois colonnes : c'est du texte libre, et deux lignes de
              soixante caractères ne s'écrivent pas dans un tiers de fenêtre.
            */}
            <div className="sm:col-span-3">
              <Field label="Mes notes">
                <Textarea
                  className="min-h-16 resize-y"
                  onChange={(event) => edit({ notes: event.target.value })}
                  placeholder="Ce que j'en ai pensé, où j'en étais, ce qu'il faut que je me rappelle…"
                  value={draft.notes}
                />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isPending} variant="outline">
                Annuler
              </Button>
            </DialogClose>
            {/*
              Désarmé pendant l'aller-retour : sans ça, un double clic envoie deux fois le même
              geste, et le journal garde deux lignes pour une seule décision — or il est
              *append-only*, donc la seconde ne se retire pas.
            */}
            <Button disabled={isPending} onClick={save}>
              {isPending ? <Spinner /> : null}
              {entry ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * La bannière de la fenêtre — pleine largeur, et **absente quand il n'y en a pas.**
 *
 * AniList n'a de bannière que sur une partie des animes : elle manque sur la plupart des mangas et
 * des webtoons (docs/fiche-media.md §1.1), c'est-à-dire sur une bonne moitié d'une bibliothèque.
 *
 * **Rien du tout plutôt qu'une bande vide**, et c'est l'inverse du choix fait sur la fiche. Là-bas
 * la bannière absente laisse une bande de `surface-raised`, parce qu'elle sépare l'en-tête collant
 * du contenu et que la jaquette empiète dessus : elle a un rôle même sans image. Ici elle n'en a
 * aucun — le titre est juste en dessous, dans une fenêtre qui a déjà ses bords —, et vu à l'écran,
 * cent douze pixels de gris au-dessus du titre se lisent comme une image qui n'a pas chargé.
 *
 * `aria-hidden` : elle ne dit rien que le titre juste en dessous ne dise mieux.
 */
function EntryQuickEditBanner({ src }: { src: string | null }) {
  if (!src) return null;

  return (
    <div
      aria-hidden
      className="relative h-20 overflow-hidden rounded-t-xl bg-surface-raised sm:h-28"
    >
      <Image
        alt=""
        className="object-cover"
        fill
        // Elle occupe toute la largeur de la fenêtre, qui est bornée à `max-w-2xl` : demander
        // `100vw` ferait servir une image de bureau pour une bande de 672 px au plus.
        sizes="(min-width: 640px) 42rem, 100vw"
        src={src}
      />

      {/*
        Le fondu vers le fond de la fenêtre efface la couture avec le titre, sans qu'aucun trait
        n'ait à la masquer. `to-popover` et non `to-background` : c'est la surface d'une fenêtre,
        pas celle de la page.

        **Le haut est assombri plus que le milieu, et c'est pour le bouton de fermeture.** Il se
        pose sur la bannière, en `ghost`, donc sans surface à lui : sur une bannière claire — celle
        de Witch Hat Atelier est presque crème — il disparaissait dans l'illustration. Même
        raisonnement que le premier des deux dégradés de `media-banner.tsx`, qui protège l'en-tête
        collant de la fiche.
      */}
      <div className="absolute inset-0 bg-linear-to-b from-popover/70 via-popover/20 to-popover" />
    </div>
  );
}

/**
 * « Aujourd'hui », **à Paris**, au format d'un `<input type="date">`.
 *
 * Le fuseau est explicite parce que `config/locale.ts` l'exige de tout `Intl.*` du projet : sans
 * lui, « aujourd'hui » vaudrait le jour du serveur au rendu et celui du visiteur à l'hydratation.
 * Ici la borne sert à interdire les dates futures, et une borne qui bascule d'un jour selon
 * l'endroit d'où l'on regarde n'est pas une borne.
 *
 * `en-CA` est la locale dont le format court **est** `AAAA-MM-JJ` : c'est le seul endroit du dépôt
 * où l'on ne passe pas `LOCALE`, parce qu'on ne produit pas du texte à lire mais la valeur d'un
 * `<input>`, dont le format est imposé par HTML et non par la langue de l'interface.
 */
const TODAY_IN_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * `AAAA-MM-JJ` → la `Date` **locale** que react-day-picker manipule, posée à midi.
 *
 * Midi et non minuit : le calendrier compare des jours civils locaux, et une date construite à
 * minuit bascule la veille au moindre décalage — c'est le même piège que le stockage à midi UTC
 * décrit dans `entry-draft.ts`, à l'autre bout de la chaîne.
 *
 * Rend `undefined` sur une chaîne vide ou à moitié saisie : le champ reste la source, et un
 * `<input type="date">` en cours de frappe passe par des valeurs qui ne sont pas des dates.
 */
function parseDateInputValue(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return undefined;
  }

  return new Date(year, month - 1, day, 12);
}

/** La réciproque : accesseurs **locaux**, pour rester symétrique de la construction ci-dessus. */
function toDateInputValue(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Le plus petit des deux, en ignorant les vides — pour composer deux bornes hautes.
 *
 * Les chaînes `AAAA-MM-JJ` se comparent dans l'ordre lexicographique, qui est ici l'ordre
 * chronologique : c'est la propriété qui fait de ce format la bonne représentation, et elle
 * dispense de convertir en `Date` pour trancher.
 */
function earliest(...values: Array<string | undefined>): string | undefined {
  // Prédicat de type explicite : sans lui, `filter` rend toujours `Array<string | undefined>` et
  // la comparaison ci-dessous porterait sur des valeurs que TypeScript croit encore absentes.
  const dates = values.filter(
    (value): value is string => value !== undefined && value !== "",
  );

  return dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : undefined;
}

/**
 * Une date du suivi : un champ qui se tape, et un calendrier qui le remplit.
 *
 * Une **chaîne** `AAAA-MM-JJ` et pas un `Date`, comme dans `EntryDraft` : c'est ce que le
 * navigateur envoie, et une date sérialisée puis désérialisée à travers la frontière client/serveur
 * est une source d'écarts de fuseau pour rien (`entry-draft.ts`). La conversion se fait côté
 * serveur, une fois. **Le contrat n'a donc pas bougé** en passant au calendrier, et les six écrans
 * qui ouvrent cette fenêtre n'ont rien à savoir du changement.
 *
 * **Les deux moyens de saisie coexistent, et aucun n'est décoratif.** Le champ reste un
 * `<input type="date">` : on tape « 12/03/2024 » d'une traite quand on connaît la date, ce qu'un
 * calendrier seul rendrait impossible — douze clics pour remonter un an. Le calendrier sert
 * l'autre moitié des cas : « c'était le week-end dernier », qu'on ne sait pas dater mais qu'on sait
 * reconnaître. L'indicateur natif de Chrome est masqué pour qu'il n'y ait **qu'une** icône de
 * calendrier dans le champ, la nôtre — deux affordances pour le même geste se lisent comme deux
 * gestes différents.
 *
 * **Les bornes sont posées aux deux endroits**, et il le faut : `min`/`max` sur l'`<input>` valent
 * pour la frappe, `disabled` sur le calendrier vaut pour le clic. N'en poser qu'une laisserait
 * l'autre chemin produire ce que le premier refuse. Ce sont des garde-fous de saisie, pas une
 * validation : `tracking.actions.ts` reste seul juge, parce que rien de ce qui vient du navigateur
 * ne fait autorité.
 *
 * **Une date vide n'est pas un effacement tant qu'on n'y touche pas.** `entryDraftChanges` compare
 * au chargé : un champ laissé vide sur une œuvre sans date ne part pas, ce qui laisse la transition
 * dater la fin au dernier épisode. C'est la règle « automatique par défaut, rattrapable à la main »
 * du §4.2, et elle tient parce que le brouillon envoie des différences, jamais un état complet.
 */
function DateField({
  value,
  onValueChange,
  label,
  min,
  max,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Le nom accessible du champ et de son bouton.
   *
   * L'intitulé visible est porté par `Field`, qui rend un `<p>` et non un `<label>` — il n'y a donc
   * pas de `for` pour relier les deux (voir `Field`). Sans ce nom, un lecteur d'écran annonce deux
   * champs de date identiques et un bouton « calendrier » qui ne dit pas lequel il ouvre.
   */
  label: string;
  /** Bornes **incluses**, au même format. `undefined` quand il n'y a rien à borner de ce côté. */
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = parseDateInputValue(value);
  const minDate = min ? parseDateInputValue(min) : undefined;
  const maxDate = max ? parseDateInputValue(max) : undefined;

  /*
    Un **tableau** de matchers, et non `{ before, after }` en un seul objet : cette forme-là est un
    `DateInterval` chez react-day-picker, qui désigne l'intérieur de l'intervalle — soit exactement
    l'inverse de ce qu'on veut désarmer. Un tableau, lui, s'entend comme une union : un jour est
    désarmé s'il tombe sous l'un des matchers.
  */
  const disabled = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <InputGroup>
      <InputGroupInput
        aria-label={label}
        // L'indicateur natif ferait doublon avec le bouton juste à sa droite.
        className="[&::-webkit-calendar-picker-indicator]:hidden"
        max={max}
        min={min}
        onChange={(event) => onValueChange(event.target.value)}
        type="date"
        value={value}
      />

      <InputGroupAddon align="inline-end">
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <InputGroupButton
              aria-label={`Choisir ${label} dans un calendrier`}
              size="icon-xs"
            >
              <CalendarIcon />
            </InputGroupButton>
          </PopoverTrigger>

          {/*
            `w-auto p-0` : le calendrier porte son propre rembourrage et sa propre largeur, et la
            largeur par défaut d'un `PopoverContent` le comprimerait.
          */}
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              /*
                Le focus part dans la grille à l'ouverture : sans lui, le calendrier s'ouvre au
                clavier sans qu'on puisse s'y déplacer, et il ne serait qu'un ornement pour qui
                n'utilise pas la souris.
              */
              autoFocus
              /*
                Les mois et les années en listes déroulantes. Une série commencée en 2019 est à
                quatre-vingts clics de flèche du mois courant — et c'est précisément le cas où l'on
                vient rattraper un historique, donc celui qu'il ne faut pas punir.
              */
              captionLayout="dropdown"
              /*
                On ouvre sur le mois de la date saisie ; à défaut, sur celui de la borne haute —
                c'est-à-dire aujourd'hui, ou le jour de fin quand il est déjà connu. Ouvrir sur le
                mois courant alors que tout y est désarmé montrerait une grille entièrement grise.
              */
              defaultMonth={selected ?? maxDate}
              disabled={disabled}
              endMonth={maxDate}
              locale={fr}
              mode="single"
              onSelect={(date) => {
                onValueChange(date ? toDateInputValue(date) : "");
                setOpen(false);
              }}
              selected={selected}
              startMonth={minDate ?? OLDEST_SELECTABLE_MONTH}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}

/**
 * Le plancher des listes déroulantes du calendrier.
 *
 * `captionLayout="dropdown"` a besoin d'un intervalle fini pour remplir sa liste d'années. 1960
 * n'est pas une date ronde choisie au hasard : c'est avant *Astro Boy* (1963), donc avant la
 * première série animée télévisée japonaise. Rien de ce que ce catalogue peut contenir n'a pu être
 * commencé avant.
 */
const OLDEST_SELECTABLE_MONTH = new Date(1960, 0);

/**
 * Une ligne du formulaire : son intitulé, puis son contrôle.
 *
 * Un `<p>` et non un `<label>` : la moitié de ces contrôles ne sont pas un champ unique auquel un
 * `for` pourrait pointer — le pas de progression est un groupe de trois éléments, la note en est
 * douze. Chacun porte déjà son propre nom accessible, et un `<label>` qui n'étiquette rien en
 * ajouterait un second, contradictoire.
 *
 * `justify-between` sur la colonne : sur une ligne où un contrôle est plus haut que ses voisins —
 * le pas de progression contre un champ de date —, les contrôles restent alignés par le bas au lieu
 * de flotter chacun sous son intitulé.
 */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-1.5">
      <p className="text-muted-foreground text-sm">{label}</p>
      {children}
    </div>
  );
}
