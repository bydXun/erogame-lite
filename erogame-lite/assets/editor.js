(function () {
  const STORAGE_KEY = "erogame-editor-draft";
  const GITHUB_TOKEN_KEY = "erogame-github-token";
  const GITHUB_CLIENT_ID = "Ov23ctBFP3e6Vs0k68J4";
  const GITHUB_OWNER = "bydXun";
  const GITHUB_REPO = "erogame-lite";
  const GITHUB_BRANCH = "main";
  const GITHUB_FILE_PATH = "erogame-lite/assets/posts.js";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let posts = clone(window.EROGAME_POSTS || []);
  let activeIndex = 0;
  let fileHandle = null;
  let githubToken = localStorage.getItem(GITHUB_TOKEN_KEY) || "";
  let deviceFlowTimer = null;
  let dirty = false;
  let searchValue = "";
  let autoSaveTimer;

  const listRoot = $("[data-post-list]");
  const richContent = $("[data-rich-content]");
  const previewBody = $("[data-preview-body]");
  const dirtyStatus = $("[data-dirty-status]");
  const fileStatus = $("[data-file-status]");
  const githubStatus = $("[data-github-status]");
  const coverPreview = $("[data-cover-preview]");

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("zh-CN");
  }

  function showToast(message) {
    const toast = $("[data-editor-toast]");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function setGithubStatus(message, connected = false) {
    githubStatus.textContent = message;
    githubStatus.style.color = connected ? "var(--green)" : "";
    $("[data-github-connect]").textContent = connected ? "断开 GitHub" : "连接 GitHub";
  }

  function githubHeaders() {
    return {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function encodeBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function decodeBase64Utf8(value) {
    const binary = atob(value.replaceAll("\n", ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function parsePostsSource(source) {
    const sandbox = { window: {} };
    Function("window", source)(sandbox.window);
    if (!Array.isArray(sandbox.window.EROGAME_POSTS)) {
      throw new Error("GitHub 文件中没有有效的文章数据");
    }
    return sandbox.window.EROGAME_POSTS.map(normalizePost);
  }

  async function verifyGithubToken() {
    if (!githubToken) {
      setGithubStatus("GitHub 未连接");
      return false;
    }

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: githubHeaders()
      });
      if (!response.ok) throw new Error("token invalid");
      const user = await response.json();
      setGithubStatus(`GitHub 已连接：${user.login}`, true);
      return true;
    } catch {
      githubToken = "";
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      setGithubStatus("GitHub 登录已失效");
      return false;
    }
  }

  async function loadGithubPosts() {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`,
      { headers: githubHeaders() }
    );
    if (!response.ok) throw new Error(`读取 GitHub 文章失败：${response.status}`);
    const data = await response.json();
    return {
      sha: data.sha,
      posts: parsePostsSource(decodeBase64Utf8(data.content))
    };
  }

  function openGithubModal() {
    $("#github-modal").classList.add("open");
    document.body.classList.add("modal-open");
  }

  function closeGithubModal() {
    clearInterval(deviceFlowTimer);
    $("#github-modal").classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  async function connectGithub() {
    if (githubToken) {
      githubToken = "";
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      setGithubStatus("GitHub 未连接");
      showToast("已断开 GitHub");
      return;
    }

    openGithubModal();
    $("[data-device-code]").textContent = "--------";
    $("[data-device-status]").textContent = "正在申请授权码…";

    let device;
    try {
      const response = await fetch("/api/github/device/code", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          scope: "public_repo"
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      device = await response.json();
    } catch {
      $("[data-device-status]").textContent = "无法连接 GitHub 授权接口，请确认 OAuth App 已开启 Device Flow。";
      return;
    }

    $("[data-device-code]").textContent = device.user_code;
    $("[data-device-status]").textContent = "等待 GitHub 确认授权…";
    $("[data-open-github-device]").href = device.verification_uri;

    clearInterval(deviceFlowTimer);
    deviceFlowTimer = setInterval(async () => {
      try {
        const response = await fetch("/api/github/device/token", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            device_code: device.device_code,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code"
          })
        });
        const result = await response.json();

        if (result.access_token) {
          clearInterval(deviceFlowTimer);
          githubToken = result.access_token;
          localStorage.setItem(GITHUB_TOKEN_KEY, githubToken);
          setGithubStatus("GitHub 已连接", true);
          closeGithubModal();
          showToast("GitHub 连接成功");

          if (!dirty) {
            try {
              const remote = await loadGithubPosts();
              posts = remote.posts;
              activeIndex = 0;
              syncForm();
              showToast("已载入 GitHub 最新文章");
            } catch {
              showToast("已连接，但从 GitHub 读取文章失败");
            }
          }
          return;
        }

        if (result.error === "authorization_pending" || result.error === "slow_down") return;
        clearInterval(deviceFlowTimer);
        $("[data-device-status]").textContent = `授权失败：${result.error_description || result.error}`;
      } catch {
        $("[data-device-status]").textContent = "等待授权时网络连接失败，请关闭后重试。";
      }
    }, Math.max(5, Number(device.interval) || 5) * 1000);
  }

  async function publishGithub() {
    const connected = await verifyGithubToken();
    if (!connected) {
      showToast("请先连接 GitHub");
      await connectGithub();
      return;
    }

    if (dirty) collectForm();
    const source = serializePosts();
    setGithubStatus("正在发布到 GitHub…");

    try {
      let sha;
      try {
        const existing = await loadGithubPosts();
        sha = existing.sha;
      } catch {
        sha = undefined;
      }

      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
        {
          method: "PUT",
          headers: {
            ...githubHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: `更新 EroGame Lite 文章 · ${new Date().toLocaleString("zh-CN")}`,
            content: encodeBase64Utf8(source),
            branch: GITHUB_BRANCH,
            ...(sha ? { sha } : {})
          })
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      markClean("已发布到 GitHub，等待 Cloudflare 自动部署");
      setGithubStatus("GitHub 已连接", true);
      showToast("发布成功，Cloudflare 正在自动部署");
    } catch (error) {
      setGithubStatus("发布失败");
      showToast(`发布失败：${error.message}`);
    }
  }

  function markDirty() {
    dirty = true;
    dirtyStatus.hidden = false;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      persistDraft();
      dirtyStatus.textContent = "已自动保存到浏览器草稿";
    }, 600);
  }

  function markClean(message = "已保存") {
    dirty = false;
    dirtyStatus.hidden = true;
    dirtyStatus.textContent = "有未保存修改";
    fileStatus.textContent = message;
  }

  function persistDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      posts
    }));
  }

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!draft?.posts?.length) return null;
      return draft;
    } catch {
      return null;
    }
  }

  function normalizePost(post) {
    return {
      slug: post.slug || `post-${Date.now()}`,
      title: post.title || "未命名文章",
      summary: post.summary || "",
      type: post.type === "game" ? "game" : "tutorial",
      category: post.category || (post.type === "game" ? "游戏感想" : "教程"),
      tags: Array.isArray(post.tags) ? post.tags : [],
      date: post.date || new Date().toISOString().slice(0, 10),
      cover: post.cover || "",
      featured: Boolean(post.featured),
      content: post.content || "<p></p>"
    };
  }

  function getFilteredPosts() {
    const query = searchValue.trim().toLowerCase();
    if (!query) return posts.map((post, index) => ({ post, index }));

    return posts
      .map((post, index) => ({ post, index }))
      .filter(({ post }) => {
        const haystack = [post.title, post.category, ...(post.tags || [])].join(" ").toLowerCase();
        return haystack.includes(query);
      });
  }

  function renderPostList() {
    const filtered = getFilteredPosts();
    if (!filtered.length) {
      listRoot.innerHTML = `
        <div class="editor-empty">
          <p>没有匹配的文章</p>
        </div>
      `;
      return;
    }

    listRoot.innerHTML = filtered.map(({ post, index }) => `
      <button class="post-list-item${index === activeIndex ? " active" : ""}" type="button" data-post-index="${index}">
        <span class="post-list-title">${escapeHtml(post.title || "未命名文章")}</span>
        <span class="post-list-meta">${escapeHtml(post.category)} · ${escapeHtml(formatDate(post.date))}</span>
      </button>
    `).join("");
  }

  function setField(name, value) {
    const field = $(`[data-field="${name}"]`);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
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
    if (!post) {
      $(".editor-panel")?.setAttribute("hidden", "");
      return;
    }
    $(".editor-panel")?.removeAttribute("hidden");

    setField("title", post.title);
    setField("slug", post.slug);
    setField("date", post.date);
    setField("type", post.type);
    setField("category", post.category);
    setField("summary", post.summary);
    setField("tags", post.tags.join(", "));
    setField("cover", post.cover);
    setField("featured", post.featured);
    richContent.innerHTML = post.content || "<p></p>";
    renderCoverPreview(post.cover);
    renderPreview();
    renderPostList();
  }

  function collectForm() {
    const previous = posts[activeIndex];
    if (!previous) return null;

    const next = {
      ...previous,
      title: getField("title").trim() || "未命名文章",
      slug: getField("slug").trim() || `post-${Date.now()}`,
      date: getField("date"),
      type: getField("type"),
      category: getField("category").trim() || (getField("type") === "game" ? "游戏感想" : "教程"),
      summary: getField("summary").trim(),
      tags: getField("tags").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      cover: getField("cover").trim(),
      featured: Boolean(getField("featured")),
      content: richContent.innerHTML
    };

    posts[activeIndex] = next;
    renderPreview();
    renderPostList();
    return next;
  }

  function renderCoverPreview(url) {
    if (!url) {
      coverPreview.innerHTML = '<div class="cover-placeholder">输入封面图片地址后显示预览</div>';
      return;
    }
    coverPreview.innerHTML = `<img src="${escapeHtml(url)}" alt="封面预览">`;
  }

  function renderPreview() {
    if (!previewBody) return;
    previewBody.innerHTML = richContent.innerHTML || "<p>正文预览会显示在这里。</p>";
  }

  function selectPost(index) {
    if (dirty) collectForm();
    activeIndex = index;
    syncForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createPost() {
    if (dirty) collectForm();
    const date = new Date().toISOString().slice(0, 10);
    const newPost = normalizePost({
      slug: `post-${Date.now()}`,
      title: "未命名文章",
      date,
      type: "game",
      category: "游戏感想",
      tags: [],
      featured: false,
      summary: "",
      cover: "",
      content: "<p></p>"
    });
    posts.unshift(newPost);
    activeIndex = 0;
    syncForm();
    markDirty();
    $("[data-field='title']").focus();
  }

  function duplicatePost() {
    if (!posts[activeIndex]) return;
    collectForm();
    const copy = clone(posts[activeIndex]);
    copy.title = `${copy.title}（副本）`;
    copy.slug = `${copy.slug}-copy-${Date.now().toString().slice(-4)}`;
    copy.date = new Date().toISOString().slice(0, 10);
    posts.splice(activeIndex + 1, 0, copy);
    activeIndex += 1;
    syncForm();
    markDirty();
  }

  function deletePost() {
    if (!posts[activeIndex]) return;
    if (!window.confirm(`确定删除“${posts[activeIndex].title}”吗？`)) return;
    posts.splice(activeIndex, 1);
    activeIndex = Math.max(0, Math.min(activeIndex, posts.length - 1));
    syncForm();
    markDirty();
  }

  function movePost(offset) {
    const nextIndex = activeIndex + offset;
    if (nextIndex < 0 || nextIndex >= posts.length) return;
    collectForm();
    [posts[activeIndex], posts[nextIndex]] = [posts[nextIndex], posts[activeIndex]];
    activeIndex = nextIndex;
    syncForm();
    markDirty();
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
    markDirty();
  }

  function runCommand(command, value) {
    richContent.focus();
    document.execCommand(command, false, value);
    collectForm();
    renderPreview();
    markDirty();
  }

  function insertHtml(html) {
    richContent.focus();
    document.execCommand("insertHTML", false, html);
    collectForm();
    renderPreview();
    markDirty();
  }

  function serializePosts() {
    if (dirty) collectForm();
    return `window.EROGAME_POSTS = ${JSON.stringify(posts, null, 2)};\n`;
  }

  function downloadFile() {
    const blob = new Blob([serializePosts()], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "posts.js";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("已下载更新后的 posts.js");
  }

  function resetDraft() {
    if (!window.confirm("确定放弃当前浏览器草稿，并恢复网站内置文章吗？")) return;
    localStorage.removeItem(STORAGE_KEY);
    posts = clone(window.EROGAME_POSTS || []).map(normalizePost);
    activeIndex = 0;
    fileHandle = null;
    syncForm();
    markClean("已恢复网站内置文章");
    showToast("已恢复内置文章");
  }

  function parsePostsFile(text) {
    const sandbox = { window: {} };
    Function("window", text)(sandbox.window);
    if (!Array.isArray(sandbox.window.EROGAME_POSTS)) {
      throw new Error("文件中没有 window.EROGAME_POSTS 数组");
    }
    posts = sandbox.window.EROGAME_POSTS.map(normalizePost);
    activeIndex = 0;
    syncForm();
    markDirty();
  }

  async function openPostsFile() {
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{
            description: "posts.js",
            accept: { "text/javascript": [".js"] }
          }]
        });
        fileHandle = handle;
        const file = await handle.getFile();
        parsePostsFile(await file.text());
        fileStatus.textContent = `已打开：${file.name}`;
        showToast("文章数据已载入");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".js,text/javascript";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      parsePostsFile(await file.text());
      fileHandle = null;
      fileStatus.textContent = `已导入：${file.name}`;
      showToast("文章数据已导入");
    });
    input.click();
  }

  async function savePostsFile() {
    if (dirty) collectForm();

    if (fileHandle) {
      const permission = await fileHandle.queryPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        await fileHandle.requestPermission({ mode: "readwrite" });
      }
      const writable = await fileHandle.createWritable();
      await writable.write(serializePosts());
      await writable.close();
      markClean(`已保存到：${fileHandle.name}`);
      showToast("posts.js 已保存");
      return;
    }

    downloadFile();
    showToast("已下载副本。请用 Cloudflare 重新上传该文件。");
  }

  function bindFormEvents() {
    const fields = $$("[data-field]");
    fields.forEach((field) => {
      field.addEventListener("input", () => {
        if (field.dataset.field === "type") {
          const type = field.value;
          setField("category", type === "game" ? "游戏感想" : "教程");
        }
        if (field.dataset.field === "cover") {
          renderCoverPreview(field.value.trim());
        }
        collectForm();
        markDirty();
      });
      field.addEventListener("change", () => {
        collectForm();
        markDirty();
      });
    });

    richContent.addEventListener("input", () => {
      collectForm();
      renderPreview();
      markDirty();
    });
  }

  function bindToolbar() {
    $$("[data-command]").forEach((button) => {
      button.addEventListener("click", () => {
        runCommand(button.dataset.command, button.dataset.value || null);
      });
    });

    $("[data-insert-link]").addEventListener("click", () => {
      const url = window.prompt("输入链接地址");
      if (!url) return;
      runCommand("createLink", url);
    });

    $("[data-insert-image]").addEventListener("click", () => {
      const url = window.prompt("输入图片地址");
      if (!url) return;
      insertHtml(`<figure><img src="${escapeHtml(url)}" alt=""><figcaption>图片说明</figcaption></figure><p></p>`);
    });

    $("[data-insert-code]").addEventListener("click", () => {
      const code = window.prompt("粘贴代码内容");
      if (!code) return;
      insertHtml(`<pre><code>${escapeHtml(code)}</code></pre><p></p>`);
    });

    $("[data-insert-callout]").addEventListener("click", () => {
      const text = window.prompt("输入提示内容");
      if (!text) return;
      insertHtml(`<div class="callout"><strong>提示：</strong>${escapeHtml(text)}</div><p></p>`);
    });

    $("[data-insert-keypoints]").addEventListener("click", () => {
      const input = window.prompt("每行输入一个重点");
      if (!input) return;
      const list = input.split("\n").map((item) => item.trim()).filter(Boolean);
      insertHtml(`<div class="key-points"><h3>重点整理</h3><ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><p></p>`);
    });
  }

  function bindActions() {
    $("[data-new-post]").addEventListener("click", createPost);
    $("[data-duplicate-post]").addEventListener("click", duplicatePost);
    $("[data-delete-post]").addEventListener("click", deletePost);
    $("[data-move-up]").addEventListener("click", () => movePost(-1));
    $("[data-move-down]").addEventListener("click", () => movePost(1));
    $("[data-generate-slug]").addEventListener("click", generateSlug);
    $("[data-open-file]").addEventListener("click", openPostsFile);
    $("[data-save-file]").addEventListener("click", savePostsFile);
    $("[data-export-file]").addEventListener("click", downloadFile);
    $("[data-reset-draft]").addEventListener("click", resetDraft);
    $("[data-github-connect]").addEventListener("click", connectGithub);
    $("[data-github-publish]").addEventListener("click", publishGithub);
    $("[data-focus-editor]").addEventListener("click", () => richContent.focus());

    $("#github-modal").addEventListener("click", (event) => {
      if (event.target === $("#github-modal") || event.target.closest("[data-close-github-modal]")) {
        closeGithubModal();
      }
    });

    $("[data-copy-device-code]").addEventListener("click", async () => {
      const code = $("[data-device-code]").textContent.trim();
      if (!code || code === "--------") return;
      try {
        await navigator.clipboard.writeText(code);
        showToast("授权码已复制");
      } catch {
        showToast("复制失败，请手动输入授权码");
      }
    });

    listRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-post-index]");
      if (!button) return;
      selectPost(Number(button.dataset.postIndex));
    });

    $("[data-post-search]").addEventListener("input", (event) => {
      searchValue = event.target.value;
      renderPostList();
    });

    window.addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function init() {
    const draft = loadDraft();
    if (draft) {
      posts = draft.posts.map(normalizePost);
      fileStatus.textContent = `已恢复浏览器草稿 · ${new Date(draft.savedAt).toLocaleString("zh-CN")}`;
    } else {
      posts = posts.map(normalizePost);
      fileStatus.textContent = "当前使用网站内置文章";
    }

    if (!posts.length) {
      posts = [normalizePost({
        slug: `post-${Date.now()}`,
        title: "未命名文章",
        date: new Date().toISOString().slice(0, 10),
        category: "游戏感想",
        tags: [],
        featured: false,
        summary: "",
        cover: "",
        content: "<p></p>"
      })];
    }

    activeIndex = Math.min(activeIndex, posts.length - 1);
    bindFormEvents();
    bindToolbar();
    bindActions();
    syncForm();
    void verifyGithubToken();
    window.lucide?.createIcons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
