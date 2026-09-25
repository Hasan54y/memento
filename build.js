// Builds the whole mementoapp.online site: one HTML file per page, served by GitHub Pages at a
// clean slug (features.html -> /features). Privacy and Terms text comes from the app's
// LegalContent.kt so the app and the website always say the same thing.
// Run: node build.js
const fs = require("fs");
const path = require("path");

const SITE = "https://mementoapp.online";
const EMAIL = "admin@mementoapp.online";
const TRUSTPILOT_WRITE = "https://www.trustpilot.com/evaluate/mementoapp.online";
const TRUSTPILOT_READ = "https://www.trustpilot.com/review/mementoapp.online";
const EARLY_ACCESS = `mailto:${EMAIL}?subject=Memento%20early%20access&amp;body=Hi!%20I%27d%20like%20to%20try%20Memento%20when%20it%27s%20available.`;
const TODAY = new Date().toISOString().slice(0, 10);

const C = { green: "#1fe05a", mint: "#2dd4bf", sky: "#5ab8ff", amber: "#ffb547", violet: "#a78bfa", coral: "#ff6b6b" };

// ---------- Small building blocks ----------
const icon = (name, cls = "") => `<span class="ms${cls ? " " + cls : ""}" aria-hidden="true">${name}</span>`;

function card({ icon: i, color = C.green, title, text, href, id }) {
  const tag = href ? "a" : "article";
  const attrs = `${href ? ` href="${href}"` : ""}${id ? ` id="${id}"` : ""}`;
  return `<${tag} class="card glass spot reveal"${attrs}><div class="icon" style="--c:${color}">${icon(i)}</div><h3>${title}</h3><p>${text}</p></${tag}>`;
}

const shot = (img, alt, extra = "") =>
  `<div class="shot tilt${extra ? " " + extra : ""}"><img src="/assets/${img}" alt="${alt}" loading="lazy" width="540" height="1200"></div>`;

function showcase({ id, tag, title, text, bullets = [], img, alt, flip, more, scan }) {
  return `<div class="showcase${flip ? " flip" : ""}"${id ? ` id="${id}"` : ""}>
      <div class="text reveal">
        <span class="tag">${tag}</span>
        <h2>${title}</h2>
        <p>${text}</p>
        ${bullets.length ? `<ul class="checks">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
        ${more ? `<a class="more" href="${more[0]}">${more[1]}</a>` : ""}
      </div>
      <div class="reveal">${shot(img, alt, scan ? "scan" : "")}</div>
    </div>`;
}

function pageHero({ eyebrow, eyebrowIcon = "auto_awesome", title, lead, cta = "", badge = "" }) {
  return `<div class="page-hero">
      <div class="reveal">${badge || `<span class="eyebrow">${icon(eyebrowIcon)} ${eyebrow}</span>`}</div>
      <h1 class="reveal">${title}</h1>
      <p class="lead reveal">${lead}</p>
      ${cta ? `<div class="cta reveal">${cta}</div>` : ""}
    </div>`;
}

const btn = (href, label, kind = "primary", ic = "", extra = "") =>
  `<a class="btn btn-${kind}" href="${href}"${extra}>${ic ? icon(ic) : ""}${label}</a>`;

function ctaBand(title = "Ready when your paperwork is.", text = "Memento is coming to Google Play. Get early access and we'll tell you the moment it's ready.") {
  return `<section><div class="cta-band glass spot reveal">
      <h2>${title}</h2>
      <p>${text}</p>
      <div class="cta">${btn("/download", "Get the app", "primary", "rocket_launch")}${btn("/features", "Explore features", "ghost")}</div>
    </div></section>`;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- Layout ----------
const NAV = [
  ["features", "Features", "auto_awesome"],
  ["how-it-works", "How it works", "tips_and_updates"],
  ["backup", "Backup", "add_to_drive"],
  ["reviews", "Reviews", "rate_review"],
  ["faq", "FAQ", "help"],
  ["contact", "Contact", "mail"],
];
const MOBILE_EXTRA = [["about", "About", "info"], ["download", "Get the app", "rocket_launch"]];

function layout({ slug, title, description, body }) {
  const url = slug === "index" ? `${SITE}/` : `${SITE}/${slug}`;
  const fullTitle = slug === "index" ? "Memento — More than a notepad. Your paperwork, remembered." : `${title} — Memento`;
  const link = ([s, label, ic], mobile) =>
    `<a href="/${s}"${s === slug ? ' class="active" aria-current="page"' : ""}>${mobile ? icon(ic) : ""}${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#000000">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Memento">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/assets/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="__ICON_FONT__" rel="stylesheet">
  <link rel="stylesheet" href="/assets/site.css">
  <script src="/assets/site.js" defer></script>
  <script src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" async></script>
</head>
<body>
  <div class="progress" aria-hidden="true"></div>
  <div class="glow" aria-hidden="true"><span></span><span></span><span></span></div>
  <header class="nav wrap">
    <div class="bar glass">
      <a class="brand" href="/"><img src="/assets/logo.svg" alt="" width="26" height="27">Memento</a>
      <nav class="links" aria-label="Main">${NAV.map((n) => link(n)).join("")}</nav>
      ${btn("/download", "Get the app", "primary", "", ' style="min-height:40px;padding:0 16px;font-size:14px"')}
      <button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false">${icon("menu", "open")}${icon("close", "close")}</button>
    </div>
    <nav class="mobile-nav glass" aria-label="Mobile">${[...NAV, ...MOBILE_EXTRA].map((n) => link(n, true)).join("")}</nav>
  </header>
  <main class="wrap">
${body}
  </main>
  <footer class="wrap">
    <div class="cols">
      <div>
        <a class="brand" href="/"><img src="/assets/logo.svg" alt="" width="26" height="27">Memento</a>
        <p class="tagline">More than a notepad. Your paperwork, remembered.</p>
      </div>
      <div><h4>Product</h4><a href="/features">Features</a><a href="/how-it-works">How it works</a><a href="/backup">Google Drive backup</a><a href="/download">Get the app</a></div>
      <div><h4>Company</h4><a href="/about">About</a><a href="/reviews">Reviews</a><a href="/faq">FAQ</a><a href="/contact">Contact</a></div>
      <div><h4>Legal</h4><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/delete-account">Delete account</a><a href="${TRUSTPILOT_READ}" target="_blank" rel="noopener">Trustpilot</a></div>
    </div>
    <div class="bottom">
      <span>© <span id="year">2026</span> HM Dev Studio</span>
      <a href="mailto:${EMAIL}">${EMAIL}</a>
    </div>
  </footer>
</body>
</html>
`;
}

// ---------- Pages ----------
const pages = [];
const page = (slug, title, description, body) => pages.push({ slug, title, description, body });

const DOC_TYPES = [
  ["receipt_long", "Purchase receipts", C.green],
  ["verified_user", "Warranties", C.mint],
  ["request_quote", "Bills", C.amber],
  ["flight", "Travel tickets", C.sky],
  ["workspace_premium", "Certificates", C.violet],
  ["badge", "ID cards", C.coral],
  ["contact_page", "Contacts & addresses", C.mint],
  ["category", "Anything else", C.sky],
];
const chip = ([i, label, color]) => `<span class="chip glass" style="--c:${color}">${icon(i)}${label}</span>`;

// Home
page("index", "Home",
  "Memento captures receipts, warranties, bills and IDs, reads them with AI, reminds you before dates expire and backs everything up to your Google Drive.",
  `    <div class="hero">
      <div>
        <span class="eyebrow reveal">${icon("edit_note")} More than a notepad</span>
        <h1 class="reveal">Capture anything.<br><em>Find it forever.</em></h1>
        <p class="lead reveal">Snap a <span class="rotator" data-words="receipt,warranty card,bill,boarding pass,ID card,certificate">receipt</span>. Memento reads it with AI, organizes the details for you, reminds you before dates expire, and keeps it all backed up in your own Google Drive.</p>
        <div class="cta reveal">${btn("/download", "Get early access", "primary", "rocket_launch")}${btn("/how-it-works", "See how it works", "ghost", "play_circle")}</div>
        <div class="meta reveal"><span>Free</span><span>No ads</span><span>Android 8.0+</span><span>Google Play soon</span></div>
      </div>
      <div class="phones reveal" aria-hidden="true">
        <div class="phone back"><img src="/assets/screen-detail.png" alt="" width="540" height="1200"></div>
        <div class="phone front"><img src="/assets/screen-home.png" alt="" width="540" height="1200"></div>
      </div>
    </div>

    <div class="marquee reveal" aria-label="Documents Memento understands">
      <div class="track">${[...DOC_TYPES, ...DOC_TYPES].map(chip).join("")}</div>
    </div>

    <section>
      <div class="section-head reveal"><h2>Your paperwork, <em>handled.</em></h2><p>Traditional apps make you organize. Memento does the organizing for you.</p></div>
      <div class="grid">
        ${card({ icon: "document_scanner", title: "Scan in seconds", text: "Use the in-app camera or import photos. Add as many pages as a document needs.", href: "/features#capture" })}
        ${card({ icon: "auto_awesome", color: C.mint, title: "AI fills in the details", text: "Store, price, dates, warranty, ID numbers — extracted automatically. You just review.", href: "/how-it-works" })}
        ${card({ icon: "notifications_active", color: C.amber, title: "Reminders that matter", text: "Get notified before warranties, bills and passports expire, even when the app is closed.", href: "/features#reminders" })}
        ${card({ icon: "search", color: C.sky, title: "Find anything", text: "Search every title, detail and note, and filter by category in a tap.", href: "/features#search" })}
        ${card({ icon: "add_to_drive", color: C.violet, title: "Private Drive backup", text: "Back up to your own Google Drive and restore everything on a new phone.", href: "/backup" })}
        ${card({ icon: "file_save", color: C.coral, title: "Save as PDF, Excel, TXT", text: "Export any document as a PDF, spreadsheet, text file, or images to your gallery.", href: "/features#export" })}
      </div>
    </section>

    <section>
      <div class="stats">
        <div class="stat glass spot reveal"><div class="num" data-count="8">8</div><div class="label">document categories</div></div>
        <div class="stat glass spot reveal"><div class="num" data-count="6">6</div><div class="label">reminder timings</div></div>
        <div class="stat glass spot reveal"><div class="num" data-count="4">4</div><div class="label">ways to save a file</div></div>
        <div class="stat glass spot reveal"><div class="num" data-count="0">0</div><div class="label">ads, ever</div></div>
      </div>
    </section>

    <section>
      <div class="section-head reveal"><h2>A quick look</h2><p>A clean, premium design that stays out of your way — in dark and light.</p></div>
      <div class="strip">
        <figure class="reveal">${shot("screen-home.png", "Memento home screen")}<figcaption>Everything at a glance</figcaption></figure>
        <figure class="reveal">${shot("screen-ai.png", "AI filling in a receipt", "scan")}<figcaption>AI reads the document</figcaption></figure>
        <figure class="reveal">${shot("screen-search.png", "Searching saved documents")}<figcaption>Find it in seconds</figcaption></figure>
      </div>
    </section>

    <section>
      <div class="section-head reveal"><h2>How it works</h2></div>
      <div class="steps">
        <div class="step glass spot reveal">${icon("add_a_photo", "step-icon")}<h3>Capture</h3><p>Tap the + button and scan a document or import photos.</p></div>
        <div class="step glass spot reveal">${icon("auto_awesome", "step-icon")}<h3>Let AI read it</h3><p>Memento fills in the category, title, details and important dates. Review and save.</p></div>
        <div class="step glass spot reveal">${icon("self_improvement", "step-icon")}<h3>Relax</h3><p>Search anytime, get reminded before deadlines, and keep it all backed up.</p></div>
      </div>
      <a class="more reveal" href="/how-it-works">Learn how it works</a>
    </section>

    <section>
      <div class="band glass spot reveal">
        <div><h2>Your data stays yours.</h2><p>Documents live on your phone. Photos go to Google's Gemini AI only to read them for you. Backups go to your own Google Drive, and Memento can only see the backup file it creates.</p></div>
        <div class="cta">${btn("/backup", "About backups", "ghost", "add_to_drive")}${btn("/privacy", "Privacy Policy", "ghost", "policy")}</div>
      </div>
    </section>

    <section>
      <div class="band glass spot reveal">
        <div><div class="stars" aria-hidden="true">${icon("star", "fill").repeat(5)}</div><h2>Love Memento? Tell the world.</h2><p>Your review on Trustpilot helps other people discover Memento and helps us improve it.</p></div>
        <div class="cta" style="min-width:230px"><div class="trustpilot-widget" data-locale="en-US" data-template-id="56278e9abfbbba0bdcd568bc" data-businessunit-id="6ab5020f20b30165e430b08f" data-style-height="52px" data-style-width="100%" data-token="eab3e8b8-be97-44ea-b1a7-c9f49fda1ae9"><a href="https://www.trustpilot.com/review/mementoapp.online" target="_blank" rel="noopener">Trustpilot</a></div></div>
      </div>
    </section>
${ctaBand()}`);

// Features
page("features", "Features",
  "Everything Memento does: AI document capture, multi-page scanning, reminders, search, rich notes, PDF/Excel/TXT export, Google Drive backup and dark mode.",
  `    ${pageHero({ eyebrow: "Features", title: "Everything your paperwork <em>needs.</em>", lead: "Memento turns photos of documents into organized, searchable information — then keeps an eye on the dates for you." })}

    ${showcase({ id: "capture", tag: "Capture + AI", title: "Snap it. AI fills in the rest.", text: "Scan with the built-in camera or import from your gallery. Memento's AI reads every page together and fills in the category, title, details and the date that matters.", bullets: ["Multi-page documents — add as many pages as you need", "Import up to 10 photos at once", "Suggests an important date and a reminder", "Tap “Read again” if a photo was blurry — or edit anything yourself"], img: "screen-ai.png", alt: "AI-filled receipt in Memento", scan: true })}

    ${showcase({ id: "details", tag: "Documents", title: "Every detail at a glance.", text: "Each document gets a clean page: swipe through its pages, zoom in, copy any field with a tap, star favorites, edit, share or delete.", bullets: ["Full-screen zoom with pinch and double-tap", "Tap to copy numbers, addresses and IDs", "Countdown to the important date"], img: "screen-detail.png", alt: "Document details in Memento", flip: true })}

    ${showcase({ id: "search", tag: "Search", title: "Find anything in seconds.", text: "Search reads titles, every extracted detail and your notes. Filter by category to narrow it down instantly.", bullets: ["Search documents and notes together", "Quick filters by category", "Suggestions to get you started"], img: "screen-search.png", alt: "Search results in Memento" })}

    ${showcase({ id: "export", tag: "Save as files", title: "PDF, Excel, TXT or images.", text: "Need a copy for an insurance claim or your accountant? Save any document to your phone in the format that fits.", bullets: ["PDF with a summary page plus every scanned page", "Excel spreadsheet (.xlsx) of all the details", "Plain text you can open anywhere", "Page images straight to your Gallery", "Export all documents as one spreadsheet"], img: "screen-export.png", alt: "Save document sheet in Memento", flip: true })}

    ${showcase({ id: "backup", tag: "Google Drive backup", title: "Backed up to your own Drive.", text: "Keep a private backup in your Google Drive and restore everything on a new phone. Memento can only see the backup file it creates.", bullets: ["One tap to back up or restore", "Optional automatic backup overnight on Wi-Fi"], img: "screen-backup.png", alt: "Google Drive backup in Memento", more: ["/backup", "How backup works"] })}

    ${showcase({ id: "themes", tag: "Design", title: "Beautiful day and night.", text: "A clean, modern look with glass surfaces and smooth animations. Follows your phone's theme, or pick light or dark yourself.", bullets: ["Dark, light or system theme", "Full-screen, edge-to-edge design", "Choose a preset avatar for your profile"], img: "screen-light.png", alt: "Memento in light mode", flip: true })}

    <section>
      <div class="section-head reveal"><h2>And there's more.</h2></div>
      <div class="grid">
        ${card({ id: "reminders", icon: "notifications_active", color: C.amber, title: "Smart reminders", text: "On the day, or 1, 3, 7, 14 or 30 days before — your choice. They arrive even when the app is closed." })}
        ${card({ id: "notes", icon: "edit_note", color: C.mint, title: "Rich notes", text: "Bold, italic, lists, headings, colors and highlights. Pin notes, color them and share them." })}
        ${card({ icon: "category", color: C.sky, title: "8 categories", text: "Receipts, warranties, bills, travel, certificates, IDs, contacts and everything else." })}
        ${card({ icon: "star", color: C.amber, title: "Favorites", text: "Star the documents you reach for most and find them in one place." })}
        ${card({ icon: "manage_accounts", color: C.violet, title: "Your account, your control", text: "Email verification, password change and account deletion, all in the app." })}
        ${card({ icon: "lock", color: C.green, title: "Private by design", text: "Documents live on your phone in Memento's private storage. No ads, no trackers." })}
      </div>
    </section>
${ctaBand("See it for yourself.")}`);

// How it works
page("how-it-works", "How it works",
  "How Memento works: capture a document, let AI read it, review the details, and get reminded before important dates.",
  `    ${pageHero({ eyebrow: "How it works", eyebrowIcon: "tips_and_updates", title: "From photo to <em>organized</em> in seconds.", lead: "No typing, no folders, no spreadsheets. Here's what happens when you add something to Memento." })}

    <section>
      <div class="steps four">
        <div class="step glass spot reveal">${icon("login", "step-icon")}<h3>Sign in</h3><p>Create an account with email or continue with Google. Your documents stay tied to you.</p></div>
        <div class="step glass spot reveal">${icon("add_a_photo", "step-icon")}<h3>Capture</h3><p>Tap +, then scan with the camera, import photos, or write a note.</p></div>
        <div class="step glass spot reveal">${icon("auto_awesome", "step-icon")}<h3>AI reads it</h3><p>The details are filled in for you. Check them, change anything, and save.</p></div>
        <div class="step glass spot reveal">${icon("notifications_active", "step-icon")}<h3>Stay ahead</h3><p>Search anytime, get reminded before dates, and keep it backed up.</p></div>
      </div>
    </section>

    ${showcase({ tag: "The AI part", title: "Watch it read the page.", text: "Memento sends your page photos to Google's Gemini AI through Firebase, which reads all the pages together — like a person skimming the document — and returns the details in a structured form.", bullets: ["Picks the right category automatically", "Pulls out store, product, price, numbers and dates", "Suggests the date worth a reminder", "Everything stays editable — you're always in control"], img: "screen-ai.png", alt: "AI reading a receipt", scan: true })}

    <section>
      <div class="section-head reveal"><h2>Tips for the best results</h2><p>Clear photos mean better answers.</p></div>
      <div class="grid">
        ${card({ icon: "wb_sunny", color: C.amber, title: "Good light", text: "Daylight or a bright room. Avoid harsh shadows and glare on glossy paper." })}
        ${card({ icon: "crop_free", color: C.sky, title: "Whole page in frame", text: "Keep all four corners visible so nothing important is cut off." })}
        ${card({ icon: "straighten", color: C.mint, title: "Flat and steady", text: "Lay the document flat and hold the phone parallel to it." })}
        ${card({ icon: "auto_stories", color: C.violet, title: "One item, many pages", text: "Add every page of the same document to one item — AI reads them together." })}
        ${card({ icon: "refresh", color: C.green, title: "Read again", text: "Blurry result? Retake the photo and tap “Read again”." })}
        ${card({ icon: "fact_check", color: C.coral, title: "Double-check key numbers", text: "AI is very good, but always compare important numbers and dates with the original." })}
      </div>
    </section>

    <section>
      <div class="band glass spot reveal">
        <div><h2>What happens to your photos?</h2><p>They're stored in Memento's private storage on your phone. They're sent to Gemini only to read them for you — never for advertising, and never to train models.</p></div>
        <div class="cta">${btn("/privacy", "Privacy Policy", "ghost", "policy")}</div>
      </div>
    </section>
${ctaBand()}`);

// Backup
page("backup", "Google Drive backup",
  "Memento backs up your documents, page photos and notes to your own Google Drive. Restore everything on a new phone in one tap.",
  `    ${pageHero({ eyebrow: "Google Drive backup", eyebrowIcon: "add_to_drive", title: "Your memory, <em>safe</em> in your Drive.", lead: "Phones get lost, broken and replaced. Your documents shouldn't go with them." })}

    ${showcase({ tag: "Private by design", title: "It lives in your Drive — not ours.", text: "Memento saves one backup file, “Memento backup.zip”, to your own Google Drive. It uses Google's most limited Drive permission, so Memento can only see files it created — never the rest of your Drive.", bullets: ["No Memento server stores your documents", "Back up or restore any time with one tap", "Optional automatic backup overnight on Wi-Fi"], img: "screen-backup.png", alt: "Google Drive backup screen", flip: true })}

    <section>
      <div class="section-head reveal"><h2>What's in a backup</h2></div>
      <div class="grid">
        ${card({ icon: "description", title: "Documents & details", text: "Every document with its category, title, extracted details, dates and reminders." })}
        ${card({ icon: "image", color: C.sky, title: "Page photos", text: "All the scanned pages, so documents look exactly the same after a restore." })}
        ${card({ icon: "edit_note", color: C.mint, title: "Notes", text: "Your notes with their formatting, colors and pins." })}
      </div>
    </section>

    <section>
      <div class="section-head reveal"><h2>Restore on a new phone</h2></div>
      <div class="steps">
        <div class="step glass spot reveal">${icon("download", "step-icon")}<h3>Install Memento</h3><p>Get the app on your new phone.</p></div>
        <div class="step glass spot reveal">${icon("login", "step-icon")}<h3>Sign in</h3><p>Use the same Memento account as before.</p></div>
        <div class="step glass spot reveal">${icon("settings_backup_restore", "step-icon")}<h3>Restore</h3><p>Profile → Backup &amp; restore → Restore. Pick the same Google account.</p></div>
      </div>
    </section>

    <section>
      <div class="section-head reveal"><h2>Good to know</h2></div>
      <div class="grid two">
        ${card({ icon: "wifi", color: C.sky, title: "Automatic backups", text: "Turn on daily backups and Memento runs them overnight on Wi-Fi after your first backup." })}
        ${card({ icon: "visibility_off", color: C.violet, title: "Limited access", text: "Memento only sees the backup file it created — not your other files." })}
        ${card({ icon: "delete", color: C.coral, title: "Delete it any time", text: "The backup is a normal file in your Drive. Delete it whenever you like." })}
        ${card({ icon: "key", color: C.amber, title: "Revoke access", text: "Remove Memento's Drive access at any time from your Google Account settings." })}
      </div>
    </section>
${ctaBand("Never start from zero again.")}`);

// Reviews
page("reviews", "Reviews",
  "Review Memento on Trustpilot, rate it on Google Play, or send feedback straight from the app.",
  `    ${pageHero({ eyebrow: "Reviews", eyebrowIcon: "rate_review", title: "Tell the world what you <em>think.</em>", lead: "Honest reviews help other people decide and help us build a better Memento." })}

    <section>
      <div class="grid">
        <article class="card glass spot reveal"><div class="icon" style="--c:#00b67a">${icon("star")}</div><h3>Trustpilot</h3><p>Share your experience publicly on Trustpilot.</p><div style="margin-top:18px"><div class="trustpilot-widget" data-locale="en-US" data-template-id="56278e9abfbbba0bdcd568bc" data-businessunit-id="6ab5020f20b30165e430b08f" data-style-height="52px" data-style-width="100%" data-token="eab3e8b8-be97-44ea-b1a7-c9f49fda1ae9"><a href="https://www.trustpilot.com/review/mementoapp.online" target="_blank" rel="noopener">Trustpilot</a></div></div><div class="cta" style="margin-top:14px">${btn(TRUSTPILOT_READ, "Read reviews", "ghost", "", ' target="_blank" rel="noopener"')}</div></article>
        <article class="card glass spot reveal"><div class="icon" style="--c:${C.green}">${icon("shop")}</div><h3>Google Play</h3><p>Rate Memento on the Play Store once it's published.</p><div style="margin-top:18px"><span class="badge-soon">${icon("schedule")} Coming soon</span></div></article>
        <article class="card glass spot reveal"><div class="icon" style="--c:${C.mint}">${icon("forum")}</div><h3>In the app</h3><p>Profile → Send feedback. Rate with stars and tell us what to improve.</p><a class="more" href="/contact">Or contact us</a></article>
      </div>
    </section>

    ${showcase({ tag: "Feedback", title: "Straight from the app.", text: "Everything you need is in your Profile: send feedback, contact us, rate on Google Play or review on Trustpilot.", bullets: ["Star rating and a message in one place", "Your app version is included so we can help faster"], img: "screen-profile.png", alt: "Help and feedback in Memento's profile", flip: true })}
${ctaBand()}`);

// FAQ
const faq = (q, a) => `<details class="glass reveal"><summary>${q}</summary><p>${a}</p></details>`;
page("faq", "FAQ",
  "Answers about Memento: pricing, accounts, AI accuracy, privacy, Google Drive backup, reminders and exporting.",
  `    ${pageHero({ eyebrow: "FAQ", eyebrowIcon: "help", title: "Questions, <em>answered.</em>", lead: `Can't find what you're looking for? <a href="/contact">Contact us</a>.` })}
    <div class="faq">
      <div class="faq-group"><h2 class="reveal">General</h2>
        ${faq("Is Memento free?", "Yes. Memento is free to download and use, with no ads.")}
        ${faq("Which phones does it work on?", "Android phones running Android 8.0 or newer.")}
        ${faq("When can I get it?", `Memento is coming to Google Play soon. <a href="/download">Get early access</a> and we'll let you know as soon as it's available.`)}
        ${faq("Does it work offline?", "You can browse, search and edit what you've saved without internet. Reading new documents with AI and backing up need a connection.")}
      </div>
      <div class="faq-group"><h2 class="reveal">Account</h2>
        ${faq("Do I need an account?", "Yes — sign in with email or Google inside the app so your documents stay tied to you and can be backed up and restored. This website doesn't need any sign-in.")}
        ${faq("What do I need to sign up with email?", "Your full name, email, age, gender, country and a password. You must be at least 13.")}
        ${faq("Can I delete my account?", "Yes: Profile → Account settings → Delete account. It removes your sign-in and every document and note stored on that phone. Google Drive backups are kept until you delete them.")}
      </div>
      <div class="faq-group"><h2 class="reveal">AI</h2>
        ${faq("What can the AI read?", "Receipts, warranty cards, bills, tickets and boarding passes, certificates, ID cards, business cards and addresses — plus most other printed documents.")}
        ${faq("How accurate is it?", "Very good for clear photos, but always double-check important numbers and dates against the original. You can edit anything it fills in.")}
        ${faq("Is my data used to train AI?", "No. Your photos are sent to Google's Gemini AI only to read them for you — not for advertising and not to train models.")}
      </div>
      <div class="faq-group"><h2 class="reveal">Privacy &amp; backup</h2>
        ${faq("Where are my documents stored?", "On your phone, in Memento's private storage. If you turn on backup, a copy goes to your own Google Drive.")}
        ${faq("Can Memento see my Google Drive?", "No. It uses Google's limited “drive.file” permission, so it can only see the backup file it created.")}
        ${faq("How do I move to a new phone?", `Install Memento, sign in with the same account, then Profile → Backup &amp; restore → Restore. <a href="/backup">More about backups</a>.`)}
      </div>
      <div class="faq-group"><h2 class="reveal">Reminders &amp; files</h2>
        ${faq("When do reminders arrive?", "You choose: on the day, or 1, 3, 7, 14 or 30 days before. They're delivered even when the app is closed.")}
        ${faq("Can I save documents as files?", "Yes — as a PDF, an Excel spreadsheet (.xlsx), a text file, or page images in your Gallery. Notes can be saved as PDF or text.")}
        ${faq("How do I contact you?", `Email <a href="mailto:${EMAIL}">${EMAIL}</a>, use the <a href="/contact">contact form</a>, or send feedback from Profile → Send feedback in the app.`)}
      </div>
    </div>
${ctaBand()}`);

// Download
page("download", "Get the app",
  "Memento is coming to Google Play. Get early access to Memento, the app that remembers your paperwork.",
  `    <div class="hero">
      <div>
        <span class="badge-soon reveal">${icon("schedule")} Coming soon to Google Play</span>
        <h1 class="reveal" style="margin-top:20px">Get <em>Memento.</em></h1>
        <p class="lead reveal">Memento is almost ready for Google Play. Leave your email and we'll tell you the moment you can install it.</p>
        <div class="cta reveal">${btn(EARLY_ACCESS, "Get early access", "primary", "mark_email_unread")}${btn("/contact", "Ask a question", "ghost", "chat")}</div>
        <div class="meta reveal"><span>Free</span><span>No ads</span><span>Android 8.0+</span></div>
      </div>
      <div class="reveal">${shot("screen-home.png", "Memento home screen")}</div>
    </div>

    <section>
      <div class="section-head reveal"><h2>What you'll need</h2></div>
      <div class="grid two">
        ${card({ icon: "phone_android", title: "Android 8.0 or newer", text: "Memento runs on most Android phones from the last several years." })}
        ${card({ icon: "wifi", color: C.sky, title: "An internet connection", text: "For reading documents with AI and for backups. Browsing what you saved works offline." })}
        ${card({ icon: "account_circle", color: C.mint, title: "An email or Google account", text: "To sign in and keep your documents tied to you." })}
        ${card({ icon: "add_to_drive", color: C.violet, title: "Google Drive (optional)", text: "Only if you want backups and to restore on a new phone." })}
      </div>
    </section>
${ctaBand("Be first in line.", "Early access is free. We'll only email you about Memento.")}`);

// About
page("about", "About",
  "Memento is more than a notepad: it remembers your paperwork for you. Made by HM Dev Studio. Learn what we believe in and why we built it.",
  `    ${pageHero({ eyebrow: "About", eyebrowIcon: "info", title: "Built so you never have to <em>search a drawer</em> again.", lead: "Receipts fade, warranty cards disappear and deadlines sneak up. Memento exists to remember the important stuff for you." })}

    <section class="prose reveal">
      <p>Memento is made by <strong>HM Dev Studio</strong>. We wanted something simpler than scanning apps and spreadsheets: take a photo, and have the details understood, organized and remembered — with a gentle nudge before a date passes.</p>
      <p>AI does the tedious part. You stay in control of everything it fills in. And your documents stay on your phone and in your own Google Drive, not on our servers.</p>
    </section>

    <section>
      <div class="section-head reveal"><h2>What we believe</h2></div>
      <div class="grid two">
        ${card({ icon: "lock", title: "Private by design", text: "Your documents are yours. No ads, no trackers, no selling data." })}
        ${card({ icon: "psychology", color: C.mint, title: "AI you stay in control of", text: "AI suggests; you decide. Every detail can be reviewed and edited." })}
        ${card({ icon: "bolt", color: C.amber, title: "Simple and fast", text: "Capture in seconds, find in seconds. No setup, no folders." })}
        ${card({ icon: "money_off", color: C.sky, title: "Free, no ads", text: "Memento is free to use, and there are no ads in the app." })}
      </div>
    </section>
${ctaBand("Say hello.", "Questions, ideas or partnership requests — we'd love to hear from you.")}`);

// Contact
page("contact", "Contact",
  "Contact the Memento team: questions, feedback, bug reports and privacy requests.",
  `    ${pageHero({ eyebrow: "Contact", eyebrowIcon: "mail", title: "Let's <em>talk.</em>", lead: "Questions, ideas or problems? We'd love to hear from you." })}

    <section style="padding-top:24px">
      <div class="contact">
        <form id="contact-form" class="form glass spot reveal">
          <div class="row">
            <label>Your name<input name="name" autocomplete="name" required></label>
            <label>Your email<input name="email" type="email" autocomplete="email" required></label>
          </div>
          <label>Topic
            <select name="topic">
              <option>General question</option>
              <option>Feedback</option>
              <option>Bug report</option>
              <option>Privacy request</option>
              <option>Business inquiry</option>
            </select>
          </label>
          <label>Message<textarea name="message" required placeholder="How can we help?"></textarea></label>
          <div class="cta"><button class="btn btn-primary" type="submit">${icon("send")}Send message</button></div>
          <p class="hint">Sending opens your email app with the message ready to go to ${EMAIL}.</p>
        </form>
        <div class="side">
          <div class="card glass spot reveal"><div class="icon">${icon("mail")}</div><h3>Email us</h3><p><a href="mailto:${EMAIL}">${EMAIL}</a></p></div>
          <div class="card glass spot reveal"><div class="icon" style="--c:${C.mint}">${icon("forum")}</div><h3>From the app</h3><p>Profile → Send feedback or Contact us. Your app version is included automatically.</p></div>
          <a class="card glass spot reveal" href="/faq"><div class="icon" style="--c:${C.sky}">${icon("help")}</div><h3>Quick answers</h3><p>Many questions are already answered in the FAQ.</p></a>
          <a class="card glass spot reveal" href="/privacy"><div class="icon" style="--c:${C.violet}">${icon("policy")}</div><h3>Privacy requests</h3><p>See how we handle your data, or choose “Privacy request” above.</p></a>
        </div>
      </div>
    </section>`);

// Account deletion (Google Play requires a web page for this, in addition to the in-app option)
page("delete-account", "Delete your account",
  "How to delete your Memento account and data, in the app or by email.",
  `    ${pageHero({ eyebrow: "Account deletion", eyebrowIcon: "delete", title: "Delete your <em>account.</em>", lead: "You can delete your Memento account and data at any time. Here's how, and what happens to your data." })}

    <section style="padding-top:24px">
      <div class="section-head reveal"><h2>Delete it in the app</h2><p>The fastest way. It takes effect immediately.</p></div>
      <div class="steps">
        <div class="step glass spot reveal">${icon("account_circle", "step-icon")}<h3>Open Profile</h3><p>Open Memento and tap Profile in the bottom bar.</p></div>
        <div class="step glass spot reveal">${icon("manage_accounts", "step-icon")}<h3>Account settings</h3><p>Tap Account settings and scroll to “Danger zone”.</p></div>
        <div class="step glass spot reveal">${icon("delete", "step-icon")}<h3>Delete account</h3><p>Tap Delete account and confirm. You may be asked to sign in again first.</p></div>
      </div>
    </section>

    <section>
      <div class="band glass spot reveal">
        <div><h2>Can't open the app?</h2><p>Email us from the address you signed up with and ask us to delete your account. We'll confirm when it's done.</p></div>
        <div class="cta">${btn(`mailto:${EMAIL}?subject=Delete%20my%20Memento%20account&amp;body=Please%20delete%20my%20Memento%20account%20for%20this%20email%20address.`, "Request deletion", "primary", "mail")}</div>
      </div>
    </section>

    <section>
      <div class="section-head reveal"><h2>What gets deleted</h2></div>
      <div class="grid">
        ${card({ icon: "person_off", color: C.coral, title: "Your account", text: "Your sign-in (name, email and password) is permanently removed from our authentication service." })}
        ${card({ icon: "description", color: C.amber, title: "Data on your phone", text: "Deleting in the app also erases every document, page photo and note Memento stored on that phone." })}
        ${card({ icon: "add_to_drive", color: C.sky, title: "Your Drive backup", text: "Backups live in your own Google Drive, so we can't reach them. Delete “Memento backup.zip” from Drive whenever you like." })}
      </div>
      <p class="reveal" style="color:var(--muted);margin-top:24px">We don't keep copies of your documents on our servers. See the <a href="/privacy">Privacy Policy</a> for details.</p>
    </section>`);

// Privacy + Terms (from the app)
const legalSrc = fs.readFileSync(path.join(__dirname, "../app/src/main/java/com/hmdevstudio/memento/ui/legal/LegalContent.kt"), "utf8");
const effective = legalSrc.match(/EFFECTIVE_DATE = "([^"]+)"/)[1];
function sections(name) {
  const start = legalSrc.indexOf(`val ${name} = listOf(`);
  const block = legalSrc.slice(start, legalSrc.indexOf("\n)\n", start));
  const out = [];
  const callRe = /LegalSection\(([\s\S]*?)\)(?=,?\s*(?:LegalSection|$))/g;
  let m;
  while ((m = callRe.exec(block))) {
    const lit = [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
    out.push({ heading: lit[0], body: lit.slice(1).join("") });
  }
  return out;
}
const linkify = (s) => s
  .replace(/([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, '<a href="mailto:$1">$1</a>')
  .replace(/(https:\/\/[^\s<]*[^\s<.,])/g, '<a href="$1">$1</a>');
function bodyHtml(body) {
  const lines = body.split("\n").filter(Boolean);
  if (lines.every((l) => l.startsWith("• "))) return "<ul>" + lines.map((l) => `<li>${linkify(esc(l.slice(2)))}</li>`).join("") + "</ul>";
  return lines.map((l) => `<p>${linkify(esc(l))}</p>`).join("");
}
function legal(slug, title, list, description, ic) {
  page(slug, title, description,
    `    ${pageHero({ eyebrow: title, eyebrowIcon: ic, title, lead: `Effective ${effective}` })}
    <div class="legal">
${list.map((s) => `      <section class="glass reveal"><h2>${esc(s.heading)}</h2>${bodyHtml(s.body)}</section>`).join("\n")}
    </div>`);
  return list.length;
}
const nPrivacy = legal("privacy", "Privacy Policy", sections("PrivacySections"), "How Memento handles your account, documents, AI processing and backups.", "policy");
const nTerms = legal("terms", "Terms of Service", sections("TermsSections"), "The terms for using the Memento app.", "gavel");

// 404
page("404", "Page not found", "This page doesn't exist.",
  `    <div class="notfound">
      <div class="code reveal">404</div>
      <h1 class="reveal">This page got lost.</h1>
      <p class="reveal">Unlike your documents in Memento. Let's get you back on track.</p>
      <div class="cta reveal">${btn("/", "Go home", "primary", "home")}${btn("/features", "See features", "ghost")}</div>
    </div>`);

// ---------- Render ----------
const rendered = pages.map((p) => ({ ...p, html: layout(p) }));

// Load only the icons the site uses (Google Fonts needs the list sorted)
const names = new Set();
for (const p of rendered) for (const m of p.html.matchAll(/<span class="ms[^"]*" aria-hidden="true">([a-z0-9_]+)<\/span>/g)) names.add(m[1]);
const iconUrl = `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..500,0..1,0&amp;icon_names=${[...names].sort().join(",")}&amp;display=block`;

for (const p of rendered) {
  fs.writeFileSync(path.join(__dirname, `${p.slug}.html`), p.html.replace("__ICON_FONT__", iconUrl));
}

// Sitemap + robots
const listed = rendered.filter((p) => p.slug !== "404");
fs.writeFileSync(path.join(__dirname, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  listed.map((p) => `  <url><loc>${p.slug === "index" ? SITE + "/" : `${SITE}/${p.slug}`}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(__dirname, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built ${rendered.length} pages: ${rendered.map((p) => (p.slug === "index" ? "/" : "/" + p.slug)).join(" ")}`);
console.log(`Legal: privacy ${nPrivacy} sections, terms ${nTerms} sections. Icons: ${names.size}`);
