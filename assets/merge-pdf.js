// Merge PDF (/tools/merge-pdf): join PDFs (and images) into one PDF in the browser. Pages are
// copied as they are with pdf-lib, so text stays sharp and selectable. Nothing is uploaded.
(() => {
  const root = document.getElementById("mergepdf");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const drop = $("#drop"), fileInput = $("#file"), listBox = $(".pages"), list = $("#thumbs"), countEl = $("#p-count");
  const name = $("#fname"), make = $("#make"), dl = $("#dl"), status = $("#status"), err = $("#err"), fFiles = $("#f-files"), fPages = $("#f-pages"), fSize = $("#f-size");

  let items = [], nextId = 1, outUrl = "";
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const kb = (b) => (b >= 1e6 ? (b / 1e6).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");
  const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  const isImg = (f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name);

  async function imageThumb(file) {
    const b = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = 240 / Math.max(b.width, b.height);
    const c = Object.assign(document.createElement("canvas"), { width: Math.max(1, Math.round(b.width * k)), height: Math.max(1, Math.round(b.height * k)) });
    c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
    b.close();
    return c.toDataURL("image/jpeg", 0.8);
  }

  async function add(files) {
    showError("");
    const bad = [];
    for (const file of files) {
      try {
        if (isPdf(file)) {
          setStatus(`Reading ${file.name}…`);
          const doc = await MiniPDF.openPdf(file);
          const first = (await doc.getPage(1)).getViewport({ scale: 1 });
          const { canvas } = await MiniPDF.renderPage(doc, 1, 220 / Math.max(first.width, first.height));
          items.push({ id: nextId++, file, kind: "pdf", pages: doc.numPages, thumb: canvas.toDataURL("image/jpeg", 0.8) });
          doc.destroy();
        } else if (isImg(file)) {
          items.push({ id: nextId++, file, kind: "image", pages: 1, thumb: await imageThumb(file) });
        } else bad.push(`${file.name} (not a PDF or image)`);
      } catch (e) {
        bad.push(e && e.name === "PasswordException" ? `${file.name} (password-protected)` : `${file.name} (couldn't be opened)`);
      }
    }
    setStatus("");
    if (bad.length) showError(`Skipped: ${bad.join(", ")}.`);
    if (items.length && !name.value) name.value = "merged";
    changed();
  }

  function renderList() {
    listBox.hidden = !items.length;
    drop.classList.toggle("compact", !!items.length);
    const pages = items.reduce((n, it) => n + it.pages, 0);
    countEl.textContent = `${items.length} file${items.length === 1 ? "" : "s"} · ${pages} page${pages === 1 ? "" : "s"}`;
    list.innerHTML = "";
    items.forEach((it, i) => {
      const li = document.createElement("li");
      li.className = "thumb file";
      li.draggable = true;
      li.dataset.id = it.id;
      li.innerHTML = `<div class="thumb-img"><img alt="" src="${it.thumb}"></div>
        <span class="thumb-n">${i + 1}</span>
        <div class="thumb-name" title="${it.file.name.replace(/"/g, "&quot;")}">${it.file.name.replace(/</g, "&lt;")}<small>${it.kind === "pdf" ? `${it.pages} page${it.pages === 1 ? "" : "s"}` : "Image"} · ${kb(it.file.size)}</small></div>
        <div class="thumb-bar">
          <button type="button" data-act="left" aria-label="Move earlier" ${i === 0 ? "disabled" : ""}><span class="ms">chevron_left</span></button>
          <button type="button" data-act="del" aria-label="Remove"><span class="ms">delete</span></button>
          <button type="button" data-act="right" aria-label="Move later" ${i === items.length - 1 ? "disabled" : ""}><span class="ms">chevron_right</span></button>
        </div>`;
      list.appendChild(li);
    });
  }

  list.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const i = items.findIndex((it) => String(it.id) === b.closest(".thumb").dataset.id);
    if (b.dataset.act === "del") items.splice(i, 1);
    else if (b.dataset.act === "left" && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
    else if (b.dataset.act === "right" && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
    changed();
  });
  let dragId = null;
  list.addEventListener("dragstart", (e) => { const t = e.target.closest(".thumb"); if (t) { dragId = t.dataset.id; t.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; } });
  list.addEventListener("dragend", () => { dragId = null; list.querySelectorAll(".dragging,.over").forEach((x) => x.classList.remove("dragging", "over")); });
  list.addEventListener("dragover", (e) => {
    if (!dragId) return;
    e.preventDefault();
    list.querySelectorAll(".over").forEach((x) => x.classList.remove("over"));
    const t = e.target.closest(".thumb");
    if (t && t.dataset.id !== dragId) t.classList.add("over");
  });
  list.addEventListener("drop", (e) => {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.target.closest(".thumb");
    if (!t || t.dataset.id === dragId) return;
    // Dropped on a later file: go after it; on an earlier one: go before it
    const from = items.findIndex((it) => String(it.id) === dragId);
    const [moved] = items.splice(from, 1);
    let to = items.findIndex((it) => String(it.id) === t.dataset.id);
    if (from <= to) to++;
    items.splice(to, 0, moved);
    changed();
  });

  function stale() {
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ""; }
    dl.hidden = true;
    make.hidden = false;
    make.disabled = items.length < 1;
    fFiles.textContent = items.length ? String(items.length) : "—";
    fPages.textContent = items.length ? String(items.reduce((n, it) => n + it.pages, 0)) : "—";
    fSize.textContent = "—";
  }
  function changed() { renderList(); stale(); }
  name.addEventListener("input", stale);

  // Images become A4 pages (portrait or landscape to suit), centred with a small margin
  async function addImagePage(out, file) {
    let bytes = new Uint8Array(await file.arrayBuffer()), img;
    if (/jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name)) img = await out.embedJpg(bytes).catch(() => null);
    else if (/png$/i.test(file.type) || /\.png$/i.test(file.name)) img = await out.embedPng(bytes).catch(() => null);
    if (!img) { // WebP, GIF, BMP or an unusual JPEG: redraw as JPEG first
      const b = await createImageBitmap(file, { imageOrientation: "from-image" });
      const c = Object.assign(document.createElement("canvas"), { width: b.width, height: b.height });
      const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(b, 0, 0);
      b.close();
      img = await out.embedJpg(await MiniPDF.jpeg(c, 0.9));
    }
    let [pw, ph] = MiniPDF.SIZES.a4;
    if (img.width > img.height) [pw, ph] = [ph, pw];
    const m = 18, k = Math.min((pw - 2 * m) / img.width, (ph - 2 * m) / img.height, 1.5);
    const w = img.width * k, h = img.height * k;
    out.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }

  make.addEventListener("click", async () => {
    if (!items.length) return;
    showError("");
    make.disabled = true;
    try {
      setStatus("Loading the PDF tools…");
      const { PDFDocument } = await MiniPDF.loadPdfLib();
      const out = await PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        setStatus(`Adding ${it.file.name} (${i + 1} of ${items.length})…`);
        if (it.kind === "pdf") {
          const src = await PDFDocument.load(await it.file.arrayBuffer(), { ignoreEncryption: true });
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((p) => out.addPage(p));
        } else await addImagePage(out, it.file);
      }
      const title = (name.value || "merged").trim();
      out.setTitle(title);
      out.setProducer("Memento Tools - mementoapp.online/tools");
      setStatus("Saving…");
      const blob = new Blob([await out.save()], { type: "application/pdf" });
      setStatus("");
      outUrl = URL.createObjectURL(blob);
      dl.href = outUrl;
      dl.download = `${title.replace(/[\\/:*?"<>|]+/g, "-") || "merged"}.pdf`;
      dl.hidden = false;
      make.hidden = true;
      fPages.textContent = String(out.getPageCount());
      fSize.textContent = kb(blob.size);
    } catch (e) {
      setStatus("");
      showError("Couldn't merge these files. One of them may be damaged or protected; try removing it.");
      make.disabled = false;
    }
  });

  fileInput.addEventListener("change", () => { add([...fileInput.files]); fileInput.value = ""; });
  $("#add-more").addEventListener("click", () => fileInput.click());
  $("#clear").addEventListener("click", () => { items = []; changed(); });
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { if (dragId) return; e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { if (dragId) return; e.preventDefault(); if (e.dataTransfer?.files?.length) add([...e.dataTransfer.files]); });
  changed();
})();
