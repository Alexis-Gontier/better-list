import "server-only";

import { env } from "@/config/env";
import { LOCALE } from "@/config/locale";
import {
  PROVIDER_LABELS,
  PROVIDERS,
  type Provider,
} from "@/features/auth/components/provider-logos";

/** Mêmes conditions que la déclaration des fournisseurs dans `server.ts` (D62). */
const CONFIGURED: Record<Provider, boolean> = {
  github: true,
  discord: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
};

/** Les fournisseurs réellement disponibles, dans l'ordre des boutons. */
export const ENABLED_PROVIDERS = PROVIDERS.filter(
  (provider) => CONFIGURED[provider],
);

/** « GitHub, Discord ou Google », selon ce qui est configuré. */
export const ENABLED_PROVIDERS_LABEL = new Intl.ListFormat(LOCALE, {
  type: "disjunction",
}).format(ENABLED_PROVIDERS.map((provider) => PROVIDER_LABELS[provider]));
