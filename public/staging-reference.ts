// Staging Reference UI - TypeScript 版本
// Reference design enhancements for TWETQ

// Types
interface StagingQuote {
  code?: string;
  close?: number | string;
  change?: number | string;
  changePct?: number | string;
}

interface StagingStock {
  code?: string;
  name?: string;
  reason?: string;
}

interface StagingIndustry {
  name?: string;
  moneydjCategoryCode?: string;
}

interface StagingAnalysis {
  stocks?: StagingStock[];
  industries?: StagingIndustry[];
}

interface StagingData {
  source?: Record<string, unknown>;
  analysis?: StagingAnalysis;
}

interface StagingOptions {
  heading?: string;
  latest?: boolean;
  detailHref?: string;
  quotes?: Map<string, StagingQuote>;
}

// Escape HTML for safe HTML insertion
const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? "").replace(/[&<>'"]/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" } as Record<string, string>)[char]
  );

// Route detection
const routeMode = (): string => {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (/^\/podcast\/\d+$/.test(path)) return "podcast";
  if (/^(\/stock\/|\/industry\/)/.test(path)) return "market";
  return (document.body.dataset.mode || ({
    "/": "home",
    "/podcast": "podcast",
  } as Record<string, string>))[path] || path.slice(1);
};

// Desktop navigation
function mountDesktopNavigation(): void {
  const nav = document.querySelector("#desktopNavBar");
  if (!nav || nav.querySelectorAll("[data-staging-mode]").length === 5) return;
  nav.dataset.referenceEnhanced = "true";
  (nav as HTMLElement).innerHTML = [
    ["home", "/", "最新一集"],
    ["podcast", "/podcast", "所有集數"],
    ["market", "/market", "市場總覽"],
    ["institutional", "/institutional", "法人籌碼"],
    ["screen", "/screen", "選股"],
  ].map(([mode, href, label]) => `<a class="desktop-nav-item" href="${href}" data-mode-link="${mode}" data-staging-mode="${mode}"${["market", "institutional", "screen"].includes(mode) ? " data-research-nav" : ""}>${label}</a>`).join("");
  syncNavigation();
}

// Mobile navigation
function mountNavigation(): void {
  const header = document.querySelector(".app-header");
  if (!header || document.querySelector("#stagingMenu")) return;
  const button = document.createElement("button");
  button.id = "stagingMenuButton";
  button.className = "staging-menu-toggle";
  button.type = "button";
  button.setAttribute("aria-controls", "stagingMenu");
  button.setAttribute("aria-label", "開啟功能選單");
  (button as HTMLButtonElement).innerHTML = '<span aria-hidden="true"></span>';
  header.append(button);

  const menu = document.createElement("aside");
  menu.id = "stagingMenu";
  menu.className = "offcanvas offcanvas-start staging-offcanvas";
  (menu as HTMLElement).tabIndex = -1;
  menu.setAttribute("aria-labelledby", "stagingMenuTitle");
  (menu as HTMLElement).innerHTML = `
      <div class="offcanvas-header">
        <div class="staging-drawer-brand"><strong id="stagingMenuTitle">TWETQ Podcast</strong><span>投資脈絡</span></div>
        <button type="button" class="staging-drawer-close" data-bs-dismiss="offcanvas" aria-label="關閉功能選單"><span aria-hidden="true">×</span></button>
      </div>
      <nav class="offcanvas-body" aria-label="手機功能選單">
        <div class="staging-drawer-main">
          <a href="/" data-staging-mode="home">${researchIcon("method")}<span>最新一集</span></a>
          <a href="/podcast" data-staging-mode="podcast">${researchIcon("archive")}<span>所有集數</span></a>
          <a href="/market" data-staging-mode="market">${researchIcon("market")}<span>市場總覽</span></a>
          <a href="/institutional" data-staging-mode="institutional">${researchIcon("method")}<span>法人籌碼</span></a>
          <a href="/screen" data-staging-mode="screen">${researchIcon("stock")}<span>選股</span></a>
        </div>
        <section class="staging-drawer-section staging-drawer-other" aria-labelledby="stagingOtherLabel">
          <h3 id="stagingOtherLabel">其他</h3>
          <a href="/disclaimer">${researchIcon("archive")}<span>資料說明</span></a>
        </section>
      </nav>`;
  document.body.append(menu);
  const offcanvas = (bootstrap as Record<string, { Offcanvas: { getOrCreateInstance(el: Element, config?: Record<string, unknown>): { show(): void } } }>).Offcanvas.getOrCreateInstance(menu, { backdrop: true, scroll: false });
  let lastTrigger: Element | null = button;
  button.addEventListener("click", () => { lastTrigger = button; offcanvas.show(); });
  menu.addEventListener("hidden.bs.offcanvas", () => lastTrigger?.focus());
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => offcanvas.hide()));

  const bottom = document.createElement("nav");
  (bottom as HTMLElement).className = "staging-mobile-nav";
  (bottom as HTMLElement).setAttribute("aria-label", "手機主要分頁");
  (bottom as HTMLElement).innerHTML = `
      <a href="/" data-staging-mode="home"><b aria-hidden="true">●</b><span>最新</span></a>
      <a href="/podcast" data-staging-mode="podcast"><b aria-hidden="true">▤</b><span>所有集數</span></a>
      <a href="/market" data-staging-mode="market"><b aria-hidden="true">⌁</b><span>市場</span></a>
      <a href="/screen" data-staging-mode="screen"><b aria-hidden="true">▥</b><span>選股</span></a>
      <a href="/disclaimer" data-staging-mode="disclaimer"><b aria-hidden="true">ⓘ</b><span>資料說明</span></a>`;
  document.body.append(bottom);
}

// Navigation sync
function syncNavigation(): void {
  const mode = routeMode();
  document.querySelectorAll("[data-staging-mode]").forEach((item) => {
    const active = (item as HTMLElement).dataset.stagingMode === mode;
    (item as HTMLElement).classList.toggle("active", active);
    if (active) (item as HTMLElement).setAttribute("aria-current", "page");
    else (item as HTMLElement).removeAttribute("aria-current");
  });
}

// Cover image helper
function insertCover(target: Element | null, className = "staging-podcast-cover"): void {
  if (!target || target.querySelector(`.${className}`)) return;
  const image = document.createElement("img");
  (image as HTMLImageElement).className = className;
  (image as HTMLImageElement).src = "/assets/podcast-cover.svg";
  (image as HTMLImageElement).alt = "TWETQ Podcast 投資脈絡封面";
  (image as HTMLImageElement).width = 240;
  (image as HTMLImageElement).height = 240;
  target.prepend(image);
}

// Episode helpers
const episodeTitle = (source: Record<string, unknown> = {}): string =>
  String(source.title || `EP${source.number || ""}`).replace(/^EP\s*\d+\s*/i, "").trim();

const episodeDate = (source: Record<string, unknown> = {}): string =>
  String(source.date || source.dateText || "").replaceAll("-", ".");

// Episode hero markup
function episodeHeroMarkup(data: StagingData, options: StagingOptions = {}): string {
  const source = data?.source || {};
  const analysis = (data?.analysis || {}) as StagingAnalysis;
  const episode = String(source.number || "");
  const title = episodeTitle(source) || "最新 Podcast 單集";
  const summary = String((source.excerpt || (source as Record<string, unknown>).bodyPreview || "從本集內容出發，整理節目脈絡與延伸研究方向。") as string).trim();
  const tags = [...new Set([
    ...(Array.isArray(source.tags) ? source.tags : []),
    ...(Array.isArray(analysis.industries) ? (analysis.industries as StagingIndustry[]).map((item) => (item as Record<string, unknown>).name) : []),
  ].map((item) => String(item || "").trim()).filter((item) => item && item.toLowerCase() !== "transcript"))].slice(0, 5);
  const audioLinks = Array.isArray(source.audioLinks) ? source.audioLinks : [];
  const audio = (audioLinks as string[]).find(Boolean) || "";
  const primaryHref = audio || (options.latest ? (options.detailHref || "/podcast") : Number((source as Record<string, unknown>).bodyTextLength) > 0 ? "#podcast-transcript" : (options.detailHref || "/podcast"));
  const external = /^https?:\/\//i.test(primaryHref);
  const primaryLabel = audio ? "前往收聽本集" : (options.latest ? "閱讀本集研究" : Number((source as Record<string, unknown>).bodyTextLength) > 0 ? "閱讀本集逐字稿" : "閱讀本集研究");
  const playableAudio = (options.latest && audio && /\.(?:mp3|m4a|ogg|wav)(?:[?#]|$)/i.test(audio));
  const escape = escapeHtml;

  const latestPlayer = playableAudio
    ? `<div class="staging-episode-player staging-native-player"><audio controls preload="metadata" src="${escape(audio)}">您的瀏覽器不支援音訊播放。</audio><a class="staging-player-detail" href="${escape(options.detailHref || "/podcast")}">查看完整內容<span aria-hidden="true"> →</span></a></div>`
    : `<div class="staging-episode-player staging-episode-resource">
          <a class="staging-play-button" href="${escape(primaryHref)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="${escape(primaryLabel)}"><span aria-hidden="true">${audio ? "▶" : "↗"}</span></a>
          <div class="staging-player-copy"><strong>${escape(primaryLabel)}</strong><small>${audio ? "將開啟外部 Podcast 平台" : "逐字稿與延伸研究整理"}</small></div>
          <a class="staging-player-detail" href="${escape(options.detailHref || "/podcast")}">查看完整內容<span aria-hidden="true"> →</span></a>
        </div>`;

  return `
      <figure class="staging-episode-cover-wrap">
        <img class="staging-episode-cover" src="/assets/podcast-cover.svg" width="260" height="260" alt="TWETQ Podcast 投資脈絡封面">
      </figure>
      <article class="staging-episode-card">
        <header class="staging-episode-heading">
          <span class="staging-episode-badge">${options.latest ? "最新一集" : "單集研究"}</span>
          <div class="staging-episode-meta">${episode ? `<strong>EP.${escape(episode)}</strong>` : ""}${episodeDate(source as Record<string, unknown>) ? `<time datetime="${escape(String(source.date || source.dateText))}">${escape(episodeDate(source as Record<string, unknown>))}</time>` : ""}</div>
        </header>
        <div class="staging-episode-copy">
          <${options.heading || "h2"}>${escape(title)}</${options.heading || "h2"}>
          <p>${escape(summary)}</p>
          ${tags.length ? `<div class="staging-episode-tags" aria-label="本集主題">${tags.map((tag) => `<span># ${escape(tag)}</span>`).join("")}</div>` : ""}
        </div>
        ${options.latest ? latestPlayer : `<div class="staging-episode-player">
          <a class="staging-play-button" href="${escape(primaryHref)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="${escape(primaryLabel)}"><span aria-hidden="true">▶</span></a>
          <div class="staging-player-copy"><strong>${escape(primaryLabel)}</strong><small>${audio ? "將開啟外部 Podcast 平台" : "逐字稿與延伸研究整理"}</small></div>
          <span class="staging-player-track" aria-hidden="true"><i></i></span>
          <a class="staging-player-detail" href="${escape(options.detailHref || "/podcast")}">所有集數<span aria-hidden="true"> →</span></a>
        </div>`}
      </article>`;
}

// Quote formatting
const quoteText = (value: number | string | undefined): string =>
  Number.isFinite(Number(value)) ? Number(value).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

// Context panel (stocks and industries)
function contextPanel(data: StagingData, options: StagingOptions = {}): HTMLElement {
  const stocks = ((data?.analysis?.stocks || []) as StagingStock[]).slice(0, 4);
  const industries = ((data?.analysis?.industries || []) as StagingIndustry[]).slice(0, 6);
  const quoteMap = options.quotes || new Map<string, StagingQuote>();

  const stockSlots = options.latest ? Array.from({ length: 4 }, (_, index) => stocks[index] || null) : stocks;
  const industrySlots = options.latest ? Array.from({ length: 6 }, (_, index) => industries[index] || null) : industries;

  const panel = document.createElement("section");
  (panel as HTMLElement).className = "home-context-grid staging-context-grid";

  const stockHtml = stockSlots.map((stock, index) => {
    if (!stock) return `<div class="staging-context-stock-empty" aria-label="第 ${index + 1} 個個股卡位沒有資料"><b>—</b><span>本集未辨識更多個股</span></div>`;
    const quote = quoteMap.get(String(stock.code || ""));
    const change = Number((quote?.change || 0) as number);
    const tone = Number.isFinite(change) ? change > 0 ? "up" : change < 0 ? "down" : "flat" : "flat";
    const sign = Number.isFinite(change) && change !== 0 ? (change > 0 ? "▲" : "▼") : "";
    const percent = Number.isFinite(Number(quote?.changePct)) ? `${Number(quote!.changePct!).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "資料待更新";
    return `<a href="/stock/${encodeURIComponent(String(stock.code || ""))}" data-direct-stock="${escapeHtml(stock.code || "")}"${quote ? " data-stock-quote" : ""}><span><b>${escapeHtml(stock.name || "名稱資料缺漏")}</b><small>${escapeHtml(stock.code || "—")}</small></span><strong class="${tone}">${quoteText(quote?.close)}</strong><em class="${tone}">${sign} ${escapeHtml(percent)}</em><small class="staging-stock-reason">${escapeHtml(stock.reason || "節目內容提及")}</small></a>`;
  }).join("") || '<p class="staging-context-empty">本集未辨識到直接提及個股。</p>';

  const industryHtml = industrySlots.map((industry) => {
    if (!industry) return '<span class="staging-context-industry-empty">未辨識更多產業</span>';
    const name = String((industry as Record<string, unknown>).name || "產業分類").trim();
    const categoryCode = String((industry as Record<string, unknown>).moneydjCategoryCode || "").trim();
    return categoryCode
      ? `<a href="/industry/${encodeURIComponent(categoryCode)}" aria-label="查看 ${escapeHtml(name)} 類股">${escapeHtml(name)}<span aria-hidden="true">›</span></a>`
      : `<span>${escapeHtml(name)}</span>`;
  }).join("") || '<p class="staging-context-empty">本集未解析出產業分類。</p>';

  (panel as HTMLElement).innerHTML = `
      <article>
        <header><span>直接提及個股</span><a href="/market">查看全部 <span aria-hidden="true">›</span></a></header>
        <div class="home-context-stocks">${stockHtml}</div>
      </article>
      <article>
        <header><span>系統延伸</span><small>相關產業方向</small></header>
        <div class="home-context-industries">${industryHtml}</div>
      </article>`;
  return panel;
}

// SVG research icons
function researchIcon(kind: string): string {
  const paths: Record<string, string> = {
    stock: '<path d="M5 23V8m0 15h22M8 19l5-6 4 3 7-9 4 3"/><circle cx="23" cy="22" r="5"/><path d="m27 26 4 4"/>',
    market: '<path d="M5 27V16h6v11m3 0V10h6v17m3 0V5h6v22M3 27h28"/>',
    method: '<rect x="7" y="4" width="20" height="26" rx="2"/><path d="M11 10h12M11 15h12M11 20h8"/>',
    archive: '<path d="M6 5h17l5 5v20H6z"/><path d="M23 5v6h6M11 16h12M11 21h12M11 26h8"/>',
  };
  return `<svg viewBox="0 0 34 34" aria-hidden="true" focusable="false">${paths[kind]}</svg>`;
}

// Research panel
function researchPanel({ latest = false } = {}): HTMLElement {
  const items = [
    ["個股脈絡", "/screen", "由 Podcast 議題切入個股研究", "探索個股", "stock"],
    ["市場總覽", "/market", "掌握市場結構與長期趨勢", "探索市場", "market"],
    ...(latest ? [["法人籌碼", "/institutional", "比對外資、投信與三大法人方向", "查看籌碼", "method"]] : []),
    ["所有集數", "/podcast", "依集數閱讀完整研究整理", "瀏覽集數", "archive"],
  ];
  const panel = document.createElement("section");
  (panel as HTMLElement).className = "staging-research-path";
  (panel as HTMLElement).innerHTML = `<h2>進入研究脈絡</h2><div>${items.map(([title, href, body, action, icon]) => `<a href="${href}">${researchIcon(icon)}<span><strong>${title}</strong><small>${body}</small><em>${action} <span aria-hidden="true">›</span></em></span></a>`).join("")}</div>`;
  return panel;
}

// Enrich home page
async function enrichHome(root: Element): Promise<void> {
  if (!root || root.dataset.referenceEnhanced) return;
  root.dataset.referenceEnhanced = "true";
  try {
    const quotesReady = fetch("/api/market/snapshot").then((response) => response.ok ? response.json() : null).catch(() => null);
    const response = await fetch("/api/podcast/latest");
    if (!response.ok) return;
    const data = (await response.json()) as StagingData;
    if (!document.contains(root)) return;
    const hero = root.querySelector(".home-hero");
    if (!hero) return;
    const episode = String((data?.source || {})?.number || "");
    (hero as HTMLElement).classList.add("staging-latest-episode");
    (hero as HTMLElement).innerHTML = episodeHeroMarkup(data, { latest: true, detailHref: episode ? `/podcast/${encodeURIComponent(episode)}` : "/podcast" });
    let context = contextPanel(data, { latest: true });
    const research = researchPanel({ latest: true });
    (hero as HTMLElement).after(context, research);
    root.querySelectorAll(".home-episode-section, .home-tools-section").forEach((section) => { (section as HTMLElement).hidden = true; });
    const note = root.querySelector(".home-reading-note");
    if (note) (note as HTMLElement).innerHTML = '<span aria-hidden="true">ⓘ</span><div><h3>本網站僅供研究與資訊分享，不構成任何投資建議。</h3><p>投資有風險，請審慎評估並自行負盈虧。</p></div>';
    quotesReady.then((snapshot) => {
      if (!document.contains(context)) return;
      const quoteMap = new Map<string, StagingQuote>((Array.isArray((snapshot as Record<string, unknown>).quotes) ? (snapshot as Record<string, unknown>).quotes as StagingQuote[] : []).map((quote) => [String((quote as Record<string, unknown>).code || ""), quote]));
      const nextContext = contextPanel(data, { latest: true, quotes: quoteMap });
      context.replaceWith(nextContext);
    });
  } catch (_) {
    const coverTarget = root.querySelector(".home-podcast-figure");
    insertCover(coverTarget as Element, "home-podcast-cover");
  }
}

// Enhance direct podcast page
async function enhanceDirectPodcast(root: Element): Promise<void> {
  const main = root.querySelector("#seoMain");
  if (!main || (main as HTMLElement).dataset.referenceEnhanced || !/^\/podcast\/\d+$/.test(location.pathname)) return;
  (main as HTMLElement).dataset.referenceEnhanced = "true";
  try {
    const episode = location.pathname.split("/").filter(Boolean).at(-1) || "";
    const response = await fetch(`/api/podcast/latest?ep=${encodeURIComponent(episode)}`);
    if (!response.ok) return;
    const data = (await response.json()) as StagingData;
    if (!document.contains(main)) return;
    const hero = (main as HTMLElement).querySelector(":scope > .seo-card:first-child");
    if (!hero) return;
    (hero as HTMLElement).classList.add("staging-latest-episode", "staging-direct-episode-hero");
    (hero as HTMLElement).innerHTML = episodeHeroMarkup(data, { heading: "h1", detailHref: "/podcast" });
    const context = contextPanel(data);
    const research = researchPanel();
    (hero as HTMLElement).after(context, research);
    (main as HTMLElement).classList.add("staging-direct-podcast");
    const duplicate = (main as HTMLElement).querySelector('[data-podcast-analysis="ai"]');
    if (duplicate) (duplicate as HTMLElement).hidden = true;
  } catch (_) {}
}

// Enhance podcast pages
function enhancePodcast(root: Element): void {
  root.querySelectorAll(".podcast-hero-card").forEach((hero) => insertCover(hero as HTMLElement));
  void enhanceDirectPodcast(root);
}

// Enhance help page
function enhanceHelp(root: Element): void {
  const page = root.querySelector(".help-dashboard");
  const nav = page?.querySelector(":scope > .help-anchor-nav") as HTMLElement | null;
  if (!page || !nav || (page as HTMLElement).dataset.referenceEnhanced) return;
  (page as HTMLElement).dataset.referenceEnhanced = "true";
  const layout = document.createElement("div");
  (layout as HTMLElement).className = "staging-help-layout";
  const content = document.createElement("div");
  (content as HTMLElement).className = "staging-help-content";
  [...(page as HTMLElement).children].filter((node) => !node.classList.contains("page-strip") && node !== nav).forEach((node) => content.append(node));
  (nav as HTMLElement).classList.add("staging-help-nav");
  const hero = (content as HTMLElement).querySelector(".help-hero");
  if (hero && !(hero as HTMLElement).querySelector(".staging-help-illustration")) {
    (hero as HTMLElement).insertAdjacentHTML("beforeend", `<svg class="staging-help-illustration" viewBox="0 0 260 150" aria-hidden="true" focusable="false"><path d="M22 126h216M58 115c25-16 53-20 84-12 24 6 45 4 63-9M109 95V45c0-18 11-31 26-31s26 13 26 31v34c0 18-11 31-26 31s-26-13-26-31zm12-50c0-10 5-17 14-17s14 7 14 17v34c0 10-5 17-14 17s-14-7-14-17zm14 65v16m-17 0h34M30 76c18-8 35-8 52 0v35c-17-8-34-8-52 0zm52 0c18-8 35-8 52 0"/><path d="M44 87h24m-24 9h20"/></svg>`);
  }
  const quickStart = (hero as HTMLElement)?.querySelector(".help-quick-card");
  if (quickStart) (hero as HTMLElement).after(quickStart);
  layout.append(nav, content);
  (page as HTMLElement).append(layout);
}

// Enhance screen page
function enhanceScreen(root: Element): void {
  if (document.body.dataset.mode !== "screen") return;
  const controls = document.querySelector("#screenControls");
  const market = document.querySelector("#screenMarket");
  const industry = document.querySelector("#screenIndustry");
  const band = document.querySelector("#screenBand");
  const keyword = document.querySelector("#screenKeyword");
  if (controls && market && !(controls as HTMLElement).dataset.canvasEnhanced) {
    (controls as HTMLElement).dataset.canvasEnhanced = "true";
    (controls as HTMLElement).classList.add("staging-screen-controls");
    const marketLabel = (market as HTMLElement).closest("label");
    marketLabel?.classList.add("staging-native-market-select");
    const scope = document.createElement("fieldset");
    (scope as HTMLElement).className = "staging-screen-scope";
    (scope as HTMLElement).innerHTML = `<legend>範圍</legend>${[
      ["all", "上市櫃合併"], ["listed", "只看上市"], ["otc", "只看上櫃"],
    ].map(([value, label]) => `<label><input type="radio" name="staging-screen-market" value="${value}" ${market.value === value ? "checked" : ""}><span>${label}</span></label>`).join("")}`;
    (marketLabel as HTMLElement | null)?.before(scope);
    const syncScope = () => (scope as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((radio) => { radio.checked = radio.value === market.value; });
    (scope as HTMLElement).addEventListener("change", (event) => {
      const radio = (event.target as HTMLElement).closest<HTMLInputElement>('input[type="radio"]');
      if (!radio) return;
      market.value = radio.value;
      market.dispatchEvent(new Event("change", { bubbles: true }));
    });
    market.addEventListener("change", syncScope);

    const actions = document.createElement("div");
    (actions as HTMLElement).className = "staging-screen-actions";
    (actions as HTMLElement).innerHTML = '<button type="button" class="staging-screen-submit">查詢</button><button type="button" class="staging-screen-clear">清除條件</button>';
    (controls as HTMLElement).append(actions);
    (actions as HTMLElement).querySelector(".staging-screen-submit")?.addEventListener("click", () => {
      keyword?.dispatchEvent(new Event("input", { bubbles: true }));
      requestAnimationFrame(() => (document.querySelector("#screen-results") as HTMLElement | null)?.focus({ preventScroll: true }));
    });
    (actions as HTMLElement).querySelector(".staging-screen-clear")?.addEventListener("click", () => {
      market.value = "all";
      if (industry) (industry as HTMLElement).value = "";
      if (band) (band as HTMLElement).value = "all";
      if (keyword) (keyword as HTMLElement).value = "";
      syncScope();
      market.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  const changeGroup = (controls as HTMLElement)?.querySelector(".screen-change-group");
  if (changeGroup && !(changeGroup as HTMLElement).querySelector(".staging-screen-band-summary")) {
    (changeGroup as HTMLElement).insertAdjacentHTML("beforeend", '<p class="staging-screen-band-summary">8 個區間 · 目前顯示全部</p>');
  }
  const bandSummary = (changeGroup as HTMLElement)?.querySelector(".staging-screen-band-summary");
  if (bandSummary && band) (bandSummary as HTMLElement).textContent = `8 個區間 · 目前顯示${(band as HTMLOptionElement)?.options[(band as HTMLElement).selectedIndex]?.text || "全部"}`;

  const result = root.querySelector(".screen-canvas-results");
  const resultHeader = (result as HTMLElement | null)?.querySelector(":scope > header");
  if (resultHeader && !(resultHeader as HTMLElement).querySelector(".staging-screen-result-tools")) {
    const tools = document.createElement("div");
    (tools as HTMLElement).className = "staging-screen-result-tools";
    (tools as HTMLElement).innerHTML = '<span class="complete">✓ 資料完整</span><span class="sorted">↕ 基準差正序</span>';
    (resultHeader as HTMLElement).append(tools);
  }
  const region = (result as HTMLElement | null)?.querySelector('[data-table-region="screen"]');
  if (region && !(result as HTMLElement | null)?.querySelector(".staging-screen-field-guide")) {
    (result as HTMLElement).insertAdjacentHTML("beforeend", '<aside class="staging-screen-field-guide"><strong>▤ 欄位說明</strong><span>基準值：模型估計結果</span><span>基準差：股價相對基準值</span><span>區間股價：基準值對應研究區間</span><em>ⓘ 模型結果僅供研究，不代表目標價或投資建議</em></aside>');
  }
}

// Enhance terms/legal pages
function enhanceTerms(root: Element): void {
  const page = root.querySelector(".service-terms-dashboard");
  if (!page || (page as HTMLElement).dataset.referenceEnhanced) return;
  (page as HTMLElement).dataset.referenceEnhanced = "true";
  const sections = [...(page as HTMLElement).querySelectorAll(".service-term-section")];
  if (!sections.length) return;
  const modes = [
    ["service", "服務條款"],
    ["privacy", "隱私權政策"],
    ["refund", "退款與取消政策"],
    ["disclaimer", "免責聲明"],
  ];
  const activeMode = document.body.dataset.mode || "service";
  const activeIndex = Math.max(0, modes.findIndex(([mode]) => mode === activeMode));
  const activeLabel = modes[activeIndex]?.[1] || "法務文件";
  const hero = (page as HTMLElement).querySelector(".service-terms-hero") as HTMLElement | null;
  const breadcrumb = document.createElement("nav");
  (breadcrumb as HTMLElement).className = "staging-terms-breadcrumb";
  (breadcrumb as HTMLElement).setAttribute("aria-label", "麵包屑");
  (breadcrumb as HTMLElement).innerHTML = `<a href="/">首頁</a><span aria-hidden="true">›</span><span>法務文件</span><span aria-hidden="true">›</span><strong>${escapeHtml(activeLabel)}</strong>`;
  (hero as HTMLElement | null)?.before(breadcrumb);
  const toolbar = document.createElement("div");
  (toolbar as HTMLElement).className = "staging-terms-toolbar";
  (toolbar as HTMLElement).innerHTML = `<nav aria-label="法務文件">${modes.map(([mode, label]) => `<a href="/${mode}" class="${mode === activeMode ? "active" : ""}">${label}</a>`).join("")}</nav><label class="staging-terms-document-select"><span class="sr-only">法務文件</span><select>${modes.map(([mode, label]) => `<option value="/${mode}" ${mode === activeMode ? "selected" : ""}>${label}</option>`).join("")}</select></label><time datetime="2026-06-01">生效日期：2026年6月1日</time>`;
  (hero as HTMLElement | null)?.after(toolbar);
  const layout = document.createElement("div");
  (layout as HTMLElement).className = "staging-terms-layout";
  const nav = document.createElement("nav");
  (nav as HTMLElement).id = "stagingTermsNav";
  (nav as HTMLElement).className = "staging-terms-nav list-group";
  (nav as HTMLElement).setAttribute("aria-label", "本頁目錄");
  (nav as HTMLElement).innerHTML = '<strong>本頁目錄</strong>';
  const progress = document.createElement("aside");
  (progress as HTMLElement).className = "staging-terms-progress";
  const mobileToc = document.createElement("label");
  (mobileToc as HTMLElement).className = "staging-terms-mobile-toc";
  (mobileToc as HTMLElement).innerHTML = '<span class="sr-only">本頁目錄</span><select><option value="">本頁目錄</option></select>';
  (toolbar as HTMLElement).after(mobileToc);
  sections.forEach((section, index) => {
    (section as HTMLElement).id = `terms-${index + 1}`;
    (section as HTMLElement).classList.add("is-open");
    const link = document.createElement("a");
    (link as HTMLAnchorElement).className = "list-group-item list-group-item-action";
    (link as HTMLAnchorElement).href = `#${(section as HTMLElement).id}`;
    (link as HTMLAnchorElement).dataset.step = String(index + 1).padStart(2, "0");
    (link as HTMLAnchorElement).textContent = (section as HTMLElement).querySelector("h2")?.textContent || "條款";
    (nav as HTMLElement).append(link);
    (mobileToc as HTMLElement).querySelector("select").insertAdjacentHTML("beforeend", `<option value="${(section as HTMLElement).id}">${index + 1} ${escapeHtml((section as HTMLElement).querySelector("h2")?.textContent || "條款")}</option>`);
  });
  const list = (page as HTMLElement).querySelector(".service-terms-list");
  const introduction = (hero as HTMLElement)?.querySelector("p");
  if (list && introduction) {
    (introduction as HTMLElement).className = "staging-terms-introduction";
    (list as HTMLElement).prepend(introduction);
  }
  const effectiveDate = (toolbar as HTMLElement).querySelector("time");
  if (hero && effectiveDate) (hero as HTMLElement).append(effectiveDate);
  (progress as HTMLElement).innerHTML = `<span>目前：</span><strong>${escapeHtml(activeLabel)}</strong><ol>${sections.map((section, index) => `<li><a href="#terms-${index + 1}">${index + 1 < 10 ? `〇${index + 1}` : index + 1} ${escapeHtml((section as HTMLElement).querySelector("h2")?.textContent || "條款")}</a></li>`).join("")}</ol><span>閱讀進度</span><b data-terms-progress>0%</b>`;
  layout.append(nav, list);
  (page as HTMLElement).append(layout);
  const previous = activeIndex > 0 ? modes[activeIndex - 1] : modes[modes.length - 1];
  const next = activeIndex < modes.length - 1 ? modes[activeIndex + 1] : modes[0];
  (page as HTMLElement).insertAdjacentHTML("beforeend", `<footer class="staging-terms-footer"><a href="/${previous[0]}">← 上一份：${previous[1]}</a><span>本網站資料僅供研究與資訊分享，不構成投資建議。</a><a href="/${next[0]}">下一份：${next[1]} →</a></footer><nav class="staging-terms-mobile-bar" aria-label="法務文件快捷列"><a href="#stagingTermsNav">☷ 目錄</a></nav>`);
  (toolbar as HTMLElement).querySelector("select")?.addEventListener("change", (event) => { location.href = (event.target as HTMLSelectElement).value; });
  (mobileToc as HTMLElement).querySelector("select")?.addEventListener("change", (event) => {
    const target = document.getElementById((event.target as HTMLSelectElement).value);
    (target as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  (bootstrap as Record<string, { ScrollSpy: { getInstance(el: Element | null): { refresh(): void; dispose(): void } } }>).ScrollSpy.getInstance(document.body)?.dispose();
  (bootstrap as Record<string, { ScrollSpy: { getOrCreateInstance(el: Element, config: { target: string; rootMargin: string } }): { refresh(): void } }>).ScrollSpy.getOrCreateInstance(document.body, { target: "#stagingTermsNav", rootMargin: "-20% 0px -70%" }).refresh();
  updateTermsProgress();
}

// Update terms reading progress
function updateTermsProgress(): void {
  const output = document.querySelector("[data-terms-progress]") as HTMLElement | null;
  const page = document.querySelector(".service-terms-dashboard") as HTMLElement | null;
  if (!output || !page) return;
  const rect = page.getBoundingClientRect();
  const distance = Math.max(1, page.offsetHeight - innerHeight);
  const value = Math.max(0, Math.min(100, Math.round(-rect.top / distance * 100)));
  (output as HTMLElement).textContent = `${value}%`;
}

// Main enhancement queue
let queued = false;
function enhance(): void {
  queued = false;
  mountDesktopNavigation();
  document.querySelectorAll('a[href="/about"], a[href="/help"]').forEach((link) => link.remove());
  const root = document.querySelector("#resultSlot") || document;
  const dashboard = (root as HTMLElement).querySelector(".home-dashboard") as HTMLElement | null;
  if (dashboard) enrichHome(dashboard);
  enhancePodcast(document);
  enhanceHelp(root as HTMLElement);
  enhanceScreen(root as HTMLElement);
  if (!(root as HTMLElement).querySelector(".service-terms-dashboard")) (bootstrap as Record<string, { ScrollSpy: { getInstance(el: Element | null): void } }>).ScrollSpy.getInstance(document.body)?.dispose();
  enhanceTerms(root as HTMLElement);
  document.body.classList.toggle("staging-stock-page", /^\/stock\//.test(location.pathname));
  document.body.classList.toggle("staging-industry-page", /^\/industry\//.test(location.pathname));
  syncNavigation();
}

const queueEnhance = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(enhance);
};

// Initialize
mountDesktopNavigation();
mountNavigation();
enhance();
new MutationObserver(() => { mountDesktopNavigation(); queueEnhance(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-mode"] });
addEventListener("twetq:mode-change", queueEnhance);
addEventListener("popstate", queueEnhance);
addEventListener("scroll", updateTermsProgress, { passive: true });
