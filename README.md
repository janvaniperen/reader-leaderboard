# Reader Leaderboard

A hosted, embeddable leaderboard of the companies subscribed to a Beehiiv newsletter. Pulls from the Beehiiv API nightly, aggregates by email domain, and serves a polished widget you drop into a Beehiiv custom page (or anywhere else).

**What you get**

- A live leaderboard at `/` (e.g. `partners.juicenews.com`)
- A JSON API at `/api/leaderboard` for embedding elsewhere
- A nightly cron that refreshes the data from Beehiiv
- Company logos via [logo.dev](https://logo.dev) with a graceful initials fallback
- Theming via URL params — same deploy can power multiple branded embeds

---

## Architecture

```
                                   ┌─────────────────────┐
  Vercel Cron (nightly 04:00 UTC)  │                     │
  ──────────────────────────────▶  │  /api/refresh       │
                                   │  Pulls Beehiiv API  │
                                   │  Aggregates         │
                                   │  Writes to KV       │
                                   └──────────┬──────────┘
                                              │
                                              ▼
                                   ┌─────────────────────┐
  Beehiiv custom page              │                     │
  (or any iframe / fetch)          │  Vercel KV          │
  ─────────────────┐               │  leaderboard:current│
                   │               └──────────┬──────────┘
                   ▼                          │
        ┌────────────────────┐                │
        │                    │   reads        │
        │  /api/leaderboard  │ ◀──────────────┘
        │  Returns JSON      │
        │                    │
        └─────────┬──────────┘
                  │
                  ▼
        ┌────────────────────┐
        │                    │
        │  / (the widget)    │  ← what you embed in Beehiiv
        │  Renders JSON      │
        │                    │
        └────────────────────┘
```

---

## Deploy in ~10 minutes

### Prereqs

- A Vercel account
- A Beehiiv account with API access (you have this)
- A [logo.dev](https://logo.dev) account — free tier covers 500K requests/month

### 1. Clone and push to a Git repo

```bash
git clone <this>
cd reader-leaderboard
git remote set-url origin <your repo>
git push -u origin main
```

### 2. Create the Vercel project

In the Vercel dashboard:
1. Import the Git repo
2. Framework preset: **Other** (it's just static + serverless)
3. Deploy

### 3. Add Vercel KV

In the project's **Storage** tab:
1. Create a new **KV** database
2. Connect it to this project
3. Vercel auto-populates `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL`

### 4. Set environment variables

In **Settings → Environment Variables**, add:

| Variable                  | Value                                         |
|---------------------------|-----------------------------------------------|
| `BEEHIIV_API_KEY`         | From Beehiiv → Settings → Integrations → API  |
| `BEEHIIV_PUBLICATION_ID`  | Starts with `pub_` (e.g. `pub_fb9f9fcf-…`)    |
| `REFRESH_SECRET`          | `openssl rand -hex 32` — used for manual runs |
| `LOGO_DEV_TOKEN`          | Publishable key from [logo.dev](https://logo.dev) (`pk_…`) |

(`CRON_SECRET` is set automatically when Vercel Cron fires; you don't add it.)

Redeploy after adding env vars.

### 5. First manual refresh

The cron only runs at 04:00 UTC. To populate the data right away:

```bash
curl -X GET https://<your-vercel-url>/api/refresh \
     -H "Authorization: Bearer <REFRESH_SECRET>"
```

You should see something like:

```json
{
  "ok": true,
  "generatedAt": "2026-05-27T17:42:11.000Z",
  "totals": {
    "activeSubscribers": 1482,
    "companies": 549,
    "attributedReaders": 1133,
    "personalEmailReaders": 349
  },
  "tookMs": 18420
}
```

### 6. Get a logo.dev token

Sign up at [logo.dev](https://logo.dev), grab a **publishable** key (`pk_…`), and add it as `LOGO_DEV_TOKEN` in your env vars (step 4 above). The widget loads it automatically — no need to put it in the embed URL.

### 7. Visit your widget

`https://<your-vercel-url>/`

You should see the leaderboard.

---

## Embedding in Beehiiv

Beehiiv's **Custom Page** feature accepts custom HTML. There are two ways to embed:

### Option A — iframe (simplest, recommended)

```html
<iframe
  src="https://<your-vercel-url>/"
  style="width: 100%; height: 1800px; border: 0;"
  loading="lazy"
  title="Reader Leaderboard"
></iframe>
```

Set the height to roughly `(rows × 60px) + 400px` for header. The widget is self-contained; no resize-iframe shenanigans needed.

### Option B — direct fetch (advanced)

If Beehiiv allows arbitrary `<script>` on your plan, you can fetch the JSON directly and render in your own markup:

```html
<div id="leaderboard"></div>
<script>
  fetch("https://<your-vercel-url>/api/leaderboard")
    .then(r => r.json())
    .then(data => {
      // Your own rendering code
    });
</script>
```

---

## Configuring via URL params

The same deploy can serve multiple branded versions by reading URL params. This is how you'd resell to multiple Beehiiv operators down the line.

| Param         | Default                       | What it does                                       |
|---------------|-------------------------------|----------------------------------------------------|
| `data`        | `/api/leaderboard`            | Override the JSON URL (multi-tenant setups)        |
| `logoToken`   | _from `LOGO_DEV_TOKEN` env_   | Override logo.dev token (rare; for white-label embeds) |
| `initial`     | `20`                          | Rows shown before "Show more"                      |
| `max`         | `100`                         | Hard cap on rows ever displayed                    |
| `eyebrow`     | `Reader Leaderboard`          | Tiny pill above the title                          |
| `title`       | `The organisations <em>reading along</em>` | Big headline (HTML allowed in `<em>`) |
| `subtitle`    | _default copy_                | Subtitle under the title                           |
| `c_accent`    | `#ff7a1a`                     | Accent color (any `c_*` param maps to a CSS var)   |
| `c_bg`        | `#fffdf6`                     | Background color                                   |
| `c_ink`       | `#1a1410`                     | Body text color                                    |

Example:
```
?title=The%20brands%20reading%20<em>Juice%20News</em>
&c_accent=%23ff7a1a
&initial=25
```

---

## Manual refresh / forcing a re-sync

The cron runs nightly at 04:00 UTC. To force a refresh:

```bash
curl https://<your-vercel-url>/api/refresh \
  -H "Authorization: Bearer $REFRESH_SECRET"
```

Useful after bulk subscriber imports or list cleanups.

---

## Customising the company-name mapping

`lib/companies.js` has two exports:

- `PERSONAL_DOMAINS` — domains excluded from the leaderboard entirely (gmail, yahoo, etc.)
- `DOMAIN_TO_COMPANY` — overrides for domains where the auto-derived name is wrong or where multiple domains should roll up to one company (e.g. `doehler.com` + `doehler.com.br` → `Döhler`)

For any domain not in `DOMAIN_TO_COMPANY`, the widget auto-generates a name by title-casing the second-level domain (`fritz-kola.com` → `Fritz Kola`). To override or add merges, edit that file and redeploy.

For productise-later: this list becomes the "configuration" each customer needs. A future v2 could let customers edit it through a dashboard.

---

## Cost

- **Vercel Hobby** is free and covers this — well within bandwidth limits.
- **Vercel KV** — free tier covers it (we store one ~100KB JSON blob, read on each pageload behind a 10-minute CDN cache).
- **logo.dev free tier** — 500K requests/month. Each leaderboard view fires ~25 logo requests (only the visible rows). Realistically you'll never hit it.
- **Beehiiv API** — included in your plan.

Total: **$0/month** unless you grow large.

---

## Productising later

This is built single-tenant but the seams for multi-tenant are visible:

- **Per-customer data** — currently one KV key `leaderboard:current`. Change to `leaderboard:{customerId}` and key it by a path segment (`/api/leaderboard/{customerId}`).
- **Per-customer config** — currently env vars. Move to a `customers:{id}` KV entry storing publication ID, encrypted API key, theming defaults, the company-name overrides.
- **Onboarding** — a `/connect` page that takes a Beehiiv API key, validates it, creates a customer record.
- **Billing** — Stripe Checkout for a one-time license fee or recurring.

The embed, the aggregator, the Beehiiv client, and the logo.dev usage all stay the same. The productisation work is roughly: customer table + auth + a dashboard, plus changing the cron to iterate over customers.

---

## Files

```
.
├── api/
│   ├── config.js           ← public embed settings (logo token from env)
│   ├── leaderboard.js      ← GET endpoint, reads from KV
│   └── refresh.js          ← cron-triggered, writes to KV
├── lib/
│   ├── aggregate.js        ← email list → ranked companies
│   ├── beehiiv.js          ← API client
│   └── companies.js        ← domain → company-name mapping
├── public/
│   └── index.html          ← the embeddable widget
├── package.json
├── vercel.json             ← cron + headers config
└── .env.example
```
