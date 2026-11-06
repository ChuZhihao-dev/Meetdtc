import { Component } from '@theme/component';

/**
 * A custom element that formats rte content for easier styling
 */
class RTEFormatter extends Component {
  /** @type {AbortController | undefined} */
  #tocController;
  /** @type {ResizeObserver | undefined} */
  #tocObserver;
  /** @type {Set<HTMLElement>} */
  #tocFocusTargets = new Set();

  connectedCallback() {
    super.connectedCallback();
    this.querySelectorAll('table').forEach(this.#formatTable);
    this.#setupToc();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#cleanupToc();
    this.querySelectorAll('table').forEach(this.#formatTable);
    this.#setupToc();
  }

  disconnectedCallback() {
    this.#cleanupToc();
    super.disconnectedCallback();
  }

  /** Enhance legacy article directories while retaining native details and anchor links. */
  #setupToc() {
    const toc = this.querySelector('.verz-mobile-toc');
    if (!(toc instanceof HTMLDetailsElement)) return;
    const summary = toc.querySelector('summary');
    if (!summary) return;
    const mobile = matchMedia('(max-width: 749px)');
    this.#tocController = new AbortController();
    const { signal } = this.#tocController;
    const measure = () => this.style.setProperty('--article-toc-height', `${Math.ceil(toc.getBoundingClientRect().height)}px`);
    this.#tocObserver = new ResizeObserver(measure);
    this.#tocObserver.observe(toc);
    measure();

    const close = (restoreFocus = false) => {
      toc.open = false;
      if (restoreFocus) summary.focus({ preventScroll: true });
    };
    toc.addEventListener('click', (event) => {
      if (!mobile.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('nav a') : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!(target instanceof HTMLElement) || !this.contains(target)) return;
      close();
      // Keep native hash/history and scrolling; move keyboard focus out of the closed menu.
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        this.#tocFocusTargets.add(target);
      }
      target.focus({ preventScroll: true });
    }, { signal });
    document.addEventListener('pointerdown', (event) => {
      if (mobile.matches && toc.open && event.target instanceof Node && !toc.contains(event.target)) close();
    }, { signal });
    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || !mobile.matches || !toc.open || event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    }, { signal });
    this.addEventListener('focusout', (event) => {
      if (mobile.matches && toc.open && event.relatedTarget instanceof Node && !toc.contains(event.relatedTarget)) close();
    }, { signal });
    mobile.addEventListener('change', () => close(), { signal });
  }

  #cleanupToc() {
    this.#tocController?.abort();
    this.#tocObserver?.disconnect();
    this.style.removeProperty('--article-toc-height');
    for (const target of this.#tocFocusTargets) {
      if (target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex');
    }
    this.#tocFocusTargets.clear();
  }

  /**
   * Formats a table for easier styling
   * @param {HTMLTableElement} table
   */
  #formatTable(table) {
    if (table.parentElement?.classList.contains('rte-table-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.classList.add('rte-table-wrapper');
    const parent = table.parentNode;
    if (parent) {
      parent.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  }
}

if (!customElements.get('rte-formatter')) {
  customElements.define('rte-formatter', RTEFormatter);
}
