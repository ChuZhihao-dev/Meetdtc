import { Component } from '@theme/component';

/** One-time entrance animation for the delivery timeline. */
class DeliveryProcess extends Component {
  #controller;
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
    super.disconnectedCallback();
    this.#cleanup();
  }

  #initialize() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    if (window.Shopify?.designMode) {
      this.addEventListener('shopify:block:select', (event) => {
        event.target.closest('.delivery-process__step')?.classList.add('is-revealed');
      }, { signal });
    }
    this.#motion.addEventListener('change', this.#reveal, { signal });
    this.#reveal();
  }

  #reveal = () => {
    this.#observer?.disconnect();
    if (this.#motion.matches || window.Shopify?.designMode) return;
    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        this.#observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });
    this.querySelectorAll('.delivery-process__intro, .delivery-process__step').forEach((element) => {
      this.#observer.observe(element);
    });
  };

  #cleanup() {
    this.#controller?.abort();
    this.#observer?.disconnect();
  }
}

if (!customElements.get('delivery-process')) {
  customElements.define('delivery-process', DeliveryProcess);
}
