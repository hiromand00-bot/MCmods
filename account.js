/* ==========================================================================
   MCmods account page.
   Uses window.MCModsAuth (auth.js). Without a backend it falls back to a
   prefilled GitHub issue or an email to the owner, so submissions still reach
   the person who reviews them.
   ========================================================================== */
(function () {
  const t = (key, vars) => (window.MCModsI18n ? window.MCModsI18n.t(key, vars) : key);
  const auth = window.MCModsAuth;
  const cfg = window.MCMODS_CONFIG || {};

  const $ = (id) => document.getElementById(id);
  const state = { user: null, configured: false };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readForm() {
    return {
      name: $("field-name").value.trim(),
      url: $("field-url").value.trim(),
      type: $("field-type").value,
      summary: $("field-summary").value.trim(),
      by: state.user?.email || "",
    };
  }

  function valid(payload) {
    if (!payload.name || payload.name.length < 2) return "name";
    if (!/^https?:\/\/[^\s]+\./.test(payload.url)) return "url";
    return "";
  }

  function feedback(message, isError = false) {
    const node = $("submit-feedback");
    node.hidden = !message;
    node.classList.toggle("is-error", isError);
    node.textContent = message || "";
  }

  function paintSession() {
    const email = state.user?.email || "";
    $("account-email").textContent = email ? t("account.signedInAs", { email }) : t("account.guest");
    $("account-avatar").textContent = (email || "?").slice(0, 1).toUpperCase();
    $("signout-btn").hidden = !email;
    $("provider-row").hidden = Boolean(email);
    $("mine-panel").hidden = !(state.configured && email);
    $("owner-panel").hidden = !(state.configured && email && email.toLowerCase() === (cfg.ownerEmail || "").toLowerCase());
    $("setup-note").hidden = state.configured;
    $("account-hint").textContent = state.configured ? "" : t("account.setup");
  }

  function statusTag(status) {
    const key = status === "approved" || status === "rejected" ? status : "pending";
    return `<span class="pill pill--${key}">${escapeHtml(t(`account.${key}`))}</span>`;
  }

  function submissionRow(item, owner = false) {
    const id = escapeHtml(item.id || "");
    return `<li class="submission" data-id="${id}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        ${statusTag(item.status)}
        <p class="muted small"><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
          item.url,
        )}</a></p>
        ${item.summary ? `<p class="small">${escapeHtml(item.summary)}</p>` : ""}
      </div>
      ${
        owner && item.status === "pending"
          ? `<div class="submission-actions">
              <button class="btn btn--primary btn--small" type="button" data-review="approve">${escapeHtml(
                t("account.approve"),
              )}</button>
              <button class="btn btn--ghost btn--small" type="button" data-review="reject">${escapeHtml(
                t("account.reject"),
              )}</button>
            </div>`
          : ""
      }
    </li>`;
  }

  async function loadMine() {
    if (!state.configured || !state.user) return;
    try {
      const data = await auth.mine();
      const list = data.submissions || [];
      $("mine-list").innerHTML = list.map((item) => submissionRow(item)).join("");
    } catch (error) {
      $("mine-list").innerHTML = `<li class="muted small">${escapeHtml(error.message)}</li>`;
    }
  }

  async function loadPending() {
    if ($("owner-panel").hidden) return;
    try {
      const data = await auth.pending();
      const list = data.submissions || [];
      $("owner-hint").textContent = `${list.length} pending`;
      $("pending-list").innerHTML = list.map((item) => submissionRow(item, true)).join("");
    } catch (error) {
      $("pending-list").innerHTML = `<li class="muted small">${escapeHtml(error.message)}</li>`;
    }
  }

  function wire() {
    document.querySelectorAll("[data-provider]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!state.configured) {
          feedback(t("account.setup"), true);
          $("setup-note").scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        auth.signIn(button.dataset.provider);
      });
    });

    $("signout-btn")?.addEventListener("click", () => auth.signOut());

    $("submit-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = readForm();
      const problem = valid(payload);
      if (problem) {
        feedback(problem === "name" ? "Project name is required." : "Project link must be a full https URL.", true);
        return;
      }

      if (state.configured && state.user) {
        try {
          await auth.submit(payload);
          feedback(t("account.thanks"));
          $("submit-form").reset();
          loadMine();
        } catch (error) {
          feedback(t("account.error", { err: error.message }), true);
        }
        return;
      }

      // No backend: hand the submission to GitHub issues or the owner's inbox.
      const issue = auth.issueUrl(payload);
      if (issue) {
        window.open(issue, "_blank", "noopener");
        feedback(t("account.thanks"));
        return;
      }
      window.location.href = auth.mailtoUrl(payload);
      feedback(t("account.thanks"));
    });

    $("pending-list").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-review]");
      if (!button) return;
      const row = button.closest("[data-id]");
      const id = row?.dataset.id;
      if (!id) return;
      button.disabled = true;
      try {
        await auth.review(id, button.dataset.review);
        row.remove();
      } catch (error) {
        feedback(t("account.error", { err: error.message }), true);
        button.disabled = false;
      }
    });

    document.addEventListener("mcmods:lang", () => {
      paintSession();
      loadMine();
      loadPending();
    });
  }

  async function init() {
    if (!auth) return;
    const session = await auth.session(true);
    state.configured = Boolean(session.configured);
    state.user = session.user || null;

    const issue = auth.issueUrl({ name: "Project", url: "" });
    if (cfg.submissionsRepo) $("issue-link").hidden = false;

    paintSession();
    wire();
    loadMine();
    loadPending();
    void issue;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
