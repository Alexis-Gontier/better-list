/**
 * La fente à avis, tout en haut du chrome — **au-dessus de l'en-tête**.
 *
 * Elle existe parce qu'un avis d'incident concerne l'application entière, pas la page qui l'a
 * découvert : la panne AniList se constate en rendant une fiche, mais elle vaut aussi pour la
 * recherche et l'accueil. Sa place est donc dans le layout.
 *
 * **Et c'est précisément ce qu'un layout ne peut pas savoir tout seul.** Il est rendu avant ses
 * enfants et ne connaît ni la route ni ce qu'elle a tenté de lire ; l'interroger lui-même
 * coûterait une requête AniList par affichage de n'importe quelle page, pour une panne qui
 * n'arrive que deux fois par an. Le sens de circulation est donc inversé : le layout ouvre un
 * emplacement vide, et la page y dépose son avis par un portail (`react-dom`).
 *
 * Conséquence à connaître : le contenu déposé apparaît **après l'hydratation**, puisqu'un portail
 * a besoin du DOM. Acceptable ici — c'est un bandeau d'état dégradé, pas la page elle-même — et ce
 * serait un mauvais choix pour quoi que ce soit qui doive être lisible sans JavaScript.
 */
export const NOTICE_SLOT_ID = "app-notice-slot";

export function NoticeSlot() {
  return <div id={NOTICE_SLOT_ID} />;
}
