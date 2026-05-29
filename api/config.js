/**
 * GET /api/config
 *
 * Returns public embed settings from environment variables.
 * The logo.dev publishable token is safe to expose to the browser —
 * logo.dev expects it in client-side image URLs.
 */

export const config = {
  runtime: "edge",
};

export default async function handler() {
  return new Response(
    JSON.stringify({
      logoToken: process.env.LOGO_DEV_TOKEN || "",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
