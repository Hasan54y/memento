// Memento Tools: search and category filter on /tools/, the shared header, and ads.
(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ---------- Ads (Google AdSense) ----------
  // A placement only shows once it has an ad unit (data-slot); AdSense handles consent in Europe.
  document.querySelectorAll("[data-ad]").forEach((slot) => {
    const id = slot.dataset.slot;
    if (!id) return;
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.dataset.adClient = "ca-pub-9066794566087802";
    ins.dataset.adSlot = id;
    ins.dataset.adFormat = slot.dataset.ad === "box" ? "rectangle" : "auto";
    ins.dataset.fullWidthResponsive = "true";
    slot.querySelector(".ad-box").appendChild(ins);
    slot.hidden = false;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked: the tools still work */ }
  });

  const grid = document.querySelector("[data-tool-grid]");
  if (!grid) return; // tool pages: the search form simply submits to /tools/?q=

  const tiles = [...grid.children];
  tiles.forEach((t) => { t.names = t.dataset.name.split(/[^\p{L}\p{N}]+/u).filter(Boolean); }); // match from the start of words
  const input = document.querySelector(".t-search input");
  const cats = [...document.querySelectorAll(".t-cats [data-cat]")];
  const title = document.querySelector("[data-grid-title]");
  const count = document.querySelector("[data-count]");
  const empty = document.querySelector("[data-empty]");
  let cat = "all";

  function apply() {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    tiles.forEach((t) => {
      const ok = (cat === "all" || t.dataset.cat === cat) && words.every((w) => t.names.some((n) => n.startsWith(w)));
      t.hidden = !ok;
      if (ok) shown++;
    });
    cats.forEach((a) => a.classList.toggle("on", a.dataset.cat === cat));
    const active = cats.find((a) => a.dataset.cat === cat);
    title.textContent = words.length ? "Search results" : active ? active.dataset.label : "All tools";
    count.textContent = `${shown} tool${shown === 1 ? "" : "s"}`;
    empty.hidden = shown > 0;
  }

  const fromHash = () => {
    const h = location.hash.slice(1);
    cat = cats.some((a) => a.dataset.cat === h) ? h : "all";
  };

  cats.forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    cat = a.dataset.cat;
    history.replaceState(null, "", cat === "all" ? location.pathname + location.search : "#" + cat);
    apply();
  }));
  // Filter as you type instead of reloading the page
  input.form.addEventListener("submit", (e) => { e.preventDefault(); apply(); });
  input.addEventListener("input", apply);
  addEventListener("hashchange", () => { fromHash(); apply(); });

  input.value = new URLSearchParams(location.search).get("q") || "";
  fromHash();
  apply();
})();
