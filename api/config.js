/**
 * GET /api/config
 *
 * Public embed settings (reserved for future white-label options).
 * Logo token is no longer exposed — logos are served via /api/logo.
 */

export const config = {
  runtime: "edge",
};

export default async function handler() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
