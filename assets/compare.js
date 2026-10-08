// Document Compare (/tools/compare-documents): what changed between two versions of a document.
// Reads PDF (pdf.js text), Word .docx (its XML) and plain text in the browser, diffs sentence by
// sentence and then word by word inside changed sentences, so re-wrapped lines don't count as
// changes. Nothing is uploaded.
(() => {
  const root = document.getElementById("compare");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  const slots = {}, out = $("#cmp-doc"), result = $(".cmp-result"), summary = $("#cmp-summary"), err = $("#err");
  const ignoreCase = $("#ign-case"), ignoreSpace = $("#ign-space"), onlyChanges = $("#only-changes");
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

  // ---------- Reading files ----------
  async function pdfText(file) {
    const doc = await MiniPDF.openPdf(file), pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      let line = "", lastY = null, text = "";
      for (const it of tc.items) {
        const y = it.transform ? Math.round(it.transform[5]) : lastY;
        if (lastY !== null && Math.abs(y - lastY) > 2) { text += line.trimEnd() + "\n"; line = ""; }
        line += it.str + (it.hasEOL ? "\n" : "");
        lastY = y;
      }
      pages.push((text + line).trim());
    }
    MiniPDF.closePdf(doc);
    return pages.join("\n\n");
  }

  // A .docx is a ZIP; the words live in word/document.xml
  async function docxText(file) {
    const buf = new Uint8Array(await file.arrayBuffer()), v = new DataView(buf.buffer);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("zip");
    let p = v.getUint32(eocd + 16, true);
    const count = v.getUint16(eocd + 10, true);
    for (let n = 0; n < count; n++) {
      const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nameLen = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
      if (name === "word/document.xml") {
        const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true), data = buf.subarray(start, start + csize);
        const raw = method === 0 ? data : new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
        const xml = new DOMParser().parseFromString(new TextDecoder().decode(raw), "application/xml");
        const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", paras = [];
        for (const para of xml.getElementsByTagNameNS(W, "p")) {
          let t = "";
          for (const node of para.getElementsByTagNameNS(W, "*")) {
            if (node.localName === "t") t += node.textContent;
            else if (node.localName === "tab") t += "\t";
            else if (node.localName === "br") t += "\n";
          }
          paras.push(t);
        }
        return paras.join("\n");
      }
      p += 46 + nameLen + extra + comment;
    }
    throw new Error("docx");
  }

  async function readFile(file) {
    const n = file.name.toLowerCase();
    if (file.type === "application/pdf" || n.endsWith(".pdf")) return pdfText(file);
    if (n.endsWith(".docx")) return docxText(file);
    if (n.endsWith(".doc")) throw new Error("doc");
    return file.text();
  }

  // ---------- Slots ----------
  root.querySelectorAll("[data-slot]").forEach((el) => {
    const id = el.dataset.slot, input = el.querySelector("input[type=file]"), area = el.querySelector("textarea"), info = el.querySelector(".slot-info"), pick = el.querySelector(".drop");
    const set = (text, label) => {
      slots[id] = text;
      const words = (text.match(/\S+/g) || []).length;
      info.innerHTML = `<b>${esc(label)}</b> · ${words.toLocaleString("en")} words`;
      info.hidden = false;
      schedule();
    };
    input.addEventListener("change", async () => {
      const f = input.files[0];
      input.value = "";
      if (!f) return;
      showError("");
      info.hidden = false; info.textContent = `Reading ${f.name}…`;
      try {
        const text = await readFile(f);
        if (!text.trim()) throw new Error("empty");
        area.value = text; area.hidden = true;
        set(text, f.name);
      } catch (e) {
        console.warn("Compare: couldn't read", f.name, e);
        info.hidden = true;
        showError(e.message === "doc" ? "Old Word .doc files can't be read here. Save it as .docx or PDF first."
          : e.message === "empty" ? `${f.name} has no text to compare. If it's a scanned PDF, it's only pictures of text.`
          : `Couldn't read ${f.name}. Use a PDF, Word (.docx) or text file.`);
      }
    });
    el.querySelector("[data-paste]").addEventListener("click", () => { area.hidden = false; area.focus(); });
    area.addEventListener("input", () => { if (area.value.trim()) set(area.value, "Pasted text"); else { delete slots[id]; info.hidden = true; schedule(); } });
    pick.addEventListener("dragover", (e) => e.preventDefault());
    pick.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; input.dispatchEvent(new Event("change")); } });
  });
  $("#swap").addEventListener("click", () => {
    const [a, b] = ["a", "b"].map((k) => root.querySelector(`[data-slot="${k}"]`));
    [slots.a, slots.b] = [slots.b, slots.a];
    const ia = a.querySelector(".slot-info").innerHTML, ib = b.querySelector(".slot-info").innerHTML;
    a.querySelector(".slot-info").innerHTML = ib; b.querySelector(".slot-info").innerHTML = ia;
    a.querySelector(".slot-info").hidden = !slots.a; b.querySelector(".slot-info").hidden = !slots.b;
    const ta = a.querySelector("textarea").value; a.querySelector("textarea").value = b.querySelector("textarea").value; b.querySelector("textarea").value = ta;
    schedule();
  });

  // ---------- Diff ----------
  // Myers' O(ND) diff on two arrays of keys; returns [op, i, j] steps ("=", "-", "+").
  function myers(a, b, maxD) {
    const n = a.length, m = b.length, off = n + m + 1, trace = [];
    let v = new Int32Array(2 * off + 1);
    for (let d = 0; d <= n + m; d++) {
      if (d > maxD) return null;
      trace.push(v.slice(off - d - 1, off + d + 2));
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
        let y = x - k;
        while (x < n && y < m && a[x] === b[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) return backtrack(trace, a, b, d, n, m);
      }
    }
    return null;
  }
  function backtrack(trace, a, b, D, n, m) {
    const ops = [];
    let x = n, y = m;
    for (let d = D; d > 0; d--) {
      const vv = trace[d], at = (k) => vv[k + d + 1], k = x - y;
      const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
      const px = at(prevK), py = px - prevK;
      while (x > px && y > py) { ops.push(["=", --x, --y]); }
      if (x === px) ops.push(["+", x, --y]); else ops.push(["-", --x, y]);
    }
    while (x > 0 && y > 0) ops.push(["=", --x, --y]);
    return ops.reverse();
  }

  const norm = (t) => {
    let s = t.replace(/\r/g, "");
    if (ignoreSpace.checked) s = s.replace(/[ \t ]+/g, " ");
    return s;
  };
  // Sentences keep their trailing whitespace, so joining them gives the text back. When spacing
  // is ignored, line breaks don't end a sentence (PDF lines wrap differently from Word paragraphs);
  // otherwise each line break is its own piece and counts.
  const sentences = (t) => (ignoreSpace.checked
    ? t.match(/[^.!?]+(?:[.!?]+["')\]]*)?\s*|[.!?]+\s*/g)
    : t.match(/[^.!?\n]+(?:[.!?]+["')\]]*)?[ \t]*|\n+/g)) || [];
  const words = (t) => t.match(/\s+|[\p{L}\p{N}][\p{L}\p{N}'’\-]*|[^\s\p{L}\p{N}]/gu) || [];
  const key = (s) => { let k = ignoreCase.checked ? s.toLowerCase() : s; if (ignoreSpace.checked) k = k.replace(/\s+/g, " ").trim(); return k; };

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 150); }
  function run() {
    if (slots.a === undefined || slots.b === undefined) { result.hidden = true; return; }
    showError("");
    const A = sentences(norm(slots.a)), B = sentences(norm(slots.b));
    const ops = myers(A.map(key), B.map(key), 2500); // memory grows with the square of the differences
    if (!ops) { result.hidden = true; showError("These two documents are too different to compare sentence by sentence. Check that you picked two versions of the same document."); return; }

    // Group into unchanged runs and change blocks; inside a block compare word by word
    const parts = [];
    let del = [], ins = [];
    const flush = () => { if (del.length || ins.length) parts.push({ change: true, del: del.join(""), ins: ins.join("") }); del = []; ins = []; };
    for (const [op, i, j] of ops) {
      if (op === "=") { flush(); const last = parts[parts.length - 1]; if (last && !last.change) last.text += B[j]; else parts.push({ change: false, text: B[j] }); }
      else if (op === "-") del.push(A[i]); else ins.push(B[j]);
    }
    flush();

    let added = 0, removed = 0, n = 0;
    const html = parts.map((p) => {
      if (!p.change) {
        const t = p.text;
        if (!onlyChanges.checked) return esc(t);
        const s = sentences(t);
        if (s.length <= 3) return esc(t);
        return `${esc(s[0])}<span class="cmp-gap">… ${s.length - 2} unchanged …</span>${esc(s[s.length - 1])}`;
      }
      n++;
      const wa = words(p.del), wb = words(p.ins), wops = myers(wa.map(key), wb.map(key), 3000);
      let h = "";
      if (!wops) { h = `<del>${esc(p.del)}</del><ins>${esc(p.ins)}</ins>`; removed += wa.filter((w) => /\S/.test(w)).length; added += wb.filter((w) => /\S/.test(w)).length; }
      else {
        let d = "", a = "";
        const fl = () => { if (d) h += `<del>${esc(d)}</del>`; if (a) h += `<ins>${esc(a)}</ins>`; d = a = ""; };
        for (const [op, i, j] of wops) {
          if (op === "=") { fl(); h += esc(wb[j]); }
          else if (op === "-") { d += wa[i]; if (/\S/.test(wa[i])) removed++; }
          else { a += wb[j]; if (/\S/.test(wb[j])) added++; }
        }
        fl();
      }
      return `<span class="cmp-change" id="chg-${n}">${h}</span>`;
    }).join("");

    out.innerHTML = html || "<em>Both documents are empty.</em>";
    total = n; current = 0;
    summary.innerHTML = n
      ? `<b>${n} change${n === 1 ? "" : "s"}</b><span class="cmp-chip add">+${added.toLocaleString("en")} words</span><span class="cmp-chip del">−${removed.toLocaleString("en")} words</span>`
      : `<b class="same">No differences found.</b>`;
    $("#prev").disabled = $("#next").disabled = !n;
    result.hidden = false;
  }

  // ---------- Navigation ----------
  let total = 0, current = 0;
  function go(step) {
    if (!total) return;
    current = ((current - 1 + step + total) % total) + 1;
    const el = out.querySelector(`#chg-${current}`);
    out.querySelectorAll(".cmp-change.on").forEach((x) => x.classList.remove("on"));
    el.classList.add("on");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    $("#pos").textContent = `${current} / ${total}`;
  }
  $("#next").addEventListener("click", () => go(1));
  $("#prev").addEventListener("click", () => go(-1));
  $("#print").addEventListener("click", () => window.print());
  [ignoreCase, ignoreSpace, onlyChanges].forEach((el) => el.addEventListener("input", schedule));
})();
