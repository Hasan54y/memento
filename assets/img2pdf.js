// Image to PDF (/tools/image-to-pdf): photos become PDF pages in the browser; nothing is uploaded.
(() => {
  const root = document.getElementById("img2pdf");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const DPI = 150; // print-quality default; the size limit can lower it

  const drop = $("#drop"), fileInput = $("#file"), pagesBox = $(".pages"), thumbs = $("#thumbs"), countEl = $("#p-count");
  const psize = $("#psize"), orient = $("#orient"), margin = $("#margin"), maxkb = $("#maxkb"), scan = $("#scan");
  const make = $("#make"), dl = $("#dl"), status = $("#status"), err = $("#err"), fPages = $("#f-pages"), fSize = $("#f-size"), name = $("#fname");

  let items = []; // { id, file, rot, thumb (dataURL) }
  let nextId = 1, outUrl = "";

  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const kb = (b) => (b >= 1e6 ? (b / 1e6).toFixed(2) + " MB" : (b / 1000).toFixed(0) + " KB");

  async function decode(file) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch {
      return await new Promise((res, rej) => {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); res(img); };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("decode")); };
        img.src = url;
      });
    }
  }
  const dims = (b) => [b.naturalWidth || b.width, b.naturalHeight || b.height];

  async function add(files) {
    showError("");
    const list = [...files].filter((f) => f && (f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)));
    if (!list.length) { showError("Add JPG, PNG or WebP images."); return; }
    let bad = 0;
    for (const file of list) {
      try {
        const b = await decode(file), [w, h] = dims(b), k = 240 / Math.max(w, h);
        const c = Object.assign(document.createElement("canvas"), { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) });
        c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
        if (b.close) b.close();
        items.push({ id: nextId++, file, rot: 0, tall: h > w * 0.75, thumb: c.toDataURL("image/jpeg", 0.8) });
      } catch { bad++; }
    }
    if (bad) showError(`${bad} file${bad > 1 ? "s" : ""} couldn't be opened. iPhone HEIC photos need converting to JPG first.`);
    if (items.length && !name.value) name.value = (list[0].name.replace(/\.[^.]+$/, "") || "document").slice(0, 60);
    changed();
  }

  // ---------- Page list ----------
  function renderList() {
    pagesBox.hidden = !items.length;
    drop.classList.toggle("compact", !!items.length);
    countEl.textContent = `${items.length} page${items.length === 1 ? "" : "s"}`;
    thumbs.innerHTML = "";
    items.forEach((it, i) => {
      const li = document.createElement("li");
      li.className = "thumb";
      li.draggable = true;
      li.dataset.id = it.id;
      li.innerHTML = `<div class="thumb-img"><img alt="Page ${i + 1}" src="${it.thumb}" style="transform:rotate(${it.rot}deg)${it.rot % 180 && it.tall ? " scale(.75)" : ""}"></div>
        <span class="thumb-n">${i + 1}</span>
        <div class="thumb-bar">
          <button type="button" data-act="left" aria-label="Move earlier" ${i === 0 ? "disabled" : ""}><span class="ms">chevron_left</span></button>
          <button type="button" data-act="rot" aria-label="Rotate"><span class="ms">rotate_right</span></button>
          <button type="button" data-act="del" aria-label="Remove"><span class="ms">delete</span></button>
          <button type="button" data-act="right" aria-label="Move later" ${i === items.length - 1 ? "disabled" : ""}><span class="ms">chevron_right</span></button>
        </div>`;
      thumbs.appendChild(li);
    });
  }

  thumbs.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const i = items.findIndex((it) => String(it.id) === b.closest(".thumb").dataset.id);
    const act = b.dataset.act;
    if (act === "del") items.splice(i, 1);
    else if (act === "rot") items[i].rot = (items[i].rot + 90) % 360;
    else if (act === "left" && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
    else if (act === "right" && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
    changed();
  });

  // Drag to reorder (mouse); the arrow buttons do the same on phones
  let dragId = null;
  thumbs.addEventListener("dragstart", (e) => { const t = e.target.closest(".thumb"); if (t) { dragId = t.dataset.id; t.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; } });
  thumbs.addEventListener("dragend", () => { dragId = null; thumbs.querySelectorAll(".dragging,.over").forEach((x) => x.classList.remove("dragging", "over")); });
  thumbs.addEventListener("dragover", (e) => {
    if (!dragId) return;
    e.preventDefault();
    thumbs.querySelectorAll(".over").forEach((x) => x.classList.remove("over"));
    const t = e.target.closest(".thumb");
    if (t && t.dataset.id !== dragId) t.classList.add("over");
  });
  thumbs.addEventListener("drop", (e) => {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.target.closest(".thumb");
    if (!t || t.dataset.id === dragId) return;
    const from = items.findIndex((it) => String(it.id) === dragId);
    const [moved] = items.splice(from, 1);
    items.splice(items.findIndex((it) => String(it.id) === t.dataset.id) + (from <= items.findIndex((it) => String(it.id) === t.dataset.id) ? 1 : 0), 0, moved);
    changed();
  });

  // ---------- Output state ----------
  function stale() {
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ""; }
    dl.hidden = true;
    make.hidden = false;
    make.disabled = !items.length;
    fPages.textContent = items.length ? String(items.length) : "—";
    fSize.textContent = "—";
    fSize.className = "";
  }
  function changed() { renderList(); stale(); }
  [psize, orient, margin, maxkb, scan].forEach((el) => el.addEventListener("input", stale));
  root.querySelectorAll("[data-kb]").forEach((b) => b.addEventListener("click", () => { maxkb.value = b.dataset.kb; stale(); }));

  // ---------- Making the PDF ----------
  function layout(w, h) {
    const m = { none: 0, small: 18, normal: 36 }[margin.value] || 0;
    let pw, ph;
    if (psize.value === "fit") { // page the shape of the photo, long side A4-long
      const k = 841.89 / Math.max(w, h);
      pw = w * k + 2 * m; ph = h * k + 2 * m;
    } else {
      [pw, ph] = MiniPDF.SIZES[psize.value];
      const land = orient.value === "landscape" || (orient.value === "auto" && w > h);
      if (land) [pw, ph] = [ph, pw];
    }
    const k = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
    const dw = w * k, dh = h * k;
    return { pageW: pw, pageH: ph, x: (pw - dw) / 2, y: (ph - dh) / 2, dw, dh };
  }

  async function render(i, scale) {
    const it = items[i], b = await decode(it.file);
    let [w, h] = dims(b);
    const turned = it.rot % 180 !== 0;
    const [rw, rh] = turned ? [h, w] : [w, h];
    const place = layout(rw, rh);
    // Pixels for the printed size at the target DPI, never more than the photo has
    const px = Math.min(1, ((place.dw / 72) * DPI * scale) / rw);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(rw * px));
    c.height = Math.max(1, Math.round(rh * px));
    const x = c.getContext("2d", { willReadFrequently: scan.checked });
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = "high";
    x.translate(c.width / 2, c.height / 2);
    x.rotate((it.rot * Math.PI) / 180);
    const dw = turned ? c.height : c.width, dh = turned ? c.width : c.height;
    x.drawImage(b, -dw / 2, -dh / 2, dw, dh);
    if (b.close) b.close();
    if (scan.checked) MiniPDF.whiten(c, 0.6, true); // documents only; photos stay natural
    return { canvas: c, place };
  }

  make.addEventListener("click", async () => {
    if (!items.length) return;
    showError("");
    make.disabled = true;
    const limitKb = Number(maxkb.value);
    const limit = limitKb > 0 ? limitKb * 1000 : 0;
    try {
      const res = await MiniPDF.makePdf({
        count: items.length, render, limit, title: name.value || "Document",
        onProgress: (i, n, attempt) => setStatus(attempt ? `Making it smaller… page ${i + 1} of ${n}` : `Making page ${i + 1} of ${n}…`),
      });
      setStatus("");
      outUrl = URL.createObjectURL(res.blob);
      dl.href = outUrl;
      dl.download = `${(name.value || "document").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
      dl.hidden = false;
      make.hidden = true;
      fPages.textContent = String(items.length);
      fSize.textContent = limit ? `${kb(res.blob.size)} ${res.fits ? "✓" : "✗"} (max ${limitKb} KB)` : kb(res.blob.size);
      fSize.className = res.fits ? "ok" : "bad";
      if (!res.fits) showError(`Couldn't get ${items.length} page${items.length > 1 ? "s" : ""} under ${limitKb} KB without making them unreadable. Remove a page or raise the limit. The smallest version (${kb(res.blob.size)}) is ready to download.`);
    } catch (e) {
      setStatus("");
      showError("Something went wrong while making the PDF. Try fewer or smaller images.");
      make.disabled = false;
    }
  });

  // ---------- Adding files ----------
  fileInput.addEventListener("change", () => { add(fileInput.files); fileInput.value = ""; });
  $("#add-more").addEventListener("click", () => fileInput.click());
  $("#clear").addEventListener("click", () => { items = []; name.value = ""; changed(); });
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { if (dragId) return; e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { if (dragId) return; e.preventDefault(); if (e.dataTransfer?.files?.length) add(e.dataTransfer.files); });
  document.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile());
    if (files.length) add(files);
  });

  changed();
})();
