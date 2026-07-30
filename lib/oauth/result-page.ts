import { NextResponse } from "next/server";

/**
 * Shared success/failure page for OAuth consent callbacks (/oauth/... routes).
 * The visitor is a church admin landing back from a provider's consent screen,
 * so this is a plain, dependency-free HTML page — not part of the app shell.
 */
export function resultPage(ok: boolean, title: string, message: string) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Disciple Studio</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #0c0a09; color: #fafaf9;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { max-width: 26rem; margin: 1.5rem; padding: 2.5rem 2.25rem; text-align: center;
          background: #1c1917; border: 1px solid #292524; border-radius: 1rem; }
  .badge { width: 3rem; height: 3rem; margin: 0 auto 1.25rem; display: grid; place-items: center;
           border-radius: 9999px; font-size: 1.4rem;
           background: ${ok ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)"};
           color: ${ok ? "#34d399" : "#f87171"}; }
  h1 { font-size: 1.15rem; margin: 0 0 .6rem; }
  p { font-size: .92rem; line-height: 1.55; color: #a8a29e; margin: 0; }
  .brand { margin-top: 1.75rem; font-size: .75rem; letter-spacing: .08em;
           text-transform: uppercase; color: #57534e; }
</style>
</head>
<body>
  <main class="card">
    <div class="badge">${ok ? "✓" : "✕"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">Disciple Studio</div>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
