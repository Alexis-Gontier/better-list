/**
 * Les jaquettes des fragments de la landing, **écrites en dur** : la page ne lit aucune donnée de
 * membre, et une requête AniList par fragment userait le quota pour un décor. Seul le mur du hero
 * lit les tendances, à la requête (D52).
 */
const CDN = "https://s4.anilist.co/file/anilistcdn/media";

export const LANDING_COVERS = {
  apothecary: `${CDN}/manga/cover/medium/nx99022-Hh2WdyNgR8HM.jpg`,
  dragonBall: `${CDN}/manga/cover/medium/bx86508-QSahE7mTFEXl.png`,
  edgerunners: `${CDN}/anime/cover/medium/bx120377-ayZPoxiWt4Li.jpg`,
  overgeared: `${CDN}/manga/cover/medium/n105664-4x0zfa6fmqp8.png`,
  kenshin: `${CDN}/manga/cover/medium/bx30022-jxTlViun1o10.jpg`,
  frieren: `${CDN}/manga/cover/medium/bx118586-CXKgWikBFQgS.jpg`,
  chainsawMan: `${CDN}/anime/cover/medium/bx127230-DdP4vAdssLoz.png`,
  dandadan: `${CDN}/manga/cover/medium/bx132029-prGF4gePdSKv.jpg`,
  kaiju: `${CDN}/anime/cover/medium/bx153288-25FBfFJzEQ5O.jpg`,
} as const;
