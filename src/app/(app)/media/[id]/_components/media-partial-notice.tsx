import { CloudOffIcon } from "lucide-react";

/**
 * La ligne qui annonce une fiche servie par le miroir local, AniList étant hors service.
 *
 * **Elle est indispensable, et pas par politesse.** Sans elle, la fiche dégradée ment par omission :
 * un manga sans onglet « Personnages » ressemble à un manga dont AniList ne connaît pas le casting,
 * et un synopsis absent à une œuvre sans synopsis. Le lecteur conclurait que la donnée n'existe pas,
 * alors qu'elle est seulement injoignable — et il ne reviendrait pas la chercher.
 *
 * **Une ligne, en tête, et non un encadré par section.** Ce qui manque manque à cinq endroits de la
 * page ; le dire cinq fois ferait de la panne le sujet de l'écran, au-dessus du suivi qui, lui,
 * fonctionne. C'est le même parti pris que le bandeau de l'accueil (`catalogue-unavailable.tsx`).
 *
 * `<output>` porte `role="status"` nativement : annoncé poliment, sans interrompre le lecteur
 * d'écran. Et non `alert` — rien n'est cassé du côté de l'utilisateur, qui n'a aucune décision à
 * prendre.
 */
export function MediaPartialNotice() {
  return (
    <output className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm">
      <CloudOffIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />

      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Fiche incomplète.</span>{" "}
        AniList ne répond pas pour l'instant : le synopsis, les personnages,
        l'équipe et les œuvres liées manquent à l'appel. Ce que vous voyez vient
        de votre copie locale, et votre suivi reste modifiable.
      </p>
    </output>
  );
}
