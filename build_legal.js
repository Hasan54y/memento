// Generates privacy.html and terms.html from the app's LegalContent.kt so the website and the
// app always show identical wording. Run: node build_legal.js
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "../app/src/main/java/com/hmdevstudio/memento/ui/legal/LegalContent.kt"),
  "utf8"
);

const effective = source.match(/EFFECTIVE_DATE = "([^"]+)"/)[1];

/** Pulls LegalSection("heading", "body" + "body") calls out of one `val X = listOf(...)` block. */
function sections(name) {
  const start = source.indexOf(`val ${name} = listOf(`);
  const end = source.indexOf("\n)\n", start);
  const block = source.slice(start, end);
  const out = [];
  const callRe = /LegalSection\(([\s\S]*?)\)(?=,?\s*(?:LegalSection|$))/g;
  let m;
  while ((m = callRe.exec(block))) {
    const literals = [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) =>
      x[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
    );
    out.push({ heading: literals[0], body: literals.slice(1).join("") });
  }
  return out;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const linkify = (s) =>
  s
    .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>')
    .replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

function bodyHtml(body) {
  const lines = body.split("\n").filter(Boolean);
  if (lines.every((l) => l.startsWith("• "))) {
    return "<ul>" + lines.map((l) => `<li>${linkify(esc(l.slice(2)))}</li>`).join("") + "</ul>";
  }
  return lines.map((l) => `<p>${linkify(esc(l))}</p>`).join("");
}

function page(title, file, list, blurb) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Memento</title>
  <meta name="description" content="${blurb}">
  <meta name="theme-color" content="#000000">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <div class="glow" aria-hidden="true"><span></span><span></span><span></span></div>
  <header class="nav wrap">
    <div class="bar glass">
      <a class="brand" href="index.html"><img src="assets/logo.svg" alt="">Memento</a>
      <nav class="links">
        <a href="privacy.html">Privacy</a>
        <a href="terms.html">Terms</a>
      </nav>
      <a class="btn btn-primary btn-sm" href="index.html#download">Early access</a>
    </div>
  </header>
  <main class="wrap legal">
    <h1>${title}</h1>
    <p class="effective">Effective ${effective}</p>
${list.map((s) => `    <section class="glass"><h2>${esc(s.heading)}</h2>${bodyHtml(s.body)}</section>`).join("\n")}
  </main>
  <footer class="wrap">
    <div class="row">
      <a class="brand" href="index.html"><img src="assets/logo.svg" alt="">Memento</a>
      <nav>
        <a href="privacy.html">Privacy Policy</a>
        <a href="terms.html">Terms of Service</a>
        <a href="mailto:admin@mementoapp.online">admin@mementoapp.online</a>
      </nav>
      <span>© 2026 HM Dev Studio</span>
    </div>
  </footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(__dirname, file), html);
  console.log(`${file}: ${list.length} sections`);
}

page("Privacy Policy", "privacy.html", sections("PrivacySections"), "How Memento handles your account, documents, AI processing and backups.");
page("Terms of Service", "terms.html", sections("TermsSections"), "The terms for using the Memento app.");
