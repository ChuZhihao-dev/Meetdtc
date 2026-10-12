/**
 * Growth diagnosis footer enhancements.
 *
 * - Normalizes a bare domain in the "Company Website" field to https:// on blur
 *   so native URL validation can pass.
 * - Prevents repeated submits after the form has passed validation. The form
 *   still submits natively (no fetch), so a no-JS submit keeps working.
 *
 * @extends HTMLElement
 */
class FooterDiagnosis extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    if (!this.form) return;

    this.website = this.form.querySelector('[data-footer-diagnosis-website]');

    this.form.addEventListener('submit', this.#handleSubmit);
    this.website?.addEventListener('blur', this.#normalizeWebsite);
  }

  disconnectedCallback() {
    this.form?.removeEventListener('submit', this.#handleSubmit);
    this.website?.removeEventListener('blur', this.#normalizeWebsite);
  }

  #normalizeWebsite = () => {
    if (!(this.website instanceof HTMLInputElement)) return;

    const value = this.website.value.trim();
    if (!value) return;

    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      this.website.value = `https://${value.replace(/^\/+/, '')}`;
    }
  };

  /**
   * @param {SubmitEvent} event
   */
  #handleSubmit = (event) => {
    this.#normalizeWebsite();

    if (!this.form.checkValidity()) {
      // Let native validation report the problem without blocking resubmits.
      return;
    }

    const button = this.form.querySelector('button[type="submit"]');
    if (!button) return;

    // The browser is already submitting; only guard against rapid double-clicks.
    window.setTimeout(() => {
      if (event.defaultPrevented === false) {
        button.setAttribute('aria-disabled', 'true');
      }
    }, 0);
  };
}

if (!customElements.get('footer-diagnosis')) {
  customElements.define('footer-diagnosis', FooterDiagnosis);
}
