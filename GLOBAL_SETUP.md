# Global Edition Setup — Publisher v11

v11 turns the Publisher into a **public, multi-user app**: anyone can create
a free account, log in, and add **their own** API credentials. Credentials
live server-side in a locked vault table, tied to that user's login — never
in the browser, never in GitHub, never visible to any other user (or back
to the owner — secrets are write-only).

There are two different setup jobs below. **Part A** is done once by the
platform admin. **Part B** is what every new user does, in the app.

---

## Part A — Platform admin (one-time)

1. **Allow public signups (required):**
   Supabase Dashboard → your Publisher project → **Authentication** →
   Settings → turn **ON "Allow new users to sign up"**. (If "Confirm email"
   is on, new users click a confirmation link before first login — that is
   fine and recommended.)
2. **Run the SQL:** Dashboard → **SQL Editor** → New query → paste all of
   `global-setup.sql` → Run. It creates/keeps:
   - `publisher_state` — per-user settings/queue/history, own-row RLS.
   - `google_tokens` — legacy v1 vault (owner fallback), no public policies.
   - `user_credentials` — **new v11 vault**, RLS on, **no policies at all**;
     only the Edge Function (service_role, server-side) can read/write it.
3. **Redeploy the vault function (v2):** Dashboard → **Edge Functions** →
   `google-vault` → replace the code with
   `supabase/functions/google-vault/index.ts` (v2) → keep **"Verify JWT"
   OFF** (the function verifies the caller's JWT itself; the Google OAuth
   callback arrives without one) → Deploy.
4. **Old global Google secrets — keep or remove?**
   The v1 secrets (`DRIVE_CLIENT_ID`, `DRIVE_CLIENT_SECRET`, `YT_CLIENT_ID`,
   `YT_CLIENT_SECRET` in Edge Functions → Secrets) are now only a
   **fallback for the original owner**: if a caller has no Google
   credentials of their own saved, Google flows use those + `google_tokens`,
   so the owner's existing Connect Once setup keeps working. New users are
   unaffected either way. Keep them if the owner still relies on that
   fallback; remove them if the owner has saved their own credentials in
   the app like everyone else.
5. **Push v11 to GitHub Pages:** commit `index.html` (v11) + the new files
   to the repo → Pages republishes automatically. (Deployment is a separate,
   deliberate step — building v11 does not deploy it.)

## Part B — Every new user (in-app guide summary)

You bring your own free API keys. Nothing is shared with other users.

1. **Sign up** in the app with your email + password, confirm the email
   link if asked, then log in.
2. **Create a free Google Cloud project** (console.cloud.google.com):
   - Enable **Google Drive API**, **Google Sheets API** (for the tracker
     sheet), and **YouTube Data API v3**.
   - OAuth consent screen → External → add yourself as a Test user (or
     publish the consent screen later — see Limits).
   - Credentials → Create OAuth client → **Web application**, and set:
     - **Authorized JavaScript origin:** your app origin, e.g.
       `https://YOUR-USERNAME.github.io` (exactly, no path).
     - **Authorized redirect URI:** the vault function URL —
       `https://uvbwhnkvbzjdilqmivsy.supabase.co/functions/v1/google-vault`
       (use the platform's function URL shown in the app's Settings help /
       provided by the platform admin; self-hosters use their own).
   - You can use **one** OAuth client for both Drive and YouTube, or two
     separate ones (e.g. Drive files in one Google account, channel in
     another) — the app supports both.
3. **Copy your Client ID + Client Secret into the app:**
   Settings → **My Accounts & API Keys** → paste the Client ID (saved in
   your settings) and the Client Secret into the write-only box → **Save
   to my vault**. Do this for Drive and for YouTube. The secret is never
   shown back — the status panel only shows "Secret saved ✓".
4. **Connect once:** click **Connect Drive Once ∞** and **Connect YouTube
   Once ∞** at the top → sign in with the right Google account → Allow.
   After that, every browser where you log in connects automatically.
5. **Add your other platforms the same way (optional):**
   - **Meta:** Facebook Page ID + Instagram Business ID (settings) and
     your Page Access Token (Save to my vault). The app fetches the token
     from your vault only at the moment you publish.
   - **X:** API Key, API Secret, Access Token, Access Token Secret.
   - **TikTok:** Client Key, Client Secret.
   - **LinkedIn:** Client ID, Client Secret.
   X / TikTok / LinkedIn publishing runs through your Muse Bridge webhook
   (or a prepared Muse Job), because those platforms need a secret-holding
   backend — the vault gives that backend your keys per user.
6. **Your content settings:** your own Drive folder, your own tracker
   sheet, your channel name — all under the same Settings page, synced to
   your login only.

## Honest limits — read before relying on this

- **Google verification:** uploads made through an *unverified* Google
  OAuth app can be held **private** by YouTube until the app is verified
  by Google, and unverified apps have user caps. This is Google's rule,
  not an app bug. For a personal/test setup it is usually fine; a public
  platform should complete Google OAuth verification.
- **Where secrets physically live:** in the platform's Supabase
  `user_credentials` table. It has row-level security on and **no access
  policies**, so no browser key can read it — only the `google-vault`
  Edge Function, using the service_role key on the server after checking
  your login token, can. The platform operator (whoever controls that
  Supabase project) is therefore part of your trust chain, as with any
  hosted vault.
- **Zero third-party custody option:** if you want nobody else to hold
  your credentials at all, **self-host your own copy** — this repo is the
  whole app: fork it, create your own free Supabase project, run
  `global-setup.sql`, deploy the function, add `cloud-config.json` with
  your project's public URL + publishable key, and publish your fork on
  your own GitHub Pages. Then you are the platform admin of Part A and
  the only user of Part B.
- **Token lifetimes:** Meta page tokens expire (~60 days for long-lived
  ones) — when Meta publishing starts failing, save a fresh token to your
  vault. Google refresh tokens can be revoked anytime at
  myaccount.google.com/permissions.
