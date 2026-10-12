const REVEAL_SELECTOR = '[data-reveal]';
const READY_CLASS = 'insights--reveal-ready';
const ROOT_MARGIN = '-12% 0px 0px 0px';

/** @type {WeakMap<Element, IntersectionObserver>} */
const observers = new WeakMap();

/**
 * Initializes the scroll reveal on an Insights section.
 *
 * @param {Element} root - The `.insights` section element.
 */
function initInsights(root) {
  if (!(root instanceof HTMLElement) || root.dataset.revealInitialized === 'true') return;
  root.dataset.revealInitialized = 'true';

  const targets = root.querySelectorAll(REVEAL_SELECTOR);
  if (targets.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  root.classList.add(READY_CLASS);

  const viewportHeight = window.innerHeight;

  targets.forEach((target, index) => {
    target.style.setProperty('--reveal-index', String(index));

    // Elements already in view start visible so there is no flash on load;
    // everything else waits below until it scrolls in.
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
  scope.querySelectorAll?.('.insights').forEach(initInsights);
}

initAll();

document.addEventListener('shopify:section:load', (event) => initAll(event.target));

document.addEventListener('shopify:section:unload', (event) => {
  event.target.querySelectorAll?.('.insights').forEach((root) => {
    observers.get(root)?.disconnect();
    observers.delete(root);
  });
});
