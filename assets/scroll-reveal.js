const REVEAL_SELECTOR = '[data-reveal]';
const SCOPE_SELECTOR = '[data-reveal-scope]';
const READY_CLASS = 'reveal-ready';
const ROOT_MARGIN = '-12% 0px 0px 0px';

/** @type {WeakMap<Element, IntersectionObserver>} */
const observers = new WeakMap();

/**
 * Initializes scroll reveal on a section marked with `[data-reveal-scope]`.
 * Targets marked with `[data-reveal]` fade/translate in as they enter the
 * viewport and fade/slide out as they leave it.
 *
 * @param {Element} root - The `[data-reveal-scope]` section element.
 */
function initReveal(root) {
  if (!(root instanceof HTMLElement)) return;

  // Re-running is expected (e.g. the theme editor reloads a section), so drop
  // any previous observer before rebuilding.
  observers.get(root)?.disconnect();
  observers.delete(root);

  const targets = root.querySelectorAll(REVEAL_SELECTOR);
  if (targets.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.remove(READY_CLASS);
    return;
  }

  root.classList.add(READY_CLASS);

  const viewportHeight = window.innerHeight;

  targets.forEach((target, index) => {
    target.style.setProperty('--reveal-index', String(index));

    // Keep any state the element already has; only seed new targets. Elements
    // already in view start visible so there is no flash on load, everything
    // else waits below until it scrolls in.
    if (target.dataset.state) return;

    const rect = target.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.top < viewportHeight;
    target.dataset.state = inView ? 'in' : 'before';
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const target = entry.target;

        if (entry.isIntersecting) {
          target.dataset.state = 'in';
          continue;
        }

        const rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
        const exitedAbove = entry.boundingClientRect.bottom <= rootTop;
        target.dataset.state = exitedAbove ? 'out' : 'before';
      }
    },
    { rootMargin: ROOT_MARGIN, threshold: 0 }
  );

  targets.forEach((target) => observer.observe(target));
  observers.set(root, observer);
}

/**
 * @param {ParentNode} [scope]
 */
function initAll(scope = document) {
  scope.querySelectorAll?.(SCOPE_SELECTOR).forEach(initReveal);
}

initAll();

document.addEventListener('shopify:section:load', (event) => initAll(event.target));

document.addEventListener('shopify:section:unload', (event) => {
  event.target.querySelectorAll?.(SCOPE_SELECTOR).forEach((root) => {
    observers.get(root)?.disconnect();
    observers.delete(root);
  });
});
