// Passport & visa photo maker (/tools/passport-photo). Finds the face (MediaPipe BlazeFace),
// removes the background (matte.js), sizes the head to the chosen country's rules, and makes the
// digital photo and printable sheets. Everything runs in the browser; nothing is uploaded.
(() => {
  const root = document.getElementById("passport");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  // Sizes in mm; head = chin to top of head (hair included). Rules change, so the page tells
  // people to check the official requirements too.
  const SPECS = {
    us: { w: 50.8, h: 50.8, head: [25, 35], px: [600, 600], kb: 240, bg: "#ffffff", note: "2 × 2 in · head 25–35 mm (1–1⅜ in) · white background · digital 600 × 600 px, up to 240 KB" },
    uk: { w: 35, h: 45, head: [29, 34], bg: "#e8e8e8", note: "35 × 45 mm · head 29–34 mm · plain light grey or cream background" },
    schengen: { w: 35, h: 45, head: [32, 36], bg: "#ffffff", note: "35 × 45 mm · head 32–36 mm · plain light background" },
    canada: { w: 50, h: 70, head: [31, 36], bg: "#ffffff", note: "50 × 70 mm · head 31–36 mm · plain white or light background" },
    australia: { w: 35, h: 45, head: [32, 36], bg: "#ffffff", note: "35 × 45 mm · head 32–36 mm · plain white or light grey background" },
    india: { w: 50.8, h: 50.8, head: [25, 35], bg: "#ffffff", note: "2 × 2 in · head 25–35 mm · white background" },
    china: { w: 33, h: 48, head: [28, 33], bg: "#ffffff", note: "33 × 48 mm · head 28–33 mm · white background" },
    std: { w: 35, h: 45, head: [32, 36], bg: "#ffffff", note: "35 × 45 mm · head 32–36 mm (the ICAO size many countries use)" },
  };
  const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0";
  const DPI = 300;
  const mmPx = (mm) => Math.round((mm / 25.4) * DPI);

  const drop = $("#drop"), fileInput = $("#file"), editor = $(".editor"), view = $("#view"), vctx = view.getContext("2d");
  const zoom = $("#zoom"), status = $("#status"), err = $("#err"), swatches = [...root.querySelectorAll("[data-bg]")];
  const specSel = $("#spec"), customBox = $(".custom-mm"), cw = $("#cmw"), ch = $("#cmh"), info = $("#spec-info");
  const out = $("#out"), empty = $(".out .empty"), cHead = $("#c-head"), cBg = $("#c-bg"), cCenter = $("#c-center");
  const dlPhoto = $("#dl-photo"), dl46 = $("#dl-46"), dlA4 = $("#dl-a4"), fPx = $("#f-px"), fSize = $("#f-size");

  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  const kb = (b) => Math.max(1, Math.round(b / 1000)) + " KB";

  let s = null; // { src, mask, fill, cut, face: { cx, crown, chin, found }, k0, k, cx, cy, bg }
  let job = 0;

  function spec() {
    if (specSel.value !== "custom") return SPECS[specSel.value];
    const w = Math.min(120, Math.max(15, Number(cw.value) || 35)), h = Math.min(160, Math.max(15, Number(ch.value) || 45));
    return { w, h, head: [h * 0.7, h * 0.8], bg: "#ffffff", note: `${w} × ${h} mm · head about 70–80% of the height` };
  }
  const outPx = (sp) => sp.px || [mmPx(sp.w), mmPx(sp.h)];

  // ---------- Loading ----------
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
  function shrink(src, max) {
    const k = Math.min(1, max / Math.max(src.width, src.height));
    const c = canvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)));
    const x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  let detector = null;
  function getDetector() {
    if (!detector) detector = (async () => {
      const { FilesetResolver, FaceDetector } = await import(`${MP}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
      return FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/assets/models/blaze_face_short_range.tflite", delegate: "CPU" },
        runningMode: "IMAGE", minDetectionConfidence: 0.5,
      });
    })().catch((e) => { detector = null; throw e; });
    return detector;
  }

  // Eyes and mouth from the detector; the chin sits about 1.32 eye-to-mouth distances below the eyes
  // (measured on test portraits: 1.20 when smiling to 1.44 with a beard)
  async function findFace(src) {
    const det = await getDetector();
    const small = shrink(src, 640), f = src.width / small.width;
    const found = (det.detect(small).detections || []).filter((d) => d.keypoints && d.keypoints.length >= 4);
    if (!found.length) return null;
    const d = found.sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height)[0];
    const kp = d.keypoints.map((p) => ({ x: p.x * small.width * f, y: p.y * small.height * f }));
    const [re, le, , mouth] = kp;
    const eyeX = (re.x + le.x) / 2, eyeY = (re.y + le.y) / 2;
    const b = d.boundingBox;
    return { cx: eyeX, eyeY, chin: eyeY + 1.32 * (mouth.y - eyeY), box: { x: b.originX * f, y: b.originY * f, w: b.width * f, h: b.height * f } };
  }

  // Top of the head (hair included): the highest person pixel above the face
  function crownFromMask(mask, face, W) {
    const k = mask.width / W, x0 = Math.max(0, Math.floor((face.box.x + face.box.w * 0.15) * k)), x1 = Math.min(mask.width, Math.ceil((face.box.x + face.box.w * 0.85) * k));
    const d = mask.getContext("2d").getImageData(x0, 0, Math.max(1, x1 - x0), mask.height).data, rowW = Math.max(1, x1 - x0);
    for (let y = 0; y < mask.height; y++) {
      let hits = 0;
      for (let x = 0; x < rowW; x++) if (d[(y * rowW + x) * 4 + 3] > 140) hits++;
      if (hits > rowW * 0.08) return y / k;
    }
    return null;
  }

  async function load(file) {
    if (!file) return;
    showError("");
    const my = ++job;
    let bmp;
    try { bmp = await decode(file); } catch { showError("This file can't be opened. Use a JPG, PNG or WebP photo (for iPhone HEIC, take a screenshot of it or convert it first)."); return; }
    const W0 = bmp.naturalWidth || bmp.width, H0 = bmp.naturalHeight || bmp.height, k = Math.min(1, 2400 / Math.max(W0, H0));
    const src = canvas(Math.round(W0 * k), Math.round(H0 * k));
    const sx = src.getContext("2d");
    sx.fillStyle = "#fff"; sx.fillRect(0, 0, src.width, src.height);
    sx.drawImage(bmp, 0, 0, src.width, src.height);
    if (bmp.close) bmp.close();
    s = { src, bg: spec().bg, face: null, mask: null, cut: null };
    drop.hidden = true;
    editor.hidden = false;
    // A first framing straight away, refined once the face and background are found
    s.face = { cx: src.width / 2, crown: src.height * 0.12, chin: src.height * 0.55, found: false };
    autoFit();
    try {
      setStatus("Finding your face…");
      const face = await findFace(src);
      if (my !== job) return;
      setStatus(MementoMatte.loaded ? "Removing the background…" : "Loading the background tool…");
      s.mask = await MementoMatte.mask(src, (m) => my === job && setStatus(m));
      if (my !== job) return;
      s.fill = MementoMatte.fill(src, s.mask);
      s.cut = MementoMatte.cut(src, s.mask, s.fill);
      if (face) {
        const crown = crownFromMask(s.mask, face, src.width);
        s.face = { cx: face.cx, chin: face.chin, crown: crown !== null && crown < face.eyeY ? crown : face.eyeY - (face.chin - face.eyeY) * 0.95, found: true };
      } else {
        showError("Couldn't find a face clearly. Use a front-facing photo with your whole face visible, or line it up by hand.");
      }
      setStatus("");
      autoFit();
    } catch (e) {
      if (my !== job) return;
      setStatus("");
      showError(e && e.message === "noperson"
        ? "Couldn't find a person in this photo. Use a clear, front-facing photo of your head and shoulders."
        : "The photo tools couldn't load. Check your internet connection and try again.");
      render(); update();
    }
  }

  // ---------- Framing ----------
  // k: output pixels per source pixel (for the digital size); cx, cy: source point at the centre
  function autoFit() {
    if (!s) return;
    const sp = spec(), [ow, oh] = outPx(sp);
    const headOut = (((sp.head[0] + sp.head[1]) / 2) / sp.h) * oh;
    s.k0 = s.k = headOut / Math.max(1, s.face.chin - s.face.crown);
    const top = (oh - headOut) * 0.42; // a little more room below the chin than above the head
    s.cx = s.face.cx;
    s.cy = s.face.crown + (oh / 2 - top) / s.k;
    zoom.value = 100;
    sizeView(); render(); update();
  }

  function draw(ctx, W, H) {
    const [ow] = outPx(spec()), sc = s.k * (W / ow), img = s.bg && s.cut ? s.cut : s.src;
    ctx.fillStyle = s.bg && s.cut ? s.bg : "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(stepDown(img, sc), W / 2 - s.cx * sc, H / 2 - s.cy * sc, s.src.width * sc, s.src.height * sc);
  }
  // Halve big images first so strong downscaling stays smooth in every browser
  const mips = new WeakMap();
  function stepDown(img, sc) {
    let list = mips.get(img);
    if (!list) mips.set(img, (list = [img]));
    let i = 0;
    while (sc <= 0.5 / 2 ** i && list[i].width > 8) {
      if (!list[i + 1]) {
        const c = canvas(Math.round(list[i].width / 2), Math.round(list[i].height / 2)), x = c.getContext("2d");
        x.imageSmoothingQuality = "high";
        x.drawImage(list[i], 0, 0, c.width, c.height);
        list[i + 1] = c;
      }
      i++;
    }
    return list[i];
  }

  function sizeView() {
    const [ow, oh] = outPx(spec());
    const avail = view.parentElement.clientWidth - 20, maxH = Math.min(innerHeight * 0.62, 520);
    let w = avail, h = (w * oh) / ow;
    if (h > maxH) { h = maxH; w = (h * ow) / oh; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    view.style.width = w + "px"; view.style.height = h + "px";
    view.width = Math.round(w * dpr); view.height = Math.round(h * dpr);
  }

  // Where the head is in output pixels, and the band the chin must sit in
  function geometry() {
    const sp = spec(), [ow, oh] = outPx(sp);
    const toOut = (x, y) => [ow / 2 + (x - s.cx) * s.k, oh / 2 + (y - s.cy) * s.k];
    const [, crownY] = toOut(0, s.face.crown), [faceX, chinY] = toOut(s.face.cx, s.face.chin);
    const mmPerPx = sp.h / oh, headMm = (chinY - crownY) * mmPerPx;
    return { sp, ow, oh, crownY, chinY, faceX, headMm, bandTop: crownY + sp.head[0] / mmPerPx, bandBottom: crownY + sp.head[1] / mmPerPx };
  }

  function render() {
    if (!s) return;
    const W = view.width, H = view.height;
    draw(vctx, W, H);
    const g = geometry(), r = W / g.ow;
    vctx.save();
    // Chin band (green), crown line and centre line
    vctx.fillStyle = "rgba(31, 224, 90, .16)";
    vctx.fillRect(0, g.bandTop * r, W, (g.bandBottom - g.bandTop) * r);
    vctx.strokeStyle = "rgba(10, 125, 54, .85)";
    vctx.lineWidth = Math.max(1, W / 300);
    vctx.setLineDash([8 * (W / 400), 6 * (W / 400)]);
    vctx.beginPath();
    for (const y of [g.crownY, g.bandTop, g.bandBottom]) { vctx.moveTo(0, y * r); vctx.lineTo(W, y * r); }
    vctx.moveTo(W / 2, 0); vctx.lineTo(W / 2, H);
    vctx.stroke();
    vctx.restore();
  }

  // ---------- Checks + digital photo ----------
  let exportTimer = 0, photoUrl = "";
  function update() {
    if (!s) return;
    const g = geometry(), sp = g.sp;
    const okHead = g.headMm >= sp.head[0] - 0.05 && g.headMm <= sp.head[1] + 0.05;
    const okCenter = Math.abs(g.faceX - g.ow / 2) <= g.ow * 0.04;
    const hasBg = !!(s.bg && s.cut);
    cHead.className = s.face.found ? (okHead ? "ok" : "bad") : "warn";
    cHead.lastChild.textContent = s.face.found ? `Head ${g.headMm.toFixed(1)} mm (needs ${sp.head[0]}–${sp.head[1]} mm)` : "Face not found: line your head up with the guides";
    cBg.className = hasBg ? "ok" : "warn";
    cBg.lastChild.textContent = hasBg ? "Plain background" : s.mask ? "Original background: most countries need plain white or light" : "Background: removing…";
    cCenter.className = okCenter ? "ok" : "warn";
    cCenter.lastChild.textContent = okCenter ? "Face centred" : "Move the face to the centre line";
    info.textContent = sp.note;
    clearTimeout(exportTimer);
    exportTimer = setTimeout(exportPhoto, 200);
  }
  [cHead, cBg, cCenter].forEach((li) => li.appendChild(document.createTextNode("")));

  async function exportPhoto() {
    if (!s) return;
    const sp = spec(), [ow, oh] = outPx(sp), c = canvas(ow, oh);
    draw(c.getContext("2d"), ow, oh);
    let blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
    if (sp.kb && blob.size > sp.kb * 1000) {
      let lo = 0.4, hi = 0.95, best = null;
      for (let i = 0; i < 7; i++) { const q = (lo + hi) / 2, b = await new Promise((r) => c.toBlob(r, "image/jpeg", q)); if (b.size <= sp.kb * 1000) { best = b; lo = q; } else hi = q; }
      blob = best || blob;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(blob);
    out.src = photoUrl; out.hidden = false; empty.hidden = true;
    dlPhoto.href = photoUrl;
    dlPhoto.download = `passport-photo-${specSel.value}-${ow}x${oh}.jpg`;
    dlPhoto.removeAttribute("aria-disabled");
    [dl46, dlA4].forEach((b) => (b.disabled = false));
    fPx.textContent = `${ow} × ${oh} px`;
    fSize.textContent = kb(blob.size) + (sp.kb ? (blob.size <= sp.kb * 1000 ? ` ✓ (max ${sp.kb} KB)` : ` (over ${sp.kb} KB)`) : "");
  }

  // ---------- Print sheets ----------
  // As many photos as fit at true size (300 DPI), in whichever orientation fits more, with thin
  // grey cut lines. Print at 100% ("actual size"), not "fit to page".
  function sheet(sheetW, sheetH, margin) {
    const sp = spec(), pw = mmPx(sp.w), ph = mmPx(sp.h);
    const fit = (W, H, gap) => ({ W, H, gap, cols: Math.floor((W - 2 * margin + gap) / (pw + gap)), rows: Math.floor((H - 2 * margin + gap) / (ph + gap)) });
    const options = [fit(sheetW, sheetH, 12), fit(sheetH, sheetW, 12), fit(sheetW, sheetH, 0), fit(sheetH, sheetW, 0)];
    const best = options.reduce((a, b) => (b.cols * b.rows > a.cols * a.rows ? b : a));
    const c = canvas(best.W, best.H), x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    const one = canvas(pw, ph);
    draw(one.getContext("2d"), pw, ph);
    const gw = best.cols * pw + (best.cols - 1) * best.gap, gh = best.rows * ph + (best.rows - 1) * best.gap;
    const ox = Math.round((best.W - gw) / 2), oy = Math.round((best.H - gh) / 2);
    x.strokeStyle = "#b8bfbb"; x.lineWidth = 1;
    for (let r = 0; r < best.rows; r++) for (let col = 0; col < best.cols; col++) {
      const px = ox + col * (pw + best.gap), py = oy + r * (ph + best.gap);
      x.drawImage(one, px, py);
      x.strokeRect(px - 0.5, py - 0.5, pw + 1, ph + 1);
    }
    return { c, n: best.cols * best.rows };
  }
  let sheetMsg = 0;
  async function downloadSheet(kind) {
    if (!s) return;
    const { c, n } = kind === "a4" ? sheet(2480, 3508, 60) : sheet(1800, 1200, 0);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `passport-photos-${specSel.value}-${kind === "a4" ? "A4" : "4x6in"}-${n}.jpg` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setStatus(`${n} photos on the ${kind === "a4" ? "A4" : "4 × 6 in"} sheet. Print at 100% (actual size).`);
    clearTimeout(sheetMsg);
    sheetMsg = setTimeout(() => setStatus(""), 6000);
  }
  dl46.addEventListener("click", () => downloadSheet("46"));
  dlA4.addEventListener("click", () => downloadSheet("a4"));

  // ---------- Controls ----------
  specSel.addEventListener("input", () => {
    customBox.hidden = specSel.value !== "custom";
    if (s) { s.bg = s.bg ? spec().bg : ""; syncSwatches(); autoFit(); } else info.textContent = spec().note;
  });
  [cw, ch].forEach((el) => el.addEventListener("input", () => { if (s) autoFit(); else info.textContent = spec().note; }));
  zoom.addEventListener("input", () => { if (!s) return; s.k = s.k0 * (zoom.value / 100); render(); update(); });
  $("#autofit").addEventListener("click", autoFit);
  $("#pick").addEventListener("click", () => fileInput.click());
  function syncSwatches() { swatches.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bg === (s ? s.bg : "#ffffff")))); }
  swatches.forEach((b) => b.addEventListener("click", () => { if (!s) return; s.bg = b.dataset.bg; syncSwatches(); render(); update(); }));

  // Drag to move, wheel or pinch to zoom
  const pointers = new Map();
  let pinch = null;
  const spread = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  view.addEventListener("pointerdown", (e) => { view.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 2) pinch = { d: spread(), z: Number(zoom.value) }; });
  view.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev || !s) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const [ow] = outPx(spec()), perCss = (s.k * view.clientWidth) / ow;
      s.cx -= (e.clientX - prev.x) / perCss;
      s.cy -= (e.clientY - prev.y) / perCss;
    } else if (pinch && pinch.d > 0) {
      zoom.value = Math.min(160, Math.max(60, (pinch.z * spread()) / pinch.d));
      s.k = s.k0 * (zoom.value / 100);
    }
    render(); update();
  });
  const release = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
  view.addEventListener("pointerup", release);
  view.addEventListener("pointercancel", release);
  view.addEventListener("wheel", (e) => {
    if (!s) return;
    e.preventDefault();
    zoom.value = Math.min(160, Math.max(60, Number(zoom.value) * Math.exp(-e.deltaY * 0.001)));
    s.k = s.k0 * (zoom.value / 100);
    render(); update();
  }, { passive: false });
  addEventListener("resize", () => { if (s) { sizeView(); render(); } });

  fileInput.addEventListener("change", () => { load(fileInput.files[0]); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { e.preventDefault(); load(e.dataTransfer?.files?.[0]); });
  document.addEventListener("paste", (e) => { const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/")); if (it) load(it.getAsFile()); });
  info.textContent = spec().note;
  syncSwatches();
})();
