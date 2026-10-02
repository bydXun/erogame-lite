(function () {
  let posts = window.EROGAME_POSTS || [];
  const page = document.body.dataset.page || "";
  const basePath = document.body.dataset.base || ".";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return {
      full: date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }),
      short: date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit"
      }),
      year: date.getFullYear(),
      weekday: date.toLocaleDateString("zh-CN", { weekday: "long" })
    };
  }

  function postUrl(slug) {
    return `${basePath}/post.html?slug=${encodeURIComponent(slug)}`;
  }

  function typeClass(type) {
    return type === "game" ? "game" : "tutorial";
  }

  function showToast(message) {
    let toast = $(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function ensureSubscribeModal() {
    if ($("#subscribe-modal")) return;

    const modal = document.createElement("div");
    modal.id = "subscribe-modal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "subscribe-modal-title");
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h2 class="modal-title" id="subscribe-modal-title">订阅更新</h2>
          <button class="icon-button" type="button" data-close-subscribe aria-label="关闭">
            <i data-lucide="x"></i>
          </button>
        </div>
        <p class="modal-copy">这里先完成前端交互。接入邮件服务后，提交邮箱即可真正发送订阅确认。</p>
        <form class="modal-form" data-subscribe-form>
          <label class="sr-only" for="subscribe-email">邮箱</label>
          <input id="subscribe-email" type="email" required placeholder="你的邮箱地址">
          <button class="button" type="submit">确认订阅</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    window.lucide?.createIcons();

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-close-subscribe]")) {
        modal.classList.remove("open");
        document.body.classList.remove("modal-open");
      }
    });

    $("[data-subscribe-form]", modal).addEventListener("submit", (event) => {
      event.preventDefault();
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
      event.target.reset();
      showToast("订阅交互已完成，接入邮件服务后即可发送确认邮件。");
    });
  }

  function openSubscribeModal() {
    ensureSubscribeModal();
    const modal = $("#subscribe-modal");
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    setTimeout(() => $("#subscribe-email", modal)?.focus(), 120);
  }

  function renderMobileDrawer() {
    if ($("#mobile-drawer")) return;

    const current = {
      home: page === "home",
      archive: page === "archive",
      tags: page === "tags",
      about: page === "about"
    };

    const drawer = document.createElement("div");
    drawer.id = "mobile-drawer";
    drawer.className = "mobile-drawer";
    drawer.innerHTML = `
      <div class="drawer-backdrop" data-close-drawer></div>
      <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="站点菜单">
        <div class="drawer-head">
          <a class="brand" href="${basePath}/index.html">
            <span class="brand-mark" aria-hidden="true"></span>
            <span>bydXun Lite</span>
          </a>
          <button class="icon-button" type="button" data-close-drawer aria-label="关闭菜单">
            <i data-lucide="x"></i>
          </button>
        </div>
        <nav class="drawer-nav" aria-label="移动端菜单">
          <a class="drawer-link" href="${basePath}/index.html">
            <span>首页</span>
            ${current.home ? '<i data-lucide="dot"></i>' : ""}
          </a>
          <div class="drawer-group">
            <button class="drawer-group-button" type="button" data-drawer-group>
              <span>游戏感想</span>
              <i data-lucide="chevron-down"></i>
            </button>
            <div class="drawer-submenu">
              <div>
                <a href="${basePath}/archive.html?type=game">全部游戏感想</a>
                <a href="${basePath}/tags.html?tag=动作冒险">动作冒险</a>
                <a href="${basePath}/tags.html?tag=视觉小说">视觉小说</a>
                <a href="${basePath}/tags.html?tag=游玩记录">游玩记录</a>
              </div>
            </div>
          </div>
          <div class="drawer-group">
            <button class="drawer-group-button" type="button" data-drawer-group>
              <span>教程</span>
              <i data-lucide="chevron-down"></i>
            </button>
            <div class="drawer-submenu">
              <div>
                <a href="${basePath}/archive.html?type=tutorial">全部教程</a>
                <a href="${basePath}/tags.html?tag=AI 工具">AI 工具</a>
                <a href="${basePath}/tags.html?tag=部署">部署</a>
                <a href="${basePath}/tags.html?tag=写作">写作</a>
              </div>
            </div>
          </div>
          <a class="drawer-link" href="${basePath}/archive.html">归档</a>
          <a class="drawer-link" href="${basePath}/tags.html">标签</a>
          <a class="drawer-link" href="${basePath}/search.html">搜索</a>
          <a class="drawer-link" href="${basePath}/about.html">关于</a>
          <button class="drawer-link" type="button" data-open-subscribe>订阅更新</button>
        </nav>
      </div>
    `;

    document.body.appendChild(drawer);
    window.lucide?.createIcons();

    drawer.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-drawer]")) {
        closeMobileDrawer();
      }

      const groupButton = event.target.closest("[data-drawer-group]");
      if (groupButton) {
        groupButton.closest(".drawer-group").classList.toggle("open");
      }
    });
  }

  function openMobileDrawer() {
    renderMobileDrawer();
    const drawer = $("#mobile-drawer");
    drawer.classList.add("open");
    document.body.classList.add("drawer-open");
  }

  function closeMobileDrawer() {
    const drawer = $("#mobile-drawer");
    if (!drawer) return;
    drawer.classList.remove("open");
    document.body.classList.remove("drawer-open");
  }

  function initNavigation() {
    const navItems = $$(".nav-item");

    $$("[data-submenu-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const item = button.closest(".nav-item");
        const nextOpen = !item.classList.contains("open");
        navItems.forEach((navItem) => {
          navItem.classList.remove("open");
          $("[data-submenu-toggle]", navItem)?.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("open", nextOpen);
        button.setAttribute("aria-expanded", String(nextOpen));
      });
    });

    document.addEventListener("click", () => {
      navItems.forEach((item) => {
        item.classList.remove("open");
        $("[data-submenu-toggle]", item)?.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        navItems.forEach((item) => item.classList.remove("open"));
        closeMobileDrawer();
        $(".modal.open")?.classList.remove("open");
        document.body.classList.remove("modal-open", "drawer-open");
      }
    });

    $$("[data-open-menu]").forEach((button) => button.addEventListener("click", openMobileDrawer));
    $$("[data-open-subscribe]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openSubscribeModal();
      });
    });
    $$("[data-open-search]").forEach((button) => {
      button.addEventListener("click", () => {
        window.location.href = `${basePath}/search.html`;
      });
    });
  }

  function initScrollBehavior() {
    const topShell = $(".top-shell");
    const floatingGuide = $(".floating-guide");
    const progress = $("[data-reading-progress]");
    let lastScrollY = window.scrollY;

    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;
      const isNearTop = currentScrollY < 24;

      topShell?.classList.toggle("scrolled", !isNearTop);

      if (isNearTop) {
        topShell?.classList.remove("retracted");
        floatingGuide?.classList.remove("visible");
      } else if (currentScrollY > lastScrollY) {
        topShell?.classList.add("retracted");
        floatingGuide?.classList.add("visible");
      } else {
        topShell?.classList.remove("retracted");
        floatingGuide?.classList.remove("visible");
      }

      lastScrollY = currentScrollY;

      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const value = max > 0 ? Math.min(100, (currentScrollY / max) * 100) : 0;
        progress.style.width = `${value}%`;
      }
    }, { passive: true });
  }

  function renderPostCard(post, featured = false) {
    const date = formatDate(post.date);
    return `
      <article class="post-card${featured ? " featured" : ""}">
        <a class="post-cover" href="${postUrl(post.slug)}" aria-label="${escapeHtml(post.title)}">
          <img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" loading="lazy">
        </a>
        <div>
          <div class="post-meta">
            <span class="type ${typeClass(post.type)}">${escapeHtml(post.category)}</span>
            <span>${date.full}</span>
          </div>
          <h3 class="post-title"><a href="${postUrl(post.slug)}">${escapeHtml(post.title)}</a></h3>
          <p class="post-summary">${escapeHtml(post.summary)}</p>
          <div class="tag-list">
            ${post.tags.slice(0, 3).map((tag) => `<a href="${basePath}/tags.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function renderHome() {
    const featuredRoot = $("[data-home-featured]");
    const latestRoot = $("[data-home-latest]");
    if (!featuredRoot || !latestRoot) return;

    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const featured = sorted.find((post) => post.featured) || sorted[0];
    const latest = sorted.filter((post) => post.slug !== featured.slug).slice(0, 4);

    featuredRoot.innerHTML = renderPostCard(featured, true);
    latestRoot.innerHTML = latest.map((post) => renderPostCard(post)).join("");
  }

  function renderArchive() {
    const root = $("[data-archive-root]");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const initialType = params.get("type") || "all";
    const groups = new Map();

    [...posts]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((post) => {
        const year = formatDate(post.date).year;
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(post);
      });

    root.innerHTML = [...groups.entries()].map(([year, groupPosts]) => `
      <section class="archive-group" data-year-group="${year}">
        <h2 class="archive-year" id="year-${year}">
          ${year}
          <small>${groupPosts.length} 篇文章</small>
        </h2>
        <div class="article-grid">
          ${groupPosts.map((post) => {
            const date = formatDate(post.date);
            return `
              <article class="article-row" data-type="${escapeHtml(post.type)}" data-year="${year}">
                <div class="article-date">
                  <strong>${date.short}</strong>
                  ${date.weekday}
                </div>
                <div>
                  <span class="archive-type ${typeClass(post.type)}">${escapeHtml(post.category)}</span>
                  <h3><a href="${postUrl(post.slug)}">${escapeHtml(post.title)}</a></h3>
                  <p>${escapeHtml(post.summary)}</p>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `).join("");

    const guide = $("[data-archive-guide]");
    if (guide) {
      guide.innerHTML = [...groups.keys()].map((year, index) => `
        <a class="${index === 0 ? "active" : ""}" href="#year-${year}" data-year-link="${year}">${year}</a>
      `).join("");
    }

    function applyFilter(filter) {
      $$("[data-filter]", document).forEach((button) => {
        button.classList.toggle("active", button.dataset.filter === filter);
      });

      $$("[data-year-group]", root).forEach((group) => {
        const rows = $$("[data-type]", group);
        rows.forEach((row) => {
          row.hidden = filter !== "all" && row.dataset.type !== filter;
        });
        group.hidden = !rows.some((row) => !row.hidden);
      });
    }

    $$("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.filter));
    });

    applyFilter(initialType === "game" || initialType === "tutorial" ? initialType : "all");
    initSectionObserver("[data-year-group]", "[data-year-link]");
    window.lucide?.createIcons();
  }

  function renderTags() {
    const cloud = $("[data-tag-cloud]");
    const results = $("[data-tag-results]");
    if (!cloud || !results) return;

    const counts = new Map();
    posts.forEach((post) => {
      post.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });

    const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
    const params = new URLSearchParams(window.location.search);
    const initialTag = params.get("tag") || tags[0]?.[0] || "";

    cloud.innerHTML = tags.map(([tag, count]) => `
      <button class="tag-pill" type="button" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)} · ${count}
      </button>
    `).join("");

    function applyTag(tag) {
      $$("[data-tag]", cloud).forEach((button) => {
        button.classList.toggle("active", button.dataset.tag === tag);
      });

      const matched = posts.filter((post) => post.tags.includes(tag));
      $("[data-tag-title]").textContent = tag || "全部文章";
      $("[data-tag-count]").textContent = `${matched.length} 篇文章`;

      results.innerHTML = matched.length
        ? matched.map((post) => renderPostCard(post)).join("")
        : `<div class="state-box"><i data-lucide="search-x"></i><h2>这个标签还没有文章</h2><p>换一个标签继续浏览。</p></div>`;
      window.lucide?.createIcons();
    }

    cloud.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tag]");
      if (!button) return;
      const tag = button.dataset.tag;
      history.replaceState(null, "", `tags.html?tag=${encodeURIComponent(tag)}`);
      applyTag(tag);
    });

    applyTag(initialTag);
  }

  function renderSearch() {
    const input = $("[data-search-input]");
    const results = $("[data-search-results]");
    const count = $("[data-search-count]");
    if (!input || !results || !count) return;

    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q") || "";
    input.value = initialQuery;
    let timer;

    function performSearch(query) {
      const normalized = query.trim().toLowerCase();
      if (!normalized) {
        count.textContent = "输入关键词开始搜索";
        results.innerHTML = `
          <div class="state-box">
            <i data-lucide="search"></i>
            <h2>搜索文章</h2>
            <p>可以搜索标题、摘要、分类和标签。</p>
          </div>
        `;
        window.lucide?.createIcons();
        return;
      }

      results.innerHTML = `
        <div class="skeleton-list" aria-label="正在搜索">
          <div class="skeleton"></div>
          <div class="skeleton"></div>
          <div class="skeleton"></div>
        </div>
      `;

      window.setTimeout(() => {
        const matched = posts.filter((post) => {
          const haystack = [
            post.title,
            post.summary,
            post.category,
            ...post.tags
          ].join(" ").toLowerCase();
          return haystack.includes(normalized);
        });

        count.textContent = matched.length
          ? `找到 ${matched.length} 篇文章`
          : `没有找到与“${query.trim()}”相关的内容`;

        results.innerHTML = matched.length
          ? `<div class="post-grid">${matched.map((post) => renderPostCard(post)).join("")}</div>`
          : `
            <div class="state-box">
              <i data-lucide="search-x"></i>
              <h2>没有匹配结果</h2>
              <p>尝试搜索“游戏”“AI”“部署”或“视觉小说”。</p>
            </div>
          `;
        window.lucide?.createIcons();
      }, 260);
    }

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const query = input.value.trim();
        history.replaceState(null, "", query ? `search.html?q=${encodeURIComponent(query)}` : "search.html");
        performSearch(query);
      }, 260);
    });

    $("[data-search-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      performSearch(input.value);
    });

    performSearch(initialQuery);
  }

  async function renderArticle() {
    const root = $("[data-article-root]");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    let post = posts.find((item) => item.slug === slug);

    if (post && !post.content) {
      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(post.slug)}`);
        if (response.ok) post = (await response.json()).post;
      } catch {}
    }

    if (!post) {
      root.innerHTML = `
        <div class="state-box">
          <i data-lucide="file-question"></i>
          <h2>没有找到这篇文章</h2>
          <p>文章可能已移动或删除。</p>
          <a class="button secondary" href="${basePath}/archive.html">查看全部文章</a>
        </div>
      `;
      window.lucide?.createIcons();
      return;
    }

    const date = formatDate(post.date);
    document.title = `${post.title} · bydXun Lite`;
    $("[data-page-title]").textContent = post.title;
    $("[data-page-description]").setAttribute("content", post.summary);
    $("[data-article-category]").textContent = post.category;
    $("[data-article-category]").className = `article-category ${typeClass(post.type)}`;
    $("[data-article-title]").textContent = post.title;
    $("[data-article-summary]").textContent = post.summary;
    $("[data-article-author]").textContent = "bydXun Lite";
    $("[data-article-date]").textContent = date.full;
    $("[data-article-cover]").src = post.cover;
    $("[data-article-cover]").alt = post.title;
    $("[data-article-body]").innerHTML = post.content;
    $("[data-article-tags]").innerHTML = post.tags.map((tag) => `
      <a href="${basePath}/tags.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>
    `).join("");

    const breadcrumb = $("[data-article-breadcrumb]");
    if (breadcrumb) breadcrumb.textContent = post.title;

    const headings = $$("h2, h3", $("[data-article-body]"));
    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
    });

    const tocRoot = $("[data-article-toc]");
    const guideRoot = $("[data-article-guide]");
    const tocItems = headings.map((heading, index) => ({
      id: heading.id,
      text: heading.textContent.trim(),
      level: heading.tagName === "H3" ? 3 : 2,
      active: index === 0
    }));

    if (tocRoot) {
      tocRoot.innerHTML = tocItems.map((item) => `
        <a class="${item.active ? "active" : ""}" href="#${item.id}" data-section-link="${item.id}">${escapeHtml(item.text)}</a>
      `).join("");
    }

    if (guideRoot) {
      guideRoot.innerHTML = tocItems.map((item) => `
        <a class="${item.active ? "active" : ""}" href="#${item.id}" data-guide-link="${item.id}">${escapeHtml(item.text)}</a>
      `).join("");
    }

    initSectionObserver("h2[id], h3[id]", "[data-section-link], [data-guide-link]");
    initArticleActions(post);
    window.lucide?.createIcons();
  }

  function initArticleActions(post) {
    const bookmark = $("[data-bookmark]");
    if (bookmark) {
      const saved = JSON.parse(localStorage.getItem("erogame-bookmarks") || "[]");
      const isSaved = saved.includes(post.slug);
      bookmark.classList.toggle("active", isSaved);
      $("[data-bookmark-text]", bookmark).textContent = isSaved ? "已收藏" : "收藏";

      bookmark.addEventListener("click", () => {
        const next = new Set(JSON.parse(localStorage.getItem("erogame-bookmarks") || "[]"));
        if (next.has(post.slug)) next.delete(post.slug);
        else next.add(post.slug);
        localStorage.setItem("erogame-bookmarks", JSON.stringify([...next]));
        const active = next.has(post.slug);
        bookmark.classList.toggle("active", active);
        $("[data-bookmark-text]", bookmark).textContent = active ? "已收藏" : "收藏";
        showToast(active ? "已加入收藏" : "已取消收藏");
      });
    }

    $("[data-share]")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("文章链接已复制");
      } catch {
        showToast("复制失败，请手动复制地址栏链接");
      }
    });
  }

  function initSectionObserver(itemSelector, linkSelector) {
    const items = $$(itemSelector);
    const links = $$(linkSelector);
    if (!items.length || !links.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (!visible[0]) return;
      const id = visible[0].target.id || visible[0].target.dataset.yearGroup;
      links.forEach((link) => {
        const target = link.dataset.sectionLink || link.dataset.guideLink || link.dataset.yearLink;
        link.classList.toggle("active", target === id);
      });
    }, {
      rootMargin: "-24% 0px -64% 0px",
      threshold: 0
    });

    items.forEach((item) => observer.observe(item));
  }

  function initStaticAnchors() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href").slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function loadPostsFromApi() {
    try {
      const response = await fetch("/api/posts", {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.posts) && data.posts.length) {
        posts = data.posts;
      }
    } catch {}
  }

  async function initAdminEntry() {
    try {
      const response = await fetch("/api/admin/me", {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) return;
      const result = await response.json();
      const actions = $(".header-actions");
      if (!actions || $(".admin-entry", actions)) return;

      const link = document.createElement("a");
      link.className = "button secondary admin-entry";
      link.href = "admin.html";
      link.title = `管理员：${result.admin?.username || ""}`;
      link.innerHTML = '<i data-lucide="square-pen"></i>管理文章';

      const subscribe = $("[data-open-subscribe]", actions);
      actions.insertBefore(link, subscribe || null);
      window.lucide?.createIcons();
    } catch {}
  }

  async function init() {
    await loadPostsFromApi();
    await initAdminEntry();
    initNavigation();
    initScrollBehavior();
    renderHome();
    renderArchive();
    renderTags();
    renderSearch();
    await renderArticle();
    initStaticAnchors();
    window.lucide?.createIcons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
