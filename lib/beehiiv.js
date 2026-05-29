/**
 * Beehiiv API client.
 *
 * Pulls all active subscribers for a publication via /v2/publications/{id}/subscriptions.
 * Paginates automatically. Returns email addresses only — that's all we need.
 *
 * Docs: https://developers.beehiiv.com/api-reference/subscriptions
 */

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";

/**
 * @returns {Promise<{ emails: string[], pagination: object }>}
 */
export async function fetchActiveSubscribers({ publicationId, apiKey, perPage = 100, maxPages = 200 }) {
  if (!publicationId) throw new Error("publicationId is required");
  if (!apiKey) throw new Error("apiKey is required");

  const emails = [];
  let page = 1;
  let totalPages = 1;
  let pagesFetched = 0;

  while (page <= totalPages && page <= maxPages) {
    const url = new URL(`${BEEHIIV_BASE}/publications/${publicationId}/subscriptions`);
    url.searchParams.set("status", "active");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(perPage));

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
      if (s.email) emails.push(s.email);
    }

    pagesFetched = page;
    page += 1;
  }

  const truncated = totalPages > maxPages;

  return {
    emails,
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
