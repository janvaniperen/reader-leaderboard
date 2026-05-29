/**
 * Drop-in Beehiiv embed loader — creates a self-resizing iframe.
 *
 * Usage:
 *   <script
 *     src="https://reader-leaderboard-iota.vercel.app/embed.js"
 *     data-params="title=The%20organisations%20<em>reading%20Juice%20News</em>&eyebrow=Reader%20Leaderboard"
 *   ></script>
 */
(function () {
  const script = document.currentScript;
  if (!script) return;

  const base = new URL(script.src).origin;
  const params = script.getAttribute("data-params") || "";
  const src = params ? `${base}/?${params}` : `${base}/`;

  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = script.getAttribute("data-title") || "Reader Leaderboard";
  iframe.setAttribute("scrolling", "no");
  iframe.style.cssText = "width:100%;border:0;display:block;min-height:480px;overflow:hidden;";

  script.insertAdjacentElement("afterend", iframe);

  window.addEventListener("message", (event) => {
    if (event.origin !== base) return;
    if (!event.data || event.data.type !== "reader-leaderboard:resize") return;
    iframe.style.height = `${event.data.height}px`;
  });
})();
