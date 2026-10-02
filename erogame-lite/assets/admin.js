(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let posts = [];
  let activeIndex = -1;
  let dirty = false;
  let imageTarget = "content";
  let authMode = "login";

  const listRoot = $("[data-post-list]");
  const richContent = $("[data-rich-content]");
  const previewBody = $("[data-preview-body]");
  const cloudStatus = $("[data-cloud-status]");
  const dirtyStatus = $("[data-dirty-status]");
  const siteCopyStatus = $("[data-site-copy-status]");
  const coverPreview = $("[data-cover-preview]");
  const imageInput = $("[data-image-input]");
  const authModal = $("#admin-auth");
  const authForm = $("[data-auth-form]");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(message) {
    const toast = $("[data-admin-toast]");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function setDirty(value) {
    dirty = value;
    dirtyStatus.hidden = !dirty;
  }

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("zh-CN");
  }

  function emptyPost() {
    return {
      id: null,
      slug: `post-${Date.now()}`,
      title: "未命名文章",
      summary: "",
      type: "game",
      category: "游戏感想",
      tags: [],
      cover: "",
      content: "<p></p>",
      status: "draft",
      featured: false,
      date: new Date().toISOString()
    };
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Accept": "application/json",
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {})
      }
    });

    if (response.status === 401) {
      throw new Error("管理员登录已失效，请刷新页面重新登录");
    }

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `请求失败：${response.status}`);
    return result;
  }

  function openAuth(mode, message = "") {
    authMode = mode;
    authModal.classList.add("open");
    $("[data-auth-title]").textContent = mode === "setup" ? "初始化管理员" : "管理员登录";
    $("[data-auth-copy]").textContent = mode === "setup"
      ? "第一次使用需要设置唯一的站点管理员账号。"
      : "使用站点管理员账号登录。";
    $("[data-setup-token-field]").hidden = mode !== "setup";
    $("[data-auth-submit]").textContent = mode === "setup" ? "创建管理员" : "登录";
    $("[data-auth-error]").textContent = message;
  }

  function closeAuth() {
    authModal.classList.remove("open");
    authForm.reset();
    $("[data-auth-error]").textContent = "";
  }

  async function checkAuthentication() {
    const statusResponse = await fetch("/api/admin/status", {
      headers: { "Accept": "application/json" }
    });
    const status = await statusResponse.json().catch(() => ({}));
    if (!status.configured) {
      openAuth("setup");
      return false;
    }

    const meResponse = await fetch("/api/admin/me", {
      headers: { "Accept": "application/json" }
    });
    if (!meResponse.ok) {
      openAuth("login");
      return false;
    }

    closeAuth();
    return true;
  }

  async function loadPosts() {
    cloudStatus.textContent = "正在读取云端文章…";
    const result = await api("/api/admin/posts");
    posts = result.posts || [];

    if (!posts.length && Array.isArray(window.EROGAME_POSTS)) {
      cloudStatus.textContent = "正在初始化示例文章…";
      await api("/api/admin/seed", {
        method: "POST",
        body: JSON.stringify({ posts: window.EROGAME_POSTS })
      });
      posts = (await api("/api/admin/posts")).posts || [];
    }

    if (!posts.length) posts = [emptyPost()];
    activeIndex = 0;
    renderList();
    syncForm();
    cloudStatus.textContent = `已连接云端 · ${posts.length} 篇文章`;
  }

  function collectSiteCopy() {
    return Object.fromEntries(
      $$("[data-site-copy-field]").map((field) => [
        field.dataset.siteCopyField,
        field.value
      ])
    );
  }

  function applySiteCopy(content) {
    $$("[data-site-copy-field]").forEach((field) => {
      const key = field.dataset.siteCopyField;
      field.value = content?.[key] ?? "";
    });
  }

  async function loadSiteCopy() {
    siteCopyStatus.textContent = "正在读取首页文案…";
    try {
      const result = await api("/api/admin/site-content");
      applySiteCopy(result.content || {});
      siteCopyStatus.textContent = "首页文案已同步";
    } catch (error) {
      siteCopyStatus.textContent = error.message;
    }
  }

  async function saveSiteCopy() {
    siteCopyStatus.textContent = "正在保存首页文案…";
    try {
      const result = await api("/api/admin/site-content", {
        method: "PUT",
        body: JSON.stringify({ content: collectSiteCopy() })
      });
      applySiteCopy(result.content || {});
      siteCopyStatus.textContent = "首页文案已保存";
      showToast("首页文案已保存，刷新首页即可看到");
    } catch (error) {
      siteCopyStatus.textContent = error.message;
      showToast(error.message);
    }
  }

  function getFilteredPosts() {
    const query = $("[data-post-search]").value.trim().toLowerCase();
    return posts
      .map((post, index) => ({ post, index }))
      .filter(({ post }) => {
        if (!query) return true;
        return [post.title, post.category, ...(post.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }

  function renderList() {
    const filtered = getFilteredPosts();
    listRoot.innerHTML = filtered.map(({ post, index }) => `
      <button class="post-list-item${index === activeIndex ? " active" : ""}" type="button" data-post-index="${index}">
        <span class="post-list-title">${escapeHtml(post.title)}</span>
        <span class="post-list-meta">
          ${post.status === "published" ? "已发布" : "草稿"} · ${escapeHtml(formatDate(post.date))}
        </span>
      </button>
    `).join("");
  }

  function setField(name, value) {
    const field = $(`[data-field="${name}"]`);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else if (field.type === "date") field.value = String(value || "").slice(0, 10);
    else field.value = value ?? "";
  }

  function getField(name) {
    const field = $(`[data-field="${name}"]`);
    if (!field) return undefined;
    if (field.type === "checkbox") return field.checked;
    return field.value;
  }

  function syncForm() {
    const post = posts[activeIndex];
    if (!post) return;

    setField("title", post.title);
    setField("slug", post.slug);
    setField("date", post.date);
    setField("type", post.type);
    setField("category", post.category);
    setField("summary", post.summary);
    setField("tags", (post.tags || []).join(", "));
    setField("cover", post.cover);
    setField("featured", post.featured);
    richContent.innerHTML = post.content || "<p></p>";
    renderCoverPreview(post.cover);
    renderPreview();
    renderList();
    setDirty(false);
  }

  function collectForm() {
    const current = posts[activeIndex];
    if (!current) return null;
    const next = {
      ...current,
      title: getField("title").trim() || "未命名文章",
      slug: getField("slug").trim() || `post-${Date.now()}`,
      date: getField("date") || new Date().toISOString().slice(0, 10),
      type: getField("type"),
      category: getField("category").trim() || (getField("type") === "game" ? "游戏感想" : "教程"),
      summary: getField("summary").trim(),
      tags: getField("tags").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      cover: getField("cover").trim(),
      content: richContent.innerHTML,
      featured: Boolean(getField("featured"))
    };
    posts[activeIndex] = next;
    renderPreview();
    renderList();
    return next;
  }

  function renderCoverPreview(url) {
    coverPreview.innerHTML = url
      ? `<img src="${escapeHtml(url)}" alt="封面预览">`
      : '<div class="cover-placeholder">上传封面或填写图片地址</div>';
  }

  function renderPreview() {
    previewBody.innerHTML = richContent.innerHTML || "<p>正文预览会显示在这里。</p>";
  }

  async function savePost(status) {
    const post = collectForm();
    if (!post) return;
    cloudStatus.textContent = status === "published" ? "正在发布…" : "正在保存草稿…";

    try {
      const payload = { ...post, status };
      const result = post.id
        ? await api(`/api/admin/posts/${post.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api("/api/admin/posts", { method: "POST", body: JSON.stringify(payload) });
      posts[activeIndex] = result.post;
      setDirty(false);
      syncForm();
      cloudStatus.textContent = status === "published" ? "已发布到网站" : "草稿已保存";
      showToast(status === "published" ? "文章已发布" : "草稿已保存");
    } catch (error) {
      cloudStatus.textContent = error.message;
      showToast(error.message);
    }
  }

  async function deletePost() {
    const post = posts[activeIndex];
    if (!post) return;
    if (!window.confirm(`确定删除“${post.title}”吗？`)) return;
    if (post.id) {
      await api(`/api/admin/posts/${post.id}`, { method: "DELETE" });
    }
    posts.splice(activeIndex, 1);
    if (!posts.length) posts = [emptyPost()];
    activeIndex = Math.max(0, Math.min(activeIndex, posts.length - 1));
    syncForm();
    showToast("文章已删除");
  }

  function newPost() {
    if (dirty) collectForm();
    posts.unshift(emptyPost());
    activeIndex = 0;
    syncForm();
    setDirty(true);
    $("[data-field='title']").focus();
  }

  function movePost(offset) {
    const target = activeIndex + offset;
    if (target < 0 || target >= posts.length) return;
    collectForm();
    [posts[activeIndex], posts[target]] = [posts[target], posts[activeIndex]];
    activeIndex = target;
    renderList();
    setDirty(true);
  }

  function generateSlug() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0")
    ].join("");
    setField("slug", `post-${stamp}`);
    setDirty(true);
  }

  function insertHtml(html) {
    richContent.focus();
    document.execCommand("insertHTML", false, html);
    collectForm();
    renderPreview();
    setDirty(true);
  }

  function runCommand(command, value) {
    richContent.focus();
    document.execCommand(command, false, value || null);
    collectForm();
    renderPreview();
    setDirty(true);
  }

  function bindEditor() {
    $$("[data-command]").forEach((button) => {
      button.addEventListener("click", () => runCommand(button.dataset.command, button.dataset.value));
    });

    $("[data-insert-link]")?.addEventListener("click", () => {
      const url = prompt("输入链接地址");
      if (url) runCommand("createLink", url);
    });

    $("[data-insert-code]")?.addEventListener("click", () => {
      const code = prompt("粘贴代码内容");
      if (code) insertHtml(`<pre><code>${escapeHtml(code)}</code></pre><p></p>`);
    });

    $("[data-insert-callout]")?.addEventListener("click", () => {
      const text = prompt("输入提示内容");
      if (text) insertHtml(`<div class="callout"><strong>提示：</strong>${escapeHtml(text)}</div><p></p>`);
    });

    $("[data-insert-keypoints]")?.addEventListener("click", () => {
      const input = prompt("每行输入一个重点");
      if (!input) return;
      const items = input.split("\n").map((item) => item.trim()).filter(Boolean);
      insertHtml(`<div class="key-points"><h3>重点整理</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><p></p>`);
    });

    richContent.addEventListener("input", () => {
      collectForm();
      renderPreview();
      setDirty(true);
    });

    $$("[data-field]").forEach((field) => {
      field.addEventListener("input", () => {
        if (field.dataset.field === "type") {
          setField("category", field.value === "game" ? "游戏感想" : "教程");
        }
        if (field.dataset.field === "cover") renderCoverPreview(field.value.trim());
        collectForm();
        setDirty(true);
      });
      field.addEventListener("change", () => {
        collectForm();
        setDirty(true);
      });
    });
  }

  async function compressImage(file) {
    if (file.type === "image/gif" || file.size < 500 * 1024) return file;
    const bitmap = await createImageBitmap(file);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    bitmap.close();
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  }

  async function uploadImage(file) {
    cloudStatus.textContent = "正在压缩图片…";
    const prepared = await compressImage(file);
    const form = new FormData();
    form.append("file", prepared);
    cloudStatus.textContent = "正在上传图片…";
    const result = await api("/api/admin/media", { method: "POST", body: form });
    cloudStatus.textContent = "图片上传完成";

    if (imageTarget === "cover") {
      setField("cover", result.url);
      renderCoverPreview(result.url);
      collectForm();
    } else {
      insertHtml(`<figure><img src="${escapeHtml(result.url)}" alt=""><figcaption>图片说明</figcaption></figure><p></p>`);
    }
    setDirty(true);
    showToast("图片已上传到云端");
  }

  function bindActions() {
    listRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-post-index]");
      if (!button) return;
      if (dirty) collectForm();
      activeIndex = Number(button.dataset.postIndex);
      syncForm();
    });

    $$("[data-new-post]").forEach((button) => button.addEventListener("click", newPost));
    $$("[data-save-draft]").forEach((button) => button.addEventListener("click", () => savePost("draft")));
    $$("[data-publish-post]").forEach((button) => button.addEventListener("click", () => savePost("published")));
    $("[data-delete-post]").addEventListener("click", deletePost);
    $("[data-move-up]").addEventListener("click", () => movePost(-1));
    $("[data-move-down]").addEventListener("click", () => movePost(1));
    $("[data-generate-slug]").addEventListener("click", generateSlug);
    $("[data-post-search]").addEventListener("input", renderList);
    $("[data-logout]").addEventListener("click", async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.reload();
    });

    $("[data-save-site-copy]")?.addEventListener("click", saveSiteCopy);
    $$("[data-site-copy-field]").forEach((field) => {
      field.addEventListener("input", () => {
        siteCopyStatus.textContent = "有未保存的首页文案";
      });
    });

    $$("[data-upload-cover]").forEach((button) => {
      button.addEventListener("click", () => {
        imageTarget = "cover";
        imageInput.click();
      });
    });

    $$("[data-upload-content-image]").forEach((button) => {
      button.addEventListener("click", () => {
        imageTarget = "content";
        imageInput.click();
      });
    });

    imageInput.addEventListener("change", async () => {
      const file = imageInput.files?.[0];
      imageInput.value = "";
      if (!file) return;
      try {
        await uploadImage(file);
      } catch (error) {
        cloudStatus.textContent = error.message;
        showToast(error.message);
      }
    });

    window.addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function bindAuth() {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      $("[data-auth-error]").textContent = "";
      const formData = new FormData(authForm);
      const endpoint = authMode === "setup" ? "/api/admin/setup" : "/api/admin/login";
      const body = {
        username: formData.get("username"),
        password: formData.get("password"),
        ...(authMode === "setup" ? { setupToken: formData.get("setupToken") } : {})
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "登录失败");
        closeAuth();
        await loadPosts();
      } catch (error) {
        $("[data-auth-error]").textContent = error.message;
      }
    });
  }

  async function init() {
    bindActions();
    bindAuth();
    bindEditor();
    try {
      const authenticated = await checkAuthentication();
      if (!authenticated) {
        cloudStatus.textContent = "等待管理员登录…";
        return;
      }
      await loadPosts();
      await loadSiteCopy();
    } catch (error) {
      cloudStatus.textContent = error.message;
      listRoot.innerHTML = `<div class="state-box"><h2>无法读取文章</h2><p>${escapeHtml(error.message)}</p></div>`;
    }
    window.lucide?.createIcons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
