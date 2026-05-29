import localFixture from "../lib/local-fixture.js";
import { getLeaderboard } from "../lib/store.js";

/**
 * GET /api/leaderboard
 *
 * Returns the cached leaderboard from Vercel KV (or a local file in dev).
 * The heavy lifting happens in /api/refresh, which is run on a cron.
 */

export const config = {
  runtime: "nodejs",
};

export default async function handler(_req, res) {
  try {
    let data = null;

    if (process.env.MOCK_LEADERBOARD === "1") {
      data = localFixture;
    } else {
      try {
        data = await getLeaderboard();
      } catch (storeErr) {
        if (process.env.VERCEL_ENV === "development" || process.env.NODE_ENV === "development") {
          console.warn("Store unavailable, using local fixture:", storeErr.message);
          data = localFixture;
        } else {
          throw storeErr;
        }
      }
    }

    if (!data) {
      return res.status(503).json({
        error: "No leaderboard data yet. Run /api/refresh to populate.",
      });
    }

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
