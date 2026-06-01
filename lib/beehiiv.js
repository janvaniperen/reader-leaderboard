/**
 * Beehiiv API client.
 *
 * Pulls active subscriptions with referral data via expand[]=referrals.
 * Docs: https://developers.beehiiv.com/api-reference/subscriptions
 */

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";

/**
 * @returns {Promise<{ subscribers: object[], pagination: object }>}
 */
export async function fetchActiveSubscribers({ publicationId, apiKey, perPage = 100, maxPages = 200 }) {
  if (!publicationId) throw new Error("publicationId is required");
  if (!apiKey) throw new Error("apiKey is required");

  const subscribers = [];
  let page = 1;
  let totalPages = 1;
  let pagesFetched = 0;

  while (page <= totalPages && page <= maxPages) {
    const url = new URL(`${BEEHIIV_BASE}/publications/${publicationId}/subscriptions`);
    url.searchParams.set("status", "active");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(perPage));
    url.searchParams.append("expand[]", "referrals");

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Beehiiv API error ${res.status} on page ${page}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    totalPages = data?.total_pages ?? data?.pagination?.total_pages ?? 1;
    const subs = data?.data ?? data?.subscriptions ?? [];

    for (const s of subs) {
      if (!s.email) continue;
      subscribers.push({
        email: s.email,
        created: s.created ?? null,
        referrals: (s.referrals ?? [])
          .filter((r) => r?.email && r.status === "active")
          .map((r) => ({ email: r.email, status: r.status })),
      });
    }

    pagesFetched = page;
    page += 1;
  }

  const truncated = totalPages > maxPages;

  return {
    subscribers,
    pagination: {
      totalPages,
      pagesFetched,
      truncated,
      maxPages,
      perPage,
      subscriberCap: maxPages * perPage,
    },
  };
}
