// PDF to Image (/tools/pdf-to-image): every chosen page becomes a JPG or PNG, made with pdf.js in
// the browser. One page downloads straight away; several come as a ZIP. Nothing is uploaded.
(() => {
  const root = document.getElementById("pdf2img");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const drop = $("#drop"), fileInput = $("#file"), info = $(".pdf-info"), fName = $("#pdf-name"), fMeta = $("#pdf-meta");
  const pagesBox = $(".pages"), thumbs = $("#thumbs"), selCount = $("#sel-count");
  const format = $("#format"), dpi = $("#dpi"), maxkb = $("#maxkb"), kbRow = $(".kb-row");
  const make = $("#make"), dl = $("#dl"), status = $("#status"), err = $("#err"), fSel = $("#f-sel"), fPx = $("#f-px"), fSize = $("#f-size");

  let doc = null, file = null, sizes = [], selected = new Set(), outUrl = "", thumbJob = 0;
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const kb = (b) => (b >= 1e6 ? (b / 1e6).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");
  const base = () => (file ? file.name.replace(/\.pdf$/i, "") : "page").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60) || "page";

  async function open(f) {
    showError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) { showError("Choose a PDF file."); return; }
    setStatus("Opening the PDF…");
    try {
      if (doc) { doc.destroy(); doc = null; }
      doc = await MiniPDF.openPdf(f);
      file = f;
      sizes = [];
      for (let i = 1; i <= doc.numPages; i++) { const v = (await doc.getPage(i)).getViewport({ scale: 1 }); sizes.push([v.width, v.height]); }
      selected = new Set(sizes.map((_, i) => i));
      fName.textContent = f.name;
      fMeta.textContent = `${doc.numPages} page${doc.numPages === 1 ? "" : "s"} · ${kb(f.size)}`;
      info.hidden = false;
      drop.classList.add("compact");
      setStatus("");
      buildThumbs();
    } catch (e) {
      setStatus("");
      doc = file = null;
      info.hidden = pagesBox.hidden = true;
      drop.classList.remove("compact");
      showError(e && e.name === "PasswordException"
        ? "This PDF is password-protected. Remove the password first, then try again."
        : "This PDF couldn't be opened. It may be damaged, or the tool couldn't load. Check your connection and try again.");
    }
    stale();
  }

  // ---------- Page thumbnails (drawn one by one so big PDFs stay responsive) ----------
  function buildThumbs() {
    const job = ++thumbJob;
    pagesBox.hidden = false;
    thumbs.innerHTML = "";
    sizes.forEach((_, i) => {
      const li = document.createElement("li");
      li.className = "thumb pick";
      li.dataset.i = i;
      li.innerHTML = `<label class="thumb-img"><input type="checkbox" checked aria-label="Page ${i + 1}"><span class="thumb-wait"></span></label>
        <span class="thumb-n">${i + 1}</span>
        <div class="thumb-bar"><span class="thumb-label">Page ${i + 1}</span><button type="button" data-act="one" aria-label="Download page ${i + 1}"><span class="ms">download</span></button></div>`;
      thumbs.appendChild(li);
    });
    syncSelection();
    (async () => {
      for (let i = 0; i < sizes.length; i++) {
        if (job !== thumbJob) return;
        const { canvas } = await MiniPDF.renderPage(doc, i + 1, 220 / Math.max(...sizes[i]));
        if (job !== thumbJob) return;
        const slot = thumbs.children[i]?.querySelector(".thumb-wait");
        if (slot) slot.replaceWith(Object.assign(document.createElement("img"), { src: canvas.toDataURL("image/jpeg", 0.8), alt: `Page ${i + 1}` }));
      }
    })().catch(() => {});
  }

  function syncSelection() {
    [...thumbs.children].forEach((li) => {
      const on = selected.has(Number(li.dataset.i));
      li.classList.toggle("off", !on);
      li.querySelector("input").checked = on;
    });
    selCount.textContent = `${selected.size} of ${sizes.length} page${sizes.length === 1 ? "" : "s"} selected`;
    stale();
  }
  thumbs.addEventListener("change", (e) => {
    const li = e.target.closest(".thumb");
    if (!li) return;
    const i = Number(li.dataset.i);
    if (e.target.checked) selected.add(i); else selected.delete(i);
    syncSelection();
  });
  $("#all").addEventListener("click", () => { selected = new Set(sizes.map((_, i) => i)); syncSelection(); });
  $("#none").addEventListener("click", () => { selected.clear(); syncSelection(); });

  // ---------- Settings ----------
  function stale() {
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ""; }
    dl.hidden = true;
    make.hidden = false;
    make.disabled = !doc || !selected.size;
    const n = selected.size;
    make.lastChild.textContent = n > 1 ? `Convert ${n} pages` : "Convert page";
    kbRow.hidden = format.value !== "jpg";
    fSel.textContent = doc ? String(n) : "—";
    const first = [...selected].sort((a, b) => a - b)[0];
    const k = Number(dpi.value) / 72;
    fPx.textContent = first !== undefined ? `${Math.floor(sizes[first][0] * k)} × ${Math.floor(sizes[first][1] * k)} px` : "—";
    fSize.textContent = "—";
    fSize.className = "";
  }
  [format, dpi, maxkb].forEach((el) => el.addEventListener("input", stale));
  root.querySelectorAll("[data-kb]").forEach((b) => b.addEventListener("click", () => { maxkb.value = b.dataset.kb; stale(); }));

  // One page as an image file, shrunk to the KB limit if there is one (JPG only)
  async function pageImage(i) {
    const { canvas } = await MiniPDF.renderPage(doc, i + 1, Number(dpi.value) / 72);
    if (format.value === "png") {
      const b = await new Promise((r) => canvas.toBlob(r, "image/png"));
      canvas.width = canvas.height = 0;
      return { data: new Uint8Array(await b.arrayBuffer()), fits: true };
    }
    const limit = Number(maxkb.value) > 0 ? Number(maxkb.value) * 1000 : 0;
    let c = canvas, q = 0.9, data = await MiniPDF.jpeg(c, q);
    for (let t = 0; limit && data.length > limit && t < 8; t++) {
      const ratio = limit / data.length;
      if (q > 0.55) q = Math.max(0.5, q - (ratio < 0.5 ? 0.3 : 0.15));
      else {
        const s = Math.max(0.5, Math.min(0.92, Math.sqrt(ratio) * 0.95));
        const smaller = document.createElement("canvas");
        smaller.width = Math.max(1, Math.round(c.width * s));
        smaller.height = Math.max(1, Math.round(c.height * s));
        const x = smaller.getContext("2d");
        x.imageSmoothingQuality = "high";
        x.drawImage(c, 0, 0, smaller.width, smaller.height);
        if (c !== canvas) c.width = c.height = 0;
        c = smaller;
      }
      data = await MiniPDF.jpeg(c, q);
    }
    canvas.width = canvas.height = 0;
    return { data, fits: !limit || data.length <= limit };
  }

  const fileName = (i) => `${base()}-page-${i + 1}.${format.value}`;
  const type = () => (format.value === "png" ? "image/png" : "image/jpeg");

  async function run(pages) {
    showError("");
    make.disabled = true;
    try {
      const files = [];
      let misses = 0, total = 0;
      for (let k = 0; k < pages.length; k++) {
        setStatus(`Converting page ${pages[k] + 1} (${k + 1} of ${pages.length})…`);
        const { data, fits } = await pageImage(pages[k]);
        if (!fits) misses++;
        total += data.length;
        files.push({ name: fileName(pages[k]), data });
      }
      setStatus(pages.length > 1 ? "Packing the ZIP…" : "");
      const blob = files.length > 1 ? MiniZip.zip(files) : new Blob([files[0].data], { type: type() });
      setStatus("");
      return { blob, name: files.length > 1 ? `${base()}-images.zip` : files[0].name, misses, total, count: files.length };
    } finally {
      make.disabled = !doc || !selected.size;
    }
  }

  make.addEventListener("click", async () => {
    if (!doc || !selected.size) return;
    try {
      const r = await run([...selected].sort((a, b) => a - b));
      outUrl = URL.createObjectURL(r.blob);
      dl.href = outUrl;
      dl.download = r.name;
      dl.lastChild.textContent = r.count > 1 ? `Download ZIP (${r.count} images)` : "Download image";
      dl.hidden = false;
      make.hidden = true;
      fSize.textContent = r.count > 1 ? `${kb(r.total)} in total` : kb(r.total);
      fSize.className = r.misses ? "bad" : "ok";
      if (r.misses) showError(`${r.misses} image${r.misses > 1 ? "s are" : " is"} still over ${maxkb.value} KB at the lowest readable quality. Try a lower resolution.`);
    } catch {
      setStatus("");
      showError("Something went wrong while converting. Try a lower resolution or fewer pages.");
    }
  });

  // Download a single page straight from its thumbnail
  thumbs.addEventListener("click", async (e) => {
    const b = e.target.closest('button[data-act="one"]');
    if (!b || !doc) return;
    try {
      const r = await run([Number(b.closest(".thumb").dataset.i)]);
      const url = URL.createObjectURL(r.blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: r.name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setStatus("");
      showError("Something went wrong while converting that page.");
    }
  });

  fileInput.addEventListener("change", () => { open(fileInput.files[0]); fileInput.value = ""; });
  $("#pick").addEventListener("click", () => fileInput.click());
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { e.preventDefault(); open(e.dataTransfer?.files?.[0]); });
  stale();
})();
