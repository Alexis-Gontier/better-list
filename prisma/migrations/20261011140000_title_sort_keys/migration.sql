-- Le tri par titre suit la langue d'affichage.
--
-- Un titre anglais ou natif manque souvent ; la carte retombe alors sur un autre
-- (`mediaTitle`, `features/media/lib/media-format.ts`), et le tri doit retomber sur le même. Prisma
-- ne sait pas trier sur un `COALESCE` : chaque ordre de repli devient donc une colonne.
--
-- **Générées** plutôt qu'écrites par le miroir : tous les écrivains de `media` — le miroir, le
-- seed, et les lignes déjà là — les ont sans y penser, et elles ne peuvent pas diverger des titres.
-- `NULLIF(…, '')` parce que `mediaTitle` saute aussi une chaîne vide. Même collation ICU que les
-- titres (20261011130000_title_collation).
ALTER TABLE "media"
  ADD COLUMN "titleSortRomaji" TEXT COLLATE "und-x-icu" GENERATED ALWAYS AS (
    COALESCE(NULLIF("titleRomaji", ''), NULLIF("titleEnglish", ''), NULLIF("titleNative", ''))
  ) STORED,
  ADD COLUMN "titleSortEnglish" TEXT COLLATE "und-x-icu" GENERATED ALWAYS AS (
    COALESCE(NULLIF("titleEnglish", ''), NULLIF("titleRomaji", ''), NULLIF("titleNative", ''))
  ) STORED,
  ADD COLUMN "titleSortNative" TEXT COLLATE "und-x-icu" GENERATED ALWAYS AS (
    COALESCE(NULLIF("titleNative", ''), NULLIF("titleRomaji", ''), NULLIF("titleEnglish", ''))
  ) STORED;
