/**
 * MCmods — a Minecraft mod browser for Modrinth + CurseForge.
 *
 * This file is the entire server: it answers the JSON API used by the frontend
 * (/api/search, /api/feed, /api/tags, /api/mod/...) and, when running on
 * Cloudflare, hands every other request to the static asset binding.
 *
 * dev-server.mjs imports this module directly, so the local preview runs the
 * exact same code path as production.
 */

const MODRINTH = "https://api.modrinth.com/v2";
const CURSEFORGE = "https://api.curseforge.com/v1";
const USER_AGENT = "MCmods/1.0 (Minecraft mod browser)";

const CF_GAME_ID = 432; // Minecraft

// Every browseable project type. `modrinth` is both the Modrinth project_type
// slug and its URL segment; `cf` is CurseForge's classId and `cfSlug` its URL
// segment. `loaders` lists the loader tags that actually make sense for a type.
const PROJECT_TYPES = {
  mods: {
    label: "Mods",
    plural: "mods",
    modrinth: "mod",
    cf: 6,
    cfSlug: "mc-mods",
    loaders: ["fabric", "forge", "neoforge", "quilt", "rift", "liteloader", "modloader"],
  },
  resourcepacks: {
    label: "Resource packs",
    plural: "resource packs",
    modrinth: "resourcepack",
    cf: 12,
    cfSlug: "texture-packs",
    loaders: [],
  },
  datapacks: {
    label: "Data packs",
    plural: "data packs",
    modrinth: "datapack",
    cf: 6945,
    cfSlug: "data-packs",
    loaders: [],
  },
  shaders: {
    label: "Shaders",
    plural: "shaders",
    modrinth: "shader",
    cf: 6552,
    cfSlug: "shaders",
    loaders: ["iris", "optifine", "canvas"],
  },
  modpacks: {
    label: "Modpacks",
    plural: "modpacks",
    modrinth: "modpack",
    cf: 4471,
    cfSlug: "modpacks",
    loaders: ["fabric", "forge", "neoforge", "quilt"],
  },
};

const TYPE_ALIASES = {
  mod: "mods",
  mods: "mods",
  resourcepack: "resourcepacks",
  resourcepacks: "resourcepacks",
  texturepack: "resourcepacks",
  texturepacks: "resourcepacks",
  datapack: "datapacks",
  datapacks: "datapacks",
  shader: "shaders",
  shaders: "shaders",
  modpack: "modpacks",
  modpacks: "modpacks",
};

function resolveType(raw) {
  return TYPE_ALIASES[String(raw || "mods").trim().toLowerCase()] || "mods";
}

function typeFromCurseForgeClass(classId) {
  return Object.keys(PROJECT_TYPES).find((key) => PROJECT_TYPES[key].cf === classId) || "mods";
}

const FEED_SIZE = 10;
const FEED_INTERVAL_SECONDS = 60;
const OFFSET_CAP = 4000;
const MAX_LIMIT = 48;

const MODRINTH_INDEX = {
  relevance: "relevance",
  downloads: "downloads",
  follows: "follows",
  newest: "newest",
  updated: "updated",
};

// CurseForge sortField ids: 2 = popularity, 3 = last updated, 6 = downloads, 11 = released
const CF_SORT = { relevance: 2, downloads: 6, follows: 2, newest: 11, updated: 3 };
const CF_LOADER_IDS = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 };
const CF_LOADER_NAMES = { 1: "forge", 4: "fabric", 5: "quilt", 6: "neoforge" };

/* ------------------------------------------------------------------ helpers */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=30" : "no-store",
    },
  });
}

function csv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function clampInt(raw, min, max, fallback) {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

async function upstream(url, headers = {}) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json", ...headers },
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    const error = new Error(`Upstream request failed (${response.status})`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return response.json();
}

/* -------------------------------------------------------------------- cache */

const memoryCache = new Map();

function cacheKeyRequest(key) {
  return new Request(`https://mcmods.internal/cache/${encodeURIComponent(key)}`, {
    method: "GET",
  });
}

async function cacheGet(key) {
  if (globalThis.caches?.default) {
    try {
      const hit = await globalThis.caches.default.match(cacheKeyRequest(key));
      if (hit) return await hit.json();
    } catch {
      /* cache is best effort */
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function cacheSet(key, value, ttlSeconds) {
  if (globalThis.caches?.default) {
    try {
      await globalThis.caches.default.put(
        cacheKeyRequest(key),
        new Response(JSON.stringify(value), {
          headers: {
            "content-type": "application/json",
            "cache-control": `s-maxage=${ttlSeconds}`,
          },
        }),
      );
    } catch {
      /* cache is best effort */
    }
  }
  memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  while (memoryCache.size > 400) {
    memoryCache.delete(memoryCache.keys().next().value);
  }
}

async function cached(key, ttlSeconds, producer) {
  const hit = await cacheGet(key);
  if (hit) return hit;
  const value = await producer();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/* ----------------------------------------------------------- normalisation */

function mapModrinthHit(hit, type = "mods") {
  const meta = PROJECT_TYPES[type] || PROJECT_TYPES.mods;
  return {
    id: hit.project_id,
    source: "modrinth",
    sourceLabel: "Modrinth",
    projectType: type,
    projectTypeLabel: meta.label,
    slug: hit.slug,
    title: hit.title,
    summary: hit.description || "",
    author: hit.author || "",
    icon: hit.icon_url || null,
    downloads: hit.downloads || 0,
    follows: hit.follows || 0,
    categories: hit.display_categories?.length ? hit.display_categories : hit.categories || [],
    loaders: (hit.categories || []).filter((name) => meta.loaders.includes(name)),
    versions: hit.versions || [],
    updated: hit.date_modified || null,
    published: hit.date_created || null,
    license: hit.license || null,
    url: `https://modrinth.com/${meta.modrinth}/${hit.slug}`,
  };
}

function mapModrinthProject(project, typeHint = null) {
  // Modrinth stores data packs as mods that carry a `datapack` loader, so the
  // type the visitor is browsing wins whenever we know it.
  const type = typeHint || resolveType(project.project_type);
  const meta = PROJECT_TYPES[type];
  return {
    id: project.id,
    source: "modrinth",
    sourceLabel: "Modrinth",
    projectType: type,
    projectTypeLabel: meta.label,
    slug: project.slug,
    title: project.title,
    summary: project.description || "",
    author: "",
    icon: project.icon_url || null,
    downloads: project.downloads || 0,
    follows: project.followers || 0,
    categories: project.categories || [],
    loaders: project.loaders || [],
    versions: project.game_versions || [],
    updated: project.updated || null,
    published: project.published || null,
    license: project.license?.id || project.license?.name || null,
    url: `https://modrinth.com/${meta.modrinth}/${project.slug}`,
    sourceUrl: project.source_url || null,
    issuesUrl: project.issues_url || null,
    wikiUrl: project.wiki_url || null,
    discordUrl: project.discord_url || null,
    clientSide: project.client_side || null,
    serverSide: project.server_side || null,
    gallery: (project.gallery || []).map((image) => ({
      url: image.url,
      featured: !!image.featured,
      title: image.title || "",
      description: image.description || "",
    })),
    donationUrls: project.donation_urls || [],
  };
}

function mapModrinthVersion(version) {
  return {
    id: version.id,
    name: version.name || version.version_number,
    versionNumber: version.version_number || "",
    gameVersions: version.game_versions || [],
    loaders: version.loaders || [],
    date: version.date_published || null,
    downloads: version.downloads || 0,
    type: version.version_type || "release",
    changelog: version.changelog || "",
    files: (version.files || []).map((file) => ({
      url: file.url,
      filename: file.filename,
      size: file.size || 0,
      primary: !!file.primary,
    })),
  };
}

function mapCurseForgeMod(mod, type = "mods") {
  const meta = PROJECT_TYPES[type] || PROJECT_TYPES.mods;
  const indexes = mod.latestFilesIndexes || [];
  const loaders = uniq(indexes.map((entry) => CF_LOADER_NAMES[entry.modLoader]));
  const versions = uniq(indexes.map((entry) => entry.gameVersion));
  return {
    id: String(mod.id),
    source: "curseforge",
    sourceLabel: "CurseForge",
    projectType: type,
    projectTypeLabel: meta.label,
    slug: mod.slug,
    title: mod.name,
    summary: mod.summary || "",
    author: mod.authors?.[0]?.name || "",
    icon: mod.logo?.url || mod.logo?.thumbnailUrl || null,
    downloads: mod.downloadCount || 0,
    follows: 0,
    categories: (mod.categories || []).map((category) => category.slug).filter(Boolean),
    loaders,
    versions,
    updated: mod.dateModified || null,
    published: mod.dateCreated || null,
    license: null,
    url: mod.links?.websiteUrl || `https://www.curseforge.com/minecraft/${meta.cfSlug}/${mod.slug}`,
    distributionAllowed: mod.allowModDistribution !== false,
  };
}

function mapCurseForgeFile(file) {
  const tags = file.gameVersions || [];
  return {
    id: String(file.id),
    name: file.displayName || file.fileName,
    versionNumber: file.displayName || "",
    gameVersions: tags.filter((tag) => /^\d/.test(tag)),
    loaders: tags
      .filter((tag) => /^(forge|fabric|quilt|neoforge)$/i.test(tag))
      .map((tag) => tag.toLowerCase()),
    date: file.fileDate || null,
    downloads: file.downloadCount || 0,
    type: ["release", "beta", "alpha"][(file.releaseType || 1) - 1] || "release",
    changelog: "",
    files: file.downloadUrl
      ? [
          {
            url: file.downloadUrl,
            filename: file.fileName,
            size: file.fileLength || 0,
            primary: true,
          },
        ]
      : [],
  };
}

/* ------------------------------------------------------------------ sources */

async function modrinthSearch({ type = "mods", query, sort, categories, loaders, version, offset, limit }) {
  const meta = PROJECT_TYPES[type] || PROJECT_TYPES.mods;
  const params = new URLSearchParams({
    query: query || "",
    index: MODRINTH_INDEX[sort] || "relevance",
    offset: String(offset),
    limit: String(limit),
  });

  const facets = [[`project_type:${meta.modrinth}`]];
  const tags = [...categories, ...loaders].map((tag) => `categories:${tag}`);
  if (tags.length) facets.push(tags);
  if (version) facets.push([`versions:${version}`]);
  params.set("facets", JSON.stringify(facets));

  const key = `modrinth:search:${type}:${params.toString()}`;
  const data = await cached(key, 120, () => upstream(`${MODRINTH}/search?${params.toString()}`));
  return {
    mods: (data.hits || []).map((hit) => mapModrinthHit(hit, type)),
    total: data.total_hits || 0,
  };
}

async function curseforgeSearch(env, { type = "mods", query, sort, loaders, version, offset, limit }) {
  const apiKey = env.CURSEFORGE_API_KEY;
  if (!apiKey) return { mods: [], total: 0, configured: false };
  const meta = PROJECT_TYPES[type] || PROJECT_TYPES.mods;

  const params = new URLSearchParams({
    gameId: String(CF_GAME_ID),
    classId: String(meta.cf),
    sortField: String(CF_SORT[sort] || 2),
    sortOrder: "desc",
    index: String(offset),
    pageSize: String(limit),
  });
  if (query) params.set("searchFilter", query);
  if (version) params.set("gameVersion", version);
  if (loaders.length && CF_LOADER_IDS[loaders[0]]) {
    params.set("modLoaderType", String(CF_LOADER_IDS[loaders[0]]));
  }

  const key = `curseforge:search:${type}:${params.toString()}`;
  const data = await cached(key, 120, () =>
    upstream(`${CURSEFORGE}/mods/search?${params.toString()}`, { "x-api-key": apiKey }),
  );
  return {
    mods: (data.data || []).map((mod) => mapCurseForgeMod(mod, type)),
    total: data.pagination?.totalCount || 0,
    configured: true,
  };
}

function sortValue(mod, sort) {
  switch (sort) {
    case "downloads":
      return mod.downloads || 0;
    case "follows":
      return mod.follows || 0;
    case "newest":
      return Date.parse(mod.published || 0) || 0;
    case "updated":
      return Date.parse(mod.updated || 0) || 0;
    default:
      return 0;
  }
}

function dedupe(mods) {
  const seen = new Set();
  return mods.filter((mod) => {
    const key = `${mod.source}:${mod.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ------------------------------------------------------------------ routes */

async function handleSearch(url, env) {
  const params = url.searchParams;
  const query = (params.get("q") || "").trim().slice(0, 100);
  const sort = (params.get("sort") || "relevance").toLowerCase();
  const source = (params.get("source") || "all").toLowerCase();
  const categories = csv(params.get("categories"));
  const loaders = csv(params.get("loaders")).map((loader) => loader.toLowerCase());
  const version = (params.get("version") || "").trim();
  const type = resolveType(params.get("type"));
  const offset = clampInt(params.get("offset"), 0, OFFSET_CAP, 0);
  const limit = clampInt(params.get("limit"), 1, MAX_LIMIT, 24);

  const options = { type, query, sort, categories, loaders, version, offset, limit };

  if (source === "modrinth") {
    const result = await modrinthSearch(options);
    return json({
      ...result,
      offset,
      limit,
      source: "modrinth",
      type,
      curseforgeConfigured: !!env.CURSEFORGE_API_KEY,
    });
  }

  if (source === "curseforge") {
    const result = await curseforgeSearch(env, options);
    return json({
      ...result,
      offset,
      limit,
      source: "curseforge",
      type,
      curseforgeConfigured: !!env.CURSEFORGE_API_KEY,
    });
  }

  const [modrinth, curseforge] = await Promise.all([
    modrinthSearch(options).catch(() => ({ mods: [], total: 0 })),
    curseforgeSearch(env, options).catch(() => ({ mods: [], total: 0 })),
  ]);

  let merged;
  if (sort === "relevance") {
    // Interleave so neither source dominates the first page.
    merged = [];
    const max = Math.max(modrinth.mods.length, curseforge.mods.length);
    for (let i = 0; i < max; i += 1) {
      if (modrinth.mods[i]) merged.push(modrinth.mods[i]);
      if (curseforge.mods[i]) merged.push(curseforge.mods[i]);
    }
  } else {
    merged = [...modrinth.mods, ...curseforge.mods].sort(
      (a, b) => sortValue(b, sort) - sortValue(a, sort),
    );
  }

  const mods = dedupe(merged).slice(0, limit);
  return json({
    mods,
    total: (modrinth.total || 0) + (curseforge.total || 0),
    offset,
    limit,
    source: "all",
    type,
    curseforgeConfigured: !!env.CURSEFORGE_API_KEY,
  });
}

async function handleFeed(url, env) {
  const type = resolveType(url.searchParams.get("type"));
  const cursor = clampInt(url.searchParams.get("cursor"), 0, 1_000_000, 0);
  const exclude = new Set(csv(url.searchParams.get("exclude")).slice(0, 150));
  const rng = mulberry32(Math.imul(cursor + 1, 2654435761) >>> 0);

  let pool = [];
  const strategies = ["downloads", "updated", "follows"];
  for (let attempt = 0; attempt < 3 && pool.length < FEED_SIZE * 2; attempt += 1) {
    const offset = Math.floor(rng() * OFFSET_CAP);
    const batch = await modrinthSearch({
      type,
      query: "",
      sort: strategies[attempt] || "downloads",
      categories: [],
      loaders: [],
      version: "",
      offset,
      limit: 40,
    }).catch(() => ({ mods: [] }));
    pool = pool.concat(batch.mods);
  }

  if (env.CURSEFORGE_API_KEY) {
    const offset = Math.floor(rng() * 800);
    const batch = await curseforgeSearch(env, {
      type,
      query: "",
      sort: "downloads",
      loaders: [],
      version: "",
      offset,
      limit: 20,
    }).catch(() => ({ mods: [] }));
    pool = pool.concat(batch.mods);
  }

  shuffle(pool, rng);

  const mods = [];
  const used = new Set();
  for (const mod of pool) {
    if (mods.length >= FEED_SIZE) break;
    const key = `${mod.source}:${mod.id}`;
    if (used.has(key) || exclude.has(key)) continue;
    used.add(key);
    mods.push(mod);
  }

  return json({
    mods,
    type,
    cursor: cursor + 1,
    size: mods.length,
    intervalSeconds: FEED_INTERVAL_SECONDS,
    curseforgeConfigured: !!env.CURSEFORGE_API_KEY,
  });
}

async function handleTags(env, type = "mods") {
  const meta = PROJECT_TYPES[type] || PROJECT_TYPES.mods;
  const [categories, loaders, versions] = await Promise.all([
    cached("tags:categories", 3600, () => upstream(`${MODRINTH}/tag/category`)),
    cached("tags:loaders", 3600, () => upstream(`${MODRINTH}/tag/loader`)),
    cached("tags:gameversions", 3600, () => upstream(`${MODRINTH}/tag/game_version`)),
  ]);

  // Data packs are listed under `mod` in Modrinth's tag list, so they reuse the
  // mod category set; everything else has its own.
  const categoryType = meta.modrinth === "datapack" ? "mod" : meta.modrinth;
  const seenCategories = new Set();
  const categoryList = (categories || [])
    .filter((entry) => !entry.project_type || entry.project_type === categoryType)
    .filter((entry) => {
      if (seenCategories.has(entry.name)) return false;
      seenCategories.add(entry.name);
      return true;
    })
    .map((entry) => ({ name: entry.name, header: entry.header || "Categories" }));

  const loaderList = meta.loaders.length
    ? (loaders || [])
        .filter(
          (entry) =>
            (entry.supported_project_types || []).includes(meta.modrinth) &&
            meta.loaders.includes(entry.name),
        )
        .map((entry) => entry.name)
    : [];

  const seenVersions = new Set();
  const versionList = (versions || [])
    .filter((entry) => entry.version_type === "release")
    .filter((entry) => {
      if (seenVersions.has(entry.version)) return false;
      seenVersions.add(entry.version);
      return true;
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 60)
    .map((entry) => entry.version);

  return json({
    type,
    categories: categoryList,
    loaders: loaderList.length ? loaderList : meta.loaders,
    versions: versionList,
    curseforgeConfigured: !!env.CURSEFORGE_API_KEY,
  });
}

async function handleModrinthDetail(id, typeHint = null) {
  const encoded = encodeURIComponent(id);
  const { project, versions } = await cached(`modrinth:project:${id}`, 300, async () => {
    const [projectData, versionData] = await Promise.all([
      upstream(`${MODRINTH}/project/${encoded}`),
      upstream(`${MODRINTH}/project/${encoded}/version`),
    ]);
    return { project: projectData, versions: versionData };
  });

  const sortedVersions = [...(versions || [])]
    .sort((a, b) => Date.parse(b.date_published) - Date.parse(a.date_published))
    .slice(0, 30)
    .map(mapModrinthVersion);

  return json({
    mod: mapModrinthProject(project, typeHint),
    description: project.body || "",
    descriptionFormat: "markdown",
    versions: sortedVersions,
  });
}

async function handleCurseForgeDetail(env, id) {
  const apiKey = env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    return json(
      { error: "curseforge_not_configured", message: "CurseForge needs an API key." },
      503,
    );
  }
  const headers = { "x-api-key": apiKey };
  const data = await cached(`curseforge:project:${id}`, 300, async () => {
    const [mod, description, files] = await Promise.all([
      upstream(`${CURSEFORGE}/mods/${encodeURIComponent(id)}`, headers),
      upstream(`${CURSEFORGE}/mods/${encodeURIComponent(id)}/description`, headers).catch(
        () => ({ data: "" }),
      ),
      upstream(`${CURSEFORGE}/mods/${encodeURIComponent(id)}/files?pageSize=25`, headers).catch(
        () => ({ data: [] }),
      ),
    ]);
    return { mod, description, files };
  });

  const type = typeFromCurseForgeClass(data.mod.data.classId);
  return json({
    mod: mapCurseForgeMod(data.mod.data, type),
    description: (data.description?.data || "").replace(/\r\n/g, "\n"),
    descriptionFormat: "html",
    versions: (data.files?.data || []).map(mapCurseForgeFile),
  });
}

async function handleApi(request, url, env) {
  const path = url.pathname.replace(/\/+$/, "").replace(/^\/api/, "");

  try {
    if (path === "" || path === "/health") {
      return json({
        ok: true,
        service: "mcmods",
        types: Object.keys(PROJECT_TYPES),
        curseforgeConfigured: !!env.CURSEFORGE_API_KEY,
        feedSize: FEED_SIZE,
        feedIntervalSeconds: FEED_INTERVAL_SECONDS,
      });
    }
    if (path === "/search") return await handleSearch(url, env);
    if (path === "/feed") return await handleFeed(url, env);
    if (path === "/tags") return await handleTags(env, resolveType(url.searchParams.get("type")));

    const detail = path.match(/^\/mod\/(modrinth|curseforge)\/(.+)$/);
    if (detail) {
      const [, source, id] = detail;
      const rawType = url.searchParams.get("type");
      const typeHint = rawType ? resolveType(rawType) : null;
      if (source === "modrinth") {
        return await handleModrinthDetail(decodeURIComponent(id), typeHint);
      }
      return await handleCurseForgeDetail(env, decodeURIComponent(id));
    }

    return json({ error: "not_found" }, 404);
  } catch (error) {
    return json(
      {
        error: "upstream_error",
        message: error?.message || "Request failed",
        status: error?.status || null,
        detail: error?.detail || null,
      },
      502,
    );
  }
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);

    // Account + moderated submissions live in their own module so the mod API
    // stays readable.
    if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/api/submissions")) {
      const { handleAccountRequest } = await import("./account-api.js");
      return handleAccountRequest(request, env, url);
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request, url, env);
    }
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
