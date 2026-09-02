import { LibraryGenreSelect } from "@/app/(app)/library/_components/library-genre-select";
import { getLibraryGenres } from "@/features/tracking/server/tracking.queries";

/**
 * Le filtre par genre : la lecture ici, l'interaction dans la feuille cliente.
 *
 * C'est le seul contrôle de la barre d'outils qui interroge la base, d'où sa propre frontière de
 * suspension côté page — le champ de recherche et les tris partent sans l'attendre.
 *
 * **Une bibliothèque sans genre ne montre rien du tout** plutôt qu'un menu réduit à « Tous les
 * genres ». Un filtre qui ne filtre rien occupe une place dans la barre et promet un choix qui
 * n'existe pas ; le cas se produit tant que le miroir n'a rapporté aucun genre.
 */
export async function LibraryGenreFilter() {
  const genres = await getLibraryGenres();

  if (genres.length === 0) return null;

  return <LibraryGenreSelect genres={genres} />;
}
