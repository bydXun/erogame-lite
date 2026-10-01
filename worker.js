async function proxyGithub(request, target) {
  const response = await fetch(target, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "EroGame-Lite-Editor"
    },
    body: await request.text()
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/editor" || url.pathname === "/editor/") {
      const assetUrl = new URL("/editor.html", url);
      assetUrl.search = url.search;
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    if (url.pathname === "/api/github/device/code" && request.method === "POST") {
      return proxyGithub(request, "https://github.com/login/device/code");
    }

    if (url.pathname === "/api/github/device/token" && request.method === "POST") {
      return proxyGithub(request, "https://github.com/login/oauth/access_token");
    }

    return env.ASSETS.fetch(request);
  }
};
