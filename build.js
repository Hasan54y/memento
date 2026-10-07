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
  ["tools/", "Tools", "handyman", "Free"],
  ["contact", "Contact", "mail"],
];
const MOBILE_EXTRA = [["about", "About", "info"], ["download", "Get the app", "rocket_launch"]];

// Titles shown in Google results: lead with what people search for, keep under ~60 characters.
const SEO_TITLES = {
  index: "Memento: Receipt, Warranty & Bill Reminder App for Android",
  features: "Scan Receipts, Track Warranties & Bills | Memento",
  "how-it-works": "How Memento Reads Receipts & Documents | Memento",
  backup: "Back Up Receipts & Documents to Google Drive | Memento",
  faq: "FAQ: Document Organizer & Warranty Tracker App | Memento",
  download: "Download Memento for Android | Memento",
  reviews: "Memento Reviews | Memento",
};
const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "HM Dev Studio", url: `${SITE}/`, logo: `${SITE}/assets/logo.svg`, email: EMAIL,
  sameAs: [TRUSTPILOT_READ, "https://play.google.com/store/apps/details?id=com.hmdevstudio.memento"] };
const APP = { "@type": "MobileApplication", "@id": `${SITE}/#app`, name: "Memento", operatingSystem: "Android 8.0+", applicationCategory: "ProductivityApplication",
  description: "Scan receipts, warranty cards, bills and IDs. Memento reads the details, reminds you before dates expire and backs everything up to your own Google Drive.",
  url: `${SITE}/`, image: `${SITE}/assets/og.png`, publisher: { "@id": `${SITE}/#org` },
  installUrl: "https://play.google.com/store/apps/details?id=com.hmdevstudio.memento",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
const FAQS = [];
// "tools/index" is served at /tools/, everything else at its clean slug
const urlOf = (slug) => slug === "index" ? `${SITE}/` : slug.endsWith("/index") ? `${SITE}/${slug.slice(0, -5)}` : `${SITE}/${slug}`;
function jsonLd(slug, title, url, faqs = [], extra = []) {
  const graph = [ORG, { "@type": "WebSite", "@id": `${SITE}/#site`, name: "Memento", url: `${SITE}/`, publisher: { "@id": `${SITE}/#org` }, inLanguage: "en" }];
  if (slug === "index" || slug === "download" || slug === "features") graph.push(APP);
  if (slug !== "index" && slug !== "404") {
    const crumbs = [["Home", `${SITE}/`]];
    if (slug.startsWith("tools/") && slug !== "tools/index") crumbs.push(["Free tools", urlOf("tools/index")]);
    crumbs.push([title, url]);
    graph.push({ "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) });
  }
  if (faqs.length) graph.push({ "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
  graph.push(...extra);
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

// <head> shared by the main site and the tools section
function headTags({ slug, title, description, lang = "en", faqs, schema }, { themeColor, css, scripts }) {
  const url = urlOf(slug);
  const bn = lang === "bn";
  const fullTitle = SEO_TITLES[slug] || (slug === "index" ? "Memento — More than a notepad. Your paperwork, remembered." : `${title} — Memento`);
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="${themeColor}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Memento">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Memento app: your paperwork, remembered">
  <meta property="og:locale" content="${bn ? "bn_BD" : "en_US"}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${fullTitle}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${SITE}/assets/og.png">
  ${slug === "404" ? '<meta name="robots" content="noindex">' : ""}
  ${jsonLd(slug, title, url, faqs, schema)}
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700${bn ? "&family=Hind+Siliguri:wght@400;500;600;700" : ""}&display=swap" rel="stylesheet">
  <link href="__ICON_FONT__" rel="stylesheet">
  <link rel="stylesheet" href="/assets/${css}">${scripts.map((s) => `
  <script src="${s.startsWith("http") ? s : "/assets/" + s}" ${s.startsWith("http") ? "async" : "defer"}></script>`).join("")}
</head>`;
}

function layout(p) {
  const { slug, body, lang = "en", scripts = [] } = p;
  const isActive = (s) => s === slug || (s.endsWith("/") && slug.startsWith(s));
  const link = ([s, label, ic, pill], mobile) =>
    `<a href="/${s}"${isActive(s) ? ' class="active" aria-current="page"' : ""}>${mobile ? icon(ic) : ""}${label}${pill ? `<span class="nav-pill">${pill}</span>` : ""}</a>`;
  return `<!doctype html>
<html lang="${lang}">
${headTags(p, { themeColor: "#000000", css: "site.css", scripts: ["site.js", ...scripts, "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"] })}
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
      <div><h4>Product</h4><a href="/features">Features</a><a href="/how-it-works">How it works</a><a href="/backup">Google Drive backup</a><a href="/download">Get the app</a><a href="/tools/">Free tools</a></div>
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
const page = (slug, title, description, body, opts = {}) => pages.push({ slug, title, description, body, ...opts });

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
      <div class="tools-spot glass spot reveal">
        <div>
          <span class="eyebrow">${icon("handyman")} New · Free tools</span>
          <h2>Job application photo? <em>Ready in a minute.</em></h2>
          <p>Resize your photo to 300×300 and signature to 300×80, keep them under the KB limit, and switch the background to white or blue. Free, no sign-in, and nothing is uploaded.</p>
          <div class="cta">${btn("/tools/photo-signature-resizer", "Try the photo resizer", "primary", "photo_size_select_large")}${btn("/tools/", "All free tools", "ghost")}</div>
        </div>
        <div class="spot-preview" aria-hidden="true">
          <div class="pv pv-photo">${icon("person", "fill")}<b>300 × 300</b></div>
          <div class="pv pv-sign">${icon("signature")}<b>300 × 80</b></div>
          <div class="pv-swatches"><span style="--sw:#ffffff"></span><span style="--sw:#dcebf7"></span><span style="--sw:#2f6fd0"></span><small>Background</small></div>
        </div>
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
        <div><h2>Used Memento? Share an honest review.</h2><p>Good or bad, every review on Trustpilot helps other people decide and helps us improve Memento.</p></div>
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
  `    ${pageHero({ eyebrow: "Reviews", eyebrowIcon: "rate_review", title: "Tell us what you <em>think.</em>", lead: "Good or bad, honest reviews help other people decide and help us build a better Memento." })}

    <section>
      <div class="grid">
        <article class="card glass spot reveal"><div class="icon" style="--c:${C.green}">${icon("rate_review")}</div><h3>Trustpilot</h3><p>Share your honest experience publicly on Trustpilot.</p><div style="margin-top:18px"><div class="trustpilot-widget" data-locale="en-US" data-template-id="56278e9abfbbba0bdcd568bc" data-businessunit-id="6ab5020f20b30165e430b08f" data-style-height="52px" data-style-width="100%" data-token="eab3e8b8-be97-44ea-b1a7-c9f49fda1ae9"><a href="https://www.trustpilot.com/review/mementoapp.online" target="_blank" rel="noopener">Trustpilot</a></div></div><div class="cta" style="margin-top:14px">${btn(TRUSTPILOT_READ, "Read reviews", "ghost", "", ' target="_blank" rel="noopener"')}</div></article>
        <article class="card glass spot reveal"><div class="icon" style="--c:${C.green}">${icon("shop")}</div><h3>Google Play</h3><p>Rate Memento on the Play Store once it's published.</p><div style="margin-top:18px"><span class="badge-soon">${icon("schedule")} Coming soon</span></div></article>
        <article class="card glass spot reveal"><div class="icon" style="--c:${C.mint}">${icon("forum")}</div><h3>In the app</h3><p>Profile → Send feedback. Rate with stars and tell us what to improve.</p><a class="more" href="/contact">Or contact us</a></article>
      </div>
    </section>

    ${showcase({ tag: "Feedback", title: "Straight from the app.", text: "Everything you need is in your Profile: send feedback, contact us, rate on Google Play or review on Trustpilot.", bullets: ["Star rating and a message in one place", "Your app version is included so we can help faster"], img: "screen-profile.png", alt: "Help and feedback in Memento's profile", flip: true })}
${ctaBand()}`);

// FAQ
// Each FAQ answer is also collected for the page's FAQPage structured data
const faqInto = (list) => (q, a) => (list.push([q.replace(/<[^>]+>/g, ""), a.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")]), `<details class="glass reveal"><summary>${q}</summary><p>${a}</p></details>`);
const faq = faqInto(FAQS);
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
${ctaBand()}`, { faqs: FAQS });

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

// ---------- Free tools: "Memento Tools", its own utility-style section ----------
// Everything runs in the visitor's browser: no uploads, no server.
SEO_TITLES["tools/index"] = "Free Online Tools for Photos, PDFs & Forms | Memento Tools";
SEO_TITLES["tools/photo-signature-resizer"] = "Photo 300×300 & Signature 300×80 Resizer (Teletalk) | Memento";
SEO_TITLES["tools/image-to-pdf"] = "Image to PDF: JPG to PDF Under 200 KB, Free | Memento Tools";
SEO_TITLES["tools/compress-pdf"] = "Compress PDF to 100 KB, 200 KB or 1 MB, Free | Memento Tools";
SEO_TITLES["tools/merge-pdf"] = "Merge PDF Files Online, Free and Private | Memento Tools";
SEO_TITLES["tools/split-pdf"] = "Split PDF: Extract Pages or Split by Range, Free | Memento Tools";
SEO_TITLES["tools/age-calculator"] = "Age Calculator: Exact Age on a Job Circular's Date | Memento Tools";
SEO_TITLES["tools/pdf-to-image"] = "PDF to JPG or PNG: Convert PDF Pages to Images, Free | Memento Tools";

const TOOL_CATS = [
  ["photo", "Photo", "image"],
  ["pdf", "PDF", "picture_as_pdf"],
  ["calc", "Calculators", "calculate"],
];
const TOOLS = [
  { slug: "photo-signature-resizer", cat: "photo", icon: "photo_size_select_large", color: C.green, title: "Photo & signature resizer",
    text: "Job application photo at 300×300 and signature at 300×80, under the KB limit. Change the background to white or blue.",
    keywords: "teletalk passport resize compress kb signature background white blue remove job application" },
  { slug: "merge-pdf", cat: "pdf", icon: "merge", color: C.coral, title: "Merge PDF",
    text: "Combine PDFs and images into one PDF, in any order. Text stays sharp and selectable.",
    keywords: "merge combine join pdf files together append add images jpg" },
  { slug: "split-pdf", cat: "pdf", icon: "call_split", color: C.sky, title: "Split PDF",
    text: "Extract pages, split every page, or split by ranges like 1-3, 5, 8-end.",
    keywords: "split separate extract pages pdf range remove delete" },
  { slug: "image-to-pdf", cat: "pdf", icon: "picture_as_pdf", color: C.coral, title: "Image to PDF",
    text: "Turn photos of certificates, NID or marksheets into one PDF, under the KB limit you need.",
    keywords: "jpg png photo images to pdf convert merge combine certificate scan kb size" },
  { slug: "compress-pdf", cat: "pdf", icon: "compress", color: C.violet, title: "Compress PDF",
    text: "Shrink a PDF to 100 KB, 200 KB, 500 KB or 1 MB for online applications.",
    keywords: "compress reduce shrink pdf size kb mb smaller" },
  { slug: "pdf-to-image", cat: "pdf", icon: "photo_library", color: C.sky, title: "PDF to Image",
    text: "Turn PDF pages into JPG or PNG images, one page or all of them, with an optional KB limit.",
    keywords: "pdf to jpg png image picture convert pages extract save" },
  { slug: "age-calculator", cat: "calc", icon: "cake", color: C.amber, title: "Age calculator",
    text: "Your exact age in years, months and days on a circular's cut-off date, and whether you're within the age limit.",
    keywords: "age calculator date of birth circular job eligibility limit cut off years months days" },
];

function toolTile(t) {
  const inner = `<span class="t-ico" style="--c:${t.color}">${icon(t.icon)}</span>
          <h3>${t.title}</h3><p>${t.text}</p>`;
  const data = `data-cat="${t.cat}" data-name="${esc(`${t.title} ${t.text} ${t.keywords || ""}`.toLowerCase())}"`;
  return t.slug
    ? `<a class="t-tile" href="/tools/${t.slug}" ${data}>${inner}<span class="t-go">Open tool ${icon("arrow_forward")}</span></a>`
    : `<div class="t-tile soon" ${data}>${inner}<span class="t-soon">${icon("schedule")} Coming soon</span></div>`;
}

function toolsLayout(p) {
  const { slug, body, scripts = [], cat } = p;
  const catLink = ([id, label, ic]) => `<a href="/tools/#${id}" data-cat="${id}" data-label="${label}"${cat === id ? ' class="on"' : ""}>${icon(ic)}${label}</a>`;
  const live = TOOLS.filter((t) => t.slug);
  return `<!doctype html>
<html lang="en">
${headTags(p, { themeColor: "#ffffff", css: "tools.css", scripts: ["tools.js", ...scripts] })}
<body>
  <header class="t-head">
    <div class="t-wrap t-bar">
      <a class="t-brand" href="/tools/"><img src="/assets/logo-ink.svg" alt="" width="24" height="25"><span>Memento <b>Tools</b></span></a>
      <form class="t-search" action="/tools/" method="get" role="search">${icon("search")}<input name="q" type="search" placeholder="Search tools…" aria-label="Search tools" autocomplete="off"></form>
      <a class="t-app" href="/">${icon("smartphone")}<span>Memento app</span></a>
    </div>
    <nav class="t-wrap t-cats" aria-label="Tool categories">
      <a href="/tools/" data-cat="all" data-label="All tools"${slug === "tools/index" ? ' class="on"' : ""}>${icon("apps")}All tools</a>${TOOL_CATS.map(catLink).join("")}
    </nav>
  </header>
  <main class="t-wrap">
${body}
  </main>
  <footer class="t-foot">
    <div class="t-wrap t-foot-cols">
      <div>
        <a class="t-brand" href="/tools/"><img src="/assets/logo-ink.svg" alt="" width="24" height="25"><span>Memento <b>Tools</b></span></a>
        <p>Free tools for everyday paperwork, by HM Dev Studio. Everything runs in your browser, so your files never leave your device.</p>
      </div>
      <div><h4>Tools</h4>${live.map((t) => `<a href="/tools/${t.slug}">${t.title}</a>`).join("")}<a href="/tools/">All tools</a></div>
      <div><h4>Memento</h4><a href="/">Memento app</a><a href="/features">Features</a><a href="/download">Get the app</a><a href="/contact">Contact</a></div>
      <div><h4>Legal</h4><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></div>
    </div>
    <div class="t-wrap t-foot-bottom"><span>© <span id="year">2026</span> HM Dev Studio</span><a href="mailto:${EMAIL}">${EMAIL}</a></div>
  </footer>
</body>
</html>
`;
}

function memoPromo() {
  return `<aside class="t-promo">
        <img src="/assets/logo.svg" alt="" width="40" height="42">
        <h3>Keep every document in one place</h3>
        <p>Certificates, IDs, receipts: snap them into Memento, and it fills in the details and finds any of them in one search.</p>
        <a class="btn btn-primary btn-sm" href="/">${icon("rocket_launch")}Meet Memento</a>
      </aside>`;
}

page("tools/index", "Free tools",
  "Free online tools for everyday paperwork: merge, split and compress PDFs, convert images to PDF and back, resize photos and change backgrounds. Everything runs in your browser; no files are uploaded.",
  `    <section class="t-hero">
      <h1>Free online tools for everyday paperwork</h1>
      <p>Merge, split and compress PDFs, turn photos into PDFs, resize photos for forms and more. Free, no sign-up, and your files never leave your device.</p>
      <ul class="t-perks">
        <li>${icon("lock")} No uploads</li>
        <li>${icon("bolt")} No sign-up</li>
        <li>${icon("smartphone")} Works on phones</li>
        <li>${icon("money_off")} 100% free</li>
      </ul>
    </section>

    <section class="t-section">
      <div class="t-section-head"><h2 data-grid-title>All tools</h2><span class="t-count" data-count></span></div>
      <div class="t-grid" data-tool-grid>
        ${TOOLS.map(toolTile).join("\n        ")}
      </div>
      <p class="t-empty" data-empty hidden>${icon("search_off")} No tools match your search yet. <a href="/contact">Tell us what you need</a>.</p>
    </section>

    <section class="t-section">
      <div class="t-banner">
        <div>
          <h2>Tired of hunting for documents before every application?</h2>
          <p>Memento keeps your certificates, IDs and receipts organized on your phone, with reminders before important dates.</p>
        </div>
        <a class="btn btn-primary" href="/">${icon("rocket_launch")}Meet Memento</a>
      </div>
    </section>`, { shell: "tools" });

// One tool page: breadcrumbs, title, the tool itself, then how-to, tips, FAQ and a sidebar.
function toolPage(t, { h1, lead, description, workspace, steps, tips, faqs, scripts, appCategory = "UtilitiesApplication", schemaDesc }) {
  const faqData = [];
  const faqHtml = faqs.map(([q, a]) => (faqData.push([q, a]), `<details><summary>${q}</summary><p>${a}</p></details>`)).join("\n          ");
  const [, catLabel] = TOOL_CATS.find(([id]) => id === t.cat);
  const others = TOOLS.filter((o) => o !== t).sort((x, y) => (y.slug ? 1 : 0) - (x.slug ? 1 : 0));
  const mini = (o) => o.slug
    ? `<a class="t-mini" href="/tools/${o.slug}"><span class="t-ico sm" style="--c:${o.color}">${icon(o.icon)}</span><span>${o.title}<small>Open tool</small></span></a>`
    : `<div class="t-mini"><span class="t-ico sm" style="--c:${o.color}">${icon(o.icon)}</span><span>${o.title}<small>Coming soon</small></span></div>`;
  page(`tools/${t.slug}`, t.title, description,
    `    <nav class="t-crumbs" aria-label="Breadcrumb"><a href="/tools/">Tools</a>${icon("chevron_right")}<a href="/tools/#${t.cat}">${catLabel}</a>${icon("chevron_right")}<span>${esc(t.title)}</span></nav>
    <div class="t-title">
      <span class="t-ico big" style="--c:${t.color}">${icon(t.icon)}</span>
      <div>
        <h1>${h1}</h1>
        <p>${lead}</p>
      </div>
    </div>

${workspace}

    <div class="t-cols">
      <article class="t-article">
        <h2>How to use it</h2>
        <ol class="t-steps">
          ${steps.map(([b, text]) => `<li><b>${b}</b> ${text}</li>`).join("\n          ")}
        </ol>

        <h2>For the best result</h2>
        <ul class="t-tips">
          ${tips.map(([ic, b, text]) => `<li>${icon(ic)}<span><b>${b}</b> ${text}</span></li>`).join("\n          ")}
        </ul>

        <h2>Questions</h2>
        <div class="t-faq">
          ${faqHtml}
        </div>
      </article>

      <div class="t-side">
        ${memoPromo()}
        <div class="t-more">
          <h3>More tools</h3>
          ${others.map(mini).join("\n          ")}
        </div>
      </div>
    </div>`, {
    shell: "tools",
    cat: t.cat,
    scripts,
    faqs: faqData,
    schema: [{ "@type": "WebApplication", name: t.title, url: urlOf(`tools/${t.slug}`), inLanguage: "en",
      applicationCategory: appCategory, operatingSystem: "Any", browserRequirements: "Requires JavaScript",
      description: schemaDesc, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@id": `${SITE}/#org` } }],
  });
}
const tool = (slug) => TOOLS.find((t) => t.slug === slug);
const kbChips = (list) => `<div class="chips">${list.map(([v, l]) => `<button type="button" data-kb="${v}">${l}</button>`).join("")}</div>`;

// Photo & signature resizer
toolPage(tool("photo-signature-resizer"), {
  h1: "Photo &amp; Signature Resizer",
  lead: "Job application photo 300×300 and signature 300×80, under the KB limit, with a white or blue background if you need it.",
  description: "Resize your job application photo to 300×300 (100 KB) and signature to 300×80 (60 KB), and change the photo background to white or blue. Free, and nothing is uploaded.",
  workspace: `    <div class="tool" id="resizer">
      <div class="modes" role="tablist" aria-label="What are you making?">
        <button type="button" role="tab" data-mode="photo" aria-selected="true">${icon("person")}Photo <small>300×300</small></button>
        <button type="button" role="tab" data-mode="sign" aria-selected="false">${icon("draw")}Signature <small>300×80</small></button>
        <button type="button" role="tab" data-mode="custom" aria-selected="false">${icon("tune")}Custom size</button>
      </div>
      <div class="custom" hidden>
        <label>Width (px)<input id="cw" type="number" inputmode="numeric" min="20" max="5000" value="300"></label>
        <label>Height (px)<input id="ch" type="number" inputmode="numeric" min="20" max="5000" value="300"></label>
        <label>Max KB<input id="ckb" type="number" inputmode="numeric" min="5" max="10000" value="100" placeholder="No limit"></label>
      </div>

      <div class="tool-grid">
        <div class="stage">
          <label class="drop" id="drop">
            ${icon("add_photo_alternate")}
            <strong data-drop-title>Choose a photo</strong>
            <span class="sub">or drag it here, or paste it. JPG, PNG or WebP.</span>
            <span class="btn btn-primary btn-sm drop-btn">${icon("upload")}Select file</span>
            <input id="file" type="file" accept="image/*">
          </label>
          <div class="editor" hidden>
            <div class="frame"><canvas id="view" aria-label="Drag and zoom to frame the picture"></canvas></div>
            <p class="hint-line move-hint">${icon("pan_tool")} Drag to move, zoom to fit. The green guides won't appear in the file.</p>
            <p class="hint-line brush-hint" hidden>${icon("brush")} Paint over the spots to fix. Tap the brush again to go back to moving the picture.</p>
            <div class="controls">
              <label class="zoom">${icon("zoom_out")}<input id="zoom" type="range" min="50" max="400" value="100" aria-label="Zoom">${icon("zoom_in")}</label>
              <button type="button" class="btn btn-ghost btn-sm" id="rotate">${icon("rotate_right")}Rotate</button>
              <button type="button" class="btn btn-ghost btn-sm" id="pick">${icon("image")}New picture</button>
            </div>
            <div class="bg-row">
              <span class="bg-label">${icon("wallpaper")}Background</span>
              <div class="swatches" role="group" aria-label="Background">
                <button type="button" class="sw-text" data-bg="" aria-pressed="true">Original</button>
                <button type="button" class="sw" data-bg="#ffffff" style="--sw:#ffffff" title="White" aria-label="White"></button>
                <button type="button" class="sw" data-bg="#dcebf7" style="--sw:#dcebf7" title="Light blue" aria-label="Light blue"></button>
                <button type="button" class="sw" data-bg="#2f6fd0" style="--sw:#2f6fd0" title="Blue" aria-label="Blue"></button>
                <button type="button" class="sw" data-bg="#e6e6e6" style="--sw:#e6e6e6" title="Light grey" aria-label="Light grey"></button>
                <button type="button" class="sw sw-pick" data-bg="custom" title="Any colour" aria-label="Any colour">${icon("palette")}</button>
                <input id="bgc" class="vh" type="color" value="#c8102e" tabindex="-1" aria-hidden="true">
              </div>
              <span class="bg-status" id="bg-status" hidden></span>
            </div>
            <div class="fix-row" hidden>
              <span class="bg-label">${icon("auto_fix_high")}Fix edges</span>
              <button type="button" class="sw-text brush-btn erase" data-brush="erase" aria-pressed="false">${icon("ink_eraser")}Erase</button>
              <button type="button" class="sw-text brush-btn" data-brush="restore" aria-pressed="false">${icon("brush")}Restore</button>
              <label class="zoom brush-size">Size<input id="bsize" type="range" min="6" max="80" value="26" aria-label="Brush size"></label>
              <button type="button" class="btn btn-ghost btn-sm" id="undo" disabled>${icon("undo")}Undo</button>
            </div>
            <div class="controls">
              <label class="check"><input id="clean" type="checkbox">Whiten paper, darken ink</label>
              <label class="zoom strength" hidden>Light<input id="strength" type="range" min="0" max="100" value="60" aria-label="Cleanup strength">Strong</label>
            </div>
          </div>
          <p class="err" id="err" role="alert" hidden></p>
        </div>

        <div class="result" aria-live="polite">
          <h3>${icon("task_alt")} Result</h3>
          <div class="out"><img id="out" alt="Preview of the resized picture" hidden><span class="empty">Your result will appear here</span></div>
          <ul class="facts">
            <li><span>Size</span><b id="f-dim">—</b></li>
            <li><span>File size</span><b id="f-size">—</b></li>
            <li><span>Format</span><b>JPG</b></li>
          </ul>
          <a class="btn btn-primary" id="dl" href="#" aria-disabled="true">${icon("download")}Download</a>
        </div>
      </div>
      <p class="privacy-note">${icon("lock")} Your picture is never uploaded. All the work happens inside your browser.</p>
    </div>`,
  steps: [
    ["Pick a type.", "Photo (300×300), Signature (300×80), or Custom size if the circular asks for something else."],
    ["Add and frame your picture.", "Drag and zoom until your face or signature sits in the middle. Pick a background colour if you need one, and touch up any spot with Fix edges."],
    ["Download.", "Check the size and KB, then upload the file to your application."],
  ],
  tips: [
    ["light_mode", "Good light.", "Daylight or a bright room, with no shadows on your face."],
    ["wallpaper", "Plain background helps.", "A plain wall gives the cleanest edges, even when you switch the background here."],
    ["face", "Face in the middle.", "Leave a little room above your head and down to your shoulders."],
    ["edit", "Sign on white paper.", "Black or blue pen, photo taken straight from above."],
    ["auto_fix_high", "Whiten the paper.", "If the paper looks grey, turn on \"Whiten paper, darken ink\"."],
    ["fact_check", "Check the circular.", "Every application can ask for different sizes."],
  ],
  faqs: [
    ["What photo and signature size do job applications need?", "Most Bangladesh government job applications made through Teletalk ask for a 300×300 pixel photo (up to 100 KB) and a 300×80 pixel signature (up to 60 KB). Sizes can differ from one circular to another, so check yours before applying, and use Custom size if it asks for something else."],
    ["Can I change my photo background to white or blue?", "Yes. After adding your photo, pick White, Light blue, Blue, Light grey or any colour under Background. The tool finds you in the photo and replaces everything behind you, right on your device. If a spot is missed, use Fix edges: Erase removes leftover background and Restore brings back anything that was cut off. The first time, the background tool downloads about 16 MB; after that it is saved in your browser."],
    ["Is my picture uploaded anywhere?", "No. All the resizing happens inside your browser. Your picture never reaches our servers or anyone else's."],
    ["Does it work on a phone?", "Yes. Open it in your phone's browser and pick a photo from your gallery or take a new one. You can pinch with two fingers to zoom."],
    ["Where do I find the downloaded file?", "Usually in your phone's or computer's Downloads folder, named photo-300x300.jpg or signature-300x80.jpg."],
    ["Why does my photo look blurry after resizing?", "If the original is blurry or very small, the result will be too. Use a sharp photo taken in good light."],
    ["Is it really free?", "Yes, completely free. No account or sign-in needed."],
  ],
  scripts: ["resizer.js"],
  appCategory: "MultimediaApplication",
  schemaDesc: "Free tool to resize job application photos to 300×300 and signatures to 300×80 pixels under a set KB limit, and change the photo background.",
});

// Image to PDF
toolPage(tool("image-to-pdf"), {
  h1: "Image to PDF",
  lead: "Turn photos of certificates, NID, marksheets or any document into one PDF. Set a size limit like 200 KB or 1 MB, and the tool keeps it under.",
  description: "Convert JPG, PNG and phone photos to one PDF for free. Reorder and rotate pages, choose A4, and keep the PDF under 200 KB, 500 KB or 1 MB. Nothing is uploaded.",
  workspace: `    <div class="tool" id="img2pdf">
      <div class="tool-grid">
        <div class="stage">
          <label class="drop" id="drop">
            ${icon("add_photo_alternate")}
            <strong>Add photos or scans</strong>
            <span class="sub">Pick several at once, drag them here, or paste. JPG, PNG or WebP.</span>
            <span class="btn btn-primary btn-sm drop-btn">${icon("upload")}Select images</span>
            <input id="file" type="file" accept="image/*" multiple>
          </label>
          <div class="pages" hidden>
            <div class="pages-head">
              <b id="p-count">0 pages</b>
              <span class="sub">Drag or use the arrows to reorder</span>
              <span class="pages-actions">
                <button type="button" class="btn btn-ghost btn-sm" id="add-more">${icon("add")}Add more</button>
                <button type="button" class="btn btn-ghost btn-sm" id="clear">${icon("delete")}Remove all</button>
              </span>
            </div>
            <ol class="thumbs" id="thumbs"></ol>
          </div>
          <template>${icon("chevron_left")}${icon("chevron_right")}${icon("rotate_right")}</template>
          <p class="err" id="err" role="alert" hidden></p>
        </div>

        <div class="result">
          <h3>${icon("tune")} Settings</h3>
          <div class="fields">
            <label class="field">Page size<select id="psize"><option value="a4">A4</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="fit">Same as photo</option></select></label>
            <label class="field">Orientation<select id="orient"><option value="auto">Auto</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
            <label class="field">Margin<select id="margin"><option value="none">None</option><option value="small" selected>Small</option><option value="normal">Normal</option></select></label>
            <label class="field">File name<input id="fname" type="text" placeholder="document" maxlength="80"></label>
            <label class="field wide">Max file size (KB)<input id="maxkb" type="number" inputmode="numeric" min="20" placeholder="No limit"></label>
            ${kbChips([[200, "200 KB"], [500, "500 KB"], [1000, "1 MB"], [2000, "2 MB"]])}
            <label class="check wide"><input id="scan" type="checkbox">Scanned look for documents (whiten paper)</label>
          </div>
          <ul class="facts">
            <li><span>Pages</span><b id="f-pages">—</b></li>
            <li><span>File size</span><b id="f-size">—</b></li>
          </ul>
          <p class="bg-status" id="status" hidden></p>
          <button type="button" class="btn btn-primary" id="make" disabled>${icon("picture_as_pdf")}Create PDF</button>
          <a class="btn btn-primary" id="dl" href="#" hidden>${icon("download")}Download PDF</a>
        </div>
      </div>
      <p class="privacy-note">${icon("lock")} Your images are never uploaded. The PDF is made inside your browser.</p>
    </div>`,
  steps: [
    ["Add your photos.", "Pick all the pages at once from your gallery or computer, or take photos with your phone."],
    ["Arrange them.", "Drag pages (or use the arrows) into the right order, and rotate any that are sideways."],
    ["Set a size limit if you need one.", "Type the KB limit from the application form, or tap 200 KB, 500 KB, 1 MB or 2 MB."],
    ["Create and download.", "Tap Create PDF, check the size, then Download PDF."],
  ],
  tips: [
    ["crop_free", "Whole page in frame.", "Keep all four corners of the paper in the photo."],
    ["light_mode", "Even light.", "Avoid shadows from your phone or hand across the page."],
    ["auto_fix_high", "Scanned look.", "Turn it on to make grey paper white and text darker, like a scanner. Photos of people or places are left as they are."],
    ["straighten", "Shoot from above.", "Hold the phone flat over the page so the text isn't slanted."],
    ["compress", "Big limit, better pages.", "Use the largest KB limit the form allows; smaller limits mean blurrier pages."],
    ["picture_as_pdf", "Already have a PDF?", "Use Compress PDF to make an existing PDF smaller."],
  ],
  faqs: [
    ["How do I convert multiple images into one PDF?", "Select all the images at once (or add more later). Each image becomes one page, in the order shown. Drag pages or use the arrows to change the order, then tap Create PDF."],
    ["How do I make a PDF under 200 KB or 1 MB?", "Type the limit in Max file size, or tap one of the quick sizes. The tool lowers image quality and resolution only as much as needed to fit. If the pages would become unreadable it tells you, so you can remove a page or use a bigger limit."],
    ["Are my documents uploaded anywhere?", "No. The PDF is made inside your browser. Your certificates and IDs never reach our servers or anyone else's."],
    ["Does it work on a phone?", "Yes. Open it in your phone's browser, pick photos from your gallery, and download the PDF. It's saved to your Downloads folder."],
    ["What page size should I use?", "A4 is the standard in Bangladesh and most countries. Choose Same as photo if you want each page to match the photo's shape with no white borders."],
    ["Can I add more pages later?", "Yes. Tap Add more to add pages to the same PDF, then Create PDF again."],
    ["Is it really free?", "Yes, completely free. No account, no watermark."],
  ],
  scripts: ["pdf-lite.js", "img2pdf.js"],
  schemaDesc: "Free tool to convert JPG, PNG and phone photos into a single PDF, with page reordering, rotation, A4/Letter pages and a maximum file size.",
});

// Compress PDF
toolPage(tool("compress-pdf"), {
  h1: "Compress PDF",
  lead: "Make a PDF small enough to upload: 100 KB, 200 KB, 500 KB or 1 MB. Pick how much to shrink it, or type the limit from the form.",
  description: "Compress a PDF to 100 KB, 200 KB, 500 KB or 1 MB for free, right in your browser. Choose the size limit, optional black & white, and download. Nothing is uploaded.",
  workspace: `    <div class="tool" id="pdfcomp">
      <div class="tool-grid">
        <div class="stage">
          <label class="drop" id="drop">
            ${icon("upload_file")}
            <strong>Choose a PDF</strong>
            <span class="sub">or drag it here.</span>
            <span class="btn btn-primary btn-sm drop-btn">${icon("upload")}Select PDF</span>
            <input id="file" type="file" accept="application/pdf,.pdf">
          </label>
          <div class="pdf-info" hidden>
            <span class="t-ico" style="--c:${C.coral}">${icon("picture_as_pdf")}</span>
            <div><b id="pdf-name"></b><span id="pdf-meta"></span></div>
            <button type="button" class="btn btn-ghost btn-sm" id="pick">${icon("swap_horiz")}Change</button>
          </div>
          <p class="note">${icon("info")} Pages are saved as images, so text in the compressed PDF can't be selected or searched. That's fine for application uploads; keep your original too.</p>
          <p class="err" id="err" role="alert" hidden></p>
        </div>

        <div class="result">
          <h3>${icon("tune")} Compression</h3>
          <div class="levels" role="radiogroup" aria-label="Compression level">
            <label class="lvl"><input type="radio" name="level" value="small"><span><b>Smallest</b><small>Tiny file, less detail</small></span></label>
            <label class="lvl"><input type="radio" name="level" value="balanced" checked><span><b>Balanced</b><small>Clear text, small file</small></span></label>
            <label class="lvl"><input type="radio" name="level" value="sharp"><span><b>Sharp</b><small>For small print</small></span></label>
          </div>
          <div class="fields">
            <label class="field wide">Max file size (KB)<input id="maxkb" type="number" inputmode="numeric" min="20" placeholder="No limit"></label>
            ${kbChips([[100, "100 KB"], [200, "200 KB"], [500, "500 KB"], [1000, "1 MB"]])}
            <label class="check wide"><input id="gray" type="checkbox">Black &amp; white (smaller)</label>
          </div>
          <ul class="facts">
            <li><span>Original</span><b id="f-orig">—</b></li>
            <li><span>Compressed</span><b id="f-new">—</b></li>
            <li><span>Saved</span><b id="f-saved">—</b></li>
          </ul>
          <p class="bg-status" id="status" hidden></p>
          <button type="button" class="btn btn-primary" id="make" disabled>${icon("compress")}Compress PDF</button>
          <a class="btn btn-primary" id="dl" href="#" hidden>${icon("download")}Download PDF</a>
        </div>
      </div>
      <p class="privacy-note">${icon("lock")} Your PDF is never uploaded. It's compressed inside your browser.</p>
    </div>`,
  steps: [
    ["Choose your PDF.", "Pick it from your phone or computer, or drag it onto the box."],
    ["Pick a level or a limit.", "Balanced suits most forms. If the form says \"max 200 KB\", type 200 or tap the 200 KB button."],
    ["Compress and download.", "Tap Compress PDF, check the new size, then Download PDF."],
  ],
  tips: [
    ["format_size", "Use the biggest limit allowed.", "A 500 KB PDF looks better than a 100 KB one, so don't shrink more than the form needs."],
    ["contrast", "Black & white saves a lot.", "For text documents and certificates, it can halve the size."],
    ["zoom_in", "Check the result.", "Open the compressed PDF and make sure every page is readable before uploading."],
    ["photo_library", "Starting from photos?", "Use Image to PDF instead; it makes the PDF and sets the size in one go."],
  ],
  faqs: [
    ["How do I compress a PDF to 200 KB?", "Choose your PDF, type 200 in Max file size (or tap 200 KB), then tap Compress PDF. The tool lowers resolution and quality just enough to fit. For long PDFs with many pages, turning on Black & white helps reach small limits."],
    ["Will the text still be readable?", "Balanced and Sharp keep normal text readable. Smallest and very small limits can make tiny print blurry, so always open the result and check before uploading."],
    ["Why can't I select text in the compressed PDF?", "To make the file small, each page is saved as an image. That's fine for uploading to applications, but keep your original PDF if you need to copy text from it."],
    ["Is my PDF uploaded anywhere?", "No. Everything happens inside your browser. Your PDF never reaches our servers or anyone else's."],
    ["What if my PDF has a password?", "Remove the password first (open it and save or print it as a new PDF), then compress the new file."],
    ["Is it really free?", "Yes, completely free. No account, no watermark, no page limit."],
  ],
  scripts: ["pdf-lite.js", "compress-pdf.js"],
  schemaDesc: "Free tool to compress PDF files to a target size such as 100 KB, 200 KB, 500 KB or 1 MB, with optional black and white.",
});

// PDF to Image
toolPage(tool("pdf-to-image"), {
  h1: "PDF to Image",
  lead: "Turn PDF pages into JPG or PNG images. Pick the pages you need, set the resolution, and download one image or all of them in a ZIP.",
  description: "Convert PDF pages to JPG or PNG images for free. Choose pages and resolution (up to 300 DPI), keep each JPG under a KB limit, and download one image or a ZIP. Nothing is uploaded.",
  workspace: `    <div class="tool" id="pdf2img">
      <div class="tool-grid">
        <div class="stage">
          <label class="drop" id="drop">
            ${icon("upload_file")}
            <strong>Choose a PDF</strong>
            <span class="sub">or drag it here.</span>
            <span class="btn btn-primary btn-sm drop-btn">${icon("upload")}Select PDF</span>
            <input id="file" type="file" accept="application/pdf,.pdf">
          </label>
          <div class="pdf-info" hidden>
            <span class="t-ico" style="--c:${C.sky}">${icon("picture_as_pdf")}</span>
            <div><b id="pdf-name"></b><span id="pdf-meta"></span></div>
            <button type="button" class="btn btn-ghost btn-sm" id="pick">${icon("swap_horiz")}Change</button>
          </div>
          <div class="pages" hidden>
            <div class="pages-head">
              <b id="sel-count">0 pages selected</b>
              <span class="sub">Tap a page to include or skip it</span>
              <span class="pages-actions">
                <button type="button" class="btn btn-ghost btn-sm" id="all">${icon("select_all")}All</button>
                <button type="button" class="btn btn-ghost btn-sm" id="none">${icon("deselect")}None</button>
              </span>
            </div>
            <ol class="thumbs" id="thumbs"></ol>
          </div>
          <p class="err" id="err" role="alert" hidden></p>
        </div>

        <div class="result">
          <h3>${icon("tune")} Settings</h3>
          <div class="fields">
            <label class="field">Format<select id="format"><option value="jpg">JPG</option><option value="png">PNG</option></select></label>
            <label class="field">Resolution<select id="dpi"><option value="96">96 DPI</option><option value="150" selected>150 DPI</option><option value="200">200 DPI</option><option value="300">300 DPI</option></select></label>
            <div class="kb-row wide">
              <label class="field">Max KB per image (JPG)<input id="maxkb" type="number" inputmode="numeric" min="10" placeholder="No limit"></label>
              ${kbChips([[100, "100 KB"], [200, "200 KB"], [300, "300 KB"], [500, "500 KB"]])}
            </div>
          </div>
          <ul class="facts">
            <li><span>Pages</span><b id="f-sel">—</b></li>
            <li><span>Image size</span><b id="f-px">—</b></li>
            <li><span>File size</span><b id="f-size">—</b></li>
          </ul>
          <p class="bg-status" id="status" hidden></p>
          <button type="button" class="btn btn-primary" id="make" disabled>${icon("photo_library")}Convert pages</button>
          <a class="btn btn-primary" id="dl" href="#" hidden>${icon("download")}Download</a>
        </div>
      </div>
      <p class="privacy-note">${icon("lock")} Your PDF is never uploaded. The images are made inside your browser.</p>
    </div>`,
  steps: [
    ["Choose your PDF.", "Pick it from your phone or computer, or drag it onto the box. Every page shows up as a preview."],
    ["Pick the pages.", "All pages are selected; tap any page to skip it. Or use the download button under a page to save just that one."],
    ["Choose format and resolution.", "JPG makes small files, PNG keeps text crispest. 150 DPI suits most uses; add a KB limit if a form asks for one."],
    ["Convert and download.", "One page downloads as an image; several come together in a ZIP file."],
  ],
  tips: [
    ["description", "Certificate for a form?", "Use JPG at 150 DPI with the KB limit from the form, for example 200 KB."],
    ["text_fields", "Lots of small text?", "PNG or 200–300 DPI keeps letters sharp."],
    ["folder_zip", "Opening the ZIP.", "On Android, tap the ZIP in Files and choose Extract. On a computer, double-click it."],
    ["picture_as_pdf", "Need it the other way?", "Image to PDF turns photos back into one PDF."],
  ],
  faqs: [
    ["How do I convert a PDF to JPG?", "Choose your PDF, keep JPG as the format, pick the pages you want and tap Convert. One page downloads as a JPG; several pages download together as a ZIP of JPGs."],
    ["Can I save just one page?", "Yes. Tap the download button under that page's preview, or select only that page and tap Convert."],
    ["How do I keep each image under 100 KB or 200 KB?", "Choose JPG and type the limit in Max KB per image (or tap a quick size). Each page is made as clear as possible while staying under the limit."],
    ["JPG or PNG, which is better?", "JPG files are much smaller and accepted almost everywhere. PNG keeps text perfectly sharp but files are larger. For online forms, JPG is usually the right choice."],
    ["Is my PDF uploaded anywhere?", "No. The pages are turned into images inside your browser. Your PDF never reaches our servers or anyone else's."],
    ["Is it really free?", "Yes, completely free. No account, no watermark, no page limit."],
  ],
  scripts: ["pdf-lite.js", "pdf2img.js"],
  appCategory: "MultimediaApplication",
  schemaDesc: "Free tool to convert PDF pages to JPG or PNG images, with page selection, resolution up to 300 DPI, a KB limit per image and ZIP download.",
});

// Merge PDF
toolPage(tool("merge-pdf"), {
  h1: "Merge PDF",
  lead: "Combine several PDFs, and photos too, into one PDF. Put them in any order; pages are copied exactly, so text stays sharp and selectable.",
  description: "Merge PDF files into one, free and private. Add PDFs and images, drag them into order, and download a single PDF. Pages aren't re-compressed, and nothing is uploaded.",
  workspace: `    <div class="tool" id="mergepdf">
      <div class="tool-grid">
        <div class="stage">
          <label class="drop" id="drop">
            ${icon("note_add")}
            <strong>Add PDFs to merge</strong>
            <span class="sub">Pick several at once, or drag them here. Images (JPG, PNG) work too.</span>
            <span class="btn btn-primary btn-sm drop-btn">${icon("upload")}Select files</span>
            <input id="file" type="file" accept="application/pdf,.pdf,image/*" multiple>
          </label>
          <div class="pages" hidden>
            <div class="pages-head">
              <b id="p-count">0 files</b>
              <span class="sub">Drag or use the arrows to set the order</span>
              <span class="pages-actions">
                <button type="button" class="btn btn-ghost btn-sm" id="add-more">${icon("add")}Add more</button>
                <button type="button" class="btn btn-ghost btn-sm" id="clear">${icon("delete")}Remove all</button>
              </span>
            </div>
            <ol class="thumbs" id="thumbs"></ol>
          </div>
          <p class="err" id="err" role="alert" hidden></p>
        </div>

        <div class="result">
          <h3>${icon("tune")} Merge</h3>
          <div class="fields">
            <label class="field wide">File name<input id="fname" type="text" placeholder="merged" maxlength="80"></label>
          </div>
          <ul class="facts">
            <li><span>Files</span><b id="f-files">—</b></li>
            <li><span>Pages</span><b id="f-pages">—</b></li>
            <li><span>File size</span><b id="f-size">—</b></li>
          </ul>
          <p class="bg-status" id="status" hidden></p>
          <button type="button" class="btn btn-primary" id="make" disabled>${icon("merge")}Merge PDF</button>
          <a class="btn btn-primary" id="dl" href="#" hidden>${icon("download")}Download PDF</a>
        </div>
      </div>
      <p class="privacy-note">${icon("lock")} Your files are never uploaded. They're merged inside your browser.</p>
    </div>`,
  steps: [
    ["Add your files.", "Select all the PDFs at once, or drag them in. You can mix in JPG or PNG images; each becomes a page."],
    ["Put them in order.", "Drag the files, or use the arrows. The merged PDF follows the order shown, left to right."],
    ["Merge and download.", "Name the file if you like, tap Merge PDF, then Download PDF."],
  ],
  tips: [
    ["text_fields", "Text stays text.", "Pages are copied as they are, so text remains searchable and nothing gets blurrier."],
    ["photo_library", "Mix in photos.", "Add a photo of a receipt or ID and it becomes an A4 page in the right spot."],
    ["compress", "Too big to email?", "Run the merged file through Compress PDF to shrink it."],
    ["call_split", "Need only some pages?", "Split PDF pulls out just the pages you want first."],
  ],
  faqs: [
    ["How do I merge PDF files into one?", "Add the PDFs (select several at once or drag them in), put them in order, and tap Merge PDF. Your merged file downloads as a single PDF."],
    ["Will the quality change?", "No. Pages are copied exactly as they are, without re-compressing, so text stays sharp and selectable and images keep their quality."],
    ["Can I merge images with PDFs?", "Yes. JPG and PNG images (and WebP) are added as A4 pages, sized to fit, in the position you put them."],
    ["Is there a limit on files or size?", "There's no set limit. Everything happens in your browser, so very large files depend on your device's memory; most phones handle dozens of normal PDFs easily."],
    ["Are my files uploaded anywhere?", "No. Merging happens inside your browser. Your files never reach our servers or anyone else's."],
    ["Can I merge password-protected PDFs?", "Not yet. Open the protected PDF, remove the password (or print it to a new PDF), then add that copy."],
    ["Is it really free?", "Yes. No account, no watermark, no limits."],
  ],
  scripts: ["pdf-lite.js", "merge-pdf.js"],
  schemaDesc: "Free private tool to merge PDF files and images into one PDF in the browser, keeping pages unchanged.",
});

// Split PDF
toolPage(tool("split-pdf"), {
  h1: "Split PDF",
  lead: "Take pages out of a PDF: pick the pages you need, split every page into its own PDF, or split by ranges like 1-3, 5, 8-end.",
  description: "Split a PDF for free: extract selected pages, save every page as a separate PDF, or split by page ranges. Pages are copied exactly, and nothing is uploaded.",
  workspace: `    <div class="tool" id="splitpdf">
      <div class="tool-grid">
        <div class="stage">
          <label class="drop" id="drop">
            ${icon("upload_file")}
            <strong>Choose a PDF</strong>
            <span class="sub">or drag it here.</span>
            <span class="btn btn-primary btn-sm drop-btn">${icon("upload")}Select PDF</span>
            <input id="file" type="file" accept="application/pdf,.pdf">
          </label>
          <div class="pdf-info" hidden>
            <span class="t-ico" style="--c:${C.sky}">${icon("picture_as_pdf")}</span>
            <div><b id="pdf-name"></b><span id="pdf-meta"></span></div>
            <button type="button" class="btn btn-ghost btn-sm" id="pick">${icon("swap_horiz")}Change</button>
          </div>
          <div class="pages" hidden>
            <div class="pages-head">
              <b id="sel-count"></b>
              <span class="pages-actions">
                <button type="button" class="btn btn-ghost btn-sm" id="all">${icon("select_all")}All</button>
                <button type="button" class="btn btn-ghost btn-sm" id="none">${icon("deselect")}None</button>
              </span>
            </div>
            <ol class="thumbs" id="thumbs"></ol>
          </div>
          <p class="err" id="err" role="alert" hidden></p>
        </div>

        <div class="result">
          <h3>${icon("tune")} Split</h3>
          <div class="levels" role="radiogroup" aria-label="How to split">
            <label class="lvl"><input type="radio" name="mode" value="select" checked><span><b>Pick pages</b><small>Tap pages; they become one PDF</small></span></label>
            <label class="lvl"><input type="radio" name="mode" value="each"><span><b>Every page</b><small>One PDF per page</small></span></label>
            <label class="lvl"><input type="radio" name="mode" value="ranges"><span><b>Custom ranges</b><small>One PDF per range</small></span></label>
            <label class="lvl"><input type="radio" name="mode" value="every"><span><b>Every N pages</b><small>Equal-size parts</small></span></label>
          </div>
          <div class="fields">
            <label class="field wide mode-extra" hidden>Ranges<input id="ranges" type="text" placeholder="1-3, 5, 8-end" autocomplete="off"></label>
            <label class="field wide mode-extra" hidden>Pages per PDF<input id="every" type="number" inputmode="numeric" min="1" value="2"></label>
          </div>
          <ul class="facts">
            <li><span>Output</span><b id="f-out">—</b></li>
            <li><span>Size</span><b id="f-size">—</b></li>
          </ul>
          <p class="bg-status" id="status" hidden></p>
          <button type="button" class="btn btn-primary" id="make" disabled>${icon("call_split")}Make PDF</button>
          <a class="btn btn-primary" id="dl" href="#" hidden>${icon("download")}Download</a>
        </div>
      </div>
      <p class="privacy-note">${icon("lock")} Your PDF is never uploaded. It's split inside your browser.</p>
    </div>`,
  steps: [
    ["Choose your PDF.", "Every page shows up as a preview."],
    ["Choose how to split.", "Pick pages (tap the ones you want), Every page, Custom ranges such as 1-3, 5, 8-end, or Every N pages."],
    ["Download.", "One result downloads as a PDF; several come together in a ZIP."],
  ],
  tips: [
    ["touch_app", "Remove pages.", "Pick pages, select All, then tap the pages you don't want. The result is your PDF without them."],
    ["format_list_numbered", "Ranges.", "Separate with commas: 1-3 is pages 1 to 3, 5 is just page 5, 8-end runs to the last page."],
    ["merge", "Rearranging?", "Split out the parts, then put them back together in a new order with Merge PDF."],
    ["folder_zip", "Opening the ZIP.", "On Android, tap the ZIP in Files and choose Extract. On a computer, double-click it."],
  ],
  faqs: [
    ["How do I extract pages from a PDF?", "Choose your PDF, keep Pick pages selected, tap the pages you want, and tap Make PDF. You get a new PDF with only those pages."],
    ["How do I split a PDF into separate pages?", "Choose Every page. Each page becomes its own PDF, and they download together in a ZIP."],
    ["How do I split by page ranges?", "Choose Custom ranges and type them separated by commas, for example 1-3, 4-6, 7-end. Each range becomes a separate PDF."],
    ["How do I delete pages from a PDF?", "Choose Pick pages, tap All, then tap the pages you want to remove so they're unselected. Make PDF gives you the PDF without them."],
    ["Does splitting lower the quality?", "No. Pages are copied exactly, so text stays sharp and selectable."],
    ["Are my files uploaded anywhere?", "No. Splitting happens inside your browser. Your PDF never reaches our servers or anyone else's."],
  ],
  scripts: ["pdf-lite.js", "split-pdf.js"],
  schemaDesc: "Free private tool to split PDF files: extract selected pages, split every page, by page ranges or every N pages.",
});

// Age calculator
toolPage(tool("age-calculator"), {
  h1: "Age Calculator",
  lead: "Your exact age in years, months and days on any date, such as a job circular's cut-off date. Add the age limit to see if you're eligible.",
  description: "Calculate your exact age in years, months and days on any date, like a job circular's cut-off date, and check it against the minimum and maximum age limit. Free.",
  workspace: `    <div class="tool" id="agecalc">
      <div class="tool-grid">
        <div class="stage">
          <div class="fields age-fields">
            <label class="field">Date of birth<input id="dob" type="date" min="1900-01-01" required></label>
            <label class="field">Age on (cut-off date)<input id="on" type="date" min="1900-01-01"></label>
            <div class="chips wide"><button type="button" data-on="today">${icon("today")}Today</button></div>
          </div>
          <div class="age-limit">
            <h4>${icon("rule")} Age limit from the circular <small>(optional)</small></h4>
            <div class="fields">
              <label class="field">Minimum age<input id="minage" type="number" inputmode="numeric" min="0" max="120" placeholder="e.g. 18"></label>
              <label class="field">Maximum age<input id="maxage" type="number" inputmode="numeric" min="0" max="120" placeholder="e.g. 30"></label>
              <div class="chips wide"><button type="button" data-range="18-30">18–30</button><button type="button" data-range="18-32">18–32</button><button type="button" data-range="18-35">18–35</button><button type="button" data-range="-">Clear</button></div>
            </div>
          </div>
          <p class="err" id="err" role="alert" hidden></p>
        </div>

        <div class="result age-result" aria-live="polite">
          <h3>${icon("cake")} Age</h3>
          <div class="age-big">
            <span><b id="a-y">—</b>years</span>
            <span><b id="a-m">—</b>months</span>
            <span><b id="a-d">—</b>days</span>
          </div>
          <p class="eligible" id="elig" hidden></p>
          <template>${icon("check_circle")}${icon("cancel")}</template>
          <ul class="facts">
            <li><span>Total months</span><b id="f-months">—</b></li>
            <li><span>Total weeks</span><b id="f-weeks">—</b></li>
            <li><span>Total days</span><b id="f-days">—</b></li>
            <li><span>Born on a</span><b id="f-born">—</b></li>
            <li><span>Next birthday</span><b id="f-next">—</b></li>
          </ul>
          <button type="button" class="btn btn-ghost" id="copy" disabled>${icon("content_copy")}Copy result</button>
        </div>
      </div>
      <p class="privacy-note">${icon("lock")} Nothing you enter leaves your device.</p>
    </div>`,
  steps: [
    ["Enter your date of birth.", "Use the date on your SSC certificate or NID, the one the application asks for."],
    ["Set the \"age on\" date.", "It starts at today. For a job, change it to the cut-off date written in the circular."],
    ["Add the age limit (optional).", "Type the minimum and maximum age from the circular to see whether you're eligible, and the range of birth dates that qualify."],
  ],
  tips: [
    ["event", "Use the circular's date.", "Age limits are counted on a fixed date in the circular, not on the day you apply."],
    ["badge", "Match your documents.", "Use the same date of birth that's on the certificate you'll upload."],
    ["content_copy", "Keep a note.", "Copy result gives you a short summary to save or share."],
    ["photo_size_select_large", "Applying now?", "The photo & signature resizer gets your 300×300 photo and 300×80 signature ready."],
  ],
  faqs: [
    ["How do I check my age for a job circular?", "Enter your date of birth, set \"Age on\" to the cut-off date from the circular, and type the minimum and maximum age. The tool shows your exact age on that date and whether you're within the limit."],
    ["What does \"maximum age 30\" mean here?", "This calculator reads it strictly: on the cut-off date you can be at most exactly 30 years, 0 months and 0 days. If you're even a day older, it shows how much you're over. Some circulars word their limits differently, so always follow the circular's own wording."],
    ["How is the age counted?", "In whole calendar years and months, then the remaining days, the way it's done on official forms. For example, from 15 March 2000 to 1 January 2026 is 25 years, 9 months and 17 days."],
    ["What if I was born on 29 February?", "In years without 29 February, your birthday is counted as 28 February."],
    ["Is my date of birth saved or sent anywhere?", "No. The calculation happens on your device, and nothing is stored or sent."],
  ],
  scripts: ["agecalc.js"],
  schemaDesc: "Free calculator for exact age in years, months and days on any date, with a check against a job circular's minimum and maximum age.",
});

// 404
page("404", "Page not found", "This page doesn't exist.",
  `    <div class="notfound">
      <div class="code reveal">404</div>
      <h1 class="reveal">This page got lost.</h1>
      <p class="reveal">Unlike your documents in Memento. Let's get you back on track.</p>
      <div class="cta reveal">${btn("/", "Go home", "primary", "home")}${btn("/features", "See features", "ghost")}</div>
    </div>`);

// ---------- Render ----------
const rendered = pages.map((p) => ({ ...p, html: p.shell === "tools" ? toolsLayout(p) : layout(p) }));

// Load only the icons the site uses (Google Fonts needs the list sorted)
const names = new Set();
for (const p of rendered) for (const m of p.html.matchAll(/<span class="ms[^"]*" aria-hidden="true">([a-z0-9_]+)<\/span>/g)) names.add(m[1]);
const iconUrl = `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..500,0..1,0&amp;icon_names=${[...names].sort().join(",")}&amp;display=block`;

for (const p of rendered) {
  fs.mkdirSync(path.dirname(path.join(__dirname, p.slug)), { recursive: true });
  fs.writeFileSync(path.join(__dirname, `${p.slug}.html`), p.html.replace("__ICON_FONT__", iconUrl));
}

// Sitemap + robots
const listed = rendered.filter((p) => p.slug !== "404");
fs.writeFileSync(path.join(__dirname, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  listed.map((p) => `  <url><loc>${urlOf(p.slug)}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(__dirname, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built ${rendered.length} pages: ${rendered.map((p) => urlOf(p.slug).slice(SITE.length)).join(" ")}`);
console.log(`Legal: privacy ${nPrivacy} sections, terms ${nTerms} sections. Icons: ${names.size}`);
