/* ==========================================================================
   MCmods — Bedrock page (separate from the Java browser).
   Bedrock content is curated and always opens the original source page.
   ========================================================================== */
(function () {
  const t = (key, vars) => (window.MCModsI18n ? window.MCModsI18n.t(key, vars) : key);
  const KINDS = {
    addon: "Add-on",
    texture: "Texture pack",
    tool: "Tweak pack",
    source: "Catalogue",
  };

  const state = { kind: "all", query: "" };
  const items = Array.isArray(window.MCMODS_BEDROCK) ? window.MCMODS_BEDROCK : [];

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initialsOf(title) {
    return String(title || "MC")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] || "")
      .join("")
      .toUpperCase();
  }

  function matches(item) {
    if (state.kind !== "all" && item.kind !== state.kind) return false;
    if (!state.query) return true;
    const haystack = `${item.name} ${item.author} ${item.summary} ${item.kind}`.toLowerCase();
    return haystack.includes(state.query.toLowerCase());
  }

  function card(item) {
    return `<article class="card bedrock-card">
      <div class="card-head">
        <span class="thumb" data-initials="${escapeHtml(initialsOf(item.name))}">${escapeHtml(
          initialsOf(item.name),
        )}</span>
        <div class="card-heading">
          <h3 class="card-title">${escapeHtml(item.name)}</h3>
          <p class="card-author">${item.author ? `by ${escapeHtml(item.author)}` : "community project"}</p>
        </div>
      </div>
      <p class="card-summary">${escapeHtml(item.summary)}</p>
      <div class="card-foot">
        <span class="tag">${escapeHtml(KINDS[item.kind] || item.kind)}</span>
        <a class="chip chip--link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
          t("bedrock.visit"),
        )} ↗</a>
      </div>
    </article>`;
  }

  function render() {
    const list = items.filter(matches);
    $("bedrock-grid").innerHTML = list.map(card).join("");
    $("bedrock-count").textContent = `${list.length} / ${items.length}`;
    $("bedrock-empty").hidden = list.length > 0;
    document.querySelectorAll("[data-kind]").forEach((chip) => {
      chip.classList.toggle("is-on", chip.dataset.kind === state.kind);
    });
  }

  function init() {
    const search = $("bedrock-search");
    search.addEventListener("input", () => {
      state.query = search.value.trim();
      render();
    });
    document.querySelectorAll("[data-kind]").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.kind = chip.dataset.kind;
        render();
      });
    });
    document.addEventListener("mcmods:lang", render);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
