import { Component } from '@theme/component';

/**
 * @typedef {object} Refs
 * @property {HTMLElement[]} [items]
 * @property {HTMLElement[]} [reveals]
 * @extends Component<Refs>
 */
class BusinessChallenge extends Component {
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {IntersectionObserver | undefined} */
  #observer;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');

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
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.#motion.addEventListener('change', this.#initializeReveal, { signal });
    this.#initializeReveal();
  }

  #initializeReveal = () => {
    this.#observer?.disconnect();
    const targets = [...(this.refs.reveals || []), ...(this.refs.items || [])].filter((item) => item.hasAttribute('data-reveal'));
    if (this.dataset.animate !== 'true' || this.#motion.matches || window.Shopify?.designMode || !targets.length) {
      this.classList.remove('reveal-ready');
      return;
    }
    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target instanceof HTMLElement) entry.target.dataset.state = 'in';
        this.#observer?.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    const visible = targets.map((target) => {
      const rect = target.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    for (const [index, target] of targets.entries()) {
      target.style.setProperty('--reveal-index', String(index));
      if (target.dataset.state !== 'in') target.dataset.state = visible[index] ? 'in' : 'before';
      if (target.dataset.state !== 'in') this.#observer.observe(target);
    }
    this.classList.add('reveal-ready');
  };

  #cleanup() {
    this.#controller?.abort();
    this.#observer?.disconnect();
    this.classList.remove('reveal-ready');
  }
}

if (!customElements.get('business-challenge-component')) {
  customElements.define('business-challenge-component', BusinessChallenge);
}
