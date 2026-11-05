/* ==========================================================================
   Account + submissions API, mounted by worker.js.
   Real OAuth for Google, Microsoft and GitHub. Secrets live in env vars only:
     GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
     MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET
     GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
     SESSION_SECRET  (any long random string; signs the session cookie)
     OWNER_EMAIL     (defaults to hiromand00@gmail.com)
   Data lives in D1 (env.DB). Without a DB binding the API answers 501, so the
   static site keeps working and no fake state is invented.
   ========================================================================== */

const OWNER_FALLBACK = "hiromand00@gmail.com";
const SESSION_COOKIE = "mcmods_session";
const STATE_COOKIE = "mcmods_state";
const SESSION_TTL = 60 * 60 * 24 * 30;
const STATE_TTL = 60 * 10;

const PROVIDERS = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    idEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET",
  },
  microsoft: {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid profile email User.Read",
    idEnv: "MICROSOFT_CLIENT_ID",
    secretEnv: "MICROSOFT_CLIENT_SECRET",
  },
  github: {
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    idEnv: "GITHUB_CLIENT_ID",
    secretEnv: "GITHUB_CLIENT_SECRET",
  },
};

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const enc = new TextEncoder();

function b64url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return atob(padded);
}

async function sign(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

async function createToken(secret, payload, ttl) {
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl }));
  return `${body}.${await sign(secret, body)}`;
}

async function readToken(secret, token) {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if ((await sign(secret, body)) !== signature) return null;
  try {
    const payload = JSON.parse(fromB64url(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookies(request) {
  const header = request.headers.get("cookie") || "";
  const out = {};
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name) out[name] = decodeURIComponent(rest.join("="));
  }
  return out;
}

function cookie(name, value, maxAge, secure) {
  const bits = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

async function sessionUser(request, env) {
  if (!env.SESSION_SECRET) return null;
  const token = cookies(request)[SESSION_COOKIE];
  const payload = await readToken(env.SESSION_SECRET, token);
  if (!payload || !payload.email) return null;
  return { email: payload.email, name: payload.name || "", provider: payload.provider || "" };
}

function ownerEmail(env) {
  return String(env.OWNER_EMAIL || OWNER_FALLBACK).toLowerCase();
}

function isOwner(user, env) {
  return Boolean(user && user.email && user.email.toLowerCase() === ownerEmail(env));
}

async function db(env) {
  if (!env.DB) return null;
  await env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT, provider TEXT, created_at TEXT)",
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, email TEXT, name TEXT, url TEXT, type TEXT, summary TEXT, status TEXT, created_at TEXT, reviewed_at TEXT, reviewed_by TEXT)",
    ),
  ]);
  return env.DB;
}

function providerFrom(url) {
  const match = url.pathname.match(/^\/api\/auth\/(google|microsoft|github)\//);
  return match ? match[1] : null;
}

function safeReturn(value) {
  const target = String(value || "/account.html");
  return target.startsWith("/") && !target.startsWith("//") ? target : "/account.html";
}

async function profile(provider, accessToken) {
  if (provider === "google") {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Google profile request failed");
    const data = await res.json();
    return { email: data.email, name: data.name || data.email, provider };
  }
  if (provider === "microsoft") {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Microsoft profile request failed");
    const data = await res.json();
    const email = data.mail || data.userPrincipalName;
    return { email, name: data.displayName || email, provider };
  }
  const res = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/vnd.github+json", "user-agent": "mcmods" },
  });
  if (!res.ok) throw new Error("GitHub profile request failed");
  const data = await res.json();
  let email = data.email;
  if (!email) {
    const list = await fetch("https://api.github.com/user/emails", {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/vnd.github+json", "user-agent": "mcmods" },
    });
    if (list.ok) {
      const emails = await list.json();
      email = (emails.find((item) => item.primary) || emails[0] || {}).email || "";
    }
  }
  return { email, name: data.name || data.login || email, provider };
}

async function tokenExchange(provider, env, code, redirectUri) {
  const config = PROVIDERS[provider];
  const body = new URLSearchParams({
    client_id: env[config.idEnv],
    client_secret: env[config.secretEnv],
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(config.token, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || "Token exchange failed");
  return data.access_token;
}

export async function handleAccountRequest(request, env, url) {
  if (!url.pathname.startsWith("/api/auth/") && !url.pathname.startsWith("/api/submissions")) return null;

  const secure = url.protocol === "https:";

  /* ------------------------------------------------------------ session */
  if (url.pathname === "/api/auth/session") {
    const user = await sessionUser(request, env);
    return json({ configured: Boolean(env.SESSION_SECRET && env.DB), user });
  }

  if (url.pathname === "/api/auth/signout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", 0, secure) });
  }

  /* ------------------------------------------------------------- oauth */
  const provider = providerFrom(url);
  if (provider) {
    const config = PROVIDERS[provider];
    const clientId = env[config.idEnv];
    const clientSecret = env[config.secretEnv];
    if (!clientId || !clientSecret || !env.SESSION_SECRET) {
      return json(
        {
          message: `${provider} sign-in is not configured. Set ${config.idEnv}, ${config.secretEnv} and SESSION_SECRET.`,
        },
        500,
      );
    }

    const redirectUri = `${url.origin}/api/auth/${provider}/callback`;

    if (url.pathname.endsWith("/start")) {
      const stateToken = await createToken(env.SESSION_SECRET, {
        provider,
        back: safeReturn(url.searchParams.get("return")),
        nonce: crypto.randomUUID(),
      }, STATE_TTL);
      const authorize = new URL(config.authorize);
      authorize.searchParams.set("client_id", clientId);
      authorize.searchParams.set("redirect_uri", redirectUri);
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("scope", config.scope);
      authorize.searchParams.set("state", stateToken);
      if (provider === "google") authorize.searchParams.set("prompt", "select_account");
      if (provider === "microsoft") authorize.searchParams.set("response_mode", "query");
      return new Response(null, {
        status: 302,
        headers: { location: authorize.toString(), "set-cookie": cookie(STATE_COOKIE, stateToken, STATE_TTL, secure) },
      });
    }

    if (url.pathname.endsWith("/callback")) {
      const state = url.searchParams.get("state") || "";
      const code = url.searchParams.get("code") || "";
      const statePayload = await readToken(env.SESSION_SECRET, state);
      if (!statePayload || statePayload.provider !== provider) return json({ message: "Invalid OAuth state" }, 400);
      if (!code) return json({ message: url.searchParams.get("error") || "Missing code" }, 400);

      const accessToken = await tokenExchange(provider, env, code, redirectUri);
      const user = await profile(provider, accessToken);
      if (!user.email) return json({ message: "The provider did not return an email address" }, 400);

      const database = await db(env);
      if (database) {
        await database
          .prepare("INSERT OR REPLACE INTO users (email, name, provider, created_at) VALUES (?, ?, ?, ?)")
          .bind(user.email.toLowerCase(), user.name, provider, new Date().toISOString())
          .run();
      }

      const sessionToken = await createToken(
        env.SESSION_SECRET,
        { email: user.email.toLowerCase(), name: user.name, provider },
        SESSION_TTL,
      );
      return new Response(null, {
        status: 302,
        headers: {
          location: statePayload.back || "/account.html",
          "set-cookie": cookie(SESSION_COOKIE, sessionToken, SESSION_TTL, secure),
        },
      });
    }
  }

  /* ------------------------------------------------------- submissions */
  const user = await sessionUser(request, env);
  const database = await db(env);
  if (!database) return json({ message: "Submissions need a D1 database (bind DB)." }, 501);

  if (url.pathname === "/api/submissions/mine") {
    if (!user) return json({ message: "Sign in first" }, 401);
    const rows = await database
      .prepare("SELECT id, name, url, type, summary, status, created_at FROM submissions WHERE email = ? ORDER BY created_at DESC")
      .bind(user.email)
      .all();
    return json({ submissions: rows.results || [] });
  }

  const reviewMatch = url.pathname.match(/^\/api\/submissions\/([^/]+)\/review$/);
  if (reviewMatch && request.method === "POST") {
    if (!user) return json({ message: "Sign in first" }, 401);
    if (!isOwner(user, env)) return json({ message: "Only the owner can review submissions" }, 403);
    const decision = await request.json().catch(() => ({}));
    if (!["approve", "reject"].includes(decision.decision)) return json({ message: "Unknown decision" }, 400);
    const status = decision.decision === "approve" ? "approved" : "rejected";
    await database
      .prepare("UPDATE submissions SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?")
      .bind(status, new Date().toISOString(), user.email, decodeURIComponent(reviewMatch[1]))
      .run();
    return json({ ok: true, status });
  }

  if (url.pathname === "/api/submissions") {
    if (request.method === "GET") {
      if (!user) return json({ message: "Sign in first" }, 401);
      if (!isOwner(user, env)) return json({ message: "Only the owner can review submissions" }, 403);
      const status = url.searchParams.get("status") || "pending";
      const rows = await database
        .prepare("SELECT id, email, name, url, type, summary, status, created_at FROM submissions WHERE status = ? ORDER BY created_at ASC")
        .bind(status)
        .all();
      return json({ submissions: rows.results || [] });
    }

    if (request.method === "POST") {
      if (!user) return json({ message: "Sign in first" }, 401);
      const body = await request.json().catch(() => ({}));
      const name = String(body.name || "").trim().slice(0, 120);
      const linkUrl = String(body.url || "").trim();
      const type = String(body.type || "mods").trim().slice(0, 32);
      const summary = String(body.summary || "").trim().slice(0, 400);
      if (name.length < 2) return json({ message: "Project name is required" }, 400);
      if (!/^https?:\/\/[^\s]+\./.test(linkUrl)) return json({ message: "Project link must be a full https URL" }, 400);

      const id = crypto.randomUUID();
      await database
        .prepare(
          "INSERT INTO submissions (id, email, name, url, type, summary, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
        )
        .bind(id, user.email, name, linkUrl, type, summary, new Date().toISOString())
        .run();
      return json({ ok: true, id, status: "pending" }, 201);
    }
  }

  return json({ message: "Not found" }, 404);
}
