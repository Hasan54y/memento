// MementoMatte: on-device background removal shared by the photo tools. MODNet (portrait matting,
// Apache-2.0) runs through onnxruntime-web; the engine and model download only when first needed,
// and the model is kept in Cache Storage so it downloads once.
(() => {
  const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
  const MODEL_URL = "/assets/models/modnet_fp16.onnx";
  const MODEL_CACHE = "memento-tools-models-v1";
  const MASK_MAX = 1400; // longest side of the (editable) mask
  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });

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

  let model = null, loaded = false;
  function getModel(onStatus) {
    if (!model) model = (async () => {
      const ort = await import(`${ORT}ort.wasm.min.mjs`);
      ort.env.wasm.wasmPaths = ORT;
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      const bytes = await fetchModel((p) => onStatus(`Downloading the background tool… ${Math.round(p * 100)}% (first time only, about 16 MB)`));
      onStatus("Starting the background tool…");
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      loaded = true;
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

  // Mask of the person in src (alpha = person). The first pass finds them; when they fill only
  // part of the photo, a second pass on just that area gives the model more pixels and sharper hair.
  async function mask(src, onStatus = () => {}) {
    const m = await getModel(onStatus);
    const W = src.width, H = src.height;
    onStatus("Finding you in the photo…");
    const m1 = await matte(m, src, 0, 0, W, H);
    const keep1 = mainBlob(m1);
    let x0 = m1.w, y0 = m1.h, x1 = -1, y1 = -1, sum = 0;
    for (let y = 0; y < m1.h; y++) for (let x = 0; x < m1.w; x++) {
      const i = y * m1.w + x;
      if (keep1[i] && m1.data[i] > 0.5) { sum++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0 || sum < m1.w * m1.h * 0.01) throw new Error("noperson");
    const scale = Math.min(1, MASK_MAX / Math.max(W, H));
    const out = canvas(Math.max(1, Math.round(W * scale)), Math.max(1, Math.round(H * scale)));
    const fx = W / m1.w, fy = H / m1.h, padX = (x1 - x0 + 1) * 0.08 * fx, padY = (y1 - y0 + 1) * 0.08 * fy;
    const rx = Math.max(0, x0 * fx - padX), ry = Math.max(0, y0 * fy - padY);
    const rw = Math.min(W, (x1 + 1) * fx + padX) - rx, rh = Math.min(H, (y1 + 1) * fy + padY) - ry;
    if (rw * rh < W * H * 0.6) {
      onStatus("Refining the edges…");
      const m2 = await matte(m, src, rx, ry, rw, rh);
      paintMatte(out, m2, mainBlob(m2), rx, ry, rw, rh, scale);
    } else {
      paintMatte(out, m1, keep1, 0, 0, W, H, scale);
    }
    return out;
  }

  // Colours for the person that also reach past their edges. Soft edge pixels in the photo are a
  // mix of the person and the old background, which shows as a dark or coloured halo on the new
  // one. So take only the solid inside of the person and spread those colours outwards
  // (push-pull: shrink by halves, then grow back, filling gaps from the coarser level).
  function fill(src, m) {
    const W = src.width, H = src.height;
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
    return acc;
  }

  // The person on a transparent background: the edge-safe colours, shaped by the soft mask.
  // Pass the previous result as `into` to reuse its canvas.
  function cut(src, m, f, into) {
    const out = into && into.width === src.width && into.height === src.height ? into : canvas(src.width, src.height);
    const cc = out.getContext("2d");
    cc.globalCompositeOperation = "copy";
    cc.drawImage(f, 0, 0);
    cc.globalCompositeOperation = "destination-in";
    cc.imageSmoothingQuality = "high";
    cc.drawImage(m, 0, 0, src.width, src.height);
    cc.globalCompositeOperation = "source-over";
    return out;
  }

  window.MementoMatte = { mask, fill, cut, get loaded() { return loaded; } };
})();
