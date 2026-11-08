# Google Vault — Authenticate Once (Publisher v8)

Goal: Manu signs in to Google **once** per service. After that the Publisher
works in **every browser** with no popups, and Krishna can publish via the
official API using the same vault.

How it works: a small Supabase Edge Function (`google-vault`) stores Google's
long-life **refresh token** in a locked table (`google_tokens`, RLS on, no
public policies). The app, when Manu is logged in, asks the function for a
fresh 1-hour access token. Client secrets live only as Supabase secrets —
never in the app, GitHub, or chat.

Publisher Supabase project: `uvbwhnkvbzjdilqmivsy`
Function URL: `https://uvbwhnkvbzjdilqmivsy.supabase.co/functions/v1/google-vault`

## Manu's one-time steps (in order)

1. **Table:** Supabase Dashboard → Publisher project → SQL Editor → paste
   `google-vault-setup.sql` → Run.
2. **Function:** Dashboard → Edge Functions → Create function, name it
   exactly `google-vault`, paste the code from
   `supabase/functions/google-vault/index.ts`, turn **OFF "Verify JWT"**,
   Deploy.
3. **Secrets:** Dashboard → Edge Functions → Secrets → add 4 secrets.
   Client IDs are already in the Publisher app's Settings. Client **secrets**
   are in Google Cloud Console → APIs & Services → Credentials → open the
   OAuth client → shown top-right ("Client secret").
   - `DRIVE_CLIENT_ID` / `DRIVE_CLIENT_SECRET` — the Manoj Stars project client
     (the Drive Client ID in app Settings)
   - `YT_CLIENT_ID` / `YT_CLIENT_SECRET` — the krishnaformanu project client
     (the YouTube Client ID in app Settings)
4. **Redirect URI:** in BOTH Google Cloud projects → Credentials → open the
   OAuth client → Authorized redirect URIs → Add:
   `https://uvbwhnkvbzjdilqmivsy.supabase.co/functions/v1/google-vault`
   → Save. (JavaScript origins stay as they are.)
5. **Connect once:** open the Publisher, log in, click **Connect Drive Once ∞**
   (Google popup → Manoj Stars account → Allow), then **Connect YouTube
   Once ∞** (Google popup → krishnaformanu@gmail.com → Allow). The app
   should log "connected permanently via Vault".
6. Done. Open the app in any other browser, log in with the Publisher
   email/password — Drive and YouTube connect themselves.

If Google ever returns "no refresh token" (happens if the app was already
authorized before): myaccount.google.com/permissions → remove the app's
access → click Connect Once again.

## Notes

- Google tokens from an unverified/personal OAuth app: YouTube uploads via
  API may be held as **private** until the OAuth app is verified by Google.
  If the first API upload lands private, that is this rule, not a bug.
- Revoke everything anytime: delete the row in `google_tokens` or remove
  access at myaccount.google.com/permissions.
