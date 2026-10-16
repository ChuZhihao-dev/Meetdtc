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
    this.#restoreFeedback();
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
    if (!this.#form.checkValidity()) {
      event.preventDefault();
      return;
    }
    const signal = this.#controller.signal;
    // Other handlers may cancel native submission. No timers outlive the component.
    queueMicrotask(() => {
      if (signal.aborted || event.defaultPrevented) return;
      this.#submitting = true;
      // Store only the form identity, never enquiry content. Storage may be unavailable.
      try {
        sessionStorage.setItem('contact-submission', JSON.stringify({ id: this.#form.id, path: location.pathname, time: Date.now() }));
      } catch {}
      const button = this.#form.querySelector('[type="submit"]');
      button?.setAttribute('aria-disabled', 'true');
      button?.setAttribute('aria-busy', 'true');
      const status = button?.querySelector('[data-contact-submit-status]');
      if (status instanceof HTMLElement) status.textContent = status.dataset.loadingLabel ?? '';
    });
  };

  #restoreFeedback() {
    const feedback = this.#form.querySelector('[data-contact-feedback]');
    if (!(feedback instanceof HTMLElement)) return;
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem('contact-submission') ?? 'null'); } catch {}
    const anchor = location.hash.slice(1);
    const hasFormAnchor = /^(FooterDiagnosis-|DiagnosisDrawerForm-|ContactEnquiry-)/.test(anchor);
    const hasPending = pending?.path === location.pathname && Number.isFinite(pending?.time) && Date.now() - pending.time < 600000;
    const matches = hasFormAnchor ? anchor === this.#form.id : hasPending ? pending.id === this.#form.id : !feedback.hidden;
    feedback.hidden = !matches;
    if (!matches) return;
    try { sessionStorage.removeItem('contact-submission'); } catch {}
    const signal = this.#controller.signal;
    queueMicrotask(() => {
      if (signal.aborted) return;
      this.dispatchEvent(new CustomEvent('contact:feedback', { bubbles: true }));
      // The drawer focuses feedback after opening; other forms focus it directly.
      if (!this.closest('dialog')) feedback.focus();
    });
  }

  #reset = () => {
    this.#submitting = false;
    const button = this.#form?.querySelector('[type="submit"]');
    button?.removeAttribute('aria-disabled');
    button?.removeAttribute('aria-busy');
    const status = button?.querySelector('[data-contact-submit-status]');
    if (status) status.textContent = '';
  };

  #cleanup() {
    this.#controller?.abort();
    this.#reset();
  }
}

if (!customElements.get('footer-diagnosis')) {
  customElements.define('footer-diagnosis', FooterDiagnosis);
}

// Share submission feedback without changing either form's fields or markup contract.
if (!customElements.get('contact-enquiry-form')) {
  customElements.define('contact-enquiry-form', class extends FooterDiagnosis {});
}
