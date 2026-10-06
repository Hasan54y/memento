// Photo & signature resizer (/tools/photo-signature-resizer). Everything happens in the browser:
// the picture is decoded, framed and re-encoded as a JPG locally and never leaves the device.
(() => {
  const root = document.getElementById("resizer");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const PRESETS = {
    photo: { w: 300, h: 300, kb: 100, file: "photo", clean: false, drop: "ছবি বেছে নিন" },
    sign: { w: 300, h: 80, kb: 60, file: "signature", clean: true, drop: "স্বাক্ষরের ছবি বেছে নিন" },
    custom: { file: "image", clean: false, drop: "ছবি বেছে নিন" },
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
      showError("এই ফাইলটি খোলা যাচ্ছে না। JPG, PNG বা WebP ছবি দিন। iPhone-এর HEIC ছবি হলে আগে JPG করে নিন, অথবা স্ক্রিনশট নিয়ে সেটা দিন।");
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

    const s = { orig, rot: 0, zoom: 1, clean: PRESETS[mode].clean, strength: 0.6, paper: paperLevel(orig) };
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
    s.cx = src.width / 2;
    s.cy = src.height / 2;
  }
  function mipFor(s, k) {
    let i = 0;
    while (k <= 0.5 / 2 ** i) {
      if (!s.mips[i + 1]) {
        const prev = s.mips[i];
        if (prev.width < 4 || prev.height < 4) break;
        const c = canvas(Math.round(prev.width / 2), Math.round(prev.height / 2));
        const x = c.getContext("2d");
        x.imageSmoothingQuality = "high";
        x.drawImage(prev, 0, 0, c.width, c.height);
        s.mips[i + 1] = c;
      }
      i++;
    }
    return s.mips[i];
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
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(mipFor(s, k), W / 2 - s.cx * k, H / 2 - s.cy * k, s.src.width * k, s.src.height * k);
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

  // ---------- Output ----------
  let exportTimer = 0, exportSeq = 0, outUrl = "";
  const toBlob = (c, q) => new Promise((r) => c.toBlob(r, "image/jpeg", q));
  const kb = (bytes) => (bytes / 1000).toFixed(1) + " KB";

  function resetOutput(msg) {
    exportSeq++;
    out.hidden = true;
    empty.hidden = false;
    empty.textContent = msg || "ছবি দিলে এখানে দেখা যাবে";
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
    if (!t) return resetOutput("প্রস্থ ও উচ্চতা 20 থেকে 5000 পিক্সেলের মধ্যে দিন");
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
    fSize.textContent = t.kb ? `${kb(blob.size)} ${fits ? "✓" : "✗"} (সর্বোচ্চ ${t.kb} KB)` : kb(blob.size);
    fSize.className = fits ? "ok" : "bad";
    if (!fits) showError(`এই মাপে ছবিটি ${t.kb} KB-এর নিচে নামানো যাচ্ছে না। প্রস্থ-উচ্চতা কমান বা KB-এর সীমা বাড়ান।`);
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
    if (!target()) return resetOutput("প্রস্থ ও উচ্চতা 20 থেকে 5000 পিক্সেলের মধ্যে দিন");
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
  $("#rotate").addEventListener("click", () => { rotate(states[mode]); zoom.value = 100; changed(); });
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
