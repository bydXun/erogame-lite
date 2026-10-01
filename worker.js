const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function adminEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email") || "";
}

function requireAdmin(request) {
  const email = adminEmail(request);
  if (!email) return { error: json({ error: "管理员未登录" }, 401) };
  return { email };
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
    type: body.type === "tutorial" ? "tutorial" : "game",
    category: String(
      body.category ||
      current.category ||
      (body.type === "tutorial" ? "教程" : "游戏感想")
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

  if (url.pathname.startsWith("/api/admin/")) {
    const auth = requireAdmin(request);
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
    const url = new URL(request.url);
    const apiResponse = await handleApi(request, env, url);
    if (apiResponse) return apiResponse;
    return env.ASSETS.fetch(request);
  }
};
