# MUSE ACCESS — Krishna as operator of this app

Manu granted on 2026-11-02: "Muse to have complete access over it."

## What "complete access" means here
Krishna (Muse) operates the Krishna Muse Publisher end-to-end when Manu commands it:

1. **Code & deploy (GitHub)** — Muse GitHub connector is connected as `Manojstars`.
   - Muse can read/write repositories that Manu selects for the Muse GitHub App
     (GitHub → Apps → Meta Muse AI → Repository access).
   - Creating brand-new repos via the app returned: `403 Resource not accessible by integration`
     — GitHub Apps cannot create repos for a user. So Manu creates the empty repo
     `social-publisher` once (30 seconds), selects it for Muse, and from then on
     Krishna pushes every update, fixes bugs, and redeploys with `krishna! muse deploy`.
   - GitHub Pages on/off is a repo Settings toggle only the owner can flip the first time.

2. **Google Drive (videos in)** — ✅ Connected to Muse.
   Krishna can list/download videos from the shared folder
   "Muse - AI - Automation" (ID 1rkK6gsGlz3c-1TcyY3O3ynrf8TnFRDJa) on command.

3. **Instagram** — Not yet linked. Needs Manu's one tap in Meta Accounts Center
   (link in chat). Once linked, Krishna can publish Reels via `instagram-cli post-feed`
   (each publish still shows Muse's approval card).

4. **Facebook** — Not yet linked. Same Meta Accounts Center tap.
   Once linked, Krishna can publish to Pages Manu manages.

5. **YouTube** — Channel Resilience Resonance is signed in in the browser
   (starkojunction@gmail.com). ⚠️ Manu's STOP rule (2026-11-02, ban risk) still applies
   unless Manu explicitly reverses it: Krishna does NOT upload to YouTube.
   The publisher app itself only uploads when Manu triggers it in his own browser.

6. **X / TikTok / LinkedIn** — No direct Muse connector for publishing.
   Route remains the app's Muse Bridge webhook, or Krishna prepares the post
   and Manu / the webhook service posts it.

## Command protocol
- In Muse chat / WhatsApp, Manu says: `krishna! muse <job>` or pastes a
  `KRISHNA! MUSE JOB` block from the app.
- Krishna executes with the connectors above, reports each platform result,
  and logs it. Approval cards from Muse/GitHub/Meta are system prompts —
  Krishna cannot bypass them, and they are the safety lock on every write.
