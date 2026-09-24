(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Mobile menu
  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
  }

  // Nav background + scroll progress
  const nav = document.querySelector("header.nav");
  const progress = document.querySelector(".progress");
  const onScroll = () => {
    const y = scrollY;
    if (nav) nav.classList.toggle("scrolled", y > 24);
    if (progress) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.setProperty("--p", max > 0 ? Math.min(1, y / max) : 0);
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Staggered scroll reveal: siblings come in one after another
  const reveals = document.querySelectorAll(".reveal");
  reveals.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    const i = siblings.indexOf(el);
    if (i > 0) el.style.transitionDelay = Math.min(i * 90, 450) + "ms";
  });
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  // Cursor spotlight on cards
  if (finePointer) {
    document.querySelectorAll(".spot").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", e.clientX - r.left + "px");
        el.style.setProperty("--y", e.clientY - r.top + "px");
      });
    });
  }

  // 3D tilt on phone mockups
  if (finePointer && !reduce) {
    document.querySelectorAll(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", px * 14 + "deg");
        el.style.setProperty("--rx", -py * 14 + "deg");
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--rx", "0deg");
      });
    });
  }

  // Rotating word in the hero
  document.querySelectorAll(".rotator").forEach((el) => {
    const words = (el.dataset.words || "").split(",").map((w) => w.trim()).filter(Boolean);
    if (words.length < 2 || reduce) return;
    let i = 0;
    setInterval(() => {
      el.classList.add("out");
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove("out");
        el.classList.add("in-start");
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("in-start")));
      }, 350);
    }, 2400);
  });

  // Count-up numbers
  const counters = document.querySelectorAll("[data-count]");
  const run = (el) => {
    const to = Number(el.dataset.count);
    if (reduce || to === 0) { el.textContent = String(to); return; }
    const start = performance.now();
    const dur = 1400;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { run(e.target); co.unobserve(e.target); }
    }), { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  } else counters.forEach(run);

  // Contact form: no server, so it opens the visitor's email app with everything filled in
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const name = String(d.get("name") || "").trim();
      const email = String(d.get("email") || "").trim();
      const topic = String(d.get("topic") || "General question");
      const message = String(d.get("message") || "").trim();
      const subject = `${topic}${name ? " from " + name : ""}`;
      const body = `${message}\n\n— ${name || "Memento user"}${email ? " (" + email + ")" : ""}`;
      location.href = `mailto:admin@mementoapp.online?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
