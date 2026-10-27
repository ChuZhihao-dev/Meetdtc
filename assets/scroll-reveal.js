import { Component } from '@theme/component';

/**
 * Shared one-shot reveal. Native connection/removal also covers editor reloads.
 * data-reveal-timeline="desktop" batches at >=990px and reveals individually below.
 * data-reveal-margin overrides the observer margin, including initially visible targets.
 */
class ScrollReveal extends Component {
  #observer;
  #controller;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');
  #desktop = matchMedia('(min-width: 990px)');

  connectedCallback() {
    super.connectedCallback();
    this.#initialize();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#cleanup();
    this.#initialize();
  }

  disconnectedCallback() {
    this.#cleanup();
    super.disconnectedCallback();
  }

  #initialize() {
    if (!this.hasAttribute('data-reveal-scope')) return;
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.#motion.addEventListener('change', this.#reveal, { signal });
    if (this.getAttribute('data-reveal-timeline') === 'desktop') {
      this.#desktop.addEventListener('change', this.#reveal, { signal });
    }
    if (window.Shopify?.designMode) {
      // Keep block selection immediate; editor handlers never run on storefronts.
      this.addEventListener('shopify:block:select', this.#show, { signal });
      this.addEventListener('shopify:block:deselect', this.#show, { signal });
    }
    this.#reveal();
  }

  #show = () => {
    this.#observer?.disconnect();
    this.classList.remove('reveal-ready');
  };

  #reveal = () => {
    this.#show();
    const targets = [...this.querySelectorAll('[data-reveal]')];
    if (this.#motion.matches || !targets.length) return;
    if (window.Shopify?.designMode && !this.hasAttribute('data-reveal-in-editor')) return;
    const timeline = this.hasAttribute('data-reveal-timeline') &&
      (this.getAttribute('data-reveal-timeline') !== 'desktop' || this.#desktop.matches);
    const margin = this.getAttribute('data-reveal-margin');
    // Batch layout reads before dataset/style writes, including multi-card lists.
    const visible = targets.map((target) => {
      const rect = target.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    });
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (timeline) {
          for (const target of targets) target.dataset.state = 'in';
          observer.disconnect();
          break;
        }
        entry.target.dataset.state = 'in';
        observer.unobserve(entry.target);
      }
    }, { rootMargin: margin || '-12% 0px 0px 0px', threshold: 0 });
    this.#observer = observer;
    targets.forEach((target, index) => {
      target.style.setProperty('--reveal-index', String(index));
      if (target.dataset.state !== 'in') target.dataset.state = !timeline && !margin && visible[index] ? 'in' : 'before';
      if (!timeline && target.dataset.state !== 'in') observer.observe(target);
    });
    if (timeline && targets.some((target) => target.dataset.state !== 'in')) observer.observe(this);
    this.classList.add('reveal-ready');
  };

  #cleanup() {
    this.#controller?.abort();
    this.#show();
  }
}

if (!customElements.get('scroll-reveal-component')) {
  customElements.define('scroll-reveal-component', ScrollReveal);
}
