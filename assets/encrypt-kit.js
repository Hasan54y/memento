// Encrypted Document Kit (/tools/encrypt-files): files + notes locked with a password into one
// self-contained HTML file that opens in any browser. AES-256-GCM with a PBKDF2-SHA256 key
// (600,000 rounds), all through the browser's Web Crypto; nothing is uploaded, and without the
// password nobody (including us) can open the kit.
(() => {
  const root = document.getElementById("vault");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const ITER = 600000, WARN_MB = 60;

  const tabs = [...root.querySelectorAll("[data-mode]")], createBox = $(".create"), openBox = $(".open");
  const drop = $("#drop"), fileInput = $("#file"), listBox = $(".pages"), list = $("#ilist"), countEl = $("#p-count"), notes = $("#notes");
  const title = $("#kit-title"), pw = $("#pw"), pw2 = $("#pw2"), hint = $("#hint"), meter = $("#meter"), meterText = $("#meter-text");
  const make = $("#make"), dl = $("#dl"), status = $("#status"), err = $("#err"), fFiles = $("#f-files"), fSize = $("#f-size");
  const openDrop = $("#open-drop"), openInput = $("#open-file"), viewer = $("#viewer"), openErr = $("#open-err");

  let items = [], nextId = 1, outUrl = "";
  const showError = (m) => { err.textContent = m; err.hidden = !m; };
  const setStatus = (m) => { status.textContent = m; status.hidden = !m; };
  const size = (b) => (b >= 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");
  const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- Files ----------
  function add(files) {
    for (const f of files) items.push({ id: nextId++, file: f });
    render(); stale();
  }
  function render() {
    listBox.hidden = !items.length;
    drop.classList.toggle("compact", !!items.length);
    const total = items.reduce((n, it) => n + it.file.size, 0);
    countEl.textContent = `${items.length} file${items.length === 1 ? "" : "s"} · ${size(total)}`;
    list.innerHTML = "";
    for (const it of items) {
      const li = document.createElement("li");
      const kind = it.file.type.startsWith("image/") ? "image" : /pdf$/.test(it.file.type) || /\.pdf$/i.test(it.file.name) ? "picture_as_pdf" : "description";
      li.innerHTML = `<span class="i-ico"><span class="ms" aria-hidden="true">${kind}</span></span><div class="i-name"></div>
        <button type="button" class="i-del" data-del="${it.id}" aria-label="Remove"><span class="ms">close</span></button>`;
      li.querySelector(".i-name").innerHTML = `${escHtml(it.file.name)}<small>${size(it.file.size)}</small>`;
      list.appendChild(li);
    }
    fFiles.textContent = items.length ? String(items.length) : "—";
    if (total > WARN_MB * 1e6) showError(`That's ${size(total)}. Kits over ${WARN_MB} MB can be slow to open on phones and too big to email.`); else showError("");
  }
  list.addEventListener("click", (e) => { const b = e.target.closest("[data-del]"); if (b) { items = items.filter((it) => String(it.id) !== b.dataset.del); render(); stale(); } });

  // ---------- Password strength (a simple estimate) ----------
  function strength(p) {
    let pool = 0;
    if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26; if (/\d/.test(p)) pool += 10; if (/[^A-Za-z0-9]/.test(p)) pool += 33;
    let bits = p.length * Math.log2(Math.max(pool, 1));
    if (/^(.)\1+$/.test(p) || /^(?:password|123456|qwerty)/i.test(p)) bits = Math.min(bits, 10);
    return bits;
  }
  function syncPw() {
    const b = strength(pw.value), lvl = !pw.value ? 0 : b < 40 ? 1 : b < 60 ? 2 : b < 80 ? 3 : 4;
    meter.dataset.level = lvl;
    meterText.textContent = ["", "Weak: easy to guess", "Fair: add more words or characters", "Good", "Strong"][lvl];
    stale();
  }
  function stale() {
    if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = ""; }
    dl.hidden = true; make.hidden = false;
    const okPw = pw.value.length >= 8 && pw.value === pw2.value;
    make.disabled = !(items.length || notes.value.trim()) || !okPw;
    $("#pw-match").hidden = !pw2.value || pw.value === pw2.value;
    fSize.textContent = "—";
  }

  // ---------- Making the kit ----------
  const b64 = (bytes) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(new Blob([bytes])); });

  async function build() {
    showError("");
    if (!crypto.subtle) { showError("This browser can't encrypt files here. Try an up-to-date Chrome, Edge, Firefox or Safari."); return; }
    make.disabled = true;
    try {
      setStatus("Reading files…");
      const datas = await Promise.all(items.map((it) => it.file.arrayBuffer().then((b) => new Uint8Array(b))));
      const head = new TextEncoder().encode(JSON.stringify({ notes: notes.value, created: new Date().toISOString(), files: items.map((it, i) => ({ name: it.file.name, type: it.file.type || "application/octet-stream", size: datas[i].length })) }));
      const total = 4 + head.length + datas.reduce((n, d) => n + d.length, 0), plain = new Uint8Array(total);
      new DataView(plain.buffer).setUint32(0, head.length);
      plain.set(head, 4);
      let o = 4 + head.length;
      for (const d of datas) { plain.set(d, o); o += d.length; }

      setStatus("Locking with your password…");
      await new Promise((r) => setTimeout(r, 30));
      const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw.value), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
      plain.fill(0);

      setStatus("Packing the kit…");
      const kit = { v: 1, alg: "AES-256-GCM", kdf: "PBKDF2-SHA256", iter: ITER, salt: await b64(salt), iv: await b64(iv), ct: await b64(ct) };
      const html = kitHtml(title.value.trim() || "Document kit", hint.value.trim(), kit);
      const blob = new Blob([html], { type: "text/html" });
      outUrl = URL.createObjectURL(blob);
      dl.href = outUrl;
      dl.download = `${(title.value.trim() || "document-kit").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60)}.html`;
      dl.hidden = false; make.hidden = true;
      fSize.textContent = size(blob.size);
      setStatus("");
    } catch (e) {
      setStatus("");
      showError("Couldn't make the kit. If the files are very large, try fewer at a time.");
      make.disabled = false;
    }
  }
  make.addEventListener("click", build);

  // ---------- The kit file ----------
  // Self-contained: no fonts, scripts or images from the internet, so it opens offline.
  function kitHtml(name, hintText, kit) {
    const runtime = `(${kitRuntime.toString()})();`;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="memento-document-kit"><meta name="robots" content="noindex">
<title>${escHtml(name)} (locked)</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#f4f7f5;color:#0f1713;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:720px;margin:0 auto;padding:32px 16px}.card{background:#fff;border:1px solid #e1e7e3;border-radius:18px;padding:24px}
h1{font-size:24px;margin:8px 0 4px}.sub{color:#5d6b64;margin:0 0 18px;font-size:14px}.lock{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#e6f9ec}
input{width:100%;font:inherit;padding:12px 14px;border:1px solid #cfd7d2;border-radius:12px}input:focus{outline:2px solid #0a7d36;border-color:#0a7d36}
button,.btn{font:inherit;font-weight:700;border:0;border-radius:12px;padding:11px 18px;background:#1fe05a;color:#04140a;cursor:pointer;text-decoration:none;display:inline-block}
.ghost{background:#fff;border:1px solid #cfd7d2;color:#0f1713;padding:7px 12px;font-size:14px}.row{display:flex;gap:10px;margin-top:12px}.row input{flex:1}
.err{color:#b42318;font-size:14px;margin:10px 0 0}.hint{font-size:14px;color:#5d6b64;margin:10px 0 0}.notes{white-space:pre-wrap;background:#f4f7f5;border-radius:12px;padding:14px;margin:0 0 16px}
ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}li{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #e1e7e3;border-radius:12px}
li img{width:56px;height:56px;object-fit:cover;border-radius:8px;background:#f1f4f2}li .ic{width:56px;height:56px;border-radius:8px;background:#f1f4f2;display:grid;place-items:center;font-size:12px;font-weight:700;color:#5d6b64}
li .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}li small{display:block;color:#5d6b64;font-weight:400}
.foot{text-align:center;color:#5d6b64;font-size:13px;margin-top:18px}.foot a{color:#0a7d36}[hidden]{display:none!important}
</style></head><body><div class="wrap"><div class="card">
<div class="lock"><svg width="26" height="26" viewBox="0 0 24 24" fill="#0a7d36"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg></div>
<h1 id="name">${escHtml(name)}</h1><p class="sub" id="sub">Locked with a password. Everything is decrypted inside this browser; nothing is sent anywhere.</p>
<form id="form"><div class="row"><input id="pw" type="password" placeholder="Password" autocomplete="current-password" autofocus><button type="submit">Unlock</button></div>
${hintText ? `<p class="hint">Hint: ${escHtml(hintText)}</p>` : ""}<p class="err" id="err" hidden></p></form>
<div id="content" hidden><div class="notes" id="notes" hidden></div><ul id="files"></ul><div class="row"><button type="button" class="ghost" id="relock">Lock again</button></div></div>
</div><p class="foot">Made with <a href="https://mementoapp.online/tools/encrypt-files">Memento Tools</a> · AES-256-GCM encryption</p></div>
<script type="application/json" id="kit">${JSON.stringify(kit)}</script>
<script>${runtime}</script>
</body></html>`;
  }

  // Runs inside the kit file (serialised with toString, so it must not use anything from outside)
  function kitRuntime() {
    const K = JSON.parse(document.getElementById("kit").textContent);
    const $ = (id) => document.getElementById(id);
    const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const size = (b) => (b >= 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1000)) + " KB");
    const urls = [];
    $("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("err");
      err.hidden = true;
      if (!window.crypto || !crypto.subtle) {
        err.textContent = "This browser won't decrypt files opened from here. Open mementoapp.online/tools/encrypt-files, choose Open a kit and pick this file: it's unlocked on your device, nothing is uploaded.";
        err.hidden = false;
        return;
      }
      const btn = e.target.querySelector("button");
      btn.disabled = true; btn.textContent = "Unlocking…";
      try {
        const base = await crypto.subtle.importKey("raw", new TextEncoder().encode($("pw").value), "PBKDF2", false, ["deriveKey"]);
        const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: fromB64(K.salt), iterations: K.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
        const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(K.iv) }, key, fromB64(K.ct)));
        const n = new DataView(plain.buffer).getUint32(0), head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + n)));
        let o = 4 + n;
        if (head.notes) { $("notes").textContent = head.notes; $("notes").hidden = false; }
        const ul = $("files");
        for (const f of head.files) {
          const blob = new Blob([plain.subarray(o, o + f.size)], { type: f.type }); o += f.size;
          const url = URL.createObjectURL(blob); urls.push(url);
          const li = document.createElement("li");
          const thumb = f.type.startsWith("image/") ? document.createElement("img") : document.createElement("span");
          if (thumb.tagName === "IMG") { thumb.src = url; thumb.alt = ""; } else { thumb.className = "ic"; thumb.textContent = (f.name.split(".").pop() || "file").slice(0, 4).toUpperCase(); }
          const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = f.name;
          const sm = document.createElement("small"); sm.textContent = size(f.size); nm.appendChild(sm);
          const open = Object.assign(document.createElement("a"), { className: "btn ghost", href: url, target: "_blank", rel: "noopener", textContent: "Open" });
          const save = Object.assign(document.createElement("a"), { className: "btn ghost", href: url, download: f.name, textContent: "Save" });
          li.append(thumb, nm, open, save);
          ul.appendChild(li);
        }
        $("form").hidden = true; $("content").hidden = false;
        $("sub").textContent = `Unlocked: ${head.files.length} file${head.files.length === 1 ? "" : "s"}${head.notes ? " and notes" : ""}. Close or reload this page to lock it again.`;
      } catch (x) {
        err.textContent = "Wrong password, or the file is damaged.";
        err.hidden = false;
        btn.disabled = false; btn.textContent = "Unlock";
      }
    });
    $("relock").addEventListener("click", () => { urls.forEach((u) => URL.revokeObjectURL(u)); location.reload(); });
  }

  // ---------- Opening a kit on this page ----------
  // The kit is shown in a sandboxed frame: it runs its own unlock code, but can't touch this page.
  async function openKit(f) {
    openErr.hidden = true;
    if (!f) return;
    const text = await f.text();
    if (!/name="generator" content="memento-document-kit"/.test(text) || !/id="kit"/.test(text)) {
      openErr.textContent = "That isn't a Memento document kit. Choose the .html file this tool made.";
      openErr.hidden = false;
      return;
    }
    viewer.srcdoc = text;
    viewer.hidden = false;
    openDrop.classList.add("compact");
  }
  openInput.addEventListener("change", () => { openKit(openInput.files[0]); openInput.value = ""; });

  // ---------- Wiring ----------
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    createBox.hidden = t.dataset.mode !== "create";
    openBox.hidden = t.dataset.mode !== "open";
  }));
  fileInput.addEventListener("change", () => { add([...fileInput.files]); fileInput.value = ""; });
  $("#add-more").addEventListener("click", () => fileInput.click());
  [notes, title, hint, pw2].forEach((el) => el.addEventListener("input", stale));
  pw.addEventListener("input", syncPw);
  $("#show-pw").addEventListener("change", (e) => { pw.type = pw2.type = e.target.checked ? "text" : "password"; });
  ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); }));
  root.addEventListener("drop", (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    if (!openBox.hidden) openKit(files[0]); else add(files);
  });
  syncPw();
})();
