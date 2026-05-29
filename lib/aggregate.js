import { PERSONAL_DOMAINS, DOMAIN_TO_COMPANY } from "./companies.js";

/**
 * Auto-derive a display name from a domain when no manual mapping exists.
 * e.g. "doehler.com" → "Doehler", "fritz-kola.com" → "Fritz Kola"
 */
function fallbackName(domain) {
  const parts = domain.split(".");
  let sld;
  // Handle ccTLDs like .co.uk, .com.br, .co.za
  if (
    parts.length >= 3 &&
    (parts[parts.length - 2] === "co" || parts[parts.length - 2] === "com") &&
    parts[parts.length - 1].length === 2
  ) {
    sld = parts[parts.length - 3];
  } else if (parts.length >= 2) {
    sld = parts[parts.length - 2];
  } else {
    sld = parts[0];
  }
  return sld
    .replace(/-/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Given a domain, pick the best logo.dev domain to query. We always use the
 * "root" domain (drop subdomains) and prefer the most canonical-looking one
 * when a company has multiple. For now we just use the domain as-is — logo.dev
 * is smart enough to resolve most of these.
 */
function logoDomain(domain) {
  // Strip common subdomain prefixes
  const stripped = domain.replace(/^(www\.|mail\.|info\.)/, "");
  return stripped;
}

/**
 * Aggregate a list of subscriber emails into a ranked leaderboard.
 *
 * @param {string[]} emails - Active subscriber emails
 * @param {object} opts
 * @param {Set<string>} [opts.extraPersonalDomains] - Additional personal domains to exclude
 * @param {object} [opts.extraDomainToCompany] - Additional domain → company mappings
 * @returns {object} { companies: [...], totals: {...} }
 */
export function aggregate(emails, opts = {}) {
  const personal = new Set([
    ...PERSONAL_DOMAINS,
    ...(opts.extraPersonalDomains || []),
  ]);
  const overrides = { ...DOMAIN_TO_COMPANY, ...(opts.extraDomainToCompany || {}) };

  // Deduplicate emails (case-insensitive)
  const seen = new Set();
  const unique = [];
  for (const raw of emails) {
    if (!raw) continue;
    const e = raw.trim().toLowerCase();
    if (!e.includes("@")) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    unique.push(e);
  }

  // Bucket emails by domain
  const byDomain = new Map();
  for (const email of unique) {
    const domain = email.split("@")[1];
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(email);
  }

  // Roll up domains into companies
  const byCompany = new Map();
  let personalCount = 0;

  for (const [domain, emailsForDomain] of byDomain) {
    if (personal.has(domain)) {
      personalCount += emailsForDomain.length;
      continue;
    }
    const company = overrides[domain] || fallbackName(domain);
    if (!byCompany.has(company)) {
      byCompany.set(company, {
        company,
        count: 0,
        domains: new Set(),
      });
    }
    const entry = byCompany.get(company);
    entry.count += emailsForDomain.length;
    entry.domains.add(domain);
  }

  // Sort by count desc, then alphabetically. Add a stable logoDomain (the
  // shortest domain in the set, which is usually the canonical one).
  const companies = [...byCompany.values()]
    .map(({ company, count, domains }) => {
      const sortedDomains = [...domains].sort((a, b) => a.length - b.length);
      return {
        company,
        count,
        domains: [...domains].sort(),
        logoDomain: logoDomain(sortedDomains[0]),
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.company.localeCompare(b.company);
    });

  const totals = {
    activeSubscribers: unique.length,
    companies: companies.length,
    attributedReaders: companies.reduce((s, c) => s + c.count, 0),
    personalEmailReaders: personalCount,
  };

  return { companies, totals };
}
