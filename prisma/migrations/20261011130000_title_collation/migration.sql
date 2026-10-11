-- Les titres se trient comme on les lit, pas octet par octet.
--
-- La base est en `C.UTF-8` : toutes les majuscules passent avant toutes les minuscules, et un tri
-- par titre rendait « BLEACH », « BTOOOM! » puis « Black Bullet ». `und-x-icu` est la collation
-- ICU racine (Unicode, indépendante de la langue) : elle range la casse et les accents à leur
-- place. Elle est déterministe, donc `ILIKE` et l'égalité continuent de marcher comme avant.
--
-- Prisma ne décrit pas la collation d'une colonne PostgreSQL : le schéma ne la porte pas, et
-- `migrate dev` ne la voit pas comme une dérive. Elle ne vit qu'ici.
ALTER TABLE "media" ALTER COLUMN "titleRomaji" TYPE TEXT COLLATE "und-x-icu";
ALTER TABLE "media" ALTER COLUMN "titleEnglish" TYPE TEXT COLLATE "und-x-icu";
ALTER TABLE "media" ALTER COLUMN "titleNative" TYPE TEXT COLLATE "und-x-icu";
