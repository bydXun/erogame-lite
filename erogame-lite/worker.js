const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

const SITE_CONTENT_DEFAULTS = {
  hero_kicker: "个人游戏档案",
  hero_title: "玩游戏，也把过程\n认真留下来。",
  hero_description: "这里记录玩过之后的真实感受、攻略和长期会反复使用的教程。不追热点，只整理自己愿意保存的内容。",
  hero_primary_label: "浏览文章",
  hero_secondary_label: "关于这里",
  playing_title: "最近游玩",
  playing_link_label: "全部游戏感想",
  recent_title: "最近记录",
  recent_link_label: "查看归档",
  guides_title: "攻略与教程",
  guides_link_label: "全部教程",
  about_title: "关于这个站点",
  about_text: "这里不是游戏资料站，也不是单纯的攻略库。它更像一份长期维护的个人档案，保留当时的判断，也记录后来发生的变化。",
  about_link_label: "更多关于",
  archive_page_title: "文章归档",
  archive_page_description: "按时间回看写过的内容。先有体验，再有教程，最后留下自己当时真正相信的判断。",
  tags_page_title: "按标签阅读",
  tags_page_description: "从游戏类型、工具、部署或写作方法进入，找到同一主题下的全部内容。",
  search_page_title: "搜索文章",
  search_page_description: "搜索标题、摘要、分类和标签。输入后会显示加载状态、结果或空状态。",
  about_page_title: "关于 bydXun Lite",
  about_page_description: "这里记录游戏体验和可复用的教程，不追热点，也不把主观感受包装成绝对结论。",
  about_why_title: "为什么写这个博客",
  about_why_text: "游戏玩过以后，很多感受很快会模糊；教程做完以后，如果不整理，也会反复踩同样的坑。这个博客用来留下体验、判断和可以重复使用的过程。",
  about_write_title: "写什么",
  about_write_text: "主要内容分两类：一是游戏感想，包括探索、战斗、节奏和设计上的观察；二是教程，包括工具链、部署、写作流程和具体问题的解决方法。",
  about_principles_title: "内容原则",
  about_principles: "不把评分当作唯一结论。\n游戏文章明确提示剧透程度。\n教程尽量写出失败情况和排查过程。\n保留原始判断，也不回避后来发生的变化。",
  about_links_title: "站点入口",
  about_link_archive_label: "文章归档",
  about_link_tags_label: "全部标签",
  about_link_search_label: "搜索文章",
  about_link_subscribe_label: "订阅更新",
  footer_text: "© 2026 bydXun Lite，记录游戏，也整理教程。"
};

const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_DEFAULTS);

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );
  return bytesToHex(bits);
}

async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return bytesToHex(digest);
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1
          ? [part, ""]
          : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

async function getCurrentAdmin(env, request) {
  const token = parseCookies(request).erogame_session;
  if (!token) return null;
  await ensureDatabase(env);
  const tokenHash = await hashSessionToken(token);
  const row = await env.DB.prepare(`
    SELECT
      admin_users.id,
      admin_users.username,
      admin_sessions.expires_at
    FROM admin_sessions
    JOIN admin_users ON admin_users.id = admin_sessions.admin_id
    WHERE admin_sessions.token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

async function requireAdmin(env, request) {
  const admin = await getCurrentAdmin(env, request);
  if (!admin) return { error: json({ error: "管理员未登录" }, 401) };
  return { admin };
}

async function createSession(env, adminId) {
  const token = randomHex(32);
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(`
    INSERT INTO admin_sessions (token_hash, admin_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(tokenHash, adminId, expiresAt, new Date().toISOString()).run();
  return {
    token,
    cookie: `erogame_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
  };
}

async function ensureDatabase(env) {
  if (!env.DB) throw new Error("D1 数据库尚未绑定");
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'game',
      category TEXT NOT NULL DEFAULT '游戏感想',
      tags TEXT NOT NULL DEFAULT '[]',
      cover TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS media (
      key TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

function mapPost(row, includeContent = true) {
  const post = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    type: row.type,
    category: row.category,
    tags: JSON.parse(row.tags || "[]"),
    cover: row.cover,
    status: row.status,
    featured: Boolean(row.featured),
    date: row.published_at || row.updated_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  };
  if (includeContent) post.content = row.content;
  return post;
}

function normalizePayload(body, current = {}) {
  const now = new Date().toISOString();
  const status = body.status === "published" ? "published" : "draft";
  return {
    slug: String(body.slug || current.slug || `post-${Date.now()}`).trim(),
    title: String(body.title || current.title || "未命名文章").trim(),
    summary: String(body.summary ?? current.summary ?? "").trim(),
    type: ["game", "tutorial", "essay"].includes(body.type) ? body.type : "game",
    category: String(
      body.category ||
      current.category ||
      (body.type === "tutorial" ? "教程" : body.type === "essay" ? "杂谈" : "游戏感想")
    ).trim(),
    tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    cover: String(body.cover ?? current.cover ?? "").trim(),
    content: String(body.content ?? current.content ?? ""),
    status,
    featured: body.featured ? 1 : 0,
    created_at: current.created_at || now,
    updated_at: now,
    published_at: status === "published"
      ? current.published_at || now
      : current.published_at || null
  };
}

async function getSiteContent(env) {
  await ensureDatabase(env);
  const result = await env.DB.prepare(
    "SELECT key, value FROM site_content"
  ).all();
  const content = { ...SITE_CONTENT_DEFAULTS };
  for (const row of result.results || []) {
    if (SITE_CONTENT_KEYS.includes(row.key)) {
      content[row.key] = row.value;
    }
  }
  return content;
}

async function updateSiteContent(env, input) {
  await ensureDatabase(env);
  const now = new Date().toISOString();
  const statements = SITE_CONTENT_KEYS.map((key) => {
    const value = String(input[key] ?? SITE_CONTENT_DEFAULTS[key]).slice(0, 4000);
    return env.DB.prepare(`
      INSERT INTO site_content (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).bind(key, value, now);
  });
  await env.DB.batch(statements);
  return getSiteContent(env);
}

async function listPosts(env, { publishedOnly = false } = {}) {
  await ensureDatabase(env);
  const sql = publishedOnly
    ? "SELECT * FROM posts WHERE status = 'published' ORDER BY COALESCE(published_at, updated_at) DESC"
    : "SELECT * FROM posts ORDER BY updated_at DESC";
  const result = await env.DB.prepare(sql).all();
  return result.results || [];
}

async function createPost(env, body) {
  await ensureDatabase(env);
  const post = normalizePayload(body);
  await env.DB.prepare(`
    INSERT INTO posts (
      slug, title, summary, type, category, tags, cover, content,
      status, featured, created_at, updated_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    post.slug, post.title, post.summary, post.type, post.category,
    post.tags, post.cover, post.content, post.status, post.featured,
    post.created_at, post.updated_at, post.published_at
  ).run();
  return env.DB.prepare("SELECT * FROM posts WHERE slug = ? LIMIT 1")
    .bind(post.slug)
    .first();
}

async function updatePost(env, id, body) {
  await ensureDatabase(env);
  const current = await env.DB.prepare("SELECT * FROM posts WHERE id = ? LIMIT 1")
    .bind(id)
    .first();
  if (!current) return null;

  const post = normalizePayload(body, current);
  await env.DB.prepare(`
    UPDATE posts SET
      slug = ?, title = ?, summary = ?, type = ?, category = ?, tags = ?,
      cover = ?, content = ?, status = ?, featured = ?, updated_at = ?, published_at = ?
    WHERE id = ?
  `).bind(
    post.slug, post.title, post.summary, post.type, post.category, post.tags,
    post.cover, post.content, post.status, post.featured,
    post.updated_at, post.published_at, id
  ).run();

  return env.DB.prepare("SELECT * FROM posts WHERE id = ? LIMIT 1")
    .bind(id)
    .first();
}

async function seedPosts(env, incomingPosts) {
  await ensureDatabase(env);
  const statements = incomingPosts.map((input) => {
    const post = normalizePayload({ ...input, status: input.status || "published" });
    return env.DB.prepare(`
      INSERT INTO posts (
        slug, title, summary, type, category, tags, cover, content,
        status, featured, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        type = excluded.type,
        category = excluded.category,
        tags = excluded.tags,
        cover = excluded.cover,
        content = excluded.content,
        updated_at = excluded.updated_at
    `).bind(
      post.slug, post.title, post.summary, post.type, post.category,
      post.tags, post.cover, post.content, post.status, post.featured,
      post.created_at, post.updated_at, post.published_at
    );
  });

  if (statements.length) await env.DB.batch(statements);
}

async function handleAdminAuth(request, env, url) {
  if (url.pathname === "/api/admin/status" && request.method === "GET") {
    await ensureDatabase(env);
    const admin = await env.DB.prepare("SELECT id FROM admin_users WHERE id = 1").first();
    return json({ configured: Boolean(admin) });
  }

  if (url.pathname === "/api/admin/setup" && request.method === "POST") {
    if (!env.ADMIN_SETUP_TOKEN) {
      return json({ error: "服务器尚未配置 ADMIN_SETUP_TOKEN" }, 503);
    }
    await ensureDatabase(env);
    const exists = await env.DB.prepare("SELECT id FROM admin_users WHERE id = 1").first();
    if (exists) return json({ error: "管理员已经初始化" }, 409);

    const body = await request.json();
    if (body.setupToken !== env.ADMIN_SETUP_TOKEN) {
      return json({ error: "初始化密钥不正确" }, 403);
    }
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || password.length < 8) {
      return json({ error: "用户名不能为空，密码至少 8 位" }, 400);
    }
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    await env.DB.prepare(`
      INSERT INTO admin_users (id, username, password_hash, salt, created_at)
      VALUES (1, ?, ?, ?, ?)
    `).bind(username, passwordHash, salt, new Date().toISOString()).run();
    const session = await createSession(env, 1);
    return json(
      { admin: { username } },
      201,
      { "Set-Cookie": session.cookie }
    );
  }

  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    await ensureDatabase(env);
    const body = await request.json();
    const admin = await env.DB.prepare(
      "SELECT * FROM admin_users WHERE id = 1 LIMIT 1"
    ).first();
    if (!admin) return json({ error: "管理员尚未初始化" }, 409);
    const passwordHash = await hashPassword(
      String(body.password || ""),
      admin.salt
    );
    if (
      String(body.username || "").trim() !== admin.username ||
      passwordHash !== admin.password_hash
    ) {
      return json({ error: "用户名或密码错误" }, 401);
    }
    const session = await createSession(env, 1);
    return json(
      { admin: { username: admin.username } },
      200,
      { "Set-Cookie": session.cookie }
    );
  }

  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    const token = parseCookies(request).erogame_session;
    if (token) {
      await ensureDatabase(env);
      await env.DB.prepare(
        "DELETE FROM admin_sessions WHERE token_hash = ?"
      ).bind(await hashSessionToken(token)).run();
    }
    return json(
      { ok: true },
      200,
      { "Set-Cookie": "erogame_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" }
    );
  }

  if (url.pathname === "/api/admin/me" && request.method === "GET") {
    const admin = await getCurrentAdmin(env, request);
    return admin
      ? json({ admin: { id: admin.id, username: admin.username } })
      : json({ error: "管理员未登录" }, 401);
  }

  return null;
}

async function handleApi(request, env, url) {
  if (url.pathname === "/api/posts" && request.method === "GET") {
    try {
      const rows = await listPosts(env, { publishedOnly: true });
      return json({ posts: rows.map((row) => mapPost(row, false)) });
    } catch (error) {
      return json({ error: error.message, posts: [] }, 503);
    }
  }

  if (url.pathname.startsWith("/api/posts/") && request.method === "GET") {
    const slug = decodeURIComponent(url.pathname.slice("/api/posts/".length));
    try {
      await ensureDatabase(env);
      const row = await env.DB.prepare(
        "SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1"
      ).bind(slug).first();
      return row ? json({ post: mapPost(row) }) : json({ error: "文章不存在" }, 404);
    } catch (error) {
      return json({ error: error.message }, 503);
    }
  }

  if (url.pathname === "/api/site-content" && request.method === "GET") {
    try {
      return json({ content: await getSiteContent(env) });
    } catch (error) {
      return json({ error: error.message, content: SITE_CONTENT_DEFAULTS }, 503);
    }
  }

  const authResponse = await handleAdminAuth(request, env, url);
  if (authResponse) return authResponse;

  if (url.pathname.startsWith("/api/admin/")) {
    const auth = await requireAdmin(env, request);
    if (auth.error) return auth.error;

    if (url.pathname === "/api/admin/posts" && request.method === "GET") {
      const rows = await listPosts(env);
      return json({ posts: rows.map((row) => mapPost(row)) });
    }

    if (url.pathname === "/api/admin/posts" && request.method === "POST") {
      try {
        const row = await createPost(env, await request.json());
        return json({ post: mapPost(row) }, 201);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }

    if (url.pathname.startsWith("/api/admin/posts/") && request.method === "PUT") {
      const id = Number(url.pathname.slice("/api/admin/posts/".length));
      try {
        const row = await updatePost(env, id, await request.json());
        return row ? json({ post: mapPost(row) }) : json({ error: "文章不存在" }, 404);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }

    if (url.pathname.startsWith("/api/admin/posts/") && request.method === "DELETE") {
      const id = Number(url.pathname.slice("/api/admin/posts/".length));
      await ensureDatabase(env);
      await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    if (url.pathname === "/api/admin/seed" && request.method === "POST") {
      const body = await request.json();
      if (!Array.isArray(body.posts)) return json({ error: "缺少文章数据" }, 400);
      await seedPosts(env, body.posts);
      return json({ ok: true, count: body.posts.length });
    }

    if (url.pathname === "/api/admin/site-content" && request.method === "GET") {
      try {
        return json({ content: await getSiteContent(env) });
      } catch (error) {
        return json({ error: error.message }, 503);
      }
    }

    if (url.pathname === "/api/admin/site-content" && request.method === "PUT") {
      try {
        const body = await request.json();
        const content = await updateSiteContent(env, body.content || body);
        return json({ content });
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }

    if (url.pathname === "/api/admin/media" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "没有收到图片文件" }, 400);
      if (file.size > 2 * 1024 * 1024) {
        return json({ error: "图片压缩后仍超过 2MB，请换一张图片" }, 413);
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      await ensureDatabase(env);
      await env.DB.prepare(
        "INSERT INTO media (key, mime_type, data, created_at) VALUES (?, ?, ?, ?)"
      ).bind(
        key,
        file.type || "application/octet-stream",
        await file.arrayBuffer(),
        new Date().toISOString()
      ).run();
      return json({ url: `/media/${key}`, key }, 201);
    }
  }

  if (url.pathname.startsWith("/media/") && request.method === "GET") {
    const key = decodeURIComponent(url.pathname.slice("/media/".length));
    try {
      await ensureDatabase(env);
      const object = await env.DB.prepare(
        "SELECT mime_type, data FROM media WHERE key = ? LIMIT 1"
      ).bind(key).first();
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(object.data, {
        headers: {
          "Content-Type": object.mime_type,
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  return null;
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const apiResponse = await handleApi(request, env, url);
      if (apiResponse) return apiResponse;
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        500
      );
    }
  }
};
