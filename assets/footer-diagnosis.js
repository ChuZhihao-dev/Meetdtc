import { Component } from '@theme/component';

/** Native contact form enhancement; validation/submission still work without JS. */
class FooterDiagnosis extends Component {
  #controller;
  #form;
  #website;
  #submitting = false;

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
    this.#form = this.querySelector('form');
    if (!this.#form) return;
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.#website = this.#form.querySelector('[data-footer-diagnosis-website]');
    this.#form.addEventListener('submit', this.#submit, { signal });
    this.#website?.addEventListener('blur', this.#normalize, { signal });
    window.addEventListener('pageshow', this.#reset, { signal });
    this.#reset();
  }

  #normalize = () => {
    if (!(this.#website instanceof HTMLInputElement)) return;
    const value = this.#website.value.trim();
    if (value && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      this.#website.value = `https://${value.replace(/^\/+/, '')}`;
    }
  };

  #submit = (event) => {
    if (this.#submitting) {
      event.preventDefault();
      return;
    }
    this.#normalize();
    if (!this.#form.checkValidity()) return;
    const signal = this.#controller.signal;
    // Other handlers may cancel native submission. No timers outlive the component.
    queueMicrotask(() => {
      if (signal.aborted || event.defaultPrevented) return;
      this.#submitting = true;
      this.#form.querySelector('[type="submit"]')?.setAttribute('aria-disabled', 'true');
    });
  };

  #reset = () => {
    this.#submitting = false;
    this.#form?.querySelector('[type="submit"]')?.removeAttribute('aria-disabled');
  };

  #cleanup() {
    this.#controller?.abort();
    this.#reset();
  }
}

if (!customElements.get('footer-diagnosis')) {
  customElements.define('footer-diagnosis', FooterDiagnosis);
}
