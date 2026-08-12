export type PwaPlatform =
  | "ios"
  | "android-chrome"
  | "android-samsung"
  | "android-firefox"
  | "android-other"
  | "desktop-chrome"
  | "desktop-edge"
  | "desktop-safari"
  | "desktop-firefox"
  | "desktop-other";

export function detectPwaPlatform(userAgent: string): PwaPlatform {
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (typeof navigator !== "undefined" &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";

  const isAndroid = /Android/i.test(userAgent);
  const isSamsung = /SamsungBrowser/i.test(userAgent);
  const isFirefox = /Firefox/i.test(userAgent);
  const isEdge = /Edg/i.test(userAgent);
  const isChrome = /Chrome/i.test(userAgent) && !isEdge && !isSamsung;

  if (isAndroid) {
    if (isSamsung) return "android-samsung";
    if (isFirefox) return "android-firefox";
    if (isChrome) return "android-chrome";
    return "android-other";
  }

  if (isEdge) return "desktop-edge";
  if (isChrome) return "desktop-chrome";
  if (/Safari/i.test(userAgent) && !isChrome) return "desktop-safari";
  if (isFirefox) return "desktop-firefox";
  return "desktop-other";
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function supportsNativeInstallPrompt(platform: PwaPlatform): boolean {
  return (
    platform === "android-chrome" ||
    platform === "android-samsung" ||
    platform === "desktop-chrome" ||
    platform === "desktop-edge"
  );
}

export function isMobilePlatform(platform: PwaPlatform): boolean {
  return platform === "ios" || platform.startsWith("android-");
}
