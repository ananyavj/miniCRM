// src/home.ts
// The page shown at GET /, so a visitor sees what MiniCRM is instead of a 404.
// It's plain HTML in a string: no template engine, no build step, no files to serve.
export const homePage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MiniCRM API</title>
<style>
  :root { --bg: #0f1115; --card: #171a21; --text: #e8eaed; --muted: #9aa0a6; --accent: #7c9cff; --ok: #3ccf91; --bad: #ff6b6b; --line: #262a33; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 48px 20px 64px; }
  h1 { font-size: 2.4rem; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 { font-size: 1.15rem; margin: 40px 0 12px; color: var(--accent); }
  p { margin: 0 0 12px; }
  .lead { color: var(--muted); font-size: 1.1rem; margin-bottom: 20px; }
  .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; font-size: 0.9rem; color: var(--muted); }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
  .card strong { display: block; margin-bottom: 4px; }
  .card span { color: var(--muted); font-size: 0.95rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.93rem; }
  td { padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  td:first-child { white-space: nowrap; }
  code { font-family: ui-monospace, Consolas, monospace; font-size: 0.88rem; color: var(--text); }
  .method { display: inline-block; min-width: 54px; font-weight: 600; color: var(--accent); }
  .tag { display: inline-block; padding: 1px 8px; margin: 3px 4px 3px 0; border: 1px solid var(--line); border-radius: 999px; font-size: 0.85rem; color: var(--muted); }
  a { color: var(--accent); }
  footer { margin-top: 48px; color: var(--muted); font-size: 0.9rem; }
</style>
</head>
<body>
<main>
  <h1>MiniCRM</h1>
  <p class="lead">A multi-tenant CRM backend: organizations manage leads, contacts, deals, activity and reminders, with every request authenticated and every record isolated to its own organization.</p>
  <span class="status"><span class="dot" id="dot"></span><span id="status">Checking the database...</span></span>

  <h2>What it does</h2>
  <div class="grid">
    <div class="card"><strong>Multi-tenant by design</strong><span>Every query is scoped to the caller's organization. Another organization's records always return 404.</span></div>
    <div class="card"><strong>Accounts and JWT auth</strong><span>bcrypt-hashed passwords, signed access tokens, and a database check on every request.</span></div>
    <div class="card"><strong>Roles</strong><span>Owners and members. Only owners delete records, add members or change roles; the last owner can't step down.</span></div>
    <div class="card"><strong>Leads, contacts, deals</strong><span>Search, filters, sorting and pagination; deal stages that can only move forward.</span></div>
    <div class="card"><strong>History and activity</strong><span>Every status change is recorded in the same transaction; calls, emails and notes are logged per lead.</span></div>
    <div class="card"><strong>Reminders</strong><span>Timezone-safe due dates and a background worker that sends due reminders exactly once.</span></div>
  </div>

  <h2>Try it</h2>
  <p>This is an API, so it's used by programs rather than in a browser. Every endpoint except the ones below needs <code>Authorization: Bearer &lt;token&gt;</code> from <code>/auth/login</code>.</p>
  <table>
    <tr><td><span class="method">GET</span><code><a href="/health">/health</a></code></td><td>Is the server up?</td></tr>
    <tr><td><span class="method">GET</span><code><a href="/health/db">/health/db</a></code></td><td>Can it reach the database?</td></tr>
    <tr><td><span class="method">POST</span><code>/auth/register</code></td><td>Create an organization and its owner</td></tr>
    <tr><td><span class="method">POST</span><code>/auth/login</code></td><td>Get an access token</td></tr>
    <tr><td><span class="method">GET</span><code>/leads?q=&amp;status=&amp;sort=&amp;page=</code></td><td>Search, filter, sort and page through leads</td></tr>
    <tr><td><span class="method">*</span><code>/leads/:id/contacts | deals | activities | reminders | history</code></td><td>Everything attached to a lead</td></tr>
    <tr><td><span class="method">*</span><code>/users</code></td><td>Members and roles (owners only for changes)</td></tr>
  </table>

  <h2>Built with</h2>
  <span class="tag">TypeScript</span><span class="tag">Node.js</span><span class="tag">Express 5</span><span class="tag">PostgreSQL</span><span class="tag">Zod</span><span class="tag">JWT</span><span class="tag">bcrypt</span><span class="tag">Vitest + Supertest</span><span class="tag">Render</span><span class="tag">Neon</span>

  <footer>Source, architecture and setup: <a href="https://github.com/ananyavj/miniCRM">github.com/ananyavj/miniCRM</a></footer>
</main>
<script>
  fetch("/health/db")
    .then(function (response) { return response.ok; })
    .catch(function () { return false; })
    .then(function (ok) {
      document.getElementById("dot").style.background = ok ? "var(--ok)" : "var(--bad)";
      document.getElementById("status").textContent = ok ? "Live: API and database are up" : "Database unavailable right now";
    });
</script>
</body>
</html>`;
