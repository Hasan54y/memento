// ID Copy Maker (/tools/id-copy): photos of a card's front and back become a straight, true-size
// copy on one A4/Letter page, with an optional "safe copy" watermark and blacked-out details.
// Everything happens in the browser; nothing is uploaded.
(() => {
  const root = document.getElementById("idcopy");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const DOCS = { id: [85.6, 54], passport: [125, 88] };
  const PAPER = { a4: { mm: [210, 297], pt: [595.28, 841.89] }, letter: { mm: [215.9, 279.4], pt: [612, 792] } };
  const DPI = 300, px = (mm) => Math.round((mm / 25.4) * DPI);

  const tabs = [...root.querySelectorAll("[data-side]")], drop = $("#drop"), dropTitle = $("[data-drop-title]"), fileInput = $("#file");
  const editor = $(".editor"), crop = $("#crop"), cctx = crop.getContext("2d"), card = $("#card"), kctx = card.getContext("2d");
  const redactBtn = $("#redact"), undoBox = $("#undo-box"), redactHint = $(".redact-hint");
  const docSel = $("#doc"), customBox = $(".custom-mm"), cmw = $("#cmw"), cmh = $("#cmh"), paper = $("#paper"), color = $("#color"), wm = $("#wm"), wmDate = $("#wm-date");
  const wmStyle = $(".wm-style"), wmPos = $("#wm-pos"), wmOp = $("#wm-op"), wmSize = $("#wm-size"), wmColors = [...root.querySelectorAll("[data-wmc]")];
  let wmColor = "#b4231b";
  const page = $("#page"), pctx = page.getContext("2d"), dlPdf = $("#dl-pdf"), dlJpg = $("#dl-jpg"), status = $("#status"), err = $("#err");

  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  const sides = { front: null, back: null }; // { img, data, corners: [TL,TR,BR,BL], rot, boxes: [[x,y,w,h] 0..1] }
  let side = "front", redacting = false;

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
  async function load(file) {
    if (!file) return;
    showError("");
    let b;
    try { b = await decode(file); } catch { showError("This file can't be opened. Use a JPG, PNG or WebP photo (for iPhone HEIC, take a screenshot of it first)."); return; }
    const W0 = b.naturalWidth || b.width, H0 = b.naturalHeight || b.height, k = Math.min(1, 2000 / Math.max(W0, H0));
    const img = canvas(Math.round(W0 * k), Math.round(H0 * k)), x = img.getContext("2d", { willReadFrequently: true });
    x.drawImage(b, 0, 0, img.width, img.height);
    if (b.close) b.close();
    const s = { img, data: x.getImageData(0, 0, img.width, img.height), rot: 0, boxes: [] };
    s.corners = detect(s) || inset(s);
    sides[side] = s;
    show();
    if (!s.detected) showError("Couldn't find the card's edges on its own. Drag the four corners onto the card's corners.");
  }
  const inset = (s) => { const w = s.img.width, h = s.img.height, m = 0.1; return [[w * m, h * m], [w * (1 - m), h * m], [w * (1 - m), h * (1 - m)], [w * m, h * (1 - m)]]; };

  // ---------- Finding the card ----------
  // Works on a small copy. Candidates come from two masks: "not the table" (pixels unlike the
  // colours along the photo's border) and plain light/dark thresholds. Each mask is "closed" so a
  // magnetic stripe or a dark header band doesn't split the card. The winner is the biggest
  // filled four-cornered shape whose proportions are closest to the chosen document's.
  function detect(s) {
    const k = Math.min(1, 360 / Math.max(s.img.width, s.img.height)), w = Math.max(8, Math.round(s.img.width * k)), h = Math.max(8, Math.round(s.img.height * k)), n = w * h;
    const c = canvas(w, h), x = c.getContext("2d", { willReadFrequently: true });
    x.filter = "blur(1.5px)";
    x.drawImage(s.img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    const masks = [];

    // 1. Table colours from a band around the border (small k-means), then "far from all of them"
    const band = Math.max(2, Math.round(Math.min(w, h) * 0.04)), samples = [];
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) if (X < band || Y(y) || X >= w - band) samples.push(((y * w + X) * 4));
    function Y(y) { return y < band || y >= h - band; }
    let centers = [0, 1, 2, 3, 4, 5].map((i) => { const p = samples[Math.floor(((i + 0.5) / 6) * samples.length)]; return [d[p], d[p + 1], d[p + 2]]; });
    const near = (r, g, b) => { let best = Infinity; for (const C of centers) { const q = (r - C[0]) ** 2 + (g - C[1]) ** 2 + (b - C[2]) ** 2; if (q < best) best = q; } return Math.sqrt(best); };
    for (let it = 0; it < 6; it++) {
      const acc = centers.map(() => [0, 0, 0, 0]);
      for (const p of samples) {
        let bi = 0, bd = Infinity;
        centers.forEach((C, i) => { const q = (d[p] - C[0]) ** 2 + (d[p + 1] - C[1]) ** 2 + (d[p + 2] - C[2]) ** 2; if (q < bd) { bd = q; bi = i; } });
        const a = acc[bi]; a[0] += d[p]; a[1] += d[p + 1]; a[2] += d[p + 2]; a[3]++;
      }
      centers = acc.map((a, i) => (a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : centers[i]));
    }
    const sd = samples.map((p) => near(d[p], d[p + 1], d[p + 2])).sort((a, b) => a - b);
    const limit = Math.max(22, sd[Math.floor(sd.length * 0.95)] * 1.8);
    const fg = new Uint8Array(n);
    for (let i = 0; i < n; i++) fg[i] = near(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > limit ? 1 : 0;
    masks.push(close(fg, w, h, Math.round(Math.min(w, h) * 0.035)));

    // 2. Light and dark halves (Otsu)
    const g = new Uint8Array(n), hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) { g[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) | 0; hist[g[i]]++; }
    let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
    let sumB = 0, wB = 0, best = 0, t = 128;
    for (let v = 0; v < 256; v++) {
      wB += hist[v]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sumB += v * hist[v];
      const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
      if (between > best) { best = between; t = v; }
    }
    for (const light of [true, false]) {
      const m = new Uint8Array(n);
      for (let i = 0; i < n; i++) m[i] = light ? (g[i] > t ? 1 : 0) : g[i] <= t ? 1 : 0;
      masks.push(close(m, w, h, Math.round(Math.min(w, h) * 0.06)));
    }

    const [dw, dh] = docMm(), want = Math.max(dw, dh) / Math.min(dw, dh);
    let pick = null;
    for (const m of masks) for (const cand of blobs(m, w, h)) {
      const q = cand.quad, side = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const across = (side(q[0], q[1]) + side(q[3], q[2])) / 2, down = (side(q[0], q[3]) + side(q[1], q[2])) / 2;
      const aspect = Math.max(across, down) / Math.max(1, Math.min(across, down));
      const score = cand.area * Math.exp(-Math.abs(Math.log(aspect / want)) * 5);
      if (!pick || score > pick.score) pick = { score, quad: q };
    }
    if (!pick) { s.detected = false; return null; }
    s.detected = true;
    return pick.quad.map(([X, Yy]) => [(X + 0.5) / k, (Yy + 0.5) / k]);
  }

  // Fill gaps narrower than about 2r: grow the mask by r, then shrink it back by r
  function close(m, w, h, r) {
    if (r < 1) return m;
    const pass = (src, grow, horiz) => {
      const out = new Uint8Array(src.length);
      for (let a = 0; a < (horiz ? h : w); a++) {
        const len = horiz ? w : h, at = (i) => (horiz ? a * w + i : i * w + a);
        let count = 0; // ones inside the window [i - r, i + r]
        for (let i = 0; i <= Math.min(r, len - 1); i++) count += src[at(i)];
        for (let i = 0; i < len; i++) {
          const size = Math.min(len - 1, i + r) - Math.max(0, i - r) + 1;
          out[at(i)] = grow ? (count > 0 ? 1 : 0) : count === size ? 1 : 0;
          if (i + r + 1 < len) count += src[at(i + r + 1)];
          if (i - r >= 0) count -= src[at(i - r)];
        }
      }
      return out;
    };
    return pass(pass(pass(pass(m, true, true), true, false), false, true), false, false);
  }

  // Connected shapes that could be the card: big enough, not mostly along the border, and
  // filling the four-cornered outline made by their extreme points
  function blobs(m, w, h) {
    const seen = new Uint8Array(w * h), out = [];
    for (let i = 0; i < w * h; i++) {
      if (seen[i] || !m[i]) continue;
      const stack = [i];
      seen[i] = 1;
      let area = 0, edge = 0, tl = null, tr = null, br = null, bl = null;
      while (stack.length) {
        const p = stack.pop(), X = p % w, Yy = (p - X) / w;
        area++;
        if (X === 0 || Yy === 0 || X === w - 1 || Yy === h - 1) edge++;
        if (!tl || X + Yy < tl[0] + tl[1]) tl = [X, Yy];
        if (!br || X + Yy > br[0] + br[1]) br = [X, Yy];
        if (!tr || X - Yy > tr[0] - tr[1]) tr = [X, Yy];
        if (!bl || X - Yy < bl[0] - bl[1]) bl = [X, Yy];
        for (const q of [X > 0 ? p - 1 : -1, X < w - 1 ? p + 1 : -1, Yy > 0 ? p - w : -1, Yy < h - 1 ? p + w : -1]) if (q >= 0 && !seen[q] && m[q]) { seen[q] = 1; stack.push(q); }
      }
      if (area < w * h * 0.06 || area > w * h * 0.95 || edge > (w + h) * 0.25) continue;
      const quad = [tl, tr, br, bl], qa = Math.abs(quad.reduce((a, p, j) => { const nx = quad[(j + 1) % 4]; return a + p[0] * nx[1] - nx[0] * p[1]; }, 0)) / 2;
      if (qa < 1 || area / qa < 0.85) continue;
      out.push({ area, quad });
    }
    return out;
  }
  const docMm = () => (docSel.value === "custom" ? [Number(cmw.value) || 85.6, Number(cmh.value) || 54] : DOCS[docSel.value]);

  // ---------- Straightening ----------
  // Homography taking the output rectangle (u, v) to the photo (x, y)
  function homography(dst, src) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [u, v] = dst[i], [x, y] = src[i];
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
    }
    for (let c = 0; c < 8; c++) { // Gaussian elimination with partial pivoting
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    return b.map((v, i) => v / A[i][i]);
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Card size in mm, turned to match how the card lies in the photo
  function cardMm(s) {
    let [w, h] = docSel.value === "custom" ? [Math.min(300, Math.max(20, Number(cmw.value) || 85.6)), Math.min(300, Math.max(20, Number(cmh.value) || 54))] : DOCS[docSel.value];
    const c = s.corners, across = (dist(c[0], c[1]) + dist(c[3], c[2])) / 2, down = (dist(c[0], c[3]) + dist(c[1], c[2])) / 2;
    if ((across >= down) !== (w >= h)) [w, h] = [h, w];
    return s.rot % 180 ? [h, w] : [w, h];
  }

  // The straightened card at W×H (before rotation), with colour mode, black boxes and watermark
  function render(s, W, H) {
    const rotated = s.rot % 180 !== 0, [w0, h0] = rotated ? [H, W] : [W, H];
    const Hm = homography([[0, 0], [w0, 0], [w0, h0], [0, h0]], s.corners);
    const out = canvas(w0, h0), ox = out.getContext("2d"), od = ox.createImageData(w0, h0), o = od.data;
    const sd = s.data.data, sw = s.data.width, sh = s.data.height;
    for (let v = 0; v < h0; v++) for (let u = 0; u < w0; u++) {
      const U = u + 0.5, V = v + 0.5, z = Hm[6] * U + Hm[7] * V + 1;
      let x = (Hm[0] * U + Hm[1] * V + Hm[2]) / z - 0.5, y = (Hm[3] * U + Hm[4] * V + Hm[5]) / z - 0.5;
      x = Math.min(sw - 1.001, Math.max(0, x)); y = Math.min(sh - 1.001, Math.max(0, y));
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4, j = (v * w0 + u) * 4;
      for (let c = 0; c < 3; c++) o[j + c] = (sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx) * (1 - fy) + (sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx) * fy;
      o[j + 3] = 255;
    }
    if (color.value !== "color") for (let j = 0; j < o.length; j += 4) {
      let l = 0.299 * o[j] + 0.587 * o[j + 1] + 0.114 * o[j + 2];
      if (color.value === "bw") l = l < 70 ? 0 : l > 190 ? 255 : ((l - 70) / 120) * 255; // photocopy look
      o[j] = o[j + 1] = o[j + 2] = l;
    }
    ox.putImageData(od, 0, 0);
    let c = out;
    if (s.rot) {
      c = canvas(W, H);
      const x = c.getContext("2d");
      x.translate(W / 2, H / 2); x.rotate((s.rot * Math.PI) / 180); x.drawImage(out, -w0 / 2, -h0 / 2);
    }
    const x = c.getContext("2d");
    x.fillStyle = "#000";
    for (const [bx, by, bw, bh] of s.boxes) x.fillRect(bx * W, by * H, bw * W, bh * H);
    watermark(x, W, H);
    return c;
  }

  function watermarkText() {
    const t = wm.value.trim();
    if (!t) return "";
    return wmDate.checked ? `${t} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : t;
  }
  // Colour, opacity, size and placement come from the watermark controls. On greyscale and
  // black-and-white copies the colour is turned to its grey so it matches the page.
  function watermark(x, W, H) {
    const t = watermarkText();
    if (!t) return;
    let [r, g, b] = [1, 3, 5].map((i) => parseInt(wmColor.slice(i, i + 2), 16));
    if (color.value !== "color") r = g = b = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const alpha = Number(wmOp.value) / 100, scale = Number(wmSize.value) / 100;
    let size = Math.max(8, H * 0.06 * scale);
    x.save();
    const font = (px) => `700 ${px}px "Plus Jakarta Sans", Arial, sans-serif`;
    x.font = font(size);
    x.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    x.textAlign = "center"; x.textBaseline = "middle";
    const pos = wmPos.value;
    if (pos === "tile") {
      x.translate(W / 2, H / 2); x.rotate(-Math.PI / 9);
      const step = x.measureText(t).width + size * 2, diag = Math.hypot(W, H);
      for (let row = -diag / 2, n = 0; row < diag / 2; row += size * 2.6, n++) {
        for (let col = -diag / 2 - (n % 2) * step / 2; col < diag / 2 + step; col += step) x.fillText(t, col, row);
      }
    } else {
      // One line: shrink it if it wouldn't fit across the card
      const room = pos === "diag" ? Math.hypot(W, H) * 0.86 : W * 0.92, wide = x.measureText(t).width;
      if (wide > room) { size *= room / wide; x.font = font(size); }
      if (pos === "bottom") { x.translate(W / 2, H - size * 0.9); }
      else { x.translate(W / 2, H / 2); if (pos === "diag") x.rotate(-Math.atan2(H, W)); }
      x.fillText(t, 0, 0);
    }
    x.restore();
  }

  // ---------- Corner editor ----------
  let view = { k: 1, ox: 0, oy: 0 }, dragging = -1;
  function drawCrop() {
    const s = sides[side];
    if (!s) return;
    const avail = crop.parentElement.clientWidth - 20, maxH = Math.min(innerHeight * 0.5, 420);
    let w = avail, h = (w * s.img.height) / s.img.width;
    if (h > maxH) { h = maxH; w = (h * s.img.width) / s.img.height; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    crop.style.width = w + "px"; crop.style.height = h + "px";
    crop.width = Math.round(w * dpr); crop.height = Math.round(h * dpr);
    view.k = crop.width / s.img.width;
    cctx.drawImage(s.img, 0, 0, crop.width, crop.height);
    const P = s.corners.map(([X, Y]) => [X * view.k, Y * view.k]);
    cctx.save();
    cctx.fillStyle = "rgba(15, 23, 19, .45)";
    cctx.beginPath(); cctx.rect(0, 0, crop.width, crop.height);
    cctx.moveTo(...P[0]); P.slice(1).forEach((p) => cctx.lineTo(...p)); cctx.closePath();
    cctx.fill("evenodd");
    cctx.strokeStyle = "#1fe05a"; cctx.lineWidth = 2 * dpr;
    cctx.beginPath(); cctx.moveTo(...P[0]); P.slice(1).forEach((p) => cctx.lineTo(...p)); cctx.closePath(); cctx.stroke();
    for (const p of P) { cctx.beginPath(); cctx.arc(p[0], p[1], 9 * dpr, 0, 7); cctx.fillStyle = "#fff"; cctx.fill(); cctx.lineWidth = 3 * dpr; cctx.stroke(); }
    cctx.restore();
  }
  const toImg = (e) => { const r = crop.getBoundingClientRect(), s = sides[side]; return [((e.clientX - r.left) / r.width) * s.img.width, ((e.clientY - r.top) / r.height) * s.img.height]; };
  crop.addEventListener("pointerdown", (e) => {
    const s = sides[side];
    if (!s) return;
    const p = toImg(e), r = crop.getBoundingClientRect(), tol = (40 / r.width) * s.img.width;
    let best = -1, bd = Infinity;
    s.corners.forEach((c, i) => { const d = dist(c, p); if (d < bd) { bd = d; best = i; } });
    if (bd <= tol) { dragging = best; crop.setPointerCapture(e.pointerId); }
  });
  crop.addEventListener("pointermove", (e) => {
    if (dragging < 0) return;
    const s = sides[side], [x, y] = toImg(e);
    s.corners[dragging] = [Math.min(s.img.width, Math.max(0, x)), Math.min(s.img.height, Math.max(0, y))];
    drawCrop();
    schedule(true);
  });
  const endDrag = () => { if (dragging >= 0) { dragging = -1; schedule(); } };
  crop.addEventListener("pointerup", endDrag);
  crop.addEventListener("pointercancel", endDrag);

  // ---------- Card preview + black boxes ----------
  function drawCard() {
    const s = sides[side];
    if (!s) return;
    const [mw, mh] = cardMm(s), avail = card.parentElement.clientWidth - 20;
    const w = Math.min(avail, 520), h = (w * mh) / mw, dpr = Math.min(devicePixelRatio || 1, 2);
    card.style.width = w + "px"; card.style.height = h + "px";
    const c = render(s, Math.round(w * dpr), Math.round(h * dpr));
    card.width = c.width; card.height = c.height;
    kctx.drawImage(c, 0, 0);
    if (boxDraft) { kctx.strokeStyle = "#1fe05a"; kctx.lineWidth = 2 * dpr; kctx.strokeRect(boxDraft[0] * card.width, boxDraft[1] * card.height, boxDraft[2] * card.width, boxDraft[3] * card.height); }
  }
  let boxDraft = null, boxStart = null;
  const toCard = (e) => { const r = card.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  card.addEventListener("pointerdown", (e) => { if (!redacting || !sides[side]) return; card.setPointerCapture(e.pointerId); boxStart = toCard(e); boxDraft = [...boxStart, 0, 0]; });
  card.addEventListener("pointermove", (e) => {
    if (!boxStart) return;
    const [x, y] = toCard(e);
    boxDraft = [Math.min(x, boxStart[0]), Math.min(y, boxStart[1]), Math.abs(x - boxStart[0]), Math.abs(y - boxStart[1])];
    drawCard();
  });
  const endBox = () => {
    if (!boxStart) return;
    if (boxDraft && boxDraft[2] > 0.01 && boxDraft[3] > 0.01) sides[side].boxes.push(boxDraft);
    boxStart = boxDraft = null;
    syncButtons(); schedule();
  };
  card.addEventListener("pointerup", endBox);
  card.addEventListener("pointercancel", endBox);
  redactBtn.addEventListener("click", () => { redacting = !redacting; redactBtn.setAttribute("aria-pressed", String(redacting)); redactHint.hidden = !redacting; card.classList.toggle("drawing", redacting); });
  undoBox.addEventListener("click", () => { const s = sides[side]; if (s && s.boxes.length) { s.boxes.pop(); syncButtons(); schedule(); } });

  // ---------- Page ----------
  function layoutPage() {
    const p = PAPER[paper.value], W = px(p.mm[0]), H = px(p.mm[1]);
    const items = ["front", "back"].filter((k) => sides[k]).map((k) => { const [w, h] = cardMm(sides[k]); return { k, w: px(w), h: px(h) }; });
    const gap = px(18), total = items.reduce((n, it) => n + it.h, 0) + gap * Math.max(0, items.length - 1);
    let y = Math.round((H - total) / 2);
    items.forEach((it) => { it.x = Math.round((W - it.w) / 2); it.y = y; y += it.h + gap; });
    return { W, H, items };
  }
  function drawPagePreview() {
    const L = layoutPage(), w = page.parentElement.clientWidth - 2, k = w / L.W, dpr = Math.min(devicePixelRatio || 1, 2);
    page.style.width = w + "px"; page.style.height = L.H * k + "px";
    page.width = Math.round(w * dpr); page.height = Math.round(L.H * k * dpr);
    const s2 = k * dpr;
    pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, page.width, page.height);
    for (const it of L.items) {
      const c = render(sides[it.k], Math.max(2, Math.round(it.w * s2)), Math.max(2, Math.round(it.h * s2)));
      pctx.drawImage(c, Math.round(it.x * s2), Math.round(it.y * s2));
    }
  }
  function fullPage() {
    const L = layoutPage(), c = canvas(L.W, L.H), x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, L.W, L.H);
    for (const it of L.items) x.drawImage(render(sides[it.k], it.w, it.h), it.x, it.y);
    return c;
  }
  const save = (blob, name) => {
    const url = URL.createObjectURL(blob), a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const fileBase = () => (docSel.value === "passport" ? "passport-copy" : "id-copy");
  dlPdf.addEventListener("click", async () => {
    setStatus("Making the PDF…");
    await new Promise((r) => setTimeout(r, 30));
    const c = fullPage(), p = PAPER[paper.value];
    const jpeg = await MiniPDF.jpeg(c, 0.9);
    save(MiniPDF.build([{ jpeg, w: c.width, h: c.height, pageW: p.pt[0], pageH: p.pt[1], x: 0, y: 0, dw: p.pt[0], dh: p.pt[1] }], "ID copy"), `${fileBase()}.pdf`);
    setStatus("Print at 100% (actual size) so the card prints at its real size.");
  });
  dlJpg.addEventListener("click", async () => {
    setStatus("Making the image…");
    await new Promise((r) => setTimeout(r, 30));
    save(await new Promise((r) => fullPage().toBlob(r, "image/jpeg", 0.92)), `${fileBase()}.jpg`);
    setStatus("");
  });

  // ---------- Wiring ----------
  let timer = 0;
  function schedule(cardOnly) {
    clearTimeout(timer);
    timer = setTimeout(() => { drawCard(); if (!cardOnly) drawPagePreview(); }, cardOnly ? 30 : 120);
  }
  function syncButtons() {
    const any = sides.front || sides.back;
    dlPdf.disabled = dlJpg.disabled = !any;
    undoBox.disabled = !(sides[side] && sides[side].boxes.length);
    tabs.forEach((t) => t.classList.toggle("has", !!sides[t.dataset.side]));
  }
  function show() {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.side === side)));
    dropTitle.textContent = side === "front" ? "Add a photo of the front" : "Add a photo of the back (optional)";
    const s = sides[side];
    drop.hidden = !!s;
    editor.hidden = !s;
    if (s) { drawCrop(); drawCard(); }
    drawPagePreview();
    syncButtons();
  }
  tabs.forEach((t) => t.addEventListener("click", () => { side = t.dataset.side; showError(""); show(); }));
  $("#detect").addEventListener("click", () => { const s = sides[side]; if (!s) return; const c = detect(s); if (c) { s.corners = c; showError(""); } else showError("Couldn't find the card's edges. Drag the corners by hand; a plain surface that contrasts with the card helps."); drawCrop(); schedule(); });
  $("#rotate").addEventListener("click", () => { const s = sides[side]; if (!s) return; s.rot = (s.rot + 90) % 360; s.boxes = []; syncButtons(); schedule(); });
  $("#pick").addEventListener("click", () => fileInput.click());
  $("#remove").addEventListener("click", () => { sides[side] = null; showError(""); show(); });
  docSel.addEventListener("input", () => { customBox.hidden = docSel.value !== "custom"; schedule(); });
  [cmw, cmh, paper, color, wm, wmDate, wmPos, wmOp, wmSize].forEach((el) => el.addEventListener("input", () => { syncWm(); schedule(); }));
  wmColors.forEach((b) => b.addEventListener("click", () => { wmColor = b.dataset.wmc; syncWm(); schedule(); }));
  function syncWm() {
    wmStyle.hidden = !wm.value.trim();
    $("#wm-op-val").textContent = `${wmOp.value}%`;
    $("#wm-size-val").textContent = `${wmSize.value}%`;
    wmColors.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wmc === wmColor)));
  }
  fileInput.addEventListener("change", () => { load(fileInput.files[0]); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { e.preventDefault(); load(e.dataTransfer?.files?.[0]); });
  addEventListener("resize", () => { if (sides[side]) { drawCrop(); schedule(); } else drawPagePreview(); });
  show();
})();
