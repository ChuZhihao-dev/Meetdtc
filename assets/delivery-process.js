import { Component } from '@theme/component';

/** One-time entrance animation for the delivery timeline. */
class DeliveryProcess extends Component {
  #controller;
  #observer;

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
    this.addEventListener('shopify:block:select', (event) => {
      const step = event.target.closest('.delivery-process__step');
      step?.classList.add('is-revealed');
    }, { signal });
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
  }

  #cleanup() {
    this.#controller?.abort();
    this.#observer?.disconnect();
  }
}

if (!customElements.get('delivery-process')) {
  customElements.define('delivery-process', DeliveryProcess);
}
