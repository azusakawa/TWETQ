(() => {
  const add = (root, selector, ...classes) => root.querySelectorAll(selector).forEach((node) => node.classList.add(...classes));

  const enhanceShell = () => {
    add(document, ".shell", "container-fluid", "twetq-shell");
    add(document, ".app-header", "navbar", "navbar-expand-xl", "twetq-header");
    add(document, ".brand-lockup", "twetq-brand-row");
    add(document, ".desktop-nav-bar", "navbar-nav", "twetq-nav-row", "d-none", "d-xl-flex");
    add(document, ".desktop-nav-item", "nav-link");
    add(document, ".nav-toggle", "d-inline-flex", "d-xl-none");
    add(document, ".footer-note", "twetq-footer", "border-top");
    add(document, ".footer-inner", "container-fluid", "twetq-footer-row", "d-flex", "flex-column", "flex-xl-row", "align-items-start", "align-items-xl-center", "justify-content-xl-between", "gap-2", "gap-xl-4");
    add(document, ".footer-brand, .footer-legal", "flex-shrink-0");
    add(document, ".footer-links", "d-flex", "flex-wrap", "gap-2", "gap-md-3");
  };

  const enhance = (root = document) => {
    add(root, "input:not([type='checkbox']):not([type='radio']), textarea", "form-control");
    add(root, "select", "form-select");
    add(root, ".run-button, .home-action-primary, .seo-button", "btn");
    add(root, ".metric-card, .ticker, .detail-panel, .market-stock-panel, .market-ranking-card, .institutional-summary-card, .institutional-ranking-card, .podcast-hero-card, .podcast-search-card, .help-section, .support-option, .support-policy-card, .service-term-section, .futures-card, .kline-card, .subindustry-card, .company-profile-card, .portfolio-metric-card, .seo-card", "card");
    add(root, "table", "table");
    add(root, ".market-quote-table-wrap, .institutional-table-wrap, .market-ranking-table-wrap", "table-responsive");
    add(root, ".institutional-load-error, .error-suggestions, .data-age-warning, .podcast-freshness-warning", "alert");
  };

  const syncActiveNavigation = () => {
    const mode = document.body.dataset.mode || "home";
    document.querySelectorAll(".desktop-nav-item").forEach((link) => {
      const active = link.dataset.modeLink === mode;
      link.classList.toggle("active", active);
      link.classList.remove("bg-primary");
      link.setAttribute("aria-current", active ? "page" : "false");
    });
  };

  enhanceShell();
  enhance();
  syncActiveNavigation();
  window.addEventListener("twetq:mode-change", syncActiveNavigation);
  new MutationObserver(syncActiveNavigation).observe(document.body, { attributes: true, attributeFilter: ["data-mode"] });

  const resultSlot = document.querySelector("#resultSlot");
  if (resultSlot) new MutationObserver(() => enhance(resultSlot)).observe(resultSlot, { childList: true, subtree: true });
})();
