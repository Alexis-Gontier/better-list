import "server-only";

import {
  PROVIDERS,
  type Provider,
} from "@/features/auth/components/provider-logos";
import { prisma } from "@/lib/db/prisma";

/** Les fournisseurs par lesquels ce compte peut entrer, dans l'ordre des boutons de `/login`. */
export async function getLinkedProviders(userId: string): Promise<Provider[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { providerId: true },
  });
  const linked = new Set<string>(accounts.map((account) => account.providerId));

  return PROVIDERS.filter((provider) => linked.has(provider));
}
