// Age calculator (/tools/age-calculator): exact age on any date, plus a check against a
// circular's age limits. Pure date arithmetic in the browser; nothing is sent anywhere.
(() => {
  const root = document.getElementById("agecalc");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const dob = $("#dob"), on = $("#on"), minAge = $("#minage"), maxAge = $("#maxage");
  const aY = $("#a-y"), aM = $("#a-m"), aD = $("#a-d"), elig = $("#elig"), err = $("#err"), copyBtn = $("#copy");
  const fMonths = $("#f-months"), fWeeks = $("#f-weeks"), fDays = $("#f-days"), fBorn = $("#f-born"), fNext = $("#f-next");

  // Dates as UTC midnights so time zones and daylight saving never shift a day
  const parse = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
  const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const DAY = 86400000;

  // Same day n months later/earlier; a day the month doesn't have becomes its last day
  // (31 January + 1 month = 28/29 February, 29 February + 1 year = 28 February)
  function addMonths(d, n) {
    const m = d.getUTCMonth() + n, y = d.getUTCFullYear() + Math.floor(m / 12), mo = ((m % 12) + 12) % 12;
    return new Date(Date.UTC(y, mo, Math.min(d.getUTCDate(), daysIn(y, mo))));
  }
  const addYears = (d, n) => addMonths(d, n * 12);
  // Years, months and days from a to b (a <= b): as many whole months as fit, then the days left
  function diff(a, b) {
    let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    let anchor = addMonths(a, months);
    if (anchor > b) anchor = addMonths(a, --months);
    return { y: Math.floor(months / 12), m: months % 12, d: Math.round((b - anchor) / DAY) };
  }
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const ymd = ({ y, m, d }) => [y && plural(y, "year"), m && plural(m, "month"), (d || (!y && !m)) && plural(d, "day")].filter(Boolean).join(" ");

  let last = "";
  function update() {
    err.hidden = true;
    const b = parse(dob.value), t = parse(on.value) || today();
    const blank = () => { aY.textContent = aM.textContent = aD.textContent = "—"; [fMonths, fWeeks, fDays, fBorn, fNext].forEach((e) => (e.textContent = "—")); elig.hidden = true; copyBtn.disabled = true; last = ""; };
    if (!b) return blank();
    if (b > t) { blank(); err.textContent = "The date of birth is after the \"age on\" date."; err.hidden = false; return; }

    const a = diff(b, t), days = Math.round((t - b) / DAY);
    aY.textContent = a.y; aM.textContent = a.m; aD.textContent = a.d;
    fMonths.textContent = (a.y * 12 + a.m).toLocaleString("en");
    fWeeks.textContent = `${Math.floor(days / 7).toLocaleString("en")} weeks ${days % 7 ? plural(days % 7, "day") : ""}`.trim();
    fDays.textContent = days.toLocaleString("en");
    fBorn.textContent = b.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
    let next = addYears(b, a.y + 1);
    if (a.m === 0 && a.d === 0) next = t;
    const until = Math.round((next - t) / DAY);
    fNext.textContent = until === 0 ? "Today! 🎉" : `${plural(until, "day")} (${fmt(next)})`;

    // Eligibility against the circular's limits. "Maximum 30" is read strictly: on the cut-off
    // date you may be exactly 30 years 0 months 0 days, but not a day older.
    const lo = minAge.value === "" ? null : Number(minAge.value), hi = maxAge.value === "" ? null : Number(maxAge.value);
    let verdict = "";
    if (lo !== null || hi !== null) {
      const youngest = lo !== null ? addYears(t, -lo) : null; // born on or before this
      const oldest = hi !== null ? addYears(t, -hi) : null;   // born on or after this
      const range = oldest && youngest ? `born between ${fmt(oldest)} and ${fmt(youngest)}` : oldest ? `born on or after ${fmt(oldest)}` : `born on or before ${fmt(youngest)}`;
      let ok = true, msg;
      if (lo !== null && b > youngest) { ok = false; msg = `Under ${lo} by ${ymd(diff(youngest, b))}.`; }
      else if (hi !== null && b < oldest) { ok = false; msg = `Over ${hi} by ${ymd(diff(b, oldest))}.`; }
      else msg = `Within the age limit${lo !== null && hi !== null ? ` (${lo}–${hi})` : lo !== null ? ` (at least ${lo})` : ` (up to ${hi})`}.`;
      elig.className = "eligible " + (ok ? "ok" : "bad");
      elig.innerHTML = `<span class="ms" aria-hidden="true">${ok ? "check_circle" : "cancel"}</span><span><b>${ok ? "Eligible" : "Not eligible"}.</b> ${msg} On ${fmt(t)}, the limit fits people ${range}.</span>`;
      elig.hidden = false;
      verdict = `${ok ? "Eligible" : "Not eligible"}: ${msg}`;
    } else elig.hidden = true;

    copyBtn.disabled = false;
    last = `Date of birth: ${fmt(b)}\nAge on ${fmt(t)}: ${ymd(a)}${verdict ? "\n" + verdict : ""}`;
  }

  [dob, on, minAge, maxAge].forEach((el) => el.addEventListener("input", update));
  root.querySelectorAll("[data-on]").forEach((x) => x.addEventListener("click", () => { on.value = iso(today()); update(); }));
  root.querySelectorAll("[data-range]").forEach((x) => x.addEventListener("click", () => { [minAge.value, maxAge.value] = x.dataset.range.split("-"); update(); }));
  copyBtn.addEventListener("click", async () => {
    if (!last) return;
    try { await navigator.clipboard.writeText(last); } catch { /* older browsers: nothing to do */ }
    const label = copyBtn.lastChild;
    label.textContent = "Copied";
    setTimeout(() => (label.textContent = "Copy result"), 1500);
  });

  on.value = iso(today());
  dob.max = on.value;
  update();
})();
