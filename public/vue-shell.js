(() => {
  if ("serviceWorker" in navigator) {
    let hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
    window.addEventListener("load", () => navigator.serviceWorker
      .register("/sw.js?v=20260905-free-site-v1", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {}));
  }

  const shellRoot = document.querySelector("#vueApp, #vueSeoApp");
  const mountTarget = document.querySelector("#vueShellMount, #vueSeoShellMount");
  if (!shellRoot || !mountTarget || !window.Vue) return;

  const routeModes = new Map([
    ["/", "home"],
    ["/market", "market"],
    ["/institutional", "institutional"],
    ["/stock", "market"],
    ["/rank", "institutional"],
    ["/ranking", "institutional"],
    ["/screen", "screen"],
    ["/screener", "screen"],
    ["/podcast", "podcast"],
    ["/about", "help"],
    ["/help", "help"],
    ["/service", "service"],
    ["/privacy", "privacy"],
    ["/refund", "refund"],
    ["/disclaimer", "disclaimer"],
  ]);
  const labels = {
    home: "最新一集",
    market: "市場總覽",
    institutional: "法人籌碼",
    screen: "選股",
    podcast: "所有集數",
    help: "使用說明",
    service: "服務條款",
    privacy: "隱私權政策",
    refund: "退款政策",
    disclaimer: "免責聲明",
  };
  if (shellRoot.id === "vueSeoApp") {
    const toggle = document.querySelector("#navToggleButton");
    const close = document.querySelector("#navCloseButton");
    const drawer = document.querySelector("#siteNavDrawer");
    const overlay = document.querySelector("#siteNavOverlay");
    const inertTargets = [document.querySelector("#brandHomeLink"), document.querySelector("#desktopNavBar"), document.querySelector("#seoMain"), document.querySelector(".footer-note")].filter(Boolean);
    let open = false;
    const setOpen = (next) => {
      const wasOpen = open;
      open = Boolean(next);
      document.body.classList.toggle("site-nav-open", open);
      toggle?.setAttribute("aria-expanded", String(open));
      drawer?.setAttribute("aria-hidden", String(!open));
      if (overlay) overlay.hidden = !open;
      inertTargets.forEach((element) => { element.inert = open; });
      if (open) close?.focus();
      else if (wasOpen) toggle?.focus();
    };
    toggle?.addEventListener("click", () => setOpen(!open));
    close?.addEventListener("click", () => setOpen(false));
    overlay?.addEventListener("click", () => setOpen(false));
    window.addEventListener("keydown", (event) => {
      if (!open) return;
      if (event.key === "Escape") return setOpen(false);
      if (event.key !== "Tab" || !drawer) return;
      const items = [...drawer.querySelectorAll('a[href], button:not([disabled])')].filter((item) => !item.hidden);
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    window.addEventListener("pageshow", () => setOpen(false));
  }
  const resolveMode = () => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path.startsWith("/stock/")) return "market";
    if (path.startsWith("/podcast/")) return "podcast";
    if (path.startsWith("/industry/")) return "market";
    return routeModes.get(path) || "home";
  };

  Vue.createApp({
    data: () => ({ currentMode: resolveMode() }),
    methods: {
      syncMode(event) {
        this.currentMode = event.detail?.mode || resolveMode();
        this.$nextTick(this.syncShell);
      },
      syncShell() {
        const mode = this.currentMode;
        document.querySelectorAll("[data-mode-link]").forEach((item) => {
          const active = item.dataset.modeLink === mode;
          item.classList.toggle("active", active);
          if (item.matches('[role="tab"]')) item.setAttribute("aria-selected", String(active));
          if (item.matches("a")) {
            if (active) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
          }
        });
        const marketButton = document.querySelector("#marketModeButton");
        marketButton?.classList.toggle("active", mode === "market");
        marketButton?.setAttribute("aria-selected", String(mode === "market"));
        const toggleLabel = document.querySelector("#navToggleButton span:last-child");
        if (toggleLabel) toggleLabel.textContent = labels[mode] || "功能選單";
      },
    },
    mounted() {
      window.addEventListener("twetq:mode-change", this.syncMode);
      this.syncShell();
    },
    beforeUnmount() {
      window.removeEventListener("twetq:mode-change", this.syncMode);
    },
    render() {
      return Vue.h("span", { hidden: true, "aria-hidden": "true" });
    },
  }).mount(mountTarget);

  shellRoot.dataset.vueReady = "true";
  document.documentElement.dataset.uiFramework = `Vue ${Vue.version}`;
})();
