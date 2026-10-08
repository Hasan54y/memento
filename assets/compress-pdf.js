// Compress PDF (/tools/compress-pdf): each page is redrawn as a lighter image with pdf.js and
// written into a new PDF, all in the browser. Nothing is uploaded.
(() => {
  const root = document.getElementById("pdfcomp");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const LEVELS = { small: { dpi: 96, q: 0.6 }, balanced: { dpi: 130, q: 0.72 }, sharp: { dpi: 170, q: 0.82 } };

  const drop = $("#drop"), fileInput = $("#file"), info = $(".pdf-info"), fName = $("#pdf-name"), fMeta = $("#pdf-meta");
  const level = [...root.querySelectorAll("[name=level]")], maxkb = $("#maxkb"), gray = $("#gray");
  const make = $("#make"), dl = $("#dl"), status = $("#status"), err = $("#err");
  const fOrig = $("#f-orig"), fNew = $("#f-new"), fSaved = $("#f-saved");

  let doc = null, file = null, outUrl = "";
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const kb = (b) => (b >= 1e6 ? (b / 1e6).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");

  async function open(f) {
    showError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) { showError("Choose a PDF file."); return; }
    setStatus("Opening the PDF…");
    try {
      if (doc) { MiniPDF.closePdf(doc); doc = null; }
      doc = await MiniPDF.openPdf(f);
      file = f;
      fName.textContent = f.name;
      fMeta.textContent = `${doc.numPages} page${doc.numPages === 1 ? "" : "s"} · ${kb(f.size)}`;
      fOrig.textContent = kb(f.size);
      info.hidden = false;
      drop.classList.add("compact");
      setStatus("");
      stale();
    } catch (e) {
      setStatus("");
      file = doc = null;
      info.hidden = true;
      showError(e && e.name === "PasswordException"
        ? "This PDF is password-protected. Remove the password first, then try again."
        : "This PDF couldn't be opened. It may be damaged, or the tool couldn't load. Check your connection and try again.");
      stale();
    }
  }

  function stale() {
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ""; }
    dl.hidden = true;
    make.hidden = false;
    make.disabled = !doc;
    fNew.textContent = fSaved.textContent = "—";
    fNew.className = fSaved.className = "";
    if (!doc) fOrig.textContent = "—";
  }
  [...level, maxkb, gray].forEach((el) => el.addEventListener("input", stale));
  root.querySelectorAll("[data-kb]").forEach((b) => b.addEventListener("click", () => { maxkb.value = b.dataset.kb; stale(); }));

  async function render(i, scale) {
    const L = LEVELS[level.find((r) => r.checked).value];
    const { canvas: c, pageW, pageH } = await MiniPDF.renderPage(doc, i + 1, (L.dpi / 72) * scale);
    if (gray.checked) MiniPDF.grayscale(c);
    return { canvas: c, place: { pageW, pageH, x: 0, y: 0, dw: pageW, dh: pageH } };
  }

  make.addEventListener("click", async () => {
    if (!doc) return;
    showError("");
    make.disabled = true;
    const L = LEVELS[level.find((r) => r.checked).value];
    const limitKb = Number(maxkb.value), limit = limitKb > 0 ? limitKb * 1000 : 0;
    try {
      const res = await MiniPDF.makePdf({
        count: doc.numPages, render, quality: L.q, limit, title: file.name.replace(/\.pdf$/i, ""),
        onProgress: (i, n, attempt) => setStatus(attempt ? `Squeezing more… page ${i + 1} of ${n}` : `Compressing page ${i + 1} of ${n}…`),
      });
      setStatus("");
      const saved = 1 - res.blob.size / file.size;
      fNew.textContent = limit ? `${kb(res.blob.size)} ${res.fits ? "✓" : "✗"}` : kb(res.blob.size);
      fNew.className = res.fits && saved > 0 ? "ok" : "bad";
      fSaved.textContent = saved > 0 ? `${Math.round(saved * 100)}% smaller` : "Not smaller";
      fSaved.className = saved > 0 ? "ok" : "bad";
      outUrl = URL.createObjectURL(res.blob);
      dl.href = outUrl;
      dl.download = file.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
      dl.hidden = false;
      make.hidden = true;
      if (saved <= 0) showError("Your PDF is already about as small as it gets. The compressed copy isn't smaller, so keep the original.");
      else if (!res.fits) showError(`Couldn't get it under ${limitKb} KB while keeping the pages readable. The smallest version (${kb(res.blob.size)}) is ready; for less, choose "Smallest" or turn on Black & white.`);
    } catch (e) {
      setStatus("");
      showError("Something went wrong while compressing. Try again, or try a smaller PDF.");
      make.disabled = false;
    }
  });

  fileInput.addEventListener("change", () => { open(fileInput.files[0]); fileInput.value = ""; });
  $("#pick").addEventListener("click", () => fileInput.click());
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, () => drop.classList.remove("over")));
  root.addEventListener("drop", (e) => { e.preventDefault(); open(e.dataTransfer?.files?.[0]); });
  stale();
})();
