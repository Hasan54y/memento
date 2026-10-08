// Document Tamper Check (/tools/tamper-check): looks for signs that a PDF or photo was edited after
// it was made. PDFs: later saves (incremental updates), editing software, date gaps, odd fonts
// (marked on the page), the same font embedded twice, added annotations. Photos: editing software,
// date mismatches and an error level analysis heatmap. Signs, not proof; all in the browser.
(() => {
  const root = document.getElementById("tamper");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const drop = $("#drop"), fileInput = $("#file"), result = $(".tc-result"), verdict = $("#verdict"), findingsEl = $("#findings");
  const visual = $("#visual"), details = $("#details"), fileInfo = $("#tc-file"), status = $("#status"), err = $("#err");
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const size = (b) => (b >= 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");

  // Programs that edit PDFs or photos (matched case-insensitively against creator/producer/software),
  // and programs people write documents in (normal for letters, unusual for bank statements)
  const EDITORS = ["photoshop", "gimp", "lightroom", "snapseed", "picsart", "canva", "pixlr", "affinity", "paint.net", "fotor", "meitu",
    "acrobat pro", "acrobat standard", "ilovepdf", "smallpdf", "sejda", "pdfescape", "foxit", "pdf-xchange", "nitro", "pdfelement", "wondershare",
    "pdffiller", "dochub", "pdf candy", "soda pdf", "pdf24", "pdf expert", "inkscape"];
  const AUTHORING = [["word", "Microsoft Word"], ["excel", "Microsoft Excel"], ["libreoffice", "LibreOffice"], ["openoffice", "OpenOffice"], ["google docs", "Google Docs"],
    ["pages", "Apple Pages"], ["indesign", "InDesign"], ["illustrator", "Illustrator"]];
  const editorIn = (s) => { const l = String(s || "").toLowerCase(); return EDITORS.find((e) => l.includes(e)); };
  const authoredIn = (s) => { const l = String(s || "").toLowerCase(); return (AUTHORING.find(([k]) => new RegExp(`\\b${k}\\b`).test(l)) || [])[1]; };
  const SYMBOL_FONT = /symbol|dingbat|wingding|webding|zapf|fontawesome|material|marlett/i;
  const fmtDate = (d) => (d ? d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

  // ---------- PDF ----------
  function pdfDate(s) {
    const m = /D?:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+\-])?(\d{2})?'?(\d{2})?/.exec(String(s || ""));
    if (!m) return null;
    const [, y, mo = "01", d = "01", h = "00", mi = "00", se = "00", z, oh = "00", om = "00"] = m;
    let t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +se);
    if (z === "+" || z === "-") t -= (z === "+" ? 1 : -1) * (+oh * 60 + +om) * 60000;
    return isNaN(t) ? null : new Date(t);
  }
  const family = (name) => String(name || "").replace(/^[A-Z]{6}\+/, "").split(/[-,]/)[0].replace(/(MT|PS|PSMT|Std|Pro)$/i, "").toLowerCase().trim();

  async function checkPdf(file) {
    const bytes = new Uint8Array(await file.arrayBuffer()), raw = new TextDecoder("latin1").decode(bytes);
    const eofs = (raw.match(/%%EOF/g) || []).length, linearized = /\/Linearized\s/.test(raw.slice(0, 2048));
    const saves = Math.max(0, eofs - 1 - (linearized ? 1 : 0)), signed = /\/ByteRange\s*\[/.test(raw);
    setStatus("Reading the document…");
    const doc = await MiniPDF.openPdf(file, { fontExtraProperties: true });
    const meta = await doc.getMetadata().catch(() => ({}));
    const info = meta.info || {}, xmpRaw = meta.metadata && meta.metadata.getRaw ? meta.metadata.getRaw() : "";
    const history = [...String(xmpRaw).matchAll(/softwareAgent[=">\s]+([^"<]+)/g)].map((m) => m[1].trim());
    const created = pdfDate(info.CreationDate), modified = pdfDate(info.ModDate);

    // Fonts, page by page: characters per font family, and which embedded copies were used
    const fam = new Map(), subsets = new Map(), annots = { FreeText: 0, Stamp: 0, Ink: 0, Square: 0, Widget: 0 }, items = [];
    let chars = 0;
    const pages = Math.min(doc.numPages, 40);
    for (let n = 1; n <= pages; n++) {
      setStatus(`Checking page ${n} of ${pages}…`);
      const page = await doc.getPage(n);
      await page.getOperatorList();
      const tc = await page.getTextContent();
      for (const it of tc.items) {
        const len = (it.str || "").replace(/\s/g, "").length;
        if (!len) continue;
        let name = "";
        try { if (page.commonObjs.has(it.fontName)) name = page.commonObjs.get(it.fontName).name || ""; } catch { /* not loaded */ }
        name = name || (tc.styles[it.fontName] && tc.styles[it.fontName].fontFamily) || it.fontName;
        const f = family(name);
        const e = fam.get(f) || { chars: 0, pages: new Set(), name };
        e.chars += len; e.pages.add(n); fam.set(f, e);
        const pre = /^([A-Z]{6})\+/.exec(name);
        if (pre) { const k = `${name.slice(7)}|${n}`, set = subsets.get(k) || new Set(); set.add(pre[1]); subsets.set(k, set); }
        items.push({ page: n, f, it, len });
        chars += len;
      }
      for (const a of await page.getAnnotations().catch(() => [])) if (a.subtype in annots) annots[a.subtype]++;
      page.cleanup();
    }

    const F = [];
    const tool = editorIn(info.Producer) || editorIn(info.Creator) || history.map(editorIn).find(Boolean);
    if (saves > 0) F.push(signed
      ? ["warn", `Saved ${saves} more time${saves > 1 ? "s" : ""} after it was created`, "This PDF is digitally signed, and signing adds a save. Check the signature in a PDF reader: a valid signature means nothing changed after signing."]
      : [tool ? "bad" : "warn", `Saved ${saves} more time${saves > 1 ? "s" : ""} after it was created`, "A PDF keeps each later save as a separate layer at the end of the file. Bank and official systems usually produce a PDF in one go; later saves often mean it was opened in an editor (filling in a form can do this too)."]);
    const authored = authoredIn(info.Creator) || authoredIn(info.Producer);
    if (tool) F.push([editorIn(info.Producer) || history.some(editorIn) ? "bad" : "warn", `Handled by editing software (${tool})`,
      `The file's details mention ${esc(editorIn(info.Producer) ? info.Producer : editorIn(info.Creator) ? info.Creator : history.join(", "))}. Documents straight from a bank or an official system usually name that system instead.`]);
    else if (authored) F.push(["info", `Made in ${authored}`, `That's normal for letters, CVs and forms people write themselves. Statements, payslips and certificates are usually produced by the bank's, employer's or office's own system instead.`]);
    if (created && modified && modified - created > 3600000) F.push(["warn", `Changed ${days(modified - created)} after it was created`, `Created ${fmtDate(created)}, last changed ${fmtDate(modified)}.`]);

    const famList = [...fam.entries()].sort((a, b) => b[1].chars - a[1].chars);
    const odd = chars > 150 ? famList.filter(([, e], i) => i > 0 && e.chars <= Math.max(40, chars * 0.03) && !SYMBOL_FONT.test(e.name)) : [];
    const oddItems = items.filter((x) => odd.some(([f]) => f === x.f));
    // Changed amounts, dates and numbers are what forgers usually go for
    if (oddItems.length) F.push([oddItems.some((x) => /\d/.test(x.it.str)) ? "bad" : "warn", `A few words use a different font (${odd.map(([, e]) => esc(e.name.replace(/^[A-Z]{6}\+/, ""))).join(", ")})`,
      `Most of the text uses ${esc(famList[0][1].name.replace(/^[A-Z]{6}\+/, ""))}, but ${oddItems.reduce((n, x) => n + x.len, 0)} characters use another font. Text typed in later with an editor often looks like this, though signatures, logos and headings can use their own fonts too. They're marked in red below.`]);
    // Two embedded copies of one font on the same page (per-page copies are normal for some printers)
    const dup = [...new Set([...subsets.entries()].filter(([, s]) => s.size > 1).map(([k]) => k.split("|")[0]))];
    if (dup.length) F.push(["warn", "The same font is embedded more than once", `${dup.map(esc).join(", ")} appears as separate copies on the same page. That happens when text is added by a second program, though some systems do it normally.`]);
    const added = annots.FreeText + annots.Stamp + annots.Ink + annots.Square;
    if (added) F.push(["warn", `${added} mark${added > 1 ? "s" : ""} added on top of the page`, "Text boxes, stamps or drawings sit on top of the page as annotations, so they can be added by anyone after the document was made."]);
    if (!chars) F.push(["info", "No text in this PDF", "It's made of page images (a scan or a photo), so fonts can't be checked. Run the page images through this tool as photos instead."]);

    const D = [["Pages", doc.numPages], ["Created with", info.Creator || "—"], ["Saved by", info.Producer || "—"], ["Created", fmtDate(created)], ["Last changed", fmtDate(modified)],
      ["Later saves", saves], ["Digitally signed", signed ? "Yes" : "No"], ["Fonts", famList.map(([, e]) => e.name.replace(/^[A-Z]{6}\+/, "")).slice(0, 8).join(", ") || "—"],
      ["Edit history", history.length ? history.join(" → ") : "—"], ["Form fields", annots.Widget || "—"]];

    // Mark the odd-font text on up to 3 pages
    visual.innerHTML = "";
    const markPages = [...new Set(oddItems.map((x) => x.page))].slice(0, 3);
    for (const n of markPages) {
      const page = await doc.getPage(n), base = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(2, 900 / base.width) });
      const c = Object.assign(document.createElement("canvas"), { width: Math.floor(vp.width), height: Math.floor(vp.height) }), x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, canvas: c, viewport: vp }).promise;
      x.strokeStyle = "#d4210f"; x.lineWidth = 3; x.fillStyle = "rgba(212, 33, 15, .12)";
      const box = [Infinity, Infinity, 0, 0];
      for (const { it } of oddItems.filter((o) => o.page === n)) {
        const t = it.transform, h = it.height || Math.hypot(t[2], t[3]);
        const [x1, y1] = vp.convertToViewportPoint(t[4], t[5] - h * 0.25), [x2, y2] = vp.convertToViewportPoint(t[4] + it.width, t[5] + h);
        const rx = Math.min(x1, x2) - 3, ry = Math.min(y1, y2) - 3, rw = Math.abs(x2 - x1) + 6, rh = Math.abs(y2 - y1) + 6;
        x.fillRect(rx, ry, rw, rh); x.strokeRect(rx, ry, rw, rh);
        box[0] = Math.min(box[0], rx); box[1] = Math.min(box[1], ry); box[2] = Math.max(box[2], rx + rw); box[3] = Math.max(box[3], ry + rh);
      }
      // A close-up around the marks first (the whole page is small on a phone), then the page
      const cx = Math.max(0, Math.min(box[0] - 220, box[2] + 220 - 560)), cy = Math.max(0, box[1] - 90);
      const cw = Math.min(c.width - cx, Math.max(560, box[2] - box[0] + 440)), ch = Math.min(c.height - cy, box[3] - box[1] + 180);
      const zoom = Object.assign(document.createElement("canvas"), { width: Math.round(cw), height: Math.round(ch) });
      zoom.getContext("2d").drawImage(c, cx, cy, cw, ch, 0, 0, zoom.width, zoom.height);
      const close = figure(zoom, `Page ${n}, close-up: text in a different font is marked in red`), fig = figure(c, `Page ${n}`);
      close.className = "tc-zoom"; fig.className = "tc-page";
      visual.append(close, fig);
      page.cleanup();
    }
    MiniPDF.closePdf(doc);
    return { F, D, meta: `PDF · ${doc.numPages} page${doc.numPages === 1 ? "" : "s"} · ${size(file.size)}` };
  }
  const days = (ms) => { const d = ms / 86400000; return d < 1 ? `${Math.round(ms / 3600000)} hours` : d < 60 ? `${Math.round(d)} days` : d < 730 ? `${Math.round(d / 30.4)} months` : `${(d / 365.25).toFixed(1)} years`; };

  // ---------- Photos ----------
  // Minimal EXIF reader: the text tags that matter here
  function exif(bytes) {
    const out = {}, v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (v.getUint16(0) !== 0xffd8) return out;
    let p = 2;
    while (p + 4 < bytes.length) {
      if (bytes[p] !== 0xff) break;
      const marker = bytes[p + 1], len = v.getUint16(p + 2);
      if (marker === 0xe1 && String.fromCharCode(...bytes.subarray(p + 4, p + 8)) === "Exif") {
        const t = p + 10, le = v.getUint16(t) === 0x4949, u16 = (o) => v.getUint16(t + o, le), u32 = (o) => v.getUint32(t + o, le);
        const NAMES = { 0x010f: "Make", 0x0110: "Model", 0x0131: "Software", 0x0132: "DateTime", 0x9003: "DateTimeOriginal", 0x9004: "DateTimeDigitized" };
        const readIfd = (off) => {
          const n = u16(off);
          for (let i = 0; i < n; i++) {
            const e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), count = u32(e + 4);
            if (tag === 0x8769) readIfd(u32(e + 8));
            else if (NAMES[tag] && type === 2) {
              const at = count > 4 ? t + u32(e + 8) : t + e + 8;
              out[NAMES[tag]] = new TextDecoder().decode(bytes.subarray(at, at + count)).replace(/\0+$/, "").trim();
            }
          }
        };
        try { readIfd(u32(4)); } catch { /* damaged EXIF */ }
      }
      if (marker === 0xda) break;
      p += 2 + len;
    }
    return out;
  }
  const exifDate = (s) => { const m = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null; };

  async function checkImage(file) {
    const bytes = new Uint8Array(await file.arrayBuffer()), raw = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 400000)));
    const ex = exif(bytes);
    const png = [...raw.matchAll(/tEXt(Software|Creation Time|Comment)\0([^\0]{1,120})/g)].map((m) => [m[1], m[2]]);
    const xmpTool = (/CreatorTool[=">\s]+([^"<]+)/.exec(raw) || [])[1];
    const hist = [...raw.matchAll(/softwareAgent[=">\s]+([^"<]+)/g)].map((m) => m[1].trim());
    const software = ex.Software || (png.find(([k]) => k === "Software") || [])[1] || xmpTool || "";
    const F = [];
    const tool = editorIn(software) || hist.map(editorIn).find(Boolean) || (/photoshop:/i.test(raw) ? "photoshop" : "");
    if (tool) F.push(["bad", `Saved by editing software (${tool})`, `The photo's details mention ${esc(software || hist.join(", ") || "Adobe Photoshop")}. Camera and phone photos normally name the camera's own software.`]);
    const taken = exifDate(ex.DateTimeOriginal), changed = exifDate(ex.DateTime);
    if (taken && changed && Math.abs(changed - taken) > 120000) F.push(["warn", `Changed ${days(Math.abs(changed - taken))} after it was taken`, `Taken ${fmtDate(taken)}, saved again ${fmtDate(changed)}.`]);
    if (!ex.Make && !ex.Model && !software) F.push(["info", "No camera details", "Screenshots, messaging apps and many websites remove these details, so this alone doesn't mean the photo was edited."]);

    // Error level analysis: save again as JPEG and show where the picture changes most
    setStatus("Running error level analysis…");
    const bmp = await createImageBitmap(file), k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const a = Object.assign(document.createElement("canvas"), { width: w, height: h }), ax = a.getContext("2d", { willReadFrequently: true });
    ax.drawImage(bmp, 0, 0, w, h); bmp.close();
    const resaved = await createImageBitmap(await new Promise((r) => a.toBlob(r, "image/jpeg", 0.9)));
    const b = Object.assign(document.createElement("canvas"), { width: w, height: h }), bx = b.getContext("2d", { willReadFrequently: true });
    bx.drawImage(resaved, 0, 0); resaved.close();
    const A = ax.getImageData(0, 0, w, h), B = bx.getImageData(0, 0, w, h), E = bx.createImageData(w, h);
    // Scale so the brightest 0.5% of the picture is fully lit, whatever the photo's quality
    const diff = new Uint16Array(w * h), levels = new Uint32Array(766);
    for (let i = 0; i < w * h; i++) {
      const j = i * 4, d = Math.abs(A.data[j] - B.data[j]) + Math.abs(A.data[j + 1] - B.data[j + 1]) + Math.abs(A.data[j + 2] - B.data[j + 2]);
      diff[i] = d; levels[d]++;
    }
    let top = 765;
    for (let n = 0, stop = w * h * 0.005; top > 0 && (n += levels[top]) < stop; top--);
    const gain = 255 / Math.max(top, 6);
    for (let i = 0; i < w * h; i++) { const v = Math.min(255, diff[i] * gain), j = i * 4; E.data[j] = v; E.data[j + 1] = v * 0.55; E.data[j + 2] = v * 0.2; E.data[j + 3] = 255; }
    bx.putImageData(E, 0, 0);
    visual.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "tc-ela";
    wrap.append(figure(a, "Photo"), figure(b, "Error level analysis"));
    visual.appendChild(wrap);
    visual.insertAdjacentHTML("beforeend", `<p class="note"><span class="ms" aria-hidden="true">info</span> In the heatmap, a photo straight from a camera looks evenly textured. An area that glows much brighter or darker than similar surfaces around it (a number, a name, a pasted object) may have been changed. Edges and fine detail always glow a little.</p>`);

    const D = [["Size", `${Math.round(w / k)} × ${Math.round(h / k)} px · ${size(file.size)}`], ["Camera", [ex.Make, ex.Model].filter(Boolean).join(" ") || "—"],
      ["Software", software || "—"], ["Taken", fmtDate(taken)], ["Saved", fmtDate(changed)], ["Edit history", hist.length ? hist.join(" → ") : "—"]];
    return { F, D, meta: `${file.type.replace("image/", "").toUpperCase() || "Image"} · ${size(file.size)}` };
  }
  function figure(c, label) {
    const f = document.createElement("figure");
    f.appendChild(c);
    f.insertAdjacentHTML("beforeend", `<figcaption>${label}</figcaption>`);
    return f;
  }

  // ---------- Report ----------
  async function check(file) {
    if (!file) return;
    showError("");
    result.hidden = true;
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isPdf && !file.type.startsWith("image/")) { showError("Choose a PDF or a photo (JPG, PNG or WebP)."); return; }
      const r = isPdf ? await checkPdf(file) : await checkImage(file);
      setStatus("");
      const bad = r.F.filter((f) => f[0] === "bad").length, warn = r.F.filter((f) => f[0] === "warn").length;
      verdict.className = `verdict ${bad ? "bad" : warn ? "warn" : "ok"}`;
      verdict.innerHTML = `<span class="ms" aria-hidden="true">${bad ? "report" : warn ? "warning" : "verified"}</span><span>${bad
        ? `<b>Signs of editing found.</b> ${bad + warn} thing${bad + warn > 1 ? "s" : ""} worth checking below.`
        : warn ? `<b>Some things worth a closer look.</b> They can have harmless causes; see below.`
        : isPdf ? `<b>No signs of editing found.</b> That's a good sign, but not proof: a careful forger can hide their tracks.`
        : `<b>No signs of editing in the photo's details.</b> Look over the heatmap below too: it can show changes the details don't.`}</span>`;
      findingsEl.innerHTML = r.F.length ? r.F.map(([lvl, title, text]) => `<li class="${lvl}"><span class="ms" aria-hidden="true">${lvl === "bad" ? "error" : lvl === "warn" ? "warning" : "info"}</span><div><b>${title}</b><p>${text}</p></div></li>`).join("")
        : `<li class="ok"><span class="ms" aria-hidden="true">check_circle</span><div><b>Nothing unusual</b><p>No later saves, editing software, odd fonts or added marks were found.</p></div></li>`;
      details.innerHTML = r.D.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join("");
      fileInfo.innerHTML = `<b>${esc(file.name)}</b><span>${r.meta}</span>`;
      result.hidden = false;
      drop.classList.add("compact");
    } catch (e) {
      setStatus("");
      showError(e && e.name === "PasswordException" ? "This PDF is password-protected. Remove the password first, then check it." : "This file couldn't be checked. It may be damaged or in a format this tool can't read.");
    }
  }

  fileInput.addEventListener("change", () => { check(fileInput.files[0]); fileInput.value = ""; });
  $("#pick").addEventListener("click", () => fileInput.click());
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { e.preventDefault(); check(e.dataTransfer?.files?.[0]); });
})();
