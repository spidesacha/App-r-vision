var C = "revisions-v1", F = ["./", "index.html", "css/style.css", "js/store.js", "js/quiz.js", "js/app.js", "data.js", "manifest.json", "icon.svg"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(C).then(function (c) { return c.addAll(F); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== C; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(function (r) {
    var net = fetch(e.request).then(function (n) { var cp = n.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); return n; }).catch(function () { return r; });
    return r || net;
  }));
});
