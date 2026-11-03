# Publisher Login Setup — one-time, ~5 minutes

The publisher (v3) uses the **same Supabase project and the same login**
as your CRM (`manojstar205@gmail.com`). No new account, no new project.

## Step 1 — Create the sync table (once, 2 min)
1. Open your Supabase project → **SQL Editor** → New query.
2. Paste all of `publisher-login-setup.sql` → **Run**.
3. Expect: "Success" + the verify query lists `publisher_state | true`.
   This table stores your publisher settings, locked so each logged-in
   user can only see their own row (RLS). Anonymous visitors get nothing.

## Step 2 — First device (the one where you already use the app)
1. Open https://manojstars.github.io/social-publisher/ (hard refresh).
2. Login gate → Supabase URL is pre-filled with your project.
   Paste your **publishable / anon key** (same value you pasted in CRM
   Settings → Cloud Sync — from Supabase → Project Settings → API Keys).
   ⚠️ Never the `service_role` key. → **Save connection on this device**.
3. Login with your **CRM email + password**.
4. Your current settings (Drive Client ID etc.) upload to the cloud
   automatically. The Meta token is NOT synced — it stays on each device.

## Step 3 — Every other device (phone, office PC, etc.)
1. Open the same live link.
2. Paste the publishable key once on that device (Step 2.2), then login
   with the same email + password.
3. Your settings, queue and history load from the cloud automatically.
   You only re-do the Google Drive / YouTube sign-ins per device —
   Google requires that per browser, no app can skip it.

## Notes
- Confirm email stays **ON** (your choice for the CRM): brand-new signups
  must click the email link before first login. Your existing CRM login
  already works — no signup needed.
- Forgetting the password: Supabase Dashboard → Authentication → Users,
  or use the CRM's reset flow — it's literally the same account.
- Safety model: the public app link shows only a login gate. Without a
  login, no settings, no videos and no posting — on every device.
