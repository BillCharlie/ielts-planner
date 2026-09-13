const CACHE_NAME = "planner-notebook-v68-replan-0914";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260913-replan-0914",
  "./app.js?v=20260913-replan-0914",
  "./planning-tasks.js?v=20260913-replan-0914",
  "./ielts-moves.js?v=20260913-replan-0914",
  "./xlsx-export.js",
  "./config.js",
  "./plan-data.js?v=20260913-replan-0914",
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
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const networkFirst =
    event.request.mode === "navigate" ||
    url.pathname === "/" ||
    ["index.html", "styles.css", "app.js", "planning-tasks.js", "config.js", "plan-data.js", "sw.js"].some((asset) =>
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
