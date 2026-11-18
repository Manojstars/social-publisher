// Krishna Muse Publisher — Credentials Vault (Edge Function) v2 — Global Edition
// Purpose: EVERY logged-in user stores THEIR OWN API credentials server-side,
// tied to their login (table: user_credentials, service-role only). The app
// never sees secrets back — with one exception: get_secret for the Meta
// access_token, returned only to the authenticated owner at publish time.
//
// Actions (POST, JSON body, header: Authorization: Bearer <user JWT>):
//   save_credentials  {provider, client_id?, client_secret?, fields{...}}
//   credential_status {}
//   get_secret        {provider:'meta', field:'access_token'}   (only allowed pair)
//   delete_credentials{provider}
//   google_auth_url   {provider:'google_drive'|'google_youtube'}
//   google_exchange   {provider, code}
//   google_token      {provider}
// Plus the Google OAuth callback (GET ?code=...&state=<provider>.<user_id>),
// which Google reaches by redirect — it carries no JWT, so identity comes
// from the state value created by google_auth_url for that user.
//
// BACKWARD COMPATIBILITY (owner): if the caller has NO Google credentials
// saved and the legacy env secrets exist (DRIVE_CLIENT_ID / DRIVE_CLIENT_SECRET
// / YT_CLIENT_ID / YT_CLIENT_SECRET), Google flows fall back to the v1
// behaviour — env secrets + the google_tokens table — so the owner's existing
// "Connect Once" setup keeps working untouched.
//
// Secrets required (Dashboard → Edge Functions → Secrets) — NAMES only here:
//   (fallback only) DRIVE_CLIENT_ID, DRIVE_CLIENT_SECRET,
//                   YT_CLIENT_ID, YT_CLIENT_SECRET
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY
//
// Redirect URI each user adds in THEIR Google Cloud OAuth client:
//   https://uvbwhnkvbzjdilqmivsy.supabase.co/functions/v1/google-vault
//
// IMPORTANT: create/deploy this function with "Verify JWT" OFF — it does its
// own auth check below (and the Google callback arrives without a JWT).
// NEVER log credential values. Responses never contain client_secret or
// refresh_token values.

import { createClient } from "jsr:@supabase/supabase-js@2";

const APP_URL = Deno.env.get("APP_URL") ?? "https://manojstars.github.io/social-publisher/";
const SELF = Deno.env.get("VAULT_SELF_URL") ?? "https://uvbwhnkvbzjdilqmivsy.supabase.co/functions/v1/google-vault";

const PROVIDERS = ["google_drive", "google_youtube", "meta", "x", "tiktok", "linkedin"] as const;
type Provider = typeof PROVIDERS[number];

const SCOPES: Record<string, string> = {
  google_drive: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets",
  google_youtube: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
};

// Legacy v1 env fallback, keyed by provider (google only).
const ENV_CONF: Record<string, { id: string; secret: string; col: string; label: string }> = {
  google_drive: {
    id: Deno.env.get("DRIVE_CLIENT_ID") ?? "",
    secret: Deno.env.get("DRIVE_CLIENT_SECRET") ?? "",
    col: "drive_refresh",
    label: "Drive",
  },
  google_youtube: {
    id: Deno.env.get("YT_CLIENT_ID") ?? "",
    secret: Deno.env.get("YT_CLIENT_SECRET") ?? "",
    col: "yt_refresh",
    label: "YouTube",
  },
};
// Accept the short v1 service names too.
const ALIAS: Record<string, Provider> = {
  drive: "google_drive",
  youtube: "google_youtube",
  google_drive: "google_drive",
  google_youtube: "google_youtube",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
function backToApp(msg: string): Response {
  return Response.redirect(APP_URL + "?vault=" + encodeURIComponent(msg), 302);
}
function last4(v: unknown): string {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length >= 4 ? t.slice(-4) : "";
}

interface CredRow {
  user_id: string;
  provider: string;
  client_id: string | null;
  client_secret: string | null;
  access_token: string | null;
  refresh_token: string | null;
  extra: Record<string, unknown> | null;
}
async function getRow(userId: string, provider: Provider): Promise<CredRow | null> {
  const { data } = await admin().from("user_credentials").select("*")
    .eq("user_id", userId).eq("provider", provider).maybeSingle();
  return (data as CredRow) ?? null;
}
async function upsertRow(userId: string, provider: Provider, patch: Partial<CredRow>): Promise<void> {
  const existing = await getRow(userId, provider);
  const extra = { ...((existing?.extra ?? {}) as Record<string, unknown>), ...((patch.extra ?? {}) as Record<string, unknown>) };
  const row: Record<string, unknown> = {
    user_id: userId,
    provider,
    client_id: patch.client_id !== undefined ? patch.client_id : existing?.client_id ?? null,
    client_secret: patch.client_secret !== undefined ? patch.client_secret : existing?.client_secret ?? null,
    access_token: patch.access_token !== undefined ? patch.access_token : existing?.access_token ?? null,
    refresh_token: patch.refresh_token !== undefined ? patch.refresh_token : existing?.refresh_token ?? null,
    extra,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin().from("user_credentials").upsert(row, { onConflict: "user_id,provider" });
  if (error) throw new Error(error.message);
}

async function requireUser(req: Request): Promise<{ id: string } | null> {
  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!jwt) return null;
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: "Bearer " + jwt } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id };
}

async function googleTokenRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams(params),
  });
  return await tr.json().catch(() => ({}));
}

// Resolve which Google credentials to use for a user: their own saved row
// first; the legacy env fallback only when they have none saved.
async function resolveGoogle(userId: string, provider: Provider) {
  const row = await getRow(userId, provider);
  const env = ENV_CONF[provider];
  const hasOwn = !!(row && (row.client_id || row.client_secret || row.refresh_token));
  if (hasOwn) {
    return { mode: "own" as const, row, clientId: row!.client_id ?? "", clientSecret: row!.client_secret ?? "" };
  }
  if (env && env.id && env.secret) {
    return { mode: "fallback" as const, row, clientId: env.id, clientSecret: env.secret };
  }
  return { mode: "none" as const, row, clientId: "", clientSecret: "" };
}

async function storeGoogleTokens(userId: string, provider: Provider, mode: string, tok: Record<string, unknown>): Promise<void> {
  if (mode === "fallback") {
    const col = ENV_CONF[provider].col;
    const patch: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
    if (tok.refresh_token) patch[col] = tok.refresh_token;
    await admin().from("google_tokens").upsert(patch);
    return;
  }
  const extra: Record<string, unknown> = {};
  if (tok.expires_in) extra.expires_at = new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString();
  const patch: Partial<CredRow> = { extra };
  if (typeof tok.access_token === "string") patch.access_token = tok.access_token;
  if (typeof tok.refresh_token === "string") patch.refresh_token = tok.refresh_token;
  await upsertRow(userId, provider, patch);
}
async function storedRefresh(userId: string, provider: Provider, mode: string, row: CredRow | null): Promise<string> {
  if (mode === "fallback") {
    const { data } = await admin().from("google_tokens").select("drive_refresh, yt_refresh")
      .eq("user_id", userId).maybeSingle();
    const rec = (data ?? {}) as Record<string, string | null>;
    return rec[ENV_CONF[provider].col] ?? "";
  }
  if (mode === "own") return row?.refresh_token ?? "";
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // ---- Google OAuth callback (GET, no JWT — state carries provider.user_id)
  if (req.method === "GET" && url.searchParams.get("code")) {
    const [rawProvider, userId] = (url.searchParams.get("state") ?? "").split(".");
    const provider = ALIAS[rawProvider];
    if (!provider || !userId) return backToApp("bad callback state");
    const resolved = await resolveGoogle(userId, provider);
    if (resolved.mode === "none" || !resolved.clientId) {
      return backToApp("no Google credentials saved for this account — add your Client ID + Secret in the app Settings first");
    }
    const tok = await googleTokenRequest({
      code: url.searchParams.get("code")!,
      client_id: resolved.clientId,
      client_secret: resolved.clientSecret,
      redirect_uri: SELF,
      grant_type: "authorization_code",
    });
    if (!tok.refresh_token && resolved.mode === "own" && !resolved.row?.refresh_token) {
      return backToApp("connected but Google returned no refresh token — remove the app at myaccount.google.com/permissions and try Connect Once again");
    }
    await storeGoogleTokens(userId, provider, resolved.mode, tok);
    return backToApp((provider === "google_drive" ? "Drive" : "YouTube") + " connected permanently");
  }

  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // ---- Everything below requires a valid Supabase user JWT.
  const user = await requireUser(req);
  if (!user) return json({ error: "not logged in" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body is fine for status */ }
  // v1 query-string compatibility: ?action=token&service=drive|youtube
  const action = String(body.action ?? url.searchParams.get("action") ?? "");
  const rawProvider = String(body.provider ?? url.searchParams.get("service") ?? "");
  const provider = (ALIAS[rawProvider] ?? rawProvider) as Provider;

  try {
    if (action === "save_credentials") {
      if (!PROVIDERS.includes(provider)) return json({ error: "unknown provider" }, 400);
      const fields = (body.fields ?? {}) as Record<string, unknown>;
      const patch: Partial<CredRow> = { extra: { ...fields } };
      const cid = (body.client_id ?? fields.client_id ?? fields.client_key) as string | undefined;
      const csec = (body.client_secret ?? fields.client_secret) as string | undefined;
      if (cid !== undefined && String(cid).trim() !== "") patch.client_id = String(cid).trim();
      if (csec !== undefined && String(csec).trim() !== "") patch.client_secret = String(csec).trim();
      if (typeof fields.access_token === "string" && fields.access_token.trim() !== "") patch.access_token = fields.access_token.trim();
      if (typeof fields.refresh_token === "string" && fields.refresh_token.trim() !== "") patch.refresh_token = fields.refresh_token.trim();
      await upsertRow(user.id, provider, patch);
      const row = await getRow(user.id, provider);
      return json({ ok: true, provider, saved: true, hint: last4(row?.client_id || row?.access_token || "") });
    }

    if (action === "credential_status") {
      const { data } = await admin().from("user_credentials").select("*").eq("user_id", user.id);
      const rows = (data ?? []) as CredRow[];
      const providers: Record<string, { saved: boolean; hint: string }> = {};
      for (const p of PROVIDERS) {
        const row = rows.find((r) => r.provider === p);
        let saved = false;
        let hint = "";
        if (row) {
          const extra = (row.extra ?? {}) as Record<string, unknown>;
          saved = !!(row.client_id || row.client_secret || row.access_token || row.refresh_token ||
            Object.values(extra).some((v) => typeof v === "string" && v.trim() !== ""));
          hint = last4(row.client_id || row.access_token || (extra.access_token as string) || "");
          // Owner fallback: legacy google_tokens count as connected for Google.
          if (!saved && (p === "google_drive" || p === "google_youtube") && ENV_CONF[p].id) {
            const { data: gt } = await admin().from("google_tokens").select("drive_refresh, yt_refresh")
              .eq("user_id", user.id).maybeSingle();
            const rec = (gt ?? {}) as Record<string, string | null>;
            if (rec[ENV_CONF[p].col]) { saved = true; hint = ""; }
          }
        }
        providers[p] = { saved, hint };
      }
      return json({ ok: true, providers });
    }

    if (action === "get_secret") {
      // The ONLY secret ever returned: the caller's own Meta access_token,
      // which browser-side Meta publishing genuinely needs at publish time.
      if (provider !== "meta" || String(body.field ?? "") !== "access_token") {
        return json({ error: "that secret is never returned" }, 403);
      }
      const row = await getRow(user.id, "meta");
      const extra = (row?.extra ?? {}) as Record<string, unknown>;
      const value = row?.access_token || (typeof extra.access_token === "string" ? extra.access_token : "");
      if (!value) return json({ ok: true, access_token: "", saved: false });
      return json({ ok: true, access_token: value, saved: true });
    }

    if (action === "delete_credentials") {
      if (!PROVIDERS.includes(provider)) return json({ error: "unknown provider" }, 400);
      const { error } = await admin().from("user_credentials").delete()
        .eq("user_id", user.id).eq("provider", provider);
      if (error) throw new Error(error.message);
      return json({ ok: true, provider, deleted: true });
    }

    if (action === "google_auth_url") {
      if (provider !== "google_drive" && provider !== "google_youtube") return json({ error: "not a Google provider" }, 400);
      const resolved = await resolveGoogle(user.id, provider);
      if (!resolved.clientId) {
        return json({ error: "no client_id saved for " + provider + " — save your Client ID + Secret to your vault first" }, 400);
      }
      const g = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      g.searchParams.set("client_id", resolved.clientId);
      g.searchParams.set("redirect_uri", SELF);
      g.searchParams.set("response_type", "code");
      g.searchParams.set("scope", SCOPES[provider]);
      g.searchParams.set("access_type", "offline");
      g.searchParams.set("prompt", "consent");
      g.searchParams.set("state", provider + "." + user.id);
      return json({ ok: true, auth_url: g.toString() });
    }

    if (action === "google_exchange") {
      if (provider !== "google_drive" && provider !== "google_youtube") return json({ error: "not a Google provider" }, 400);
      const code = String(body.code ?? "");
      if (!code) return json({ error: "missing code" }, 400);
      const resolved = await resolveGoogle(user.id, provider);
      if (resolved.mode === "none" || !resolved.clientId) return json({ error: "no Google credentials saved for this account" }, 400);
      const tok = await googleTokenRequest({
        code,
        client_id: resolved.clientId,
        client_secret: resolved.clientSecret,
        redirect_uri: SELF,
        grant_type: "authorization_code",
      });
      if (!tok.access_token && !tok.refresh_token) {
        return json({ connected: false, error: String(tok.error_description || tok.error || "exchange failed") });
      }
      await storeGoogleTokens(user.id, provider, resolved.mode, tok);
      return json({ ok: true, connected: true });
    }

    if (action === "google_token" || action === "token") {
      if (provider !== "google_drive" && provider !== "google_youtube") return json({ error: "not a Google provider" }, 400);
      const resolved = await resolveGoogle(user.id, provider);
      if (resolved.mode === "none") return json({ connected: false });
      // Fresh-enough stored access token (per-user mode only)?
      if (resolved.mode === "own" && resolved.row?.access_token) {
        const exp = String(((resolved.row.extra ?? {}) as Record<string, unknown>).expires_at ?? "");
        if (exp && new Date(exp).getTime() > Date.now() + 60_000) {
          return json({ connected: true, access_token: resolved.row.access_token, expires_in: Math.floor((new Date(exp).getTime() - Date.now()) / 1000) });
        }
      }
      const refresh = await storedRefresh(user.id, provider, resolved.mode, resolved.row);
      if (!refresh) return json({ connected: false });
      const tok = await googleTokenRequest({
        client_id: resolved.clientId,
        client_secret: resolved.clientSecret,
        refresh_token: refresh,
        grant_type: "refresh_token",
      });
      if (!tok.access_token) {
        return json({ connected: false, error: String(tok.error_description || tok.error || "refresh failed — use Connect Once again") });
      }
      if (resolved.mode === "own") await storeGoogleTokens(user.id, provider, "own", tok);
      return json({ connected: true, access_token: tok.access_token, expires_in: tok.expires_in ?? 3500 });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "vault error" }, 500);
  }
});
