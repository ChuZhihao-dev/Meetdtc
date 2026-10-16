import { DialogComponent } from '@theme/dialog';

/** Global footer-owned drawer, opened by same-page links to #growth-diagnosis-popup. */
class GrowthDiagnosisDrawer extends DialogComponent {
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {HTMLElement | undefined} */
  #trigger;
  #openingFeedback = false;

  connectedCallback() {
    super.connectedCallback();
    this.#initialize();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#controller?.abort();
    this.#initialize();
  }

  disconnectedCallback() {
    this.#controller?.abort();
    super.disconnectedCallback();
  }

  #initialize() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    document.addEventListener('click', this.#openFromLink, { signal });
    this.addEventListener('dialog:close', this.#restoreFocus, { signal });
    // Native Shopify submissions reload the page; keep their scoped feedback visible.
    this.addEventListener('contact:feedback', this.#showFeedback, { signal });
    this.addEventListener('dialog:open', this.#focusFeedback, { signal });
    this.#showFeedback();
    if (location.hash === '#growth-diagnosis-popup' && !this.querySelector('[data-contact-feedback]:not([hidden])')) this.showDialog();
  }

  #showFeedback = () => {
    if (this.#openingFeedback || this.refs.dialog.open) return;
    if (!this.querySelector('[data-contact-feedback]:not([hidden])')) return;
    this.#openingFeedback = true;
    this.showDialog();
  };

  #focusFeedback = () => {
    this.#openingFeedback = false;
    const feedback = this.querySelector('[data-contact-feedback]:not([hidden])');
    if (feedback instanceof HTMLElement) feedback.focus();
  };

  /** @param {MouseEvent} event */
  #openFromLink = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || url.hash !== '#growth-diagnosis-popup') return;
    event.preventDefault();
    this.#trigger = link;
    this.showDialog();
  };

  #restoreFocus = () => {
    if (this.#trigger?.isConnected) this.#trigger.focus({ preventScroll: true });
    this.#trigger = undefined;
  };
}

if (!customElements.get('growth-diagnosis-drawer')) customElements.define('growth-diagnosis-drawer', GrowthDiagnosisDrawer);
