import { Component } from '@theme/component';

/**
 * Checkout permalinks contain only the selected package, without adding to the existing cart.
 * @typedef {object} PackageCheckoutRefs
 * @property {HTMLSelectElement | undefined} variant - Optional platform selector.
 * @property {HTMLAnchorElement} checkout - Checkout link for the selected variant.
 * @extends Component<PackageCheckoutRefs>
 */
class WebsitePackageCheckout extends Component {
  requiredRefs = ['checkout'];

  connectedCallback() {
    super.connectedCallback();
    this.#syncCheckout();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#syncCheckout();
  }

  /** @param {Event} event - Native platform selection change. */
  selectVariant(event) {
    if (!(event.target instanceof HTMLSelectElement) || event.target !== this.refs.variant) return;
    this.#syncCheckout();
  }

  #syncCheckout() {
    const { variant, checkout } = this.refs;
    if (!(variant instanceof HTMLSelectElement) || !(checkout instanceof HTMLAnchorElement)) return;
    const selected = variant.selectedOptions[0];
    if (!selected || selected.disabled || !/^\d+$/.test(selected.value)) return;
    const minimum = Number(selected.dataset.quantity);
    if (!Number.isInteger(minimum) || minimum < 1 || !checkout.dataset.cartUrl) return;
    checkout.href = `${checkout.dataset.cartUrl}/${selected.value}:${minimum}`;
  }
}

if (!customElements.get('website-package-checkout')) {
  customElements.define('website-package-checkout', WebsitePackageCheckout);
}
