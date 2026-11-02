/**
 * Les jaquettes de la landing, **écrites en dur** : la page ne lit aucune donnée de membre, et une
 * requête AniList par fragment userait le quota pour un décor. Ce sont les seules couleurs de la page.
 */
const CDN = "https://s4.anilist.co/file/anilistcdn/media";

export const LANDING_COVERS = {
  frierenAnime: `${CDN}/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg`,
  kenshinManga: `${CDN}/manga/cover/large/bx30022-jxTlViun1o10.jpg`,
  apothecary: `${CDN}/manga/cover/medium/nx99022-Hh2WdyNgR8HM.jpg`,
  edgerunners: `${CDN}/anime/cover/medium/bx120377-ayZPoxiWt4Li.jpg`,
  overgeared: `${CDN}/manga/cover/medium/n105664-4x0zfa6fmqp8.png`,
  frieren: `${CDN}/manga/cover/medium/bx118586-CXKgWikBFQgS.jpg`,
  chainsawMan: `${CDN}/anime/cover/medium/bx127230-DdP4vAdssLoz.png`,
  dandadan: `${CDN}/manga/cover/medium/bx132029-prGF4gePdSKv.jpg`,
  kaiju: `${CDN}/anime/cover/medium/bx153288-25FBfFJzEQ5O.jpg`,
} as const;
