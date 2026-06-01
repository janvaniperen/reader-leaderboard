/** Valid hostname for logo lookup (no path, scheme, or port). */
const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export function validLogoDomain(domain) {
  if (!domain || typeof domain !== "string") return false;
  const d = domain.trim().toLowerCase();
  if (d.length > 253 || d.includes("..")) return false;
  return DOMAIN_RE.test(d);
}

export function buildLogoDevUrl(domain, token) {
  const url = new URL(`https://img.logo.dev/${encodeURIComponent(domain)}`);
  url.searchParams.set("token", token);
  url.searchParams.set("size", "64");
  url.searchParams.set("format", "webp");
  url.searchParams.set("retina", "true");
  url.searchParams.set("fallback", "404");
  return url.toString();
}

/** CDN cache for successful logo responses (30 days). */
export const LOGO_CACHE_CONTROL =
  "public, s-maxage=2592000, stale-while-revalidate=86400";
