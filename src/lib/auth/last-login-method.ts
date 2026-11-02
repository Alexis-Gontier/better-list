import "server-only";

import { cookies } from "next/headers";

import {
  PROVIDERS,
  type Provider,
} from "@/features/auth/components/provider-logos";

/** Le cookie que pose le plugin `lastLoginMethod` (`src/lib/auth/server.ts`). */
const COOKIE = "better-auth.last_used_login_method";

/** Le dernier fournisseur utilisé sur cet appareil, ou `null` : une valeur inconnue ne s'affiche pas. */
export async function getLastLoginMethod(): Promise<Provider | null> {
  const value = (await cookies()).get(COOKIE)?.value;

  return PROVIDERS.find((provider) => provider === value) ?? null;
}
