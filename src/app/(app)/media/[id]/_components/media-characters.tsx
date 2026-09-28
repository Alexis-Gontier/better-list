import Link from "next/link";

import { PersonPortrait } from "@/app/(app)/media/[id]/_components/person-portrait";
import { routes } from "@/config/routes";
import {
  formatCharacterRole,
  formatVoiceLanguage,
} from "@/features/media/lib/media-format";
import type { MediaDetail } from "@/features/media/schemas/media.schema";
import { PersonHoverCard } from "@/features/people/components/person-hover-card";

type CharacterEdge = MediaDetail["characters"]["edges"][number];

type MediaCharactersProps = {
  /**
   * Les personnages à montrer, **déjà bornés par l'appelant**.
   *
   * Le composant reçoit une liste plutôt que la fiche depuis que les onglets ont leurs propres
   * lectures : l'aperçu lui donne les six de la requête de fiche, l'onglet les vingt-cinq de la
   * sienne. Le plafond est une décision d'écran, et l'écran n'est pas le même des deux côtés.
   */
  characters: CharacterEdge[];
};

/**
 * Les personnages principaux, **et qui les double**.
 *
 * La forme est celle d'AniList, reprise sur demande d'Alexis le 11 septembre 2026 : le personnage
 * ancré à gauche, son doubleur à droite, chacun tourné vers l'extérieur de la carte. Elle avait
 * d'abord été livrée en grille de six portraits nus — plus compacte, mais elle jetait les
 * `voiceActors` alors qu'ils sont **déjà dans la réponse**, et le lien personnage ↔ voix est
 * précisément ce qu'on vient chercher sur la fiche d'un anime.
 *
 * **La symétrie porte l'information.** Les deux noms lus de l'intérieur vers l'extérieur, les deux
 * portraits aux deux bords : on comprend l'appariement sans étiquette, là où deux colonnes alignées
 * à gauche auraient demandé un intitulé « Doubleur » sur chaque carte.
 *
 * **Le côté droit disparaît quand il est vide**, et c'est le cas courant : un manga n'a pas de
 * casting vocal. La carte retombe alors sur le seul personnage, sans trou à sa droite — c'est la
 * même règle que la ligne de faits du hero, où une colonne sans valeur s'efface au lieu d'afficher
 * un tiret.
 *
 * La requête trie `[ROLE, RELEVANCE]` : les principaux arrivent d'abord, aucun tri à refaire ici.
 *
 * **Chaque moitié est un lien** depuis le 26 septembre 2026 : le personnage mène à sa page, le
 * doubleur à la sienne. `prefetch={false}` pour ne pas dépenser de quota AniList sur une grille
 * qu'on fait défiler.
 *
 * **Et chaque moitié a son survol** depuis le 29 septembre 2026 (`PersonHoverCard`) : portrait
 * lisible, nom natif, âge, début de biographie. Le panneau du personnage s'aligne sur le bord gauche
 * de la carte, celui du doubleur sur le bord droit — chacun du côté de son portrait.
 *
 * Composant serveur : des images et du texte.
 */
export function MediaCharacters({ characters }: MediaCharactersProps) {
  // Une fiche sans personnage est le cas courant sur un manga peu documenté, et sur **toute** fiche
  // servie depuis le miroir local — qui n'en stocke aucun. C'est `page.tsx` qui s'en sert : un
  // onglet dont le panneau serait vide n'est pas rendu du tout, barre comprise.
  if (characters.length === 0) return null;

  /*
    **Trois colonnes au palier large** (décision d'Alexis du 11 septembre 2026), là où AniList
    s'arrête à deux : l'onglet complet y tient en moins de rangées, et l'échantillon de l'aperçu en
    deux exactement.

    Le prix est connu et assumé : il reste environ 130 px par nom, donc les longs passent à la
    ligne — « Chopper Tony Tony », « Mayumi Tanaka ». Deux lignes leur suffisent presque toujours
    (décision d'Alexis du 12 septembre 2026) ; au-delà, la coupe revient, et l'infobulle rend le nom
    entier.

    Le palier intermédiaire reste à deux colonnes : à `sm`, trois cartes de cette largeur ne
    laisseraient plus rien aux noms, tronqués ou non.

    **La gouttière horizontale est plus large que la verticale**, à rebours de ce que font les
    grilles de jaquettes du dépôt. La raison est propre à cette carte : son portrait de droite et
    celui de gauche de sa voisine se retrouvent côte à côte, et à `gap-2` on lisait six portraits
    alignés plutôt que trois paires. C'est le vide qui dit où une carte finit.
  */
  return (
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-x-4 lg:grid-cols-3">
      {characters.map((edge) => (
        <CharacterCard edge={edge} key={edge.node.id} />
      ))}
    </ul>
  );
}

function CharacterCard({ edge }: { edge: CharacterEdge }) {
  const name = edge.node.name.full;
  const role = formatCharacterRole(edge.role);

  // Le premier de la liste, triée `[RELEVANCE]` par la requête : sur un rôle redistribué entre deux
  // saisons, AniList en rend plusieurs, et c'est le plus pertinent qu'on veut — pas tous.
  const [voice] = edge.voiceActors;
  const language = formatVoiceLanguage(voice?.languageV2 ?? null);

  return (
    <li className="min-w-0">
      {/*
        Même matière que les cartes de relations et de listes : liseré interne plutôt qu'une bordure
        peinte, qui ajouterait un pixel à la boîte et désalignerait les colonnes.

        `overflow-hidden` n'est pas cosmétique — c'est lui qui fait que les portraits viennent
        mourir exactement sur les coins arrondis. Sans lui, deux angles droits dépasseraient aux
        deux bouts de la carte.

        **Surlignée au survol** (demande d'Alexis, 29 septembre 2026) : le liseré passe à la couleur
        d'accent dès qu'une des deux moitiés est visée, et la moitié visée se teinte, son nom avec.
        La carte dit ainsi à la fois « c'est cette paire » et « c'est ce côté-là qui s'ouvrira » —
        deux liens dans une même boîte, que l'ancien `bg-muted/40` laissait presque invisibles.
        Le liseré d'accent est dessiné par un `::after` **au-dessus** des portraits : posé en ombre
        interne sur la carte elle-même, il passait sous les images et disparaissait aux deux bouts.

        Hauteur fixe, et elle est ce qui tient la rangée : les deux portraits sont en `h-full`, donc
        sans elle une carte dont un côté manque serait plus basse que sa voisine.
      */}
      <div className="flex h-20 items-stretch justify-between gap-2 overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] relative after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:transition-shadow after:duration-200 hover:after:shadow-[inset_0_0_0_1px_var(--color-primary)] has-focus-visible:after:shadow-[inset_0_0_0_1px_var(--color-primary)] motion-reduce:after:transition-none">
        {/*
          `flex-1` sur les deux moitiés, et c'est ce qui a suivi le passage des noms à deux
          lignes. Sans lui, flex partage la largeur d'après ce que chaque colonne *voudrait*
          occuper : un nom qui va à la ligne à droite en réclame plus, et le rôle de gauche se
          retrouvait coupé en « SECONDAI… ». Une moitié chacune rend le partage indépendant de la
          longueur des noms — et quand le doubleur manque, la moitié restante prend tout. Les
          colonnes de texte sont `flex-1` à leur tour : sans elles, le vide de la moitié
          s'accumulait après le dernier enfant et décollait le portrait de droite du bord de la
          carte. Ce sont les noms qui doivent s'étaler, jamais les portraits qui doivent flotter.
        */}
        <PersonHoverCard person={edge.node} subtitle={role}>
          <Link
            className="flex min-w-0 flex-1 items-stretch gap-3 group/half transition-colors duration-200 hover:bg-primary/10 focus-visible:bg-primary/10 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
            href={routes.character(edge.node.id)}
            prefetch={false}
          >
            <PersonPortrait name={name} src={edge.node.image?.large ?? null} />

            <div className="flex min-w-0 flex-1 flex-col justify-between py-2 pr-1">
              <p
                className="line-clamp-2 text-sm font-medium transition-colors duration-200 group-hover/half:text-primary group-focus-visible/half:text-primary motion-reduce:transition-none"
                title={name ?? undefined}
              >
                {name}
              </p>
              {role ? (
                // Même graisse et même chasse que les intitulés de la ligne de faits : c'est le seul
                // autre rôle typographique de ce genre sur la page, et deux échelles pour une même
                // étiquette se verraient.
                <p className="truncate text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {role}
                </p>
              ) : null}
            </div>
          </Link>
        </PersonHoverCard>

        {voice ? (
          <PersonHoverCard
            align="end"
            person={voice}
            subtitle={language ? `Voix · ${language}` : "Voix"}
          >
            <Link
              className="flex min-w-0 flex-1 items-stretch gap-3 group/half transition-colors duration-200 hover:bg-primary/10 focus-visible:bg-primary/10 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
              href={routes.staff(voice.id)}
              prefetch={false}
            >
              <div className="flex min-w-0 flex-1 flex-col items-end justify-between py-2 pl-1 text-right">
                <p
                  className="line-clamp-2 text-sm font-medium transition-colors duration-200 group-hover/half:text-primary group-focus-visible/half:text-primary motion-reduce:transition-none"
                  title={voice.name.full ?? undefined}
                >
                  {voice.name.full}
                </p>
                {language ? (
                  <p className="truncate text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    {language}
                  </p>
                ) : null}
              </div>

              <PersonPortrait
                name={voice.name.full}
                src={voice.image?.large ?? null}
              />
            </Link>
          </PersonHoverCard>
        ) : null}
      </div>
    </li>
  );
}
