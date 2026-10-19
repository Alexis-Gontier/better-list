import type { Instrumentation } from "next";

/**
 * Remontée des erreurs serveur.
 *
 * **Il n'y a pas de service d'observabilité derrière, et c'est le bon dimensionnement.** Brancher
 * Sentry sur un cercle de quatre comptes coûterait une dépendance, une clé de plus dans `env.ts` et
 * un quota à surveiller, pour un volume d'erreurs qui tient dans les journaux de la plateforme. Ce
 * fichier ne fait donc qu'une chose : **écrire l'erreur d'un seul côté, sous une forme qu'on peut
 * chercher.**
 *
 * Ce que ça change par rapport à ne rien poser. Sans ce crochet, une erreur levée pendant le rendu
 * d'un Server Component atteint `error.tsx`, qui l'affiche au visiteur avec une référence
 * (`digest`) — et côté serveur, il ne reste qu'une trace anonyme que rien ne relie à cette
 * référence. Quand quelqu'un du cercle envoie une capture d'écran avec « Réf. 1a2b3c », il faut
 * pouvoir retrouver la ligne. C'est exactement ce que `digest` permet ici, et c'est la seule raison
 * d'être de ce fichier.
 *
 * `console.error` et non un envoi réseau : sur Vercel, la sortie d'erreur **est** le journal, elle
 * est horodatée, associée à la requête et cherchable telle quelle. Un `fetch` sortant ajouterait un
 * point de panne dans le chemin qui sert précisément à rendre compte des pannes — et la convention
 * du projet interdit de toute façon `fetch` nu.
 *
 * Pas de `register` exporté : il ne sert qu'à initialiser un traceur (OpenTelemetry et compagnie),
 * qu'on n'a pas. Une fonction vide ne ferait que suggérer qu'il en existe un.
 *
 * **Ce crochet ne voit pas tout, et il ne faut pas s'y fier comme à un filet complet** : il reçoit
 * les erreurs que le serveur Next capture — rendu, route handlers, Server Actions. Une erreur
 * rattrapée par un `try/catch` du code (le repli AniList de `tryAniList`, par exemple) n'arrive
 * jamais ici, par construction : elle a été traitée.
 */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  /**
   * L'erreur n'est pas toujours celle qui a été levée : React la retraite quand elle survient
   * pendant le rendu d'un Server Component. C'est la même contrainte que celle du cache décrite
   * dans CLAUDE.md — on lit ce qui a survécu au transport, pas l'instance d'origine.
   */
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;

  console.error("[request-error]", {
    // Le pont avec la référence affichée au visiteur par `error.tsx`. C'est la seule clé qui relie
    // une capture d'écran à une ligne de journal.
    digest,
    message,
    path: request.path,
    method: request.method,
    // `routerKind` distingue App et Pages Router, `routeType` dit si l'erreur vient d'un rendu,
    // d'un route handler ou d'une action — la première question qu'on se pose devant la trace.
    routeType: context.routeType,
    routePath: context.routePath,
    stack: error instanceof Error ? error.stack : undefined,
  });
};
