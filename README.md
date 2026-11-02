# Krishna Muse Publisher

**Google Drive → all social media, from one free GitHub Pages app.**
Built for Manu / **Resilience Resonance** (@ResilienceResonance).

Live URL after deploy: `https://manojstars.github.io/social-publisher/`

## What it does
- **Google Drive in:** Connect Google, list videos from your Drive folder
  (pre-filled: *Muse - AI - Automation*, ID `1rkK6gsGlz3c-1TcyY3O3ynrf8TnFRDJa`),
  preview, search, select.
- **Publish out:**
  - **YouTube Shorts** — direct resumable upload from the browser (YouTube Data API v3).
  - **Instagram Reels + Facebook Reels** — Meta Graph API using your Page/IG IDs + Page token.
  - **X, TikTok, LinkedIn** — via a **Muse Bridge webhook** (Make / n8n / Zapier / Supabase Function),
    because those APIs require secret keys that must never live in a static site.
    Without a webhook, the app prepares a structured **Muse Job** to paste to Krishna in Muse chat.
- **Talk to Muse:** Command Center (text + voice) with the trigger phrase:
  - `krishna! muse publish latest video to all`
  - `krishna! muse upload this to youtube and instagram`
  - `krishna! muse refresh drive`
  - `krishna! muse add latest to queue`
  - `krishna! muse export history`
  - `krishna! muse deploy` → opens Deploy help. In Muse chat, the same phrase tells Krishna to package a fresh deploy zip.
- **Queue, history & CSV export** — CSV columns match Manu's tracker sheet:
  `SL NO | Title | Link | Published`.
- **Demo mode** — works instantly with sample Resilience Resonance Shorts, no keys needed.

## Safety design
- Nothing auto-posts. Every publish needs an explicit press / confirmed command.
- No secrets in code or in GitHub. Google Client ID is public by design;
  tokens live only in your browser's localStorage on your device.
- Never commit: Google client secret, Meta app secret, service_role keys, passwords.

## Files
- `index.html` — the complete app (single file, like the CRM)
- `SETUP.md` — free Google + Meta API setup, step by step
- `README.md` — this file

## Deploy (GitHub Pages)
1. Create repo `social-publisher` on GitHub.
2. Upload `index.html` + `README.md` + `SETUP.md`, commit.
3. Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.
4. Open `https://manojstars.github.io/social-publisher/`
5. Follow SETUP.md to add that URL to your Google OAuth origins, then paste IDs in the app's Settings.
