const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const host = process.env.PREVIEW_HOST || "0.0.0.0";
const port = Number(process.env.PREVIEW_PORT || 4177);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const proxiedPhp = new Set([
  "/registrar_usuario.php",
  "/login.php",
  "/session.php",
  "/logout.php",
  "/oauth_start.php",
  "/oauth_callback.php",
  "/oauth_status.php"
]);

function proxyPhp(req, res, route) {
  const chunks = [];

  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const upstream = https.request(
      {
        hostname: "www.estadiasurbanas.com",
        path: route,
        method: req.method,
        headers: {
          "content-type": req.headers["content-type"] || "application/json",
          "content-length": body.length,
          "cookie": req.headers.cookie || ""
        }
      },
      (upstreamRes) => {
        const responseChunks = [];
        upstreamRes.on("data", (chunk) => responseChunks.push(chunk));
        upstreamRes.on("end", () => {
          const headers = {
            "content-type": upstreamRes.headers["content-type"] || "application/json; charset=utf-8",
            "cache-control": "no-store"
          };
          if (upstreamRes.headers.location) headers.location = upstreamRes.headers.location;
          if (upstreamRes.headers["set-cookie"]) headers["set-cookie"] = upstreamRes.headers["set-cookie"];

          res.writeHead(upstreamRes.statusCode || 502, {
            ...headers
          });
          res.end(Buffer.concat(responseChunks));
        });
      }
    );

    upstream.on("error", () => {
      res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "error", message: "No se pudo conectar con HostGator desde el preview." }));
    });

    upstream.end(body);
  });
}

http
  .createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const route = decodeURIComponent(requestUrl.pathname);
    if (proxiedPhp.has(route)) {
      proxyPhp(req, res, requestUrl.pathname + requestUrl.search);
      return;
    }

    const name = route === "/" ? "index.html" : route.replace(/^\/+/, "");
    const file = path.resolve(root, name);

    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream"
      });
      res.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Preview: http://${host}:${port}/`);
  });
