// Split PDF (/tools/split-pdf): pull pages out of a PDF as new PDFs in the browser. Pages are
// copied as they are with pdf-lib, so nothing is re-drawn. Several PDFs come as a ZIP.
(() => {
  const root = document.getElementById("splitpdf");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const drop = $("#drop"), fileInput = $("#file"), info = $(".pdf-info"), fName = $("#pdf-name"), fMeta = $("#pdf-meta");
  const pagesBox = $(".pages"), thumbs = $("#thumbs"), selCount = $("#sel-count"), selActions = $(".pages-actions");
  const modes = [...root.querySelectorAll("[name=mode]")], ranges = $("#ranges"), everyN = $("#every");
  const make = $("#make"), dl = $("#dl"), status = $("#status"), err = $("#err"), fOut = $("#f-out"), fSize = $("#f-size");

  let doc = null, file = null, count = 0, selected = new Set(), outUrl = "", thumbJob = 0;
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const kb = (b) => (b >= 1e6 ? (b / 1e6).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");
  const mode = () => modes.find((r) => r.checked).value;
  const base = () => (file ? file.name.replace(/\.pdf$/i, "") : "document").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60) || "document";

  async function open(f) {
    showError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) { showError("Choose a PDF file."); return; }
    setStatus("Opening the PDF…");
    try {
      if (doc) { doc.destroy(); doc = null; }
      doc = await MiniPDF.openPdf(f);
      file = f;
      count = doc.numPages;
      selected = new Set();
      fName.textContent = f.name;
      fMeta.textContent = `${count} page${count === 1 ? "" : "s"} · ${kb(f.size)}`;
      info.hidden = false;
      drop.classList.add("compact");
      setStatus("");
      buildThumbs();
    } catch (e) {
      setStatus("");
      doc = file = null;
      count = 0;
      info.hidden = pagesBox.hidden = true;
      drop.classList.remove("compact");
      showError(e && e.name === "PasswordException"
        ? "This PDF is password-protected. Remove the password first, then try again."
        : "This PDF couldn't be opened. It may be damaged, or the tool couldn't load. Check your connection and try again.");
    }
    sync();
  }

  function buildThumbs() {
    const job = ++thumbJob;
    pagesBox.hidden = false;
    thumbs.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const li = document.createElement("li");
      li.className = "thumb pick off";
      li.dataset.i = i;
      li.innerHTML = `<label class="thumb-img"><input type="checkbox" aria-label="Page ${i + 1}"><span class="thumb-wait"></span></label>
        <span class="thumb-n">${i + 1}</span>`;
      thumbs.appendChild(li);
    }
    (async () => {
      for (let i = 0; i < count; i++) {
        if (job !== thumbJob) return;
        const v = (await doc.getPage(i + 1)).getViewport({ scale: 1 });
        const { canvas } = await MiniPDF.renderPage(doc, i + 1, 220 / Math.max(v.width, v.height));
        if (job !== thumbJob) return;
        const slot = thumbs.children[i]?.querySelector(".thumb-wait");
        if (slot) slot.replaceWith(Object.assign(document.createElement("img"), { src: canvas.toDataURL("image/jpeg", 0.8), alt: `Page ${i + 1}` }));
      }
    })().catch(() => {});
  }

  // The groups of pages each output PDF will hold, for the current mode
  function plan() {
    if (!count) return { groups: [] };
    switch (mode()) {
      case "select": return selected.size ? { groups: [[...selected].sort((a, b) => a - b)] } : { error: "Tap the pages you want to keep." };
      case "each": return { groups: Array.from({ length: count }, (_, i) => [i]) };
      case "ranges": return MiniPDF.parseRanges(ranges.value, count);
      case "every": {
        const n = Math.floor(Number(everyN.value));
        if (!(n >= 1)) return { error: "Enter how many pages each PDF should have." };
        const g = [];
        for (let i = 0; i < count; i += n) g.push(Array.from({ length: Math.min(n, count - i) }, (_, k) => i + k));
        return { groups: g };
      }
    }
    return { groups: [] };
  }

  // Highlight the pages that end up in the output; in "select" mode they are toggleable
  function sync() {
    const m = mode(), p = plan(), used = new Set((p.groups || []).flat());
    root.classList.toggle("selecting", m === "select");
    selActions.hidden = m !== "select";
    ranges.closest(".mode-extra").hidden = m !== "ranges";
    everyN.closest(".mode-extra").hidden = m !== "every";
    [...thumbs.children].forEach((li) => {
      const i = Number(li.dataset.i), on = m === "select" ? selected.has(i) : used.has(i);
      li.classList.toggle("off", !on);
      li.querySelector("input").checked = on;
    });
    selCount.textContent = !count ? "" : m === "select" ? `${selected.size} of ${count} pages selected` : `${count} page${count === 1 ? "" : "s"}`;
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ""; }
    dl.hidden = true;
    make.hidden = false;
    const n = p.groups ? p.groups.length : 0;
    make.disabled = !doc || !n;
    make.lastChild.textContent = n > 1 ? `Split into ${n} PDFs` : "Make PDF";
    fOut.textContent = n ? `${n} PDF${n === 1 ? "" : "s"}` : "—";
    fSize.textContent = "—";
    if (doc && p.error && (m === "ranges" ? ranges.value.trim() : m !== "select")) showError(p.error); else showError("");
  }
  thumbs.addEventListener("change", (e) => {
    const li = e.target.closest(".thumb");
    if (!li || mode() !== "select") return;
    const i = Number(li.dataset.i);
    if (e.target.checked) selected.add(i); else selected.delete(i);
    sync();
  });
  $("#all").addEventListener("click", () => { selected = new Set(Array.from({ length: count }, (_, i) => i)); sync(); });
  $("#none").addEventListener("click", () => { selected.clear(); sync(); });
  [...modes, ranges, everyN].forEach((el) => el.addEventListener("input", sync));

  const label = (g) => (g.length === 1 ? `page-${g[0] + 1}` : g.every((v, k) => k === 0 || v === g[k - 1] + 1) ? `pages-${g[0] + 1}-${g[g.length - 1] + 1}` : g.length <= 6 ? `pages-${g.map((v) => v + 1).join("_")}` : "selected-pages");

  make.addEventListener("click", async () => {
    const p = plan();
    if (!doc || !p.groups || !p.groups.length) return;
    showError("");
    make.disabled = true;
    try {
      setStatus("Loading the PDF tools…");
      const { PDFDocument } = await MiniPDF.loadPdfLib();
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const files = [];
      for (let k = 0; k < p.groups.length; k++) {
        setStatus(`Making PDF ${k + 1} of ${p.groups.length}…`);
        const out = await PDFDocument.create();
        (await out.copyPages(src, p.groups[k])).forEach((pg) => out.addPage(pg));
        out.setProducer("Memento Tools - mementoapp.online/tools");
        files.push({ name: `${base()}-${label(p.groups[k])}.pdf`, data: await out.save() });
      }
      setStatus(files.length > 1 ? "Packing the ZIP…" : "");
      const blob = files.length > 1 ? MiniZip.zip(files) : new Blob([files[0].data], { type: "application/pdf" });
      setStatus("");
      outUrl = URL.createObjectURL(blob);
      dl.href = outUrl;
      dl.download = files.length > 1 ? `${base()}-split.zip` : files[0].name;
      dl.lastChild.textContent = files.length > 1 ? `Download ZIP (${files.length} PDFs)` : "Download PDF";
      dl.hidden = false;
      make.hidden = true;
      fSize.textContent = kb(blob.size);
    } catch (e) {
      setStatus("");
      showError("Couldn't split this PDF. It may be damaged or protected.");
      make.disabled = false;
    }
  });

  fileInput.addEventListener("change", () => { open(fileInput.files[0]); fileInput.value = ""; });
  $("#pick").addEventListener("click", () => fileInput.click());
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { e.preventDefault(); open(e.dataTransfer?.files?.[0]); });
  sync();
})();
