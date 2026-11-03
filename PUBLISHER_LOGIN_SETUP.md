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

## Step 4 — First device
1. Open https://manojstars.github.io/social-publisher/ (hard refresh
   Ctrl+Shift+R so v4 loads).
2. Login gate → paste the **new** Publisher URL + publishable key →
   **Save connection on this device**.
3. **Sign up** with a Publisher-only login (krishnaformanu@gmail.com fits —
   it's your work mail — or manojstar205@gmail.com with a *different*
   password than the CRM; these accounts are separate now).
4. If a confirmation email arrives, click it, then **Login**.
5. Your existing app settings on this device upload to the new project
   automatically. The Meta token is NOT synced — it stays per device.

## Step 5 — Every other device
Open the same link → paste the new URL + key once → login with the same
Publisher account → settings load from the cloud. Google Drive / YouTube
sign-ins are still per browser (Google requires that).

## Notes
- Forgot the *project URL/key*? They're in the Publisher project settings —
  the gate has "Change Supabase connection" if you pasted the wrong one.
- The old CRM project will simply never be used by the Publisher. If you ran
  the publisher SQL in the CRM project earlier by mistake, nothing breaks —
  that table just sits unused; you may leave it or drop it later.
