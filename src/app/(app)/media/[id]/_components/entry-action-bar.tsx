"use client";

import { BookmarkPlusIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { AddToListDialog } from "@/app/(app)/media/[id]/_components/add-to-list-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ListMembership } from "@/features/lists/server/lists.queries";
import { EntryProgressStepper } from "@/features/tracking/components/entry-progress-stepper";
import { EntryQuickEdit } from "@/features/tracking/components/entry-quick-edit";
import { EntryScoreRating } from "@/features/tracking/components/entry-score-rating";
import { EntryStatusSelect } from "@/features/tracking/components/entry-status-select";
import {
  type EntryDraft,
  entryDraftFrom,
} from "@/features/tracking/lib/entry-draft";
import type { EntryUnit } from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import type { SaveEntryInput } from "@/features/tracking/schemas/tracking.schema";
import { saveEntry } from "@/features/tracking/server/tracking.actions";

/**
 * La barre de suivi de la fiche — **et elle enregistre pour de bon depuis le 6 septembre 2026.**
 *
 * Elle a passé une séance en coquille : ses contrôles répondaient au clic et leur état disparaissait
 * au rechargement, le temps que la mise en page soit validée. Elle lit maintenant l'`Entry` réelle
 * et écrit par `saveEntry`.
 *
 * **Elle a deux états, et c'est la décision d'Alexis du 6 septembre 2026.** Tant que l'œuvre n'est
 * pas dans la bibliothèque, elle ne montre **qu'un bouton d'ajout** : un statut « Prévu », un
 * compteur à zéro et cinq étoiles vides ne décrivent rien — ils décrivent une entrée qui n'existe
 * pas, et donnent à croire qu'on peut noter une œuvre qu'on ne suit pas. Les trois contrôles
 * apparaissent une fois l'entrée créée, c'est-à-dire quand ils ont quelque chose à dire. C'est aussi
 * la case « l'œuvre pas encore suivie, distinguée de l'œuvre suivie à zéro » de
 * .claude/skills/anilist-read/references/fiche-media.md §2.7.
 *
 * **Elle enregistre au geste, là où la fenêtre d'une vignette enregistre au bouton**, et l'écart est
 * décrit dans `entry-draft.ts` avant d'exister ici. La différence n'est pas de goût : sur une fiche,
 * on vient poser *un* geste — cocher un épisode, changer un statut —, et un bouton « Enregistrer »
 * ajouterait une confirmation à une décision déjà prise. Dans une fenêtre, on vient corriger trois
 * choses d'un coup, et une écriture par frappe y serait une écriture par hésitation.
 *
 * **Ce qui part est toujours le seul champ touché**, jamais l'état complet (docs/conception.md §4.2) :
 * c'est ce qui laisse la transition dater la fin d'une série au dernier épisode, et ce qui empêche
 * un onglet ouvert depuis dix minutes d'écraser une progression saisie ailleurs.
 *
 * **Aucun accent sur cette barre, et c'est une décision d'Alexis du 6 septembre 2026.** Elle vaut
 * aussi pour le bouton d'ajout, qui est pourtant seul à l'écran quand il paraît : il est en
 * `secondary`, donc distinct du `outline` de son voisin sans prendre l'accent que la spec réserve à
 * l'action principale d'un écran.
 */

type EntryActionBarProps = {
  /**
   * Le lien vers `/collection/[mediaId]`, rendu par le serveur et posé en fin de rangée.
   *
   * Un emplacement, pas une notion : cette barre parle du **suivi**, et la collection est l'autre
   * axe (docs/conception.md §4.5 — posséder et avoir lu sont indépendants). Lui faire connaître
   * l'étagère pour un lien serait le même couplage que celui que `MediaCard` refuse avec ses
   * `marker` et `action`.
   *
   * Absent sur un anime : on ne collectionne pas des épisodes, et c'est la fiche qui le décide.
   */
  collection?: React.ReactNode;
  /**
   * Le cœur, rendu par le serveur. Un emplacement comme `collection` : la barre parle du suivi, et
   * un favori ne dépend pas du suivi — on peut aimer une œuvre qu'on ne suit pas.
   */
  favorite?: React.ReactNode;
  mediaId: number;
  /**
   * Le titre et la bannière ne servent **qu'à la fenêtre d'édition** : celle-ci les affiche en
   * en-tête, parce qu'ouverte depuis une vignette elle recouvre ce qu'on modifie. Ici, la fiche est
   * juste derrière — mais la fenêtre est la même des deux côtés, et lui faire deux en-têtes selon
   * l'appelant serait deux mises en page à tenir pour un titre qu'on relit sans peine.
   */
  title: string;
  banner: string | null;
  /** Mon suivi tel qu'il est en base. `null` — l'œuvre n'est pas encore suivie — n'affiche que l'ajout. */
  entry: EntryState | null;
  /** Ce qu'on compte : des épisodes sur un anime, des chapitres sur tout le reste. */
  unit: EntryUnit;
  /** Le plafond connu. `null` sur une œuvre en cours, dont AniList ignore le total. */
  total: number | null;
  /**
   * Mes listes, et lesquelles contiennent déjà cette œuvre.
   *
   * Elles **traversent la barre sans qu'elle les regarde**, comme `entry` traverse le hero : c'est
   * la fenêtre de rangement qui s'en sert, et elle est cliente, donc elle ne peut pas aller les
   * chercher elle-même. Un tableau vide est un cas réel — un membre qui n'a encore aucune liste —,
   * et c'est la fenêtre qui sait quoi en dire.
   */
  lists: ListMembership[];
};

/**
 * L'empreinte de ce que le serveur a répondu, pour savoir quand le brouillon doit se recaler.
 *
 * **Une chaîne et pas l'objet lui-même** : chaque rendu serveur en fabrique un nouveau, donc
 * comparer les identités ferait resynchroniser à chaque passage — y compris au milieu d'une frappe,
 * qu'on écraserait. Ici, le brouillon ne se recale que lorsqu'une **valeur** a réellement changé.
 */
function entrySignature(entry: EntryState | null): string {
  if (!entry) return "absente";

  return [
    entry.status,
    entry.progress,
    entry.score,
    entry.repeatCount,
    entry.startedAt?.getTime(),
    entry.finishedAt?.getTime(),
  ].join("|");
}

export function EntryActionBar({
  mediaId,
  title,
  banner,
  entry,
  unit,
  total,
  lists,
  collection,
  favorite,
}: EntryActionBarProps) {
  /**
   * Le brouillon est **local et optimiste**, et il le faut.
   *
   * Le serveur est la source de vérité, mais son aller-retour dure quelques centaines de
   * millisecondes : un pas de progression qui attendrait la réponse pour bouger donnerait
   * l'impression d'un bouton mort. L'affichage suit donc la frappe, l'écriture suit derrière.
   */
  const [draft, setDraft] = useState<EntryDraft>(() => entryDraftFrom(entry));

  /**
   * **Le brouillon se recale sur le serveur dès qu'il a tranché autrement**, pendant le rendu.
   *
   * C'est nécessaire, pas cosmétique : la transition décide de choses que le client n'a pas
   * demandées — passer en « Terminé » au dernier épisode, dater la fin, remettre le curseur à zéro
   * en relecture. Sans ce recalage, l'écran continuait d'afficher ce qu'on avait tapé et il fallait
   * recharger la page pour voir ce qui avait réellement été enregistré. C'est le motif React
   * « ajuster un état quand une propriété change » : corrigé pendant le rendu, sans effet ni
   * second passage à l'écran.
   */
  const signature = entrySignature(entry);
  const [syncedTo, setSyncedTo] = useState(signature);

  if (syncedTo !== signature) {
    setSyncedTo(signature);
    setDraft(entryDraftFrom(entry));
  }

  const save = useAction(saveEntry, {
    onError: ({ error }) =>
      toast.error(
        error.serverError ?? "L'enregistrement n'a pas abouti. Réessayez.",
      ),
  });

  /**
   * Un geste : l'affichage bouge tout de suite, **et le seul champ touché part au serveur**.
   *
   * Les deux moitiés ne portent pas la même chose et c'est voulu — `patch` parle la langue du
   * formulaire (des chaînes, parce qu'un champ à moitié saisi n'a pas d'équivalent numérique),
   * `changes` parle celle du schéma. Les laisser diverger est le seul risque de cette fonction,
   * d'où les deux passés côte à côte à l'appel plutôt que dérivés l'un de l'autre par une
   * conversion qui aurait à deviner.
   */
  const commit = (
    patch: Partial<EntryDraft>,
    changes: Omit<SaveEntryInput, "mediaId">,
  ) => {
    setDraft((current) => ({ ...current, ...patch }));
    save.execute({ mediaId, ...changes });
  };

  /**
   * La progression saisie à la main, envoyée **quand on quitte le champ**.
   *
   * Elle compare à ce qui a été chargé, pas au brouillon : sortir du champ sans y avoir touché ne
   * doit rien envoyer, et rouvrir la page ne doit pas renvoyer la même valeur. Une saisie illisible
   * — champ vidé pour être retapé — est ignorée plutôt que ramenée à zéro, qui inscrirait un recul
   * au journal.
   */
  const flushProgress = () => {
    const parsed = Number.parseInt(draft.progress, 10);

    if (Number.isNaN(parsed) || parsed === (entry?.progress ?? 0)) return;

    save.execute({ mediaId, progress: Math.max(parsed, 0) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entry ? (
        <>
          <EntryStatusSelect
            disabled={save.isPending}
            onValueChange={(status) => commit({ status }, { status })}
            value={draft.status}
          />

          {/*
            **La progression s'affiche à la frappe et s'enregistre au cran ou à la sortie du champ.**

            Enregistrer à chaque caractère écrirait « 1 », « 12 », « 120 » en tapant « 120 » — soit
            trois lignes dans un journal *append-only*, pour un seul geste. Les crans, eux, sont des
            gestes complets et partent immédiatement.

            **D'où le `onBlur`, et il n'est pas décoratif** : sans lui, un nombre tapé à la main ne
            serait jamais enregistré, et le champ redeviendrait le mensonge qu'on vient de retirer à
            cette barre. `blur` remonte en React, donc l'enveloppe l'attrape sans que le pas de
            progression ait à exposer un gestionnaire de plus — la sortie du champ est un événement
            de cette rangée, pas une affaire du composant partagé.
          */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: `blur` est capté par délégation ; la cible réelle est l'`<input>` du pas de progression, qui porte déjà son nom accessible. */}
          <div onBlur={flushProgress}>
            <EntryProgressStepper
              onValueChange={(progress) => {
                const parsed = Number.parseInt(progress, 10);
                const stepped =
                  Math.abs(parsed - Number(draft.progress || 0)) === 1;

                if (!Number.isNaN(parsed) && stepped) {
                  commit({ progress }, { progress: parsed });
                  return;
                }

                setDraft((current) => ({ ...current, progress }));
              }}
              total={total}
              unit={unit}
              value={draft.progress}
            />
          </div>

          <EntryScoreRating
            onScoreChange={(score) => commit({ score }, { score })}
            score={draft.score}
          />

          {/*
            **La fenêtre d'édition complète, la même que sur une vignette** — décision d'Alexis du
            6 septembre 2026. Elle porte ce que cette barre n'a pas et n'aura pas : les deux dates,
            les relectures et les notes personnelles. C'est ce que le menu à trois points promettait
            sans le tenir — « Modifier les dates » y était désactivé —, et c'est pourquoi il part
            avec elle.

            **Elle n'apparaît que sur une œuvre suivie**, avec les contrôles : à côté du bouton
            d'ajout, elle offrirait un second chemin pour le même geste, ce qui défait exactement ce
            que l'état « non suivie » cherche — une seule chose à faire.

            **Elle apporte son propre bouton**, et il tombe juste ici sans réglage : c'est un bouton
            d'icône de taille normale, donc exactement la place et la hauteur que le menu occupait.
            Une propriété `trigger` avait été ajoutée pour rattraper un écart de taille ; le bouton
            ayant été ramené au format normal (décision d'Alexis, même jour), elle n'avait plus
            d'objet et a été retirée.
          */}
          <EntryQuickEdit
            banner={banner}
            entry={entry}
            mediaId={mediaId}
            title={title}
            /*
              L'infobulle est demandée **ici et pas sur les vignettes** : cette rangée aligne
              maintenant trois icônes de suite — crayon, liste, collection — et trois icônes sans
              mot ne se devinent pas. En coin de jaquette, le bouton n'a pas ce problème et son
              survol appartient déjà au panneau d'aperçu.
            */
            tooltip
            total={total}
            unit={unit}
          />
        </>
      ) : (
        /*
          **Un seul geste tant qu'il n'y a rien à décrire.** Il crée l'entrée au statut « Prévu »,
          qui est la valeur par défaut du modèle : c'est le statut qui fait naître la ligne
          (`entry-draft.ts`), et l'affiner est le geste suivant, une fois les contrôles à l'écran.
        */
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled={save.isPending}
              onClick={() => save.execute({ mediaId, status: "PLANNING" })}
              variant="secondary"
            >
              {save.isPending ? (
                <Spinner />
              ) : (
                <BookmarkPlusIcon data-icon="inline-start" />
              )}
              Ajouter à ma bibliothèque
            </Button>
          </TooltipTrigger>
          {/*
            L'infobulle dit ce que le libellé ne dit pas : **quel** statut ce clic pose. « Prévu »
            est la valeur par défaut du modèle, et c'est elle qui fait naître la ligne.
          */}
          <TooltipContent>
            Crée le suivi au statut « Prévu ». Le reste s'affine ensuite.
          </TooltipContent>
        </Tooltip>
      )}

      {/*
        **Ce bouton faisait semblant depuis la refonte.** Il porte maintenant la fenêtre de
        rangement — une case par liste, cochée quand l'œuvre y est déjà. Il garde son icône et son
        libellé : c'est le geste qu'il annonçait, il le tient enfin.
      */}
      {favorite}

      <AddToListDialog lists={lists} mediaId={mediaId} title={title} />

      {collection}
    </div>
  );
}
