// MiniPDF: the small PDF toolkit behind Image to PDF and Compress PDF. Pages are JPEG images,
// written straight into a PDF file (no library needed), all inside the browser.
(() => {
  const enc = new TextEncoder();
  const n2 = (v) => (Math.round(v * 100) / 100).toString();

  // pages: [{ jpeg: Uint8Array, w, h (pixels), pageW, pageH, x, y, dw, dh (points, from top-left) }]
  function build(pages, title = "Document") {
    const chunks = [], offsets = [];
    let len = 0;
    const push = (d) => { const b = typeof d === "string" ? enc.encode(d) : d; chunks.push(b); len += b.length; };
    const obj = (id, ...parts) => { offsets[id] = len; push(`${id} 0 obj\n`); parts.forEach(push); push("\nendobj\n"); };

    push("%PDF-1.4\n");
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker
    const kids = pages.map((_, i) => `${4 + i * 3} 0 R`).join(" ");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
    const safe = title.replace(/[()\\]/g, "").slice(0, 80);
    obj(3, `<< /Title (${safe}) /Producer (Memento Tools - mementoapp.online/tools) >>`);
    pages.forEach((p, i) => {
      const page = 4 + i * 3, content = page + 1, image = page + 2;
      const y = p.pageH - p.y - p.dh;
      const stream = `q ${n2(p.dw)} 0 0 ${n2(p.dh)} ${n2(p.x)} ${n2(y)} cm /Im0 Do Q`;
      obj(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(p.pageW)} ${n2(p.pageH)}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`);
      obj(content, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      obj(image, `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, "\nendstream");
    });
    const count = 4 + pages.length * 3;
    const xref = len;
    let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let i = 1; i < count; i++) table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    push(table);
    push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: "application/pdf" });
  }

  async function jpeg(canvas, q) {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", q));
    return new Uint8Array(await blob.arrayBuffer());
  }

  // Scanned look: paper -> white, ink a little darker (same idea as the signature clean-up).
  // With onlyDocuments, colourful photos are left alone: only pages that are mostly
  // greyish paper get whitened. Returns whether the page was changed.
  function whiten(canvas, strength = 0.6, onlyDocuments = false) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
    const hist = new Uint32Array(256), step = Math.max(4, Math.floor(d.length / 4 / 40000) * 4);
    let n = 0, grey = 0;
    for (let i = 0; i < d.length; i += step) {
      hist[(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0]++;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx > 60 && (mx - mn) / mx < 0.2) grey++;
      n++;
    }
    if (onlyDocuments && grey / n < 0.6) return false;
    let need = n * 0.85, paper = 255;
    for (let v = 0; v < 256; v++) if ((need -= hist[v]) <= 0) { paper = Math.max(v, 80); break; }
    const hi = paper * (0.95 - 0.2 * strength), lo = hi * (0.3 + 0.35 * strength), span = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) {
      let t = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] - lo) / span;
      t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      const ink = (1 - t) * 0.85, w = 255 * t;
      d[i] = d[i] * ink + w; d[i + 1] = d[i + 1] * ink + w; d[i + 2] = d[i + 2] * ink + w;
    }
    ctx.putImageData(img, 0, 0);
    return true;
  }

  function grayscale(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    ctx.putImageData(img, 0, 0);
  }

  // Make every page, then shrink resolution/quality until the whole PDF fits under `limit` bytes.
  // render(i, scale) must return { canvas, place } where place has pageW, pageH, x, y, dw, dh.
  async function makePdf({ count, render, quality = 0.82, limit = 0, title, onProgress = () => {} }) {
    let scale = 1, q = quality, best = null;
    for (let attempt = 0; attempt < 7; attempt++) {
      const pages = [];
      let total = 600;
      for (let i = 0; i < count; i++) {
        onProgress(i, count, attempt);
        const { canvas, place } = await render(i, scale);
        const bytes = await jpeg(canvas, q);
        pages.push({ jpeg: bytes, w: canvas.width, h: canvas.height, ...place });
        total += bytes.length + 420;
        canvas.width = canvas.height = 0; // free the memory early
      }
      const blob = build(pages, title);
      if (!best || blob.size < best.blob.size) best = { blob, scale, q };
      if (!limit || blob.size <= limit) return { blob, fits: true, scale, q };
      // Too big: lower JPEG quality first (cheap on looks), then resolution
      const ratio = limit / blob.size;
      if (q > 0.5) q = Math.max(0.45, q - (ratio < 0.5 ? 0.3 : 0.17));
      else scale *= Math.max(0.45, Math.min(0.92, Math.sqrt(ratio) * 0.95));
      if (scale < 0.2) break;
    }
    return { blob: best.blob, fits: false, scale: best.scale, q: best.q };
  }

  // Page sizes in PDF points (1/72 inch)
  const SIZES = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] };

  // ---------- Reading PDFs (pdf.js, self-hosted: its worker has to be same-origin) ----------
  const PDFJS = "/assets/vendor/pdfjs/";
  const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/";
  let pdfjs = null;
  async function openPdf(file) {
    if (!pdfjs) {
      pdfjs = await import(`${PDFJS}pdf.min.mjs`);
      pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
    }
    return pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: `${PDFJS_CDN}cmaps/`, cMapPacked: true, standardFontDataUrl: `${PDFJS_CDN}standard_fonts/`,
      wasmUrl: `${PDFJS_CDN}wasm/`, iccUrl: `${PDFJS_CDN}iccs/`,
    }).promise;
  }

  // One page onto a white canvas at `scale` (1 = 72 DPI)
  async function renderPage(doc, n, scale) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.floor(vp.width));
    c.height = Math.max(1, Math.floor(vp.height));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, canvas: c, viewport: vp, background: "#ffffff" }).promise;
    const size = page.getViewport({ scale: 1 });
    page.cleanup();
    return { canvas: c, pageW: size.width, pageH: size.height };
  }

  window.MiniPDF = { build, jpeg, whiten, grayscale, makePdf, SIZES, openPdf, renderPage };

  // ---------- MiniZip: a "stored" ZIP (JPG/PNG are already compressed) ----------
  const CRC = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[i] = c >>> 0; }
  const crc32 = (d) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

  // files: [{ name, data: Uint8Array }]
  function zip(files) {
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + size;
    }
    const cdSize = central.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
  }
  window.MiniZip = { zip };
})();
