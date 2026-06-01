import {
  validLogoDomain,
  buildLogoDevUrl,
  LOGO_CACHE_CONTROL,
} from "../lib/logo.js";

/**
 * GET /api/logo?domain=example.com
 *
 * Proxies logo.dev with long CDN cache. LOGO_DEV_TOKEN stays server-side.
 * Returns 404 when logo.dev has no logo (widget shows initials fallback).
 */

export const config = {
  runtime: "edge",
};

const CORS = { "Access-Control-Allow-Origin": "*" };

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "GET") {
    return new Response(null, { status: 405, headers: CORS });
  }

  const domain = new URL(req.url).searchParams.get("domain")?.trim().toLowerCase();
  if (!validLogoDomain(domain)) {
    return new Response(null, { status: 400, headers: CORS });
  }

  const token = process.env.LOGO_DEV_TOKEN;
  if (!token) {
    return new Response(null, { status: 503, headers: CORS });
  }

  const upstream = await fetch(buildLogoDevUrl(domain, token), {
    headers: { Accept: "image/*" },
  });

  if (!upstream.ok) {
    return new Response(null, {
      status: upstream.status === 404 ? 404 : 502,
      headers: CORS,
    });
  }

  const contentType = upstream.headers.get("content-type") || "image/webp";

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": contentType,
      "Cache-Control": LOGO_CACHE_CONTROL,
    },
  });
}
