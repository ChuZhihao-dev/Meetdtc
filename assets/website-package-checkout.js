import { Component } from '@theme/component';

/**
 * Native product forms redirect to checkout without the cart drawer.
 * @typedef {object} PackageCheckoutRefs
 * @property {HTMLSelectElement | undefined} variant - Optional platform selector.
 * @property {HTMLInputElement} quantity - Quantity matching the selected variant's minimum.
 * @extends Component<PackageCheckoutRefs>
 */
class WebsitePackageCheckout extends Component {
  requiredRefs = ['quantity'];

  connectedCallback() {
    super.connectedCallback();
    this.#syncQuantity();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#syncQuantity();
  }

  /** @param {Event} event - Native platform selection change. */
  selectVariant(event) {
    if (!(event.target instanceof HTMLSelectElement) || event.target !== this.refs.variant) return;
    this.#syncQuantity();
  }

  #syncQuantity() {
    const { variant, quantity } = this.refs;
    if (!(variant instanceof HTMLSelectElement) || !(quantity instanceof HTMLInputElement)) return;
    const minimum = Number(variant.selectedOptions[0]?.dataset.quantity);
    if (Number.isInteger(minimum) && minimum > 0) quantity.value = String(minimum);
  }
}

if (!customElements.get('website-package-checkout')) {
  customElements.define('website-package-checkout', WebsitePackageCheckout);
}
