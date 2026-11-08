import * as z from "zod";

import { PROVIDERS } from "@/features/auth/components/provider-logos";

/** Délier un fournisseur : son nom suffit, le compte vient de la session. */
export const unlinkProviderSchema = z.object({ provider: z.enum(PROVIDERS) });

/** Déconnecter un appareil : l'`id` de sa session, jamais son jeton. */
export const revokeSessionSchema = z.object({ sessionId: z.string().min(1) });
