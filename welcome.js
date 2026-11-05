/* ==========================================================================
   MCmods welcome — shown to everyone who opens the site.
   First visit: a one-time dialog. Later visits: a small "welcome back" strip.
   ========================================================================== */
(function () {
  const KEY = "mcmods:welcome:v1";

  const t = (key, vars) =>
    window.MCModsI18n ? window.MCModsI18n.t(key, vars) : String(key).split(".").pop();

  function seen() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  function remember(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage may be blocked */
    }
  }

  function favoriteCount() {
    try {
      const raw = JSON.parse(localStorage.getItem("mcmods:favorites:v1") || "[]");
      return Array.isArray(raw) ? raw.length : 0;
    } catch {
      return 0;
    }
  }

  function close(dialog) {
    if (dialog && dialog.open) dialog.close();
    document.body.classList.remove("is-locked");
  }

  function showDialog() {
    const dialog = document.getElementById("welcome-dialog");
    if (!dialog || typeof dialog.showModal !== "function") return false;

    const start = dialog.querySelector("[data-welcome-start]");
    const dismiss = dialog.querySelector("[data-welcome-dismiss]");
    const snooze = dialog.querySelector("[data-welcome-later]");

    start?.addEventListener("click", () => {
      remember("done");
      close(dialog);
    });
    dismiss?.addEventListener("click", () => {
      remember("never");
      close(dialog);
    });
    snooze?.addEventListener("click", () => {
      remember("done");
      close(dialog);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        remember("done");
        close(dialog);
      }
    });
    dialog.addEventListener("close", () => remember("done"));

    dialog.showModal();
    document.body.classList.add("is-locked");
    return true;
  }

  function showStrip() {
    const strip = document.getElementById("welcome-strip");
    if (!strip) return;
    const count = favoriteCount();
    const note = strip.querySelector("[data-welcome-note]");
    if (note) {
      note.textContent = count > 0 ? t("welcome.back", { n: count }) : t("welcome.body");
    }
    strip.hidden = false;
    strip.querySelector("[data-welcome-hide]")?.addEventListener("click", () => {
      strip.hidden = true;
      remember("never");
    });
  }

  function start() {
    const state = seen();
    if (state === "never") return;
    if (state === "done") {
      showStrip();
      return;
    }
    if (!showDialog()) showStrip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  // Re-render translated copy when the visitor flips language.
  document.addEventListener("mcmods:lang", () => {
    if (window.MCModsI18n) window.MCModsI18n.apply();
    const strip = document.getElementById("welcome-strip");
    if (strip && !strip.hidden && favoriteCount() > 0) {
      const note = strip.querySelector("[data-welcome-note]");
      if (note) note.textContent = t("welcome.back", { n: favoriteCount() });
    }
  });
})();
