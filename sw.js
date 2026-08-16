const CACHE_NAME = "planner-notebook-v32-paper-only-calendar";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260816-paper-only-calendar",
  "./app.js",
  "./xlsx-export.js",
  "./config.js",
  "./plan-data.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      }),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const networkFirst =
    event.request.mode === "navigate" ||
    url.pathname === "/" ||
    ["index.html", "styles.css", "app.js", "config.js", "plan-data.js", "sw.js"].some((asset) =>
      url.pathname.endsWith(asset),
    );
  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
