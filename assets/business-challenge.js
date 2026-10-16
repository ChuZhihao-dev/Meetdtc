import { Component } from '@theme/component';

/**
 * @typedef {object} Refs
 * @property {HTMLElement[]} [items]
 * @property {HTMLElement[]} [reveals]
 * @property {HTMLButtonElement} [more]
 * @extends Component<Refs>
 */
class BusinessChallenge extends Component {
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {IntersectionObserver | undefined} */
  #observer;
  #motion = matchMedia('(prefers-reduced-motion: reduce)');
  #expanded = false;

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
    this.#motion.addEventListener('change', this.#initializeReveal, { signal });
    if (window.Shopify?.designMode) this.addEventListener('shopify:block:select', this.#onBlockSelect, { signal });
    this.#updateDisclosure();
    this.#initializeReveal();
  }

  /** Reveal all remaining entries, then move keyboard focus into the revealed content. */
  expand() {
    const firstHidden = this.refs.items?.find((item) => item.hidden);
    this.#expanded = true;
    this.#updateDisclosure();
    this.#initializeReveal();
    if (!firstHidden) return;
    const heading = firstHidden.querySelector('h3');
    const target = heading instanceof HTMLElement ? heading : firstHidden;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  #updateDisclosure() {
    const items = this.refs.items || [];
    const visibleCount = Math.max(1, Number.parseInt(this.dataset.visibleItems || '4', 10) || 4);
    for (const [index, item] of items.entries()) {
      item.hidden = !this.#expanded && index >= visibleCount;
      item.toggleAttribute('data-last-visible', index === (this.#expanded ? items.length : Math.min(visibleCount, items.length)) - 1);
    }
    if (this.refs.more) {
      this.refs.more.hidden = this.#expanded || items.length <= visibleCount;
      this.refs.more.setAttribute('aria-expanded', String(this.#expanded));
    }
  }

  /** Keep hidden blocks editable when selected in the theme editor. @param {Event} event */
  #onBlockSelect = (event) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest('.business-challenge-item');
    if (!(item instanceof HTMLElement) || !item.hidden || !this.refs.items?.includes(item)) return;
    this.#expanded = true;
    this.#updateDisclosure();
    this.#initializeReveal();
  };

  #initializeReveal = () => {
    this.#observer?.disconnect();
    const targets = [...(this.refs.reveals || []), ...(this.refs.items || [])].filter((item) => !item.hidden && item.hasAttribute('data-reveal'));
    if (this.dataset.animate !== 'true' || this.#motion.matches || window.Shopify?.designMode || !targets.length) {
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
    const visible = targets.map((target) => {
      const rect = target.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    for (const [index, target] of targets.entries()) {
      target.style.setProperty('--reveal-index', String(index));
      if (target.dataset.state !== 'in') target.dataset.state = visible[index] ? 'in' : 'before';
      if (target.dataset.state !== 'in') this.#observer.observe(target);
    }
    this.classList.add('reveal-ready');
  };

  #cleanup() {
    this.#controller?.abort();
    this.#observer?.disconnect();
    this.classList.remove('reveal-ready');
  }
}

if (!customElements.get('business-challenge-component')) {
  customElements.define('business-challenge-component', BusinessChallenge);
}
