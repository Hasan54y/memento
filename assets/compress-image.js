// Compress Image (/tools/compress-image): re-encode photos smaller in the browser, optionally
// resized, converted or squeezed under a KB target. Nothing is uploaded. Re-encoding also drops
// hidden metadata such as the GPS location a phone camera adds.
(() => {
  const root = document.getElementById("imgcomp");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const drop = $("#drop"), fileInput = $("#file"), listBox = $(".pages"), list = $("#ilist"), countEl = $("#p-count");
  const format = $("#format"), mode = [...root.querySelectorAll("[name=cmode]")], quality = $("#quality"), qVal = $("#q-val");
  const targetKb = $("#target"), maxSide = $("#maxside"), qualityRow = $(".q-row"), targetRow = $(".t-row");
  const dlAll = $("#dl-all"), status = $("#status"), err = $("#err"), fBefore = $("#f-before"), fAfter = $("#f-after"), fSaved = $("#f-saved");

  let items = [], nextId = 1, runId = 0, timer = 0, zipUrl = "";
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const kb = (b) => (b >= 1e6 ? (b / 1e6).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");
  const EXT = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };
  const isImg = (f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name);

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
  const encode = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));

  async function add(files) {
    showError("");
    const bad = [];
    for (const file of files) {
      if (!isImg(file)) { bad.push(file.name); continue; }
      try {
        const b = await decode(file), [w, h] = dims(b), k = 112 / Math.max(w, h);
        const c = Object.assign(document.createElement("canvas"), { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) });
        c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
        if (b.close) b.close();
        items.push({ id: nextId++, file, w, h, thumb: c.toDataURL("image/jpeg", 0.75), out: null, state: "wait" });
      } catch { bad.push(`${file.name} (couldn't be opened; iPhone HEIC photos need converting first)`); }
    }
    if (bad.length) showError(`Skipped: ${bad.join(", ")}.`);
    renderList();
    schedule(0);
  }

  // ---------- One image ----------
  function outType(file) {
    const v = format.value;
    if (v === "keep") return EXT[file.type] ? file.type : "image/jpeg";
    return { jpg: "image/jpeg", webp: "image/webp", png: "image/png" }[v];
  }
  function canvasFor(bitmap, w, h, scale, type) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    const x = c.getContext("2d");
    if (type === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); } // JPG has no transparency
    x.imageSmoothingQuality = "high";
    x.drawImage(bitmap, 0, 0, c.width, c.height);
    return c;
  }

  async function compressOne(it) {
    const type = outType(it.file);
    const b = await decode(it.file);
    const side = Number(maxSide.value) || 0;
    let scale = side ? Math.min(1, side / Math.max(it.w, it.h)) : 1;
    const target = mode.find((r) => r.checked).value === "target" ? Number(targetKb.value) * 1000 : 0;
    let c = canvasFor(b, it.w, it.h, scale, type), blob;
    if (!target) {
      blob = await encode(c, type, type === "image/png" ? undefined : Number(quality.value) / 100);
    } else {
      // Highest quality that fits; if even low quality doesn't, shrink the pixels and try again
      for (let round = 0; round < 6; round++) {
        if (type === "image/png") blob = await encode(c, type);
        else {
          let lo = 0.3, hi = 0.95, best = null;
          for (let i = 0; i < 7; i++) { const q = (lo + hi) / 2, t = await encode(c, type, q); if (t.size <= target) { best = t; lo = q; } else hi = q; }
          blob = best || (await encode(c, type, 0.3));
        }
        if (blob.size <= target) break;
        scale *= Math.max(0.4, Math.min(0.92, Math.sqrt(target / blob.size) * 0.95));
        c.width = c.height = 0;
        c = canvasFor(b, it.w, it.h, scale, type);
      }
    }
    if (b.close) b.close();
    const outW = c.width, outH = c.height;
    c.width = c.height = 0;
    if (blob.type !== type) throw new Error("format"); // browser can't write this format (old Safari + WebP)
    // Keep the original when re-encoding saves almost nothing (or grows it) and nothing else changed
    const same = type === it.file.type && scale === 1;
    if (same && blob.size >= it.file.size * 0.97 && !target) return { blob: it.file, w: it.w, h: it.h, kept: true, fits: true };
    return { blob, w: outW, h: outH, kept: false, fits: !target || blob.size <= target };
  }

  // ---------- Running ----------
  function schedule(delay = 350) {
    clearTimeout(timer);
    timer = setTimeout(runAll, delay);
  }
  async function runAll() {
    const id = ++runId;
    if (zipUrl) { URL.revokeObjectURL(zipUrl); zipUrl = ""; }
    dlAll.hidden = true;
    items.forEach((it) => { if (it.url) URL.revokeObjectURL(it.url); it.url = ""; it.out = null; it.state = "wait"; });
    renderList();
    for (let i = 0; i < items.length; i++) {
      if (id !== runId) return;
      const it = items[i];
      it.state = "busy";
      setStatus(`Compressing ${i + 1} of ${items.length}…`);
      renderItem(it);
      try {
        it.out = await compressOne(it);
        it.zipData = new Uint8Array(await it.out.blob.arrayBuffer());
        if (id !== runId) return;
        it.url = URL.createObjectURL(it.out.blob);
        it.state = "done";
      } catch (e) {
        if (id !== runId) return;
        it.state = e && e.message === "format" ? "noformat" : "fail";
      }
      renderItem(it);
    }
    setStatus("");
    totals();
  }

  function outName(it) {
    const base = it.file.name.replace(/\.[^.]+$/, "") || "image";
    if (it.out && it.out.kept) return it.file.name;
    return `${base}-min.${EXT[outType(it.file)]}`;
  }

  function totals() {
    const done = items.filter((it) => it.state === "done");
    const before = done.reduce((n, it) => n + it.file.size, 0), after = done.reduce((n, it) => n + it.out.blob.size, 0);
    fBefore.textContent = done.length ? kb(before) : "—";
    fAfter.textContent = done.length ? kb(after) : "—";
    fSaved.textContent = done.length ? (after < before ? `${Math.round((1 - after / before) * 100)}% smaller` : "No saving") : "—";
    fSaved.className = done.length && after < before ? "ok" : "";
    if (done.length > 1) {
      zipUrl = URL.createObjectURL(MiniZip.zip(done.map((it) => ({ name: outName(it), data: it.zipData }))));
      dlAll.href = zipUrl;
      dlAll.download = "compressed-images.zip";
      dlAll.lastChild.textContent = `Download all (${done.length}) as ZIP`;
      dlAll.hidden = false;
    }
    if (items.some((it) => it.state === "noformat")) showError("This browser can't save WebP images. Choose JPG or PNG instead.");
  }

  // ---------- List ----------
  function renderList() {
    listBox.hidden = !items.length;
    drop.classList.toggle("compact", !!items.length);
    countEl.textContent = `${items.length} image${items.length === 1 ? "" : "s"}`;
    list.innerHTML = "";
    items.forEach((it) => {
      const li = document.createElement("li");
      li.dataset.id = it.id;
      list.appendChild(li);
      renderItem(it);
    });
    if (!items.length) { setStatus(""); totals(); }
  }
  function renderItem(it) {
    const li = list.querySelector(`li[data-id="${it.id}"]`);
    if (!li) return;
    const name = it.file.name.replace(/</g, "&lt;");
    let right = "";
    if (it.state === "done") {
      const o = it.out, saved = 1 - o.blob.size / it.file.size;
      right = `<span class="i-size"><s>${kb(it.file.size)}</s> → <b class="${o.fits ? "" : "bad"}">${kb(o.blob.size)}</b>
          <em class="${saved > 0 ? "ok" : ""}">${o.kept ? "already small, kept" : saved > 0 ? `−${Math.round(saved * 100)}%` : "no saving"}</em></span>
        <a class="btn btn-ghost btn-sm" href="${it.url}" download="${outName(it).replace(/"/g, "")}"><span class="ms">download</span>Save</a>`;
    } else if (it.state === "busy" || it.state === "wait") right = `<span class="i-size i-wait">${it.state === "busy" ? "Compressing…" : "Waiting…"}</span>`;
    else right = `<span class="i-size bad">${it.state === "noformat" ? "Format not supported here" : "Couldn't compress"}</span>`;
    const meta = it.state === "done" ? `${it.w}×${it.h} → ${it.out.w}×${it.out.h}` : `${it.w}×${it.h}`;
    li.innerHTML = `<img src="${it.thumb}" alt=""><div class="i-name">${name}<small>${meta}</small></div>${right}
      <button type="button" class="i-del" data-del="${it.id}" aria-label="Remove"><span class="ms">close</span></button>`;
  }
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]");
    if (!b) return;
    items = items.filter((it) => String(it.id) !== b.dataset.del);
    renderList();
    totals();
  });

  // ---------- Settings ----------
  function syncMode() {
    const m = mode.find((r) => r.checked).value;
    qualityRow.hidden = m !== "quality";
    targetRow.hidden = m !== "target";
    qVal.textContent = quality.value;
  }
  [format, quality, targetKb, maxSide, ...mode].forEach((el) => el.addEventListener("input", () => { syncMode(); if (items.length) schedule(); }));
  root.querySelectorAll("[data-kb]").forEach((b) => b.addEventListener("click", () => { targetKb.value = b.dataset.kb; if (items.length) schedule(0); }));
  root.querySelectorAll("[data-side]").forEach((b) => b.addEventListener("click", () => { maxSide.value = b.dataset.side; if (items.length) schedule(0); }));

  fileInput.addEventListener("change", () => { add([...fileInput.files]); fileInput.value = ""; });
  $("#add-more").addEventListener("click", () => fileInput.click());
  $("#clear").addEventListener("click", () => { runId++; items = []; renderList(); });
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) add([...e.dataTransfer.files]); });
  document.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile());
    if (files.length) add(files);
  });
  syncMode();
})();
