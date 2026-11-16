import { Component } from '@theme/component';

/** Mouse dragging enhances the native keyboard, trackpad and touch scroller. */
class WhyChooseUs extends Component {
  #controller;
  /** @type {{id: number, x: number, y: number, scroll: number} | undefined} */
  #pointer;
  #dragged = false;

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
    this.#controller?.abort();
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.addEventListener('pointerdown', this.#start, { signal });
    window.addEventListener('pointermove', this.#move, { signal, passive: false });
    window.addEventListener('pointerup', this.#end, { signal });
    window.addEventListener('pointercancel', this.#end, { signal });
    window.addEventListener('blur', this.#release, { signal });
    this.addEventListener('lostpointercapture', this.#end, { signal });
    this.addEventListener('selectstart', this.#preventSelection, { signal });
    this.addEventListener('dragstart', this.#preventSelection, { signal });
    this.addEventListener('click', this.#click, { signal, capture: true });
  }

  /** @param {PointerEvent} event */
  #start = (event) => {
    this.#dragged = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
    if (this.scrollWidth <= this.clientWidth + 1) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('a, button, input, textarea, select, [contenteditable], [role="button"]')) return;
    this.#pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: this.scrollLeft };
  };

  /** @param {PointerEvent} event */
  #move = (event) => {
    const pointer = this.#pointer;
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!(event.buttons & 1)) { this.#release(); return; }
    const delta = event.clientX - pointer.x;
    if (!this.#dragged) {
      if (Math.abs(delta) < 6) return;
      if (Math.abs(event.clientY - pointer.y) > Math.abs(delta)) { this.#release(); return; }
      this.#dragged = true;
      this.classList.add('is-dragging');
      this.setPointerCapture(pointer.id);
      this.ownerDocument.getSelection()?.removeAllRanges();
    }
    event.preventDefault();
    this.scrollLeft = pointer.scroll - delta;
  };

  /** @param {PointerEvent} event */
  #end = (event) => {
    if (event.pointerId === this.#pointer?.id) this.#release();
  };

  #release = () => {
    const pointer = this.#pointer;
    this.#pointer = undefined;
    this.classList.remove('is-dragging');
    if (pointer && this.hasPointerCapture(pointer.id)) this.releasePointerCapture(pointer.id);
  };

  /** @param {Event} event */
  #preventSelection = (event) => {
    if (this.#pointer) event.preventDefault();
  };

  /** @param {MouseEvent} event */
  #click = (event) => {
    if (!this.#dragged || event.detail === 0) return;
    this.#dragged = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #cleanup() {
    this.#controller?.abort();
    this.#release();
    this.#dragged = false;
  }
}

if (!customElements.get('why-choose-us-component')) {
  customElements.define('why-choose-us-component', WhyChooseUs);
}
