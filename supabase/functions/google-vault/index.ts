// Krishna Muse Publisher — Google Vault (Edge Function)
// Purpose: Manu authenticates to Google ONCE per service. This function
// stores the long-life refresh token in the google_tokens table
// (service-role only) and hands out fresh 1-hour access tokens to the
// Publisher app whenever Manu is logged in — in ANY browser.
//
// Secrets required (Dashboard → Edge Functions → Secrets):
//   DRIVE_CLIENT_ID, DRIVE_CLIENT_SECRET     (Manoj Stars Google project)
//   YT_CLIENT_ID, YT_CLIENT_SECRET           (krishnaformanu Google project)
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY
//
// Redirect URI to add in BOTH Google Cloud OAuth clients:
//   https://uvbwhnkvbzjdilqmivsy.supabase.co/functions/v1/google-vault
//
// IMPORTANT: when creating this function in the Dashboard editor, turn
// OFF "Verify JWT" (the Google callback arrives without a Supabase JWT;
// identity for action=start is the user_id Manu is logged in as, and
// action=token verifies the caller's JWT manually below).

import { createClient } from "jsr:@supabase/supabase-js@2";

const APP_URL = "https://manojstars.github.io/social-publisher/";
const SELF = "https://uvbwhnkvbzjdilqmivsy.supabase.co/functions/v1/google-vault";

const CONF: Record<string, { id: string; secret: string; scope: string; col: string; label: string }> = {
  drive: {
    id: Deno.env.get("DRIVE_CLIENT_ID") ?? "",
    secret: Deno.env.get("DRIVE_CLIENT_SECRET") ?? "",
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets",
    col: "drive_refresh",
    label: "Drive",
  },
  youtube: {
    id: Deno.env.get("YT_CLIENT_ID") ?? "",
    secret: Deno.env.get("YT_CLIENT_SECRET") ?? "",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    col: "yt_refresh",
    label: "YouTube",
  },
};

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
function backToApp(msg: string): Response {
  return Response.redirect(APP_URL + "?vault=" + encodeURIComponent(msg), 302);
}
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "";
  const service = url.searchParams.get("service") ?? "";
  const conf = CONF[service];

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // ---- Step 1: send Manu to Google's consent screen (opens from the app)
  if (action === "start" && conf) {
    const userId = url.searchParams.get("uid") ?? "";
    if (!conf.id) return backToApp(service + " client id secret missing in Supabase");
    const g = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    g.searchParams.set("client_id", conf.id);
    g.searchParams.set("redirect_uri", SELF);
    g.searchParams.set("response_type", "code");
    g.searchParams.set("scope", conf.scope);
    g.searchParams.set("access_type", "offline");
    g.searchParams.set("prompt", "consent");
    g.searchParams.set("state", service + "." + userId);
    return Response.redirect(g.toString(), 302);
  }

  // ---- Step 2: Google sends him back here with a code → store refresh token
  if (url.searchParams.get("code")) {
    const [svc, userId] = (url.searchParams.get("state") ?? "").split(".");
    const c = CONF[svc];
    if (!c || !userId) return backToApp("bad callback state");
    const body = new URLSearchParams({
      code: url.searchParams.get("code")!,
      client_id: c.id,
      client_secret: c.secret,
      redirect_uri: SELF,
      grant_type: "authorization_code",
    });
    const tr = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
    const tok = await tr.json();
    if (!tok.refresh_token) {
      return backToApp(c.label + " connected but Google returned no refresh token — disconnect the app at myaccount.google.com/permissions and try Connect Once again");
    }
    const { error } = await admin().from("google_tokens").upsert({
      user_id: userId,
      [c.col]: tok.refresh_token,
      updated_at: new Date().toISOString(),
    });
    if (error) return backToApp("saving token failed: " + error.message);
    return backToApp(c.label + " connected permanently");
  }

  // ---- Step 3: app (any browser, Manu logged in) asks for a fresh access token
  if (action === "token" && req.method === "POST" && conf) {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return Response.json({ error: "not logged in" }, { status: 401, headers: cors });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: "Bearer " + jwt } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return Response.json({ error: "invalid login" }, { status: 401, headers: cors });
    const { data: row } = await admin().from("google_tokens").select("drive_refresh, yt_refresh").eq("user_id", userData.user.id).maybeSingle();
    const refresh = row ? (row as Record<string, string | null>)[conf.col] : null;
    if (!refresh) return Response.json({ connected: false }, { headers: cors });
    const body = new URLSearchParams({
      client_id: conf.id,
      client_secret: conf.secret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    });
    const tr = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
    const tok = await tr.json();
    if (!tok.access_token) {
      return Response.json({ connected: false, error: tok.error_description || tok.error || "refresh failed — use Connect Once again" }, { headers: cors });
    }
    return Response.json({ connected: true, access_token: tok.access_token, expires_in: tok.expires_in ?? 3500 }, { headers: cors });
  }

  return new Response("google-vault: unknown action", { status: 400 });
});
