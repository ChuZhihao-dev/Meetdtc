import { Component } from '@theme/component';
import { isRTL, prefersReducedMotion } from '@theme/utilities';

/**
 * Advances one card at a time and reports the current carousel position.
 * The theme slideshow owns touch and drag scrolling.
 * @extends {Component<{controls?: HTMLElement, counter?: HTMLOutputElement, previous?: HTMLButtonElement, next?: HTMLButtonElement}>}
 */
class ServiceScopePager extends Component {
  /** @type {HTMLElement | null} */
  #track = null;
  /** @type {number[]} */
  #offsets = [];
  #index = 0;
  #scrollTimer = 0;
  #observer = new ResizeObserver(() => this.#measure());

  connectedCallback() {
    super.connectedCallback();
    this.#observeTrack();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#observeTrack();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#stopObserving();
  }

  #stopObserving() {
    this.#observer.disconnect();
    this.#track?.removeEventListener('scroll', this.#onScroll);
    window.clearTimeout(this.#scrollTimer);
    this.#track = null;
  }

  #observeTrack() {
    this.#stopObserving();
    this.#track = this.querySelector('slideshow-slides');
    if (!this.#track || !this.refs.controls) return;
    this.#observer.observe(this.#track);
    this.#track.addEventListener('scroll', this.#onScroll, { passive: true });
    this.#measure();
  }

  #measure() {
    const track = this.#track;
    const cards = track?.children;
    if (!track?.clientWidth || !cards?.length) return;
    const columns = Number(getComputedStyle(cards[0]).getPropertyValue('--service-scope-per-page')) || 1;
    const positions = Math.max(1, cards.length - columns + 1);
    const limit = track.scrollWidth - track.clientWidth;
    const edge = isRTL(track) ? 'right' : 'left';
    const first = cards[0].getBoundingClientRect()[edge];
    // Stop when the last card is visible, keeping the final row full.
    this.#offsets = Array.from(cards).slice(0, positions).map(card =>
      Math.min(limit, Math.abs(card.getBoundingClientRect()[edge] - first))
    );
    this.#goTo(this.#index, false);
  }

  #onScroll = () => {
    window.clearTimeout(this.#scrollTimer);
    this.#scrollTimer = window.setTimeout(() => {
      if (!this.#track?.clientWidth || !this.#offsets.length) return;
      const position = Math.abs(this.#track.scrollLeft);
      this.#index = this.#offsets.reduce((nearest, offset, index) =>
        Math.abs(offset - position) < Math.abs(this.#offsets[nearest] - position) ? index : nearest, 0);
      this.#render();
    }, 100);
  };

  /**
   * @param {number} index
   * @param {boolean} animate
   */
  #goTo(index, animate) {
    if (!this.#track || !this.#offsets.length) return;
    this.#index = Math.max(0, Math.min(index, this.#offsets.length - 1));
    this.#track.scrollTo({
      left: this.#offsets[this.#index] * (isRTL(this.#track) ? -1 : 1),
      behavior: animate && !prefersReducedMotion() ? 'smooth' : 'instant',
    });
    this.#render();
  }

  #render() {
    const { controls, counter, previous, next } = this.refs;
    if (!controls || !counter || !previous || !next) return;
    controls.hidden = this.#offsets.length < 2;
    const value = `${this.#index + 1} / ${this.#offsets.length}`;
    if (counter.textContent !== value) counter.textContent = value;
    previous.setAttribute('aria-disabled', String(this.#index === 0));
    next.setAttribute('aria-disabled', String(this.#index === this.#offsets.length - 1));
  }

  /** Moves back by one card. */
  previous() { this.#goTo(this.#index - 1, true); }

  /** Moves forward by one card. */
  next() { this.#goTo(this.#index + 1, true); }
}

if (!customElements.get('service-scope-pager')) {
  customElements.define('service-scope-pager', ServiceScopePager);
}

/**
 * @extends {Component<{tablist: HTMLElement, tabs: HTMLButtonElement[], panels: HTMLElement[]}>}
 */
class ServiceScopeTabs extends Component {
  #selectedId;

  connectedCallback() {
    super.connectedCallback();
    this.#restoreSelection();
    this.addEventListener('shopify:block:select', this.#selectBlock);
  }

  updatedCallback() {
    super.updatedCallback();
    this.#restoreSelection();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('shopify:block:select', this.#selectBlock);
  }

  #restoreSelection() {
    const { tabs, tablist } = this.refs;
    if (!tabs?.length || !tablist) return;
    this.#select(tabs.find(tab => tab.id === this.#selectedId) ?? tabs[0]);
    tablist.hidden = tabs.length < 2;
  }

  /** @param {HTMLButtonElement} tab */
  #select(tab) {
    const { tabs, panels } = this.refs;
    this.#selectedId = tab.id;
    for (const button of tabs) {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      const panel = panels?.find(element => element.id === button.getAttribute('aria-controls'));
      if (!panel) continue;
      panel.hidden = !selected;
      if (tabs.length > 1) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', button.id);
        panel.tabIndex = 0;
      } else {
        panel.removeAttribute('role');
        panel.removeAttribute('tabindex');
        const title = panel.querySelector('.service-scope__panel-title');
        if (title?.id) panel.setAttribute('aria-labelledby', title.id);
      }
    }
  }

  /** @param {MouseEvent} event */
  selectTab(event) {
    if (event.target instanceof HTMLButtonElement) this.#select(event.target);
  }

  /** @param {KeyboardEvent} event */
  navigateTabs(event) {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const tabs = this.refs.tabs;
    const index = tabs.indexOf(event.target);
    const forward = getComputedStyle(this).direction === 'rtl' ? -1 : 1;
    const destinations = {
      Home: 0,
      End: tabs.length - 1,
      ArrowRight: (index + forward + tabs.length) % tabs.length,
      ArrowLeft: (index - forward + tabs.length) % tabs.length,
    };
    const target = tabs[destinations[event.key]];
    if (!target) return;
    event.preventDefault();
    this.#select(target);
    target.focus();
  }

  /** @param {Event} event */
  #selectBlock = (event) => {
    if (!(event.target instanceof Element)) return;
    const panel = event.target.closest('.service-scope__panel');
    const tab = this.refs.tabs?.find(button => button.getAttribute('aria-controls') === panel?.id);
    if (tab) this.#select(tab);
  };
}

if (!customElements.get('service-scope-tabs')) {
  customElements.define('service-scope-tabs', ServiceScopeTabs);
}
