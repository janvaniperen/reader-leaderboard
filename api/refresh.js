import { timingSafeEqual } from "node:crypto";
import { fetchActiveSubscribers } from "../lib/beehiiv.js";
import { aggregate } from "../lib/aggregate.js";
import { setLeaderboard } from "../lib/store.js";

/**
 * GET /api/refresh
 *
 * Triggered by Vercel Cron (configured in vercel.json). Pulls all active
 * subscribers from Beehiiv, aggregates by company domain, stores in KV.
 *
 * Also callable manually for first-time setup or testing — protected by
 * REFRESH_SECRET to prevent abuse. Vercel Cron requests include a special
 * header, but we accept the bearer-token path too for manual runs.
 *
 * Env vars required:
 *   BEEHIIV_API_KEY        - Beehiiv API key
 *   BEEHIIV_PUBLICATION_ID - Publication ID (pub_xxx...)
 *   REFRESH_SECRET         - Random string, used to authorise manual refreshes
 *   CRON_SECRET            - Set automatically by Vercel Cron
 */

export const config = {
  runtime: "nodejs",
  maxDuration: 60, // up to a minute for large lists
};

function safeEqual(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAuthorised(req) {
  const auth = req.headers.get?.("authorization") || req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const refreshSecret = process.env.REFRESH_SECRET;

  if (!auth) return false;
  const token = auth.replace(/^Bearer\s+/i, "");
  if (cronSecret && safeEqual(token, cronSecret)) return true;
  if (refreshSecret && safeEqual(token, refreshSecret)) return true;
  return false;
}

export default async function handler(req, res) {
  const isEdge = typeof req.headers?.get === "function";
  const respond = (status, body) => {
    if (isEdge) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
    res.status(status).json(body);
  };

  const method = isEdge ? req.method : req.method;
  if (method !== "GET") {
    return respond(405, { error: "Method not allowed" });
  }

  if (!isAuthorised(req)) {
    return respond(401, { error: "Unauthorized" });
  }

  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;

  if (!publicationId || !apiKey) {
    return respond(500, {
      error: "Missing BEEHIIV_PUBLICATION_ID or BEEHIIV_API_KEY env vars",
    });
  }

  const t0 = Date.now();
  try {
    const { emails, pagination } = await fetchActiveSubscribers({ publicationId, apiKey });
    const result = aggregate(emails);

    const payload = {
      generatedAt: new Date().toISOString(),
      pagination,
      ...result,
    };

    await setLeaderboard(payload);

    const response = {
      ok: true,
      generatedAt: payload.generatedAt,
      totals: payload.totals,
      pagination,
      tookMs: Date.now() - t0,
    };

    if (pagination.truncated) {
      response.warning =
        `Fetched ${emails.length} subscribers but Beehiiv reports ${pagination.totalPages} pages ` +
        `(cap is ${pagination.maxPages} pages / ${pagination.subscriberCap} subscribers). ` +
        "Increase maxPages in lib/beehiiv.js or raise the function timeout.";
      console.warn("Refresh truncated:", response.warning);
    }

    return respond(200, response);
  } catch (err) {
    console.error("Refresh failed:", err);
    return respond(500, {
      error: "Refresh failed",
      tookMs: Date.now() - t0,
    });
  }
}
