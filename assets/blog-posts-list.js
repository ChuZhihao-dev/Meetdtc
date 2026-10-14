import { Component } from '@theme/component';
import { sectionRenderer, morphSection } from '@theme/section-renderer';

/**
 * Native tag/pagination links enhanced with keyed list rendering and staggered reveal.
 * @typedef {object} Refs
 * @property {HTMLElement} [grid]
 * @property {HTMLElement} [status]
 * @extends Component<Refs>
 */
export default class BlogPostsList extends Component {
  /** @type {AbortController | undefined} */
  #controller;
  /** @type {IntersectionObserver | undefined} */
  #observer;
  /** @type {Set<Animation>} */
  #animations = new Set();
  #request = 0;
  /** @type {Map<string, { html: string, expires: number }>} */
  #pages = new Map();
  #easing = 'ease-out';
  /** @type {URL | undefined} */
  #pendingUrl;
  #activeUrl = new URL(location.href);
  #motion = matchMedia('(prefers-reduced-motion: reduce)');

  connectedCallback() {
    super.connectedCallback();
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.#motion.addEventListener('change', this.#reveal, { signal });
    const section = this.closest('.shopify-section');
    if (section) this.#cachePage(this.#activeUrl, section.outerHTML);
    this.#updateCategories();
    this.#reveal(true);
  }

  updatedCallback() {
    super.updatedCallback();
    this.#updateCategories();
  }

  disconnectedCallback() {
    this.#request++;
    this.#controller?.abort();
    sectionRenderer.abortRender(this.sectionId);
    this.#clearMotion();
    this.#pages.clear();
    super.disconnectedCallback();
  }

  get sectionId() {
    return this.getAttribute('section-id') || '';
  }

  /** Selector hooks allow collection views to reuse the same filtering behavior. */
  get filterSelector() { return '.blog-categories'; }
  get resultsSelector() { return '.blog-posts-results'; }
  get paginationSelector() { return '.pagination'; }
  get cardSelector() { return '.blog-post-item'; }
  get introSelector() { return '.blog-list__intro-content > .shopify-block'; }

  /** Intercept only unmodified native category/pagination links. @param {MouseEvent} event */
  navigate(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.composedPath()[0];
    if (!(target instanceof Element)) return;
    const link = target.closest(`${this.filterSelector} a, ${this.resultsSelector} ${this.paginationSelector} a`);
    if (!(link instanceof HTMLAnchorElement) || !this.contains(link) || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    if (url.href === this.#pendingUrl?.href && !this.hasAttribute('data-error')) return;
    if (url.href === this.#activeUrl.href && !this.#pendingUrl && !this.hasAttribute('data-error')) return;
    const moveFocus = Boolean(link.closest(this.resultsSelector));
    void this.#render(url, moveFocus);
  }

  /** Retry the latest failed request without submitting any form. */
  retry() {
    if (this.#pendingUrl) void this.#render(this.#pendingUrl, true);
  }

  /** @param {URL} url @param {boolean} moveFocus */
  async #render(url, moveFocus) {
    const request = ++this.#request;
    this.#pendingUrl = url;
    this.removeAttribute('data-error');
    const results = this.querySelector(this.resultsSelector);
    results?.setAttribute('aria-busy', 'true');
    if (this.refs.status) this.refs.status.textContent = this.dataset.loadingText || '';
    try {
      const cached = this.#pages.get(url.href);
      let html;
      const useCached = cached && cached.expires > Date.now() && !window.Shopify?.designMode;
      if (useCached) {
        // A direct morph must cancel any older renderer request first.
        sectionRenderer.abortRender(this.sectionId);
        html = cached.html;
        await morphSection(this.sectionId, html, { mode: 'hydration', injectStylesheet: true });
      } else {
        html = await sectionRenderer.renderSection(this.sectionId, {
          url: new URL(url),
          cache: false,
          mode: 'hydration',
          injectStylesheet: true,
          shouldRender: (html) => {
            if (request !== this.#request || !this.isConnected) return false;
            const document = new DOMParser().parseFromString(html, 'text/html');
            const region = document.getElementById(`shopify-section-${this.sectionId}`)?.querySelector(this.resultsSelector);
            if (!region || region.getAttribute('data-hydration-key') !== results?.getAttribute('data-hydration-key')) {
              throw new Error('Missing matching filtered list in section response');
            }
            return true;
          },
        });
      }
      if (request !== this.#request || !this.isConnected) return;
      this.updatedCallback();
      const nextResults = this.querySelector(this.resultsSelector);
      if (!(nextResults instanceof HTMLElement)) throw new Error('Missing live filtered list');
      if (!useCached) this.#cachePage(url, html);
      this.#activeUrl = new URL(url);
      this.#activeUrl.pathname = nextResults.dataset.currentPath || url.pathname;
      this.#pendingUrl = undefined;
      if (this.refs.status) this.refs.status.textContent = nextResults.dataset.loadedText || '';
      if (moveFocus) {
        nextResults.focus({ preventScroll: true });
        nextResults.scrollIntoView({ block: 'start', behavior: this.#motion.matches ? 'instant' : 'smooth' });
      }
      this.#reveal();
    } catch {
      if (request !== this.#request || !this.isConnected) return;
      this.#pages.delete(url.href);
      this.setAttribute('data-error', '');
      if (this.refs.status) this.refs.status.textContent = this.dataset.errorText || '';
    } finally {
      if (request === this.#request && this.isConnected) this.querySelector(this.resultsSelector)?.removeAttribute('aria-busy');
    }
  }

  /** Cache only validated successful pages, for up to one minute and eight URLs.
   * @param {URL} url @param {string} html
   */
  #cachePage(url, html) {
    if (!html || window.Shopify?.designMode) return;
    this.#pages.delete(url.href);
    this.#pages.set(url.href, { html, expires: Date.now() + 60000 });
    if (this.#pages.size > 8) this.#pages.delete(this.#pages.keys().next().value);
  }

  #updateCategories() {
    const path = this.querySelector(this.resultsSelector)?.getAttribute('data-current-path') || location.pathname;
    for (const link of this.querySelectorAll(`${this.filterSelector} a`)) {
      if (!(link instanceof HTMLAnchorElement)) continue;
      if (new URL(link.href).pathname === path) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  /** Fade in the introduction on connection and replay cards after each completed switch.
   * @param {boolean | Event} [includeIntro] - Only true includes the page introduction.
   */
  #reveal = (includeIntro = false) => {
    this.#clearMotion();
    if (this.#motion.matches || this.dataset.animate === 'false' || window.Shopify?.designMode) return;
    const cards = [...this.querySelectorAll(this.cardSelector)];
    const visible = cards.filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    this.#easing = getComputedStyle(this).getPropertyValue('--ease-out-cubic').trim() || 'ease-out';
    if (includeIntro === true) {
      const introduction = this.querySelectorAll(this.introSelector);
      for (const [index, element] of [...introduction].entries()) this.#animate(element, index);
      const navigation = this.querySelector(this.filterSelector);
      if (navigation) this.#animate(navigation, introduction.length);
    }
    visible.forEach((card, index) => this.#animate(card, index));
    this.#observer = new IntersectionObserver((entries) => {
      const intersecting = new Set(entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target));
      const entering = cards.filter((card) => intersecting.has(card));
      entering.forEach((card, index) => {
        this.#animate(card, index);
        this.#observer?.unobserve(card);
      });
    }, { threshold: 0.05 });
    for (const card of cards) if (!visible.includes(card)) this.#observer.observe(card);
  };

  /** @param {Element} card @param {number} index */
  #animate(card, index) {
    const animation = card.animate([
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], {
      duration: 560,
      delay: index * 90,
      easing: this.#easing,
      fill: 'backwards',
    });
    this.#animations.add(animation);
    const remove = () => this.#animations.delete(animation);
    animation.addEventListener('finish', remove, { once: true });
    animation.addEventListener('cancel', remove, { once: true });
  }

  #clearMotion() {
    this.#observer?.disconnect();
    for (const animation of this.#animations) animation.cancel();
    this.#animations.clear();
  }
}

if (!customElements.get('blog-posts-list')) customElements.define('blog-posts-list', BlogPostsList);
