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
  /** @type {ResizeObserver | undefined} */
  #categoryResize;
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
    window.addEventListener('popstate', this.#handlePopState, { signal });
    this.addEventListener('scroll', this.#updateCategoryEdges, { capture: true, passive: true, signal });
    this.#categoryResize = new ResizeObserver(this.#updateCategoryEdges);
    this.#observeCategoryEdges();
    const section = this.closest('.shopify-section');
    if (section) this.#cachePage(this.#activeUrl, section.outerHTML);
    this.#updateCategories();
    this.#reveal(true);
  }

  #handlePopState = () => {
    const currentUrl = new URL(location.href);
    if (currentUrl.href !== this.#activeUrl.href) {
      void this.#render(currentUrl, false, false);
    }
  };

  updatedCallback() {
    super.updatedCallback();
    this.#updateCategories();
    this.#observeCategoryEdges();
  }

  disconnectedCallback() {
    this.#request++;
    this.#controller?.abort();
    this.#categoryResize?.disconnect();
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

  #observeCategoryEdges() {
    this.#categoryResize?.disconnect();
    for (const rail of this.querySelectorAll('.blog-categories__desktop')) {
      this.#categoryResize?.observe(rail);
      if (rail.parentElement?.matches('.blog-categories__rail')) this.#categoryResize?.observe(rail.parentElement);
      for (const child of rail.children) this.#categoryResize?.observe(child);
    }
    this.#updateCategoryEdges();
  }

  // Compare physical edges so the fade also follows RTL scrolling without scrollLeft assumptions.
  #updateCategoryEdges = () => {
    for (const rail of this.querySelectorAll('.blog-categories__desktop')) {
      if (!(rail instanceof HTMLElement)) continue;
      const wrapper = rail.closest('.blog-categories__rail');
      if (wrapper instanceof HTMLElement) {
        const scrollable = rail.clientWidth > 0 && rail.scrollWidth > wrapper.clientWidth + 1;
        wrapper.toggleAttribute('data-scrollable', scrollable);
        for (const button of wrapper.querySelectorAll('[data-category-scroll]')) {
          if (button instanceof HTMLButtonElement) button.hidden = !scrollable;
        }
      }
      const bounds = rail.getBoundingClientRect();
      const first = rail.firstElementChild?.getBoundingClientRect();
      const last = rail.lastElementChild?.getBoundingClientRect();
      const overflowing = rail.clientWidth > 0 && rail.scrollWidth > rail.clientWidth + 1;
      const hasLeft = Boolean(overflowing && first && last && Math.min(first.left, last.left) < bounds.left - 1);
      const hasRight = Boolean(overflowing && first && last && Math.max(first.right, last.right) > bounds.right + 1);
      rail.style.setProperty('--blog-fade-left', hasLeft ? '52px' : '0px');
      rail.style.setProperty('--blog-fade-right', hasRight ? '52px' : '0px');
      // Keep keyboard focus in the category list when its focused arrow disappears.
      const focusedArrow = document.activeElement;
      if (focusedArrow instanceof HTMLButtonElement && wrapper?.contains(focusedArrow) &&
        ((focusedArrow.dataset.categoryScroll === 'left' && !hasLeft) ||
          (focusedArrow.dataset.categoryScroll === 'right' && !hasRight))) {
        rail.setAttribute('tabindex', '-1');
        rail.focus({ preventScroll: true });
      }
      wrapper?.querySelector('[data-category-scroll="left"]')?.setAttribute('aria-disabled', String(!hasLeft));
      wrapper?.querySelector('[data-category-scroll="right"]')?.setAttribute('aria-disabled', String(!hasRight));
    }
  };

  /** Scroll the category rail in the arrow's physical direction, including in RTL. @param {MouseEvent} event */
  scrollCategories(event) {
    const button = event.target instanceof Element ? event.target.closest('[data-category-scroll]') : null;
    if (!(button instanceof HTMLButtonElement) || button.getAttribute('aria-disabled') === 'true') return;
    const rail = button.closest('.blog-categories__rail')?.querySelector('.blog-categories__desktop');
    if (!(rail instanceof HTMLElement)) return;
    rail.scrollBy({
      left: Math.max(rail.clientWidth * 0.75, 160) * (button.dataset.categoryScroll === 'left' ? -1 : 1),
      behavior: this.#motion.matches ? 'instant' : 'smooth',
    });
  }

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
    const picker = link.closest('[data-category-picker]');
    if (picker instanceof HTMLDetailsElement) {
      picker.open = false;
      picker.querySelector('summary')?.focus({ preventScroll: true });
    }
    if (url.href === this.#pendingUrl?.href && !this.hasAttribute('data-error')) return;
    if (url.href === this.#activeUrl.href && !this.#pendingUrl && !this.hasAttribute('data-error')) return;
    const moveFocus = Boolean(link.closest(this.resultsSelector));
    void this.#render(url, moveFocus);
  }

  /** Close the shared mobile/tablet category picker. @param {KeyboardEvent} event */
  closeFilter(event) {
    if (event.key !== 'Escape') return;
    const picker = event.target instanceof Element ? event.target.closest('[data-category-picker]') : null;
    if (!(picker instanceof HTMLDetailsElement) || !picker.open) return;
    event.preventDefault();
    event.stopPropagation();
    picker.open = false;
    picker.querySelector('summary')?.focus({ preventScroll: true });
  }

  /** Retry the latest failed request without submitting any form. */
  retry() {
    if (this.#pendingUrl) void this.#render(this.#pendingUrl, true, true);
  }

  /**
   * @param {URL} url
   * @param {boolean} moveFocus
   * @param {boolean} [pushHistory=true]
   */
  async #render(url, moveFocus, pushHistory = true) {
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
      if (pushHistory && location.href !== url.href) {
        history.pushState({ path: url.pathname }, '', url.href);
      }
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
    const rawPath = this.querySelector(this.resultsSelector)?.getAttribute('data-current-path') || location.pathname;
    const path = decodeURI(rawPath).replace(/\/$/, '');
    for (const link of this.querySelectorAll(`${this.filterSelector} a`)) {
      if (!(link instanceof HTMLAnchorElement)) continue;
      const linkPath = decodeURI(new URL(link.href).pathname).replace(/\/$/, '');
      if (linkPath === path) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    for (const picker of this.querySelectorAll('[data-category-picker]')) {
      const selected = picker.querySelector('a[aria-current="page"]');
      const label = picker.querySelector('[data-category-label]');
      if (selected && label) label.textContent = selected.textContent?.trim() || '';
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
