"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
};

export function EntryQuickEdit({
  mediaId,
  title,
  banner,
  entry,
  unit,
  total,
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

  return (
    <Dialog onOpenChange={openChange} open={open}>
      <DialogTrigger asChild>
        {/*
          **Une icône seule, à la taille normale d'un bouton d'icône** — décision d'Alexis du
          6 septembre 2026. Elle a d'abord été posée plus petite (28 px), puis ramenée à `size-9` :
          c'est la même taille partout, en coin de jaquette comme dans la rangée de la fiche, et
          c'est ce qui a permis de retirer la propriété `trigger` qui n'existait que pour rattraper
          l'écart.

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
          size="icon"
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
              <DateField
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
              <DateField
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
 * Une date du suivi, dans le format que produit un `<input type="date">`.
 *
 * Une **chaîne** et pas un `Date`, comme dans `EntryDraft` : c'est ce que le navigateur envoie, et
 * une date sérialisée puis désérialisée à travers la frontière client/serveur est une source
 * d'écarts de fuseau pour rien (`entry-draft.ts`). La conversion se fait côté serveur, une fois.
 *
 * **Une date vide n'est pas un effacement tant qu'on n'y touche pas.** `entryDraftChanges` compare
 * au chargé : un champ laissé vide sur une œuvre sans date ne part pas, ce qui laisse la transition
 * dater la fin au dernier épisode. C'est la règle « automatique par défaut, rattrapable à la main »
 * du §4.2, et elle tient parce que le brouillon envoie des différences, jamais un état complet.
 */
function DateField({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Input
      className="w-full"
      onChange={(event) => onValueChange(event.target.value)}
      type="date"
      value={value}
    />
  );
}

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
