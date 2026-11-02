import type { ProfilePrivacy } from "@/features/preferences/schemas/preferences.schema";

export type ProfileSection = "journal" | "stats" | "activity" | "favorites";

const SECTION_SETTING = {
  journal: "showJournal",
  stats: "showStats",
  activity: "showActivityCalendar",
  favorites: "showFavorites",
} as const satisfies Record<ProfileSection, keyof ProfilePrivacy>;

/** La seule porte d'une section de profil (D64) : aucun écran ne lit ces réglages lui-même. */
export function canViewProfileSection(
  viewer: { isOwner: boolean },
  privacy: ProfilePrivacy,
  section: ProfileSection,
) {
  if (viewer.isOwner) return true;
  return privacy.profileVisible && privacy[SECTION_SETTING[section]];
}

/**
 * L'`includeAdult` des lectures d'un profil. Pour un autre, le 18+ n'apparaît que si le
 * propriétaire le montre **et** si le lecteur l'accepte (D7) : compteurs compris.
 */
export function profileAdultFilter({
  isOwner,
  viewerIncludeAdult,
  privacy,
}: {
  isOwner: boolean;
  viewerIncludeAdult: boolean;
  privacy: ProfilePrivacy;
}) {
  return viewerIncludeAdult && (isOwner || privacy.showAdult);
}
