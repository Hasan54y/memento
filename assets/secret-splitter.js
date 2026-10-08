// Secret Splitter (/tools/secret-splitter): Shamir's secret sharing in the browser. A secret is
// split into n pieces so that any k of them bring it back, and fewer than k reveal nothing.
// Pieces are text codes with a QR (qrcode-generator, MIT); recovery reads codes or QR photos
// (BarcodeDetector, or jsQR, Apache-2.0, loaded only when needed). Nothing is uploaded.
(() => {
  const root = document.getElementById("splitter");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const enc = new TextEncoder(), dec = new TextDecoder("utf-8", { fatal: true });
  const MAX = 1000;

  // ---------- GF(256) arithmetic and Shamir's scheme ----------
  const EXP = new Uint8Array(510), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = EXP[i + 255] = x; LOG[x] = i; x ^= (x << 1) ^ (x & 0x80 ? 0x11b : 0); }
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  const div = (a, b) => (a ? EXP[LOG[a] + 255 - LOG[b]] : 0);

  function split(bytes, n, k) {
    const shares = Array.from({ length: n }, () => new Uint8Array(bytes.length));
    const coef = new Uint8Array(k - 1);
    for (let p = 0; p < bytes.length; p++) {
      crypto.getRandomValues(coef);
      for (let i = 0; i < n; i++) {
        const x = i + 1;
        let y = 0;
        for (let c = k - 2; c >= 0; c--) y = mul(y ^ coef[c], x); // Horner, constant term added last
        shares[i][p] = y ^ bytes[p];
      }
    }
    return shares;
  }
  function combine(parts) { // [{ x, data }], exactly k of them
    const out = new Uint8Array(parts[0].data.length);
    const L = parts.map((a, i) => parts.reduce((l, b, j) => (i === j ? l : mul(l, div(b.x, b.x ^ a.x))), 1));
    for (let p = 0; p < out.length; p++) out[p] = parts.reduce((s, a, i) => s ^ mul(a.data[p], L[i]), 0);
    return out;
  }

  // ---------- Piece codes: MSS1-<set>-<k>-<x>-<data>-<check>, all QR-alphanumeric ----------
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function b32(bytes) {
    let out = "", bits = 0, v = 0;
    for (const b of bytes) { v = (v << 8) | b; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } }
    if (bits) out += B32[(v << (5 - bits)) & 31];
    return out;
  }
  function unb32(s) {
    const out = [];
    let bits = 0, v = 0;
    for (const ch of s) { v = (v << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } }
    return new Uint8Array(out);
  }
  const sha = async (data) => new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const check = async (body) => b32(await sha(enc.encode(body))).slice(0, 4);
  const PIECE = /MSS1-([A-Z2-7]{4})-(\d{1,2})-(\d{1,2})-([A-Z2-7]+)-([A-Z2-7]{4})/g;
  const pretty = (code) => { const m = /^(MSS1-[A-Z2-7]{4}-\d+-\d+-)([A-Z2-7]+)(-[A-Z2-7]{4})$/.exec(code); return m ? `${m[1]} ${m[2].match(/.{1,4}/g).join(" ")} ${m[3]}` : code; };

  // ---------- QR ----------
  function qrMatrix(text) {
    try {
      const q = qrcode(0, "M");
      q.addData(text, "Alphanumeric");
      q.make();
      const n = q.getModuleCount();
      return n > 117 ? null : { n, dark: (r, c) => q.isDark(r, c) }; // bigger than version 25 is too dense to print and scan
    } catch { return null; }
  }
  function drawQr(ctx, m, x, y, size) {
    const cell = Math.floor(size / (m.n + 8)), off = Math.floor((size - cell * m.n) / 2);
    ctx.fillStyle = "#fff"; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#000";
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) ctx.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
  }

  // ---------- Split ----------
  const secret = $("#secret"), label = $("#label"), nSel = $("#n"), kSel = $("#k"), make = $("#make"), count = $("#count");
  const out = $(".ss-out"), cards = $("#cards"), err = $("#err"), summary = $("#ss-summary"), pdfBtn = $("#pdf");
  let pieces = [];
  const showError = (el, m) => { el.textContent = m; el.hidden = !m; };

  function syncK() {
    const n = +nSel.value, k = Math.min(+kSel.value || 2, n);
    kSel.innerHTML = Array.from({ length: n - 1 }, (_, i) => `<option value="${i + 2}"${i + 2 === k ? " selected" : ""}>${i + 2}</option>`).join("");
    stale();
  }
  function stale() {
    out.hidden = true;
    pieces = [];
    const len = enc.encode(secret.value).length;
    count.textContent = `${len} / ${MAX} bytes`;
    count.classList.toggle("bad", len > MAX);
    make.disabled = !secret.value.trim() || len > MAX;
  }
  nSel.addEventListener("change", syncK);
  [secret, label, kSel].forEach((el) => el.addEventListener("input", stale));

  make.addEventListener("click", async () => {
    showError(err, "");
    const text = secret.value, n = +nSel.value, k = +kSel.value;
    const raw = enc.encode(text);
    if (!text.trim() || raw.length > MAX) return;
    const data = new Uint8Array(raw.length + 4);
    data.set((await sha(raw)).subarray(0, 4)); data.set(raw, 4); // lets recovery tell a right answer from a wrong one
    const set = b32(crypto.getRandomValues(new Uint8Array(3))).slice(0, 4);
    const shares = split(data, n, k);
    pieces = [];
    for (let i = 0; i < n; i++) {
      const body = `MSS1-${set}-${k}-${i + 1}-${b32(shares[i])}`;
      pieces.push({ x: i + 1, code: `${body}-${await check(body)}` });
    }
    const name = label.value.trim();
    summary.innerHTML = `<b>${n} pieces made.</b> Any ${k} of them bring the secret back; ${k - 1 === 1 ? "one piece on its own reveals" : `${k - 1} pieces on their own reveal`} nothing.`;
    cards.innerHTML = "";
    for (const p of pieces) {
      const m = qrMatrix(p.code), li = document.createElement("li");
      li.className = "ss-card";
      li.innerHTML = `<div class="ss-card-head"><b>Piece ${p.x} of ${n}</b><span>${name ? esc(name) + " · " : ""}any ${k} recover it</span></div>
        <div class="ss-qr"></div>
        <code class="ss-code">${pretty(p.code)}</code>
        <div class="ss-card-bar">
          <button type="button" class="btn btn-ghost btn-sm" data-act="copy"><span class="ms" aria-hidden="true">content_copy</span>Copy</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="txt"><span class="ms" aria-hidden="true">download</span>Save .txt</button>
        </div>`;
      li.dataset.x = p.x;
      if (m) {
        const c = Object.assign(document.createElement("canvas"), { width: 360, height: 360 });
        drawQr(c.getContext("2d"), m, 0, 0, 360);
        c.setAttribute("aria-label", `QR code for piece ${p.x}`);
        li.querySelector(".ss-qr").appendChild(c);
      } else li.querySelector(".ss-qr").innerHTML = `<p class="sub">Too long for a QR code. Use the text code.</p>`;
      cards.appendChild(li);
    }
    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const save = (blob, file) => {
    const url = URL.createObjectURL(blob), a = Object.assign(document.createElement("a"), { href: url, download: file });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const fileBase = () => (label.value.trim() || "secret").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 40);
  const instructions = (k) => `To recover the secret, bring together any ${k} pieces and open mementoapp.online/tools/secret-splitter, choose Recover, then paste or scan them.`;

  cards.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const p = pieces.find((q) => String(q.x) === b.closest(".ss-card").dataset.x), k = +kSel.value, n = pieces.length;
    if (b.dataset.act === "copy") {
      try { await navigator.clipboard.writeText(p.code); b.lastChild.textContent = "Copied"; setTimeout(() => (b.lastChild.textContent = "Copy"), 1500); }
      catch { showError(err, "Couldn't copy. Select the code and copy it by hand."); }
    } else {
      const name = label.value.trim();
      save(new Blob([`Secret piece ${p.x} of ${n}${name ? ` (${name})` : ""}\r\n\r\n${p.code}\r\n\r\nAny ${k} of the ${n} pieces recover the secret. ${instructions(k)}\r\n`], { type: "text/plain" }), `${fileBase()}-piece-${p.x}-of-${n}.txt`);
    }
  });

  // Words split into lines that fit maxW at the context's current font
  function wrap(ctx, text, maxW) {
    const lines = [""];
    for (const w of text.split(" ")) {
      const t = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
      if (lines[lines.length - 1] && ctx.measureText(t).width > maxW) lines.push(w); else lines[lines.length - 1] = t;
    }
    return lines;
  }

  // One piece per A4 page, so each can be printed and handed out on its own
  pdfBtn.addEventListener("click", async () => {
    if (!pieces.length) return;
    pdfBtn.disabled = true;
    try {
      const W = 1240, H = 1754, [pw, ph] = MiniPDF.SIZES.a4, k = +kSel.value, n = pieces.length, name = label.value.trim();
      const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const pages = [];
      for (const p of pieces) {
        const c = Object.assign(document.createElement("canvas"), { width: W, height: H }), x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
        x.fillStyle = "#0b1a12"; x.textAlign = "center";
        x.font = "700 64px system-ui, sans-serif"; x.fillText(`Secret piece ${p.x} of ${n}`, W / 2, 180);
        x.font = "600 38px system-ui, sans-serif"; x.fillStyle = "#3d4a43";
        let y = 250;
        if (name) { x.fillText(name, W / 2, y); y += 56; }
        x.font = "400 32px system-ui, sans-serif";
        for (const l of wrap(x, `Any ${k} of the ${n} pieces recover the secret. One piece alone reveals nothing.`, W - 260)) { x.fillText(l, W / 2, y); y += 44; }
        const m = qrMatrix(p.code);
        y += 30;
        if (m) { drawQr(x, m, (W - 720) / 2, y, 720); y += 760; }
        x.font = "500 30px ui-monospace, Consolas, monospace"; x.fillStyle = "#0b1a12";
        const lines = wrap(x, pretty(p.code), W - 240);
        lines.slice(0, 18).forEach((l, i) => x.fillText(l, W / 2, y + i * 44));
        y += Math.min(lines.length, 18) * 44 + 50;
        x.font = "400 28px system-ui, sans-serif"; x.fillStyle = "#3d4a43";
        wrap(x, instructions(k), W - 240).forEach((l, i) => x.fillText(l, W / 2, Math.max(y, H - 260) + i * 40));
        x.fillText(`Made ${date} · Keep this page private and safe`, W / 2, H - 90);
        x.strokeStyle = "#cfd8d3"; x.lineWidth = 3; x.setLineDash([16, 12]); x.strokeRect(60, 60, W - 120, H - 120);
        pages.push({ jpeg: await MiniPDF.jpeg(c, 0.92), w: W, h: H, pageW: pw, pageH: ph, x: 0, y: 0, dw: pw, dh: ph });
      }
      save(MiniPDF.build(pages, `${name || "Secret"} pieces`), `${fileBase()}-pieces.pdf`);
    } catch { showError(err, "Couldn't make the PDF. Copy or save the pieces one by one instead."); }
    pdfBtn.disabled = false;
  });

  // ---------- Recover ----------
  const box = $("#pieces"), found = $("#found"), rErr = $("#r-err"), result = $(".ss-secret"), secretOut = $("#secret-out"), scanIn = $("#scan-file"), scanStatus = $("#scan-status");

  async function recover() {
    showError(rErr, "");
    result.hidden = true;
    const text = box.value.toUpperCase().replace(/\s+/g, "");
    const all = [...text.matchAll(PIECE)];
    if (!all.length) { found.innerHTML = box.value.trim() ? `<span class="sub">No piece codes found yet. Each one starts with MSS1-.</span>` : ""; return; }
    const good = new Map(), bad = [];
    for (const m of all) {
      const body = m[0].slice(0, -5);
      if (m[5] !== await check(body)) { bad.push(+m[3]); continue; }
      good.set(+m[3], { set: m[1], k: +m[2], x: +m[3], data: unb32(m[4]) });
    }
    const list = [...good.values()], sets = new Set(list.map((p) => p.set));
    const k = list.length ? list[0].k : 0;
    found.innerHTML = [...list.map((p) => `<span class="ss-chip ok"><span class="ms" aria-hidden="true">check</span>Piece ${p.x}</span>`),
      ...bad.map((x) => `<span class="ss-chip bad"><span class="ms" aria-hidden="true">close</span>Piece ${x || "?"} has a typo</span>`)].join("")
      + (list.length && sets.size === 1 ? `<span class="sub">${list.length >= k ? `Enough pieces (${k} needed)` : `${list.length} of ${k} needed`}</span>` : "");
    if (bad.length) showError(rErr, `Piece ${bad.join(", ")} doesn't match its check letters at the end. Look for a mistyped character (for example 0 and O, or 1 and I).`);
    if (sets.size > 1) { showError(rErr, "These pieces come from different splits. Only pieces made together can be combined."); return; }
    if (!list.length || list.length < k) return;
    const data = combine(list.slice(0, k));
    const raw = data.subarray(4), ok = (await sha(raw)).subarray(0, 4).every((b, i) => b === data[i]);
    let value = null;
    try { value = ok ? dec.decode(raw) : null; } catch { value = null; }
    if (value === null) { showError(rErr, "These pieces don't fit together. One of them may be from a different split or damaged."); return; }
    secretOut.textContent = value;
    result.hidden = false;
  }
  box.addEventListener("input", recover);
  $("#copy-secret").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(secretOut.textContent); b.lastChild.textContent = "Copied"; setTimeout(() => (b.lastChild.textContent = "Copy"), 1500); } catch { /* user can select it */ }
  });

  // Reading QR codes from photos
  let jsQRLoad = null;
  const loadJsQR = () => (jsQRLoad ||= new Promise((ok, fail) => {
    const s = Object.assign(document.createElement("script"), { src: "/assets/vendor/jsqr/jsQR.min.js", onload: () => ok(window.jsQR), onerror: () => { jsQRLoad = null; fail(new Error("jsQR")); } });
    document.head.appendChild(s);
  }));
  async function readQr(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      if ("BarcodeDetector" in window) {
        try {
          const codes = await new BarcodeDetector({ formats: ["qr_code"] }).detect(bmp);
          if (codes.length) return codes.map((c) => c.rawValue);
        } catch { /* fall back to jsQR */ }
      }
      const jsQR = await loadJsQR();
      for (const side of [1600, 1000, 2400]) {
        const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
        const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) }), x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(bmp, 0, 0, c.width, c.height);
        const r = jsQR(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
        if (r) return [r.data];
        if (k === 1) break;
      }
      return [];
    } finally { bmp.close(); }
  }
  scanIn.addEventListener("change", async () => {
    const files = [...scanIn.files];
    scanIn.value = "";
    let added = 0, missed = 0;
    for (const f of files) {
      showError(scanStatus, `Reading ${f.name}…`);
      try {
        const codes = (await readQr(f)).filter((t) => /^MSS1-/.test(t));
        if (codes.length) { box.value = `${box.value.trim()}\n${codes.join("\n")}`.trim(); added += codes.length; } else missed++;
      } catch { missed++; }
    }
    showError(scanStatus, missed ? `${added ? `Added ${added}. ` : ""}No piece QR code found in ${missed} photo${missed > 1 ? "s" : ""}. Take it closer, flat and in good light, or type the code.` : "");
    recover();
  });

  // ---------- Tabs ----------
  root.querySelectorAll("[data-mode]").forEach((t) => t.addEventListener("click", () => {
    root.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-selected", String(b === t)));
    $(".ss-split").hidden = t.dataset.mode !== "split";
    $(".ss-recover").hidden = t.dataset.mode !== "recover";
  }));
  if (location.hash === "#recover") root.querySelector('[data-mode="recover"]').click();
  syncK();
})();
