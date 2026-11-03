# SETUP — Free API keys (one-time, ~15 min)

Do these in order, one step at a time. Paste values ONLY into the app's
Settings page on your own device — never into chat, never into GitHub.

## 1. Deploy first
Follow README → Deploy. Note your live URL, e.g.
`https://manojstars.github.io/social-publisher/`

## 2. Google — TWO separate accounts (v2 split setup) — free
The videos live in the **Manoj Stars** account's Drive, the channel lives in
**starkojunction@gmail.com**. The app now has separate Drive and YouTube
sign-ins, so do this setup TWICE, once in each Google account:

### 2A. Drive setup (do it signed in as Manoj Stars — the Drive owner)
1. console.cloud.google.com → create project `Muse Publisher Drive`.
2. APIs & Services → Library → enable **Google Drive API**.
3. OAuth consent screen → External → add the Manoj Stars email as a Test user.
4. Credentials → Create Credentials → OAuth client ID → **Web application**.
   Authorized JavaScript origin: `https://manojstars.github.io` (exactly, no path).
5. Copy the **Client ID** → app Settings → **Drive API — OAuth Client ID** → Save.
   In the app, top button **Connect Drive** → in the Google popup, pick the
   **Manoj Stars** account.

### 2B. YouTube setup (do it signed in as starkojunction@gmail.com — channel owner)
1. console.cloud.google.com (switch account, top-right) → create project
   `Muse Publisher YouTube`.
2. APIs & Services → Library → enable **YouTube Data API v3**.
3. OAuth consent screen → External → add **starkojunction@gmail.com** as Test user.
4. Credentials → OAuth client ID → **Web application**.
   Authorized JavaScript origin: `https://manojstars.github.io` (same as above).
5. Copy the **Client ID** → app Settings → **YouTube API — OAuth Client ID** → Save.
   In the app, top button **Connect YouTube** → in the Google popup, pick
   **starkojunction@gmail.com**.

⚠️ Client *Secrets* are never used by this app. Do not paste them anywhere.
Alternative shortcut: share the Drive folder to starkojunction@gmail.com as
Viewer and use a single account — but the split setup above is cleaner and
keeps each account's permissions separate.

YouTube quota note: free quota is ~10,000 units/day; one upload costs ~1,600,
so ~6 uploads/day free. Plenty for 2 Shorts/day.

## 3. Meta (Facebook + Instagram) — free
1. developers.facebook.com → Create app → type: Business → name `Muse Publisher`.
2. Add products: Facebook Login / Instagram Graph API as offered in your dashboard.
3. Your Instagram must be a Business/Creator account linked to your Facebook Page
   (Instagram app → Settings → Accounts Centre → link the Page).
4. Graph API Explorer → select your app → Get Page Access Token →
   permissions: `pages_show_list, pages_manage_posts, instagram_basic, instagram_content_publish`.
5. Find IDs in Graph Explorer: `me/accounts` gives Page ID + page token;
   `/{page-id}?fields=instagram_business_account` gives the IG Business ID.
6. Paste Page ID, IG ID, and the Page token into the app → Settings → Save.
   (Long-lived tokens last ~60 days; re-paste when publishing starts failing.)

Known limit: Facebook Reels binary upload (`rupload.facebook.com`) is often
CORS-blocked from a browser/GitHub Pages. If FB fails in-app, the job is
automatically ready for the Muse Bridge (step 4) — Instagram does not have this issue.

## 4. Muse Bridge webhook (X, TikTok, LinkedIn + auto-notify) — free tier
Pick ONE:
- **Make.com (free):** Create scenario → Webhooks → Custom webhook → copy URL.
  Add modules after it: X / TikTok / LinkedIn (their own connections), plus an
  HTTP or WhatsApp/Telegram module to notify you / log to your Google Sheet.
- **n8n / Zapier:** same idea — a webhook trigger URL.
Paste the webhook URL into the app → Settings → Muse Bridge Webhook URL → Save.
Test: Compose → tick X → Publish → you should see the job arrive in Make/n8n.

No webhook? No problem — use **Prepare Muse Job**, copy it, and paste it to
Krishna in your Muse chat/WhatsApp. Krishna confirms results back to you there.

## 5. Muse command reference
In the app's Command Center (or voice):
- `krishna! muse refresh drive`
- `krishna! muse publish latest video to all`
- `krishna! muse upload this to youtube and instagram`
- `krishna! muse add latest to queue`
- `krishna! muse export history`
- `krishna! muse deploy`

In Muse chat: `krishna! muse deploy` = Krishna packages the latest app zip for GitHub upload.
