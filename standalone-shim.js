/*
 * MCmods standalone shim.
 *
 * The single-file build has no server, so this intercepts the same /api/*
 * contract the Worker implements and answers it with direct Modrinth calls.
 * Modrinth serves `access-control-allow-origin: *`, so this works even from
 * a file:// page. CurseForge needs a server-side API key and is not available
 * in this mode.
 */
(() => {
  // Lets the UI know it is running without a server.
  window.MCMODS_STANDALONE = true;

  const MODRINTH = "https://api.modrinth.com/v2";
  const FEED_SIZE = 10;
  const FEED_INTERVAL_SECONDS = 60;
  const OFFSET_CAP = 4000;
  const MAX_LIMIT = 48;
  // Mirror of the Worker's project types: `modrinth` is the project_type slug
  // and URL segment, `loaders` the loader tags that apply to that type.
  const TYPES = {
    mods: {
      modrinth: "mod",
      loaders: ["fabric", "forge", "neoforge", "quilt", "rift", "liteloader", "modloader"],
    },
    resourcepacks: { modrinth: "resourcepack", loaders: [] },
    datapacks: { modrinth: "datapack", loaders: [] },
    shaders: { modrinth: "shader", loaders: ["iris", "optifine", "canvas"] },
    modpacks: { modrinth: "modpack", loaders: ["fabric", "forge", "neoforge", "quilt"] },
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

  const resolveType = (raw) => TYPE_ALIASES[String(raw || "mods").toLowerCase()] || "mods";

  const realFetch = window.fetch.bind(window);

  const INDEX = {
    relevance: "relevance",
    downloads: "downloads",
    follows: "follows",
    newest: "newest",
    updated: "updated",
  };

  async function api(path) {
    const response = await realFetch(`${MODRINTH}${path}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Modrinth responded ${response.status}`);
    return response.json();
  }

  const csv = (value) =>
    value ? String(value).split(",").map((part) => part.trim()).filter(Boolean) : [];

  function clampInt(raw, min, max, fallback) {
    const parsed = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
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

  function mapHit(hit, type = "mods") {
    const meta = TYPES[type] || TYPES.mods;
    return {
      id: hit.project_id,
      source: "modrinth",
      sourceLabel: "Modrinth",
      projectType: type,
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

  function mapProject(project, typeHint = null) {
    // Data packs are mods with a `datapack` loader on Modrinth, so a type hint
    // from the UI is more accurate than project_type alone.
    const type = typeHint || resolveType(project.project_type);
    const meta = TYPES[type];
    return {
      id: project.id,
      source: "modrinth",
      sourceLabel: "Modrinth",
      projectType: type,
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
      clientSide: project.client_side || null,
      serverSide: project.server_side || null,
      gallery: (project.gallery || []).map((image) => ({
        url: image.url,
        featured: !!image.featured,
        title: image.title || "",
        description: image.description || "",
      })),
    };
  }

  function mapVersion(version) {
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

  async function search(params) {
    const source = (params.get("source") || "all").toLowerCase();
    const type = resolveType(params.get("type"));
    const meta = TYPES[type];
    const limit = clampInt(params.get("limit"), 1, MAX_LIMIT, 24);
    const offset = clampInt(params.get("offset"), 0, OFFSET_CAP, 0);

    if (source === "curseforge") {
      return {
        mods: [],
        total: 0,
        offset,
        limit,
        source,
        curseforgeConfigured: false,
      };
    }

    const query = new URLSearchParams({
      query: params.get("q") || "",
      index: INDEX[(params.get("sort") || "relevance").toLowerCase()] || "relevance",
      offset: String(offset),
      limit: String(limit),
    });

    const facets = [[`project_type:${meta.modrinth}`]];
    const tags = [...csv(params.get("categories")), ...csv(params.get("loaders"))].map(
      (tag) => `categories:${tag}`,
    );
    if (tags.length) facets.push(tags);
    const version = params.get("version");
    if (version) facets.push([`versions:${version}`]);
    query.set("facets", JSON.stringify(facets));

    const data = await api(`/search?${query.toString()}`);
    return {
      mods: (data.hits || []).map((hit) => mapHit(hit, type)),
      total: data.total_hits || 0,
      offset,
      limit,
      source,
      type,
      curseforgeConfigured: false,
    };
  }

  async function feed(params) {
    const type = resolveType(params.get("type"));
    const meta = TYPES[type];
    const cursor = clampInt(params.get("cursor"), 0, 1000000, 0);
    const exclude = new Set(csv(params.get("exclude")));
    const rng = mulberry32(Math.imul(cursor + 1, 2654435761) >>> 0);
    const strategies = ["downloads", "updated", "follows"];

    let pool = [];
    for (let attempt = 0; attempt < 3 && pool.length < FEED_SIZE * 2; attempt += 1) {
      const query = new URLSearchParams({
        query: "",
        index: strategies[attempt] || "downloads",
        offset: String(Math.floor(rng() * OFFSET_CAP)),
        limit: "40",
      });
      query.set("facets", JSON.stringify([[`project_type:${meta.modrinth}`]]));
      try {
        const data = await api(`/search?${query.toString()}`);
        pool = pool.concat((data.hits || []).map((hit) => mapHit(hit, type)));
      } catch {
        /* keep trying other offsets */
      }
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

    return {
      mods,
      type,
      cursor: cursor + 1,
      size: mods.length,
      intervalSeconds: FEED_INTERVAL_SECONDS,
      curseforgeConfigured: false,
    };
  }

  async function tags(type = "mods") {
    const meta = TYPES[type] || TYPES.mods;
    const [categories, loaders, versions] = await Promise.all([
      api("/tag/category"),
      api("/tag/loader"),
      api("/tag/game_version"),
    ]);

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

    return {
      type,
      categories: categoryList,
      loaders: loaderList.length ? loaderList : meta.loaders,
      versions: versionList,
      curseforgeConfigured: false,
    };
  }

  async function detail(id, typeHint = null) {
    const encoded = encodeURIComponent(id);
    const [project, versions] = await Promise.all([
      api(`/project/${encoded}`),
      api(`/project/${encoded}/version`),
    ]);

    return {
      mod: mapProject(project, typeHint),
      description: project.body || "",
      descriptionFormat: "markdown",
      versions: [...(versions || [])]
        .sort((a, b) => Date.parse(b.date_published) - Date.parse(a.date_published))
        .slice(0, 30)
        .map(mapVersion),
    };
  }

  async function route(rawUrl) {
    const parsed = new URL(rawUrl, "https://mcmods.local");
    const path = parsed.pathname.replace(/\/+$/, "").replace(/^\/api/, "");

    if (path === "" || path === "/health") {
      return {
        ok: true,
        service: "mcmods",
        mode: "standalone",
        types: Object.keys(TYPES),
        curseforgeConfigured: false,
        feedSize: FEED_SIZE,
        feedIntervalSeconds: FEED_INTERVAL_SECONDS,
      };
    }
    if (path === "/search") return search(parsed.searchParams);
    if (path === "/feed") return feed(parsed.searchParams);
    if (path === "/tags") return tags(resolveType(parsed.searchParams.get("type")));

    const match = path.match(/^\/mod\/(modrinth|curseforge)\/(.+)$/);
    if (match) {
      if (match[1] === "curseforge") {
        const error = new Error(
          "CurseForge mods need the server build with a CURSEFORGE_API_KEY secret.",
        );
        error.status = 503;
        throw error;
      }
      const rawType = parsed.searchParams.get("type");
      return detail(decodeURIComponent(match[2]), rawType ? resolveType(rawType) : null);
    }

    const notFound = new Error("Not found");
    notFound.status = 404;
    throw notFound;
  }

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (!url.startsWith("/api/")) return realFetch(input, init);

    try {
      const body = await route(url);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "request_failed", message: error?.message || "Request failed" }),
        {
          status: error?.status || 502,
          headers: { "content-type": "application/json" },
        },
      );
    }
  };
})();
