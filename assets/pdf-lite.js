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

  window.MiniPDF = { build, jpeg, whiten, grayscale, makePdf, SIZES };
})();
