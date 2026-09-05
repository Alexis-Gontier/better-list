"use client";

import { CloudOffIcon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

/**
 * L'avis de coupure AniList — **posé une fois dans le layout, valable pour tout le site.**
 *
 * C'est un état réel du produit, pas une exception (spec du 2 septembre) : AniList a coupé son API
 * en pleine journée le 15 août 2026, et de nouveau le 5 septembre. Sans cet écran, la fiche serait
 * une page d'erreur et le suivi — qui n'a besoin de rien d'AniList — deviendrait inatteignable
 * pour la durée de la panne.
 *
 * Il vit **au-dessus de l'en-tête** : l'incident ne concerne pas la page qu'on regarde mais
 * l'application entière, et le dire dans la colonne de contenu le ferait passer pour un défaut de
 * l'œuvre affichée. Aucune couleur — un bandeau d'accent pour une panne d'API tierce lui donnerait
 * la place que prend l'action en cours —, et un ton factuel : rien n'est cassé chez nous.
 *
 * ## Deux sources, parce qu'une seule ne suffit pas
 *
 * 1. **`initialDown`**, lu par le serveur au rendu du layout (`isAniListDown`). C'est ce qui rend
 *    le bandeau global : il apparaît sur `/settings` comme sur `/lists`, qui n'interrogent jamais
 *    AniList et ne peuvent rien constater par elles-mêmes.
 * 2. **Ce que la page rapporte**, par `ReportAniListStatus`. Il en faut une deuxième parce qu'un
 *    layout **ne se re-rend pas** lors d'une navigation client : sans elle, une panne découverte
 *    en ouvrant une fiche ne s'afficherait qu'au prochain rechargement complet — et le retour du
 *    service ne se verrait pas davantage.
 *
 * L'ancienne version portait ce bandeau depuis la fiche, par un portail vers une fente du layout.
 * Ça marchait, mais seule `/media/[id]` savait le faire : la panne était globale, son affichage
 * ne l'était pas.
 */

/**
 * Ce que le navigateur sait de la panne, **hors de React**.
 *
 * Un store externe plutôt qu'un contexte : le rapporteur et le bandeau sont à deux bouts de
 * l'arbre — l'un sous le layout, l'autre au fond d'une page — et un contexte aurait obligé à
 * envelopper toute l'application pour relier deux composants qui ne se rendent jamais ensemble.
 */
let reportedDown: boolean | null = null;
const listeners = new Set<() => void>();

function setReportedDown(next: boolean) {
  if (reportedDown === next) return;
  reportedDown = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return reportedDown;
}

/**
 * Au rendu serveur, aucune page n'a encore rapporté quoi que ce soit : `null` laisse la main à
 * `initialDown`. Renvoyer `false` ferait mentir le premier rendu et provoquerait un écart
 * d'hydratation sur le bandeau que le serveur vient justement d'afficher.
 */
function getServerSnapshot(): boolean | null {
  return null;
}

export function AniListOutageNotice({ initialDown }: { initialDown: boolean }) {
  const reported = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Ce que la page a constaté **à l'instant** prime sur ce que le serveur savait au chargement :
  // c'est la plus fraîche des deux, et c'est elle qui fait disparaître le bandeau au retour du
  // service sans attendre un rechargement.
  const isDown = reported ?? initialDown;

  if (!isDown) return null;

  return (
    /*
      `aria-live` parce que le bandeau peut **arriver après le chargement**, quand une navigation
      client découvre la panne : pour un lecteur d'écran, c'est une nouveauté apparue en cours de
      route, donc rien ne l'annoncerait. `polite` et pas `assertive` : la panne mérite d'être dite,
      pas de couper la parole à ce qui est en train d'être lu.

      L'attribut plutôt que `role="status"`, qui dit la même chose : Biome demande alors l'élément
      `<output>`, dont le sens — le résultat d'un calcul — ne décrit pas un avis d'incident.
    */
    <p
      aria-live="polite"
      className="flex items-center justify-center gap-2.5 border-border border-b bg-surface-raised px-4 py-2.5 text-center text-muted-foreground text-sm"
    >
      <CloudOffIcon aria-hidden className="size-4 shrink-0" />
      {/* Espace fine insécable avant le deux-points : c'est la règle typographique française. */}
      <span>
        AniList ne répond pas. Les fiches sont servies depuis la copie
        locale&#8239;: le suivi reste utilisable, mais les synopsis et les
        sections détaillées manquent jusqu'au retour du service.
      </span>
    </p>
  );
}

/**
 * Ce qu'une page qui a interrogé AniList vient d'apprendre. Ne rend rien.
 *
 * **Il se pose dans les deux sens**, et c'est le point : une page qui a obtenu sa réponse rapporte
 * `down={false}` et fait disparaître le bandeau. Ne rapporter que les pannes le rendrait collant
 * pour toute la session — on aurait un avis d'incident affiché au-dessus de fiches complètes.
 *
 * À ne rendre que depuis une page qui a **réellement tenté** la lecture : un écran qui ne parle pas
 * à AniList n'a rien à dire de sa santé, et rapporter « tout va bien » sans preuve effacerait un
 * bandeau exact.
 */
export function ReportAniListStatus({ down }: { down: boolean }) {
  useEffect(() => {
    setReportedDown(down);
  }, [down]);

  return null;
}
