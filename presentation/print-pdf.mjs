/**
 * Print a presentation HTML deck to PDF via Chrome.
 * Usage:
 *   node presentation/print-pdf.mjs en
 *   node presentation/print-pdf.mjs ru
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const lang = (process.argv[2] || "en").toLowerCase();
const page = lang === "ru" ? "index.html" : "en.html";
const outName = lang === "ru" ? "SEJIRE-investor-deck.pdf" : "SEJIRE-investor-deck-en.pdf";
const outPath = join(__dirname, outName);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  return candidates.find((bin) => bin && existsSync(bin));
}

const chromeBin = resolveChrome();
if (!chromeBin) {
  console.error("Chrome not found. Set CHROME_PATH.");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const file = join(__dirname, rel);
  if (!file.startsWith(__dirname)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}/${page}?pdf`;

const args = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  "--no-pdf-header-footer",
  `--print-to-pdf=${outPath}`,
  "--virtual-time-budget=12000",
  url,
];

const child = spawn(chromeBin, args, { stdio: "inherit" });
const code = await new Promise((resolve) => child.on("exit", resolve));
server.close();
if (code !== 0) {
  console.error("Chrome print failed", code);
  process.exit(code || 1);
}
console.log("Wrote", outPath);
