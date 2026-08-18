import { CloudOffIcon } from "lucide-react";

import { currentSeason } from "@/features/media/lib/media-season";
import { getBrowseCatalogue } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { tryAniList } from "@/lib/http/anilist";

/**
 * Le bandeau d'avertissement de l'accueil, quand AniList ne répond pas.
 *
 * **La panne d'AniList n'est pas la panne de l'application** : le suivi, la bibliothèque, les listes
 * et le journal se lisent dans le miroir local (docs/PRODUCT.md §4.1) et continuent de fonctionner
 * pendant la coupure. Laisser l'erreur remonter à `app/error.tsx` aurait emporté toute la page, donc
 * aussi le « +1 » — le geste le plus fréquent du produit (§6) — pour une requête dont il n'a aucun
 * besoin.
 *
 * **En haut, et non à la place des rangées.** Ce qui manque pendant la coupure manque à trois
 * endroits de la page, séparés par plusieurs écrans de défilement (le bandeau des comptes neufs, les
 * cinq rangées, la grille finale) : un encadré posé au milieu de cette suite n'était lu que par qui
 * défilait jusque-là, et se lisait alors comme la panne de *cette* section. Une ligne en tête de page
 * dit la chose une fois, avant tout le reste, et laisse les blocs qui marchent occuper la place.
 *
 * **C'est une ligne, pas un encadré.** Elle annonce l'absence de contenu ; lui donner la hauteur
 * d'un bloc de contenu ferait de la panne l'élément principal de l'écran, au-dessus du suivi qui,
 * lui, fonctionne.
 *
 * **Il se teste tout seul** plutôt que de recevoir un booléen : il vit au-dessus du bandeau, dans sa
 * propre frontière de suspension, là où la découverte est trois blocs plus bas — remonter l'état
 * jusqu'ici aurait fait attendre la page entière. La lecture ne coûte rien de plus : c'est le même
 * appel mémorisé que la découverte, aux mêmes arguments, donc un succès de cache dès que l'API
 * répond — et le cas où elle ne répond pas est justement celui où il n'y a plus de quota à ménager.
 */
export async function CatalogueUnavailableBanner() {
  const { includeAdult } = await getPreferences();

  const catalogue = await tryAniList(() =>
    getBrowseCatalogue({ ...currentSeason(), includeAdult }),
  );

  if (catalogue) return null;

  return (
    /*
      `<output>` porte `role="status"` nativement — annoncé poliment, sans interrompre ce que le
      lecteur d'écran est en train de dire. Et non `alert` : rien n'est cassé du côté de
      l'utilisateur, et il n'a aucune décision à prendre.
    */
    <output className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm">
      <CloudOffIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />

      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">
          Catalogue momentanément indisponible.
        </span>{" "}
        AniList ne répond pas pour l'instant : les tendances, la saison et la
        recherche manquent à l'appel. Votre suivi, vos listes et votre
        bibliothèque n'en dépendent pas et restent à jour.
      </p>
    </output>
  );
}
