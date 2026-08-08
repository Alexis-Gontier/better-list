import "server-only";

import { prisma } from "@/lib/db/prisma";

/**
 * Limitation de débit des routes applicatives.
 *
 * **Pourquoi ce fichier existe alors que Better Auth en a déjà un.** Le limiteur de Better Auth ne
 * couvre que `/api/auth/*` ; il n'y a pas de crochet pour lui faire garder une route à nous. Or le
 * `matcher` de `src/proxy.ts` exclut `api/` en entier, donc un route handler n'a strictement rien
 * devant lui : ce qu'il ne vérifie pas n'est vérifié nulle part.
 *
 * **Le compteur vit en base, pas en mémoire.** Sur Vercel, une variable de module est locale à une
 * instance de fonction et disparaît au démarrage à froid — le compteur repartirait de zéro sans
 * qu'on puisse dire quand. C'est la même raison qui fait passer Better Auth en
 * `storage: "database"` dans `@/lib/auth/server`.
 *
 * Fenêtre fixe et non glissante : une fenêtre glissante demande de garder l'horodatage de chaque
 * requête, là où deux colonnes suffisent ici. Le prix est connu — deux fenêtres consécutives
 * peuvent laisser passer `2 × max` requêtes à cheval sur la bordure. Pour un garde-fou de quota,
 * c'est sans conséquence ; pour un secret, ce serait le mauvais outil.
 */

type RateLimitRule = {
  /** Ce qu'on compte et pour qui — `"command:<userId>"`. Voir `ApiRateLimit` dans le schéma. */
  key: string;
  /** Nombre de requêtes autorisées par fenêtre. */
  max: number;
  windowSeconds: number;
};

type RateLimitVerdict =
  | { allowed: true }
  | {
      allowed: false /** Secondes avant la fenêtre suivante, pour l'en-tête `Retry-After`. */;
      retryAfter: number;
    };

/**
 * Consomme une unité du budget de `key` et dit si la requête passe.
 *
 * **La course est assumée.** Deux requêtes simultanées peuvent lire le même compteur et
 * l'incrémenter chacune, laissant passer une requête de trop. La corriger demanderait un
 * `INSERT … ON CONFLICT DO UPDATE` en SQL brut ou une transaction sérialisable, pour empêcher un
 * dépassement d'une unité sur un plafond qui est déjà un ordre de grandeur. On garde l'écriture
 * lisible.
 */
export async function consumeRateLimit({
  key,
  max,
  windowSeconds,
}: RateLimitRule): Promise<RateLimitVerdict> {
  const now = new Date();
  const windowMs = windowSeconds * 1000;
  const current = await prisma.apiRateLimit.findUnique({ where: { key } });

  // Aucune fenêtre en cours, ou la précédente est close : on en ouvre une. L'`upsert` couvre les
  // deux cas d'un coup — la ligne peut ne pas exister, ou exister et être périmée.
  if (!current || now.getTime() - current.windowStart.getTime() >= windowMs) {
    await prisma.apiRateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });

    return { allowed: true };
  }

  if (current.count >= max) {
    const nextWindow = current.windowStart.getTime() + windowMs;

    return {
      allowed: false,
      // Au moins une seconde : un `Retry-After: 0` invite à réessayer immédiatement, donc à se
      // reprendre le même refus.
      retryAfter: Math.max(1, Math.ceil((nextWindow - now.getTime()) / 1000)),
    };
  }

  await prisma.apiRateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return { allowed: true };
}
