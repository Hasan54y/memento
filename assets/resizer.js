// Photo & signature resizer (/tools/photo-signature-resizer). Everything happens in the browser:
// the picture is decoded, framed and re-encoded as a JPG locally and never leaves the device.
// Background replacement uses MediaPipe's selfie segmenter, also on the device; the library is
// only downloaded the first time someone picks a background colour.
(() => {
  const root = document.getElementById("resizer");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const PRESETS = {
    photo: { w: 300, h: 300, kb: 100, file: "photo", clean: false, bg: true, drop: "Choose a photo" },
    sign: { w: 300, h: 80, kb: 60, file: "signature", clean: true, bg: false, drop: "Choose a signature picture" },
    custom: { file: "image", clean: false, bg: true, drop: "Choose a picture" },
  };
  const MAX_SRC = 2400; // longest side kept from the original; plenty for any form photo
  const MIN_ZOOM = 0.5, MAX_ZOOM = 4;

  const tabs = [...root.querySelectorAll("[data-mode]")];
  const custom = $(".custom"), cw = $("#cw"), ch = $("#ch"), ckb = $("#ckb");
  const drop = $("#drop"), dropTitle = $("[data-drop-title]"), fileInput = $("#file");
  const editor = $(".editor"), view = $("#view"), vctx = view.getContext("2d");
  const zoom = $("#zoom"), clean = $("#clean"), strength = $("#strength"), strengthRow = $(".strength");
  const err = $("#err"), out = $("#out"), empty = $(".out .empty"), dl = $("#dl");
  const fDim = $("#f-dim"), fSize = $("#f-size");
  const bgRow = $(".bg-row"), swatches = [...root.querySelectorAll("[data-bg]")], bgColor = $("#bgc"), bgStatus = $("#bg-status");

  let mode = "photo";
  const states = {}; // one picture per mode, so switching tabs keeps the photo and the signature

  // ---------- Target size ----------
  function target() {
    if (mode !== "custom") return PRESETS[mode];
    const w = Math.round(Number(cw.value)), h = Math.round(Number(ch.value)), kb = Number(ckb.value);
    if (!(w >= 20 && w <= 5000 && h >= 20 && h <= 5000)) return null;
    return { w, h, kb: kb > 0 ? kb : 0 };
  }

  // ---------- Loading ----------
  function showError(msg) { err.textContent = msg; err.hidden = !msg; }

  function decodeViaImg(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }

  async function load(file) {
    if (!file) return;
    showError("");
    let pic;
    try { pic = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch { try { pic = await decodeViaImg(file); } catch { pic = null; } }
    if (!pic) {
      showError("This file can't be opened. Use a JPG, PNG or WebP picture. For an iPhone HEIC photo, convert it to JPG first or use a screenshot of it.");
      return;
    }
    const pw = pic.naturalWidth || pic.width, ph = pic.naturalHeight || pic.height;
    const k = Math.min(1, MAX_SRC / Math.max(pw, ph));
    const orig = canvas(Math.max(1, Math.round(pw * k)), Math.max(1, Math.round(ph * k)));
    const octx = orig.getContext("2d");
    octx.fillStyle = "#fff"; // transparent PNGs become white, like a JPG would
    octx.fillRect(0, 0, orig.width, orig.height);
    octx.imageSmoothingQuality = "high";
    octx.drawImage(pic, 0, 0, orig.width, orig.height);
    if (pic.close) pic.close();

    const s = { orig, rot: 0, zoom: 1, clean: PRESETS[mode].clean, strength: 0.6, paper: paperLevel(orig), bg: "" };
    setSource(s, orig);
    states[mode] = s;
    showMode();
  }

  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });

  // Brightness of the paper/background: the 90th percentile of luminance on a small copy
  function paperLevel(src) {
    const k = Math.min(1, 200 / Math.max(src.width, src.height));
    const c = canvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)));
    const x = c.getContext("2d");
    x.drawImage(src, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) hist[(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0]++;
    let need = (d.length / 4) * 0.9;
    for (let v = 0; v < 256; v++) if ((need -= hist[v]) <= 0) return Math.max(v, 60);
    return 255;
  }

  // Halved copies of the source so big photos shrink smoothly in every browser
  function setSource(s, src) {
    s.src = src;
    s.mips = [src];
    s.cut = null; // person cut-out, rebuilt for the new source when a background is chosen
    s.cutMips = null;
    s.cx = src.width / 2;
    s.cy = src.height / 2;
  }
  function mipFor(mips, k) {
    let i = 0;
    while (k <= 0.5 / 2 ** i) {
      if (!mips[i + 1]) {
        const prev = mips[i];
        if (prev.width < 4 || prev.height < 4) break;
        const c = canvas(Math.round(prev.width / 2), Math.round(prev.height / 2));
        const x = c.getContext("2d");
        x.imageSmoothingQuality = "high";
        x.drawImage(prev, 0, 0, c.width, c.height);
        mips[i + 1] = c;
      }
      i++;
    }
    return mips[i];
  }

  function rotate(s) {
    s.rot = (s.rot + 90) % 360;
    const o = s.orig, turned = s.rot % 180 !== 0;
    const c = canvas(turned ? o.height : o.width, turned ? o.width : o.height);
    const x = c.getContext("2d");
    x.translate(c.width / 2, c.height / 2);
    x.rotate((s.rot * Math.PI) / 180);
    x.drawImage(o, -o.width / 2, -o.height / 2);
    setSource(s, c);
    s.zoom = 1;
  }

  // ---------- Framing ----------
  // Zoom 1 = the picture just covers the frame. The same math works for the preview and the
  // final file because it only depends on the frame's aspect ratio.
  const scaleFor = (s, W, H) => Math.max(W / s.src.width, H / s.src.height) * s.zoom;

  function clampPos(s, W, H) {
    const k = scaleFor(s, W, H), hw = W / (2 * k), hh = H / (2 * k);
    const sw = s.src.width, sh = s.src.height;
    s.cx = hw >= sw / 2 ? sw / 2 : Math.min(Math.max(s.cx, hw), sw - hw);
    s.cy = hh >= sh / 2 ? sh / 2 : Math.min(Math.max(s.cy, hh), sh - hh);
  }

  function draw(ctx, W, H, s) {
    const k = scaleFor(s, W, H);
    const swap = !!(s.bg && s.cut);
    ctx.fillStyle = swap ? s.bg : "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(mipFor(swap ? s.cutMips : s.mips, k), W / 2 - s.cx * k, H / 2 - s.cy * k, s.src.width * k, s.src.height * k);
    if (s.clean) cleanUp(ctx, W, H, s);
  }

  // Paper -> white, ink -> a little darker (keeps blue ink blue)
  function cleanUp(ctx, W, H, s) {
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    const hi = s.paper * (0.95 - 0.25 * s.strength);
    const lo = hi * (0.3 + 0.4 * s.strength);
    const span = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) {
      let t = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] - lo) / span;
      t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      const ink = (1 - t) * 0.75, paper = 255 * t;
      d[i] = d[i] * ink + paper;
      d[i + 1] = d[i + 1] * ink + paper;
      d[i + 2] = d[i + 2] * ink + paper;
    }
    ctx.putImageData(img, 0, 0);
  }

  function sizeView() {
    const t = target();
    if (!t) return;
    const avail = view.parentElement.clientWidth - 20;
    const maxH = Math.min(innerHeight * 0.6, 480);
    let w = avail, h = (w * t.h) / t.w;
    if (h > maxH) { h = maxH; w = (h * t.w) / t.h; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    view.style.width = w + "px";
    view.style.height = h + "px";
    view.width = Math.max(1, Math.round(w * dpr));
    view.height = Math.max(1, Math.round(h * dpr));
  }

  function render() {
    const s = states[mode];
    if (!s || !target()) return;
    const W = view.width, H = view.height;
    clampPos(s, W, H);
    draw(vctx, W, H, s);
    // Guides (preview only): thirds for photos, a baseline for signatures
    vctx.save();
    vctx.strokeStyle = "rgba(31, 224, 90, .55)";
    vctx.lineWidth = Math.max(1, W / 400);
    vctx.setLineDash([6 * (W / 400 + 1), 6 * (W / 400 + 1)]);
    vctx.beginPath();
    if (mode === "sign") {
      vctx.moveTo(W * 0.05, H * 0.82); vctx.lineTo(W * 0.95, H * 0.82);
    } else {
      for (const f of [1 / 3, 2 / 3]) { vctx.moveTo(W * f, 0); vctx.lineTo(W * f, H); vctx.moveTo(0, H * f); vctx.lineTo(W, H * f); }
    }
    vctx.stroke();
    vctx.restore();
  }

  // ---------- Background replacement ----------
  const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0";
  const MODEL = "/assets/models/selfie_segmenter.tflite";
  let segmenter = null;
  function getSegmenter() {
    if (!segmenter) segmenter = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import(`${MP}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
      return ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
        runningMode: "IMAGE", outputConfidenceMasks: true, outputCategoryMask: false,
      });
    })().catch((e) => { segmenter = null; throw e; });
    return segmenter;
  }

  const shrink = (src, max) => {
    const k = Math.min(1, max / Math.max(src.width, src.height));
    const c = canvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)));
    const x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  };

  // Probability (0..1) that each pixel belongs to the person
  function personMask(seg, img) {
    const r = seg.segment(img);
    const masks = r.confidenceMasks, labels = seg.getLabels() || [];
    const w = masks[0].width, h = masks[0].height;
    const pi = labels.findIndex((l) => /person|foreground/i.test(l));
    let data;
    if (pi >= 0 && masks[pi]) data = masks[pi].getAsFloat32Array().slice();
    else if (masks.length === 1) data = masks[0].getAsFloat32Array().slice();
    else data = masks[Math.max(0, labels.findIndex((l) => /background/i.test(l)))].getAsFloat32Array().map((v) => 1 - v);
    r.close();
    return { data, w, h };
  }

  // The model sometimes marks stray patches of background (a lamp, a shadow) as "person". Keep only
  // the biggest connected shape (and any other shape at least a quarter of its size), plus a few
  // pixels around it so the soft edge survives.
  function mainBlob({ data, w, h }) {
    const label = new Int32Array(w * h), sizes = [0], stack = [];
    for (let i = 0; i < w * h; i++) {
      if (label[i] || data[i] <= 0.5) continue;
      const id = sizes.length;
      let n = 0;
      label[i] = id;
      stack.push(i);
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p - x) / w;
        n++;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
          if (q >= 0 && !label[q] && data[q] > 0.5) { label[q] = id; stack.push(q); }
        }
      }
      sizes.push(n);
    }
    const biggest = Math.max(0, ...sizes);
    let keep = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (label[i] && sizes[label[i]] >= biggest / 4) keep[i] = 1;
    for (let r = 0; r < 4; r++) { // grow by 4 px
      const next = keep.slice();
      for (let i = 0; i < w * h; i++) {
        if (keep[i]) continue;
        const x = i % w;
        if ((x > 0 && keep[i - 1]) || (x < w - 1 && keep[i + 1]) || (i >= w && keep[i - w]) || (i < w * h - w && keep[i + w])) next[i] = 1;
      }
      keep = next;
    }
    return keep;
  }

  // Cut the person out of s.src: a first pass finds them, a second pass on just that area gives
  // sharper edges (the model only sees 256×256 pixels).
  async function buildCut(s) {
    const seg = await getSegmenter();
    const src = s.src;
    const small = shrink(src, 512);
    const m1 = personMask(seg, small);
    const keep1 = mainBlob(m1);
    let x0 = m1.w, y0 = m1.h, x1 = -1, y1 = -1;
    for (let y = 0; y < m1.h; y++) for (let x = 0; x < m1.w; x++) {
      if (keep1[y * m1.w + x] && m1.data[y * m1.w + x] > 0.5) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0 || (x1 - x0) * (y1 - y0) < m1.w * m1.h * 0.01) throw new Error("noperson");
    const f = src.width / m1.w, padX = (x1 - x0) * 0.12 * f, padY = (y1 - y0) * 0.12 * f;
    const rx = Math.max(0, x0 * f - padX), ry = Math.max(0, y0 * f - padY);
    const rw = Math.min(src.width, (x1 + 1) * f + padX) - rx, rh = Math.min(src.height, (y1 + 1) * f + padY) - ry;
    const crop = canvas(1, 1);
    const ck = Math.min(1, 640 / Math.max(rw, rh));
    crop.width = Math.max(1, Math.round(rw * ck)); crop.height = Math.max(1, Math.round(rh * ck));
    const cx = crop.getContext("2d");
    cx.imageSmoothingQuality = "high";
    cx.drawImage(src, rx, ry, rw, rh, 0, 0, crop.width, crop.height);
    const m2 = personMask(seg, crop);
    const keep = mainBlob(m2);

    // Mask as an alpha channel, with the soft edge tightened a little to reduce halos
    const mc = canvas(m2.w, m2.h), mx = mc.getContext("2d"), id = mx.createImageData(m2.w, m2.h);
    for (let i = 0; i < m2.data.length; i++) {
      if (!keep[i]) continue;
      let t = (m2.data[i] - 0.35) / 0.4;
      t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      id.data[i * 4 + 3] = t * 255;
    }
    mx.putImageData(id, 0, 0);
    const cut = canvas(src.width, src.height), cc = cut.getContext("2d");
    cc.imageSmoothingQuality = "high";
    cc.drawImage(mc, rx, ry, rw, rh);
    cc.globalCompositeOperation = "source-in";
    cc.drawImage(src, 0, 0);
    if (s.src !== src) return; // rotated meanwhile; that rotation starts its own cut
    s.cut = cut;
    s.cutMips = [cut];
  }

  function setStatus(msg) { bgStatus.textContent = msg; bgStatus.hidden = !msg; }

  let cutJob = null;
  async function ensureCut(s) {
    if (!s.bg || s.cut) { setStatus(""); return; }
    const job = (cutJob = {});
    setStatus(segmenter ? "Finding you in the photo…" : "Loading the background tool (first time only, about 4 MB)…");
    try {
      await getSegmenter();
      if (cutJob !== job) return;
      setStatus("Finding you in the photo…");
      await new Promise((r) => setTimeout(r, 30)); // let the status paint
      await buildCut(s);
      if (cutJob !== job) return;
      setStatus("");
    } catch (e) {
      if (cutJob !== job) return;
      setStatus("");
      s.bg = "";
      syncSwatches(s);
      showError(e && e.message === "noperson"
        ? "Couldn't find a person in this photo. Use a clear photo with your head and shoulders visible."
        : "The background tool couldn't load. Check your internet connection and try again.");
    }
    if (states[mode] === s) changed();
  }

  function syncSwatches(s) {
    const presets = swatches.map((b) => b.dataset.bg).filter((v) => v !== "custom");
    swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bg === "custom" ? !!s.bg && !presets.includes(s.bg) : b.dataset.bg === s.bg)));
  }

  function pickBackground(color) {
    const s = states[mode];
    if (!s) return;
    showError("");
    s.bg = color;
    syncSwatches(s);
    changed();
    ensureCut(s);
  }
  swatches.forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.bg === "custom") { try { bgColor.showPicker(); } catch { bgColor.click(); } return; }
    pickBackground(b.dataset.bg);
  }));
  bgColor.addEventListener("input", () => pickBackground(bgColor.value));

  // ---------- Output ----------
  let exportTimer = 0, exportSeq = 0, outUrl = "";
  const toBlob = (c, q) => new Promise((r) => c.toBlob(r, "image/jpeg", q));
  const kb = (bytes) => (bytes / 1000).toFixed(1) + " KB";

  function resetOutput(msg) {
    exportSeq++;
    out.hidden = true;
    empty.hidden = false;
    empty.textContent = msg || "Your result will appear here";
    fDim.textContent = "—"; fDim.className = "";
    fSize.textContent = "—"; fSize.className = "";
    dl.setAttribute("aria-disabled", "true");
    dl.removeAttribute("download");
    dl.href = "#";
  }

  function scheduleExport() {
    clearTimeout(exportTimer);
    exportTimer = setTimeout(exportFile, 160);
  }

  async function exportFile() {
    const s = states[mode], t = target();
    if (!s) return resetOutput();
    if (!t) return resetOutput("Width and height must be between 20 and 5000 pixels");
    const seq = ++exportSeq;
    const c = canvas(t.w, t.h);
    clampPos(s, t.w, t.h);
    draw(c.getContext("2d"), t.w, t.h, s);

    // Highest JPG quality that still fits under the limit (1 KB = 1000 bytes, the stricter reading)
    const limit = t.kb ? t.kb * 1000 : Infinity;
    let blob = await toBlob(c, 0.92);
    if (blob.size > limit) {
      let lo = 0.05, hi = 0.92, best = null;
      for (let i = 0; i < 8; i++) {
        const q = (lo + hi) / 2, b = await toBlob(c, q);
        if (b.size <= limit) { best = b; lo = q; } else hi = q;
      }
      blob = best || (await toBlob(c, 0.05));
    }
    if (seq !== exportSeq) return; // a newer edit already started

    if (outUrl) URL.revokeObjectURL(outUrl);
    outUrl = URL.createObjectURL(blob);
    out.src = outUrl;
    out.hidden = false;
    empty.hidden = true;
    const fits = blob.size <= limit;
    fDim.textContent = `${t.w} × ${t.h} px ✓`;
    fDim.className = "ok";
    fSize.textContent = t.kb ? `${kb(blob.size)} ${fits ? "✓" : "✗"} (max ${t.kb} KB)` : kb(blob.size);
    fSize.className = fits ? "ok" : "bad";
    if (!fits) showError(`At this size the picture can't get under ${t.kb} KB. Use a smaller width and height or a higher KB limit.`);
    dl.href = outUrl;
    dl.download = `${PRESETS[mode].file}-${t.w}x${t.h}.jpg`;
    dl.setAttribute("aria-disabled", fits ? "false" : "true");
  }

  // ---------- Mode switching ----------
  function showMode() {
    tabs.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === mode)));
    custom.hidden = mode !== "custom";
    dropTitle.textContent = PRESETS[mode].drop;
    const s = states[mode];
    drop.hidden = !!s;
    editor.hidden = !s;
    if (!s) { resetOutput(); return; }
    zoom.value = Math.round(s.zoom * 100);
    clean.checked = s.clean;
    strength.value = Math.round(s.strength * 100);
    strengthRow.hidden = !s.clean;
    bgRow.hidden = !PRESETS[mode].bg;
    syncSwatches(s);
    setStatus("");
    if (s.bg && !s.cut) ensureCut(s);
    sizeView();
    render();
    scheduleExport();
  }

  tabs.forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.mode === mode) return;
    mode = b.dataset.mode;
    showError("");
    showMode();
  }));

  [cw, ch, ckb].forEach((el) => el.addEventListener("input", () => {
    showError("");
    if (!states[mode]) return;
    if (!target()) return resetOutput("Width and height must be between 20 and 5000 pixels");
    sizeView();
    render();
    scheduleExport();
  }));

  // ---------- Picking a file ----------
  fileInput.addEventListener("change", () => { load(fileInput.files[0]); fileInput.value = ""; });
  $("#pick").addEventListener("click", () => fileInput.click());
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/")) || e.dataTransfer?.files[0];
    load(f);
  });
  document.addEventListener("paste", (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) load(item.getAsFile());
  });

  // ---------- Editing ----------
  const changed = () => { render(); scheduleExport(); };
  const setZoom = (z) => {
    const s = states[mode];
    s.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    zoom.value = Math.round(s.zoom * 100);
  };

  zoom.addEventListener("input", () => { setZoom(zoom.value / 100); changed(); });
  $("#rotate").addEventListener("click", () => { const s = states[mode]; rotate(s); zoom.value = 100; changed(); ensureCut(s); });
  clean.addEventListener("change", () => { states[mode].clean = clean.checked; strengthRow.hidden = !clean.checked; changed(); });
  strength.addEventListener("input", () => { states[mode].strength = strength.value / 100; changed(); });

  // Drag to move, wheel or pinch to zoom
  const pointers = new Map();
  let pinch = null;
  const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  view.addEventListener("pointerdown", (e) => {
    view.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinch = { d: spread(), z: states[mode].zoom };
  });
  view.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId), s = states[mode];
    if (!prev || !s) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const k = scaleFor(s, view.clientWidth, view.clientHeight);
      s.cx -= dx / k;
      s.cy -= dy / k;
    } else if (pinch && pinch.d > 0) {
      setZoom((pinch.z * spread()) / pinch.d);
    }
    changed();
  });
  const release = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
  view.addEventListener("pointerup", release);
  view.addEventListener("pointercancel", release);
  view.addEventListener("wheel", (e) => {
    if (!states[mode]) return;
    e.preventDefault();
    setZoom(states[mode].zoom * Math.exp(-e.deltaY * 0.0015));
    changed();
  }, { passive: false });

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (states[mode]) { sizeView(); render(); } }, 100);
  });

  resetOutput();
})();
