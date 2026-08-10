-- L'échelle de notation n'est plus un réglage : les notes s'affichent et se saisissent sur cinq
-- étoiles, demies comprises, pour tout le monde (docs/PRODUCT.md §4.2). Un sélecteur à un seul
-- choix n'en est pas un.
--
-- `Entry.score` n'est pas touché : il reste sur 0–100, ce qui garde leur précision aux notes
-- importées d'AniList. Seule disparaît la préférence d'affichage.

-- AlterTable
ALTER TABLE "user_preferences" DROP COLUMN "scoreFormat";

-- DropEnum
DROP TYPE "ScoreFormat";
