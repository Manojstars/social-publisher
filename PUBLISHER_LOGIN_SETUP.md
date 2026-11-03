# Publisher Login Setup — SEPARATE Supabase project (v4)

Decision (2026-11-03): the Publisher does **NOT** use the CRM's Supabase
project. It gets its own free project, so CRM users can never log into the
Publisher and Publisher signups never appear in the CRM. Your CRM and its
database are completely untouched by this setup.

## Step 1 — Create the Publisher project (once, ~3 min)
1. Go to supabase.com → your account → **New project**.
2. Organization: your existing org. Name: `Muse Publisher`.
3. Region: Central EU (Frankfurt) — same as your CRM, or the nearest offered.
4. Set a **database password** when asked — save it in your password manager
   / secure storage. You won't need it for the app, only for project admin.
   Do NOT paste it in chat.
5. Plan: Free → Create. Wait ~2 minutes until the project shows Healthy.

## Step 2 — Create the sync table in the NEW project (once, 2 min)
1. In the **Publisher project** (check the name at the top — not the CRM
   project) → **SQL Editor** → New query.
2. Paste all of `publisher-login-setup.sql` → **Run**.
3. Expect: "Success" + the verify query lists `publisher_state | true`.
   This is the only table the Publisher uses, locked per user (RLS).

## Step 3 — Get the new project's URL + publishable key
Publisher project → **Settings / Connect** (or Project Settings → API Keys):
- Project URL: `https://<something>.supabase.co`
- Publishable (anon) key.
⚠️ Never copy the `service_role` / secret key into the app or chat.

## Step 4 — Make it COMPLETE CLOUD: add cloud-config.json (once, 2 min)
So no device ever asks for the URL/key again, the app reads its public
connection config from a file in the repo itself:
1. Go to github.com/Manojstars/social-publisher → **Add file → Create new file**.
2. File name: `cloud-config.json`
3. Paste exactly this, with YOUR Publisher project's values:
   `{"url": "https://YOUR-PROJECT.supabase.co", "key": "YOUR-PUBLISHABLE-KEY"}`
4. **Commit changes.** Wait ~1 minute for Pages to republish.
Is it safe for this file to be public in the repo? **Yes** — the publishable
key is designed to be public in browser apps; your data is protected by your
login + the row-level security rules from Step 2. The *secret / service_role*
key is the one that must never go anywhere — and it is NOT in this file.

## Step 5 — First login (any device)
1. Open https://manojstars.github.io/social-publisher/ (hard refresh).
2. The gate now shows only email + password (no URL/key boxes).
   **Sign up** with your Publisher-only login (use a mailbox you can open
   for the confirmation link), then **Login**.
3. Everything — settings, both Google Client IDs, even the Meta token,
   queue and history — syncs to the cloud. This browser keeps only a cache.

## Step 6 — Every other device
Open the link → Login → everything is already there.
The only per-device step left in the whole system is Google's own
Drive / YouTube sign-in inside the app (Google forces a consent tap per
browser and its tokens expire in ~1 hour — no app can cloud-sync those,
not even Google's own apps skip it).

## Notes
- Forgot the *project URL/key*? They're in the Publisher project settings —
  the gate has "Change Supabase connection" if you pasted the wrong one.
- The old CRM project will simply never be used by the Publisher. If you ran
  the publisher SQL in the CRM project earlier by mistake, nothing breaks —
  that table just sits unused; you may leave it or drop it later.
