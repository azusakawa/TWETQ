/**
 * TWETQ Vue Shell - TypeScript 版本
 * 负责 Service Worker 注册、应用壳挂载和模式同步
 */

(() => {
  // 定义路由模式映射接口
  interface RouteModeMap {
    [key: string]: string;
  }

  // 定义标签映射接口
  interface LabelsMap {
    [key: string]: string;
  }

  // 检查 Service Worker 支持
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

    window.addEventListener("load", () =>
      navigator.serviceWorker
        .register("/sw.js?v=20260905-free-site-v1", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => {})
    );
  }

  // 获取 DOM 元素
  const shellRoot = document.querySelector("#vueApp, #vueSeoApp");
  const mountTarget = document.querySelector("#vueShellMount, #vueSeoShellMount");
  
  if (!shellRoot || !mountTarget || !window.Vue) return;

  // 路由模式映射
  const routeModes: RouteModeMap = {
    "/": "home",
    "/market": "market",
    "/institutional": "institutional",
    "/stock": "market",
    "/rank": "institutional",
    "/ranking": "institutional",
    "/screen": "screen",
    "/screener": "screen",
    "/podcast": "podcast",
    "/about": "help",
    "/help": "help",
    "/service": "service",
    "/privacy": "privacy",
    "/refund": "refund",
    "/disclaimer": "disclaimer",
  };

  // 导航标签映射
  const labels: LabelsMap = {
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

  // SEO 应用导航抽屉逻辑
  if (shellRoot.id === "vueSeoApp") {
    const toggle = document.querySelector("#navToggleButton");
    const close = document.querySelector("#navCloseButton");
    const drawer = document.querySelector("#siteNavDrawer");
    const overlay = document.querySelector("#siteNavOverlay");
    const inertTargets = [
      document.querySelector("#brandHomeLink"),
      document.querySelector("#desktopNavBar"),
      document.querySelector("#seoMain"),
      document.querySelector(".footer-note")
    ].filter(Boolean) as Element[];

    let open = false;
    const setOpen = (next: boolean) => {
      const wasOpen = open;
      open = Boolean(next);
      document.body.classList.toggle("site-nav-open", open);
      (toggle as HTMLElement)?.setAttribute("aria-expanded", String(open));
      (drawer as HTMLElement)?.setAttribute("aria-hidden", String(!open));
      if (overlay) (overlay as HTMLElement).hidden = !open;
      inertTargets.forEach((element) => { (element as HTMLElement).inert = open; });
      if (open) (close as HTMLElement)?.focus();
      else if (wasOpen) (toggle as HTMLElement)?.focus();
    };

    (toggle as HTMLElement)?.addEventListener("click", () => setOpen(!open));
    (close as HTMLElement)?.addEventListener("click", () => setOpen(false));
    (overlay as HTMLElement)?.addEventListener("click", () => setOpen(false));
    window.addEventListener("keydown", (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") return setOpen(false);
      if (event.key !== "Tab" || !drawer) return;
      const items = [...(drawer as HTMLElement).querySelectorAll<HTMLLinkElement | HTMLButtonElement>('a[href], button:not([disabled])')].filter((item) => !item.hidden);
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); (last as HTMLElement)?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); (first as HTMLElement)?.focus(); }
    });
    window.addEventListener("pageshow", () => setOpen(false));
  }

  // 解析当前模式
  const resolveMode = (): string => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path.startsWith("/stock/")) return "market";
    if (path.startsWith("/podcast/")) return "podcast";
    if (path.startsWith("/industry/")) return "market";
    return routeModes[path] || "home";
  };

  // 创建 Vue 应用
  (window as any).Vue.createApp({
    data: () => ({ currentMode: resolveMode() }),
    methods: {
      syncMode(event: any) {
        this.currentMode = (event as any).detail?.mode || resolveMode();
        this.$nextTick(this.syncShell);
      },
      syncShell() {
        const mode = this.currentMode;
        document.querySelectorAll("[data-mode-link]").forEach((item: HTMLElement) => {
          const active = (item as HTMLElement).dataset.modeLink === mode;
          (item as HTMLElement).classList.toggle("active", active);
          if ((item as HTMLElement).matches('[role="tab"]')) (item as HTMLElement).setAttribute("aria-selected", String(active));
          if ((item as HTMLElement).matches("a")) {
            if (active) (item as HTMLElement).setAttribute("aria-current", "page");
            else (item as HTMLElement).removeAttribute("aria-current");
          }
        });
        const marketButton = document.querySelector("#marketModeButton") as HTMLElement;
        marketButton?.classList.toggle("active", mode === "market");
        marketButton?.setAttribute("aria-selected", String(mode === "market"));
        const toggleLabel = document.querySelector("#navToggleButton span:last-child") as HTMLElement;
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
      return (window as any).Vue.h("span", { hidden: true, "aria-hidden": "true" });
    },
  }).mount(mountTarget);

  (shellRoot as HTMLElement).dataset.vueReady = "true";
  (document.documentElement as HTMLElement).dataset.uiFramework = `Vue ${(window as any).Vue.version}`;
})();