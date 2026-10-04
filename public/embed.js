/**
 * Drop-in Beehiiv embed loader — creates a self-resizing iframe.
 *
 * The referral bar is position:fixed inside the iframe, which pins it to the
 * embed, not the Beehiiv page. This script paints the same bar on the parent
 * page so it stays at the bottom of the screen while the list is in view.
 *
 * Usage:
 *   <script
 *     src="https://reader-leaderboard-iota.vercel.app/embed.js"
 *     data-params="title=The%20organizations%20<em>reading%20Juice%20News</em>&eyebrow=Reader%20Leaderboard"
 *     data-fallback-height="1600"
 *   ></script>
 */
(function () {
  const script = document.currentScript;
  if (!script) return;

  const base = new URL(script.src).origin;
  const params = script.getAttribute("data-params") || "";
  const src = params ? `${base}/?${params}` : `${base}/`;
  const fallbackHeight = parseInt(script.getAttribute("data-fallback-height") || "1600", 10);

  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = script.getAttribute("data-title") || "Reader Leaderboard";
  iframe.setAttribute("scrolling", "no");
  iframe.style.cssText =
    "width:100%;border:0;display:block;height:" + fallbackHeight + "px;overflow:hidden;";

  script.insertAdjacentElement("afterend", iframe);

  function setHeight(height) {
    iframe.style.height = Math.max(480, height) + "px";
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== base) return;
    if (!event.data || event.data.type !== "reader-leaderboard:resize") return;
    setHeight(event.data.height);
  });

  function requestHeight() {
    iframe.contentWindow?.postMessage({ type: "reader-leaderboard:request-height" }, base);
  }

  function claimReferBar() {
    iframe.contentWindow?.postMessage({ type: "reader-leaderboard:refer-host" }, base);
  }

  iframe.addEventListener("load", () => {
    requestHeight();
    claimReferBar();
    let n = 0;
    const id = setInterval(() => {
      requestHeight();
      claimReferBar();
      if (++n >= 12) clearInterval(id);
    }, 400);
  });

  mountParentReferBar(iframe);
})();

function hostWindow() {
  let win = window;
  try {
    while (win.parent && win.parent !== win) {
      void win.parent.document.body;
      win = win.parent;
    }
  } catch (e) {
    // Cross-origin parent. The bar stays in the highest document we can write.
  }
  return win;
}

function mountParentReferBar(leaderboardIframe) {
  const hostWin = hostWindow();
  const hostDoc = hostWin.document;
  const observed = hostWin === window ? leaderboardIframe : window.frameElement;
  if (!observed || hostDoc.querySelector(".rlb-refer")) return;

  const style = hostDoc.createElement("style");
  style.textContent = `
    .rlb-refer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 16px 28px;
      box-sizing: border-box;
      padding: 12px 24px;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      overflow: hidden;
      background: #1a1410;
      color: #fffdf6;
      font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      text-decoration: none;
      -webkit-font-smoothing: antialiased;
    }
    .rlb-refer.is-on { display: flex; }
    .rlb-refer-pixels {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .rlb-refer-copy, .rlb-refer-note { position: relative; z-index: 1; }
    .rlb-refer-kicker {
      display: block;
      margin: 0 0 2px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #f5b400;
    }
    .rlb-refer-title {
      display: block;
      font-family: Fraunces, Georgia, serif;
      font-weight: 600;
      font-size: 18px;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: #fffdf6;
    }
    .rlb-refer-note {
      max-width: 36ch;
      font-size: 12.5px;
      font-weight: 500;
      line-height: 1.4;
      text-align: right;
      color: rgba(255, 253, 246, 0.78);
    }
    @media (max-width: 520px) {
      .rlb-refer {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        padding: 12px 16px;
        padding-bottom: max(12px, env(safe-area-inset-bottom));
      }
      .rlb-refer-note { text-align: left; max-width: none; }
    }
  `;
  hostDoc.head.appendChild(style);

  if (!hostDoc.querySelector("link[data-rlb-font]")) {
    const font = hostDoc.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@500;600&display=swap";
    font.setAttribute("data-rlb-font", "");
    hostDoc.head.appendChild(font);
  }

  const bar = hostDoc.createElement("a");
  bar.className = "rlb-refer";
  bar.href = "https://juicenews.com/login";
  bar.target = "_blank";
  bar.rel = "noopener noreferrer";
  bar.innerHTML = `
    <canvas class="rlb-refer-pixels" aria-hidden="true"></canvas>
    <span class="rlb-refer-copy">
      <span class="rlb-refer-kicker">Raise the ranks</span>
      <span class="rlb-refer-title">Refer a new reader</span>
    </span>
    <span class="rlb-refer-note">Log in with the address that gets Juice News. Your referral link is in the profile, and it counts for anyone you invite.</span>
  `;
  hostDoc.body.appendChild(bar);

  const canvas = bar.querySelector(".rlb-refer-pixels");
  const ctx = canvas.getContext("2d");
  const palette = ["#ff7a1a", "#ff9a4a", "#f5b400", "#ffe7c4"];
  let width = 1;
  let height = 1;
  let hover = false;
  let particles = [];
  let raf = 0;
  let running = false;

  function makeParticle(anywhere) {
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 4,
      size: Math.random() < 0.55 ? 2 : 3,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -(0.22 + Math.random() * 0.42),
      phase: Math.random() * Math.PI * 2,
      alpha: 0.72 + Math.random() * 0.28,
      color: palette[(Math.random() * palette.length) | 0],
    };
  }

  function resize() {
    const rect = bar.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(36, Math.round(width / 11));
    particles = Array.from({ length: count }, () => makeParticle(true));
  }

  function tick() {
    if (!running) return;
    const boost = hover ? 2.6 : 1;
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.phase += 0.03 * boost;
      p.x += (p.vx + Math.sin(p.phase) * 0.22) * boost;
      p.y += p.vy * boost;
      if (p.y < -4 || p.x < -8 || p.x > width + 8) {
        const next = makeParticle(false);
        p.x = next.x;
        p.y = height + 3;
        p.size = next.size;
        p.vx = next.vx;
        p.vy = next.vy;
        p.phase = next.phase;
        p.alpha = next.alpha;
        p.color = next.color;
      }
      ctx.globalAlpha = Math.min(1, p.alpha * (hover ? 1.15 : 1));
      ctx.fillStyle = p.color;
      ctx.fillRect((p.x + 0.5) | 0, (p.y + 0.5) | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  }

  function setRunning(on) {
    if (on && !running) {
      running = true;
      resize();
      raf = requestAnimationFrame(tick);
    } else if (!on && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  bar.addEventListener("pointerenter", () => { hover = true; });
  bar.addEventListener("pointerleave", () => { hover = false; });
  hostWin.addEventListener("resize", () => { if (running) resize(); });

  const observer = new hostWin.IntersectionObserver((entries) => {
    const on = entries.some((entry) => entry.isIntersecting);
    bar.classList.toggle("is-on", on);
    setRunning(on);
  });
  observer.observe(observed);
}
