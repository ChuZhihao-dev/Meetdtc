import { Component } from '@theme/component';

/**
 * @typedef {object} Refs
 * @property {HTMLElement[]} [items]
 * @property {HTMLButtonElement[]} markers
 * @property {HTMLElement[]} decorations
 * @property {HTMLElement[]} [reveals]
 * @extends Component<Refs>
 */
class BusinessChallenge extends Component {
  requiredRefs = ['markers', 'decorations'];
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {IntersectionObserver | undefined} */
  #observer;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');
  #mobile = matchMedia('(max-width: 749px)');
  #selectedId = '';

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
    const { signal } = this.#controller;
    const items = this.refs.items || [];
    if (!items.some((item) => item.id === this.#selectedId)) this.#selectedId = '';
    for (const button of this.refs.markers || []) {
      const targets = items.filter((item) => item.dataset.marker === button.dataset.marker);
      const decoration = this.refs.decorations?.find((item) => item.dataset.marker === button.dataset.marker);
      button.hidden = targets.length === 0;
      if (decoration) decoration.hidden = targets.length > 0;
      if (!targets.length) {
        button.removeAttribute('aria-controls');
        button.removeAttribute('aria-pressed');
        continue;
      }
      button.setAttribute('aria-controls', targets.map((item) => item.id).join(' '));
      button.setAttribute('aria-label', (this.dataset.markerLabel || '').replace('[title]', targets[0].dataset.label || ''));
    }
    this.addEventListener('focusin', this.#previewItem, { signal });
    this.addEventListener('focusout', this.#restoreHighlight, { signal });
    this.addEventListener('shopify:block:select', this.#previewItem, { signal });
    this.#motion.addEventListener('change', this.#initializeReveal, { signal });
    this.#highlight(this.#selectedItem());
    this.#initializeReveal();
  }

  #selectedItem() {
    return this.refs.items?.find((item) => item.id === this.#selectedId);
  }

  /** Public declarative handler. Cycles in saved order when challenges share a marker.
   * @param {MouseEvent} event
   */
  selectMarker(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[data-marker]');
    if (!(button instanceof HTMLButtonElement) || !this.refs.markers?.includes(button)) return;
    const targets = this.refs.items?.filter((item) => item.dataset.marker === button.dataset.marker) || [];
    if (!targets.length) return;
    const current = targets.findIndex((item) => item.id === this.#selectedId);
    const target = targets[(current + 1) % targets.length];
    this.#selectedId = target.id;
    this.#highlight(target);
    const heading = target.querySelector('h3');
    const focusTarget = heading instanceof HTMLElement ? heading : target;
    if (focusTarget === target) target.tabIndex = -1;
    focusTarget.focus({ preventScroll: true });
    const rect = target.getBoundingClientRect();
    if (this.#mobile.matches || rect.top < 0 || rect.bottom > innerHeight) {
      target.scrollIntoView({ block: 'start', behavior: this.#motion.matches ? 'instant' : 'smooth' });
    }
    this.dispatchEvent(new CustomEvent('business-challenge:select', {
      bubbles: true,
      detail: { id: target.id, marker: button.dataset.marker },
    }));
  }

  /** @param {Event} event */
  #previewItem = (event) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest('.business-challenge-item');
    if (!(item instanceof HTMLElement) || !this.refs.items?.includes(item)) return;
    this.#highlight(item);
  };

  /** @param {Event} event */
  #restoreHighlight = (event) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest('.business-challenge-item');
    if (!item || !this.refs.items?.includes(/** @type {HTMLElement} */ (item))) return;
    const related = event instanceof FocusEvent ? event.relatedTarget : null;
    if (related instanceof Node && item.contains(related)) return;
    this.#highlight(this.#selectedItem());
  };

  /** @param {HTMLElement | undefined} item */
  #highlight(item) {
    const marker = item?.dataset.marker || 'none';
    for (const row of this.refs.items || []) row.toggleAttribute('data-active', row === item && marker !== 'none');
    for (const button of this.refs.markers || []) {
      button.toggleAttribute('data-active', button.dataset.marker === marker);
      if (!button.hidden) button.setAttribute('aria-pressed', String(button.dataset.marker === this.#selectedItem()?.dataset.marker));
    }
    const diagram = this.querySelector('.challenge-diagram');
    if (diagram instanceof HTMLElement) diagram.dataset.activeMarker = marker;
  }

  #initializeReveal = () => {
    this.#observer?.disconnect();
    const targets = [...(this.refs.reveals || []), ...(this.refs.items || [])].filter((item) => item.hasAttribute('data-reveal'));
    if (this.dataset.animate !== 'true' || this.#motion.matches || !targets.length) {
      this.classList.remove('reveal-ready');
      return;
    }
    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target instanceof HTMLElement) entry.target.dataset.state = 'in';
        this.#observer?.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    for (const [index, target] of targets.entries()) {
      target.style.setProperty('--reveal-index', String(index));
      const rect = target.getBoundingClientRect();
      if (target.dataset.state !== 'in') target.dataset.state = rect.bottom > 0 && rect.top < innerHeight ? 'in' : 'before';
      if (target.dataset.state !== 'in') this.#observer.observe(target);
    }
    this.classList.add('reveal-ready');
  };

  #cleanup() {
    this.#controller?.abort();
    this.#observer?.disconnect();
    this.classList.remove('reveal-ready');
    for (const button of this.refs.markers || []) {
      button.hidden = true;
      button.removeAttribute('aria-controls');
      button.removeAttribute('aria-pressed');
      button.removeAttribute('data-active');
    }
    for (const decoration of this.refs.decorations || []) decoration.hidden = false;
  }
}

if (!customElements.get('business-challenge-component')) {
  customElements.define('business-challenge-component', BusinessChallenge);
}
