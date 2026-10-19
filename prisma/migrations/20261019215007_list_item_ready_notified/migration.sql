-- AlterTable
ALTER TABLE "list_items" ADD COLUMN     "readyNotifiedAt" TIMESTAMP(3);

-- On part de zéro (D50) : une œuvre déjà prête au moment où l'annonce arrive n'est pas une nouvelle.
-- Toutes les listes, pas seulement « Quand c'est fini » : une liste qui change de genre plus tard ne
-- doit pas déclencher une rafale d'annonces pour des œuvres terminées depuis longtemps.
UPDATE "list_items" AS li
SET "readyNotifiedAt" = NOW()
FROM "media" AS m
WHERE m."id" = li."mediaId"
  AND m."status" IN ('FINISHED', 'CANCELLED');
