// Photo & signature resizer (/tools/photo-signature-resizer). Everything happens in the browser:
// the picture is decoded, framed and re-encoded as a JPG locally and never leaves the device.
// Background replacement uses MODNet (portrait matting, Apache-2.0) through onnxruntime-web, also on
// the device. The engine and model are only downloaded the first time someone picks a background
// colour, and the model is kept in Cache Storage so it downloads once.
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
  const fixRow = $(".fix-row"), brushBtns = [...root.querySelectorAll("[data-brush]")], brushSize = $("#bsize"), undoBtn = $("#undo");
  const moveHint = $(".move-hint"), brushHint = $(".brush-hint");

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
    s.fill = null;
    s.mask = null; // alpha mask of the person (editable with the brush), smaller than the source
    s.history = [];
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
    if (brush && cursor) {
      const r = view.getBoundingClientRect(), d = W / r.width;
      vctx.save();
      vctx.lineWidth = Math.max(1, d * 1.5);
      vctx.strokeStyle = brush === "erase" ? "rgba(220, 38, 38, .9)" : "rgba(10, 125, 54, .9)";
      vctx.setLineDash([]);
      vctx.beginPath();
      vctx.arc((cursor.x - r.left) * d, (cursor.y - r.top) * d, (Number(brushSize.value) / 2) * d, 0, Math.PI * 2);
      vctx.stroke();
      vctx.restore();
    }
  }

  // ---------- Background replacement ----------
  const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
  const MODEL_URL = "/assets/models/modnet_fp16.onnx";
  const MODEL_CACHE = "memento-tools-models-v1";
  const MASK_MAX = 1400; // longest side of the editable mask

  // The model file, from Cache Storage when we have it, otherwise downloaded with progress
  async function fetchModel(onProgress) {
    let cache = null;
    try {
      cache = await caches.open(MODEL_CACHE);
      const hit = await cache.match(MODEL_URL);
      if (hit) return new Uint8Array(await hit.arrayBuffer());
    } catch { cache = null; }
    const res = await fetch(MODEL_URL);
    if (!res.ok || !res.body) throw new Error("model");
    const total = Number(res.headers.get("content-length")) || 13e6;
    const reader = res.body.getReader(), parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      onProgress(Math.min(0.99, got / total));
    }
    const bytes = new Uint8Array(got);
    let o = 0;
    for (const p of parts) { bytes.set(p, o); o += p.length; }
    try { if (cache) await cache.put(MODEL_URL, new Response(bytes, { headers: { "content-type": "application/octet-stream" } })); } catch { /* storage full or blocked: fine */ }
    return bytes;
  }

  let model = null;
  function getModel() {
    if (!model) model = (async () => {
      const ort = await import(`${ORT}ort.wasm.min.mjs`);
      ort.env.wasm.wasmPaths = ORT;
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      const bytes = await fetchModel((p) => setStatus(`Downloading the background tool… ${Math.round(p * 100)}% (first time only, about 16 MB)`));
      setStatus("Starting the background tool…");
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      return { ort, session };
    })().catch((e) => { model = null; throw e; });
    return model;
  }

  // Alpha matte (0..1) of the person in one region of the picture. MODNet wants the shorter side at
  // 512 px and both sides a multiple of 32.
  async function matte({ ort, session }, src, rx, ry, rw, rh) {
    const k = Math.min(512 / Math.min(rw, rh), 1024 / Math.max(rw, rh));
    const w = Math.max(32, Math.round((rw * k) / 32) * 32), h = Math.max(32, Math.round((rh * k) / 32) * 32);
    const c = canvas(w, h), x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(src, rx, ry, rw, rh, 0, 0, w, h);
    const px = x.getImageData(0, 0, w, h).data, n = w * h, input = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      input[i] = px[i * 4] / 127.5 - 1;
      input[n + i] = px[i * 4 + 1] / 127.5 - 1;
      input[2 * n + i] = px[i * 4 + 2] / 127.5 - 1;
    }
    await new Promise((r) => setTimeout(r, 20)); // let the status message paint first
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, h, w]) });
    return { data: Float32Array.from(out[session.outputNames[0]].data), w, h };
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

  // Draw a matte into the mask canvas at a region (in source pixels)
  function paintMatte(mask, m, keep, rx, ry, rw, rh, scale) {
    const mc = canvas(m.w, m.h), mx = mc.getContext("2d"), id = mx.createImageData(m.w, m.h);
    for (let i = 0; i < m.data.length; i++) {
      if (!keep[i]) continue;
      const v = m.data[i];
      id.data[i * 4 + 3] = v < 0.04 ? 0 : v > 0.96 ? 255 : v * 255;
    }
    mx.putImageData(id, 0, 0);
    const c = mask.getContext("2d");
    c.clearRect(0, 0, mask.width, mask.height);
    c.imageSmoothingQuality = "high";
    c.drawImage(mc, rx * scale, ry * scale, rw * scale, rh * scale);
  }

  // Cut the person out of s.src. The first pass finds them; when they fill only part of the photo,
  // a second pass on just that area gives the model more pixels and sharper hair.
  async function buildCut(s) {
    const m = await getModel();
    const src = s.src, W = src.width, H = src.height;
    setStatus("Finding you in the photo…");
    const m1 = await matte(m, src, 0, 0, W, H);
    const keep1 = mainBlob(m1);
    let x0 = m1.w, y0 = m1.h, x1 = -1, y1 = -1, sum = 0;
    for (let y = 0; y < m1.h; y++) for (let x = 0; x < m1.w; x++) {
      const i = y * m1.w + x;
      if (keep1[i] && m1.data[i] > 0.5) { sum++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0 || sum < m1.w * m1.h * 0.01) throw new Error("noperson");
    const scale = Math.min(1, MASK_MAX / Math.max(W, H));
    const mask = canvas(Math.max(1, Math.round(W * scale)), Math.max(1, Math.round(H * scale)));
    const fx = W / m1.w, fy = H / m1.h, padX = (x1 - x0 + 1) * 0.08 * fx, padY = (y1 - y0 + 1) * 0.08 * fy;
    const rx = Math.max(0, x0 * fx - padX), ry = Math.max(0, y0 * fy - padY);
    const rw = Math.min(W, (x1 + 1) * fx + padX) - rx, rh = Math.min(H, (y1 + 1) * fy + padY) - ry;
    if (rw * rh < W * H * 0.6) {
      setStatus("Refining the edges…");
      const m2 = await matte(m, src, rx, ry, rw, rh);
      paintMatte(mask, m2, mainBlob(m2), rx, ry, rw, rh, scale);
    } else {
      paintMatte(mask, m1, keep1, 0, 0, W, H, scale);
    }
    if (s.src !== src) return; // rotated meanwhile; that rotation starts its own cut
    s.mask = mask;
    s.history = [];
    composeCut(s);
  }

  // Colours for the person that also reach past their edges. Soft edge pixels in the photo are a
  // mix of the person and the old background, which shows as a dark or coloured halo on the new
  // one. So take only the solid inside of the person and spread those colours outwards
  // (push-pull: shrink by halves, then grow back, filling gaps from the coarser level).
  function buildFill(s) {
    const src = s.src, W = src.width, H = src.height, m = s.mask;
    const hard = canvas(m.width, m.height), hx = hard.getContext("2d");
    hx.drawImage(m, 0, 0);
    const id = hx.getImageData(0, 0, m.width, m.height);
    for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] >= 235 ? 255 : 0;
    hx.putImageData(id, 0, 0);
    const solid = canvas(W, H), sx = solid.getContext("2d");
    sx.drawImage(hard, 0, 0, W, H);
    sx.globalCompositeOperation = "source-in";
    sx.drawImage(src, 0, 0);
    const levels = [solid];
    while (levels[levels.length - 1].width > 1 || levels[levels.length - 1].height > 1) {
      const last = levels[levels.length - 1];
      const c = canvas(Math.max(1, Math.ceil(last.width / 2)), Math.max(1, Math.ceil(last.height / 2)));
      c.getContext("2d").drawImage(last, 0, 0, c.width, c.height);
      levels.push(c);
    }
    // The 1×1 level holds the average colour; make it opaque so the fill ends up opaque everywhere
    const top = levels[levels.length - 1], tx = top.getContext("2d"), t = tx.getImageData(0, 0, 1, 1);
    const a = t.data[3] || 1;
    tx.fillStyle = `rgb(${Math.round((t.data[0] * 255) / a)},${Math.round((t.data[1] * 255) / a)},${Math.round((t.data[2] * 255) / a)})`;
    tx.globalCompositeOperation = "copy";
    tx.fillRect(0, 0, 1, 1);
    let acc = top;
    for (let i = levels.length - 2; i >= 0; i--) {
      const c = canvas(levels[i].width, levels[i].height), x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(acc, 0, 0, c.width, c.height);
      x.drawImage(levels[i], 0, 0);
      acc = c;
    }
    s.fill = acc;
  }

  // The person on a transparent background: the edge-safe colours, shaped by the soft mask.
  // While a brush stroke is in progress (quick = true) the previous colours are reused.
  function composeCut(s, quick) {
    const src = s.src;
    if (!quick || !s.fill) buildFill(s);
    if (!s.cut) s.cut = canvas(src.width, src.height);
    const cc = s.cut.getContext("2d");
    cc.globalCompositeOperation = "copy";
    cc.drawImage(s.fill, 0, 0);
    cc.globalCompositeOperation = "destination-in";
    cc.imageSmoothingQuality = "high";
    cc.drawImage(s.mask, 0, 0, src.width, src.height);
    cc.globalCompositeOperation = "source-over";
    s.cutMips = [s.cut];
  }

  function setStatus(msg) { bgStatus.textContent = msg; bgStatus.hidden = !msg; }

  let cutJob = null;
  async function ensureCut(s) {
    if (!s.bg || s.cut) { setStatus(""); return; }
    const job = (cutJob = {});
    setStatus(model ? "Finding you in the photo…" : "Loading the background tool…");
    setBrush("");
    try {
      await buildCut(s);
      if (cutJob !== job) return;
      setStatus("");
      syncFix(s);
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

  // ---------- Touch-up brush ----------
  let brush = ""; // "", "erase" or "restore"
  function setBrush(b) {
    brush = b;
    brushBtns.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.brush === brush)));
    brushHint.hidden = !brush;
    moveHint.hidden = !!brush;
    view.classList.toggle("painting", !!brush);
  }
  function syncFix(s) {
    const on = !!(s && s.bg && s.cut && PRESETS[mode].bg);
    fixRow.hidden = !on;
    if (!on) setBrush("");
    undoBtn.disabled = !(s && s.history && s.history.length);
  }
  brushBtns.forEach((x) => x.addEventListener("click", () => setBrush(brush === x.dataset.brush ? "" : x.dataset.brush)));
  undoBtn.addEventListener("click", () => {
    const s = states[mode];
    if (!s || !s.history.length) return;
    const prev = s.history.pop();
    const c = s.mask.getContext("2d");
    c.globalCompositeOperation = "copy";
    c.drawImage(prev, 0, 0);
    c.globalCompositeOperation = "source-over";
    composeCut(s);
    syncFix(s);
    changed();
  });

  // Picture coordinates under a pointer position on the preview
  function toSource(s, e) {
    const r = view.getBoundingClientRect(), k = scaleFor(s, r.width, r.height);
    return { x: s.cx + (e.clientX - r.left - r.width / 2) / k, y: s.cy + (e.clientY - r.top - r.height / 2) / k, k };
  }
  let stroke = null, strokeFrame = 0;
  function startStroke(s, e) {
    const snap = canvas(s.mask.width, s.mask.height);
    snap.getContext("2d").drawImage(s.mask, 0, 0);
    s.history.push(snap);
    if (s.history.length > 15) s.history.shift();
    stroke = toSource(s, e);
    paintTo(s, e);
  }
  function paintTo(s, e) {
    const p = toSource(s, e), scale = s.mask.width / s.src.width;
    const c = s.mask.getContext("2d");
    c.save();
    c.globalCompositeOperation = brush === "erase" ? "destination-out" : "source-over";
    c.strokeStyle = c.fillStyle = "#000";
    c.lineCap = c.lineJoin = "round";
    c.lineWidth = (Number(brushSize.value) / p.k) * scale;
    c.beginPath();
    c.moveTo(stroke.x * scale, stroke.y * scale);
    c.lineTo(p.x * scale + 0.01, p.y * scale);
    c.stroke();
    c.restore();
    stroke = p;
    if (!strokeFrame) strokeFrame = requestAnimationFrame(() => { strokeFrame = 0; composeCut(s, true); render(); });
  }
  let cursor = null; // last pointer position over the preview, for the brush ring

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
    syncFix(s);
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
    setBrush("");
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
    syncFix(s);
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
  $("#rotate").addEventListener("click", () => { const s = states[mode]; rotate(s); syncFix(s); zoom.value = 100; changed(); ensureCut(s); });
  clean.addEventListener("change", () => { states[mode].clean = clean.checked; strengthRow.hidden = !clean.checked; changed(); });
  strength.addEventListener("input", () => { states[mode].strength = strength.value / 100; changed(); });

  // Drag to move, wheel or pinch to zoom
  const pointers = new Map();
  let pinch = null;
  const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  view.addEventListener("pointerdown", (e) => {
    view.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = states[mode];
    if (pointers.size === 2) { pinch = { d: spread(), z: s.zoom }; stroke = null; }
    else if (brush && s && s.mask) startStroke(s, e);
  });
  view.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId), s = states[mode];
    if (brush) { cursor = { x: e.clientX, y: e.clientY }; if (!prev && s) render(); }
    if (!prev || !s) return;
    if (brush && stroke && pointers.size === 1) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      paintTo(s, e);
      return;
    }
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
  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (stroke) {
      stroke = null;
      const s = states[mode];
      cancelAnimationFrame(strokeFrame); strokeFrame = 0;
      composeCut(s); // full edge clean-up once the stroke is done
      syncFix(s);
      changed();
    }
  };
  view.addEventListener("pointerleave", () => { if (cursor) { cursor = null; render(); } });
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
