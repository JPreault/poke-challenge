import pkg from "../../package.json";

export {
  getPublicReleaseNotes,
  getReleaseKindLabel,
  RELEASE_NOTES,
  type ReleaseKind,
  type ReleaseNote,
} from "@/lib/version/changelog";

export const APP_VERSION = pkg.version;

export const VERSIONS_ROUTE = "/versions";

export function formatAppVersion(prefix = "v"): string {
  return `${prefix}${APP_VERSION}`;
}

export function isPreReleaseVersion(version = APP_VERSION): boolean {
  return version.startsWith("0.");
}
