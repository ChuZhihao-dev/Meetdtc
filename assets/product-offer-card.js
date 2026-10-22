import { Component } from '@theme/component';

/**
 * Enhances a selectable discount code with clipboard copying.
 * @typedef {object} Refs
 * @property {HTMLInputElement} code
 * @property {HTMLButtonElement} copy
 * @property {HTMLElement} copyText
 * @property {HTMLElement} status
 * @extends Component<Refs>
 */
class OfferCode extends Component {
  requiredRefs = ['code', 'copy', 'copyText', 'status'];
  #request = 0;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer;

  connectedCallback() {
    super.connectedCallback();
    this.#enhance();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#reset();
    this.#enhance();
  }

  disconnectedCallback() {
    this.#reset();
    super.disconnectedCallback();
  }

  #enhance() {
    const canCopy = Boolean(navigator.clipboard?.writeText);
    this.refs.copy.hidden = !canCopy;
    this.refs.code.hidden = canCopy;
  }

  #reset() {
    this.#request++;
    clearTimeout(this.#timer);
    this.refs.copy.disabled = false;
    this.refs.copyText.textContent = this.refs.code.value;
    this.refs.status.textContent = '';
  }

  /** Copy only this card's code; leave a selectable field on failure. @param {MouseEvent} event */
  async copyCode(event) {
    event.preventDefault();
    const { code, copy, copyText, status } = this.refs;
    const request = ++this.#request;
    clearTimeout(this.#timer);
    copy.disabled = true;
    try {
      await navigator.clipboard.writeText(code.value);
      if (request !== this.#request || !this.isConnected) return;
      copyText.textContent = this.dataset.copied || '';
      status.textContent = this.dataset.copied || '';
      this.#timer = setTimeout(() => this.#reset(), 2000);
    } catch {
      if (request !== this.#request || !this.isConnected) return;
      copy.hidden = true;
      code.hidden = false;
      code.focus();
      code.select();
      status.textContent = this.dataset.manual || '';
    } finally {
      if (request === this.#request && this.isConnected) copy.disabled = false;
    }
  }
}

if (!customElements.get('offer-code-component')) customElements.define('offer-code-component', OfferCode);
