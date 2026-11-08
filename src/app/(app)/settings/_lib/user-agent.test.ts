import { describe, expect, it } from "vitest";

import { describeUserAgent } from "@/app/(app)/settings/_lib/user-agent";

describe("describeUserAgent", () => {
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      "Chrome sur Windows",
      "desktop",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
      "Edge sur Windows",
      "desktop",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:132.0) Gecko/20100101 Firefox/132.0",
      "Firefox sur macOS",
      "desktop",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      "Safari sur iOS",
      "mobile",
    ],
    [
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
      "Chrome sur Android",
      "mobile",
    ],
  ])("%s", (userAgent, label, kind) => {
    expect(describeUserAgent(userAgent)).toEqual({ label, kind });
  });

  it("dit qu'il ne sait pas plutôt que de deviner", () => {
    expect(describeUserAgent(null)).toEqual({
      label: "Appareil inconnu",
      kind: "desktop",
    });
    expect(describeUserAgent("curl/8.0")).toEqual({
      label: "Appareil inconnu",
      kind: "desktop",
    });
  });
});
