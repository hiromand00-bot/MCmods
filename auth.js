/* ==========================================================================
   MCmods auth client.
   Talks to the optional backend (worker.js) at MCMODS_CONFIG.authBase.
   With no backend configured everything degrades to the GitHub-issue / email
   path, so the site still works on plain static hosting.
   ========================================================================== */
(function () {
  const cfg = window.MCMODS_CONFIG || {};
  const base = String(cfg.authBase || "").replace(/\/$/, "");
  let cached = null;

  async function call(path, options = {}) {
    const headers = { accept: "application/json", ...(options.headers || {}) };
    if (options.body) headers["content-type"] = "application/json";
    const response = await fetch(`${base}/api${path}`, {
      credentials: "include",
      ...options,
      headers,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  const configured = () => Boolean(base);

  async function session(force = false) {
    if (cached && !force) return cached;
    if (!configured()) {
      cached = { user: null, configured: false };
      return cached;
    }
    try {
      cached = await call("/auth/session");
    } catch {
      cached = { user: null, configured: false };
    }
    return cached;
  }

  function signIn(provider) {
    const back = encodeURIComponent(location.href.split("#")[0]);
    location.href = `${base}/api/auth/${provider}/start?return=${back}`;
  }

  async function signOut() {
    try {
      await call("/auth/signout", { method: "POST" });
    } catch {
      /* the cookie may already be gone */
    }
    cached = null;
    location.reload();
  }

  const submit = (payload) => call("/submissions", { method: "POST", body: JSON.stringify(payload) });
  const mine = () => call("/submissions/mine");
  const pending = () => call("/submissions?status=pending");
  const review = (id, decision) =>
    call(`/submissions/${encodeURIComponent(id)}/review`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });

  function issueUrl(payload) {
    if (!cfg.submissionsRepo) return "";
    const title = `[submission] ${payload.name}`;
    const body = [
      "### Project",
      payload.name,
      "",
      `**Link:** ${payload.url}`,
      `**Type:** ${payload.type || "mod"}`,
      "",
      "### Summary",
      payload.summary || "_none_",
      "",
      `Sent from MCmods by ${payload.by || "a visitor"}.`,
    ].join("\n");
    return `https://github.com/${cfg.submissionsRepo}/issues/new?title=${encodeURIComponent(
      title,
    )}&body=${encodeURIComponent(body)}&labels=submission`;
  }

  function mailtoUrl(payload) {
    const subject = `MCmods submission: ${payload.name}`;
    const body = [
      `Project: ${payload.name}`,
      `Link: ${payload.url}`,
      `Type: ${payload.type || "mod"}`,
      "",
      payload.summary || "",
      "",
      `From: ${payload.by || "a visitor"}`,
    ].join("\n");
    return `mailto:${cfg.ownerEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  window.MCModsAuth = {
    configured,
    session,
    signIn,
    signOut,
    submit,
    mine,
    pending,
    review,
    issueUrl,
    mailtoUrl,
    ownerEmail: cfg.ownerEmail || "",
  };
})();
