(() => {
  if (!window.bootstrap) return;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);

  const routeMode = () => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (/^\/podcast\/\d+$/.test(path)) return "podcast";
    if (/^(\/stock\/|\/industry\/)/.test(path)) return "market";
    return document.body.dataset.mode || ({
      "/": "home",
      "/podcast": "podcast",
    })[path] || path.slice(1);
  };

  function mountDesktopNavigation() {
    const nav = document.querySelector("#desktopNavBar");
    if (!nav || nav.querySelectorAll("[data-staging-mode]").length === 5) return;
    nav.dataset.referenceEnhanced = "true";
    nav.innerHTML = [
      ["home", "/", "最新一集"],
      ["podcast", "/podcast", "所有集數"],
      ["market", "/market", "市場總覽"],
      ["institutional", "/institutional", "法人籌碼"],
      ["screen", "/screen", "選股"],
    ].map(([mode, href, label]) => `<a class="desktop-nav-item" href="${href}" data-mode-link="${mode}" data-staging-mode="${mode}"${["market", "institutional", "screen"].includes(mode) ? " data-research-nav" : ""}>${label}</a>`).join("");
    syncNavigation();
  }

  function mountNavigation() {
    const header = document.querySelector(".app-header");
    if (!header || document.querySelector("#stagingMenu")) return;
    const button = document.createElement("button");
    button.id = "stagingMenuButton";
    button.className = "staging-menu-toggle";
    button.type = "button";
    button.setAttribute("aria-controls", "stagingMenu");
    button.setAttribute("aria-label", "開啟功能選單");
    button.innerHTML = '<span aria-hidden="true"></span>';
    header.append(button);

    const menu = document.createElement("aside");
    menu.id = "stagingMenu";
    menu.className = "offcanvas offcanvas-start staging-offcanvas";
    menu.tabIndex = -1;
    menu.setAttribute("aria-labelledby", "stagingMenuTitle");
    menu.innerHTML = `
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
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(menu, { backdrop: true, scroll: false });
    let lastTrigger = button;
    button.addEventListener("click", () => { lastTrigger = button; offcanvas.show(); });
    menu.addEventListener("hidden.bs.offcanvas", () => lastTrigger?.focus());
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => offcanvas.hide()));

    const bottom = document.createElement("nav");
    bottom.className = "staging-mobile-nav";
    bottom.setAttribute("aria-label", "手機主要分頁");
    bottom.innerHTML = `
      <a href="/" data-staging-mode="home"><b aria-hidden="true">●</b><span>最新</span></a>
      <a href="/podcast" data-staging-mode="podcast"><b aria-hidden="true">▤</b><span>所有集數</span></a>
      <a href="/market" data-staging-mode="market"><b aria-hidden="true">⌁</b><span>市場</span></a>
      <a href="/screen" data-staging-mode="screen"><b aria-hidden="true">▥</b><span>選股</span></a>
      <a href="/disclaimer" data-staging-mode="disclaimer"><b aria-hidden="true">ⓘ</b><span>資料說明</span></a>`;
    document.body.append(bottom);
  }

  function syncNavigation() {
    const mode = routeMode();
    document.querySelectorAll("[data-staging-mode]").forEach((item) => {
      const active = item.dataset.stagingMode === mode;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function insertCover(target, className = "staging-podcast-cover") {
    if (!target || target.querySelector(`.${className}`)) return;
    const image = document.createElement("img");
    image.className = className;
    image.src = "/assets/podcast-cover.svg";
    image.alt = "TWETQ Podcast 投資脈絡封面";
    image.width = 240;
    image.height = 240;
    target.prepend(image);
  }

  const episodeTitle = (source = {}) => String(source.title || `EP${source.number || ""}`).replace(/^EP\s*\d+\s*/i, "").trim();
  const episodeDate = (source = {}) => String(source.date || source.dateText || "").replaceAll("-", ".");

  function episodeHeroMarkup(data, { heading = "h2", latest = false, detailHref = "/podcast" } = {}) {
    const source = data?.source || {};
    const analysis = data?.analysis || {};
    const episode = String(source.number || "");
    const title = episodeTitle(source) || "最新 Podcast 單集";
    const summary = String(source.excerpt || source.bodyPreview || "從本集內容出發，整理節目脈絡與延伸研究方向。").trim();
    const tags = [...new Set([
      ...(Array.isArray(source.tags) ? source.tags : []),
      ...(Array.isArray(analysis.industries) ? analysis.industries.map((item) => item?.name) : []),
    ].map((item) => String(item || "").trim()).filter((item) => item && item.toLowerCase() !== "transcript"))].slice(0, 5);
    const audio = (Array.isArray(source.audioLinks) ? source.audioLinks : []).find(Boolean);
    const primaryHref = audio || (latest ? detailHref : Number(source.bodyTextLength) > 0 ? "#podcast-transcript" : detailHref);
    const external = /^https?:\/\//i.test(primaryHref);
    const primaryLabel = audio ? "前往收聽本集" : latest ? "閱讀本集研究" : Number(source.bodyTextLength) > 0 ? "閱讀本集逐字稿" : "閱讀本集研究";
    const playableAudio = latest && audio && /\.(?:mp3|m4a|ogg|wav)(?:[?#]|$)/i.test(audio);
    const latestPlayer = playableAudio
      ? `<div class="staging-episode-player staging-native-player"><audio controls preload="metadata" src="${escapeHtml(audio)}">您的瀏覽器不支援音訊播放。</audio><a class="staging-player-detail" href="${escapeHtml(detailHref)}">查看完整內容<span aria-hidden="true"> →</span></a></div>`
      : `<div class="staging-episode-player staging-episode-resource">
          <a class="staging-play-button" href="${escapeHtml(primaryHref)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="${escapeHtml(primaryLabel)}"><span aria-hidden="true">${audio ? "▶" : "↗"}</span></a>
          <div class="staging-player-copy"><strong>${escapeHtml(primaryLabel)}</strong><small>${audio ? "將開啟外部 Podcast 平台" : "逐字稿與延伸研究整理"}</small></div>
          <a class="staging-player-detail" href="${escapeHtml(detailHref)}">查看完整內容<span aria-hidden="true"> →</span></a>
        </div>`;

    return `
      <figure class="staging-episode-cover-wrap">
        <img class="staging-episode-cover" src="/assets/podcast-cover.svg" width="260" height="260" alt="TWETQ Podcast 投資脈絡封面">
      </figure>
      <article class="staging-episode-card">
        <header class="staging-episode-heading">
          <span class="staging-episode-badge">${latest ? "最新一集" : "單集研究"}</span>
          <div class="staging-episode-meta">${episode ? `<strong>EP.${escapeHtml(episode)}</strong>` : ""}${episodeDate(source) ? `<time datetime="${escapeHtml(source.date || source.dateText)}">${escapeHtml(episodeDate(source))}</time>` : ""}</div>
        </header>
        <div class="staging-episode-copy">
          <${heading}>${escapeHtml(title)}</${heading}>
          <p>${escapeHtml(summary)}</p>
          ${tags.length ? `<div class="staging-episode-tags" aria-label="本集主題">${tags.map((tag) => `<span># ${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        </div>
        ${latest ? latestPlayer : `<div class="staging-episode-player">
          <a class="staging-play-button" href="${escapeHtml(primaryHref)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="${escapeHtml(primaryLabel)}"><span aria-hidden="true">▶</span></a>
          <div class="staging-player-copy"><strong>${escapeHtml(primaryLabel)}</strong><small>${audio ? "將開啟外部 Podcast 平台" : "逐字稿與延伸研究整理"}</small></div>
          <span class="staging-player-track" aria-hidden="true"><i></i></span>
          <a class="staging-player-detail" href="${escapeHtml(detailHref)}">所有集數<span aria-hidden="true"> →</span></a>
        </div>`}
      </article>`;
  }

  const quoteText = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

  function contextPanel(data, { latest = false, quotes = new Map() } = {}) {
    const stocks = (data?.analysis?.stocks || []).slice(0, 4);
    const industries = (data?.analysis?.industries || []).slice(0, 6);
    const stockSlots = latest ? Array.from({ length: 4 }, (_, index) => stocks[index] || null) : stocks;
    const industrySlots = latest ? Array.from({ length: 6 }, (_, index) => industries[index] || null) : industries;
    const panel = document.createElement("section");
    panel.className = "home-context-grid staging-context-grid";
    panel.innerHTML = `
      <article>
        <header><span>直接提及個股</span><a href="/market">查看全部 <span aria-hidden="true">›</span></a></header>
        <div class="home-context-stocks">${stockSlots.map((stock, index) => {
          if (!stock) return `<div class="staging-context-stock-empty" aria-label="第 ${index + 1} 個個股卡位沒有資料"><b>—</b><span>本集未辨識更多個股</span></div>`;
          const quote = quotes.get(String(stock.code || ""));
          const change = Number(quote?.change);
          const tone = Number.isFinite(change) ? change > 0 ? "up" : change < 0 ? "down" : "flat" : "flat";
          const sign = Number.isFinite(change) && change !== 0 ? (change > 0 ? "▲" : "▼") : "";
          const percent = Number.isFinite(Number(quote?.changePct)) ? `${Number(quote.changePct).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "資料待更新";
          return `<a href="/stock/${encodeURIComponent(String(stock.code || ""))}" data-direct-stock="${escapeHtml(stock.code || "")}"${quote ? " data-stock-quote" : ""}><span><b>${escapeHtml(stock.name || "名稱資料缺漏")}</b><small>${escapeHtml(stock.code || "—")}</small></span><strong class="${tone}">${quoteText(quote?.close)}</strong><em class="${tone}">${sign} ${escapeHtml(percent)}</em><small class="staging-stock-reason">${escapeHtml(stock.reason || "節目內容提及")}</small></a>`;
        }).join("") || '<p class="staging-context-empty">本集未辨識到直接提及個股。</p>'}</div>
      </article>
      <article>
        <header><span>系統延伸</span><small>相關產業方向</small></header>
        <div class="home-context-industries">${industrySlots.map((industry) => {
          if (!industry) return '<span class="staging-context-industry-empty">未辨識更多產業</span>';
          const name = String(industry?.name || "產業分類").trim();
          const categoryCode = String(industry?.moneydjCategoryCode || "").trim();
          return categoryCode
            ? `<a href="/industry/${encodeURIComponent(categoryCode)}" aria-label="查看 ${escapeHtml(name)} 類股">${escapeHtml(name)}<span aria-hidden="true">›</span></a>`
            : `<span>${escapeHtml(name)}</span>`;
        }).join("") || '<p class="staging-context-empty">本集未解析出產業分類。</p>'}</div>
      </article>`;
    return panel;
  }

  function researchIcon(kind) {
    const paths = {
      stock: '<path d="M5 23V8m0 15h22M8 19l5-6 4 3 7-9 4 3"/><circle cx="23" cy="22" r="5"/><path d="m27 26 4 4"/>',
      market: '<path d="M5 27V16h6v11m3 0V10h6v17m3 0V5h6v22M3 27h28"/>',
      method: '<rect x="7" y="4" width="20" height="26" rx="2"/><path d="M11 10h12M11 15h12M11 20h8"/>',
      archive: '<path d="M6 5h17l5 5v20H6z"/><path d="M23 5v6h6M11 16h12M11 21h12M11 26h8"/>',
    };
    return `<svg viewBox="0 0 34 34" aria-hidden="true" focusable="false">${paths[kind]}</svg>`;
  }

  function researchPanel({ latest = false } = {}) {
    const items = [
      ["個股脈絡", "/screen", "由 Podcast 議題切入個股研究", "探索個股", "stock"],
      ["市場總覽", "/market", "掌握市場結構與長期趨勢", "探索市場", "market"],
      ...(latest ? [["法人籌碼", "/institutional", "比對外資、投信與三大法人方向", "查看籌碼", "method"]] : []),
      ["所有集數", "/podcast", "依集數閱讀完整研究整理", "瀏覽集數", "archive"],
    ];
    const panel = document.createElement("section");
    panel.className = "staging-research-path";
    panel.innerHTML = `<h2>進入研究脈絡</h2><div>${items.map(([title, href, body, action, icon]) => `<a href="${href}">${researchIcon(icon)}<span><strong>${title}</strong><small>${body}</small><em>${action} <span aria-hidden="true">›</span></em></span></a>`).join("")}</div>`;
    return panel;
  }

  async function enrichHome(root) {
    if (!root || root.dataset.referenceEnhanced) return;
    root.dataset.referenceEnhanced = "true";
    try {
      const quotesReady = fetch("/api/market/snapshot").then((response) => response.ok ? response.json() : null).catch(() => null);
      const response = await fetch("/api/podcast/latest");
      if (!response.ok) return;
      const data = await response.json();
      if (!document.contains(root)) return;
      const hero = root.querySelector(".home-hero");
      if (!hero) return;
      const episode = String(data?.source?.number || "");
      hero.classList.add("staging-latest-episode");
      hero.innerHTML = episodeHeroMarkup(data, { latest: true, detailHref: episode ? `/podcast/${encodeURIComponent(episode)}` : "/podcast" });
      let context = contextPanel(data, { latest: true });
      const research = researchPanel({ latest: true });
      hero.after(context, research);
      root.querySelectorAll(".home-episode-section, .home-tools-section").forEach((section) => { section.hidden = true; });
      const note = root.querySelector(".home-reading-note");
      if (note) note.innerHTML = '<span aria-hidden="true">ⓘ</span><div><h3>本網站僅供研究與資訊分享，不構成任何投資建議。</h3><p>投資有風險，請審慎評估並自行負盈虧。</p></div>';
      quotesReady.then((snapshot) => {
        if (!document.contains(context)) return;
        const quoteMap = new Map((Array.isArray(snapshot?.quotes) ? snapshot.quotes : []).map((quote) => [String(quote.code || ""), quote]));
        const nextContext = contextPanel(data, { latest: true, quotes: quoteMap });
        context.replaceWith(nextContext);
        context = nextContext;
      });
    } catch (_) {
      insertCover(root.querySelector(".home-podcast-figure"), "home-podcast-cover");
    }
  }

  async function enhanceDirectPodcast(root) {
    const main = root.querySelector("#seoMain");
    if (!main || main.dataset.referenceEnhanced || !/^\/podcast\/\d+$/.test(location.pathname)) return;
    main.dataset.referenceEnhanced = "true";
    try {
      const episode = location.pathname.split("/").filter(Boolean).at(-1);
      const response = await fetch(`/api/podcast/latest?ep=${encodeURIComponent(episode)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!document.contains(main)) return;
      const hero = main.querySelector(":scope > .seo-card:first-child");
      if (!hero) return;
      hero.classList.add("staging-latest-episode", "staging-direct-episode-hero");
      hero.innerHTML = episodeHeroMarkup(data, { heading: "h1", detailHref: "/podcast" });
      const context = contextPanel(data);
      const research = researchPanel();
      hero.after(context, research);
      main.classList.add("staging-direct-podcast");
      const duplicate = main.querySelector('[data-podcast-analysis="ai"]');
      if (duplicate) duplicate.hidden = true;
    } catch (_) {}
  }

  function enhancePodcast(root) {
    root.querySelectorAll(".podcast-hero-card").forEach((hero) => insertCover(hero));
    enhanceDirectPodcast(root);
  }

  function enhanceHelp(root) {
    const page = root.querySelector(".help-dashboard");
    const nav = page?.querySelector(":scope > .help-anchor-nav");
    if (!page || !nav || page.dataset.referenceEnhanced) return;
    page.dataset.referenceEnhanced = "true";
    const layout = document.createElement("div");
    const content = document.createElement("div");
    layout.className = "staging-help-layout";
    content.className = "staging-help-content";
    [...page.children].filter((node) => !node.classList.contains("page-strip") && node !== nav).forEach((node) => content.append(node));
    nav.classList.add("staging-help-nav");
    const hero = content.querySelector(".help-hero");
    if (hero && !hero.querySelector(".staging-help-illustration")) {
      hero.insertAdjacentHTML("beforeend", `<svg class="staging-help-illustration" viewBox="0 0 260 150" aria-hidden="true" focusable="false"><path d="M22 126h216M58 115c25-16 53-20 84-12 24 6 45 4 63-9M109 95V45c0-18 11-31 26-31s26 13 26 31v34c0 18-11 31-26 31s-26-13-26-31zm12-50c0-10 5-17 14-17s14 7 14 17v34c0 10-5 17-14 17s-14-7-14-17zm14 65v16m-17 0h34M30 76c18-8 35-8 52 0v35c-17-8-34-8-52 0zm52 0c18-8 35-8 52 0"/><path d="M44 87h24m-24 9h20"/></svg>`);
    }
    const quickStart = hero?.querySelector(".help-quick-card");
    if (quickStart) hero.after(quickStart);
    layout.append(nav, content);
    page.append(layout);
  }

  function enhanceScreen(root) {
    if (document.body.dataset.mode !== "screen") return;
    const controls = document.querySelector("#screenControls");
    const market = document.querySelector("#screenMarket");
    const industry = document.querySelector("#screenIndustry");
    const band = document.querySelector("#screenBand");
    const keyword = document.querySelector("#screenKeyword");
    if (controls && market && !controls.dataset.canvasEnhanced) {
      controls.dataset.canvasEnhanced = "true";
      controls.classList.add("staging-screen-controls");
      const marketLabel = market.closest("label");
      marketLabel?.classList.add("staging-native-market-select");
      const scope = document.createElement("fieldset");
      scope.className = "staging-screen-scope";
      scope.innerHTML = `<legend>範圍</legend>${[
        ["all", "上市櫃合併"], ["listed", "只看上市"], ["otc", "只看上櫃"],
      ].map(([value, label]) => `<label><input type="radio" name="staging-screen-market" value="${value}" ${market.value === value ? "checked" : ""}><span>${label}</span></label>`).join("")}`;
      marketLabel?.before(scope);
      const syncScope = () => scope.querySelectorAll('input[type="radio"]').forEach((radio) => { radio.checked = radio.value === market.value; });
      scope.addEventListener("change", (event) => {
        const radio = event.target.closest('input[type="radio"]');
        if (!radio) return;
        market.value = radio.value;
        market.dispatchEvent(new Event("change", { bubbles: true }));
      });
      market.addEventListener("change", syncScope);

      const actions = document.createElement("div");
      actions.className = "staging-screen-actions";
      actions.innerHTML = '<button type="button" class="staging-screen-submit">查詢</button><button type="button" class="staging-screen-clear">清除條件</button>';
      controls.append(actions);
      actions.querySelector(".staging-screen-submit").addEventListener("click", () => {
        keyword?.dispatchEvent(new Event("input", { bubbles: true }));
        requestAnimationFrame(() => document.querySelector("#screen-results")?.focus({ preventScroll: true }));
      });
      actions.querySelector(".staging-screen-clear").addEventListener("click", () => {
        market.value = "all";
        if (industry) industry.value = "";
        if (band) band.value = "all";
        if (keyword) keyword.value = "";
        syncScope();
        market.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    const changeGroup = controls?.querySelector(".screen-change-group");
    if (changeGroup && !changeGroup.querySelector(".staging-screen-band-summary")) {
      changeGroup.insertAdjacentHTML("beforeend", '<p class="staging-screen-band-summary">8 個區間 · 目前顯示全部</p>');
    }
    const bandSummary = changeGroup?.querySelector(".staging-screen-band-summary");
    if (bandSummary && band) bandSummary.textContent = `8 個區間 · 目前顯示${band.options[band.selectedIndex]?.text || "全部"}`;

    const result = root.querySelector(".screen-canvas-results");
    const resultHeader = result?.querySelector(":scope > header");
    if (resultHeader && !resultHeader.querySelector(".staging-screen-result-tools")) {
      const tools = document.createElement("div");
      tools.className = "staging-screen-result-tools";
      tools.innerHTML = '<span class="complete">✓ 資料完整</span><span class="sorted">↕ 基準差正序</span>';
      resultHeader.append(tools);
    }
    const region = result?.querySelector('[data-table-region="screen"]');
    if (region && !result.querySelector(".staging-screen-field-guide")) {
      result.insertAdjacentHTML("beforeend", '<aside class="staging-screen-field-guide"><strong>▤ 欄位說明</strong><span>基準值：模型估計結果</span><span>基準差：股價相對基準值</span><span>區間股價：基準值對應研究區間</span><em>ⓘ 模型結果僅供研究，不代表目標價或投資建議</em></aside>');
    }
  }

  function enhanceTerms(root) {
    const page = root.querySelector(".service-terms-dashboard");
    if (!page || page.dataset.referenceEnhanced) return;
    page.dataset.referenceEnhanced = "true";
    const sections = [...page.querySelectorAll(".service-term-section")];
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
    const hero = page.querySelector(".service-terms-hero");
    const breadcrumb = document.createElement("nav");
    breadcrumb.className = "staging-terms-breadcrumb";
    breadcrumb.setAttribute("aria-label", "麵包屑");
    breadcrumb.innerHTML = `<a href="/">首頁</a><span aria-hidden="true">›</span><span>法務文件</span><span aria-hidden="true">›</span><strong>${activeLabel}</strong>`;
    hero?.before(breadcrumb);
    const toolbar = document.createElement("div");
    toolbar.className = "staging-terms-toolbar";
    toolbar.innerHTML = `<nav aria-label="法務文件">${modes.map(([mode, label]) => `<a href="/${mode}" class="${mode === activeMode ? "active" : ""}">${label}</a>`).join("")}</nav><label class="staging-terms-document-select"><span class="sr-only">法務文件</span><select>${modes.map(([mode, label]) => `<option value="/${mode}" ${mode === activeMode ? "selected" : ""}>${label}</option>`).join("")}</select></label><time datetime="2026-06-01">生效日期：2026年6月1日</time>`;
    hero?.after(toolbar);
    const layout = document.createElement("div");
    const nav = document.createElement("nav");
    const progress = document.createElement("aside");
    layout.className = "staging-terms-layout";
    nav.id = "stagingTermsNav";
    nav.className = "staging-terms-nav list-group";
    nav.setAttribute("aria-label", "本頁目錄");
    nav.innerHTML = '<strong>本頁目錄</strong>';
    const mobileToc = document.createElement("label");
    mobileToc.className = "staging-terms-mobile-toc";
    mobileToc.innerHTML = '<span class="sr-only">本頁目錄</span><select><option value="">本頁目錄</option></select>';
    toolbar.after(mobileToc);
    sections.forEach((section, index) => {
      section.id = `terms-${index + 1}`;
      section.classList.add("is-open");
      const link = document.createElement("a");
      link.className = "list-group-item list-group-item-action";
      link.href = `#${section.id}`;
      link.dataset.step = String(index + 1).padStart(2, "0");
      link.textContent = section.querySelector("h2")?.textContent || "條款";
      nav.append(link);
      mobileToc.querySelector("select").insertAdjacentHTML("beforeend", `<option value="${section.id}">${index + 1}　${escapeHtml(section.querySelector("h2")?.textContent || "條款")}</option>`);
    });
    const list = page.querySelector(".service-terms-list");
    const introduction = hero?.querySelector("p");
    if (list && introduction) {
      introduction.className = "staging-terms-introduction";
      list.prepend(introduction);
    }
    const effectiveDate = toolbar.querySelector("time");
    if (hero && effectiveDate) hero.append(effectiveDate);
    progress.className = "staging-terms-progress";
    progress.innerHTML = `<span>目前：</span><strong>${activeLabel}</strong><ol>${sections.map((section, index) => `<li><a href="#terms-${index + 1}">${index + 1 < 10 ? `〇${index + 1}` : index + 1}　${escapeHtml(section.querySelector("h2")?.textContent || "條款")}</a></li>`).join("")}</ol><span>閱讀進度</span><b data-terms-progress>0%</b>`;
    layout.append(nav, list);
    page.append(layout);
    const previous = activeIndex > 0 ? modes[activeIndex - 1] : modes[modes.length - 1];
    const next = activeIndex < modes.length - 1 ? modes[activeIndex + 1] : modes[0];
    page.insertAdjacentHTML("beforeend", `<footer class="staging-terms-footer"><a href="/${previous[0]}">←　上一份：${previous[1]}</a><span>本網站資料僅供研究與資訊分享，不構成投資建議。</span><a href="/${next[0]}">下一份：${next[1]}　→</a></footer><nav class="staging-terms-mobile-bar" aria-label="法務文件快捷列"><a href="#stagingTermsNav">☷　目錄</a></nav>`);
    toolbar.querySelector("select")?.addEventListener("change", (event) => { location.href = event.target.value; });
    mobileToc.querySelector("select")?.addEventListener("change", (event) => {
      const target = document.getElementById(event.target.value);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bootstrap.ScrollSpy.getOrCreateInstance(document.body, { target: "#stagingTermsNav", rootMargin: "-20% 0px -70%" }).refresh();
    updateTermsProgress();
  }


  function updateTermsProgress() {
    const output = document.querySelector("[data-terms-progress]");
    const page = document.querySelector(".service-terms-dashboard");
    if (!output || !page) return;
    const rect = page.getBoundingClientRect();
    const distance = Math.max(1, page.offsetHeight - innerHeight);
    const value = Math.max(0, Math.min(100, Math.round(-rect.top / distance * 100)));
    output.textContent = `${value}%`;
  }

  let queued = false;
  function enhance() {
    queued = false;
    mountDesktopNavigation();
    document.querySelectorAll('a[href="/about"], a[href="/help"]').forEach((link) => link.remove());
    const root = document.querySelector("#resultSlot") || document;
    enrichHome(root.querySelector(".home-dashboard"));
    enhancePodcast(document);
    enhanceHelp(root);
    enhanceScreen(root);
    if (!root.querySelector(".service-terms-dashboard")) bootstrap.ScrollSpy.getInstance(document.body)?.dispose();
    enhanceTerms(root);
    document.body.classList.toggle("staging-stock-page", /^\/stock\//.test(location.pathname));
    document.body.classList.toggle("staging-industry-page", /^\/industry\//.test(location.pathname));
    syncNavigation();
  }
  const queueEnhance = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
  };

  mountDesktopNavigation();
  mountNavigation();
  enhance();
  new MutationObserver(() => { mountDesktopNavigation(); queueEnhance(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-mode"] });
  addEventListener("twetq:mode-change", queueEnhance);
  addEventListener("popstate", queueEnhance);
  addEventListener("scroll", updateTermsProgress, { passive: true });
})();
