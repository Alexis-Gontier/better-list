import { MediaCommunity } from "@/app/(app)/media/[id]/_components/media-community";
import { MediaLinks } from "@/app/(app)/media/[id]/_components/media-links";
import { MediaNextEpisode } from "@/app/(app)/media/[id]/_components/media-next-episode";
import { MediaSpecs } from "@/app/(app)/media/[id]/_components/media-specs";
import type { MediaDetail } from "@/features/media/schemas/media.schema";

type MediaAsideProps = {
  media: MediaDetail;
};

/**
 * La colonne de référence : ce qu'on **consulte**, à côté de ce qu'on **lit**.
 *
 * C'est la coupure que cette page a choisie, et elle explique le reste de la mise en page. À
 * gauche, du contenu qui se parcourt et se déplie en onglets — un synopsis, une distribution, des
 * œuvres voisines. Ici, quatre blocs courts qu'on vient vérifier d'un regard : quand tombe le
 * prochain épisode, d'où vient l'histoire, ce qu'en pensent les autres, où la regarder. Les mettre
 * dans un onglet reviendrait à les cacher derrière un clic à chaque fois qu'on en a besoin.
 *
 * **Elle est collante, et c'est ce qui justifie la coupure** : quel que soit l'onglet ouvert à
 * gauche, ces quatre réponses restent à l'écran. Sous `lg` la colonne n'existe pas — elle se range
 * sous les onglets, où elle se lit comme une suite de sections, sans rien perdre.
 *
 * **Aucun bloc ici ne se rend vide.** Un manga n'a pas de prochain épisode, une œuvre confidentielle
 * n'a pas de classement, un webtoon n'a nulle part où être regardé : chacun des quatre sait
 * disparaître, et la colonne entière peut donc se réduire à deux lignes sans laisser de trous.
 *
 * Pas de séparateurs entre les blocs, contrairement au hero : chacun porte déjà son intitulé en
 * capitales, et un trait de plus ferait deux marqueurs de frontière pour une seule frontière.
 */
export function MediaAside({ media }: MediaAsideProps) {
  return (
    /*
      `self-start` n'est pas décoratif : dans une grille, une colonne s'étire par défaut sur toute
      la hauteur de la rangée, et un enfant collant d'un conteneur aussi haut que la page n'a nulle
      part où coller. Le calage en haut lui rend la course qui manque.

      Le filet de gauche remplace la marge : à cette largeur, huit points d'écart ne suffisent pas
      à dire « ceci est une autre colonne », et une surface teintée ajouterait un rectangle de plus
      à un écran qui en a déjà quatre. `top-18` place le panneau juste sous l'en-tête collant, qui
      fait `h-14`.
    */
    <aside className="flex flex-col gap-6 lg:sticky lg:top-18 lg:self-start lg:border-l lg:pl-8">
      <MediaNextEpisode episode={media.nextAiringEpisode} />
      <MediaSpecs media={media} />
      <MediaCommunity media={media} />
      <MediaLinks media={media} />
    </aside>
  );
}
