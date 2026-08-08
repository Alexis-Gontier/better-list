import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileContent } from "@/app/(app)/u/[username]/_components/profile-content";
import { ProfileSkeleton } from "@/app/(app)/u/[username]/_components/profile-skeleton";
import { getProfile } from "@/features/profile/server/profile.queries";

/**
 * `getProfile` porte le `cache` de React : cet appel et celui de la page ne coûtent qu'une requête.
 */
export async function generateMetadata({
  params,
}: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) return {};

  return {
    title: `${profile.name} (@${profile.username})`,
    description: `Le suivi et le journal de ${profile.name}.`,
    // Un profil n'a aucune raison d'être indexé : le cercle est privé (docs/PRODUCT.md §2), et les
    // pages authentifiées ne devraient de toute façon jamais atteindre un robot.
    robots: { index: false, follow: false },
  };
}

export default function ProfilePage({
  params,
  searchParams,
}: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
