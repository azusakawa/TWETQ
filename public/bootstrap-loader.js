(() => {
  document.documentElement.classList.add("bootstrap-ui");
  document.querySelector("#bootstrapCoreStyles")?.setAttribute("media", "all");

  document.documentElement.classList.add("staging-reference-ui");
  const referenceStyles = document.createElement("link");
  referenceStyles.rel = "stylesheet";
  referenceStyles.href = "/staging-reference.css?v=20260905-free-site-v1";
  document.head.append(referenceStyles);

  addEventListener("DOMContentLoaded", () => {
    const bundle = document.createElement("script");
    bundle.src = "/vendor/bootstrap.bundle.min.js?v=5.3.8";
    bundle.onload = () => {
      const adapter = document.createElement("script");
      adapter.src = "/bootstrap-adapter.js?v=20260905-free-site-v1";
      adapter.onload = () => {
        const reference = document.createElement("script");
        reference.src = "/staging-reference.js?v=20260905-free-site-v1";
        document.body.append(reference);
      };
      document.body.append(adapter);
    };
    document.body.append(bundle);
  }, { once: true });
})();
