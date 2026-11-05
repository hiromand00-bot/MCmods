/* ==========================================================================
   MCmods frontend — vanilla ES module, no build step.
   ========================================================================== */

const API = "/api";
const FAVORITES_KEY = "mcmods:favorites:v1";
const FEED_FALLBACK_SECONDS = 60;

const SORT_KEYS = {
  relevance: "sort.relevance",
  downloads: "sort.downloads",
  follows: "sort.follows",
  newest: "sort.newest",
  updated: "sort.updated",
};

const TYPES = {
  mods: {
    label: "Mods",
    one: "mod",
    plural: "mods",
    placeholder: "Search mods, authors, features…",
  },
  resourcepacks: {
    label: "Resource packs",
    one: "resource pack",
    plural: "resource packs",
    placeholder: "Search resource packs, textures, authors…",
  },
  datapacks: {
    label: "Data packs",
    one: "data pack",
    plural: "data packs",
    placeholder: "Search data packs, recipes, loot tables…",
  },
  shaders: {
    label: "Shaders",
    one: "shader",
    plural: "shaders",
    placeholder: "Search shaders, lighting packs, authors…",
  },
  modpacks: {
    label: "Modpacks",
    one: "modpack",
    plural: "modpacks",
    placeholder: "Search modpacks, quest packs, authors…",
  },
};

const typeInfo = () => TYPES[state.type] || TYPES.mods;

const NICE_NAMES = {
  neoforge: "NeoForge",
  liteloader: "LiteLoader",
  "game-mechanics": "Game Mechanics",
  "worldgen": "World Generation",
  "mobs": "Mobs",
  "technology": "Technology",
  "decoration": "Decoration",
  "library": "Library",
  "utility": "Utility",
};

const state = {
  view: "browse",
  query: "",
  type: "mods",
  source: "all",
  sort: "relevance",
  categories: new Set(),
  loaders: new Set(),
  version: "",
  offset: 0,
  limit: 24,
  mods: [],
  total: 0,
  loading: false,
  error: null,
  tagsLoaded: false,
  curseforgeConfigured: true,
  currentMod: null,
  favorites: new Map(),
  feed: { cursor: 0, seen: [], nextAt: 0, duration: FEED_FALLBACK_SECONDS * 1000, loading: false },
};

const $ = (id) => document.getElementById(id);

// Interface strings come from i18n.js. Project titles, summaries and
// descriptions are never translated — they stay as the platform published them.
const t = (key, vars) => (window.MCModsI18n ? window.MCModsI18n.t(key, vars) : key);

// Monotonic tokens so a type switch discards responses from the previous type.
let searchSeq = 0;
let feedSeq = 0;

/* ------------------------------------------------------------------ utils */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value) {
  const n = Number(value) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function titleCase(value) {
  if (!value) return "";
  if (NICE_NAMES[value]) return NICE_NAMES[value];
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function initialsOf(title) {
  const words = String(title || "MC").trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0] || "").join("").toUpperCase() || "MC";
}

function keyOf(mod) {
  return `${mod.source}:${mod.id}`;
}

function safeReplaceHash(hash) {
  try {
    history.replaceState(null, "", hash);
  } catch {
    /* file:// documents are not allowed to rewrite history */
  }
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

async function apiFetch(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, value);
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetch(`${API}${path}${suffix}`, {
    headers: { accept: "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

/* -------------------------------------------------------------- favorites */

function loadFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    if (!Array.isArray(raw)) return new Map();
    return new Map(raw.filter((item) => item && item.source && item.id).map((item) => [keyOf(item), item]));
  } catch {
    return new Map();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites.values()]));
  } catch {
    /* storage may be unavailable */
  }
}

function trimForFavorite(mod) {
  return {
    id: mod.id,
    source: mod.source,
    sourceLabel: mod.sourceLabel || mod.source,
    slug: mod.slug,
    title: mod.title,
    projectType: mod.projectType || state.type,
    summary: mod.summary || "",
    author: mod.author || "",
    icon: mod.icon || null,
    downloads: mod.downloads || 0,
    categories: mod.categories || [],
    loaders: mod.loaders || [],
    url: mod.url,
    savedAt: new Date().toISOString(),
  };
}

function isFavorite(mod) {
  return state.favorites.has(keyOf(mod));
}

function toggleFavorite(mod) {
  const key = keyOf(mod);
  if (state.favorites.has(key)) state.favorites.delete(key);
  else state.favorites.set(key, trimForFavorite(mod));
  saveFavorites();
  renderFavorites();
  document.querySelectorAll(`.fav-btn[data-fav="${CSS.escape(key)}"]`).forEach((button) => {
    const on = state.favorites.has(key);
    button.classList.toggle("is-on", on);
    button.textContent = on ? "♥" : "♡";
    button.setAttribute("aria-pressed", String(on));
  });
  const modalButton = document.querySelector("[data-modal-fav]");
  if (modalButton && state.currentMod && keyOf(state.currentMod) === key) {
    const on = state.favorites.has(key);
    modalButton.classList.toggle("is-on", on);
    modalButton.textContent = on ? "♥ Saved" : "♡ Save";
  }
}

function renderFavorites() {
  const items = [...state.favorites.values()].sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  $("fav-count").textContent = String(items.length);
  $("favorites-empty").hidden = items.length > 0;
  $("favorites-grid").innerHTML = items.map(cardMarkup).join("");
}

/* -------------------------------------------------------------- rendering */

function iconHolder(mod, className) {
  const initials = escapeHtml(initialsOf(mod.title));
  if (!mod.icon) {
    return `<span class="${className}" data-initials="${initials}">${initials}</span>`;
  }
  return `<span class="${className}" data-initials="${initials}"><img src="${escapeHtml(
    mod.icon,
  )}" alt="" loading="lazy" referrerpolicy="no-referrer" /></span>`;
}

function cardMarkup(mod) {
  const key = keyOf(mod);
  const saved = isFavorite(mod);
  const tags = [...(mod.loaders || []).slice(0, 1), ...(mod.categories || [])]
    .filter(Boolean)
    .slice(0, 4);

  return `<article class="card" tabindex="0" role="button" aria-label="${escapeHtml(
    mod.title,
  )}" data-key="${escapeHtml(key)}" data-source="${escapeHtml(mod.source)}" data-id="${escapeHtml(
    mod.id,
  )}" data-type="${escapeHtml(mod.projectType || state.type)}">
    <div class="card-head">
      ${iconHolder(mod, "thumb")}
      <div class="card-heading">
        <h3 class="card-title">${escapeHtml(mod.title)}</h3>
        <p class="card-author">${mod.author ? `by ${escapeHtml(mod.author)}` : "community project"}</p>
      </div>
      <button class="fav-btn${saved ? " is-on" : ""}" type="button" data-fav="${escapeHtml(key)}" aria-pressed="${saved}" aria-label="Save ${escapeHtml(mod.title)}">${saved ? "♥" : "♡"}</button>
    </div>
    <p class="card-summary">${escapeHtml(mod.summary || "No description provided.")}</p>
    <div class="card-tags">${tags.map((tag) => `<span class="tag">${escapeHtml(titleCase(tag))}</span>`).join("")}</div>
    <div class="card-foot">
      <span class="stat">↓ ${formatNumber(mod.downloads)}</span>
      <span class="badge badge--${escapeHtml(mod.source)}">${escapeHtml(mod.sourceLabel || mod.source)}</span>
    </div>
  </article>`;
}

function feedMarkup(mod) {
  return `<button class="feed-card" type="button" data-key="${escapeHtml(keyOf(mod))}" data-source="${escapeHtml(
    mod.source,
  )}" data-id="${escapeHtml(mod.id)}" data-type="${escapeHtml(mod.projectType || state.type)}">
    ${iconHolder(mod, "feed-thumb")}
    <span class="feed-info">
      <strong class="feed-title">${escapeHtml(mod.title)}</strong>
      <span class="feed-sub">↓ ${formatNumber(mod.downloads)} · ${escapeHtml(mod.sourceLabel || mod.source)}</span>
    </span>
  </button>`;
}

function resultsHeading() {
  return `${t(SORT_KEYS[state.sort] || "sort.relevance")} · ${t(`type.${state.type}`)}`;
}

function renderResults() {
  const grid = $("grid");
  const noun = t(`type.${state.type}`);
  grid.innerHTML = state.mods.map(cardMarkup).join("");

  const status = $("results-status");
  const title = $("results-title");
  const count = $("results-count");
  const more = $("load-more");

  more.textContent = t("res.more", { type: noun });

  if (state.mods.length) {
    status.hidden = true;
    title.textContent = state.query ? t("res.resultsFor", { q: state.query }) : resultsHeading();
    count.textContent = t("res.count", { total: formatNumber(state.total), shown: state.mods.length });
    more.hidden = state.mods.length >= state.total;
    return;
  }

  title.textContent = state.query ? t("res.resultsFor", { q: state.query }) : resultsHeading();
  count.textContent = t("res.count", { total: 0, shown: 0 });
  more.hidden = true;
  status.hidden = false;
  status.classList.toggle("is-error", Boolean(state.error));
  status.textContent = state.error ? t("res.failed", { err: state.error }) : t("res.none", { type: noun });
}

/* ------------------------------------------------------------------ search */

async function runSearch({ append = false } = {}) {
  // A type switch must win over an in-flight request, but a second "load more"
  // click should not fire twice.
  if (append && state.loading) return;
  const seq = ++searchSeq;
  state.loading = true;
  state.error = null;

  if (state.source === "curseforge" && !state.curseforgeConfigured) {
    state.loading = false;
    state.mods = [];
    state.total = 0;
    state.error =
      "the CurseForge source needs a CURSEFORGE_API_KEY secret. Pick Modrinth or All until it is added.";
    renderResults();
    return;
  }

  const status = $("results-status");
  if (!append) {
    state.offset = 0;
    $("grid").innerHTML = "";
    status.hidden = false;
    status.classList.remove("is-error");
    status.textContent = t("res.loading", { type: t(`type.${state.type}`) });
    $("load-more").hidden = true;
  }

  try {
    const data = await apiFetch("/search", {
      q: state.query,
      type: state.type,
      source: state.source,
      sort: state.sort,
      categories: [...state.categories].join(","),
      loaders: [...state.loaders].join(","),
      version: state.version,
      offset: state.offset,
      limit: state.limit,
    });

    if (seq !== searchSeq) return;
    applyCurseForgeFlag(data.curseforgeConfigured);
    const mods = Array.isArray(data.mods) ? data.mods : [];
    state.total = data.total || 0;
    state.mods = append ? [...state.mods, ...mods] : mods;
    state.offset += mods.length;
    $("stat-mods").textContent = formatNumber(state.total);
  } catch (error) {
    if (seq !== searchSeq) return;
    if (!append) state.mods = [];
    state.error = error.message;
  } finally {
    if (seq === searchSeq) {
      state.loading = false;
      renderResults();
    }
  }
}

/* -------------------------------------------------------------------- feed */

async function loadFeed() {
  if (state.feed.loading) return;
  const seq = ++feedSeq;
  state.feed.loading = true;
  $("feed-status").textContent = t("feed.fetching", { type: t(`type.${state.type}`) });

  try {
    const data = await apiFetch("/feed", {
      type: state.type,
      cursor: state.feed.cursor,
      exclude: state.feed.seen.slice(-120).join(","),
    });
    if (seq !== feedSeq) return;
    applyCurseForgeFlag(data.curseforgeConfigured);
    state.feed.cursor = data.cursor || state.feed.cursor + 1;
    for (const mod of data.mods || []) state.feed.seen.push(keyOf(mod));
    state.feed.seen = state.feed.seen.slice(-220);
    state.feed.duration = (data.intervalSeconds || FEED_FALLBACK_SECONDS) * 1000;
    state.feed.nextAt = Date.now() + state.feed.duration;
    $("feed-row").innerHTML = (data.mods || []).map(feedMarkup).join("");
    $("feed-bar").style.width = "0%";
    $("feed-status").textContent = t("feed.landed", {
      n: (data.mods || []).length,
      type: t(`type.${state.type}`),
    });
  } catch (error) {
    if (seq !== feedSeq) return;
    $("feed-status").textContent = t("feed.paused", { err: error.message });
    state.feed.duration = 20 * 1000;
    state.feed.nextAt = Date.now() + state.feed.duration;
  } finally {
    if (seq === feedSeq) state.feed.loading = false;
  }
}

function startFeedClock() {
  window.setInterval(() => {
    if (!state.feed.nextAt) return;
    const remaining = state.feed.nextAt - Date.now();
    if (remaining <= 0) {
      if (!state.feed.loading) loadFeed();
      return;
    }
    const percent = Math.max(0, Math.min(100, 100 - (remaining / state.feed.duration) * 100));
    $("feed-bar").style.width = `${percent}%`;
    if (!state.feed.loading) {
      $("feed-status").textContent = t("feed.next", {
        type: t(`type.${state.type}`),
        s: Math.ceil(remaining / 1000),
      });
    }
  }, 500);
}

/* -------------------------------------------------------------------- tags */

async function loadTags() {
  try {
    const data = await apiFetch("/tags", { type: state.type });
    state.tagsLoaded = true;
    applyCurseForgeFlag(data.curseforgeConfigured);

    $("loader-chips").innerHTML = (data.loaders || [])
      .map(
        (loader) =>
          `<button class="chip" type="button" data-loader="${escapeHtml(loader)}">${escapeHtml(titleCase(loader))}</button>`,
      )
      .join("");
    // Resource packs and data packs have no loader concept worth filtering on.
    $("loader-group").hidden = !(data.loaders || []).length;

    $("category-chips").innerHTML = (data.categories || [])
      .map(
        (category) =>
          `<button class="chip" type="button" data-category="${escapeHtml(category.name)}" title="${escapeHtml(
            category.header,
          )}">${escapeHtml(titleCase(category.name))}</button>`,
      )
      .join("");
    $("category-group").hidden = !(data.categories || []).length;

    $("version-select").innerHTML = [
      '<option value="">Any version</option>',
      ...(data.versions || []).map(
        (version) => `<option value="${escapeHtml(version)}">${escapeHtml(version)}</option>`,
      ),
    ].join("");
    $("version-select").value = state.version;

    syncChips();
  } catch {
    /* filters degrade gracefully */
  }
}

function syncChips() {
  document.querySelectorAll(".chip[data-source]").forEach((chip) => {
    chip.classList.toggle("is-on", chip.dataset.source === state.source);
  });
  document.querySelectorAll(".chip[data-loader]").forEach((chip) => {
    chip.classList.toggle("is-on", state.loaders.has(chip.dataset.loader));
  });
  document.querySelectorAll(".chip[data-category]").forEach((chip) => {
    chip.classList.toggle("is-on", state.categories.has(chip.dataset.category));
  });
}

function syncTypeUi() {
  const info = typeInfo();
  $("search-input").placeholder = info.placeholder;
  $("search-input").setAttribute("aria-label", `Search ${info.plural}`);
  $("feed-title").textContent = `${t("feed.title")} · ${t(`type.${state.type}`)}`;
  $("feed-sub").textContent = t("feed.sub");
  document.querySelectorAll(".type-tab[data-type]").forEach((tab) => {
    const on = tab.dataset.type === state.type;
    tab.classList.toggle("is-active", on);
    tab.setAttribute("aria-selected", String(on));
  });
}

function resetFeed() {
  feedSeq += 1;
  state.feed.cursor = 0;
  state.feed.seen = [];
  state.feed.nextAt = 0;
  state.feed.loading = false;
  $("feed-row").innerHTML = "";
  $("feed-bar").style.width = "0%";
  $("feed-status").textContent = t("feed.starting");
}

function applyCurseForgeFlag(configured) {
  if (configured === undefined) return;
  state.curseforgeConfigured = configured;
  const banner = $("cf-banner");
  if (configured) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.innerHTML = window.MCMODS_STANDALONE
    ? "<strong>CurseForge is not available in this single-file build</strong> — it is serving Modrinth only. CurseForge requires a server-side API key, so use the server version of MCmods when you want both sources."
    : "<strong>CurseForge is not connected yet</strong> — MCmods is serving Modrinth results only. Add a <code>CURSEFORGE_API_KEY</code> secret and CurseForge mods join the index automatically.";
  const cfChip = document.querySelector('.chip[data-source="curseforge"]');
  if (cfChip) cfChip.setAttribute("aria-disabled", "true");
}

/* ------------------------------------------------------------------ modal */

function renderMarkdown(source) {
  const inline = (text) =>
    text
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
      );

  const escaped = escapeHtml(source || "");
  const blocks = escaped.split(/\n{2,}/);
  const out = [];

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    const fence = block.match(/^```[a-z0-9-]*\s*\n?([\s\S]*?)```$/i);
    if (fence) {
      out.push(`<pre><code>${fence[1].trim()}</code></pre>`);
      continue;
    }

    const heading = block.match(/^(#{1,6})\s+(.*)$/);
    if (heading && !block.includes("\n")) {
      const level = Math.min(heading[1].length, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const lines = block.split("\n");
    if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${inline(line.replace(/^\s*[-*+]\s+/, ""))}</li>`);
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
      const items = lines.map((line) => `<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (lines.every((line) => /^>\s?/.test(line))) {
      out.push(`<blockquote>${inline(lines.map((line) => line.replace(/^>\s?/, "")).join(" "))}</blockquote>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(block)) {
      out.push("<hr />");
      continue;
    }

    out.push(
      `<p>${lines
        .map((line) => inline(line))
        .filter((line) => line.trim())
        .join("<br />")}</p>`,
    );
  }

  return out.join("\n");
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<div id="md-root">${html || ""}</div>`, "text/html");
  const root = doc.getElementById("md-root");
  if (!root) return "";

  const allowed = new Set([
    "P", "BR", "STRONG", "B", "EM", "I", "U", "S", "DEL", "SPAN", "DIV", "UL", "OL", "LI",
    "H1", "H2", "H3", "H4", "H5", "H6", "A", "IMG", "CODE", "PRE", "BLOCKQUOTE", "HR",
    "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "FIGURE", "FIGCAPTION", "VIDEO", "SOURCE",
  ]);
  const allowedAttributes = new Set(["href", "src", "alt", "title", "width", "height", "colspan", "rowspan"]);
  const drop = new Set(["SCRIPT", "STYLE", "LINK", "META", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "IFRAME", "NOSCRIPT"]);

  const walk = (node) => {
    for (const child of [...node.children]) {
      if (drop.has(child.tagName)) {
        child.remove();
        continue;
      }
      if (!allowed.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      for (const attribute of [...child.attributes]) {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("on") || !allowedAttributes.has(name)) {
          child.removeAttribute(attribute.name);
        }
      }
      if (child.hasAttribute("src") && !/^https:\/\//i.test(child.getAttribute("src"))) {
        child.removeAttribute("src");
      }
      if (child.hasAttribute("href") && !/^https?:\/\//i.test(child.getAttribute("href"))) {
        child.removeAttribute("href");
      }
      if (child.tagName === "A") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noreferrer noopener");
      }
      walk(child);
    }
  };

  walk(root);
  return root.innerHTML;
}

function metaItem(label, value) {
  if (value === undefined || value === null || value === "" || value === "—") return "";
  return `<div class="meta-item"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function modalMarkup(data) {
  const mod = data.mod;
  const saved = isFavorite(mod);
  const versions = data.versions || [];
  const gallery = mod.gallery || [];
  const latest = versions[0];
  const latestFile = latest?.files?.find((file) => file.primary) || latest?.files?.[0];

  const description =
    data.descriptionFormat === "html"
      ? sanitizeHtml(data.description)
      : renderMarkdown(data.description);

  const primaryAction = latestFile
    ? `<a class="btn btn--primary" href="${escapeHtml(latestFile.url)}" download rel="noreferrer noopener">${escapeHtml(
        t("modal.download"),
      )}</a>`
    : `<a class="btn btn--primary" href="${escapeHtml(mod.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
        t("modal.openPage"),
      )}</a>`;

  const sideLabel = [
    mod.clientSide ? `client: ${mod.clientSide}` : "",
    mod.serverSide ? `server: ${mod.serverSide}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const tabs = [
    { id: "about", label: t("modal.about") },
    { id: "versions", label: t("modal.versions", { n: versions.length }) },
    ...(gallery.length ? [{ id: "gallery", label: t("modal.gallery", { n: gallery.length }) }] : []),
  ];

  const versionRows = versions
    .map((version) => {
      const files = version.files || [];
      const fileLinks = files
        .map(
          (file) =>
            `<a class="file-link" href="${escapeHtml(file.url)}" download rel="noreferrer noopener">↓ ${escapeHtml(
              file.filename,
            )} · ${escapeHtml(formatBytes(file.size))}</a>`,
        )
        .join("");
      return `<div class="version-row">
        <div class="version-head">
          <strong>${escapeHtml(version.name || version.versionNumber)}</strong>
          <span class="badge badge--${escapeHtml(version.type || "release")}">${escapeHtml(version.type || "release")}</span>
          <span class="version-date">${escapeHtml(formatDate(version.date))}</span>
        </div>
        <div class="version-meta">
          ${escapeHtml((version.gameVersions || []).slice(0, 8).join(", ") || "any version")}
          ${version.loaders?.length ? ` · ${escapeHtml(version.loaders.join(", "))}` : ""}
          ${version.downloads ? ` · ↓ ${escapeHtml(formatNumber(version.downloads))}` : ""}
        </div>
        ${fileLinks ? `<div class="version-files">${fileLinks}</div>` : ""}
      </div>`;
    })
    .join("");

  return `<div class="modal">
    <button class="modal-close" type="button" data-close aria-label="${escapeHtml(t("modal.close"))}">✕</button>

    <div class="modal-hero">
      ${iconHolder(mod, "modal-icon")}
      <div class="modal-titles">
        <span class="badge badge--${escapeHtml(mod.source)}">${escapeHtml(mod.sourceLabel || mod.source)}</span>
        ${mod.projectTypeLabel ? `<span class="badge badge--type">${escapeHtml(mod.projectTypeLabel)}</span>` : ""}
        <h2>${escapeHtml(mod.title)}</h2>
        <p class="card-author">${mod.author ? `by ${escapeHtml(mod.author)}` : "community project"}</p>
        <p class="modal-summary">${escapeHtml(mod.summary || "")}</p>
        <div class="card-tags" style="margin-top:10px">
          ${[...(mod.loaders || []), ...(mod.categories || [])]
            .slice(0, 8)
            .map((tag) => `<span class="tag">${escapeHtml(titleCase(tag))}</span>`)
            .join("")}
        </div>
      </div>
    </div>

    <div class="modal-actions">
      ${primaryAction}
      <a class="btn btn--ghost" href="${escapeHtml(mod.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
        t("modal.openPage"),
      )}</a>
      <button class="btn btn--ghost${saved ? " is-on" : ""}" type="button" data-modal-fav>${escapeHtml(
        saved ? t("modal.saved") : t("modal.save"),
      )}</button>
    </div>

    <div class="modal-tabs" role="tablist">
      ${tabs
        .map(
          (tab, index) =>
            `<button class="tab${index === 0 ? " is-active" : ""}" type="button" role="tab" data-tab="${tab.id}">${escapeHtml(
              tab.label,
            )}</button>`,
        )
        .join("")}
    </div>

    <div class="tab-panel is-active" data-panel="about">
      <dl class="meta-grid">
        ${metaItem("Type", mod.projectTypeLabel || "")}
        ${metaItem("Downloads", formatNumber(mod.downloads))}
        ${metaItem("Followers", mod.follows ? formatNumber(mod.follows) : "")}
        ${metaItem("License", mod.license || "")}
        ${metaItem("Updated", formatDate(mod.updated))}
        ${metaItem("Published", formatDate(mod.published))}
        ${metaItem("Multiplayer", sideLabel)}
        ${metaItem("Game versions", (mod.versions || []).length ? `${mod.versions.length} versions` : "")}
      </dl>
      <div class="md">${description || '<p class="muted">This project has no description.</p>'}</div>
    </div>

    <div class="tab-panel" data-panel="versions">
      <div class="version-list">
        ${versionRows || '<p class="muted">No files published yet.</p>'}
      </div>
    </div>

    ${
      gallery.length
        ? `<div class="tab-panel" data-panel="gallery">
            <div class="gallery-grid">
              ${gallery
                .map((image) => `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.title || "")}" loading="lazy" />`)
                .join("")}
            </div>
          </div>`
        : ""
    }
  </div>`;
}

let modalSequence = 0;

async function openMod(source, id, type = null) {
  const dialog = $("mod-dialog");
  const body = $("modal-body");
  const sequence = ++modalSequence;

  body.innerHTML = `<div class="modal">
    <div class="skeleton-line" style="width:45%;height:28px"></div>
    <div class="skeleton-line" style="width:70%"></div>
    <div class="skeleton-line" style="width:90%"></div>
    <div class="skeleton-line" style="width:60%"></div>
  </div>`;

  if (!dialog.open) dialog.showModal();
  document.body.classList.add("is-locked");

  const hash = `#/mod/${source}/${encodeURIComponent(id)}`;
  if (location.hash !== hash) safeReplaceHash(hash);

  try {
    const data = await apiFetch(
      `/mod/${source}/${encodeURIComponent(id)}`,
      type ? { type } : {},
    );
    if (sequence !== modalSequence) return;
    state.currentMod = data.mod;
    body.innerHTML = modalMarkup(data);
    body.querySelector(".modal")?.scrollTo?.({ top: 0 });
  } catch (error) {
    if (sequence !== modalSequence) return;
    body.innerHTML = `<div class="modal">
      <button class="modal-close" type="button" data-close aria-label="Close">✕</button>
      <h2>Could not open this mod</h2>
      <p class="banner" style="border-color:rgba(255,107,107,.4);background:rgba(255,107,107,.1);color:#ffb4b4">${escapeHtml(
        error.message,
      )}</p>
    </div>`;
  }
}

function closeModal() {
  const dialog = $("mod-dialog");
  if (dialog.open) dialog.close();
  document.body.classList.remove("is-locked");
  modalSequence += 1;
  state.currentMod = null;
  if (location.hash.startsWith("#/mod/")) {
    safeReplaceHash(`${location.pathname}${location.search}`);
  }
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === name);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === name);
  });
}

/* -------------------------------------------------------------------- view */

function setView(view) {
  state.view = view;
  $("view-browse").hidden = view !== "browse";
  $("view-favorites").hidden = view !== "favorites";
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewLink === view);
  });
  if (view === "favorites") renderFavorites();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ------------------------------------------------------------------ events */

function handleDocumentClick(event) {
  const favButton = event.target.closest("[data-fav]");
  if (favButton) {
    event.stopPropagation();
    event.preventDefault();
    const card = favButton.closest("[data-source][data-id]");
    const key = favButton.dataset.fav;
    const mod =
      state.mods.find((item) => keyOf(item) === key) ||
      (state.currentMod && keyOf(state.currentMod) === key ? state.currentMod : null) ||
      [...state.favorites.values()].find((item) => keyOf(item) === key);
    if (mod) toggleFavorite(mod);
    else if (card) toggleFavorite(cardToMod(card));
    return;
  }

  const modalFav = event.target.closest("[data-modal-fav]");
  if (modalFav) {
    if (state.currentMod) toggleFavorite(state.currentMod);
    return;
  }

  const tab = event.target.closest(".tab[data-tab]");
  if (tab) {
    switchTab(tab.dataset.tab);
    return;
  }

  if (event.target.closest("[data-close]")) {
    closeModal();
    return;
  }

  const navButton = event.target.closest("[data-view-link]");
  if (navButton) {
    event.preventDefault();
    setView(navButton.dataset.viewLink);
    return;
  }

  const typeTab = event.target.closest(".type-tab[data-type]");
  if (typeTab) {
    const next = typeTab.dataset.type;
    if (!TYPES[next] || next === state.type) return;
    state.type = next;
    // Categories and loaders are type-specific, so start those filters clean.
    state.categories.clear();
    state.loaders.clear();
    syncTypeUi();
    resetFeed();
    loadTags();
    runSearch();
    loadFeed();
    return;
  }

  const sourceChip = event.target.closest(".chip[data-source]");
  if (sourceChip) {
    const next = sourceChip.dataset.source;
    if (next === "curseforge" && !state.curseforgeConfigured) {
      applyCurseForgeFlag(false);
      $("cf-banner").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    state.source = next;
    syncChips();
    runSearch();
    return;
  }

  const loaderChip = event.target.closest(".chip[data-loader]");
  if (loaderChip) {
    const loader = loaderChip.dataset.loader;
    if (state.loaders.has(loader)) state.loaders.delete(loader);
    else state.loaders.add(loader);
    syncChips();
    runSearch();
    return;
  }

  const categoryChip = event.target.closest(".chip[data-category]");
  if (categoryChip) {
    const category = categoryChip.dataset.category;
    if (state.categories.has(category)) state.categories.delete(category);
    else state.categories.add(category);
    syncChips();
    runSearch();
    return;
  }

  if (event.target.closest("#clear-filters")) {
    state.source = "all";
    state.sort = "relevance";
    state.categories.clear();
    state.loaders.clear();
    state.version = "";
    state.query = "";
    $("search-input").value = "";
    $("sort-select").value = "relevance";
    $("version-select").value = "";
    syncChips();
    runSearch();
    return;
  }

  if (event.target.closest("#load-more")) {
    runSearch({ append: true });
    return;
  }

  if (event.target.closest("#feed-refresh")) {
    loadFeed();
    return;
  }

  const card = event.target.closest(".card, .feed-card");
  if (card) {
    openMod(card.dataset.source, card.dataset.id, card.dataset.type || null);
  }
}

function cardToMod(card) {
  return {
    source: card.dataset.source,
    id: card.dataset.id,
    title: card.querySelector(".card-title, .feed-title")?.textContent || "Mod",
    summary: card.querySelector(".card-summary")?.textContent || "",
    icon: card.querySelector("img")?.getAttribute("src") || null,
    author: "",
    downloads: 0,
    categories: [],
    loaders: [],
    url: card.dataset.source === "curseforge"
      ? `https://www.curseforge.com/minecraft/mc-mods`
      : `https://modrinth.com/mod`,
    sourceLabel: card.dataset.source === "curseforge" ? "CurseForge" : "Modrinth",
  };
}

function wireEvents() {
  document.addEventListener("click", handleDocumentClick);

  // Re-render interface copy when the visitor changes language. Project data
  // (titles, summaries, descriptions) is untouched.
  document.addEventListener("mcmods:lang", () => {
    syncTypeUi();
    renderResults();
    renderFavorites();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
      event.preventDefault();
      $("search-input").focus();
    }
    if ((event.key === "Enter" || event.key === " ") && document.activeElement?.classList.contains("card")) {
      event.preventDefault();
      const card = document.activeElement;
      openMod(card.dataset.source, card.dataset.id, card.dataset.type || null);
    }
  });

  $("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = $("search-input").value.trim();
    runSearch();
  });

  $("search-input").addEventListener(
    "input",
    debounce(() => {
      state.query = $("search-input").value.trim();
      runSearch();
    }, 350),
  );

  $("sort-select").addEventListener("change", (event) => {
    state.sort = event.target.value;
    runSearch();
  });

  $("version-select").addEventListener("change", (event) => {
    state.version = event.target.value;
    runSearch();
  });

  const dialog = $("mod-dialog");
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeModal();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("is-locked");
    state.currentMod = null;
    if (location.hash.startsWith("#/mod/")) {
      safeReplaceHash(`${location.pathname}${location.search}`);
    }
  });

  // Broken icons fall back to their initials tile.
  document.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      const holder = target.parentElement;
      if (!holder || !holder.dataset.initials) return;
      holder.textContent = holder.dataset.initials;
    },
    true,
  );

  window.addEventListener("hashchange", () => {
    const match = location.hash.match(/^#\/mod\/(modrinth|curseforge)\/(.+)$/);
    if (match) openMod(match[1], decodeURIComponent(match[2]));
    else closeModal();
  });
}

/* -------------------------------------------------------------------- boot */

function init() {
  state.favorites = loadFavorites();
  renderFavorites();
  wireEvents();
  syncTypeUi();
  loadTags();
  runSearch();
  loadFeed();
  startFeedClock();

  if (location.hash) {
    const match = location.hash.match(/^#\/mod\/(modrinth|curseforge)\/(.+)$/);
    if (match) openMod(match[1], decodeURIComponent(match[2]));
  }
}

init();
