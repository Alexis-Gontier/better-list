/**
 * Langue et fuseau de l'application.
 *
 * **Les deux sont des constantes, pas des préférences** (docs/conception.md §7). L'interface est en
 * français uniquement, et l'heure est celle de Paris quoi qu'il arrive.
 *
 * Le fuseau est le point à ne pas rater : une date rendue sans fuseau explicite est calculée avec
 * celui du serveur au rendu et celui du visiteur à l'hydratation — deux valeurs pour la même
 * donnée, donc un écart d'hydratation, et « aujourd'hui » qui bascule selon l'endroit d'où l'on
 * regarde. **Tout `Intl.*` et tout `toLocale*` de ce projet doit donc recevoir ces deux
 * valeurs-là.**
 *
 * Conséquence assumée : un membre en voyage voit ses soirées rangées à l'heure de chez lui. Pour un
 * journal, c'est le comportement voulu, pas un défaut à corriger par un réglage.
 */
export const LOCALE = "fr-FR";
export const TIMEZONE = "Europe/Paris";
