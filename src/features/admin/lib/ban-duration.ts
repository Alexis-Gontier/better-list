export const BAN_DURATIONS = ["7d", "30d", "forever"] as const;
export type BanDuration = (typeof BAN_DURATIONS)[number];

export const BAN_DURATION_LABELS: Record<BanDuration, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  forever: "Définitif",
};

const DAY = 24 * 60 * 60;

/** `banExpiresIn` du plugin `admin`, en secondes ; `undefined` pour un bannissement sans fin. */
export function banExpiresIn(duration: BanDuration) {
  if (duration === "forever") return undefined;
  return (duration === "7d" ? 7 : 30) * DAY;
}
