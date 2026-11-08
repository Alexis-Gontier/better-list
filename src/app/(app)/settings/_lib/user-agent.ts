/**
 * « Firefox sur Windows » à partir d'un user-agent — de quoi reconnaître ses appareils, pas les
 * identifier.
 *
 * Une dizaine de motifs plutôt qu'une bibliothèque : on ne veut que le navigateur, le système et
 * la forme de l'écran. **L'ordre des tests compte** : Edge et Opera se déclarent aussi Chrome, et
 * Chrome se déclare aussi Safari.
 */

export type DeviceKind = "mobile" | "desktop";

export type Device = { label: string; kind: DeviceKind };

const BROWSERS: [RegExp, string][] = [
  [/Edg(A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

function match(table: [RegExp, string][], userAgent: string) {
  return table.find(([pattern]) => pattern.test(userAgent))?.[1];
}

export function describeUserAgent(userAgent: string | null): Device {
  if (!userAgent) return { label: "Appareil inconnu", kind: "desktop" };

  const browser = match(BROWSERS, userAgent);
  const system = match(SYSTEMS, userAgent);
  const kind: DeviceKind = /Mobi|iPhone|iPad|Android/.test(userAgent)
    ? "mobile"
    : "desktop";

  if (browser && system) return { label: `${browser} sur ${system}`, kind };
  return { label: browser ?? system ?? "Appareil inconnu", kind };
}
