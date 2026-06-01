import { PERSONAL_DOMAINS, DOMAIN_TO_COMPANY } from "./companies.js";

/** Each referral counts as this many readers in impact score. */
export const REFERRAL_WEIGHT = 3;

/** Referrals joined within this many days count as "new". */
export const REFERRAL_NEW_DAYS = 90;

/**
 * Auto-derive a display name from a domain when no manual mapping exists.
 */
function fallbackName(domain) {
  const parts = domain.split(".");
  let sld;
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

function logoDomain(domain) {
  return domain.replace(/^(www\.|mail\.|info\.)/, "");
}

function normalizeEmail(raw) {
  if (!raw) return null;
  const e = String(raw).trim().toLowerCase();
  if (!e.includes("@")) return null;
  return e;
}

function normalizeSubscriber(raw) {
  if (typeof raw === "string") {
    return { email: raw, created: null, referrals: [] };
  }
  if (!raw || !raw.email) {
    return { email: null, created: null, referrals: [] };
  }
  return {
    email: raw.email,
    created: raw.created ?? null,
    referrals: raw.referrals ?? [],
  };
}

function companyForEmail(email, personal, overrides) {
  const domain = email.split("@")[1];
  if (personal.has(domain)) return null;
  return overrides[domain] || fallbackName(domain);
}

function impactScore(count, referrals) {
  return count + referrals * REFERRAL_WEIGHT;
}

/**
 * Aggregate subscribers into a ranked leaderboard with referral impact.
 *
 * @param {Array<string|object>} subscribers - Emails or { email, created, referrals[] }
 * @returns {{ companies: object[], totals: object }}
 */
export function aggregate(subscribers, opts = {}) {
  const personal = new Set([
    ...PERSONAL_DOMAINS,
    ...(opts.extraPersonalDomains || []),
  ]);
  const overrides = { ...DOMAIN_TO_COMPANY, ...(opts.extraDomainToCompany || {}) };
  const newDays = opts.referralNewDays ?? REFERRAL_NEW_DAYS;
  const newCutoffSec = Math.floor(Date.now() / 1000) - newDays * 86400;

  const normalized = subscribers.map(normalizeSubscriber);

  const seen = new Set();
  const unique = [];
  for (const sub of normalized) {
    const email = normalizeEmail(sub.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    unique.push({ ...sub, email });
  }

  const createdByEmail = new Map(
    unique.map((s) => [s.email, s.created])
  );

  const byDomain = new Map();
  for (const { email } of unique) {
    const domain = email.split("@")[1];
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(email);
  }

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
        referrals: 0,
        newReferrals: 0,
        domains: new Set(),
        referredEmails: new Set(),
      });
    }
    const entry = byCompany.get(company);
    entry.count += emailsForDomain.length;
    entry.domains.add(domain);
  }

  for (const sub of unique) {
    const company = companyForEmail(sub.email, personal, overrides);
    if (!company || !sub.referrals?.length) continue;

    const entry = byCompany.get(company);
    if (!entry) continue;

    for (const ref of sub.referrals) {
      const refEmail = normalizeEmail(ref.email);
      if (!refEmail || entry.referredEmails.has(refEmail)) continue;
      entry.referredEmails.add(refEmail);
      entry.referrals += 1;

      const created = createdByEmail.get(refEmail);
      if (created && created >= newCutoffSec) {
        entry.newReferrals += 1;
      }
    }
  }

  const companies = [...byCompany.values()]
    .map(({ company, count, referrals, newReferrals, domains }) => {
      const sortedDomains = [...domains].sort((a, b) => a.length - b.length);
      return {
        company,
        count,
        referrals,
        newReferrals,
        impact: impactScore(count, referrals),
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
    referredSubscribers: companies.reduce((s, c) => s + c.referrals, 0),
    newReferredSubscribers: companies.reduce((s, c) => s + c.newReferrals, 0),
  };

  return { companies, totals };
}

/** Sort companies for display (client-side view toggle). */
export function sortCompanies(companies, mode = "readers") {
  const sorted = [...companies];
  if (mode === "impact") {
    sorted.sort((a, b) => {
      if (b.impact !== a.impact) return b.impact - a.impact;
      if (b.referrals !== a.referrals) return b.referrals - a.referrals;
      return a.company.localeCompare(b.company);
    });
  } else {
    sorted.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.company.localeCompare(b.company);
    });
  }
  return sorted;
}
