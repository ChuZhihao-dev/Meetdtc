import { Component } from '@theme/component';

/** Transparent breadcrumb overlay with space reserved for wrapping content. */
class Breadcrumbs extends Component {
  #observer;
  #main;
  #inset;

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
    this.#main = this.closest('main');
    if (!this.#main) return;
    const wrapper = this.closest('.breadcrumb-section');
    const firstContent = this.#main.querySelector(':scope > .shopify-section:not(.page-background)');
    // A merchant can move this section; only the first content section overlays the page.
    if (wrapper !== firstContent) return;
    const nextContent = this.#main.querySelector(':scope > .shopify-section:not(.page-background, .breadcrumb-section)');
    this.#inset = nextContent?.querySelector('[data-breadcrumb-surface], .section') ?? nextContent;
    this.#inset?.setAttribute('data-breadcrumb-inset', '');
    this.#main.setAttribute('data-breadcrumb-overlay', '');
    this.#measure();
    this.#observer = new ResizeObserver(this.#measure);
    this.#observer.observe(this);
  }

  #measure = () => {
    const height = Math.ceil(this.getBoundingClientRect().height);
    this.#main?.style.setProperty('--breadcrumb-overlay-height', `${height}px`);
  };

  #cleanup() {
    this.#observer?.disconnect();
    this.#inset?.removeAttribute('data-breadcrumb-inset');
    this.#inset = undefined;
    this.#main?.removeAttribute('data-breadcrumb-overlay');
    this.#main?.style.removeProperty('--breadcrumb-overlay-height');
    this.#main = undefined;
  }
}

if (!customElements.get('breadcrumbs-component')) {
  customElements.define('breadcrumbs-component', Breadcrumbs);
}
