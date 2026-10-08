// Passport Validity Checker (/tools/passport-validity): does a passport stay valid long enough for
// a trip under the destination's entry rule, and when to renew it, plus calendar reminders.
// Pure date arithmetic in the browser; nothing is sent anywhere.
(() => {
  const root = document.getElementById("pvalid");
  if (!root) return;
  const $ = (s) => root.querySelector(s);

  // Entry rules, simplified to their usual form for visitors. They depend on nationality and visa,
  // so the page always says to confirm with the embassy or airline.
  //  stay: valid for the whole stay · arrive: N months from arrival · leave: N months after leaving
  const RULES = {
    schengen: { name: "the Schengen area", kind: "leave", months: 3, issued: 10, text: "valid at least 3 months after you leave, and issued within the last 10 years" },
    us: { name: "the United States", kind: "leave", months: 6, text: "valid 6 months beyond your stay (citizens of many countries only need it valid for the stay)" },
    uk: { name: "the United Kingdom", kind: "stay", text: "valid for your whole stay" },
    canada: { name: "Canada", kind: "stay", text: "valid for your whole stay" },
    australia: { name: "Australia", kind: "stay", text: "valid for your whole stay" },
    japan: { name: "Japan", kind: "stay", text: "valid for your whole stay" },
    uae: { name: "the UAE", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    saudi: { name: "Saudi Arabia", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    qatar: { name: "Qatar", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    singapore: { name: "Singapore", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    malaysia: { name: "Malaysia", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    thailand: { name: "Thailand", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    indonesia: { name: "Indonesia", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    india: { name: "India", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    china: { name: "China", kind: "arrive", months: 6, text: "valid at least 6 months from arrival" },
    other: { name: "your destination", kind: "arrive", months: 6, text: "valid at least 6 months from arrival (the common, safe rule)" },
  };

  const expiry = $("#expiry"), issued = $("#issued"), dest = $("#dest"), arrive = $("#arrive"), leave = $("#leave"), tripBox = $(".trip");
  const verdict = $("#verdict"), fNeed = $("#f-need"), fLeft = $("#f-left"), fSix = $("#f-six"), fRenew = $("#f-renew"), ruleText = $("#rule-text");
  const ics = $("#ics"), gcal = $("#gcal"), err = $("#err");

  // Dates as UTC midnights so time zones never shift a day
  const parse = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
  const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  function addMonths(d, n) {
    const m = d.getUTCMonth() + n, y = d.getUTCFullYear() + Math.floor(m / 12), mo = ((m % 12) + 12) % 12;
    return new Date(Date.UTC(y, mo, Math.min(d.getUTCDate(), daysIn(y, mo))));
  }
  const DAY = 86400000, days = (a, b) => Math.round((b - a) / DAY);
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  function span(n) {
    const a = Math.abs(n);
    if (a < 62) return `${a} day${a === 1 ? "" : "s"}`;
    const mo = Math.round(a / 30.44);
    return mo < 24 ? `about ${mo} months` : `about ${(a / 365.25).toFixed(1)} years`;
  }

  let reminders = [];
  function update() {
    err.hidden = true;
    const exp = parse(expiry.value), t = today(), r = RULES[dest.value], a = parse(arrive.value), l = parse(leave.value) || a;
    tripBox.hidden = !r;
    ruleText.textContent = r ? `${r.name[0].toUpperCase() + r.name.slice(1)}: ${r.text}.` : "";
    ruleText.hidden = !r;
    if (!exp) { verdict.className = "verdict"; verdict.innerHTML = "<span>Enter your passport's expiry date to start.</span>"; [fNeed, fLeft, fSix, fRenew].forEach((e) => (e.textContent = "—")); setReminders([]); return; }

    // General picture, trip or not
    const six = addMonths(exp, -6), renew = addMonths(exp, -9), left = days(t, exp);
    fLeft.textContent = left < 0 ? `Expired ${span(left)} ago` : span(left);
    fSix.textContent = fmt(six);
    fRenew.textContent = renew <= t ? (left < 0 ? "Now" : "Now: it's time") : fmt(renew);

    let cls = "ok", msg;
    if (left < 0) { cls = "bad"; msg = `<b>Your passport has expired.</b> Renew it before you plan any trip.`; fNeed.textContent = "—"; }
    else if (!r) {
      fNeed.textContent = "—";
      if (six <= t) { cls = "bad"; msg = `<b>Under 6 months left.</b> Many countries won't let you in now. Renew soon.`; }
      else if (renew <= t) { cls = "warn"; msg = `<b>Time to renew.</b> Your passport works for most trips until ${fmt(six)}, but renewals take time.`; }
      else msg = `<b>Good for most trips until ${fmt(six)}.</b> Pick a destination to check a specific trip.`;
    } else if (!a) { fNeed.textContent = "—"; cls = "warn"; msg = "Add your travel dates to check this trip."; }
    else if (l < a) { fNeed.textContent = "—"; cls = "bad"; msg = "Your departure date is before your arrival date."; }
    else {
      const need = r.kind === "stay" ? l : r.kind === "arrive" ? addMonths(a, r.months) : addMonths(l, r.months);
      fNeed.textContent = fmt(need);
      const spare = days(need, exp);
      const tooOld = r.issued && parse(issued.value) && addMonths(parse(issued.value), r.issued * 12) < a;
      if (spare < 0) { cls = "bad"; msg = `<b>Renew before this trip.</b> For ${r.name} it must be valid until ${fmt(need)}, but it expires ${span(spare)} earlier, on ${fmt(exp)}.`; }
      else if (tooOld) { cls = "bad"; msg = `<b>Too old for ${r.name}.</b> It must have been issued within the last ${r.issued} years on the day you arrive.`; }
      else if (spare < 30) { cls = "warn"; msg = `<b>Just enough, with ${spare ? span(spare) : "no days"} to spare.</b> Any delay or a longer stay could make it too short.`; }
      else msg = `<b>Valid for this trip.</b> It meets the rule for ${r.name} with ${span(spare)} to spare.`;
    }
    verdict.className = `verdict ${cls}`;
    verdict.innerHTML = `<span class="ms" aria-hidden="true">${cls === "ok" ? "check_circle" : cls === "warn" ? "warning" : "cancel"}</span><span>${msg}</span>`;

    setReminders(left < 0 ? [] : [
      [renew, "Renew your passport", `Start your passport renewal now: it expires on ${fmt(exp)} and many countries need 6 months' validity.`],
      [six, "Passport: 6 months left", `From today many countries won't accept your passport (it expires on ${fmt(exp)}).`],
      [exp, "Passport expires today", "Your passport expires today."],
    ].filter(([d]) => d > t));
  }

  // ---------- Reminders ----------
  function setReminders(list) {
    reminders = list;
    ics.disabled = !list.length;
    gcal.setAttribute("aria-disabled", String(!list.length));
    if (!list.length) { gcal.removeAttribute("href"); return; }
    const [d, title, text] = list[0], end = new Date(d.getTime() + DAY);
    gcal.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${ymd(d)}/${ymd(end)}&details=${encodeURIComponent(text + "\n\nMade with Memento Tools: mementoapp.online/tools")}`;
    ics.lastChild.textContent = `Add ${list.length} reminder${list.length > 1 ? "s" : ""} to calendar`;
  }
  ics.addEventListener("click", () => {
    if (!reminders.length) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const esc = (s) => s.replace(/[\\,;]/g, (c) => "\\" + c);
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Memento Tools//Passport reminder//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    reminders.forEach(([d, title, text], i) => {
      lines.push("BEGIN:VEVENT", `UID:passport-${ymd(d)}-${i}-${Math.random().toString(36).slice(2)}@mementoapp.online`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(new Date(d.getTime() + DAY))}`, `SUMMARY:${esc(title)}`,
        `DESCRIPTION:${esc(text + " (Memento Tools: mementoapp.online/tools)")}`, "TRANSP:TRANSPARENT",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "TRIGGER:PT9H", "END:VALARM", "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const url = URL.createObjectURL(new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "passport-reminders.ics" });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  [expiry, issued, dest, arrive, leave].forEach((el) => el.addEventListener("input", update));
  arrive.addEventListener("input", () => { if (arrive.value && (!leave.value || leave.value < arrive.value)) leave.value = arrive.value; update(); });
  update();
})();
