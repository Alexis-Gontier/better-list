"use client";

import { useEffect, useState } from "react";

import {
  type CommandResults,
  commandResultsSchema,
} from "@/features/command/schemas/command.schema";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { upfetch } from "@/lib/http/fetch";

/**
 * Ce que la palette cherche, pendant qu'on tape.
 *
 * Extrait du corps de `CommandPalette`, qui portait l'état, le rebond, la requête, son annulation
 * **et** le rendu de six groupes de lignes. Ce n'est pas un découpage de confort : les deux moitiés
 * changent pour des raisons différentes — l'une quand le contrat de `/api/command` bouge, l'autre
 * quand on réordonne les sections — et elles se relisaient mélangées.
 *
 * **La lecture part vers un route handler, pas vers une Server Action.** Les actions sont des POST
 * que Next sérialise : la réponse à « fri » arriverait après celle à « frieren », et la liste
 * afficherait le résultat de l'avant-dernière frappe. Un `GET` se laisse annuler
 * (`AbortController`), ce qui règle la course **et** rend son quota au serveur. C'est la règle de
 * `docs/ARCHITECTURE.md` § frontière server/client, et `api/command` porte sa propre garde.
 */
const EMPTY_RESULTS: CommandResults = { entries: [], media: [] };

/**
 * Le délai avant de partir en requête.
 *
 * Autour de 200 ms, l'interface est encore perçue comme immédiate, et une frappe rapide cesse de
 * déclencher une requête par caractère. Plus court, on paie le quota AniList pour des résultats que
 * personne ne lit ; plus long, la palette traîne.
 */
const SEARCH_DEBOUNCE_MS = 220;

export function useCommandSearch({
  open,
  query,
}: {
  /** Fermée, la palette ne cherche pas : sinon elle consommerait le quota en arrière-plan. */
  open: boolean;
  query: string;
}) {
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);
  const [results, setResults] = useState<CommandResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setIsLoading(true);

    upfetch("/api/command", {
      params: { q: debouncedQuery },
      schema: commandResultsSchema,
      signal: controller.signal,
    })
      .then(setResults)
      .catch(() => {
        // Une annulation n'est pas une panne : c'est le comportement voulu à chaque frappe. Seule une
        // vraie erreur doit vider la liste, sinon on effacerait des résultats encore valables.
        if (controller.signal.aborted) return;
        setResults(EMPTY_RESULTS);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [open, debouncedQuery]);

  return {
    results,
    isLoading,
    /** La saisie sans ses espaces — ce que l'affichage cite, et ce qui décide des sections. */
    trimmedQuery,
    /** La saisie telle que le serveur l'a vue : c'est elle qui correspond à `results`. */
    debouncedQuery,
  };
}
