// Bootstrap Loader - TypeScript 版本
// Loads Bootstrap CSS, JS bundle, adapter, and staging-reference in sequence

(() => {
  document.documentElement.classList.add("bootstrap-ui");
  document.querySelector("#bootstrapCoreStyles")?.setAttribute("media", "all");

  document.documentElement.classList.add("staging-reference-ui");
  const referenceStyles = document.createElement("link");
  (referenceStyles as HTMLLinkElement).rel = "stylesheet";
  (referenceStyles as HTMLLinkElement).href = "/staging-reference.css?v=20260905-free-site-v1";
  document.head.append(referenceStyles);

  addEventListener("DOMContentLoaded", () => {
    const bundle = document.createElement("script");
    (bundle as HTMLScriptElement).src = "/vendor/bootstrap.bundle.min.js?v=5.3.8";
    (bundle as HTMLScriptElement).onload = () => {
      const adapter = document.createElement("script");
      (adapter as HTMLScriptElement).src = "/bootstrap-adapter.js?v=20260905-free-site-v1";
      (adapter as HTMLScriptElement).onload = () => {
        const reference = document.createElement("script");
        (reference as HTMLScriptElement).src = "/staging-reference.js?v=20260905-free-site-v1";
        document.body.append(reference);
      };
      document.body.append(adapter);
    };
    document.body.append(bundle);
  }, { once: true });
})();
