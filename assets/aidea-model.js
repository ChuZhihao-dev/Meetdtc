import { Component } from '@theme/component';

/**
 * One-shot centre-out model assembly. CSS keeps image and label layers synchronized.
 * @extends Component<{ diagram?: HTMLElement }>
 */
class AideaModel extends Component {
  /** @type {IntersectionObserver | undefined} */
  #observer;
  /** @type {AbortController | undefined} */
  #controller;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');
  #entered = false;

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
    this.#motion.addEventListener('change', this.#observe, { signal: this.#controller.signal });
    this.#observe();
  }

  #observe = () => {
    this.#observer?.disconnect();
    this.removeAttribute('data-motion-ready');
    const diagram = this.refs.diagram;
    if (this.dataset.animate !== 'true' || this.#motion.matches || window.Shopify?.designMode || !diagram || !('IntersectionObserver' in window)) return;

    this.toggleAttribute('data-entered', this.#entered);
    this.setAttribute('data-motion-ready', '');
    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        this.#entered = true;
        this.setAttribute('data-entered', '');
        this.#observer?.disconnect();
      }
    }, { threshold: 0.08 });
    this.#observer.observe(diagram);
  };

  #cleanup() {
    this.#controller?.abort();
    this.#observer?.disconnect();
    this.removeAttribute('data-motion-ready');
  }
}

if (!customElements.get('aidea-model-component')) {
  customElements.define('aidea-model-component', AideaModel);
}
